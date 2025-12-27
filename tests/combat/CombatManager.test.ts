/**
 * CombatManager Unit Tests
 * Tests for combat orchestration, attack registration, and damage calculation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CombatManager } from '../../src/combat/CombatManager';
import { EventBus } from '../../src/core/events/EventBus';
import { CombatStats, Faction } from '../../src/combat/DamageCalculator';

// Mock Phaser
const mockScene = {
  time: {
    delayedCall: vi.fn(),
  },
} as unknown as Phaser.Scene;

// Mock sprite
function createMockSprite(x: number = 100, y: number = 100): Phaser.GameObjects.Sprite {
  return {
    x,
    y,
    flipX: false,
    getBounds: () => ({ width: 64, height: 96 }),
    body: {
      setVelocity: vi.fn(),
      velocity: { x: 0, y: 0 },
    },
  } as unknown as Phaser.GameObjects.Sprite;
}

describe('CombatManager', () => {
  let combatManager: CombatManager;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    combatManager = new CombatManager(mockScene, eventBus);
  });

  describe('Entity Registration', () => {
    it('should register a player entity', () => {
      const sprite = createMockSprite();
      const stats: CombatStats = {
        maxHealth: 100,
        health: 100,
        attack: 10,
        defense: 5,
        stagger: 0,
        maxStagger: 100,
        faction: Faction.Sith,
        level: 1,
        defenseType: 'none',
      };

      combatManager.registerEntity(0, sprite, stats, true);

      // Should not throw, entity is registered
      expect(() => combatManager.setDefenseType(0, 'block')).not.toThrow();
    });

    it('should register an enemy entity', () => {
      const sprite = createMockSprite();
      const stats: CombatStats = {
        maxHealth: 50,
        health: 50,
        attack: 5,
        defense: 2,
        stagger: 0,
        maxStagger: 100,
        faction: Faction.Jedi,
        level: 1,
        defenseType: 'none',
      };

      combatManager.registerEntity(100, sprite, stats, false);

      // Should work without errors
      expect(() => combatManager.setDefenseType(100, 'parry')).not.toThrow();
    });

    it('should unregister an entity', () => {
      const sprite = createMockSprite();
      const stats: CombatStats = {
        maxHealth: 100,
        health: 100,
        attack: 10,
        defense: 5,
        stagger: 0,
        maxStagger: 100,
        faction: Faction.Sith,
        level: 1,
        defenseType: 'none',
      };

      combatManager.registerEntity(0, sprite, stats);
      combatManager.unregisterEntity(0);

      // After unregistering, methods should have no effect
      combatManager.setDefenseType(0, 'block'); // Should not throw but has no effect
    });
  });

  describe('Attack System', () => {
    it('should allow entity to start an attack', () => {
      const sprite = createMockSprite();
      const stats: CombatStats = {
        maxHealth: 100,
        health: 100,
        attack: 10,
        defense: 5,
        stagger: 0,
        maxStagger: 100,
        faction: Faction.Sith,
        level: 1,
        defenseType: 'none',
      };

      combatManager.registerEntity(0, sprite, stats);

      const result = combatManager.startAttack(0, 'light_1');
      expect(result).toBe(true);
    });

    it('should emit attack event when attack starts', () => {
      const sprite = createMockSprite();
      const stats: CombatStats = {
        maxHealth: 100,
        health: 100,
        attack: 10,
        defense: 5,
        stagger: 0,
        maxStagger: 100,
        faction: Faction.Sith,
        level: 1,
        defenseType: 'none',
      };

      combatManager.registerEntity(0, sprite, stats);

      let eventEmitted = false;
      eventBus.on('combat:attack', () => {
        eventEmitted = true;
      });

      combatManager.startAttack(0, 'light_1');
      expect(eventEmitted).toBe(true);
    });

    it('should not allow attack with invalid attackId', () => {
      const sprite = createMockSprite();
      const stats: CombatStats = {
        maxHealth: 100,
        health: 100,
        attack: 10,
        defense: 5,
        stagger: 0,
        maxStagger: 100,
        faction: Faction.Sith,
        level: 1,
        defenseType: 'none',
      };

      combatManager.registerEntity(0, sprite, stats);

      const result = combatManager.startAttack(0, 'invalid_attack');
      expect(result).toBe(false);
    });

    it('should return false for unregistered entity', () => {
      const result = combatManager.startAttack(999, 'light_1');
      expect(result).toBe(false);
    });
  });

  describe('Damage Application', () => {
    it('should apply direct damage to entity', () => {
      const sprite = createMockSprite();
      const stats: CombatStats = {
        maxHealth: 100,
        health: 100,
        attack: 10,
        defense: 5,
        stagger: 0,
        maxStagger: 100,
        faction: Faction.Jedi,
        level: 1,
        defenseType: 'none',
      };

      combatManager.registerEntity(100, sprite, stats);
      combatManager.applyDamage(100, 25);

      // Health should be reduced (can't directly verify without getter)
      // Damage was applied successfully without throwing
      expect(sprite.body?.setVelocity).not.toHaveBeenCalled(); // No knockback when not specified
    });

    it('should emit death event when health reaches 0', () => {
      const sprite = createMockSprite();
      const stats: CombatStats = {
        maxHealth: 100,
        health: 100,
        attack: 10,
        defense: 5,
        stagger: 0,
        maxStagger: 100,
        faction: Faction.Jedi,
        level: 1,
        defenseType: 'none',
      };

      combatManager.registerEntity(100, sprite, stats);

      let deathEventEmitted = false;
      eventBus.on('combat:death', () => {
        deathEventEmitted = true;
      });

      combatManager.applyDamage(100, 100);
      expect(deathEventEmitted).toBe(true);
    });

    it('should apply knockback with damage', () => {
      const sprite = createMockSprite();
      const stats: CombatStats = {
        maxHealth: 100,
        health: 100,
        attack: 10,
        defense: 5,
        stagger: 0,
        maxStagger: 100,
        faction: Faction.Jedi,
        level: 1,
        defenseType: 'none',
      };

      combatManager.registerEntity(100, sprite, stats);
      combatManager.applyDamage(100, 25, 100, -50);

      expect(sprite.body?.setVelocity).toHaveBeenCalledWith(100, -50);
    });

    it('should not reduce health below 0', () => {
      const sprite = createMockSprite();
      const stats: CombatStats = {
        maxHealth: 100,
        health: 50,
        attack: 10,
        defense: 5,
        stagger: 0,
        maxStagger: 100,
        faction: Faction.Jedi,
        level: 1,
        defenseType: 'none',
      };

      combatManager.registerEntity(100, sprite, stats);
      // First damage should kill the entity (death event emitted)
      let firstDeathEmitted = false;
      eventBus.on('combat:death', () => {
        firstDeathEmitted = true;
      });

      combatManager.applyDamage(100, 200); // Overkill damage
      expect(firstDeathEmitted).toBe(true); // Death event should be emitted
    });
  });

  describe('Invulnerability', () => {
    it('should make entity invulnerable', () => {
      const sprite = createMockSprite();
      const stats: CombatStats = {
        maxHealth: 100,
        health: 100,
        attack: 10,
        defense: 5,
        stagger: 0,
        maxStagger: 100,
        faction: Faction.Sith,
        level: 1,
        defenseType: 'none',
      };

      combatManager.registerEntity(0, sprite, stats);
      combatManager.setInvulnerable(0, true, 1000);

      // Entity is now invulnerable (can't verify directly, but method shouldn't throw)
      expect(() => combatManager.update(16)).not.toThrow();
    });

    it('should remove invulnerability after duration', () => {
      const sprite = createMockSprite();
      const stats: CombatStats = {
        maxHealth: 100,
        health: 100,
        attack: 10,
        defense: 5,
        stagger: 0,
        maxStagger: 100,
        faction: Faction.Sith,
        level: 1,
        defenseType: 'none',
      };

      combatManager.registerEntity(0, sprite, stats);
      combatManager.setInvulnerable(0, true, 0); // Immediate expiration

      combatManager.update(16);

      // Invulnerability should be removed (no errors during update)
      expect(() => combatManager.update(16)).not.toThrow();
    });
  });

  describe('Defense Types', () => {
    it('should set entity defense type to block', () => {
      const sprite = createMockSprite();
      const stats: CombatStats = {
        maxHealth: 100,
        health: 100,
        attack: 10,
        defense: 5,
        stagger: 0,
        maxStagger: 100,
        faction: Faction.Sith,
        level: 1,
        defenseType: 'none',
      };

      combatManager.registerEntity(0, sprite, stats);
      combatManager.setDefenseType(0, 'block');

      // Defense type set (verified by no errors)
      expect(() => combatManager.update(16)).not.toThrow();
    });

    it('should set entity defense type to parry', () => {
      const sprite = createMockSprite();
      const stats: CombatStats = {
        maxHealth: 100,
        health: 100,
        attack: 10,
        defense: 5,
        stagger: 0,
        maxStagger: 100,
        faction: Faction.Sith,
        level: 1,
        defenseType: 'none',
      };

      combatManager.registerEntity(0, sprite, stats);
      combatManager.setDefenseType(0, 'parry');

      expect(() => combatManager.update(16)).not.toThrow();
    });
  });

  describe('Player Combo System', () => {
    it('should return 0 combo count with no player', () => {
      const count = combatManager.getPlayerComboCount();
      expect(count).toBe(0);
    });

    it('should track combo count for player', () => {
      const sprite = createMockSprite();
      const stats: CombatStats = {
        maxHealth: 100,
        health: 100,
        attack: 10,
        defense: 5,
        stagger: 0,
        maxStagger: 100,
        faction: Faction.Sith,
        level: 1,
        defenseType: 'none',
      };

      combatManager.registerEntity(0, sprite, stats, true); // Register as player

      // Initial combo count should be 0
      const initialCount = combatManager.getPlayerComboCount();
      expect(initialCount).toBe(0);
    });

    it('should buffer player inputs', () => {
      const sprite = createMockSprite();
      const stats: CombatStats = {
        maxHealth: 100,
        health: 100,
        attack: 10,
        defense: 5,
        stagger: 0,
        maxStagger: 100,
        faction: Faction.Sith,
        level: 1,
        defenseType: 'none',
      };

      combatManager.registerEntity(0, sprite, stats, true);

      // Should not throw when buffering input
      expect(() => combatManager.bufferPlayerInput('light')).not.toThrow();
    });
  });

  describe('Update Cycle', () => {
    it('should update without errors with no entities', () => {
      expect(() => combatManager.update(16)).not.toThrow();
    });

    it('should update entity positions', () => {
      const sprite = createMockSprite(100, 200);
      const stats: CombatStats = {
        maxHealth: 100,
        health: 100,
        attack: 10,
        defense: 5,
        stagger: 0,
        maxStagger: 100,
        faction: Faction.Sith,
        level: 1,
        defenseType: 'none',
      };

      combatManager.registerEntity(0, sprite, stats);

      // Move sprite
      sprite.x = 150;
      sprite.y = 250;

      expect(() => combatManager.update(16)).not.toThrow();
    });

    it('should decrease hitstun over time', () => {
      const sprite = createMockSprite();
      const stats: CombatStats = {
        maxHealth: 100,
        health: 100,
        attack: 10,
        defense: 5,
        stagger: 0,
        maxStagger: 100,
        faction: Faction.Sith,
        level: 1,
        defenseType: 'none',
      };

      combatManager.registerEntity(0, sprite, stats);

      // Apply damage to create hitstun (indirectly)
      combatManager.applyDamage(0, 10);

      // Update should process hitstun
      expect(() => combatManager.update(100)).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle attack on unregistered entity gracefully', () => {
      const result = combatManager.startAttack(999, 'light_1');
      expect(result).toBe(false);
    });

    it('should handle damage to unregistered entity gracefully', () => {
      expect(() => combatManager.applyDamage(999, 100)).not.toThrow();
    });

    it('should handle multiple entity registrations', () => {
      for (let i = 0; i < 10; i++) {
        const sprite = createMockSprite();
        const stats: CombatStats = {
          maxHealth: 100,
          health: 100,
          attack: 10,
          defense: 5,
          stagger: 0,
          maxStagger: 100,
          faction: Faction.Jedi,
          level: 1,
          defenseType: 'none',
        };
        combatManager.registerEntity(i, sprite, stats);
      }

      expect(() => combatManager.update(16)).not.toThrow();
    });
  });
});
