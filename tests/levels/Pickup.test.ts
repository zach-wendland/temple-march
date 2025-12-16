/**
 * Pickup Tests
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
      Angle: {
        Between: (x1: number, y1: number, x2: number, y2: number) =>
          Math.atan2(y2 - y1, x2 - x1),
      },
      Between: (min: number, max: number) =>
        Math.floor(Math.random() * (max - min + 1)) + min,
    },
    Physics: {
      Arcade: {
        Body: class {},
      },
    },
    GameObjects: {
      Sprite: class {},
      Graphics: class {},
      GameObject: class {},
    },
  },
}));

import {
  Pickup,
  PickupConfig,
  PickupType,
  PICKUP_DEFAULTS,
  createPickup,
} from '../../src/levels/Pickup';
import { EventBus } from '../../src/core/events/EventBus';
import { Layer } from '../../src/core/types';

// Mock Phaser scene
const createMockScene = () => ({
  add: {
    sprite: vi.fn().mockReturnValue({
      setDepth: vi.fn().mockReturnThis(),
      setData: vi.fn().mockReturnThis(),
      setActive: vi.fn().mockReturnThis(),
      setVisible: vi.fn().mockReturnThis(),
      setPosition: vi.fn().mockReturnThis(),
      setScale: vi.fn().mockReturnThis(),
      setAlpha: vi.fn().mockReturnThis(),
      x: 100,
      y: 200,
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
          setVelocity: vi.fn(),
        };
        return obj;
      }),
    },
  },
  tweens: {
    add: vi.fn().mockImplementation((config) => {
      if (config.onComplete) {
        setTimeout(() => config.onComplete(), 0);
      }
      return { destroy: vi.fn() };
    }),
  },
  sound: {
    play: vi.fn(),
  },
});

describe('Pickup', () => {
  let scene: ReturnType<typeof createMockScene>;
  let eventBus: EventBus;

  beforeEach(() => {
    scene = createMockScene();
    eventBus = new EventBus();
  });

  describe('PICKUP_DEFAULTS', () => {
    it('should define defaults for all pickup types', () => {
      const expectedTypes: PickupType[] = [
        'health',
        'force',
        'health_large',
        'force_large',
        'combo_extender',
      ];

      for (const type of expectedTypes) {
        expect(PICKUP_DEFAULTS[type]).toBeDefined();
        expect(PICKUP_DEFAULTS[type].value).toBeDefined();
        expect(PICKUP_DEFAULTS[type].glowColor).toBeDefined();
      }
    });

    it('should have appropriate values for health vs force', () => {
      expect(PICKUP_DEFAULTS.health.value).toBe(25);
      expect(PICKUP_DEFAULTS.health_large.value).toBe(75);
      expect(PICKUP_DEFAULTS.force.value).toBe(20);
      expect(PICKUP_DEFAULTS.force_large.value).toBe(50);
    });

    it('should have distinct glow colors for different types', () => {
      expect(PICKUP_DEFAULTS.health.glowColor).not.toBe(PICKUP_DEFAULTS.force.glowColor);
      expect(PICKUP_DEFAULTS.combo_extender.glowColor).not.toBe(PICKUP_DEFAULTS.health.glowColor);
    });
  });

  describe('construction', () => {
    it('should create a pickup with correct values', () => {
      const config: PickupConfig = {
        id: 'test_pickup',
        x: 100,
        y: 200,
        spriteKey: 'pickup_health',
        depth: Layer.Effects + 5,
        collisionEnabled: false,
        physicsEnabled: true,
        pickupType: 'health',
        value: 30,
        magnetDistance: 80,
        collectDistance: 30,
        bobHeight: 4,
        bobSpeed: 2,
        glowColor: 0x44ff44,
        respawns: false,
        respawnTime: 0,
      };

      const pickup = new Pickup(scene as unknown as Phaser.Scene, config, eventBus);

      expect(pickup.getPickupType()).toBe('health');
      expect(pickup.getValue()).toBe(30);
      expect(pickup.getIsCollected()).toBe(false);
    });

    it('should apply type defaults when values not specified', () => {
      const pickup = createPickup(scene as unknown as Phaser.Scene, 100, 200, 'force', eventBus);

      expect(pickup.getValue()).toBe(PICKUP_DEFAULTS.force.value);
    });
  });

  describe('tryCollect', () => {
    it('should collect pickup when collector is within collect distance', () => {
      const pickup = createPickup(scene as unknown as Phaser.Scene, 100, 200, 'health', eventBus, {
        collectDistance: 50,
      });

      const collector = { x: 110, y: 200, active: true };
      const result = pickup.tryCollect(collector as unknown as Phaser.GameObjects.GameObject, 0);

      expect(result).toBe(true);
      expect(pickup.getIsCollected()).toBe(true);
    });

    it('should not collect pickup when collector is out of range', () => {
      const pickup = createPickup(scene as unknown as Phaser.Scene, 100, 200, 'health', eventBus, {
        collectDistance: 30,
      });

      const collector = { x: 200, y: 200, active: true }; // 100 units away
      const result = pickup.tryCollect(collector as unknown as Phaser.GameObjects.GameObject, 0);

      expect(result).toBe(false);
      expect(pickup.getIsCollected()).toBe(false);
    });

    it('should not collect already collected pickup', () => {
      const pickup = createPickup(scene as unknown as Phaser.Scene, 100, 200, 'health', eventBus, {
        collectDistance: 50,
      });

      const collector = { x: 100, y: 200, active: true };

      // Collect first time
      pickup.tryCollect(collector as unknown as Phaser.GameObjects.GameObject, 0);
      expect(pickup.getIsCollected()).toBe(true);

      // Try to collect again
      const result = pickup.tryCollect(collector as unknown as Phaser.GameObjects.GameObject, 0);
      expect(result).toBe(false);
    });

    it('should emit pickup:collected event', () => {
      const eventSpy = vi.fn();
      eventBus.on('pickup:collected', eventSpy);

      const pickup = createPickup(scene as unknown as Phaser.Scene, 100, 200, 'health', eventBus, {
        value: 25,
        collectDistance: 50,
      });

      const collector = { x: 100, y: 200, active: true };
      pickup.tryCollect(collector as unknown as Phaser.GameObjects.GameObject, 0);

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'pickup:collected',
          data: expect.objectContaining({
            pickupType: 'health',
            value: 25,
            collectorId: 0,
            effectType: 'restore_health',
          }),
        })
      );
    });
  });

  describe('interact', () => {
    it('should collect pickup on interaction', () => {
      const pickup = createPickup(scene as unknown as Phaser.Scene, 100, 200, 'health', eventBus);

      const result = pickup.interact(0);

      expect(result.success).toBe(true);
      expect(result.consumed).toBe(true);
      expect(result.effectType).toBe('restore_health');
    });

    it('should return correct effect type for force pickup', () => {
      const pickup = createPickup(scene as unknown as Phaser.Scene, 100, 200, 'force', eventBus);

      const result = pickup.interact(0);

      expect(result.effectType).toBe('restore_force');
    });

    it('should return correct effect type for combo extender', () => {
      const pickup = createPickup(scene as unknown as Phaser.Scene, 100, 200, 'combo_extender', eventBus);

      const result = pickup.interact(0);

      expect(result.effectType).toBe('extend_combo');
    });

    it('should fail if already collected', () => {
      const pickup = createPickup(scene as unknown as Phaser.Scene, 100, 200, 'health', eventBus);

      pickup.interact(0);
      const result = pickup.interact(0);

      expect(result.success).toBe(false);
      expect(result.consumed).toBe(false);
    });
  });

  describe('setMagnetTarget', () => {
    it('should set the magnet target', () => {
      const pickup = createPickup(scene as unknown as Phaser.Scene, 100, 200, 'health', eventBus);

      const target = { x: 200, y: 200, active: true };
      pickup.setMagnetTarget(target as unknown as Phaser.GameObjects.GameObject);

      // Target is set internally - we can verify through update behavior
      // For now, just verify no errors
      expect(() => pickup.update(16)).not.toThrow();
    });

    it('should allow clearing magnet target', () => {
      const pickup = createPickup(scene as unknown as Phaser.Scene, 100, 200, 'health', eventBus);

      pickup.setMagnetTarget(null);

      expect(() => pickup.update(16)).not.toThrow();
    });
  });

  describe('update', () => {
    it('should not update if collected', () => {
      const pickup = createPickup(scene as unknown as Phaser.Scene, 100, 200, 'health', eventBus);

      pickup.interact(0); // Collect it

      // Should not throw
      expect(() => pickup.update(16)).not.toThrow();
    });

    it('should handle bob animation', () => {
      const pickup = createPickup(scene as unknown as Phaser.Scene, 100, 200, 'health', eventBus, {
        bobHeight: 4,
        bobSpeed: 2,
      });

      // Multiple updates should not throw
      for (let i = 0; i < 10; i++) {
        expect(() => pickup.update(16)).not.toThrow();
      }
    });
  });

  describe('respawn', () => {
    // Create a special mock scene for respawn tests that calls onComplete synchronously
    const createSyncTweenMockScene = () => ({
      add: {
        sprite: vi.fn().mockReturnValue({
          setDepth: vi.fn().mockReturnThis(),
          setData: vi.fn().mockReturnThis(),
          setActive: vi.fn().mockReturnThis(),
          setVisible: vi.fn().mockReturnThis(),
          setPosition: vi.fn().mockReturnThis(),
          setScale: vi.fn().mockReturnThis(),
          setAlpha: vi.fn().mockReturnThis(),
          x: 100,
          y: 200,
          depth: 10,
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
              setVelocity: vi.fn(),
            };
            return obj;
          }),
        },
      },
      tweens: {
        add: vi.fn().mockImplementation((config) => {
          // Call onComplete synchronously for deterministic tests
          if (config.onComplete) {
            config.onComplete();
          }
          return { destroy: vi.fn() };
        }),
      },
      sound: {
        play: vi.fn(),
      },
    });

    it('should respawn after timer if respawns is true', () => {
      const syncScene = createSyncTweenMockScene();

      const pickup = createPickup(syncScene as unknown as Phaser.Scene, 100, 200, 'health', eventBus, {
        respawns: true,
        respawnTime: 100,
        collectDistance: 50,
      });

      // Collect it
      const collector = { x: 100, y: 200, active: true };
      pickup.tryCollect(collector as unknown as Phaser.GameObjects.GameObject, 0);
      expect(pickup.getIsCollected()).toBe(true);

      // Simulate time passing - respawnTimer should now be set (100ms)
      for (let i = 0; i < 10; i++) {
        pickup.update(20); // 20ms * 10 = 200ms > respawnTime (100)
      }

      // Should be able to collect again after respawn
      expect(pickup.getIsCollected()).toBe(false);
    });

    it('should emit pickup:respawned event', () => {
      const syncScene = createSyncTweenMockScene();
      const localEventBus = new EventBus();
      const eventSpy = vi.fn();
      localEventBus.on('pickup:respawned', eventSpy);

      const pickup = createPickup(syncScene as unknown as Phaser.Scene, 100, 200, 'health', localEventBus, {
        respawns: true,
        respawnTime: 50,
        collectDistance: 50,
      });

      // Collect it
      const collector = { x: 100, y: 200, active: true };
      pickup.tryCollect(collector as unknown as Phaser.GameObjects.GameObject, 0);

      // Simulate time passing to exceed respawnTime (50ms)
      for (let i = 0; i < 10; i++) {
        pickup.update(20); // 20ms * 10 = 200ms > respawnTime (50)
      }

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'pickup:respawned',
        })
      );
    });
  });

  describe('reset', () => {
    it('should restore pickup to initial state', () => {
      const pickup = createPickup(scene as unknown as Phaser.Scene, 100, 200, 'health', eventBus);

      // Collect it
      pickup.interact(0);
      expect(pickup.getIsCollected()).toBe(true);

      // Reset it
      pickup.reset(300, 400);

      expect(pickup.getIsCollected()).toBe(false);
    });

    it('should allow changing pickup type on reset', () => {
      const pickup = createPickup(scene as unknown as Phaser.Scene, 100, 200, 'health', eventBus);

      pickup.reset(300, 400, 'force', 50);

      expect(pickup.getPickupType()).toBe('force');
      expect(pickup.getValue()).toBe(50);
    });
  });

  describe('createPickup factory', () => {
    it('should create pickup with generated ID', () => {
      const pickup = createPickup(scene as unknown as Phaser.Scene, 100, 200, 'health', eventBus);

      expect(pickup.id).toContain('pickup_');
    });

    it('should apply overrides correctly', () => {
      const pickup = createPickup(scene as unknown as Phaser.Scene, 100, 200, 'health', eventBus, {
        value: 100,
        magnetDistance: 150,
      });

      expect(pickup.getValue()).toBe(100);
    });

    it('should create different pickup types', () => {
      const healthPickup = createPickup(scene as unknown as Phaser.Scene, 100, 200, 'health', eventBus);
      const forcePickup = createPickup(scene as unknown as Phaser.Scene, 100, 200, 'force', eventBus);
      const largeHealth = createPickup(scene as unknown as Phaser.Scene, 100, 200, 'health_large', eventBus);

      expect(healthPickup.getPickupType()).toBe('health');
      expect(forcePickup.getPickupType()).toBe('force');
      expect(largeHealth.getPickupType()).toBe('health_large');
      expect(largeHealth.getValue()).toBeGreaterThan(healthPickup.getValue());
    });
  });

  describe('destroy', () => {
    it('should clean up glow effect on destroy', () => {
      const pickup = createPickup(scene as unknown as Phaser.Scene, 100, 200, 'health', eventBus);

      // Should not throw
      expect(() => pickup.destroy()).not.toThrow();
    });
  });

  describe('applyDamage', () => {
    it('should not be affected by damage (pickups are not damageable)', () => {
      const pickup = createPickup(scene as unknown as Phaser.Scene, 100, 200, 'health', eventBus);

      const result = pickup.applyDamage(100);

      expect(result).toBe(false);
      expect(pickup.getIsActive()).toBe(true);
    });
  });
});
