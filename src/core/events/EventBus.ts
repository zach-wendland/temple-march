/**
 * Event Bus - Pub/Sub system for decoupled game event communication.
 * Supports priorities, wildcards, cancellation, and queued events.
 */

import { EntityId } from '../types';

/**
 * Base interface for all game events.
 */
export interface GameEvent {
  /** Event type identifier (e.g., 'combat:damage', 'player:death') */
  type: string;
  /** Event-specific data payload */
  data: unknown;
  /** Timestamp when event was created */
  timestamp?: number;
  /** Whether the event has been cancelled */
  cancelled?: boolean;
}

/**
 * Priority levels for event handlers.
 */
export enum EventPriority {
  Low = 0,
  Normal = 50,
  High = 100,
  Critical = 200,
}

/**
 * Event handler function type.
 */
export type EventHandler<T extends GameEvent = GameEvent> = (event: T) => void;

/**
 * Unsubscribe function returned by subscriptions.
 */
export type Unsubscribe = () => void;

/**
 * Internal subscription record.
 */
interface Subscription {
  handler: EventHandler;
  priority: EventPriority;
  once: boolean;
}

/**
 * EventBus - Central hub for event-driven communication.
 *
 * Features:
 * - Type-safe event subscriptions
 * - Priority-based handler ordering
 * - Wildcard subscriptions (e.g., 'combat:*')
 * - Event cancellation
 * - Queued/deferred event processing
 */
export class EventBus {
  private listeners: Map<string, Subscription[]> = new Map();
  private eventQueue: GameEvent[] = [];
  private wildcardListeners: Map<string, Subscription[]> = new Map();

  /**
   * Subscribes to an event type.
   * @param type - Event type to listen for (supports wildcards: 'combat:*', '*')
   * @param handler - Function to call when event is emitted
   * @param priority - Handler priority (higher = called first)
   * @returns Unsubscribe function
   */
  on<T extends GameEvent>(
    type: string,
    handler: EventHandler<T>,
    priority: EventPriority = EventPriority.Normal
  ): Unsubscribe {
    const subscription: Subscription = {
      handler: handler as EventHandler,
      priority,
      once: false,
    };

    this.addSubscription(type, subscription);

    return () => this.removeSubscription(type, handler as EventHandler);
  }

  /**
   * Subscribes to an event type for a single emission.
   * @param type - Event type to listen for
   * @param handler - Function to call when event is emitted
   * @param priority - Handler priority
   * @returns Unsubscribe function
   */
  once<T extends GameEvent>(
    type: string,
    handler: EventHandler<T>,
    priority: EventPriority = EventPriority.Normal
  ): Unsubscribe {
    const subscription: Subscription = {
      handler: handler as EventHandler,
      priority,
      once: true,
    };

    this.addSubscription(type, subscription);

    return () => this.removeSubscription(type, handler as EventHandler);
  }

  /**
   * Removes all handlers for a specific event type.
   * @param type - Event type to clear
   */
  off(type: string): void {
    if (type.includes('*')) {
      this.wildcardListeners.delete(type);
    } else {
      this.listeners.delete(type);
    }
  }

  /**
   * Emits an event immediately to all subscribers.
   * @param event - The event to emit
   */
  emit<T extends GameEvent>(event: T): void {
    event.timestamp = event.timestamp ?? Date.now();
    event.cancelled = false;

    // Get direct listeners
    const directListeners = this.listeners.get(event.type) ?? [];

    // Get wildcard listeners
    const matchingWildcards = this.getMatchingWildcardListeners(event.type);

    // Combine and sort by priority (descending)
    const allListeners = [...directListeners, ...matchingWildcards].sort(
      (a, b) => b.priority - a.priority
    );

    // Track handlers to remove (once handlers)
    const toRemove: Array<{ type: string; handler: EventHandler }> = [];

    for (const subscription of allListeners) {
      if (event.cancelled) {
        break;
      }

      subscription.handler(event);

      if (subscription.once) {
        toRemove.push({
          type: event.type,
          handler: subscription.handler,
        });
      }
    }

    // Remove once handlers
    for (const { type, handler } of toRemove) {
      this.removeSubscription(type, handler);
      // Also check wildcards
      for (const [pattern] of this.wildcardListeners) {
        this.removeWildcardSubscription(pattern, handler);
      }
    }
  }

  /**
   * Queues an event for deferred processing.
   * Call flush() to process queued events.
   * @param event - The event to queue
   */
  queue<T extends GameEvent>(event: T): void {
    event.timestamp = event.timestamp ?? Date.now();
    this.eventQueue.push(event);
  }

  /**
   * Processes all queued events.
   */
  flush(): void {
    const events = [...this.eventQueue];
    this.eventQueue = [];

    for (const event of events) {
      this.emit(event);
    }
  }

  /**
   * Checks if there are any listeners for a type.
   * @param type - Event type to check
   */
  hasListeners(type: string): boolean {
    const direct = this.listeners.get(type);
    return direct !== undefined && direct.length > 0;
  }

  /**
   * Gets the number of listeners for a type.
   * @param type - Event type to check
   */
  getListenerCount(type: string): number {
    return this.listeners.get(type)?.length ?? 0;
  }

  /**
   * Clears all listeners and queued events.
   */
  clear(): void {
    this.listeners.clear();
    this.wildcardListeners.clear();
    this.eventQueue = [];
  }

  /**
   * Adds a subscription to the appropriate map.
   */
  private addSubscription(type: string, subscription: Subscription): void {
    if (type.includes('*')) {
      const existing = this.wildcardListeners.get(type) ?? [];
      existing.push(subscription);
      this.wildcardListeners.set(type, existing);
    } else {
      const existing = this.listeners.get(type) ?? [];
      existing.push(subscription);
      this.listeners.set(type, existing);
    }
  }

  /**
   * Removes a specific handler from subscriptions.
   */
  private removeSubscription(type: string, handler: EventHandler): void {
    if (type.includes('*')) {
      this.removeWildcardSubscription(type, handler);
    } else {
      const listeners = this.listeners.get(type);
      if (listeners) {
        const index = listeners.findIndex((s) => s.handler === handler);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
        if (listeners.length === 0) {
          this.listeners.delete(type);
        }
      }
    }
  }

  /**
   * Removes a handler from wildcard subscriptions.
   */
  private removeWildcardSubscription(
    pattern: string,
    handler: EventHandler
  ): void {
    const listeners = this.wildcardListeners.get(pattern);
    if (listeners) {
      const index = listeners.findIndex((s) => s.handler === handler);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
      if (listeners.length === 0) {
        this.wildcardListeners.delete(pattern);
      }
    }
  }

  /**
   * Gets all wildcard listeners that match an event type.
   */
  private getMatchingWildcardListeners(eventType: string): Subscription[] {
    const matches: Subscription[] = [];

    for (const [pattern, listeners] of this.wildcardListeners) {
      if (this.matchesWildcard(eventType, pattern)) {
        matches.push(...listeners);
      }
    }

    return matches;
  }

  /**
   * Checks if an event type matches a wildcard pattern.
   */
  private matchesWildcard(eventType: string, pattern: string): boolean {
    if (pattern === '*') {
      return true;
    }

    if (pattern.endsWith(':*')) {
      const prefix = pattern.slice(0, -2);
      return eventType.startsWith(prefix + ':');
    }

    return false;
  }
}

// =============================================================================
// Pre-defined Game Event Types
// =============================================================================

/**
 * Combat-related events.
 */
export interface DamageEvent extends GameEvent {
  type: 'combat:damage';
  data: {
    sourceId: EntityId;
    targetId: EntityId;
    damage: number;
    damageType: string;
    blocked: boolean;
    critical: boolean;
  };
}

export interface DeathEvent extends GameEvent {
  type: 'combat:death';
  data: {
    entityId: EntityId;
    killerId?: EntityId;
  };
}

export interface HitEvent extends GameEvent {
  type: 'combat:hit';
  data: {
    attackerId: EntityId;
    defenderId: EntityId;
    hitboxId: string;
  };
}

export interface BlockEvent extends GameEvent {
  type: 'combat:block';
  data: {
    defenderId: EntityId;
    attackerId: EntityId;
    deflected: boolean;
  };
}

/**
 * Force power events.
 */
export interface ForcePowerUsedEvent extends GameEvent {
  type: 'force:power_used';
  data: {
    userId: EntityId;
    powerType: string;
    targets: EntityId[];
    forceCost: number;
  };
}

export interface ForceRechargedEvent extends GameEvent {
  type: 'force:recharged';
  data: {
    entityId: EntityId;
    amount: number;
    currentForce: number;
  };
}

/**
 * State change events.
 */
export interface StateChangeEvent extends GameEvent {
  type: 'state:change';
  data: {
    entityId: EntityId;
    previousState: string;
    newState: string;
  };
}

/**
 * Progression events.
 */
export interface CheckpointReachedEvent extends GameEvent {
  type: 'progression:checkpoint';
  data: {
    checkpointId: string;
    position: { x: number; y: number };
  };
}

export interface WaveCompleteEvent extends GameEvent {
  type: 'progression:wave_complete';
  data: {
    waveNumber: number;
    enemiesKilled: number;
  };
}

export interface ObjectiveCompleteEvent extends GameEvent {
  type: 'progression:objective_complete';
  data: {
    objectiveId: string;
    objectiveType: string;
  };
}

/**
 * UI trigger events.
 */
export interface UITriggerEvent extends GameEvent {
  type: 'ui:trigger';
  data: {
    triggerId: string;
    action: string;
    payload?: unknown;
  };
}

/**
 * Combat feedback event for UI updates.
 */
export interface CombatFeedbackEvent extends GameEvent {
  type: 'combat:feedback';
  data: {
    hitPosition: { x: number; y: number };
    damage: number;
    damageType: 'normal' | 'critical' | 'force' | 'blocked';
    hitType: 'light' | 'heavy' | 'critical' | 'force' | 'kill';
    attackerId: EntityId;
    defenderId: EntityId;
    comboCount: number;
  };
}

