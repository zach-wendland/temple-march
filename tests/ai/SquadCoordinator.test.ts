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

import { Squad, SquadCoordinator, FormationType, SquadState } from '../../src/ai/SquadCoordinator';
import { EventBus } from '../../src/core/events/EventBus';
import { BaseEnemy } from '../../src/entities/enemies/BaseEnemy';
import { EnemyType } from '../../src/entities/enemies/EnemyTypes';

// Mock EventBus
const createMockEventBus = () => ({
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
});

// Mock Enemy
const createMockEnemy = (id: number) => ({
  id,
  isAlive: vi.fn(() => true),
  getPosition: vi.fn(() => ({ x: 100 + id * 50, y: 100 })),
  setTarget: vi.fn(),
  getType: vi.fn(() => EnemyType.CloneTrooper),
  setFormationRole: vi.fn(),
  setAssignedPosition: vi.fn(),
} as unknown as BaseEnemy);

describe('SquadCoordinator', () => {
  describe('Squad', () => {
    let squad: Squad;
    let eventBus: ReturnType<typeof createMockEventBus>;

    beforeEach(() => {
      eventBus = createMockEventBus();
      squad = new Squad('test_squad', eventBus as any);
    });

    it('should have correct ID', () => {
      expect(squad.id).toBe('test_squad');
    });

    it('should add members', () => {
      const enemy1 = createMockEnemy(1);
      const enemy2 = createMockEnemy(2);

      squad.addMember(enemy1);
      squad.addMember(enemy2);

      expect(squad.getMembers()).toHaveLength(2);
    });

    it('should not add duplicate members', () => {
      const enemy1 = createMockEnemy(1);

      squad.addMember(enemy1);
      squad.addMember(enemy1);

      expect(squad.getMembers()).toHaveLength(1);
    });

    it('should remove members', () => {
      const enemy1 = createMockEnemy(1);
      const enemy2 = createMockEnemy(2);

      squad.addMember(enemy1);
      squad.addMember(enemy2);
      squad.removeMember(enemy1);

      expect(squad.getMembers()).toHaveLength(1);
      expect(squad.getMembers()[0]).toBe(enemy2);
    });

    it('should filter living members', () => {
      const enemy1 = createMockEnemy(1);
      const enemy2 = createMockEnemy(2);
      enemy2.isAlive = vi.fn(() => false);

      squad.addMember(enemy1);
      squad.addMember(enemy2);

      expect(squad.getLivingMembers()).toHaveLength(1);
      expect(squad.getLivingMembers()[0]).toBe(enemy1);
    });

    it('should set target for all members', () => {
      const enemy1 = createMockEnemy(1);
      const enemy2 = createMockEnemy(2);
      const mockTarget = { x: 500, y: 500 } as any;

      squad.addMember(enemy1);
      squad.addMember(enemy2);
      squad.setTarget(mockTarget);

      expect(enemy1.setTarget).toHaveBeenCalledWith(mockTarget);
      expect(enemy2.setTarget).toHaveBeenCalledWith(mockTarget);
    });

    it('should change state when target is set', () => {
      const enemy1 = createMockEnemy(1);
      squad.addMember(enemy1);

      squad.setTarget({ x: 500, y: 500 } as any);
      expect(squad.getState()).toBe(SquadState.Engage);

      squad.setTarget(null);
      expect(squad.getState()).toBe(SquadState.Patrol);
    });

    it('should emit state change events', () => {
      const enemy1 = createMockEnemy(1);
      squad.addMember(enemy1);
      squad.setTarget({ x: 500, y: 500 } as any);

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'squad:state_change',
        })
      );
    });

    it('should change formation', () => {
      vi.useFakeTimers();

      squad.setFormation(FormationType.Line);
      expect(squad.getFormation()).toBe(FormationType.Line);

      // Wait for cooldown
      vi.advanceTimersByTime(4000);

      squad.setFormation(FormationType.Wedge);
      expect(squad.getFormation()).toBe(FormationType.Wedge);

      vi.useRealTimers();
    });

    it('should emit formation change events', () => {
      // Need to wait for cooldown to pass
      vi.useFakeTimers();
      squad.setFormation(FormationType.Line);
      vi.advanceTimersByTime(4000);
      squad.setFormation(FormationType.Pincer);
      vi.useRealTimers();

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'squad:formation_change',
        })
      );
    });

    it('should check operational status', () => {
      // Default minMembers is 3
      const enemy1 = createMockEnemy(1);
      const enemy2 = createMockEnemy(2);
      const enemy3 = createMockEnemy(3);

      squad.addMember(enemy1);
      squad.addMember(enemy2);
      expect(squad.isOperational()).toBe(false);

      squad.addMember(enemy3);
      expect(squad.isOperational()).toBe(true);
    });

    it('should update and cleanup dead members', () => {
      const enemy1 = createMockEnemy(1);
      const enemy2 = createMockEnemy(2);
      enemy2.isAlive = vi.fn(() => false);

      squad.addMember(enemy1);
      squad.addMember(enemy2);

      expect(squad.getMembers()).toHaveLength(2);

      squad.update(16);

      expect(squad.getMembers()).toHaveLength(1);
    });
  });

  describe('SquadCoordinator', () => {
    let coordinator: SquadCoordinator;
    let eventBus: ReturnType<typeof createMockEventBus>;

    beforeEach(() => {
      eventBus = createMockEventBus();
      coordinator = new SquadCoordinator(eventBus as any);
    });

    it('should create squads', () => {
      const squad = coordinator.createSquad();
      expect(squad).toBeDefined();
      expect(squad.id).toContain('squad_');
    });

    it('should get squad by ID', () => {
      const squad = coordinator.createSquad();
      const retrieved = coordinator.getSquad(squad.id);
      expect(retrieved).toBe(squad);
    });

    it('should remove squads', () => {
      const squad = coordinator.createSquad();
      coordinator.removeSquad(squad.id);
      expect(coordinator.getSquad(squad.id)).toBeUndefined();
    });

    it('should form squad from enemies', () => {
      const enemy1 = createMockEnemy(1);
      const enemy2 = createMockEnemy(2);
      const enemy3 = createMockEnemy(3);

      const squad = coordinator.formSquad([enemy1, enemy2, enemy3]);

      expect(squad.getMembers()).toHaveLength(3);
      expect(squad.isOperational()).toBe(true);
    });

    it('should get active squads', () => {
      coordinator.createSquad();
      coordinator.createSquad();

      const squads = coordinator.getActiveSquads();
      expect(squads).toHaveLength(2);
    });

    it('should set target for all squads', () => {
      const enemy1 = createMockEnemy(1);
      const enemy2 = createMockEnemy(2);
      const mockTarget = { x: 500, y: 500 } as any;

      const squad1 = coordinator.createSquad();
      const squad2 = coordinator.createSquad();

      squad1.addMember(enemy1);
      squad2.addMember(enemy2);

      coordinator.setTargetForAll(mockTarget);

      expect(enemy1.setTarget).toHaveBeenCalledWith(mockTarget);
      expect(enemy2.setTarget).toHaveBeenCalledWith(mockTarget);
    });

    it('should update all squads', () => {
      const enemy1 = createMockEnemy(1);
      const squad = coordinator.createSquad();
      squad.addMember(enemy1);

      // Mock spy on squad update
      const updateSpy = vi.spyOn(squad, 'update');

      coordinator.update(16);

      expect(updateSpy).toHaveBeenCalledWith(16);
    });
  });

  describe('FormationType', () => {
    it('should define all formation types', () => {
      expect(FormationType.Line).toBe('line');
      expect(FormationType.Wedge).toBe('wedge');
      expect(FormationType.Pincer).toBe('pincer');
      expect(FormationType.Surround).toBe('surround');
      expect(FormationType.Defensive).toBe('defensive');
      expect(FormationType.Retreat).toBe('retreat');
    });
  });

  describe('SquadState', () => {
    it('should define all squad states', () => {
      expect(SquadState.Patrol).toBe('patrol');
      expect(SquadState.Engage).toBe('engage');
      expect(SquadState.Formation).toBe('formation');
      expect(SquadState.Retreat).toBe('retreat');
      expect(SquadState.Regroup).toBe('regroup');
    });
  });
});
