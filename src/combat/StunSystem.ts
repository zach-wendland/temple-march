/**
 * Hitstun/Blockstun System
 * Manages stun frames for combat feedback and timing.
 */

import { EventBus } from '../core/events/EventBus';
import { EntityId } from '../core/types';
import { AttackData, AttackType } from './AttackData';
import { Faction } from './DamageCalculator';

/**
 * Stun type enumeration.
 */
export enum StunType {
  /** Hitstun from taking damage */
  Hitstun = 'hitstun',
  /** Blockstun from blocking an attack */
  Blockstun = 'blockstun',
  /** Guard break stun */
  GuardBreak = 'guard_break',
  /** Stagger from posture break */
  Stagger = 'stagger',
  /** Freeze from Force powers */
  ForceFreeze = 'force_freeze',
}

/**
 * Stun configuration.
 */
export interface StunConfig {
  /** Base duration in ms */
  baseDuration: number;
  /** Can be cancelled by action? */
  cancellable: boolean;
  /** Cancel threshold (0-1 of duration) */
  cancelThreshold: number;
  /** Is entity invulnerable during stun? */
  invulnerable: boolean;
  /** Reduces over multiple hits (combo scaling) */
  comboScaling: boolean;
  /** Minimum duration after scaling */
  minimumDuration: number;
}

/**
 * Default stun configurations.
 */
const STUN_CONFIGS: Record<StunType, StunConfig> = {
  [StunType.Hitstun]: {
    baseDuration: 200,
    cancellable: false,
    cancelThreshold: 0.8,
    invulnerable: false,
    comboScaling: true,
    minimumDuration: 50,
  },
  [StunType.Blockstun]: {
    baseDuration: 150,
    cancellable: true,
    cancelThreshold: 0.5,
    invulnerable: false,
    comboScaling: false,
    minimumDuration: 100,
  },
  [StunType.GuardBreak]: {
    baseDuration: 600,
    cancellable: false,
    cancelThreshold: 1.0,
    invulnerable: false,
    comboScaling: false,
    minimumDuration: 400,
  },
  [StunType.Stagger]: {
    baseDuration: 1500,
    cancellable: false,
    cancelThreshold: 1.0,
    invulnerable: false,
    comboScaling: false,
    minimumDuration: 1000,
  },
  [StunType.ForceFreeze]: {
    baseDuration: 500,
    cancellable: false,
    cancelThreshold: 1.0,
    invulnerable: true,
    comboScaling: false,
    minimumDuration: 300,
  },
};

/**
 * Active stun state for an entity.
 */
interface StunState {
  /** Is stunned? */
  isStunned: boolean;
  /** Current stun type */
  type: StunType;
  /** Stun start time */
  startTime: number;
  /** Stun end time */
  endTime: number;
  /** Current duration */
  duration: number;
  /** Is invulnerable? */
  invulnerable: boolean;
  /** Source entity */
  sourceId: EntityId | null;
  /** Current combo count (for scaling) */
  comboCount: number;
}

/**
 * Hitstun frame data based on attack type.
 */
const HITSTUN_FRAME_DATA: Record<AttackType, number> = {
  [AttackType.LightAttack]: 150,
  [AttackType.HeavyAttack]: 300,
  [AttackType.Special]: 250,
  [AttackType.ForcePower]: 400,
};

/**
 * Blockstun frame data based on attack type.
 */
const BLOCKSTUN_FRAME_DATA: Record<AttackType, number> = {
  [AttackType.LightAttack]: 100,
  [AttackType.HeavyAttack]: 250,
  [AttackType.Special]: 180,
  [AttackType.ForcePower]: 300,
};

/**
 * Stun System - manages hitstun and blockstun.
 */
export class StunSystem {
  private eventBus: EventBus;
  private stunStates: Map<EntityId, StunState> = new Map();

  // Faction stun resistance multipliers (lower = less stun)
  private factionResistance: Map<Faction, number> = new Map([
    [Faction.Sith, 0.4], // Vader barely flinches
    [Faction.Imperial, 1.2],
    [Faction.Jedi, 0.9],
    [Faction.TempleGuard, 0.7],
    [Faction.Boss, 0.5],
  ]);

  // Combo scaling reduction per hit
  private comboScalingRate: number = 0.15;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Register an entity for stun tracking.
   */
  registerEntity(entityId: EntityId): void {
    this.stunStates.set(entityId, {
      isStunned: false,
      type: StunType.Hitstun,
      startTime: 0,
      endTime: 0,
      duration: 0,
      invulnerable: false,
      sourceId: null,
      comboCount: 0,
    });
  }

  /**
   * Unregister an entity.
   */
  unregisterEntity(entityId: EntityId): void {
    this.stunStates.delete(entityId);
  }

  /**
   * Apply hitstun from an attack.
   */
  applyHitstun(
    targetId: EntityId,
    sourceId: EntityId,
    attack: AttackData,
    targetFaction: Faction
  ): number {
    const state = this.stunStates.get(targetId);
    if (!state) return 0;

    // Get base hitstun from attack or frame data
    let duration = attack.hitstun > 0 ? attack.hitstun : HITSTUN_FRAME_DATA[attack.type];

    // Apply faction resistance
    const resistance = this.factionResistance.get(targetFaction) ?? 1.0;
    duration *= resistance;

    // Apply combo scaling
    const config = STUN_CONFIGS[StunType.Hitstun];
    if (config.comboScaling) {
      // Increment combo count if still stunned
      if (state.isStunned && state.type === StunType.Hitstun) {
        state.comboCount++;
      } else {
        state.comboCount = 0;
      }

      const scalingFactor = Math.max(0.3, 1 - state.comboCount * this.comboScalingRate);
      duration *= scalingFactor;
    }

    // Ensure minimum duration
    duration = Math.max(config.minimumDuration, duration);

    return this.applyStun(targetId, StunType.Hitstun, duration, sourceId);
  }

  /**
   * Apply blockstun from blocking an attack.
   */
  applyBlockstun(
    targetId: EntityId,
    sourceId: EntityId,
    attack: AttackData,
    targetFaction: Faction
  ): number {
    const state = this.stunStates.get(targetId);
    if (!state) return 0;

    // Get base blockstun from attack or frame data
    let duration = BLOCKSTUN_FRAME_DATA[attack.type];

    // Heavy attacks cause more blockstun
    if (attack.type === AttackType.HeavyAttack) {
      duration *= 1.2;
    }

    // Apply faction resistance (blocking is skill-based, less resistance)
    const resistance = this.factionResistance.get(targetFaction) ?? 1.0;
    duration *= (0.5 + resistance * 0.5); // Less impact from resistance

    const config = STUN_CONFIGS[StunType.Blockstun];
    duration = Math.max(config.minimumDuration, duration);

    return this.applyStun(targetId, StunType.Blockstun, duration, sourceId);
  }

  /**
   * Apply guard break stun.
   */
  applyGuardBreak(targetId: EntityId, sourceId: EntityId): number {
    const config = STUN_CONFIGS[StunType.GuardBreak];
    return this.applyStun(targetId, StunType.GuardBreak, config.baseDuration, sourceId);
  }

  /**
   * Apply stagger stun (posture break).
   */
  applyStagger(targetId: EntityId, sourceId: EntityId): number {
    const config = STUN_CONFIGS[StunType.Stagger];
    return this.applyStun(targetId, StunType.Stagger, config.baseDuration, sourceId);
  }

  /**
   * Apply Force freeze.
   */
  applyForceFreeze(targetId: EntityId, sourceId: EntityId, duration: number): number {
    const config = STUN_CONFIGS[StunType.ForceFreeze];
    const finalDuration = Math.max(config.minimumDuration, duration);
    return this.applyStun(targetId, StunType.ForceFreeze, finalDuration, sourceId);
  }

  /**
   * Generic stun application.
   */
  private applyStun(
    targetId: EntityId,
    type: StunType,
    duration: number,
    sourceId: EntityId | null
  ): number {
    const state = this.stunStates.get(targetId);
    if (!state) return 0;

    const config = STUN_CONFIGS[type];
    const now = Date.now();

    // Check if new stun should override current
    if (state.isStunned) {
      // Stronger stuns override weaker ones
      const currentPriority = this.getStunPriority(state.type);
      const newPriority = this.getStunPriority(type);

      if (newPriority < currentPriority) {
        // Current stun is stronger, extend it instead
        const remainingTime = state.endTime - now;
        if (duration > remainingTime) {
          state.endTime = now + duration;
          state.duration = duration;
        }
        return Math.max(duration, remainingTime);
      }
    }

    // Apply new stun
    state.isStunned = true;
    state.type = type;
    state.startTime = now;
    state.endTime = now + duration;
    state.duration = duration;
    state.invulnerable = config.invulnerable;
    state.sourceId = sourceId;

    // Emit stun event
    this.eventBus.emit({
      type: 'combat:stun_applied',
      data: {
        targetId,
        sourceId,
        stunType: type,
        duration,
        invulnerable: config.invulnerable,
      },
    });

    return duration;
  }

  /**
   * Get stun priority (higher = stronger stun).
   */
  private getStunPriority(type: StunType): number {
    switch (type) {
      case StunType.Stagger:
        return 5;
      case StunType.GuardBreak:
        return 4;
      case StunType.ForceFreeze:
        return 3;
      case StunType.Hitstun:
        return 2;
      case StunType.Blockstun:
        return 1;
      default:
        return 0;
    }
  }

  /**
   * Try to cancel stun (for cancellable stuns).
   */
  tryCancelStun(entityId: EntityId): boolean {
    const state = this.stunStates.get(entityId);
    if (!state || !state.isStunned) return true;

    const config = STUN_CONFIGS[state.type];
    if (!config.cancellable) return false;

    const now = Date.now();
    const elapsed = now - state.startTime;
    const threshold = state.duration * config.cancelThreshold;

    if (elapsed >= threshold) {
      this.clearStun(entityId);
      return true;
    }

    return false;
  }

  /**
   * Clear stun state.
   */
  clearStun(entityId: EntityId): void {
    const state = this.stunStates.get(entityId);
    if (state) {
      const wasStunned = state.isStunned;
      const stunType = state.type;

      state.isStunned = false;
      state.invulnerable = false;
      state.comboCount = 0;

      if (wasStunned) {
        this.eventBus.emit({
          type: 'combat:stun_ended',
          data: {
            entityId,
            stunType,
          },
        });
      }
    }
  }

  /**
   * Check if entity is stunned.
   */
  isStunned(entityId: EntityId): boolean {
    const state = this.stunStates.get(entityId);
    return state?.isStunned ?? false;
  }

  /**
   * Get current stun type.
   */
  getStunType(entityId: EntityId): StunType | null {
    const state = this.stunStates.get(entityId);
    if (!state || !state.isStunned) return null;
    return state.type;
  }

  /**
   * Get remaining stun duration.
   */
  getStunRemaining(entityId: EntityId): number {
    const state = this.stunStates.get(entityId);
    if (!state || !state.isStunned) return 0;
    return Math.max(0, state.endTime - Date.now());
  }

  /**
   * Get stun progress (0-1).
   */
  getStunProgress(entityId: EntityId): number {
    const state = this.stunStates.get(entityId);
    if (!state || !state.isStunned || state.duration === 0) return 0;
    const elapsed = Date.now() - state.startTime;
    return Math.min(1, elapsed / state.duration);
  }

  /**
   * Check if entity is invulnerable from stun.
   */
  isInvulnerable(entityId: EntityId): boolean {
    const state = this.stunStates.get(entityId);
    return state?.invulnerable ?? false;
  }

  /**
   * Reset combo count (call when combo drops).
   */
  resetComboCount(entityId: EntityId): void {
    const state = this.stunStates.get(entityId);
    if (state) {
      state.comboCount = 0;
    }
  }

  /**
   * Update stun states.
   */
  update(deltaMs: number): void {
    const now = Date.now();

    for (const [entityId, state] of this.stunStates) {
      if (!state.isStunned) continue;

      // Check if stun expired
      if (now >= state.endTime) {
        this.clearStun(entityId);
      }
    }
  }

  /**
   * Get frame advantage/disadvantage for attacker after attack.
   * Positive = attacker can act first, negative = defender can act first.
   */
  calculateFrameAdvantage(
    attack: AttackData,
    wasBlocked: boolean,
    attackerRecovery: number
  ): number {
    const targetStun = wasBlocked
      ? BLOCKSTUN_FRAME_DATA[attack.type]
      : HITSTUN_FRAME_DATA[attack.type];

    // Frame advantage = target stun - attacker recovery
    return targetStun - attackerRecovery;
  }

  /**
   * Clean up.
   */
  destroy(): void {
    this.stunStates.clear();
  }
}
