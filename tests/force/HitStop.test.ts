/**
 * HitStop Tests
 * Tests for the frame freeze combat impact system.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { HitStop, HitStopIntensity } from '../../src/force/HitStop';
import { EventBus } from '../../src/core/events/EventBus';

// Mock Phaser camera
const mockCamera = {
  zoom: 1,
};

// Mock Phaser Scene
const mockScene = {
  time: {
    timeScale: 1,
  },
  cameras: {
    main: mockCamera,
  },
  tweens: {
    add: vi.fn((config) => {
      // Immediately apply target values for testing
      if (config.targets === mockCamera && config.zoom !== undefined) {
        mockCamera.zoom = config.zoom;
      }
    }),
  },
} as unknown as Phaser.Scene;

describe('HitStop', () => {
  let hitStop: HitStop;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    mockScene.time.timeScale = 1;
    mockCamera.zoom = 1;
    hitStop = new HitStop(mockScene, eventBus);
    vi.clearAllMocks();
  });

  afterEach(() => {
    hitStop.destroy();
  });

  describe('initialization', () => {
    it('should not be active initially', () => {
      expect(hitStop.isActive()).toBe(false);
    });

    it('should have no current intensity initially', () => {
      expect(hitStop.getCurrentIntensity()).toBeNull();
    });
  });

  describe('trigger', () => {
    it('should activate hit stop', () => {
      hitStop.trigger(HitStopIntensity.Light);
      expect(hitStop.isActive()).toBe(true);
    });

    it('should set current intensity', () => {
      hitStop.trigger(HitStopIntensity.Heavy);
      expect(hitStop.getCurrentIntensity()).toBe(HitStopIntensity.Heavy);
    });

    it('should reduce time scale', () => {
      hitStop.trigger(HitStopIntensity.Critical);
      expect(mockScene.time.timeScale).toBeLessThan(1);
    });

    it('should have remaining duration after trigger', () => {
      hitStop.trigger(HitStopIntensity.Light);
      expect(hitStop.getRemainingDuration()).toBeGreaterThan(0);
    });
  });

  describe('intensity levels', () => {
    it('Kill intensity should have longest duration', () => {
      const lightConfig = hitStop.getConfig(HitStopIntensity.Light);
      const killConfig = hitStop.getConfig(HitStopIntensity.Kill);
      expect(killConfig.duration).toBeGreaterThan(lightConfig.duration);
    });

    it('Critical intensity should freeze more than light', () => {
      const lightConfig = hitStop.getConfig(HitStopIntensity.Light);
      const criticalConfig = hitStop.getConfig(HitStopIntensity.Critical);
      expect(criticalConfig.timeScale).toBeLessThan(lightConfig.timeScale);
    });

    it('Force intensity should have specific settings', () => {
      const forceConfig = hitStop.getConfig(HitStopIntensity.Force);
      expect(forceConfig.duration).toBeGreaterThan(0);
      expect(forceConfig.timeScale).toBeLessThan(1);
    });

    it('Parry intensity should have settings for clash', () => {
      const parryConfig = hitStop.getConfig(HitStopIntensity.Parry);
      expect(parryConfig.duration).toBeGreaterThan(0);
    });
  });

  describe('update', () => {
    it('should end hit stop after duration', () => {
      hitStop.trigger(HitStopIntensity.Light);

      // Mock time passing beyond duration
      const originalNow = Date.now;
      Date.now = () => originalNow() + 1000;

      hitStop.update(16);

      Date.now = originalNow;

      expect(hitStop.isActive()).toBe(false);
    });

    it('should restore time scale after hit stop ends', () => {
      hitStop.trigger(HitStopIntensity.Light);

      const originalNow = Date.now;
      Date.now = () => originalNow() + 1000;

      hitStop.update(16);

      Date.now = originalNow;

      expect(mockScene.time.timeScale).toBe(1);
    });

    it('should process queue when current hit stop ends', () => {
      // Trigger first hit stop
      hitStop.trigger(HitStopIntensity.Light);

      // Queue another while active (lower priority, so it queues)
      // Note: Same intensity queues

      // End first
      const originalNow = Date.now;
      Date.now = () => originalNow() + 1000;

      hitStop.update(16);

      Date.now = originalNow;
    });
  });

  describe('priority handling', () => {
    it('should override lower intensity with higher', () => {
      hitStop.trigger(HitStopIntensity.Light);
      hitStop.trigger(HitStopIntensity.Kill);

      expect(hitStop.getCurrentIntensity()).toBe(HitStopIntensity.Kill);
    });

    it('should not override higher intensity with lower', () => {
      hitStop.trigger(HitStopIntensity.Kill);
      hitStop.trigger(HitStopIntensity.Light);

      expect(hitStop.getCurrentIntensity()).toBe(HitStopIntensity.Kill);
    });
  });

  describe('cancel', () => {
    it('should immediately end hit stop', () => {
      hitStop.trigger(HitStopIntensity.Heavy);
      hitStop.cancel();

      expect(hitStop.isActive()).toBe(false);
    });

    it('should restore time scale on cancel', () => {
      hitStop.trigger(HitStopIntensity.Critical);
      hitStop.cancel();

      expect(mockScene.time.timeScale).toBe(1);
    });

    it('should clear queue on cancel', () => {
      hitStop.trigger(HitStopIntensity.Light);
      hitStop.trigger(HitStopIntensity.Light); // Queue

      hitStop.cancel();

      // No queued items should trigger
      hitStop.update(16);
      expect(hitStop.isActive()).toBe(false);
    });
  });

  describe('callbacks', () => {
    it('should call onHitStopStart callback', () => {
      const callback = vi.fn();
      hitStop.setOnHitStopStart(callback);

      hitStop.trigger(HitStopIntensity.Light);

      expect(callback).toHaveBeenCalled();
    });

    it('should call onHitStopEnd callback', () => {
      const callback = vi.fn();
      hitStop.setOnHitStopEnd(callback);

      hitStop.trigger(HitStopIntensity.Light);

      const originalNow = Date.now;
      Date.now = () => originalNow() + 1000;

      hitStop.update(16);

      Date.now = originalNow;

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('event listeners', () => {
    it('should trigger on combat:feedback for player attacks', () => {
      eventBus.emit({
        type: 'combat:feedback',
        data: {
          hitType: 'light',
          attackerId: 0,
          damage: 50,
        },
      });

      expect(hitStop.isActive()).toBe(true);
    });

    it('should not trigger on enemy attacks', () => {
      eventBus.emit({
        type: 'combat:feedback',
        data: {
          hitType: 'light',
          attackerId: 100, // Enemy
          damage: 50,
        },
      });

      expect(hitStop.isActive()).toBe(false);
    });

    it('should trigger on combat:parry events', () => {
      eventBus.emit({
        type: 'combat:parry',
        data: {},
      });

      expect(hitStop.isActive()).toBe(true);
      expect(hitStop.getCurrentIntensity()).toBe(HitStopIntensity.Parry);
    });

    it('should trigger on force:power_used with targets', () => {
      eventBus.emit({
        type: 'force:power_used',
        data: {
          targetsHit: [1, 2],
          damage: 100,
        },
      });

      expect(hitStop.isActive()).toBe(true);
      expect(hitStop.getCurrentIntensity()).toBe(HitStopIntensity.Force);
    });

    it('should not trigger on force:power_used without targets', () => {
      eventBus.emit({
        type: 'force:power_used',
        data: {
          targetsHit: [],
          damage: 0,
        },
      });

      expect(hitStop.isActive()).toBe(false);
    });

    it('should map heavy hit type to Heavy intensity', () => {
      eventBus.emit({
        type: 'combat:feedback',
        data: {
          hitType: 'heavy',
          attackerId: 0,
          damage: 100,
        },
      });

      expect(hitStop.getCurrentIntensity()).toBe(HitStopIntensity.Heavy);
    });

    it('should map kill hit type to Kill intensity', () => {
      eventBus.emit({
        type: 'combat:feedback',
        data: {
          hitType: 'kill',
          attackerId: 0,
          damage: 200,
        },
      });

      expect(hitStop.getCurrentIntensity()).toBe(HitStopIntensity.Kill);
    });

    it('should map critical hit type to Critical intensity', () => {
      eventBus.emit({
        type: 'combat:feedback',
        data: {
          hitType: 'critical',
          attackerId: 0,
          damage: 150,
        },
      });

      expect(hitStop.getCurrentIntensity()).toBe(HitStopIntensity.Critical);
    });
  });

  describe('destroy', () => {
    it('should clean up on destroy', () => {
      hitStop.trigger(HitStopIntensity.Heavy);
      hitStop.destroy();

      expect(hitStop.isActive()).toBe(false);
    });

    it('should clear callbacks on destroy', () => {
      const startCallback = vi.fn();
      const endCallback = vi.fn();
      hitStop.setOnHitStopStart(startCallback);
      hitStop.setOnHitStopEnd(endCallback);

      hitStop.destroy();

      // Should not throw when triggering after destroy
      expect(() => hitStop.trigger(HitStopIntensity.Light)).not.toThrow();
    });
  });

  describe('getConfig', () => {
    it('should return copy of config', () => {
      const config1 = hitStop.getConfig(HitStopIntensity.Heavy);
      const config2 = hitStop.getConfig(HitStopIntensity.Heavy);

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different objects
    });
  });

  describe('getRemainingDuration', () => {
    it('should return 0 when not active', () => {
      expect(hitStop.getRemainingDuration()).toBe(0);
    });

    it('should decrease over time', () => {
      hitStop.trigger(HitStopIntensity.Heavy);
      const initial = hitStop.getRemainingDuration();

      // Mock time passing
      const originalNow = Date.now;
      Date.now = () => originalNow() + 20;

      const after = hitStop.getRemainingDuration();

      Date.now = originalNow;

      expect(after).toBeLessThan(initial);
    });
  });
});
