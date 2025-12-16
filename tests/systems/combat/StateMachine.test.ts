import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  StateMachine,
  State,
  Transition,
} from '../../../src/systems/combat/StateMachine';

// Test states
class IdleState implements State {
  readonly name = 'idle';
  onEnter = vi.fn();
  onExit = vi.fn();
  onUpdate = vi.fn();
}

class AttackingState implements State {
  readonly name = 'attacking';
  onEnter = vi.fn();
  onExit = vi.fn();
  onUpdate = vi.fn();
}

class BlockingState implements State {
  readonly name = 'blocking';
  onEnter = vi.fn();
  onExit = vi.fn();
  onUpdate = vi.fn();
}

describe('StateMachine', () => {
  let stateMachine: StateMachine;
  let idleState: IdleState;
  let attackingState: AttackingState;
  let blockingState: BlockingState;

  beforeEach(() => {
    stateMachine = new StateMachine();
    idleState = new IdleState();
    attackingState = new AttackingState();
    blockingState = new BlockingState();

    stateMachine.addState(idleState);
    stateMachine.addState(attackingState);
    stateMachine.addState(blockingState);
  });

  describe('State registration', () => {
    it('should register states', () => {
      expect(stateMachine.hasState('idle')).toBe(true);
      expect(stateMachine.hasState('attacking')).toBe(true);
      expect(stateMachine.hasState('blocking')).toBe(true);
    });

    it('should throw when adding duplicate state', () => {
      expect(() => stateMachine.addState(new IdleState())).toThrow();
    });

    it('should get state by name', () => {
      expect(stateMachine.getState('idle')).toBe(idleState);
    });
  });

  describe('Transitions', () => {
    beforeEach(() => {
      stateMachine.addTransition({
        from: 'idle',
        to: 'attacking',
        condition: () => true,
      });
      stateMachine.addTransition({
        from: 'attacking',
        to: 'idle',
        condition: () => true,
      });
      stateMachine.addTransition({
        from: 'idle',
        to: 'blocking',
        condition: () => true,
      });
    });

    it('should set initial state', () => {
      stateMachine.start('idle');
      expect(stateMachine.currentState?.name).toBe('idle');
    });

    it('should call onEnter when starting', () => {
      stateMachine.start('idle');
      expect(idleState.onEnter).toHaveBeenCalled();
    });

    it('should transition between states', () => {
      stateMachine.start('idle');
      stateMachine.transitionTo('attacking');
      expect(stateMachine.currentState?.name).toBe('attacking');
    });

    it('should call onExit and onEnter during transition', () => {
      stateMachine.start('idle');
      stateMachine.transitionTo('attacking');

      expect(idleState.onExit).toHaveBeenCalled();
      expect(attackingState.onEnter).toHaveBeenCalled();
    });

    it('should pass context to state callbacks', () => {
      const context = { entityId: 123 };
      stateMachine.start('idle', context);

      expect(idleState.onEnter).toHaveBeenCalledWith(context);
    });

    it('should reject invalid transitions', () => {
      stateMachine.start('blocking');
      const result = stateMachine.transitionTo('attacking');
      expect(result).toBe(false);
      expect(stateMachine.currentState?.name).toBe('blocking');
    });

    it('should track previous state', () => {
      stateMachine.start('idle');
      stateMachine.transitionTo('attacking');
      expect(stateMachine.previousState?.name).toBe('idle');
    });
  });

  describe('Conditional transitions', () => {
    it('should evaluate transition conditions', () => {
      let canAttack = false;
      stateMachine.addTransition({
        from: 'idle',
        to: 'attacking',
        condition: () => canAttack,
      });

      stateMachine.start('idle');
      expect(stateMachine.canTransitionTo('attacking')).toBe(false);

      canAttack = true;
      expect(stateMachine.canTransitionTo('attacking')).toBe(true);
    });

    it('should support automatic transitions via update', () => {
      let shouldTransition = false;
      stateMachine.addTransition({
        from: 'idle',
        to: 'attacking',
        condition: () => shouldTransition,
        automatic: true,
      });

      stateMachine.start('idle');
      stateMachine.update(16);
      expect(stateMachine.currentState?.name).toBe('idle');

      shouldTransition = true;
      stateMachine.update(16);
      expect(stateMachine.currentState?.name).toBe('attacking');
    });
  });

  describe('Update cycle', () => {
    it('should call onUpdate for current state', () => {
      stateMachine.start('idle');
      stateMachine.update(16);
      expect(idleState.onUpdate).toHaveBeenCalledWith(16, undefined);
    });

    it('should track time in state', () => {
      stateMachine.start('idle');
      stateMachine.update(100);
      stateMachine.update(200);
      expect(stateMachine.timeInCurrentState).toBe(300);
    });

    it('should reset time on transition', () => {
      stateMachine.addTransition({ from: 'idle', to: 'attacking', condition: () => true });
      stateMachine.start('idle');
      stateMachine.update(100);
      stateMachine.transitionTo('attacking');
      expect(stateMachine.timeInCurrentState).toBe(0);
    });
  });

  describe('State history', () => {
    beforeEach(() => {
      stateMachine.addTransition({ from: 'idle', to: 'attacking', condition: () => true });
      stateMachine.addTransition({ from: 'attacking', to: 'idle', condition: () => true });
      stateMachine.addTransition({ from: 'idle', to: 'blocking', condition: () => true });
    });

    it('should track state history', () => {
      stateMachine.start('idle');
      stateMachine.transitionTo('attacking');
      stateMachine.transitionTo('idle');
      stateMachine.transitionTo('blocking');

      const history = stateMachine.getHistory();
      expect(history.map((s) => s.name)).toEqual(['idle', 'attacking', 'idle', 'blocking']);
    });

    it('should limit history size', () => {
      const sm = new StateMachine(3);
      sm.addState(idleState);
      sm.addState(attackingState);
      sm.addTransition({ from: 'idle', to: 'attacking', condition: () => true });
      sm.addTransition({ from: 'attacking', to: 'idle', condition: () => true });

      sm.start('idle');
      for (let i = 0; i < 10; i++) {
        sm.transitionTo('attacking');
        sm.transitionTo('idle');
      }

      expect(sm.getHistory().length).toBeLessThanOrEqual(3);
    });
  });
});
