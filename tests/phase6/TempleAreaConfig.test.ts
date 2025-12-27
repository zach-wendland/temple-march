/**
 * Temple Area Configuration Tests
 * Phase 6: Polish & Content
 */

import { describe, it, expect } from 'vitest';
import {
  TempleArea,
  TEMPLE_ENTRANCE_CONFIG,
  MAIN_HALLS_CONFIG,
  TRAINING_GROUNDS_CONFIG,
  ARCHIVES_CONFIG,
  COUNCIL_CHAMBER_CONFIG,
  DRALLIG_ARENA_CONFIG,
  ENTRANCE_WAVES,
  HALLS_WAVES,
  TRAINING_WAVES,
  ARCHIVES_WAVES,
  getAllAreaConfigs,
  getAreaConfig,
  getAreaWaves,
  getAreaOrder,
  isBossArea,
} from '../../src/levels/TempleAreaConfig';
import { EnemyType } from '../../src/entities/enemies/EnemyTypes';

describe('Temple Area Configuration', () => {
  describe('Area Identifiers', () => {
    it('should have all temple areas defined', () => {
      expect(TempleArea.Entrance).toBe('temple_entrance');
      expect(TempleArea.MainHalls).toBe('temple_halls');
      expect(TempleArea.TrainingGrounds).toBe('training_grounds');
      expect(TempleArea.Archives).toBe('temple_archives');
      expect(TempleArea.CouncilChamber).toBe('council_chamber');
    });
  });

  describe('Area Configs', () => {
    it('should have entrance config', () => {
      expect(TEMPLE_ENTRANCE_CONFIG.id).toBe(TempleArea.Entrance);
      expect(TEMPLE_ENTRANCE_CONFIG.displayName).toBe('Temple Entrance');
      expect(TEMPLE_ENTRANCE_CONFIG.width).toBeGreaterThan(0);
      expect(TEMPLE_ENTRANCE_CONFIG.height).toBeGreaterThan(0);
    });

    it('should have halls config', () => {
      expect(MAIN_HALLS_CONFIG.id).toBe(TempleArea.MainHalls);
      expect(MAIN_HALLS_CONFIG.displayName).toBe('Main Halls');
    });

    it('should have training grounds config', () => {
      expect(TRAINING_GROUNDS_CONFIG.id).toBe(TempleArea.TrainingGrounds);
      expect(TRAINING_GROUNDS_CONFIG.displayName).toBe('Training Grounds');
    });

    it('should have archives config', () => {
      expect(ARCHIVES_CONFIG.id).toBe(TempleArea.Archives);
      expect(ARCHIVES_CONFIG.displayName).toBe('Jedi Archives');
    });

    it('should have council chamber config', () => {
      expect(COUNCIL_CHAMBER_CONFIG.id).toBe(TempleArea.CouncilChamber);
      expect(COUNCIL_CHAMBER_CONFIG.displayName).toBe('High Council Chamber');
      // Council chamber boss arena config is separate (DRALLIG_ARENA_CONFIG)
    });

    it('should have spawn points for each area', () => {
      const configs = getAllAreaConfigs();
      for (const config of configs) {
        expect(config.spawnPoints).toBeDefined();
        expect(config.spawnPoints.default).toBeDefined();
      }
    });

    it('should have checkpoints for each area', () => {
      const configs = getAllAreaConfigs();
      for (const config of configs) {
        expect(config.checkpoints).toBeDefined();
        expect(config.checkpoints.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Area Transitions', () => {
    it('should have transitions between areas', () => {
      expect(TEMPLE_ENTRANCE_CONFIG.transitions.length).toBeGreaterThan(0);
      expect(MAIN_HALLS_CONFIG.transitions.length).toBeGreaterThan(0);
      expect(TRAINING_GROUNDS_CONFIG.transitions.length).toBeGreaterThan(0);
      expect(ARCHIVES_CONFIG.transitions.length).toBeGreaterThan(0);
    });

    it('should link entrance to halls', () => {
      const transition = TEMPLE_ENTRANCE_CONFIG.transitions.find(
        (t) => t.targetArea === TempleArea.MainHalls
      );
      expect(transition).toBeDefined();
    });

    it('should link halls to training', () => {
      const transition = MAIN_HALLS_CONFIG.transitions.find(
        (t) => t.targetArea === TempleArea.TrainingGrounds
      );
      expect(transition).toBeDefined();
    });

    it('should link training to archives', () => {
      const transition = TRAINING_GROUNDS_CONFIG.transitions.find(
        (t) => t.targetArea === TempleArea.Archives
      );
      expect(transition).toBeDefined();
    });

    it('should link archives to council', () => {
      const transition = ARCHIVES_CONFIG.transitions.find(
        (t) => t.targetArea === TempleArea.CouncilChamber
      );
      expect(transition).toBeDefined();
    });
  });

  describe('Enemy Waves', () => {
    it('should have entrance waves', () => {
      expect(ENTRANCE_WAVES.length).toBeGreaterThan(0);
      expect(ENTRANCE_WAVES[0].enemies.length).toBeGreaterThan(0);
    });

    it('should have halls waves', () => {
      expect(HALLS_WAVES.length).toBeGreaterThan(0);
    });

    it('should have training waves', () => {
      expect(TRAINING_WAVES.length).toBeGreaterThan(0);
    });

    it('should have archives waves', () => {
      expect(ARCHIVES_WAVES.length).toBeGreaterThan(0);
    });

    it('should use correct enemy types', () => {
      const allWaves = [...ENTRANCE_WAVES, ...HALLS_WAVES, ...TRAINING_WAVES, ...ARCHIVES_WAVES];
      const enemyTypes = new Set<EnemyType>();

      for (const wave of allWaves) {
        for (const enemy of wave.enemies) {
          enemyTypes.add(enemy.type);
        }
      }

      expect(enemyTypes.has(EnemyType.JediDefender)).toBe(true);
      expect(enemyTypes.has(EnemyType.TempleGuard)).toBe(true);
    });
  });

  describe('Boss Arena', () => {
    it('should have arena bounds', () => {
      expect(DRALLIG_ARENA_CONFIG.bounds).toBeDefined();
      expect(DRALLIG_ARENA_CONFIG.bounds.width).toBeGreaterThan(0);
      expect(DRALLIG_ARENA_CONFIG.bounds.height).toBeGreaterThan(0);
    });

    it('should have boss spawn position', () => {
      expect(DRALLIG_ARENA_CONFIG.bossSpawn).toBeDefined();
      expect(DRALLIG_ARENA_CONFIG.bossSpawn.x).toBeGreaterThan(0);
      expect(DRALLIG_ARENA_CONFIG.bossSpawn.y).toBeGreaterThan(0);
    });

    it('should have player entry position', () => {
      expect(DRALLIG_ARENA_CONFIG.playerEntry).toBeDefined();
    });

    it('should have locked doors', () => {
      expect(DRALLIG_ARENA_CONFIG.lockedDoors).toBeDefined();
      expect(DRALLIG_ARENA_CONFIG.lockedDoors.length).toBeGreaterThan(0);
    });

    it('should have phase events', () => {
      expect(DRALLIG_ARENA_CONFIG.phaseEvents).toBeDefined();
      expect(DRALLIG_ARENA_CONFIG.phaseEvents!.length).toBeGreaterThan(0);
    });
  });

  describe('Helper Functions', () => {
    it('should get all area configs', () => {
      const configs = getAllAreaConfigs();
      expect(configs.length).toBe(5);
    });

    it('should get area config by id', () => {
      const config = getAreaConfig(TempleArea.Entrance);
      expect(config).toBeDefined();
      expect(config!.id).toBe(TempleArea.Entrance);
    });

    it('should return undefined for invalid area', () => {
      const config = getAreaConfig('invalid_area');
      expect(config).toBeUndefined();
    });

    it('should get waves for area', () => {
      const waves = getAreaWaves(TempleArea.Entrance);
      expect(waves.length).toBeGreaterThan(0);
    });

    it('should return empty waves for council chamber', () => {
      const waves = getAreaWaves(TempleArea.CouncilChamber);
      expect(waves.length).toBe(0); // Boss area has no wave spawns
    });

    it('should get area order', () => {
      const order = getAreaOrder();
      expect(order.length).toBe(5);
      expect(order[0]).toBe(TempleArea.Entrance);
      expect(order[4]).toBe(TempleArea.CouncilChamber);
    });

    it('should identify boss area', () => {
      expect(isBossArea(TempleArea.CouncilChamber)).toBe(true);
      expect(isBossArea(TempleArea.Entrance)).toBe(false);
    });
  });
});
