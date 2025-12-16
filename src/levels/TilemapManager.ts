/**
 * TilemapManager - Handles Tiled map loading, layer management, and collision setup.
 * Core system for Phase 4: Temple Levels.
 */

import Phaser from 'phaser';
import { Layer } from '../core/types';
import { EventBus, GameEvent } from '../core/events/EventBus';

/**
 * Tilemap layer configuration following TECHNICAL_SPEC.
 */
export interface TilemapLayerConfig {
  name: string;
  zIndex: number;
  collision: boolean;
  visible: boolean;
}

/**
 * Standard layer configuration for temple levels.
 */
export const TILEMAP_LAYER_CONFIG: Record<string, TilemapLayerConfig> = {
  background: { name: 'background', zIndex: Layer.Background, collision: false, visible: true },
  floor: { name: 'floor', zIndex: Layer.Terrain, collision: false, visible: true },
  walls: { name: 'walls', zIndex: Layer.Terrain + 5, collision: true, visible: true },
  wallsUpper: { name: 'wallsUpper', zIndex: Layer.UI - 10, collision: false, visible: true },
  decorations: { name: 'decorations', zIndex: Layer.Terrain + 2, collision: false, visible: true },
  decorationsUpper: { name: 'decorationsUpper', zIndex: Layer.UI - 10, collision: false, visible: true },
};

/**
 * Object types that can be spawned from tilemap object layers.
 */
export type TilemapObjectType =
  | 'player_spawn'
  | 'enemy_spawn'
  | 'trigger_zone'
  | 'area_transition'
  | 'pickup_spawn'
  | 'checkpoint'
  | 'destructible';

/**
 * Parsed object from tilemap object layer.
 */
export interface TilemapObject {
  id: number;
  type: TilemapObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  properties: Record<string, unknown>;
}

/**
 * Result of loading a tilemap.
 */
export interface TilemapLoadResult {
  success: boolean;
  map: Phaser.Tilemaps.Tilemap | null;
  layers: Map<string, Phaser.Tilemaps.TilemapLayer>;
  objects: TilemapObject[];
  collisionLayers: Phaser.Tilemaps.TilemapLayer[];
  error?: string;
}

/**
 * Tile property for custom behavior.
 */
export interface TileProperty {
  collides: boolean;
  friction: number;
  damaging: boolean;
  damageType: string;
  sound: string;
}

/**
 * TilemapManager - Manages tilemap loading, layers, and collision.
 */
export class TilemapManager {
  private scene: Phaser.Scene;
  private eventBus: EventBus;

  // Current map state
  private currentMap: Phaser.Tilemaps.Tilemap | null = null;
  private currentLayers: Map<string, Phaser.Tilemaps.TilemapLayer> = new Map();
  private collisionLayers: Phaser.Tilemaps.TilemapLayer[] = [];
  private mapObjects: TilemapObject[] = [];

  // Tileset cache
  private loadedTilesets: Map<string, Phaser.Tilemaps.Tileset> = new Map();

  constructor(scene: Phaser.Scene, eventBus: EventBus) {
    this.scene = scene;
    this.eventBus = eventBus;
  }

  /**
   * Load a tilemap by key.
   * Expects the map JSON to be preloaded in BootScene.
   */
  loadMap(mapKey: string, tilesetKey: string, tilesetImageKey: string): TilemapLoadResult {
    try {
      // Clear any existing map
      this.unloadCurrentMap();

      // Create tilemap from loaded JSON
      const map = this.scene.make.tilemap({ key: mapKey });

      if (!map) {
        return {
          success: false,
          map: null,
          layers: new Map(),
          objects: [],
          collisionLayers: [],
          error: `Failed to create tilemap from key: ${mapKey}`,
        };
      }

      // Add tileset
      const tileset = map.addTilesetImage(tilesetKey, tilesetImageKey);

      if (!tileset) {
        return {
          success: false,
          map: null,
          layers: new Map(),
          objects: [],
          collisionLayers: [],
          error: `Failed to load tileset: ${tilesetKey}`,
        };
      }

      this.loadedTilesets.set(tilesetKey, tileset);
      this.currentMap = map;

      // Create visual layers
      this.createLayers(map, tileset);

      // Parse object layers
      this.parseObjectLayers(map);

      // Setup collisions
      this.setupCollisions();

      // Emit load event
      this.eventBus.emit({
        type: 'tilemap:loaded',
        data: { mapKey, width: map.widthInPixels, height: map.heightInPixels },
      });

      return {
        success: true,
        map: this.currentMap,
        layers: this.currentLayers,
        objects: this.mapObjects,
        collisionLayers: this.collisionLayers,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error loading tilemap';
      return {
        success: false,
        map: null,
        layers: new Map(),
        objects: [],
        collisionLayers: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Create tilemap layers from configuration.
   */
  private createLayers(map: Phaser.Tilemaps.Tilemap, tileset: Phaser.Tilemaps.Tileset): void {
    for (const [key, config] of Object.entries(TILEMAP_LAYER_CONFIG)) {
      const layer = map.createLayer(config.name, tileset);

      if (layer) {
        layer.setDepth(config.zIndex);
        layer.setVisible(config.visible);
        this.currentLayers.set(key, layer);

        if (config.collision) {
          this.collisionLayers.push(layer);
        }
      }
    }
  }

  /**
   * Parse object layers from the tilemap.
   */
  private parseObjectLayers(map: Phaser.Tilemaps.Tilemap): void {
    this.mapObjects = [];

    // Look for 'objects' layer
    const objectLayer = map.getObjectLayer('objects');

    if (!objectLayer) {
      return;
    }

    for (const obj of objectLayer.objects) {
      const tilemapObj: TilemapObject = {
        id: obj.id,
        type: (obj.type as TilemapObjectType) || 'trigger_zone',
        x: obj.x ?? 0,
        y: obj.y ?? 0,
        width: obj.width ?? 0,
        height: obj.height ?? 0,
        name: obj.name ?? '',
        properties: this.parseObjectProperties(obj),
      };

      this.mapObjects.push(tilemapObj);
    }
  }

  /**
   * Parse custom properties from a Tiled object.
   */
  private parseObjectProperties(obj: Phaser.Types.Tilemaps.TiledObject): Record<string, unknown> {
    const props: Record<string, unknown> = {};

    if (obj.properties) {
      for (const prop of obj.properties as Array<{ name: string; value: unknown }>) {
        props[prop.name] = prop.value;
      }
    }

    return props;
  }

  /**
   * Setup collision detection on collision layers.
   */
  private setupCollisions(): void {
    for (const layer of this.collisionLayers) {
      // Set collision by tile property 'collides'
      layer.setCollisionByProperty({ collides: true });

      // Also set collision by exclusion (any non-empty tile)
      // This provides fallback collision detection
      layer.setCollisionByExclusion([-1]);
    }
  }

  /**
   * Add collision between a game object and all collision layers.
   */
  addCollider(
    object: Phaser.GameObjects.GameObject | Phaser.GameObjects.Group,
    callback?: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback
  ): Phaser.Physics.Arcade.Collider[] {
    const colliders: Phaser.Physics.Arcade.Collider[] = [];

    for (const layer of this.collisionLayers) {
      const collider = this.scene.physics.add.collider(object, layer, callback);
      colliders.push(collider);
    }

    return colliders;
  }

  /**
   * Get objects by type.
   */
  getObjectsByType(type: TilemapObjectType): TilemapObject[] {
    return this.mapObjects.filter(obj => obj.type === type);
  }

  /**
   * Get object by name.
   */
  getObjectByName(name: string): TilemapObject | undefined {
    return this.mapObjects.find(obj => obj.name === name);
  }

  /**
   * Get player spawn point.
   */
  getPlayerSpawn(): { x: number; y: number } | null {
    const spawns = this.getObjectsByType('player_spawn');
    if (spawns.length > 0) {
      return { x: spawns[0].x, y: spawns[0].y };
    }
    return null;
  }

  /**
   * Get all enemy spawn points.
   */
  getEnemySpawns(): Array<{ x: number; y: number; enemyType: string }> {
    const spawns = this.getObjectsByType('enemy_spawn');
    return spawns.map(spawn => ({
      x: spawn.x,
      y: spawn.y,
      enemyType: (spawn.properties.enemyType as string) || 'jedi_defender',
    }));
  }

  /**
   * Get all checkpoint locations.
   */
  getCheckpoints(): Array<{ x: number; y: number; name: string; id: string }> {
    const checkpoints = this.getObjectsByType('checkpoint');
    return checkpoints.map(cp => ({
      x: cp.x,
      y: cp.y,
      name: cp.name,
      id: (cp.properties.checkpointId as string) || `checkpoint_${cp.id}`,
    }));
  }

  /**
   * Get all area transitions.
   */
  getAreaTransitions(): Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    targetArea: string;
    targetSpawn: string;
  }> {
    const transitions = this.getObjectsByType('area_transition');
    return transitions.map(t => ({
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      targetArea: (t.properties.targetArea as string) || '',
      targetSpawn: (t.properties.targetSpawn as string) || 'default',
    }));
  }

  /**
   * Get all pickup spawn points.
   */
  getPickupSpawns(): Array<{
    x: number;
    y: number;
    pickupType: string;
    value: number;
  }> {
    const pickups = this.getObjectsByType('pickup_spawn');
    return pickups.map(p => ({
      x: p.x,
      y: p.y,
      pickupType: (p.properties.pickupType as string) || 'health',
      value: (p.properties.value as number) || 25,
    }));
  }

  /**
   * Get all destructible spawn points.
   */
  getDestructibleSpawns(): Array<{
    x: number;
    y: number;
    destructibleType: string;
    health: number;
  }> {
    const destructibles = this.getObjectsByType('destructible');
    return destructibles.map(d => ({
      x: d.x,
      y: d.y,
      destructibleType: (d.properties.destructibleType as string) || 'crate',
      health: (d.properties.health as number) || 50,
    }));
  }

  /**
   * Get current map dimensions.
   */
  getMapDimensions(): { width: number; height: number } | null {
    if (!this.currentMap) return null;
    return {
      width: this.currentMap.widthInPixels,
      height: this.currentMap.heightInPixels,
    };
  }

  /**
   * Get a specific layer by name.
   */
  getLayer(name: string): Phaser.Tilemaps.TilemapLayer | undefined {
    return this.currentLayers.get(name);
  }

  /**
   * Get tile at world position.
   */
  getTileAt(worldX: number, worldY: number, layerName: string = 'walls'): Phaser.Tilemaps.Tile | null {
    const layer = this.currentLayers.get(layerName);
    if (!layer) return null;
    return layer.getTileAtWorldXY(worldX, worldY);
  }

  /**
   * Get tile properties at world position.
   */
  getTileProperties(worldX: number, worldY: number, layerName: string = 'walls'): TileProperty | null {
    const tile = this.getTileAt(worldX, worldY, layerName);
    if (!tile || !tile.properties) return null;

    return {
      collides: tile.properties.collides ?? false,
      friction: tile.properties.friction ?? 1.0,
      damaging: tile.properties.damaging ?? false,
      damageType: tile.properties.damageType ?? 'physical',
      sound: tile.properties.sound ?? '',
    };
  }

  /**
   * Unload the current map and clean up resources.
   */
  unloadCurrentMap(): void {
    // Destroy all layers
    for (const layer of this.currentLayers.values()) {
      layer.destroy();
    }
    this.currentLayers.clear();
    this.collisionLayers = [];
    this.mapObjects = [];

    // Destroy the map
    if (this.currentMap) {
      this.currentMap.destroy();
      this.currentMap = null;
    }

    // Clear tileset cache
    this.loadedTilesets.clear();

    // Emit unload event
    this.eventBus.emit({
      type: 'tilemap:unloaded',
      data: {},
    });
  }

  /**
   * Check if a map is currently loaded.
   */
  isMapLoaded(): boolean {
    return this.currentMap !== null;
  }

  /**
   * Get the current map instance.
   */
  getCurrentMap(): Phaser.Tilemaps.Tilemap | null {
    return this.currentMap;
  }

  /**
   * Destroy the manager and clean up all resources.
   */
  destroy(): void {
    this.unloadCurrentMap();
  }
}
