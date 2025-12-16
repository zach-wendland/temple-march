import { describe, it, expect, vi, beforeEach } from 'vitest';

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
    },
  },
}));

import {
  PatrolBehavior,
  ChaseBehavior,
  StrafeBehavior,
  FleeBehavior,
} from '../../src/ai/AIBehavior';
import { BaseEnemy } from '../../src/entities/enemies/BaseEnemy';

// Mock BaseEnemy
const createMockEnemy = () => {
  const mockSprite = {
    x: 100,
    y: 100,
    body: {
      setVelocity: vi.fn(),
    },
    setFlipX: vi.fn(),
  };

  return {
    getPosition: vi.fn(() => ({ x: 100, y: 100 })),
    getHealth: vi.fn(() => 100),
    getMaxHealth: vi.fn(() => 100),
    getDistanceToTarget: vi.fn(() => 200),
    getDirectionToTarget: vi.fn(() => ({ x: 1, y: 0 })),
    isTargetInDetectionRange: vi.fn(() => true),
    isTargetInAttackRange: vi.fn(() => false),
    moveToward: vi.fn(),
    stopMovement: vi.fn(),
    faceToward: vi.fn(),
    faceTarget: vi.fn(),
    getSprite: vi.fn(() => mockSprite),
    config: { moveSpeed: 150 },
  } as unknown as BaseEnemy;
};

describe('AIBehavior', () => {
  describe('PatrolBehavior', () => {
    let patrol: PatrolBehavior;
    let mockEnemy: ReturnType<typeof createMockEnemy>;

    beforeEach(() => {
      patrol = new PatrolBehavior();
      mockEnemy = createMockEnemy();
    });

    it('should have correct name', () => {
      expect(patrol.name).toBe('patrol');
    });

    it('should not activate without waypoints', () => {
      const result = patrol.shouldActivate(mockEnemy, null);
      expect(result).toBe(false);
    });

    it('should activate with waypoints and no target', () => {
      patrol.setWaypoints([{ x: 200, y: 100 }, { x: 300, y: 100 }]);
      const result = patrol.shouldActivate(mockEnemy, null);
      expect(result).toBe(true);
    });

    it('should move toward current waypoint', () => {
      patrol.setWaypoints([{ x: 200, y: 100 }]);
      patrol.execute(mockEnemy, null, 16);
      expect(mockEnemy.moveToward).toHaveBeenCalledWith(200, 100, expect.any(Number));
    });

    it('should stop at waypoint', () => {
      patrol.setWaypoints([{ x: 105, y: 100 }]); // Close enough
      patrol.execute(mockEnemy, null, 16);
      expect(mockEnemy.stopMovement).toHaveBeenCalled();
    });
  });

  describe('ChaseBehavior', () => {
    let chase: ChaseBehavior;
    let mockEnemy: ReturnType<typeof createMockEnemy>;
    let mockTarget: { x: number; y: number };

    beforeEach(() => {
      chase = new ChaseBehavior();
      mockEnemy = createMockEnemy();
      mockTarget = { x: 300, y: 100 };
    });

    it('should have correct name', () => {
      expect(chase.name).toBe('chase');
    });

    it('should not activate without target', () => {
      const result = chase.shouldActivate(mockEnemy, null);
      expect(result).toBe(false);
    });

    it('should activate when target in detection range but not attack range', () => {
      mockEnemy.isTargetInDetectionRange = vi.fn(() => true);
      mockEnemy.isTargetInAttackRange = vi.fn(() => false);
      const result = chase.shouldActivate(mockEnemy, mockTarget as any);
      expect(result).toBe(true);
    });

    it('should not activate when target in attack range', () => {
      mockEnemy.isTargetInDetectionRange = vi.fn(() => true);
      mockEnemy.isTargetInAttackRange = vi.fn(() => true);
      const result = chase.shouldActivate(mockEnemy, mockTarget as any);
      expect(result).toBe(false);
    });

    it('should move toward target with anticipation', () => {
      chase.execute(mockEnemy, mockTarget as any, 16);
      expect(mockEnemy.moveToward).toHaveBeenCalled();
      expect(mockEnemy.faceToward).toHaveBeenCalledWith(mockTarget.x, mockTarget.y);
    });

    it('should support anticipation setting', () => {
      chase.setAnticipation(0.5);
      chase.execute(mockEnemy, mockTarget as any, 16);
      // Anticipation affects predicted position
      expect(mockEnemy.moveToward).toHaveBeenCalled();
    });
  });

  describe('StrafeBehavior', () => {
    let strafe: StrafeBehavior;
    let mockEnemy: ReturnType<typeof createMockEnemy>;
    let mockTarget: { x: number; y: number };

    beforeEach(() => {
      strafe = new StrafeBehavior();
      mockEnemy = createMockEnemy();
      mockTarget = { x: 200, y: 100 };
    });

    it('should have correct name', () => {
      expect(strafe.name).toBe('strafe');
    });

    it('should activate at optimal range', () => {
      strafe.setPreferredDistance(100);
      mockEnemy.getDistanceToTarget = vi.fn(() => 100);
      const result = strafe.shouldActivate(mockEnemy, mockTarget as any);
      expect(result).toBe(true);
    });

    it('should not activate when too close', () => {
      strafe.setPreferredDistance(100);
      mockEnemy.getDistanceToTarget = vi.fn(() => 50);
      const result = strafe.shouldActivate(mockEnemy, mockTarget as any);
      expect(result).toBe(false);
    });

    it('should not activate when too far', () => {
      strafe.setPreferredDistance(100);
      mockEnemy.getDistanceToTarget = vi.fn(() => 200);
      const result = strafe.shouldActivate(mockEnemy, mockTarget as any);
      expect(result).toBe(false);
    });

    it('should face target while strafing', () => {
      strafe.execute(mockEnemy, mockTarget as any, 16);
      expect(mockEnemy.faceTarget).toHaveBeenCalled();
    });
  });

  describe('FleeBehavior', () => {
    let flee: FleeBehavior;
    let mockEnemy: ReturnType<typeof createMockEnemy>;
    let mockTarget: { x: number; y: number };

    beforeEach(() => {
      flee = new FleeBehavior();
      mockEnemy = createMockEnemy();
      mockTarget = { x: 200, y: 100 };
    });

    it('should have correct name', () => {
      expect(flee.name).toBe('flee');
    });

    it('should activate when low health and target close', () => {
      flee.setHealthThreshold(0.3);
      flee.setFleeDistance(200);
      mockEnemy.getHealth = vi.fn(() => 20);
      mockEnemy.getMaxHealth = vi.fn(() => 100);
      mockEnemy.getDistanceToTarget = vi.fn(() => 150);

      const result = flee.shouldActivate(mockEnemy, mockTarget as any);
      expect(result).toBe(true);
    });

    it('should not activate when healthy', () => {
      flee.setHealthThreshold(0.3);
      mockEnemy.getHealth = vi.fn(() => 80);
      mockEnemy.getMaxHealth = vi.fn(() => 100);

      const result = flee.shouldActivate(mockEnemy, mockTarget as any);
      expect(result).toBe(false);
    });

    it('should not activate when target too far', () => {
      flee.setHealthThreshold(0.3);
      flee.setFleeDistance(200);
      mockEnemy.getHealth = vi.fn(() => 20);
      mockEnemy.getMaxHealth = vi.fn(() => 100);
      mockEnemy.getDistanceToTarget = vi.fn(() => 300);

      const result = flee.shouldActivate(mockEnemy, mockTarget as any);
      expect(result).toBe(false);
    });
  });
});
