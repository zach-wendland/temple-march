/**
 * CheckpointSystem Tests
 * Phase 4: Temple Levels
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CheckpointSystem, CheckpointData, CheckpointConfig } from '../../src/levels/CheckpointSystem';
import { EventBus } from '../../src/core/events/EventBus';

describe('CheckpointSystem', () => {
  let eventBus: EventBus;
  let checkpointSystem: CheckpointSystem;

  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    };
  })();

  beforeEach(() => {
    // Setup localStorage mock
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    localStorageMock.clear();

    eventBus = new EventBus();
    checkpointSystem = new CheckpointSystem(eventBus, { autoSave: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('saveCheckpoint', () => {
    it('should save a checkpoint', () => {
      const checkpoint: CheckpointData = {
        id: 'checkpoint_1',
        areaKey: 'temple_entrance',
        position: { x: 100, y: 200 },
        timestamp: Date.now(),
        levelState: {
          clearedEnemies: [],
          collectedPickups: [],
          triggeredEvents: [],
        },
      };

      checkpointSystem.saveCheckpoint(checkpoint);

      expect(checkpointSystem.getCheckpoint('checkpoint_1')).toEqual(checkpoint);
    });

    it('should update lastCheckpoint when saving', () => {
      const checkpoint: CheckpointData = {
        id: 'checkpoint_1',
        areaKey: 'temple_entrance',
        position: { x: 100, y: 200 },
        timestamp: Date.now(),
        levelState: {
          clearedEnemies: [],
          collectedPickups: [],
          triggeredEvents: [],
        },
      };

      checkpointSystem.saveCheckpoint(checkpoint);

      expect(checkpointSystem.getLastCheckpoint()).toEqual(checkpoint);
    });

    it('should emit checkpoint:saved event', () => {
      const eventSpy = vi.fn();
      eventBus.on('checkpoint:saved', eventSpy);

      const checkpoint: CheckpointData = {
        id: 'checkpoint_1',
        areaKey: 'temple_entrance',
        position: { x: 100, y: 200 },
        timestamp: Date.now(),
        levelState: {
          clearedEnemies: [],
          collectedPickups: [],
          triggeredEvents: [],
        },
      };

      checkpointSystem.saveCheckpoint(checkpoint);

      expect(eventSpy).toHaveBeenCalledTimes(1);
    });

    it('should respect maxCheckpoints limit', () => {
      const system = new CheckpointSystem(eventBus, { maxCheckpoints: 3, autoSave: false });

      for (let i = 1; i <= 5; i++) {
        system.saveCheckpoint({
          id: `checkpoint_${i}`,
          areaKey: 'test',
          position: { x: i * 100, y: i * 100 },
          timestamp: Date.now() + i,
          levelState: { clearedEnemies: [], collectedPickups: [], triggeredEvents: [] },
        });
      }

      expect(system.getCheckpointCount()).toBeLessThanOrEqual(3);
    });
  });

  describe('getCheckpoint', () => {
    it('should return null for non-existent checkpoint', () => {
      expect(checkpointSystem.getCheckpoint('non_existent')).toBeNull();
    });

    it('should return the correct checkpoint by ID', () => {
      const checkpoint: CheckpointData = {
        id: 'checkpoint_1',
        areaKey: 'temple_entrance',
        position: { x: 100, y: 200 },
        timestamp: Date.now(),
        levelState: {
          clearedEnemies: ['enemy_1'],
          collectedPickups: ['pickup_1'],
          triggeredEvents: [],
        },
      };

      checkpointSystem.saveCheckpoint(checkpoint);

      const retrieved = checkpointSystem.getCheckpoint('checkpoint_1');
      expect(retrieved?.position).toEqual({ x: 100, y: 200 });
      expect(retrieved?.levelState.clearedEnemies).toContain('enemy_1');
    });
  });

  describe('getCheckpointForArea', () => {
    it('should return most recent checkpoint for an area', () => {
      const earlier: CheckpointData = {
        id: 'checkpoint_1',
        areaKey: 'temple_entrance',
        position: { x: 100, y: 200 },
        timestamp: 1000,
        levelState: { clearedEnemies: [], collectedPickups: [], triggeredEvents: [] },
      };

      const later: CheckpointData = {
        id: 'checkpoint_2',
        areaKey: 'temple_entrance',
        position: { x: 300, y: 400 },
        timestamp: 2000,
        levelState: { clearedEnemies: [], collectedPickups: [], triggeredEvents: [] },
      };

      checkpointSystem.saveCheckpoint(earlier);
      checkpointSystem.saveCheckpoint(later);

      const result = checkpointSystem.getCheckpointForArea('temple_entrance');
      expect(result?.id).toBe('checkpoint_2');
      expect(result?.timestamp).toBe(2000);
    });

    it('should return null if no checkpoint exists for area', () => {
      const checkpoint: CheckpointData = {
        id: 'checkpoint_1',
        areaKey: 'temple_entrance',
        position: { x: 100, y: 200 },
        timestamp: Date.now(),
        levelState: { clearedEnemies: [], collectedPickups: [], triggeredEvents: [] },
      };

      checkpointSystem.saveCheckpoint(checkpoint);

      expect(checkpointSystem.getCheckpointForArea('archives')).toBeNull();
    });
  });

  describe('clearCheckpoint', () => {
    it('should remove a specific checkpoint', () => {
      const checkpoint: CheckpointData = {
        id: 'checkpoint_1',
        areaKey: 'temple_entrance',
        position: { x: 100, y: 200 },
        timestamp: Date.now(),
        levelState: { clearedEnemies: [], collectedPickups: [], triggeredEvents: [] },
      };

      checkpointSystem.saveCheckpoint(checkpoint);
      expect(checkpointSystem.hasCheckpoint('checkpoint_1')).toBe(true);

      const result = checkpointSystem.clearCheckpoint('checkpoint_1');
      expect(result).toBe(true);
      expect(checkpointSystem.hasCheckpoint('checkpoint_1')).toBe(false);
    });

    it('should return false for non-existent checkpoint', () => {
      expect(checkpointSystem.clearCheckpoint('non_existent')).toBe(false);
    });

    it('should update lastCheckpoint if cleared checkpoint was last', () => {
      const checkpoint1: CheckpointData = {
        id: 'checkpoint_1',
        areaKey: 'temple_entrance',
        position: { x: 100, y: 200 },
        timestamp: 1000,
        levelState: { clearedEnemies: [], collectedPickups: [], triggeredEvents: [] },
      };

      const checkpoint2: CheckpointData = {
        id: 'checkpoint_2',
        areaKey: 'temple_entrance',
        position: { x: 300, y: 400 },
        timestamp: 2000,
        levelState: { clearedEnemies: [], collectedPickups: [], triggeredEvents: [] },
      };

      checkpointSystem.saveCheckpoint(checkpoint1);
      checkpointSystem.saveCheckpoint(checkpoint2);

      expect(checkpointSystem.getLastCheckpoint()?.id).toBe('checkpoint_2');

      checkpointSystem.clearCheckpoint('checkpoint_2');

      // Should now point to checkpoint_1
      expect(checkpointSystem.getLastCheckpoint()?.id).toBe('checkpoint_1');
    });
  });

  describe('clearAllCheckpoints', () => {
    it('should remove all checkpoints', () => {
      for (let i = 1; i <= 5; i++) {
        checkpointSystem.saveCheckpoint({
          id: `checkpoint_${i}`,
          areaKey: 'test',
          position: { x: i * 100, y: i * 100 },
          timestamp: Date.now() + i,
          levelState: { clearedEnemies: [], collectedPickups: [], triggeredEvents: [] },
        });
      }

      expect(checkpointSystem.getCheckpointCount()).toBe(5);

      checkpointSystem.clearAllCheckpoints();

      expect(checkpointSystem.getCheckpointCount()).toBe(0);
      expect(checkpointSystem.getLastCheckpoint()).toBeNull();
    });

    it('should emit checkpoint:all_cleared event', () => {
      const eventSpy = vi.fn();
      eventBus.on('checkpoint:all_cleared', eventSpy);

      checkpointSystem.clearAllCheckpoints();

      expect(eventSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearCheckpointsForArea', () => {
    it('should clear all checkpoints for a specific area', () => {
      checkpointSystem.saveCheckpoint({
        id: 'checkpoint_1',
        areaKey: 'temple_entrance',
        position: { x: 100, y: 200 },
        timestamp: 1000,
        levelState: { clearedEnemies: [], collectedPickups: [], triggeredEvents: [] },
      });

      checkpointSystem.saveCheckpoint({
        id: 'checkpoint_2',
        areaKey: 'archives',
        position: { x: 300, y: 400 },
        timestamp: 2000,
        levelState: { clearedEnemies: [], collectedPickups: [], triggeredEvents: [] },
      });

      checkpointSystem.saveCheckpoint({
        id: 'checkpoint_3',
        areaKey: 'temple_entrance',
        position: { x: 500, y: 600 },
        timestamp: 3000,
        levelState: { clearedEnemies: [], collectedPickups: [], triggeredEvents: [] },
      });

      const cleared = checkpointSystem.clearCheckpointsForArea('temple_entrance');

      expect(cleared).toBe(2);
      expect(checkpointSystem.hasCheckpoint('checkpoint_1')).toBe(false);
      expect(checkpointSystem.hasCheckpoint('checkpoint_2')).toBe(true);
      expect(checkpointSystem.hasCheckpoint('checkpoint_3')).toBe(false);
    });
  });

  describe('getCheckpointsByRecency', () => {
    it('should return checkpoints ordered by timestamp (newest first)', () => {
      checkpointSystem.saveCheckpoint({
        id: 'checkpoint_1',
        areaKey: 'test',
        position: { x: 100, y: 200 },
        timestamp: 1000,
        levelState: { clearedEnemies: [], collectedPickups: [], triggeredEvents: [] },
      });

      checkpointSystem.saveCheckpoint({
        id: 'checkpoint_2',
        areaKey: 'test',
        position: { x: 300, y: 400 },
        timestamp: 3000,
        levelState: { clearedEnemies: [], collectedPickups: [], triggeredEvents: [] },
      });

      checkpointSystem.saveCheckpoint({
        id: 'checkpoint_3',
        areaKey: 'test',
        position: { x: 500, y: 600 },
        timestamp: 2000,
        levelState: { clearedEnemies: [], collectedPickups: [], triggeredEvents: [] },
      });

      const ordered = checkpointSystem.getCheckpointsByRecency();

      expect(ordered[0].id).toBe('checkpoint_2');
      expect(ordered[1].id).toBe('checkpoint_3');
      expect(ordered[2].id).toBe('checkpoint_1');
    });
  });

  describe('hasCheckpoint / hasCheckpointForArea', () => {
    it('should correctly identify existing checkpoints', () => {
      checkpointSystem.saveCheckpoint({
        id: 'checkpoint_1',
        areaKey: 'temple_entrance',
        position: { x: 100, y: 200 },
        timestamp: Date.now(),
        levelState: { clearedEnemies: [], collectedPickups: [], triggeredEvents: [] },
      });

      expect(checkpointSystem.hasCheckpoint('checkpoint_1')).toBe(true);
      expect(checkpointSystem.hasCheckpoint('checkpoint_2')).toBe(false);
      expect(checkpointSystem.hasCheckpointForArea('temple_entrance')).toBe(true);
      expect(checkpointSystem.hasCheckpointForArea('archives')).toBe(false);
    });
  });

  describe('export/import', () => {
    it('should export checkpoints to JSON string', () => {
      checkpointSystem.saveCheckpoint({
        id: 'checkpoint_1',
        areaKey: 'temple_entrance',
        position: { x: 100, y: 200 },
        timestamp: 1000,
        levelState: { clearedEnemies: [], collectedPickups: [], triggeredEvents: [] },
      });

      const exported = checkpointSystem.exportCheckpoints();
      const parsed = JSON.parse(exported);

      expect(parsed.checkpoints).toBeDefined();
      expect(parsed.checkpoints.length).toBe(1);
      expect(parsed.exportTimestamp).toBeDefined();
    });

    it('should import checkpoints from JSON string', () => {
      const importData = JSON.stringify({
        checkpoints: [
          [
            'checkpoint_1',
            {
              id: 'checkpoint_1',
              areaKey: 'temple_entrance',
              position: { x: 100, y: 200 },
              timestamp: 1000,
              levelState: { clearedEnemies: [], collectedPickups: [], triggeredEvents: [] },
            },
          ],
        ],
        history: ['checkpoint_1'],
      });

      const result = checkpointSystem.importCheckpoints(importData);

      expect(result).toBe(true);
      expect(checkpointSystem.hasCheckpoint('checkpoint_1')).toBe(true);
    });

    it('should reject invalid import data', () => {
      expect(checkpointSystem.importCheckpoints('invalid json')).toBe(false);
      expect(checkpointSystem.importCheckpoints('{}')).toBe(false);
      expect(checkpointSystem.importCheckpoints('{"checkpoints": "not an array"}')).toBe(false);
    });
  });

  describe('auto-save to localStorage', () => {
    it('should save to localStorage when autoSave is enabled', () => {
      const autoSaveSystem = new CheckpointSystem(eventBus, {
        autoSave: true,
        storageKey: 'test_checkpoints',
      });

      autoSaveSystem.saveCheckpoint({
        id: 'checkpoint_1',
        areaKey: 'temple_entrance',
        position: { x: 100, y: 200 },
        timestamp: Date.now(),
        levelState: { clearedEnemies: [], collectedPickups: [], triggeredEvents: [] },
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should not save to localStorage when autoSave is disabled', () => {
      checkpointSystem.saveCheckpoint({
        id: 'checkpoint_1',
        areaKey: 'temple_entrance',
        position: { x: 100, y: 200 },
        timestamp: Date.now(),
        levelState: { clearedEnemies: [], collectedPickups: [], triggeredEvents: [] },
      });

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });
});
