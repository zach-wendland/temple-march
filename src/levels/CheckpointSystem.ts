/**
 * CheckpointSystem - Manages save points and player respawn.
 * Handles checkpoint activation, saving, and restoration.
 */

import { EventBus, GameEvent } from '../core/events/EventBus';
import { Logger } from '../utils/Logger';

/**
 * Level state snapshot for checkpoint.
 */
export interface LevelStateSnapshot {
  clearedEnemies: string[];
  collectedPickups: string[];
  triggeredEvents: string[];
}

/**
 * Checkpoint data structure.
 */
export interface CheckpointData {
  id: string;
  areaKey: string;
  position: { x: number; y: number };
  timestamp: number;
  levelState: LevelStateSnapshot;
}

/**
 * Checkpoint configuration.
 */
export interface CheckpointConfig {
  maxCheckpoints: number;
  autoSave: boolean;
  storageKey: string;
}

/**
 * Default checkpoint configuration.
 */
export const DEFAULT_CHECKPOINT_CONFIG: CheckpointConfig = {
  maxCheckpoints: 10,
  autoSave: true,
  storageKey: 'temple_march_checkpoints',
};

/**
 * CheckpointSystem - Handles saving and restoring player progress.
 */
export class CheckpointSystem {
  private eventBus: EventBus;
  private config: CheckpointConfig;

  // Checkpoint storage
  private checkpoints: Map<string, CheckpointData> = new Map();
  private lastCheckpoint: CheckpointData | null = null;
  private checkpointHistory: string[] = [];

  constructor(eventBus: EventBus, config: Partial<CheckpointConfig> = {}) {
    this.eventBus = eventBus;
    this.config = { ...DEFAULT_CHECKPOINT_CONFIG, ...config };

    // Load checkpoints from storage if auto-save enabled
    if (this.config.autoSave) {
      this.loadFromStorage();
    }
  }

  /**
   * Save a checkpoint.
   */
  saveCheckpoint(data: CheckpointData): void {
    // Store checkpoint
    this.checkpoints.set(data.id, data);
    this.lastCheckpoint = data;

    // Add to history
    if (!this.checkpointHistory.includes(data.id)) {
      this.checkpointHistory.push(data.id);
    }

    // Trim old checkpoints if exceeding max
    while (this.checkpointHistory.length > this.config.maxCheckpoints) {
      const oldestId = this.checkpointHistory.shift();
      if (oldestId && oldestId !== data.id) {
        this.checkpoints.delete(oldestId);
      }
    }

    // Auto-save to storage
    if (this.config.autoSave) {
      this.saveToStorage();
    }

    // Emit checkpoint saved event
    this.eventBus.emit({
      type: 'checkpoint:saved',
      data: {
        checkpointId: data.id,
        areaKey: data.areaKey,
        position: data.position,
      },
    });
  }

  /**
   * Get a checkpoint by ID.
   */
  getCheckpoint(id: string): CheckpointData | null {
    return this.checkpoints.get(id) || null;
  }

  /**
   * Get the most recent checkpoint.
   */
  getLastCheckpoint(): CheckpointData | null {
    return this.lastCheckpoint;
  }

  /**
   * Get checkpoint for a specific area.
   */
  getCheckpointForArea(areaKey: string): CheckpointData | null {
    // Find most recent checkpoint in the specified area
    let latestCheckpoint: CheckpointData | null = null;
    let latestTimestamp = 0;

    for (const checkpoint of this.checkpoints.values()) {
      if (checkpoint.areaKey === areaKey && checkpoint.timestamp > latestTimestamp) {
        latestCheckpoint = checkpoint;
        latestTimestamp = checkpoint.timestamp;
      }
    }

    return latestCheckpoint;
  }

  /**
   * Get all checkpoints.
   */
  getAllCheckpoints(): CheckpointData[] {
    return Array.from(this.checkpoints.values());
  }

  /**
   * Get checkpoints ordered by timestamp (newest first).
   */
  getCheckpointsByRecency(): CheckpointData[] {
    return this.getAllCheckpoints().sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear a specific checkpoint.
   */
  clearCheckpoint(id: string): boolean {
    const existed = this.checkpoints.delete(id);

    if (existed) {
      // Update history
      const historyIndex = this.checkpointHistory.indexOf(id);
      if (historyIndex >= 0) {
        this.checkpointHistory.splice(historyIndex, 1);
      }

      // Update last checkpoint if needed
      if (this.lastCheckpoint?.id === id) {
        this.lastCheckpoint = this.getCheckpointsByRecency()[0] || null;
      }

      // Save changes
      if (this.config.autoSave) {
        this.saveToStorage();
      }
    }

    return existed;
  }

  /**
   * Clear all checkpoints.
   */
  clearAllCheckpoints(): void {
    this.checkpoints.clear();
    this.checkpointHistory = [];
    this.lastCheckpoint = null;

    if (this.config.autoSave) {
      this.clearStorage();
    }

    this.eventBus.emit({
      type: 'checkpoint:all_cleared',
      data: {},
    });
  }

  /**
   * Clear checkpoints for a specific area.
   */
  clearCheckpointsForArea(areaKey: string): number {
    let clearedCount = 0;

    for (const [id, checkpoint] of this.checkpoints.entries()) {
      if (checkpoint.areaKey === areaKey) {
        this.checkpoints.delete(id);
        clearedCount++;

        // Update history
        const historyIndex = this.checkpointHistory.indexOf(id);
        if (historyIndex >= 0) {
          this.checkpointHistory.splice(historyIndex, 1);
        }
      }
    }

    // Update last checkpoint if needed
    if (this.lastCheckpoint?.areaKey === areaKey) {
      this.lastCheckpoint = this.getCheckpointsByRecency()[0] || null;
    }

    if (this.config.autoSave && clearedCount > 0) {
      this.saveToStorage();
    }

    return clearedCount;
  }

  /**
   * Check if a checkpoint exists.
   */
  hasCheckpoint(id: string): boolean {
    return this.checkpoints.has(id);
  }

  /**
   * Check if any checkpoint exists for an area.
   */
  hasCheckpointForArea(areaKey: string): boolean {
    for (const checkpoint of this.checkpoints.values()) {
      if (checkpoint.areaKey === areaKey) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get total number of checkpoints.
   */
  getCheckpointCount(): number {
    return this.checkpoints.size;
  }

  /**
   * Save checkpoints to local storage.
   */
  private saveToStorage(): void {
    try {
      const data = {
        checkpoints: Array.from(this.checkpoints.entries()),
        history: this.checkpointHistory,
        lastCheckpointId: this.lastCheckpoint?.id || null,
      };

      localStorage.setItem(this.config.storageKey, JSON.stringify(data));
    } catch (error) {
      Logger.error('Failed to save checkpoints to storage:', error);
    }
  }

  /**
   * Load checkpoints from local storage.
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);

      if (!stored) {
        return;
      }

      const data = JSON.parse(stored);

      // Restore checkpoints
      if (data.checkpoints && Array.isArray(data.checkpoints)) {
        this.checkpoints = new Map(data.checkpoints);
      }

      // Restore history
      if (data.history && Array.isArray(data.history)) {
        this.checkpointHistory = data.history;
      }

      // Restore last checkpoint reference
      if (data.lastCheckpointId && this.checkpoints.has(data.lastCheckpointId)) {
        this.lastCheckpoint = this.checkpoints.get(data.lastCheckpointId) || null;
      }
    } catch (error) {
      Logger.error('Failed to load checkpoints from storage:', error);
      // Clear corrupted data
      this.clearStorage();
    }
  }

  /**
   * Clear checkpoint storage.
   */
  private clearStorage(): void {
    try {
      localStorage.removeItem(this.config.storageKey);
    } catch (error) {
      Logger.error('Failed to clear checkpoint storage:', error);
    }
  }

  /**
   * Export checkpoints as JSON string.
   */
  exportCheckpoints(): string {
    const data = {
      checkpoints: Array.from(this.checkpoints.entries()),
      history: this.checkpointHistory,
      exportTimestamp: Date.now(),
    };

    return JSON.stringify(data);
  }

  /**
   * Import checkpoints from JSON string.
   */
  importCheckpoints(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);

      if (!data.checkpoints || !Array.isArray(data.checkpoints)) {
        return false;
      }

      // Validate checkpoint data structure
      for (const [id, checkpoint] of data.checkpoints) {
        if (!this.isValidCheckpointData(checkpoint)) {
          return false;
        }
      }

      // Import data
      this.checkpoints = new Map(data.checkpoints);
      this.checkpointHistory = data.history || [];
      this.lastCheckpoint = this.getCheckpointsByRecency()[0] || null;

      // Save imported data
      if (this.config.autoSave) {
        this.saveToStorage();
      }

      return true;
    } catch (error) {
      Logger.error('Failed to import checkpoints:', error);
      return false;
    }
  }

  /**
   * Validate checkpoint data structure.
   */
  private isValidCheckpointData(data: unknown): data is CheckpointData {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const checkpoint = data as Record<string, unknown>;

    return (
      typeof checkpoint.id === 'string' &&
      typeof checkpoint.areaKey === 'string' &&
      typeof checkpoint.position === 'object' &&
      checkpoint.position !== null &&
      typeof (checkpoint.position as { x: number }).x === 'number' &&
      typeof (checkpoint.position as { y: number }).y === 'number' &&
      typeof checkpoint.timestamp === 'number'
    );
  }

  /**
   * Update configuration.
   */
  setConfig(config: Partial<CheckpointConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration.
   */
  getConfig(): CheckpointConfig {
    return { ...this.config };
  }
}
