/**
 * LevelManager - Handles level/area transitions, loading, and unloading.
 * Manages the flow between different areas of the Jedi Temple.
 */

import Phaser from 'phaser';
import { SceneKey } from '../core/types';
import { EventBus, GameEvent } from '../core/events/EventBus';
import { TilemapManager, TilemapLoadResult } from './TilemapManager';
import { CheckpointSystem, CheckpointData } from './CheckpointSystem';
import { Logger } from '../utils/Logger';

/**
 * Area configuration for a temple level area.
 */
export interface AreaConfig {
  key: string;
  mapKey: string;
  tilesetKey: string;
  tilesetImageKey: string;
  displayName: string;
  ambientColor: number;
  fogDensity: number;
  musicKey?: string;
}

/**
 * Transition configuration.
 */
export interface TransitionConfig {
  duration: number;
  fadeColor: number;
  type: 'fade' | 'slide' | 'dissolve';
}

/**
 * Level state for saving/loading.
 */
export interface LevelState {
  currentArea: string;
  playerPosition: { x: number; y: number };
  clearedEnemies: string[];
  collectedPickups: string[];
  triggeredEvents: string[];
  checkpoint: CheckpointData | null;
}

/**
 * Default transition configuration.
 */
export const DEFAULT_TRANSITION: TransitionConfig = {
  duration: 500,
  fadeColor: 0x000000,
  type: 'fade',
};

/**
 * Temple area configurations aligned with lore.
 */
export const TEMPLE_AREAS: Record<string, AreaConfig> = {
  temple_entrance: {
    key: 'temple_entrance',
    mapKey: 'map_temple_entrance',
    tilesetKey: 'temple_tiles',
    tilesetImageKey: 'temple_tileset',
    displayName: 'Temple Entrance',
    ambientColor: 0x2d1b4e,
    fogDensity: 0.1,
    musicKey: 'music_temple_approach',
  },
  main_hall: {
    key: 'main_hall',
    mapKey: 'map_main_hall',
    tilesetKey: 'temple_tiles',
    tilesetImageKey: 'temple_tileset',
    displayName: 'Great Hall',
    ambientColor: 0xd4a574,
    fogDensity: 0.2,
    musicKey: 'music_temple_interior',
  },
  archives: {
    key: 'archives',
    mapKey: 'map_archives',
    tilesetKey: 'temple_tiles',
    tilesetImageKey: 'temple_tileset',
    displayName: 'Jedi Archives',
    ambientColor: 0x1a1a3e,
    fogDensity: 0.3,
    musicKey: 'music_archives',
  },
  training_grounds: {
    key: 'training_grounds',
    mapKey: 'map_training_grounds',
    tilesetKey: 'temple_tiles',
    tilesetImageKey: 'temple_tileset',
    displayName: 'Training Grounds',
    ambientColor: 0x4a3a2a,
    fogDensity: 0.15,
    musicKey: 'music_temple_interior',
  },
  meditation_chambers: {
    key: 'meditation_chambers',
    mapKey: 'map_meditation_chambers',
    tilesetKey: 'temple_tiles',
    tilesetImageKey: 'temple_tileset',
    displayName: 'Meditation Chambers',
    ambientColor: 0x3a4a5a,
    fogDensity: 0.4,
    musicKey: 'music_meditation',
  },
  council_chamber: {
    key: 'council_chamber',
    mapKey: 'map_council_chamber',
    tilesetKey: 'temple_tiles',
    tilesetImageKey: 'temple_tileset',
    displayName: 'Council Chamber',
    ambientColor: 0x4a4a4a,
    fogDensity: 0.5,
    musicKey: 'music_council',
  },
};

/**
 * LevelManager - Coordinates level loading, transitions, and state.
 */
export class LevelManager {
  private scene: Phaser.Scene;
  private eventBus: EventBus;
  private tilemapManager: TilemapManager;
  private checkpointSystem: CheckpointSystem;

  // Current state
  private currentArea: AreaConfig | null = null;
  private levelState: LevelState;
  private isTransitioning: boolean = false;

  // Transition settings
  private transitionConfig: TransitionConfig = DEFAULT_TRANSITION;

  // Callbacks for area lifecycle
  private onAreaLoadCallbacks: Array<(area: AreaConfig, result: TilemapLoadResult) => void> = [];
  private onAreaUnloadCallbacks: Array<(area: AreaConfig) => void> = [];

  constructor(scene: Phaser.Scene, eventBus: EventBus) {
    this.scene = scene;
    this.eventBus = eventBus;
    this.tilemapManager = new TilemapManager(scene, eventBus);
    this.checkpointSystem = new CheckpointSystem(eventBus);

    // Initialize level state
    this.levelState = {
      currentArea: '',
      playerPosition: { x: 0, y: 0 },
      clearedEnemies: [],
      collectedPickups: [],
      triggeredEvents: [],
      checkpoint: null,
    };

    this.setupEventListeners();
  }

  /**
   * Setup event listeners for level events.
   */
  private setupEventListeners(): void {
    // Listen for checkpoint events
    this.eventBus.on('checkpoint:reached', (event: GameEvent) => {
      const data = event.data as { checkpointId: string; position: { x: number; y: number } };
      this.onCheckpointReached(data.checkpointId, data.position);
    });

    // Listen for player death to respawn at checkpoint
    this.eventBus.on('player:death', () => {
      this.respawnAtCheckpoint();
    });
  }

  /**
   * Load an area by key.
   */
  loadArea(areaKey: string, spawnPoint?: string): boolean {
    const areaConfig = TEMPLE_AREAS[areaKey];

    if (!areaConfig) {
      Logger.error(`Unknown area: ${areaKey}`);
      return false;
    }

    // Load the tilemap
    const result = this.tilemapManager.loadMap(
      areaConfig.mapKey,
      areaConfig.tilesetKey,
      areaConfig.tilesetImageKey
    );

    if (!result.success) {
      Logger.error(`Failed to load area ${areaKey}: ${result.error}`);
      return false;
    }

    this.currentArea = areaConfig;
    this.levelState.currentArea = areaKey;

    // Apply area visual settings
    this.applyAreaVisuals(areaConfig);

    // Notify callbacks
    for (const callback of this.onAreaLoadCallbacks) {
      callback(areaConfig, result);
    }

    // Emit area change event
    this.eventBus.emit({
      type: 'area:change',
      data: {
        areaKey,
        displayName: areaConfig.displayName,
        spawnPoint,
      },
    });

    return true;
  }

  /**
   * Transition to a new area with visual effects.
   */
  async transitionToArea(
    targetArea: string,
    targetSpawn: string = 'default',
    transition: TransitionConfig = this.transitionConfig
  ): Promise<boolean> {
    if (this.isTransitioning) {
      Logger.warn('Transition already in progress');
      return false;
    }

    this.isTransitioning = true;

    // Emit transition start event
    this.eventBus.emit({
      type: 'scene:transition',
      data: {
        from: this.currentArea?.key,
        to: targetArea,
        phase: 'start',
      },
    });

    return new Promise((resolve) => {
      // Fade out
      this.scene.cameras.main.fadeOut(transition.duration, 0, 0, 0);

      this.scene.cameras.main.once('camerafadeoutcomplete', () => {
        // Unload current area
        if (this.currentArea) {
          this.unloadCurrentArea();
        }

        // Load new area
        const success = this.loadArea(targetArea, targetSpawn);

        // Fade in
        this.scene.cameras.main.fadeIn(transition.duration, 0, 0, 0);

        this.scene.cameras.main.once('camerafadeincomplete', () => {
          this.isTransitioning = false;

          // Emit transition complete event
          this.eventBus.emit({
            type: 'scene:transition',
            data: {
              from: this.levelState.currentArea,
              to: targetArea,
              phase: 'complete',
            },
          });

          resolve(success);
        });
      });
    });
  }

  /**
   * Apply visual settings for an area (ambient color, fog).
   */
  private applyAreaVisuals(config: AreaConfig): void {
    // Set background color with ambient tint
    this.scene.cameras.main.setBackgroundColor(config.ambientColor);

    // Apply fog effect if available (via postFX or custom shader)
    // This is a placeholder for more advanced fog implementation
    if (config.fogDensity > 0) {
      // Could use Phaser's post-processing or p5.js effects layer
      this.eventBus.emit({
        type: 'effects:fog',
        data: {
          density: config.fogDensity,
          color: config.ambientColor,
        },
      });
    }
  }

  /**
   * Unload the current area.
   */
  unloadCurrentArea(): void {
    if (!this.currentArea) return;

    // Notify callbacks before unloading
    for (const callback of this.onAreaUnloadCallbacks) {
      callback(this.currentArea);
    }

    // Unload tilemap
    this.tilemapManager.unloadCurrentMap();

    // Emit unload event
    this.eventBus.emit({
      type: 'area:unload',
      data: { areaKey: this.currentArea.key },
    });

    this.currentArea = null;
  }

  /**
   * Handle checkpoint reached event.
   */
  private onCheckpointReached(checkpointId: string, position: { x: number; y: number }): void {
    const checkpoint: CheckpointData = {
      id: checkpointId,
      areaKey: this.levelState.currentArea,
      position,
      timestamp: Date.now(),
      levelState: { ...this.levelState },
    };

    this.checkpointSystem.saveCheckpoint(checkpoint);
    this.levelState.checkpoint = checkpoint;

    this.eventBus.emit({
      type: 'checkpoint:saved',
      data: { checkpointId, areaKey: this.levelState.currentArea },
    });
  }

  /**
   * Respawn player at the last checkpoint.
   */
  respawnAtCheckpoint(): void {
    const checkpoint = this.checkpointSystem.getLastCheckpoint();

    if (!checkpoint) {
      // No checkpoint, restart the area from beginning
      this.restartCurrentArea();
      return;
    }

    // If checkpoint is in a different area, transition to it
    if (checkpoint.areaKey !== this.levelState.currentArea) {
      this.transitionToArea(checkpoint.areaKey, 'checkpoint').then(() => {
        this.eventBus.emit({
          type: 'player:respawn',
          data: { position: checkpoint.position, fromCheckpoint: true },
        });
      });
    } else {
      // Same area, just respawn at position
      this.eventBus.emit({
        type: 'player:respawn',
        data: { position: checkpoint.position, fromCheckpoint: true },
      });
    }

    // Restore level state from checkpoint
    if (checkpoint.levelState) {
      this.levelState.clearedEnemies = [...checkpoint.levelState.clearedEnemies];
      this.levelState.collectedPickups = [...checkpoint.levelState.collectedPickups];
      this.levelState.triggeredEvents = [...checkpoint.levelState.triggeredEvents];
    }
  }

  /**
   * Restart the current area from the beginning.
   */
  restartCurrentArea(): void {
    if (!this.currentArea) return;

    const areaKey = this.currentArea.key;

    // Clear level state for this area
    this.levelState.clearedEnemies = [];
    this.levelState.collectedPickups = [];
    this.levelState.triggeredEvents = [];

    // Reload the area
    this.transitionToArea(areaKey, 'default');
  }

  /**
   * Mark an enemy as cleared (won't respawn on reload).
   */
  markEnemyCleared(enemyId: string): void {
    if (!this.levelState.clearedEnemies.includes(enemyId)) {
      this.levelState.clearedEnemies.push(enemyId);
    }
  }

  /**
   * Mark a pickup as collected (won't respawn on reload).
   */
  markPickupCollected(pickupId: string): void {
    if (!this.levelState.collectedPickups.includes(pickupId)) {
      this.levelState.collectedPickups.push(pickupId);
    }
  }

  /**
   * Mark an event as triggered (cutscene, dialogue, etc).
   */
  markEventTriggered(eventId: string): void {
    if (!this.levelState.triggeredEvents.includes(eventId)) {
      this.levelState.triggeredEvents.push(eventId);
    }
  }

  /**
   * Check if an enemy should spawn (not previously cleared).
   */
  shouldSpawnEnemy(enemyId: string): boolean {
    return !this.levelState.clearedEnemies.includes(enemyId);
  }

  /**
   * Check if a pickup should spawn (not previously collected).
   */
  shouldSpawnPickup(pickupId: string): boolean {
    return !this.levelState.collectedPickups.includes(pickupId);
  }

  /**
   * Check if an event should trigger (not previously triggered).
   */
  shouldTriggerEvent(eventId: string): boolean {
    return !this.levelState.triggeredEvents.includes(eventId);
  }

  /**
   * Register a callback for when an area is loaded.
   */
  onAreaLoad(callback: (area: AreaConfig, result: TilemapLoadResult) => void): void {
    this.onAreaLoadCallbacks.push(callback);
  }

  /**
   * Register a callback for when an area is unloaded.
   */
  onAreaUnload(callback: (area: AreaConfig) => void): void {
    this.onAreaUnloadCallbacks.push(callback);
  }

  /**
   * Get the tilemap manager.
   */
  getTilemapManager(): TilemapManager {
    return this.tilemapManager;
  }

  /**
   * Get the checkpoint system.
   */
  getCheckpointSystem(): CheckpointSystem {
    return this.checkpointSystem;
  }

  /**
   * Get the current area configuration.
   */
  getCurrentArea(): AreaConfig | null {
    return this.currentArea;
  }

  /**
   * Get the current level state.
   */
  getLevelState(): LevelState {
    return { ...this.levelState };
  }

  /**
   * Check if a transition is in progress.
   */
  getIsTransitioning(): boolean {
    return this.isTransitioning;
  }

  /**
   * Set custom transition configuration.
   */
  setTransitionConfig(config: Partial<TransitionConfig>): void {
    this.transitionConfig = { ...this.transitionConfig, ...config };
  }

  /**
   * Save the current level state to storage.
   */
  saveLevelState(): void {
    try {
      const stateJson = JSON.stringify(this.levelState);
      localStorage.setItem('temple_march_level_state', stateJson);
    } catch (error) {
      Logger.error('Failed to save level state:', error);
    }
  }

  /**
   * Load level state from storage.
   */
  loadLevelState(): boolean {
    try {
      const stateJson = localStorage.getItem('temple_march_level_state');
      if (stateJson) {
        this.levelState = JSON.parse(stateJson);
        return true;
      }
    } catch (error) {
      Logger.error('Failed to load level state:', error);
    }
    return false;
  }

  /**
   * Clear all saved state.
   */
  clearSavedState(): void {
    localStorage.removeItem('temple_march_level_state');
    this.checkpointSystem.clearAllCheckpoints();
    this.levelState = {
      currentArea: '',
      playerPosition: { x: 0, y: 0 },
      clearedEnemies: [],
      collectedPickups: [],
      triggeredEvents: [],
      checkpoint: null,
    };
  }

  /**
   * Destroy the manager and clean up.
   */
  destroy(): void {
    this.tilemapManager.destroy();
    this.onAreaLoadCallbacks = [];
    this.onAreaUnloadCallbacks = [];
  }
}
