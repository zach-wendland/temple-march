import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus, GameEvent, EventPriority } from '../../../src/core/events/EventBus';

interface TestEvent extends GameEvent {
  type: 'test';
  data: { value: number };
}

interface CombatEvent extends GameEvent {
  type: 'combat:damage';
  data: {
    sourceId: number;
    targetId: number;
    damage: number;
  };
}

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('Basic pub/sub', () => {
    it('should subscribe to an event type', () => {
      const handler = vi.fn();
      eventBus.on<TestEvent>('test', handler);
      expect(eventBus.hasListeners('test')).toBe(true);
    });

    it('should emit events to subscribers', () => {
      const handler = vi.fn();
      eventBus.on<TestEvent>('test', handler);

      const event: TestEvent = { type: 'test', data: { value: 42 } };
      eventBus.emit(event);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should support multiple subscribers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      eventBus.on<TestEvent>('test', handler1);
      eventBus.on<TestEvent>('test', handler2);

      const event: TestEvent = { type: 'test', data: { value: 10 } };
      eventBus.emit(event);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe from events', () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.on<TestEvent>('test', handler);

      unsubscribe();
      eventBus.emit({ type: 'test', data: { value: 1 } });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should support one-time subscriptions', () => {
      const handler = vi.fn();
      eventBus.once<TestEvent>('test', handler);

      eventBus.emit({ type: 'test', data: { value: 1 } });
      eventBus.emit({ type: 'test', data: { value: 2 } });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event priority', () => {
    it('should call handlers in priority order', () => {
      const callOrder: string[] = [];

      eventBus.on<TestEvent>('test', () => callOrder.push('low'), EventPriority.Low);
      eventBus.on<TestEvent>('test', () => callOrder.push('high'), EventPriority.High);
      eventBus.on<TestEvent>('test', () => callOrder.push('normal'), EventPriority.Normal);

      eventBus.emit({ type: 'test', data: { value: 1 } });

      expect(callOrder).toEqual(['high', 'normal', 'low']);
    });
  });

  describe('Event cancellation', () => {
    it('should allow events to be cancelled', () => {
      const handler1 = vi.fn((event: TestEvent) => {
        event.cancelled = true;
      });
      const handler2 = vi.fn();

      eventBus.on<TestEvent>('test', handler1, EventPriority.High);
      eventBus.on<TestEvent>('test', handler2, EventPriority.Normal);

      const event: TestEvent = { type: 'test', data: { value: 1 } };
      eventBus.emit(event);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should continue propagation when not cancelled', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on<TestEvent>('test', handler1);
      eventBus.on<TestEvent>('test', handler2);

      eventBus.emit({ type: 'test', data: { value: 1 } });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('Wildcard subscriptions', () => {
    it('should support wildcard prefix subscriptions', () => {
      const handler = vi.fn();
      eventBus.on('combat:*', handler);

      eventBus.emit<CombatEvent>({
        type: 'combat:damage',
        data: { sourceId: 1, targetId: 2, damage: 10 },
      });

      expect(handler).toHaveBeenCalled();
    });

    it('should support global wildcard', () => {
      const handler = vi.fn();
      eventBus.on('*', handler);

      eventBus.emit({ type: 'test', data: { value: 1 } });
      eventBus.emit<CombatEvent>({
        type: 'combat:damage',
        data: { sourceId: 1, targetId: 2, damage: 10 },
      });

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe('Event queue', () => {
    it('should queue events for deferred processing', () => {
      const handler = vi.fn();
      eventBus.on<TestEvent>('test', handler);

      eventBus.queue({ type: 'test', data: { value: 1 } });
      expect(handler).not.toHaveBeenCalled();

      eventBus.flush();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should process multiple queued events', () => {
      const handler = vi.fn();
      eventBus.on<TestEvent>('test', handler);

      eventBus.queue({ type: 'test', data: { value: 1 } });
      eventBus.queue({ type: 'test', data: { value: 2 } });
      eventBus.queue({ type: 'test', data: { value: 3 } });

      eventBus.flush();
      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('should clear the queue after flush', () => {
      const handler = vi.fn();
      eventBus.on<TestEvent>('test', handler);

      eventBus.queue({ type: 'test', data: { value: 1 } });
      eventBus.flush();
      eventBus.flush(); // Second flush should do nothing

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cleanup', () => {
    it('should remove all listeners for a type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      eventBus.on<TestEvent>('test', handler1);
      eventBus.on<TestEvent>('test', handler2);

      eventBus.off('test');
      eventBus.emit({ type: 'test', data: { value: 1 } });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should clear all listeners', () => {
      eventBus.on<TestEvent>('test', vi.fn());
      eventBus.on('combat:damage', vi.fn());

      eventBus.clear();

      expect(eventBus.hasListeners('test')).toBe(false);
      expect(eventBus.hasListeners('combat:damage')).toBe(false);
    });

    it('should get listener count for a type', () => {
      eventBus.on<TestEvent>('test', vi.fn());
      eventBus.on<TestEvent>('test', vi.fn());
      eventBus.on<TestEvent>('test', vi.fn());

      expect(eventBus.getListenerCount('test')).toBe(3);
    });
  });
});
