/**
 * TilemapManager Tests
 * Phase 4: Temple Levels
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TilemapManager,
  TilemapObject,
  TilemapObjectType,
  TILEMAP_LAYER_CONFIG,
} from '../../src/levels/TilemapManager';
import { EventBus } from '../../src/core/events/EventBus';

// Mock Phaser types and functions
const createMockTilemap = () => ({
  widthInPixels: 1280,
  heightInPixels: 720,
  addTilesetImage: vi.fn().mockReturnValue({
    name: 'temple_tiles',
  }),
  createLayer: vi.fn().mockImplementation((name: string) => ({
    name,
    setDepth: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
    setCollisionByProperty: vi.fn().mockReturnThis(),
    setCollisionByExclusion: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    getTileAtWorldXY: vi.fn().mockReturnValue(null),
  })),
  getObjectLayer: vi.fn().mockReturnValue({
    objects: [
      {
        id: 1,
        type: 'player_spawn',
        x: 100,
        y: 200,
        width: 32,
        height: 32,
        name: 'default',
        properties: [],
      },
      {
        id: 2,
        type: 'enemy_spawn',
        x: 400,
        y: 300,
        width: 32,
        height: 32,
        name: 'jedi_1',
        properties: [{ name: 'enemyType', value: 'jedi_defender' }],
      },
      {
        id: 3,
        type: 'checkpoint',
        x: 600,
        y: 350,
        width: 64,
        height: 64,
        name: 'checkpoint_hall',
        properties: [{ name: 'checkpointId', value: 'hall_cp_1' }],
      },
      {
        id: 4,
        type: 'area_transition',
        x: 1200,
        y: 300,
        width: 80,
        height: 200,
        name: 'to_archives',
        properties: [
          { name: 'targetArea', value: 'archives' },
          { name: 'targetSpawn', value: 'entrance' },
        ],
      },
      {
        id: 5,
        type: 'pickup_spawn',
        x: 800,
        y: 400,
        width: 32,
        height: 32,
        name: 'health_pickup_1',
        properties: [
          { name: 'pickupType', value: 'health' },
          { name: 'value', value: 50 },
        ],
      },
      {
        id: 6,
        type: 'destructible',
        x: 500,
        y: 250,
        width: 48,
        height: 48,
        name: 'crate_1',
        properties: [
          { name: 'destructibleType', value: 'crate' },
          { name: 'health', value: 75 },
        ],
      },
    ],
  }),
  destroy: vi.fn(),
});

const createMockScene = () => ({
  make: {
    tilemap: vi.fn().mockReturnValue(createMockTilemap()),
  },
  physics: {
    add: {
      collider: vi.fn().mockReturnValue({ destroy: vi.fn() }),
    },
  },
});

describe('TilemapManager', () => {
  let scene: ReturnType<typeof createMockScene>;
  let eventBus: EventBus;
  let tilemapManager: TilemapManager;

  beforeEach(() => {
    scene = createMockScene();
    eventBus = new EventBus();
    tilemapManager = new TilemapManager(scene as unknown as Phaser.Scene, eventBus);
  });

  describe('TILEMAP_LAYER_CONFIG', () => {
    it('should define all required layers', () => {
      expect(TILEMAP_LAYER_CONFIG.background).toBeDefined();
      expect(TILEMAP_LAYER_CONFIG.floor).toBeDefined();
      expect(TILEMAP_LAYER_CONFIG.walls).toBeDefined();
      expect(TILEMAP_LAYER_CONFIG.wallsUpper).toBeDefined();
      expect(TILEMAP_LAYER_CONFIG.decorations).toBeDefined();
      expect(TILEMAP_LAYER_CONFIG.decorationsUpper).toBeDefined();
    });

    it('should have correct collision settings', () => {
      expect(TILEMAP_LAYER_CONFIG.walls.collision).toBe(true);
      expect(TILEMAP_LAYER_CONFIG.background.collision).toBe(false);
      expect(TILEMAP_LAYER_CONFIG.floor.collision).toBe(false);
    });

    it('should have correct z-index ordering', () => {
      expect(TILEMAP_LAYER_CONFIG.background.zIndex).toBeLessThan(TILEMAP_LAYER_CONFIG.floor.zIndex);
      expect(TILEMAP_LAYER_CONFIG.floor.zIndex).toBeLessThan(TILEMAP_LAYER_CONFIG.walls.zIndex);
      expect(TILEMAP_LAYER_CONFIG.walls.zIndex).toBeLessThan(TILEMAP_LAYER_CONFIG.wallsUpper.zIndex);
    });
  });

  describe('loadMap', () => {
    it('should load a tilemap successfully', () => {
      const result = tilemapManager.loadMap('map_temple_entrance', 'temple_tiles', 'temple_tileset');

      expect(result.success).toBe(true);
      expect(result.map).not.toBeNull();
      expect(result.error).toBeUndefined();
    });

    it('should emit tilemap:loaded event on successful load', () => {
      const eventSpy = vi.fn();
      eventBus.on('tilemap:loaded', eventSpy);

      tilemapManager.loadMap('map_temple_entrance', 'temple_tiles', 'temple_tileset');

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tilemap:loaded',
          data: expect.objectContaining({
            mapKey: 'map_temple_entrance',
          }),
        })
      );
    });

    it('should create layers from configuration', () => {
      const result = tilemapManager.loadMap('map_temple_entrance', 'temple_tiles', 'temple_tileset');

      expect(result.layers.size).toBeGreaterThan(0);
    });

    it('should identify collision layers', () => {
      const result = tilemapManager.loadMap('map_temple_entrance', 'temple_tiles', 'temple_tileset');

      expect(result.collisionLayers.length).toBeGreaterThan(0);
    });

    it('should parse objects from object layer', () => {
      const result = tilemapManager.loadMap('map_temple_entrance', 'temple_tiles', 'temple_tileset');

      expect(result.objects.length).toBe(6);
    });

    it('should handle tileset loading failure', () => {
      scene.make.tilemap = vi.fn().mockReturnValue({
        ...createMockTilemap(),
        addTilesetImage: vi.fn().mockReturnValue(null),
      });

      const result = tilemapManager.loadMap('map_temple_entrance', 'invalid_tileset', 'invalid_image');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to load tileset');
    });

    it('should unload previous map before loading new one', () => {
      // Load first map
      tilemapManager.loadMap('map_1', 'temple_tiles', 'temple_tileset');
      expect(tilemapManager.isMapLoaded()).toBe(true);

      // Load second map
      tilemapManager.loadMap('map_2', 'temple_tiles', 'temple_tileset');

      // Should still have a map loaded (the new one)
      expect(tilemapManager.isMapLoaded()).toBe(true);
    });
  });

  describe('getObjectsByType', () => {
    beforeEach(() => {
      tilemapManager.loadMap('map_temple_entrance', 'temple_tiles', 'temple_tileset');
    });

    it('should return all objects of a specific type', () => {
      const enemySpawns = tilemapManager.getObjectsByType('enemy_spawn');

      expect(enemySpawns.length).toBe(1);
      expect(enemySpawns[0].type).toBe('enemy_spawn');
    });

    it('should return empty array for non-existent type', () => {
      const triggers = tilemapManager.getObjectsByType('trigger_zone');

      expect(triggers.length).toBe(0);
    });
  });

  describe('getObjectByName', () => {
    beforeEach(() => {
      tilemapManager.loadMap('map_temple_entrance', 'temple_tiles', 'temple_tileset');
    });

    it('should find object by name', () => {
      const checkpoint = tilemapManager.getObjectByName('checkpoint_hall');

      expect(checkpoint).toBeDefined();
      expect(checkpoint?.type).toBe('checkpoint');
    });

    it('should return undefined for non-existent name', () => {
      const result = tilemapManager.getObjectByName('non_existent');

      expect(result).toBeUndefined();
    });
  });

  describe('getPlayerSpawn', () => {
    it('should return player spawn position', () => {
      tilemapManager.loadMap('map_temple_entrance', 'temple_tiles', 'temple_tileset');

      const spawn = tilemapManager.getPlayerSpawn();

      expect(spawn).not.toBeNull();
      expect(spawn?.x).toBe(100);
      expect(spawn?.y).toBe(200);
    });

    it('should return null if no player spawn exists', () => {
      scene.make.tilemap = vi.fn().mockReturnValue({
        ...createMockTilemap(),
        getObjectLayer: vi.fn().mockReturnValue({ objects: [] }),
      });

      tilemapManager = new TilemapManager(scene as unknown as Phaser.Scene, eventBus);
      tilemapManager.loadMap('map_empty', 'temple_tiles', 'temple_tileset');

      const spawn = tilemapManager.getPlayerSpawn();

      expect(spawn).toBeNull();
    });
  });

  describe('getEnemySpawns', () => {
    it('should return all enemy spawn points with types', () => {
      tilemapManager.loadMap('map_temple_entrance', 'temple_tiles', 'temple_tileset');

      const spawns = tilemapManager.getEnemySpawns();

      expect(spawns.length).toBe(1);
      expect(spawns[0].x).toBe(400);
      expect(spawns[0].y).toBe(300);
      expect(spawns[0].enemyType).toBe('jedi_defender');
    });
  });

  describe('getCheckpoints', () => {
    it('should return all checkpoint locations', () => {
      tilemapManager.loadMap('map_temple_entrance', 'temple_tiles', 'temple_tileset');

      const checkpoints = tilemapManager.getCheckpoints();

      expect(checkpoints.length).toBe(1);
      expect(checkpoints[0].x).toBe(600);
      expect(checkpoints[0].y).toBe(350);
      expect(checkpoints[0].name).toBe('checkpoint_hall');
      expect(checkpoints[0].id).toBe('hall_cp_1');
    });
  });

  describe('getAreaTransitions', () => {
    it('should return all area transition triggers', () => {
      tilemapManager.loadMap('map_temple_entrance', 'temple_tiles', 'temple_tileset');

      const transitions = tilemapManager.getAreaTransitions();

      expect(transitions.length).toBe(1);
      expect(transitions[0].targetArea).toBe('archives');
      expect(transitions[0].targetSpawn).toBe('entrance');
      expect(transitions[0].width).toBe(80);
      expect(transitions[0].height).toBe(200);
    });
  });

  describe('getPickupSpawns', () => {
    it('should return all pickup spawn points', () => {
      tilemapManager.loadMap('map_temple_entrance', 'temple_tiles', 'temple_tileset');

      const pickups = tilemapManager.getPickupSpawns();

      expect(pickups.length).toBe(1);
      expect(pickups[0].pickupType).toBe('health');
      expect(pickups[0].value).toBe(50);
    });
  });

  describe('getDestructibleSpawns', () => {
    it('should return all destructible spawn points', () => {
      tilemapManager.loadMap('map_temple_entrance', 'temple_tiles', 'temple_tileset');

      const destructibles = tilemapManager.getDestructibleSpawns();

      expect(destructibles.length).toBe(1);
      expect(destructibles[0].destructibleType).toBe('crate');
      expect(destructibles[0].health).toBe(75);
    });
  });

  describe('getMapDimensions', () => {
    it('should return map dimensions after loading', () => {
      tilemapManager.loadMap('map_temple_entrance', 'temple_tiles', 'temple_tileset');

      const dimensions = tilemapManager.getMapDimensions();

      expect(dimensions).not.toBeNull();
      expect(dimensions?.width).toBe(1280);
      expect(dimensions?.height).toBe(720);
    });

    it('should return null if no map is loaded', () => {
      const dimensions = tilemapManager.getMapDimensions();

      expect(dimensions).toBeNull();
    });
  });

  describe('addCollider', () => {
    it('should add colliders for all collision layers', () => {
      tilemapManager.loadMap('map_temple_entrance', 'temple_tiles', 'temple_tileset');

      const mockObject = { x: 100, y: 100 };
      const colliders = tilemapManager.addCollider(mockObject as unknown as Phaser.GameObjects.GameObject);

      expect(colliders.length).toBeGreaterThan(0);
      expect(scene.physics.add.collider).toHaveBeenCalled();
    });
  });

  describe('unloadCurrentMap', () => {
    it('should clear all state after unloading', () => {
      tilemapManager.loadMap('map_temple_entrance', 'temple_tiles', 'temple_tileset');
      expect(tilemapManager.isMapLoaded()).toBe(true);

      tilemapManager.unloadCurrentMap();

      expect(tilemapManager.isMapLoaded()).toBe(false);
      expect(tilemapManager.getMapDimensions()).toBeNull();
      expect(tilemapManager.getPlayerSpawn()).toBeNull();
    });

    it('should emit tilemap:unloaded event', () => {
      tilemapManager.loadMap('map_temple_entrance', 'temple_tiles', 'temple_tileset');

      const eventSpy = vi.fn();
      eventBus.on('tilemap:unloaded', eventSpy);

      tilemapManager.unloadCurrentMap();

      expect(eventSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('isMapLoaded', () => {
    it('should return false initially', () => {
      expect(tilemapManager.isMapLoaded()).toBe(false);
    });

    it('should return true after loading a map', () => {
      tilemapManager.loadMap('map_temple_entrance', 'temple_tiles', 'temple_tileset');

      expect(tilemapManager.isMapLoaded()).toBe(true);
    });

    it('should return false after unloading', () => {
      tilemapManager.loadMap('map_temple_entrance', 'temple_tiles', 'temple_tileset');
      tilemapManager.unloadCurrentMap();

      expect(tilemapManager.isMapLoaded()).toBe(false);
    });
  });

  describe('getLayer', () => {
    it('should return a specific layer by name', () => {
      tilemapManager.loadMap('map_temple_entrance', 'temple_tiles', 'temple_tileset');

      const wallsLayer = tilemapManager.getLayer('walls');

      expect(wallsLayer).toBeDefined();
    });

    it('should return undefined for non-existent layer', () => {
      tilemapManager.loadMap('map_temple_entrance', 'temple_tiles', 'temple_tileset');

      const layer = tilemapManager.getLayer('non_existent');

      expect(layer).toBeUndefined();
    });
  });

  describe('destroy', () => {
    it('should clean up all resources', () => {
      tilemapManager.loadMap('map_temple_entrance', 'temple_tiles', 'temple_tileset');
      tilemapManager.destroy();

      expect(tilemapManager.isMapLoaded()).toBe(false);
    });
  });
});
