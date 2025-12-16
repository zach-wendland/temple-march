/**
 * Balance Configuration Tests
 * Phase 6: Polish & Content
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PLAYER_BALANCE,
  ENEMY_BALANCE,
  BOSS_BALANCE,
  COMBAT_FEEL,
  PROGRESSION,
  DifficultyLevel,
  DIFFICULTY_MODIFIERS,
  BalanceManager,
  calculateFinalDamage,
  getKnockback,
  getHitStop,
  getScreenShake,
} from '../../src/config/BalanceConfig';

describe('Balance Configuration', () => {
  describe('Player Balance', () => {
    it('should have reasonable health values', () => {
      expect(PLAYER_BALANCE.baseHealth).toBeGreaterThan(0);
      expect(PLAYER_BALANCE.baseHealth).toBeLessThanOrEqual(1000);
    });

    it('should have Force values', () => {
      expect(PLAYER_BALANCE.baseForce).toBeGreaterThan(0);
      expect(PLAYER_BALANCE.forceRegenRate).toBeGreaterThan(0);
    });

    it('should have movement values', () => {
      expect(PLAYER_BALANCE.walkSpeed).toBeGreaterThan(0);
      expect(PLAYER_BALANCE.runSpeed).toBeGreaterThan(PLAYER_BALANCE.walkSpeed);
      expect(PLAYER_BALANCE.dodgeSpeed).toBeGreaterThan(PLAYER_BALANCE.runSpeed);
    });

    it('should have attack damage values', () => {
      expect(PLAYER_BALANCE.lightAttackDamage).toBeGreaterThan(0);
      expect(PLAYER_BALANCE.heavyAttackDamage).toBeGreaterThan(PLAYER_BALANCE.lightAttackDamage);
    });

    it('should have Force power costs', () => {
      expect(PLAYER_BALANCE.forcePushCost).toBeGreaterThan(0);
      expect(PLAYER_BALANCE.forcePullCost).toBeGreaterThan(0);
      expect(PLAYER_BALANCE.forceLightningCost).toBeGreaterThan(0);
    });
  });

  describe('Enemy Balance', () => {
    it('should have clone trooper config', () => {
      expect(ENEMY_BALANCE.cloneTrooper.health).toBeGreaterThan(0);
      expect(ENEMY_BALANCE.cloneTrooper.damage).toBeGreaterThan(0);
    });

    it('should have jedi defender config', () => {
      expect(ENEMY_BALANCE.jediDefender.health).toBeGreaterThan(0);
      expect(ENEMY_BALANCE.jediDefender.blockChance).toBeGreaterThan(0);
      expect(ENEMY_BALANCE.jediDefender.blockChance).toBeLessThanOrEqual(1);
    });

    it('should have temple guard config', () => {
      expect(ENEMY_BALANCE.templeGuard.health).toBeGreaterThan(ENEMY_BALANCE.jediDefender.health);
      expect(ENEMY_BALANCE.templeGuard.pikeRange).toBeGreaterThan(0);
    });

    it('should limit simultaneous attackers', () => {
      expect(ENEMY_BALANCE.maxSimultaneousAttackers).toBeGreaterThan(0);
      expect(ENEMY_BALANCE.maxSimultaneousAttackers).toBeLessThanOrEqual(5);
    });
  });

  describe('Boss Balance', () => {
    it('should have Cin Drallig config', () => {
      expect(BOSS_BALANCE.cinDrallig.totalHealth).toBeGreaterThan(0);
      expect(BOSS_BALANCE.cinDrallig.totalHealth).toBeGreaterThan(1000);
    });

    it('should have 3 phases', () => {
      expect(BOSS_BALANCE.cinDrallig.phase1).toBeDefined();
      expect(BOSS_BALANCE.cinDrallig.phase2).toBeDefined();
      expect(BOSS_BALANCE.cinDrallig.phase3).toBeDefined();
    });

    it('should have increasing difficulty per phase', () => {
      expect(BOSS_BALANCE.cinDrallig.phase2.damageMultiplier).toBeGreaterThan(
        BOSS_BALANCE.cinDrallig.phase1.damageMultiplier
      );
      expect(BOSS_BALANCE.cinDrallig.phase3.damageMultiplier).toBeGreaterThan(
        BOSS_BALANCE.cinDrallig.phase2.damageMultiplier
      );
    });

    it('should have increasing speed per phase', () => {
      expect(BOSS_BALANCE.cinDrallig.phase2.moveSpeed).toBeGreaterThan(
        BOSS_BALANCE.cinDrallig.phase1.moveSpeed
      );
      expect(BOSS_BALANCE.cinDrallig.phase3.moveSpeed).toBeGreaterThan(
        BOSS_BALANCE.cinDrallig.phase2.moveSpeed
      );
    });

    it('should have enrage timer', () => {
      expect(BOSS_BALANCE.cinDrallig.enrageTimer).toBeGreaterThan(0);
      expect(BOSS_BALANCE.cinDrallig.enrageDamageMultiplier).toBeGreaterThan(1);
    });
  });

  describe('Combat Feel', () => {
    it('should have screen shake values', () => {
      expect(COMBAT_FEEL.lightHitShake.intensity).toBeGreaterThan(0);
      expect(COMBAT_FEEL.heavyHitShake.intensity).toBeGreaterThan(COMBAT_FEEL.lightHitShake.intensity);
      expect(COMBAT_FEEL.killShake.intensity).toBeGreaterThan(COMBAT_FEEL.heavyHitShake.intensity);
    });

    it('should have hit stop values', () => {
      expect(COMBAT_FEEL.lightHitStop).toBe(0); // Light attacks don't freeze
      expect(COMBAT_FEEL.heavyHitStop).toBeGreaterThan(0);
      expect(COMBAT_FEEL.killHitStop).toBeGreaterThan(COMBAT_FEEL.heavyHitStop);
    });

    it('should have knockback values', () => {
      expect(COMBAT_FEEL.lightKnockback).toBeGreaterThan(0);
      expect(COMBAT_FEEL.heavyKnockback).toBeGreaterThan(COMBAT_FEEL.lightKnockback);
      expect(COMBAT_FEEL.forceKnockback).toBeGreaterThan(COMBAT_FEEL.heavyKnockback);
    });

    it('should have combo system values', () => {
      expect(COMBAT_FEEL.comboDuration).toBeGreaterThan(0);
      expect(COMBAT_FEEL.comboDamageScaling.length).toBeGreaterThan(0);
      expect(COMBAT_FEEL.comboDamageScaling[0]).toBe(1.0);
    });
  });

  describe('Progression', () => {
    it('should have area scaling', () => {
      expect(PROGRESSION.areaScaling.temple_entrance).toBeDefined();
      expect(PROGRESSION.areaScaling.temple_halls).toBeDefined();
    });

    it('should increase difficulty in later areas', () => {
      expect(PROGRESSION.areaScaling.temple_archives.enemyHealthMult).toBeGreaterThan(
        PROGRESSION.areaScaling.temple_entrance.enemyHealthMult
      );
    });

    it('should have pickup values', () => {
      expect(PROGRESSION.healthPickupValue).toBeGreaterThan(0);
      expect(PROGRESSION.forcePickupValue).toBeGreaterThan(0);
      expect(PROGRESSION.pickupDropChance).toBeGreaterThan(0);
      expect(PROGRESSION.pickupDropChance).toBeLessThanOrEqual(1);
    });
  });

  describe('Difficulty Levels', () => {
    it('should have all difficulty levels defined', () => {
      expect(DIFFICULTY_MODIFIERS[DifficultyLevel.Story]).toBeDefined();
      expect(DIFFICULTY_MODIFIERS[DifficultyLevel.Normal]).toBeDefined();
      expect(DIFFICULTY_MODIFIERS[DifficultyLevel.Hard]).toBeDefined();
      expect(DIFFICULTY_MODIFIERS[DifficultyLevel.Nightmare]).toBeDefined();
    });

    it('should make Story mode easier', () => {
      const story = DIFFICULTY_MODIFIERS[DifficultyLevel.Story];
      const normal = DIFFICULTY_MODIFIERS[DifficultyLevel.Normal];

      expect(story.playerDamageTaken).toBeLessThan(normal.playerDamageTaken);
      expect(story.playerDamageDealt).toBeGreaterThan(normal.playerDamageDealt);
      expect(story.enemyHealth).toBeLessThan(normal.enemyHealth);
    });

    it('should make Nightmare mode harder', () => {
      const nightmare = DIFFICULTY_MODIFIERS[DifficultyLevel.Nightmare];
      const normal = DIFFICULTY_MODIFIERS[DifficultyLevel.Normal];

      expect(nightmare.playerDamageTaken).toBeGreaterThan(normal.playerDamageTaken);
      expect(nightmare.enemyHealth).toBeGreaterThan(normal.enemyHealth);
      expect(nightmare.enemyDamage).toBeGreaterThan(normal.enemyDamage);
    });
  });

  describe('Balance Manager', () => {
    let manager: BalanceManager;

    beforeEach(() => {
      manager = BalanceManager.getInstance();
      manager.setDifficulty(DifficultyLevel.Normal);
    });

    it('should be a singleton', () => {
      const manager2 = BalanceManager.getInstance();
      expect(manager).toBe(manager2);
    });

    it('should get/set difficulty', () => {
      manager.setDifficulty(DifficultyLevel.Hard);
      expect(manager.getDifficulty()).toBe(DifficultyLevel.Hard);
    });

    it('should get player health', () => {
      const health = manager.getPlayerHealth();
      expect(health).toBe(PLAYER_BALANCE.baseHealth);
    });

    it('should apply damage modifiers', () => {
      manager.setDifficulty(DifficultyLevel.Story);
      const damage = manager.getPlayerDamage(100);
      expect(damage).toBe(150); // 1.5x in Story mode
    });

    it('should apply area scaling to enemy health', () => {
      const health = manager.getEnemyHealth(100, 'temple_archives');
      expect(health).toBeGreaterThan(100); // Archives has scaling
    });
  });

  describe('Helper Functions', () => {
    beforeEach(() => {
      BalanceManager.getInstance().setDifficulty(DifficultyLevel.Normal);
    });

    describe('calculateFinalDamage', () => {
      it('should calculate player damage', () => {
        const damage = calculateFinalDamage(100, true);
        expect(damage).toBe(100); // Normal difficulty = 1x
      });

      it('should apply combo scaling', () => {
        const hit1 = calculateFinalDamage(100, true, 1);
        const hit3 = calculateFinalDamage(100, true, 3);
        expect(hit3).toBeLessThan(hit1);
      });

      it('should apply critical multiplier', () => {
        const normal = calculateFinalDamage(100, true, 1, false);
        const critical = calculateFinalDamage(100, true, 1, true);
        expect(critical).toBe(Math.round(normal * 1.5));
      });
    });

    describe('getKnockback', () => {
      it('should return correct knockback values', () => {
        expect(getKnockback('light')).toBe(COMBAT_FEEL.lightKnockback);
        expect(getKnockback('heavy')).toBe(COMBAT_FEEL.heavyKnockback);
        expect(getKnockback('force')).toBe(COMBAT_FEEL.forceKnockback);
      });
    });

    describe('getHitStop', () => {
      it('should return correct hit stop values', () => {
        expect(getHitStop('light')).toBe(COMBAT_FEEL.lightHitStop);
        expect(getHitStop('heavy')).toBe(COMBAT_FEEL.heavyHitStop);
        expect(getHitStop('kill')).toBe(COMBAT_FEEL.killHitStop);
      });
    });

    describe('getScreenShake', () => {
      it('should return correct screen shake values', () => {
        const light = getScreenShake('light');
        expect(light.intensity).toBe(COMBAT_FEEL.lightHitShake.intensity);
        expect(light.duration).toBe(COMBAT_FEEL.lightHitShake.duration);

        const kill = getScreenShake('kill');
        expect(kill.intensity).toBe(COMBAT_FEEL.killShake.intensity);
      });
    });
  });
});
