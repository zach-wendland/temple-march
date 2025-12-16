import { describe, it, expect } from 'vitest';
import {
  EnemyType,
  EnemyState,
  getEnemyConfig,
  createEnemyCombatStats,
  CLONE_TROOPER_CONFIG,
  JEDI_DEFENDER_CONFIG,
  TEMPLE_GUARD_CONFIG,
  JEDI_MASTER_CONFIG,
} from '../../../src/entities/enemies/EnemyTypes';
import { Faction, DefenseType } from '../../../src/combat/DamageCalculator';

describe('EnemyTypes', () => {
  describe('EnemyType enum', () => {
    it('should define all enemy types', () => {
      expect(EnemyType.CloneTrooper).toBe('clone_trooper');
      expect(EnemyType.JediDefender).toBe('jedi_defender');
      expect(EnemyType.TempleGuard).toBe('temple_guard');
      expect(EnemyType.JediMaster).toBe('jedi_master');
    });
  });

  describe('EnemyState enum', () => {
    it('should define all enemy states', () => {
      expect(EnemyState.Idle).toBe('idle');
      expect(EnemyState.Patrol).toBe('patrol');
      expect(EnemyState.Alert).toBe('alert');
      expect(EnemyState.Chase).toBe('chase');
      expect(EnemyState.Attack).toBe('attack');
      expect(EnemyState.Block).toBe('block');
      expect(EnemyState.Hitstun).toBe('hitstun');
      expect(EnemyState.Staggered).toBe('staggered');
      expect(EnemyState.Retreat).toBe('retreat');
      expect(EnemyState.Dead).toBe('dead');
    });
  });

  describe('getEnemyConfig', () => {
    it('should return CloneTrooper config', () => {
      const config = getEnemyConfig(EnemyType.CloneTrooper);
      expect(config).toBe(CLONE_TROOPER_CONFIG);
      expect(config.type).toBe(EnemyType.CloneTrooper);
      expect(config.isRanged).toBe(true);
      expect(config.coordinatesWithGroup).toBe(true);
    });

    it('should return JediDefender config', () => {
      const config = getEnemyConfig(EnemyType.JediDefender);
      expect(config).toBe(JEDI_DEFENDER_CONFIG);
      expect(config.type).toBe(EnemyType.JediDefender);
      expect(config.canBlock).toBe(true);
      expect(config.canParry).toBe(true);
      expect(config.isRanged).toBe(false);
    });

    it('should return TempleGuard config', () => {
      const config = getEnemyConfig(EnemyType.TempleGuard);
      expect(config).toBe(TEMPLE_GUARD_CONFIG);
      expect(config.type).toBe(EnemyType.TempleGuard);
      expect(config.blockChance).toBeGreaterThan(JEDI_DEFENDER_CONFIG.blockChance);
      expect(config.attackRange).toBeGreaterThan(JEDI_DEFENDER_CONFIG.attackRange);
    });

    it('should return JediMaster config', () => {
      const config = getEnemyConfig(EnemyType.JediMaster);
      expect(config).toBe(JEDI_MASTER_CONFIG);
      expect(config.type).toBe(EnemyType.JediMaster);
      expect(config.canUseForce).toBe(true);
      expect(config.health).toBeGreaterThan(JEDI_DEFENDER_CONFIG.health);
    });
  });

  describe('Enemy Config Properties', () => {
    describe('Clone Trooper', () => {
      it('should have correct faction', () => {
        expect(CLONE_TROOPER_CONFIG.faction).toBe(Faction.Imperial);
      });

      it('should have ranged attack properties', () => {
        expect(CLONE_TROOPER_CONFIG.isRanged).toBe(true);
        expect(CLONE_TROOPER_CONFIG.projectileSpeed).toBeGreaterThan(0);
        expect(CLONE_TROOPER_CONFIG.fireRate).toBeGreaterThan(0);
      });

      it('should not be able to block', () => {
        expect(CLONE_TROOPER_CONFIG.canBlock).toBe(false);
        expect(CLONE_TROOPER_CONFIG.canParry).toBe(false);
      });
    });

    describe('Jedi Defender', () => {
      it('should have correct faction', () => {
        expect(JEDI_DEFENDER_CONFIG.faction).toBe(Faction.Jedi);
      });

      it('should have melee attack properties', () => {
        expect(JEDI_DEFENDER_CONFIG.isRanged).toBe(false);
        expect(JEDI_DEFENDER_CONFIG.attackRange).toBeLessThan(100);
      });

      it('should have defensive capabilities', () => {
        expect(JEDI_DEFENDER_CONFIG.canBlock).toBe(true);
        expect(JEDI_DEFENDER_CONFIG.canParry).toBe(true);
        expect(JEDI_DEFENDER_CONFIG.parryWindow).toBeGreaterThan(0);
      });
    });

    describe('Temple Guard', () => {
      it('should have correct faction', () => {
        expect(TEMPLE_GUARD_CONFIG.faction).toBe(Faction.TempleGuard);
      });

      it('should have longer attack range (pike)', () => {
        expect(TEMPLE_GUARD_CONFIG.attackRange).toBeGreaterThan(
          JEDI_DEFENDER_CONFIG.attackRange
        );
      });

      it('should be excellent at blocking', () => {
        expect(TEMPLE_GUARD_CONFIG.blockChance).toBeGreaterThan(0.5);
        expect(TEMPLE_GUARD_CONFIG.parryWindow).toBeGreaterThan(
          JEDI_DEFENDER_CONFIG.parryWindow
        );
      });
    });

    describe('Jedi Master', () => {
      it('should have boss faction', () => {
        expect(JEDI_MASTER_CONFIG.faction).toBe(Faction.Boss);
      });

      it('should be powerful', () => {
        expect(JEDI_MASTER_CONFIG.health).toBeGreaterThan(500);
        expect(JEDI_MASTER_CONFIG.attackDamage).toBeGreaterThan(30);
      });

      it('should have Force abilities', () => {
        expect(JEDI_MASTER_CONFIG.canUseForce).toBe(true);
      });

      it('should not coordinate with groups (fights solo)', () => {
        expect(JEDI_MASTER_CONFIG.coordinatesWithGroup).toBe(false);
      });
    });
  });

  describe('createEnemyCombatStats', () => {
    it('should create stats from Clone Trooper config', () => {
      const stats = createEnemyCombatStats(CLONE_TROOPER_CONFIG);
      expect(stats.faction).toBe(Faction.Imperial);
      expect(stats.health).toBe(CLONE_TROOPER_CONFIG.health);
      expect(stats.maxHealth).toBe(CLONE_TROOPER_CONFIG.health);
      expect(stats.defenseType).toBe(DefenseType.None);
      expect(stats.stagger).toBe(0);
    });

    it('should create stats from Jedi Defender config', () => {
      const stats = createEnemyCombatStats(JEDI_DEFENDER_CONFIG);
      expect(stats.faction).toBe(Faction.Jedi);
      expect(stats.health).toBe(JEDI_DEFENDER_CONFIG.health);
    });

    it('should create stats from Temple Guard config', () => {
      const stats = createEnemyCombatStats(TEMPLE_GUARD_CONFIG);
      expect(stats.faction).toBe(Faction.TempleGuard);
      expect(stats.health).toBe(TEMPLE_GUARD_CONFIG.health);
    });

    it('should create stats from Jedi Master config', () => {
      const stats = createEnemyCombatStats(JEDI_MASTER_CONFIG);
      expect(stats.faction).toBe(Faction.Boss);
      expect(stats.health).toBe(JEDI_MASTER_CONFIG.health);
    });
  });
});
