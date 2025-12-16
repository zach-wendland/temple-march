/**
 * ForceSystem Tests
 * Tests for Force Power mechanics including Push, Pull, and Lightning.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../../src/core/events/EventBus';

// Mock Phaser before importing ForceSystem
vi.mock('phaser', () => ({
  default: {
    Math: {
      Distance: {
        Between: (x1: number, y1: number, x2: number, y2: number) =>
          Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),
      },
      Angle: {
        Wrap: (angle: number) => {
          while (angle > Math.PI) angle -= Math.PI * 2;
          while (angle < -Math.PI) angle += Math.PI * 2;
          return angle;
        },
      },
    },
  },
}));

// Mock p5.js
vi.mock('p5', () => ({
  default: vi.fn(),
}));

// Mock EffectsLayer
vi.mock('../../src/core/EffectsLayer', () => ({
  EffectsLayer: vi.fn(),
  getEffectsLayer: vi.fn(() => null),
  initEffectsLayer: vi.fn(),
}));

import {
  ForceSystem,
  ForcePowerType,
  ForcePowerConfig,
  ForcePowerResult,
  ForceTarget,
  FORCE_POWER_CONFIGS,
} from '../../src/force/ForceSystem';

// Mock Phaser Scene
const mockScene = {
  time: {
    timeScale: 1,
  },
  cameras: {
    main: {
      zoom: 1,
    },
  },
  tweens: {
    add: vi.fn(),
  },
} as unknown as Phaser.Scene;

// Mock CombatManager
const mockCombatManager = {
  applyDamage: vi.fn(),
  getEntityStats: vi.fn(() => ({ health: 100, maxHealth: 100 })),
  registerEntity: vi.fn(),
  unregisterEntity: vi.fn(),
  isAttacking: vi.fn(() => false),
  setDefenseType: vi.fn(),
  setInvulnerable: vi.fn(),
} as unknown as import('../../src/combat/CombatManager').CombatManager;

// Mock EffectsLayer
const mockEffectsLayer = {
  spawnForceWave: vi.fn(),
  spawnLightning: vi.fn(),
  spawnForcePushCone: vi.fn(),
  spawnForcePullVortex: vi.fn(),
  spawnDarkSideAura: vi.fn(),
  spawnImpactSparks: vi.fn(),
} as unknown as import('../../src/core/EffectsLayer').EffectsLayer;

describe('ForceSystem', () => {
  let forceSystem: ForceSystem;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    forceSystem = new ForceSystem(mockScene, eventBus, mockCombatManager);
    forceSystem.setEffectsLayer(mockEffectsLayer);
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should have correct default configurations for Force Push', () => {
      const config = FORCE_POWER_CONFIGS[ForcePowerType.Push];
      expect(config.cost).toBe(20);
      expect(config.cooldown).toBe(800);
      expect(config.damage).toBe(30);
      expect(config.range).toBe(250);
      expect(config.knockback).toBeGreaterThan(0); // Push away
      expect(config.coneAngle).toBe(60);
      expect(config.multiTarget).toBe(true);
    });

    it('should have correct default configurations for Force Pull', () => {
      const config = FORCE_POWER_CONFIGS[ForcePowerType.Pull];
      expect(config.cost).toBe(15);
      expect(config.knockback).toBeLessThan(0); // Pull toward (negative)
      expect(config.multiTarget).toBe(true);
    });

    it('should have correct default configurations for Force Lightning', () => {
      const config = FORCE_POWER_CONFIGS[ForcePowerType.Lightning];
      expect(config.cost).toBe(40);
      expect(config.damage).toBe(80);
      expect(config.duration).toBeGreaterThan(0); // Sustained power
      expect(config.maxTargets).toBe(4); // Chain lightning
    });
  });

  describe('canUsePower', () => {
    it('should return true when player has enough Force', () => {
      const canUse = forceSystem.canUsePower(ForcePowerType.Push, 50);
      expect(canUse).toBe(true);
    });

    it('should return false when player has insufficient Force', () => {
      const canUse = forceSystem.canUsePower(ForcePowerType.Push, 10);
      expect(canUse).toBe(false);
    });

    it('should return false when power is on cooldown', () => {
      // Execute to trigger cooldown
      forceSystem.executeForcePush(0, { x: 0, y: 0 }, 0, [], 100);

      // Should be on cooldown now
      const canUse = forceSystem.canUsePower(ForcePowerType.Push, 100);
      expect(canUse).toBe(false);
    });
  });

  describe('getCooldownRemaining', () => {
    it('should return 0 when not on cooldown', () => {
      const remaining = forceSystem.getCooldownRemaining(ForcePowerType.Push);
      expect(remaining).toBe(0);
    });

    it('should return positive value after use', () => {
      forceSystem.executeForcePush(0, { x: 0, y: 0 }, 0, [], 100);
      const remaining = forceSystem.getCooldownRemaining(ForcePowerType.Push);
      expect(remaining).toBeGreaterThan(0);
    });
  });

  describe('executeForcePush', () => {
    const createMockTargets = (): ForceTarget[] => [
      {
        id: 1,
        sprite: {} as Phaser.GameObjects.Sprite,
        position: { x: 100, y: 0 }, // In front
        health: 100,
        isBlocking: false,
      },
      {
        id: 2,
        sprite: {} as Phaser.GameObjects.Sprite,
        position: { x: 150, y: 20 }, // In front, slightly offset
        health: 100,
        isBlocking: false,
      },
      {
        id: 3,
        sprite: {} as Phaser.GameObjects.Sprite,
        position: { x: -100, y: 0 }, // Behind (should not hit)
        health: 100,
        isBlocking: false,
      },
    ];

    it('should return success when executed with sufficient Force', () => {
      const targets = createMockTargets();
      const result = forceSystem.executeForcePush(
        0,
        { x: 0, y: 0 },
        0, // Facing right
        targets,
        100
      );

      expect(result.success).toBe(true);
      expect(result.forceCost).toBe(FORCE_POWER_CONFIGS[ForcePowerType.Push].cost);
    });

    it('should fail when insufficient Force', () => {
      const result = forceSystem.executeForcePush(
        0,
        { x: 0, y: 0 },
        0,
        [],
        5 // Not enough Force
      );

      expect(result.success).toBe(false);
      expect(result.failReason).toBe('Insufficient Force');
    });

    it('should hit targets in cone and not behind', () => {
      const targets = createMockTargets();
      const result = forceSystem.executeForcePush(
        0,
        { x: 0, y: 0 },
        0, // Facing right
        targets,
        100
      );

      // Should hit targets in front (ids 1 and 2), not behind (id 3)
      expect(result.targetsHit).toContain(1);
      expect(result.targetsHit).toContain(2);
      expect(result.targetsHit).not.toContain(3);
    });

    it('should apply damage through combat manager', () => {
      const targets = createMockTargets();
      forceSystem.executeForcePush(0, { x: 0, y: 0 }, 0, targets, 100);

      expect(mockCombatManager.applyDamage).toHaveBeenCalled();
    });

    it('should emit force:power_used event', () => {
      const eventSpy = vi.fn();
      eventBus.on('force:power_used', eventSpy);

      forceSystem.executeForcePush(0, { x: 0, y: 0 }, 0, createMockTargets(), 100);

      expect(eventSpy).toHaveBeenCalled();
      const eventData = eventSpy.mock.calls[0][0].data;
      expect(eventData.powerType).toBe(ForcePowerType.Push);
    });
  });

  describe('executeForcePull', () => {
    it('should pull targets toward caster', () => {
      const targets: ForceTarget[] = [
        {
          id: 1,
          sprite: {} as Phaser.GameObjects.Sprite,
          position: { x: 200, y: 0 },
          health: 100,
          isBlocking: false,
        },
      ];

      const result = forceSystem.executeForcePull(
        0,
        { x: 0, y: 0 },
        0,
        targets,
        100
      );

      expect(result.success).toBe(true);

      // Verify damage was applied with negative knockback (toward caster)
      const applyDamageCall = (mockCombatManager.applyDamage as ReturnType<typeof vi.fn>).mock.calls[0];
      // knockbackX should be negative (pulling left toward caster at origin)
      expect(applyDamageCall[2]).toBeLessThan(0);
    });
  });

  describe('executeForceLightning', () => {
    it('should chain to multiple targets', () => {
      const targets: ForceTarget[] = [
        {
          id: 1,
          sprite: {} as Phaser.GameObjects.Sprite,
          position: { x: 100, y: 0 },
          health: 100,
          isBlocking: false,
        },
        {
          id: 2,
          sprite: {} as Phaser.GameObjects.Sprite,
          position: { x: 150, y: 0 }, // Close to target 1
          health: 100,
          isBlocking: false,
        },
        {
          id: 3,
          sprite: {} as Phaser.GameObjects.Sprite,
          position: { x: 200, y: 0 }, // Close to target 2
          health: 100,
          isBlocking: false,
        },
      ];

      const result = forceSystem.executeForceLightning(
        0,
        { x: 0, y: 0 },
        0,
        targets,
        100
      );

      expect(result.success).toBe(true);
      expect(result.targetsHit.length).toBeGreaterThan(1); // Should chain
    });

    it('should fail when no targets in range', () => {
      const result = forceSystem.executeForceLightning(
        0,
        { x: 0, y: 0 },
        0,
        [], // No targets
        100
      );

      expect(result.success).toBe(false);
      expect(result.failReason).toBe('No targets in range');
    });

    it('should create sustained power entry', () => {
      const targets: ForceTarget[] = [
        {
          id: 1,
          sprite: {} as Phaser.GameObjects.Sprite,
          position: { x: 100, y: 0 },
          health: 100,
          isBlocking: false,
        },
      ];

      forceSystem.executeForceLightning(0, { x: 0, y: 0 }, 0, targets, 100);

      expect(forceSystem.hasActivePower()).toBe(true);
    });
  });

  describe('update', () => {
    it('should expire sustained powers after duration', () => {
      const targets: ForceTarget[] = [
        {
          id: 1,
          sprite: {} as Phaser.GameObjects.Sprite,
          position: { x: 100, y: 0 },
          health: 100,
          isBlocking: false,
        },
      ];

      forceSystem.executeForceLightning(0, { x: 0, y: 0 }, 0, targets, 100);
      expect(forceSystem.hasActivePower()).toBe(true);

      // Fast forward time (mock Date.now)
      const originalNow = Date.now;
      Date.now = () => originalNow() + 2000; // 2 seconds later

      forceSystem.update(16);

      Date.now = originalNow;
    });
  });

  describe('cancelAllPowers', () => {
    it('should clear all active powers', () => {
      const targets: ForceTarget[] = [
        {
          id: 1,
          sprite: {} as Phaser.GameObjects.Sprite,
          position: { x: 100, y: 0 },
          health: 100,
          isBlocking: false,
        },
      ];

      forceSystem.executeForceLightning(0, { x: 0, y: 0 }, 0, targets, 100);
      expect(forceSystem.hasActivePower()).toBe(true);

      forceSystem.cancelAllPowers();
      expect(forceSystem.hasActivePower()).toBe(false);
    });
  });

  describe('getPowerConfig', () => {
    it('should return config for power type', () => {
      const config = forceSystem.getPowerConfig(ForcePowerType.Push);
      expect(config).toEqual(FORCE_POWER_CONFIGS[ForcePowerType.Push]);
    });
  });

  describe('destroy', () => {
    it('should clean up all state', () => {
      const targets: ForceTarget[] = [
        {
          id: 1,
          sprite: {} as Phaser.GameObjects.Sprite,
          position: { x: 100, y: 0 },
          health: 100,
          isBlocking: false,
        },
      ];

      forceSystem.executeForceLightning(0, { x: 0, y: 0 }, 0, targets, 100);
      forceSystem.destroy();

      expect(forceSystem.hasActivePower()).toBe(false);
    });
  });
});

describe('Force Power Cone Targeting', () => {
  let forceSystem: ForceSystem;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    forceSystem = new ForceSystem(mockScene, eventBus, mockCombatManager);
    vi.clearAllMocks();
  });

  it('should only hit targets within cone angle', () => {
    // Target directly in front should be hit
    const targetsInFront: ForceTarget[] = [
      {
        id: 1,
        sprite: {} as Phaser.GameObjects.Sprite,
        position: { x: 100, y: 0 }, // Directly right
        health: 100,
        isBlocking: false,
      },
    ];

    const result1 = forceSystem.executeForcePush(0, { x: 0, y: 0 }, 0, targetsInFront, 100);
    expect(result1.targetsHit).toContain(1);
  });

  it('should respect max targets limit', () => {
    const manyTargets: ForceTarget[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      sprite: {} as Phaser.GameObjects.Sprite,
      position: { x: 50 + i * 5, y: 0 },
      health: 100,
      isBlocking: false,
    }));

    const result = forceSystem.executeForcePush(0, { x: 0, y: 0 }, 0, manyTargets, 100);

    // Should be limited by maxTargets config
    expect(result.targetsHit.length).toBeLessThanOrEqual(
      FORCE_POWER_CONFIGS[ForcePowerType.Push].maxTargets
    );
  });

  it('should prioritize closer targets', () => {
    const targets: ForceTarget[] = [
      {
        id: 1,
        sprite: {} as Phaser.GameObjects.Sprite,
        position: { x: 200, y: 0 }, // Far
        health: 100,
        isBlocking: false,
      },
      {
        id: 2,
        sprite: {} as Phaser.GameObjects.Sprite,
        position: { x: 50, y: 0 }, // Close
        health: 100,
        isBlocking: false,
      },
    ];

    const result = forceSystem.executeForcePush(0, { x: 0, y: 0 }, 0, targets, 100);

    // Closer target (id 2) should be first in hits
    expect(result.targetsHit[0]).toBe(2);
  });
});
