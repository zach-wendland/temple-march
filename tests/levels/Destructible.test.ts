/**
 * Destructible Tests
 * Phase 4: Temple Levels
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Phaser before importing anything that uses it
vi.mock('phaser', () => ({
  default: {
    Math: {
      Distance: {
        Between: (x1: number, y1: number, x2: number, y2: number) =>
          Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),
      },
      Between: (min: number, max: number) =>
        Math.floor(Math.random() * (max - min + 1)) + min,
      DegToRad: (degrees: number) => degrees * (Math.PI / 180),
    },
    Physics: {
      Arcade: {
        Body: class {},
        StaticBody: class {},
      },
    },
    GameObjects: {
      Sprite: class {},
      Graphics: class {},
    },
  },
}));

import {
  Destructible,
  DestructibleConfig,
  DestructibleType,
  DESTRUCTIBLE_DEFAULTS,
  createDestructible,
} from '../../src/levels/Destructible';
import { EventBus } from '../../src/core/events/EventBus';
import { Layer } from '../../src/core/types';

// Mock Phaser scene
const createMockScene = () => ({
  add: {
    sprite: vi.fn().mockReturnValue({
      setDepth: vi.fn().mockReturnThis(),
      setData: vi.fn().mockReturnThis(),
      setTint: vi.fn().mockReturnThis(),
      clearTint: vi.fn().mockReturnThis(),
      setActive: vi.fn().mockReturnThis(),
      setVisible: vi.fn().mockReturnThis(),
      setPosition: vi.fn().mockReturnThis(),
      setScale: vi.fn().mockReturnThis(),
      setAlpha: vi.fn().mockReturnThis(),
      x: 100,
      y: 200,
      destroy: vi.fn(),
    }),
    rectangle: vi.fn().mockReturnValue({
      setDepth: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
    }),
    graphics: vi.fn().mockReturnValue({
      fillStyle: vi.fn().mockReturnThis(),
      fillCircle: vi.fn().mockReturnThis(),
      setPosition: vi.fn().mockReturnThis(),
      setDepth: vi.fn().mockReturnThis(),
      setAlpha: vi.fn().mockReturnThis(),
      setScale: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
    }),
  },
  physics: {
    add: {
      existing: vi.fn().mockImplementation((obj) => {
        obj.body = {
          setImmovable: vi.fn(),
          setVelocity: vi.fn(),
          setDrag: vi.fn(),
        };
        return obj;
      }),
    },
  },
  tweens: {
    add: vi.fn().mockImplementation((config) => {
      // Immediately call onComplete if provided
      if (config.onComplete) {
        setTimeout(() => config.onComplete(), 0);
      }
      return { destroy: vi.fn() };
    }),
  },
  time: {
    delayedCall: vi.fn().mockImplementation((delay, callback) => {
      setTimeout(callback, 0);
      return { destroy: vi.fn() };
    }),
  },
  sound: {
    play: vi.fn(),
  },
});

describe('Destructible', () => {
  let scene: ReturnType<typeof createMockScene>;
  let eventBus: EventBus;

  beforeEach(() => {
    scene = createMockScene();
    eventBus = new EventBus();
  });

  describe('DESTRUCTIBLE_DEFAULTS', () => {
    it('should define defaults for all destructible types', () => {
      const expectedTypes: DestructibleType[] = [
        'crate',
        'pillar',
        'console',
        'statue',
        'barrel',
        'holotable',
        'archive_shelf',
        'training_dummy',
      ];

      for (const type of expectedTypes) {
        expect(DESTRUCTIBLE_DEFAULTS[type]).toBeDefined();
        expect(DESTRUCTIBLE_DEFAULTS[type].health).toBeDefined();
      }
    });

    it('should have reasonable health values for different types', () => {
      expect(DESTRUCTIBLE_DEFAULTS.crate.health).toBeLessThan(DESTRUCTIBLE_DEFAULTS.pillar.health!);
      expect(DESTRUCTIBLE_DEFAULTS.barrel.health).toBeLessThan(DESTRUCTIBLE_DEFAULTS.statue.health!);
      expect(DESTRUCTIBLE_DEFAULTS.training_dummy.health).toBe(1000); // Practice dummy has high health
    });

    it('should define loot drops for applicable types', () => {
      expect(DESTRUCTIBLE_DEFAULTS.crate.lootDrops?.length).toBeGreaterThan(0);
      expect(DESTRUCTIBLE_DEFAULTS.console.lootDrops?.length).toBeGreaterThan(0);
      expect(DESTRUCTIBLE_DEFAULTS.pillar.lootDrops?.length).toBe(0); // Pillars don't drop loot
    });
  });

  describe('construction', () => {
    it('should create a destructible with default values', () => {
      const config: DestructibleConfig = {
        id: 'test_destructible',
        x: 100,
        y: 200,
        spriteKey: 'destructible_crate',
        depth: Layer.Terrain + 3,
        collisionEnabled: true,
        physicsEnabled: true,
        destructibleType: 'crate',
        health: 50,
        maxHealth: 50,
        lootDrops: [],
        debris: true,
        debrisCount: 4,
        invulnerableTime: 100,
      };

      const destructible = new Destructible(scene as unknown as Phaser.Scene, config, eventBus);

      expect(destructible.getHealth()).toBe(50);
      expect(destructible.getMaxHealth()).toBe(50);
      expect(destructible.getDestructibleType()).toBe('crate');
      expect(destructible.getIsDestroyed()).toBe(false);
    });

    it('should apply type defaults when values not specified', () => {
      const config: DestructibleConfig = {
        id: 'test_destructible',
        x: 100,
        y: 200,
        spriteKey: 'destructible_pillar',
        depth: Layer.Terrain + 3,
        collisionEnabled: true,
        physicsEnabled: true,
        destructibleType: 'pillar',
        health: undefined as unknown as number,
        maxHealth: undefined as unknown as number,
        lootDrops: undefined as unknown as [],
        debris: undefined as unknown as boolean,
        debrisCount: undefined as unknown as number,
        invulnerableTime: undefined as unknown as number,
      };

      const destructible = new Destructible(scene as unknown as Phaser.Scene, config, eventBus);

      // Should use pillar defaults
      expect(destructible.getMaxHealth()).toBe(DESTRUCTIBLE_DEFAULTS.pillar.maxHealth);
    });
  });

  describe('applyDamage', () => {
    it('should reduce health when damaged', () => {
      const destructible = createDestructible(scene as unknown as Phaser.Scene, 100, 200, 'crate', eventBus, {
        health: 100,
        maxHealth: 100,
      });

      destructible.applyDamage(30);

      expect(destructible.getHealth()).toBe(70);
    });

    it('should emit destructible:damaged event', () => {
      const eventSpy = vi.fn();
      eventBus.on('destructible:damaged', eventSpy);

      const destructible = createDestructible(scene as unknown as Phaser.Scene, 100, 200, 'crate', eventBus);
      destructible.applyDamage(20);

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'destructible:damaged',
          data: expect.objectContaining({
            damage: 20,
          }),
        })
      );
    });

    it('should not go below zero health', () => {
      const destructible = createDestructible(scene as unknown as Phaser.Scene, 100, 200, 'crate', eventBus, {
        health: 50,
        maxHealth: 50,
      });

      destructible.applyDamage(100);

      expect(destructible.getHealth()).toBe(0);
    });

    it('should respect invulnerability time', () => {
      const destructible = createDestructible(scene as unknown as Phaser.Scene, 100, 200, 'crate', eventBus, {
        health: 100,
        maxHealth: 100,
        invulnerableTime: 500,
      });

      // First hit should work
      destructible.applyDamage(20);
      expect(destructible.getHealth()).toBe(80);

      // Immediate second hit should be blocked by invulnerability
      destructible.applyDamage(20);
      expect(destructible.getHealth()).toBe(80); // Still 80, not 60
    });

    it('should trigger destruction when health reaches zero', () => {
      const eventSpy = vi.fn();
      eventBus.on('destructible:destroyed', eventSpy);

      const destructible = createDestructible(scene as unknown as Phaser.Scene, 100, 200, 'crate', eventBus, {
        health: 30,
        maxHealth: 30,
      });

      const destroyed = destructible.applyDamage(50);

      expect(destroyed).toBe(true);
      expect(destructible.getIsDestroyed()).toBe(true);
    });

    it('should return false if already destroyed', () => {
      const destructible = createDestructible(scene as unknown as Phaser.Scene, 100, 200, 'crate', eventBus, {
        health: 10,
        maxHealth: 10,
      });

      // Destroy it
      destructible.applyDamage(20);
      expect(destructible.getIsDestroyed()).toBe(true);

      // Try to damage again - should not work
      const result = destructible.applyDamage(20);
      expect(result).toBe(false);
    });
  });

  describe('getHealthPercent', () => {
    it('should return correct health percentage', () => {
      const destructible = createDestructible(scene as unknown as Phaser.Scene, 100, 200, 'crate', eventBus, {
        health: 75,
        maxHealth: 100,
      });

      expect(destructible.getHealthPercent()).toBe(0.75);
    });

    it('should return 0 when health is depleted', () => {
      const destructible = createDestructible(scene as unknown as Phaser.Scene, 100, 200, 'crate', eventBus, {
        health: 10,
        maxHealth: 100,
      });

      destructible.applyDamage(100);

      expect(destructible.getHealthPercent()).toBe(0);
    });
  });

  describe('interact', () => {
    it('should deal damage when interacted with', () => {
      const destructible = createDestructible(scene as unknown as Phaser.Scene, 100, 200, 'crate', eventBus, {
        health: 50,
        maxHealth: 50,
      });

      const result = destructible.interact(0); // Player entity ID

      expect(result.success).toBe(true);
      expect(destructible.getHealth()).toBeLessThan(50);
    });

    it('should return consumed=true if destroyed by interaction', () => {
      const destructible = createDestructible(scene as unknown as Phaser.Scene, 100, 200, 'crate', eventBus, {
        health: 5, // Low health, will be destroyed by interaction
        maxHealth: 50,
      });

      const result = destructible.interact(0);

      expect(result.consumed).toBe(true);
      expect(result.effectType).toBe('destroyed');
    });
  });

  describe('reset', () => {
    it('should restore destructible to initial state', () => {
      const destructible = createDestructible(scene as unknown as Phaser.Scene, 100, 200, 'crate', eventBus, {
        health: 50,
        maxHealth: 50,
      });

      // Damage it
      destructible.applyDamage(30);
      expect(destructible.getHealth()).toBe(20);

      // Reset it
      destructible.reset(200, 300);

      expect(destructible.getHealth()).toBe(50);
      expect(destructible.getIsDestroyed()).toBe(false);
    });
  });

  describe('loot drops', () => {
    it('should include loot drops in destruction event', async () => {
      const eventSpy = vi.fn();
      eventBus.on('destructible:destroyed', eventSpy);

      const destructible = createDestructible(scene as unknown as Phaser.Scene, 100, 200, 'crate', eventBus, {
        health: 10,
        maxHealth: 10,
        lootDrops: [{ type: 'health', chance: 1.0, minValue: 20, maxValue: 30 }],
      });

      destructible.applyDamage(100);

      // Wait for async destruction to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(eventSpy).toHaveBeenCalled();
      const eventData = eventSpy.mock.calls[0][0].data;
      expect(eventData.lootDrops).toBeDefined();
      expect(eventData.lootDrops.length).toBe(1);
      expect(eventData.lootDrops[0].type).toBe('health');
      expect(eventData.lootDrops[0].value).toBeGreaterThanOrEqual(20);
      expect(eventData.lootDrops[0].value).toBeLessThanOrEqual(30);
    });

    it('should respect loot drop chance', async () => {
      // Test with 0% chance - should not drop
      const eventSpy = vi.fn();
      eventBus.on('destructible:destroyed', eventSpy);

      const destructible = createDestructible(scene as unknown as Phaser.Scene, 100, 200, 'crate', eventBus, {
        health: 10,
        maxHealth: 10,
        lootDrops: [{ type: 'health', chance: 0, minValue: 20, maxValue: 30 }],
      });

      destructible.applyDamage(100);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(eventSpy).toHaveBeenCalled();
      const eventData = eventSpy.mock.calls[0][0].data;
      expect(eventData.lootDrops.length).toBe(0);
    });
  });

  describe('createDestructible factory', () => {
    it('should create destructible with generated ID', () => {
      const destructible = createDestructible(scene as unknown as Phaser.Scene, 100, 200, 'console', eventBus);

      expect(destructible.id).toContain('destructible_');
    });

    it('should apply overrides correctly', () => {
      const destructible = createDestructible(scene as unknown as Phaser.Scene, 100, 200, 'crate', eventBus, {
        health: 200,
        maxHealth: 200,
      });

      expect(destructible.getMaxHealth()).toBe(200);
    });
  });
});
