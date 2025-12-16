/**
 * BossHealthBar Tests
 * Phase 6: Polish & Content
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BossHealthBar, BossConfig, BossPhase, createCinDralligHealthBar } from '../../src/ui/BossHealthBar';

// Mock Phaser scene
const createMockScene = () => ({
  add: {
    container: vi.fn(() => ({
      setDepth: vi.fn().mockReturnThis(),
      setScrollFactor: vi.fn().mockReturnThis(),
      add: vi.fn(),
      setAlpha: vi.fn().mockReturnThis(),
      setScale: vi.fn().mockReturnThis(),
      setVisible: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
    })),
    graphics: vi.fn(() => ({
      clear: vi.fn().mockReturnThis(),
      fillStyle: vi.fn().mockReturnThis(),
      fillRect: vi.fn().mockReturnThis(),
      lineStyle: vi.fn().mockReturnThis(),
      strokeRect: vi.fn().mockReturnThis(),
      beginPath: vi.fn().mockReturnThis(),
      moveTo: vi.fn().mockReturnThis(),
      lineTo: vi.fn().mockReturnThis(),
      strokePath: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
    })),
    text: vi.fn(() => ({
      setOrigin: vi.fn().mockReturnThis(),
      setLetterSpacing: vi.fn().mockReturnThis(),
      setDepth: vi.fn().mockReturnThis(),
      setScrollFactor: vi.fn().mockReturnThis(),
      setAlpha: vi.fn().mockReturnThis(),
      setText: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
    })),
  },
  tweens: {
    add: vi.fn(() => ({ stop: vi.fn() })),
  },
  time: {
    delayedCall: vi.fn((delay, callback) => callback()),
  },
  events: {
    emit: vi.fn(),
  },
});

describe('BossHealthBar', () => {
  let mockScene: ReturnType<typeof createMockScene>;

  beforeEach(() => {
    mockScene = createMockScene();
    vi.clearAllMocks();
  });

  describe('Construction', () => {
    it('should create boss health bar with config', () => {
      const config: BossConfig = {
        name: 'Test Boss',
        title: 'Test Title',
        maxHealth: 1000,
        phases: [
          { number: 1, threshold: 1.0 },
          { number: 2, threshold: 0.5 },
        ],
      };

      const bar = new BossHealthBar(mockScene as any, config);
      expect(bar).toBeDefined();
      expect(bar.getCurrentPhase()).toBe(1);
      expect(bar.getHealthPercent()).toBe(1);
    });

    it('should create Cin Drallig bar with factory', () => {
      const bar = createCinDralligHealthBar(mockScene as any);
      expect(bar).toBeDefined();
      expect(bar.getCurrentPhase()).toBe(1);
    });
  });

  describe('Health Management', () => {
    it('should update health correctly', () => {
      const config: BossConfig = {
        name: 'Test Boss',
        title: 'Test Title',
        maxHealth: 1000,
        phases: [{ number: 1, threshold: 1.0 }],
      };

      const bar = new BossHealthBar(mockScene as any, config);
      bar.setHealth(500, 1000);
      expect(bar.getHealthPercent()).toBe(0.5);
    });

    it('should clamp health to zero', () => {
      const config: BossConfig = {
        name: 'Test Boss',
        title: 'Test Title',
        maxHealth: 1000,
        phases: [{ number: 1, threshold: 1.0 }],
      };

      const bar = new BossHealthBar(mockScene as any, config);
      bar.setHealth(-100, 1000);
      expect(bar.getHealthPercent()).toBe(0);
    });
  });

  describe('Phase Transitions', () => {
    it('should detect phase transition', () => {
      const config: BossConfig = {
        name: 'Test Boss',
        title: 'Test Title',
        maxHealth: 1000,
        phases: [
          { number: 1, threshold: 1.0 },
          { number: 2, threshold: 0.66 },
          { number: 3, threshold: 0.33 },
        ],
      };

      const bar = new BossHealthBar(mockScene as any, config);

      // Start at phase 1
      expect(bar.getCurrentPhase()).toBe(1);

      // Drop to 60% - should transition to phase 2
      bar.setHealth(600, 1000);
      expect(bar.getCurrentPhase()).toBe(2);

      // Drop to 25% - should transition to phase 3
      bar.setHealth(250, 1000);
      expect(bar.getCurrentPhase()).toBe(3);
    });

    it('should emit phase transition event', () => {
      const config: BossConfig = {
        name: 'Test Boss',
        title: 'Test Title',
        maxHealth: 1000,
        phases: [
          { number: 1, threshold: 1.0 },
          { number: 2, threshold: 0.5 },
        ],
      };

      const bar = new BossHealthBar(mockScene as any, config);
      bar.setHealth(400, 1000);

      expect(mockScene.events.emit).toHaveBeenCalledWith(
        'boss:phase_transition',
        expect.objectContaining({
          bossName: 'Test Boss',
          newPhase: 2,
        })
      );
    });
  });

  describe('Visibility', () => {
    it('should start hidden', () => {
      const config: BossConfig = {
        name: 'Test Boss',
        title: 'Test Title',
        maxHealth: 1000,
        phases: [{ number: 1, threshold: 1.0 }],
      };

      const bar = new BossHealthBar(mockScene as any, config);
      expect(bar.getIsVisible()).toBe(false);
    });

    it('should show when requested', () => {
      const config: BossConfig = {
        name: 'Test Boss',
        title: 'Test Title',
        maxHealth: 1000,
        phases: [{ number: 1, threshold: 1.0 }],
      };

      const bar = new BossHealthBar(mockScene as any, config);
      bar.show();
      expect(bar.getIsVisible()).toBe(true);
    });
  });
});
