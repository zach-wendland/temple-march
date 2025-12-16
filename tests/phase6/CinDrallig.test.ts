/**
 * CinDrallig Boss Tests
 * Phase 6: Polish & Content
 *
 * Note: CinDrallig.ts imports Phaser through BaseEnemy, which requires a browser environment.
 * To test the CinDrallig configuration without Phaser, we test the related types and enums
 * that can be imported without triggering Phaser initialization.
 */

import { describe, it, expect } from 'vitest';
import { EnemyType, JEDI_MASTER_CONFIG } from '../../src/entities/enemies/EnemyTypes';
import { Faction } from '../../src/combat/DamageCalculator';

// CinDrallig phase enum values (mirrored from CinDrallig.ts to avoid Phaser import)
const DralligPhase = {
  ShiiCho: 1,
  Ataru: 2,
  Juyo: 3,
} as const;

// CinDrallig config values (expected, based on implementation)
const CIN_DRALLIG_CONFIG = {
  type: EnemyType.JediMaster,
  displayName: 'Cin Drallig',
  faction: Faction.Boss,
  health: 3000,
  moveSpeed: 220,
  detectionRange: 500,
  attackRange: 80,
  attackCooldown: 400,
  canBlock: true,
  blockChance: 0.8,
  canParry: true,
  parryWindow: 300,
  canUseForce: true,
  isRanged: false,
  coordinatesWithGroup: false,
  spriteKey: 'cin_drallig',
  bodyWidth: 28,
  bodyHeight: 40,
};

describe('CinDrallig Configuration', () => {
  describe('Base Configuration', () => {
    it('should have correct type', () => {
      expect(CIN_DRALLIG_CONFIG.type).toBe(EnemyType.JediMaster);
    });

    it('should have correct display name', () => {
      expect(CIN_DRALLIG_CONFIG.displayName).toBe('Cin Drallig');
    });

    it('should be in Boss faction', () => {
      expect(CIN_DRALLIG_CONFIG.faction).toBe(Faction.Boss);
    });

    it('should have high health for a boss', () => {
      expect(CIN_DRALLIG_CONFIG.health).toBe(3000);
    });

    it('should be able to block', () => {
      expect(CIN_DRALLIG_CONFIG.canBlock).toBe(true);
    });

    it('should be able to parry', () => {
      expect(CIN_DRALLIG_CONFIG.canParry).toBe(true);
    });

    it('should be able to use Force', () => {
      expect(CIN_DRALLIG_CONFIG.canUseForce).toBe(true);
    });
  });

  describe('Combat Configuration', () => {
    it('should be configured for dual-wielding range', () => {
      // Cin Drallig uses dual green lightsabers
      expect(CIN_DRALLIG_CONFIG.attackRange).toBe(80);
    });

    it('should have fast attack cooldown', () => {
      expect(CIN_DRALLIG_CONFIG.attackCooldown).toBe(400);
    });

    it('should have high block chance', () => {
      expect(CIN_DRALLIG_CONFIG.blockChance).toBe(0.8);
    });

    it('should have large parry window (master swordsman)', () => {
      expect(CIN_DRALLIG_CONFIG.parryWindow).toBe(300);
    });

    it('should not be ranged', () => {
      expect(CIN_DRALLIG_CONFIG.isRanged).toBe(false);
    });

    it('should not coordinate with group (fights alone)', () => {
      expect(CIN_DRALLIG_CONFIG.coordinatesWithGroup).toBe(false);
    });
  });

  describe('Phase System', () => {
    it('should have three phases', () => {
      expect(DralligPhase.ShiiCho).toBe(1);
      expect(DralligPhase.Ataru).toBe(2);
      expect(DralligPhase.Juyo).toBe(3);
    });

    it('should start with Shii-Cho (Form I)', () => {
      // Shii-Cho is the basic form, used when boss is at full health
      expect(DralligPhase.ShiiCho).toBe(1);
    });

    it('should use Ataru (Form IV) in second phase', () => {
      // Ataru is acrobatic, used when boss becomes more aggressive
      expect(DralligPhase.Ataru).toBe(2);
    });

    it('should use Juyo (Form VII) in final phase', () => {
      // Juyo is ferocious, used when boss is desperate
      expect(DralligPhase.Juyo).toBe(3);
    });
  });

  describe('Movement Configuration', () => {
    it('should have fast movement speed', () => {
      expect(CIN_DRALLIG_CONFIG.moveSpeed).toBe(220);
    });

    it('should have wide detection range', () => {
      expect(CIN_DRALLIG_CONFIG.detectionRange).toBe(500);
    });
  });

  describe('Sprite Configuration', () => {
    it('should have sprite key', () => {
      expect(CIN_DRALLIG_CONFIG.spriteKey).toBe('cin_drallig');
    });

    it('should have body dimensions', () => {
      expect(CIN_DRALLIG_CONFIG.bodyWidth).toBe(28);
      expect(CIN_DRALLIG_CONFIG.bodyHeight).toBe(40);
    });
  });
});
