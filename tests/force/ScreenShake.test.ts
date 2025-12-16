/**
 * ScreenShake Tests
 * Tests for the trauma-based screen shake system.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScreenShake, ScreenShakeConfig, TraumaSource } from '../../src/force/ScreenShake';
import { EventBus } from '../../src/core/events/EventBus';

// Mock Phaser camera
const mockCamera = {
  scrollX: 0,
  scrollY: 0,
  rotation: 0,
  setBounds: vi.fn(),
};

// Mock Phaser Scene
const mockScene = {
  cameras: {
    main: mockCamera,
  },
} as unknown as Phaser.Scene;

describe('ScreenShake', () => {
  let screenShake: ScreenShake;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    mockCamera.scrollX = 0;
    mockCamera.scrollY = 0;
    mockCamera.rotation = 0;
    screenShake = new ScreenShake(mockScene, eventBus);
  });

  describe('initialization', () => {
    it('should initialize with zero trauma', () => {
      expect(screenShake.getTrauma()).toBe(0);
    });

    it('should not be active initially', () => {
      expect(screenShake.getIsActive()).toBe(false);
    });
  });

  describe('addTrauma', () => {
    it('should add trauma value', () => {
      screenShake.addTrauma(0.5);
      expect(screenShake.getTrauma()).toBe(0.5);
    });

    it('should clamp trauma to max value', () => {
      screenShake.addTrauma(1.5);
      expect(screenShake.getTrauma()).toBeLessThanOrEqual(1.0);
    });

    it('should stack trauma from multiple calls', () => {
      screenShake.addTrauma(0.3);
      screenShake.addTrauma(0.3);
      expect(screenShake.getTrauma()).toBe(0.6);
    });

    it('should activate screen shake when trauma is added', () => {
      screenShake.addTrauma(0.5);
      expect(screenShake.getIsActive()).toBe(true);
    });
  });

  describe('addTraumaFromSource', () => {
    it('should add trauma based on source type', () => {
      screenShake.addTraumaFromSource(TraumaSource.LightHit);
      expect(screenShake.getTrauma()).toBeGreaterThan(0);
    });

    it('should add more trauma for heavier sources', () => {
      const lightShake = new ScreenShake(mockScene, eventBus);
      const heavyShake = new ScreenShake(mockScene, eventBus);

      lightShake.addTraumaFromSource(TraumaSource.LightHit);
      heavyShake.addTraumaFromSource(TraumaSource.HeavyHit);

      expect(heavyShake.getTrauma()).toBeGreaterThan(lightShake.getTrauma());
    });

    it('should apply different trauma for Force powers', () => {
      screenShake.addTraumaFromSource(TraumaSource.ForcePush);
      const pushTrauma = screenShake.getTrauma();

      const pullShake = new ScreenShake(mockScene, eventBus);
      pullShake.addTraumaFromSource(TraumaSource.ForcePull);
      const pullTrauma = pullShake.getTrauma();

      // Both should have trauma
      expect(pushTrauma).toBeGreaterThan(0);
      expect(pullTrauma).toBeGreaterThan(0);
    });

    it('should handle Force Lightning with higher trauma', () => {
      screenShake.addTraumaFromSource(TraumaSource.ForceLightning);
      expect(screenShake.getTrauma()).toBeGreaterThan(0.4);
    });
  });

  describe('update', () => {
    it('should decay trauma over time', () => {
      screenShake.addTrauma(0.5);
      const initialTrauma = screenShake.getTrauma();

      // Simulate frame updates
      screenShake.update(100);

      expect(screenShake.getTrauma()).toBeLessThan(initialTrauma);
    });

    it('should deactivate when trauma reaches zero', () => {
      screenShake.addTrauma(0.1);

      // Simulate many frame updates to decay trauma
      for (let i = 0; i < 100; i++) {
        screenShake.update(50);
      }

      expect(screenShake.getTrauma()).toBe(0);
      expect(screenShake.getIsActive()).toBe(false);
    });

    it('should not update camera when not active', () => {
      const initialScrollX = mockCamera.scrollX;
      const initialScrollY = mockCamera.scrollY;

      screenShake.update(16);

      expect(mockCamera.scrollX).toBe(initialScrollX);
      expect(mockCamera.scrollY).toBe(initialScrollY);
    });
  });

  describe('stop', () => {
    it('should immediately stop all shake', () => {
      screenShake.addTrauma(1.0);
      screenShake.stop();

      expect(screenShake.getTrauma()).toBe(0);
      expect(screenShake.getIsActive()).toBe(false);
    });
  });

  describe('setConfig', () => {
    it('should allow updating configuration', () => {
      screenShake.setConfig({ maxTrauma: 0.5 });
      screenShake.addTrauma(1.0);

      expect(screenShake.getTrauma()).toBeLessThanOrEqual(0.5);
    });
  });

  describe('event listeners', () => {
    it('should respond to effect:screen_shake events', () => {
      eventBus.emit({
        type: 'effect:screen_shake',
        data: {
          intensity: 0.5,
          duration: 200,
        },
      });

      expect(screenShake.getTrauma()).toBe(0.5);
    });

    it('should respond to combat:feedback events for player attacks', () => {
      eventBus.emit({
        type: 'combat:feedback',
        data: {
          hitType: 'light',
          damage: 50,
          attackerId: 0, // Player
        },
      });

      expect(screenShake.getTrauma()).toBeGreaterThan(0);
    });

    it('should respond to player:damaged events', () => {
      eventBus.emit({
        type: 'player:damaged',
        data: {},
      });

      expect(screenShake.getTrauma()).toBeGreaterThan(0);
    });
  });

  describe('destroy', () => {
    it('should clean up state on destroy', () => {
      screenShake.addTrauma(0.5);
      screenShake.destroy();

      expect(screenShake.getTrauma()).toBe(0);
      expect(screenShake.getIsActive()).toBe(false);
    });
  });
});

describe('TraumaSource configurations', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  it('should have unique trauma values for each source', () => {
    const sources = Object.values(TraumaSource);
    const traumaValues: Map<TraumaSource, number> = new Map();

    for (const source of sources) {
      const shake = new ScreenShake(mockScene, eventBus);
      shake.addTraumaFromSource(source);
      traumaValues.set(source, shake.getTrauma());
    }

    // All sources should add some trauma
    for (const [source, trauma] of traumaValues) {
      expect(trauma).toBeGreaterThan(0);
    }
  });

  it('Kill source should have satisfying trauma', () => {
    const shake = new ScreenShake(mockScene, eventBus);
    shake.addTraumaFromSource(TraumaSource.Kill);
    expect(shake.getTrauma()).toBeGreaterThanOrEqual(0.3);
  });

  it('Explosion source should have high trauma', () => {
    const shake = new ScreenShake(mockScene, eventBus);
    shake.addTraumaFromSource(TraumaSource.Explosion);
    expect(shake.getTrauma()).toBeGreaterThanOrEqual(0.6);
  });
});
