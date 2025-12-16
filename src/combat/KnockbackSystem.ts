/**
 * Knockback Physics System
 * Handles knockback, pushback, and stun effects for combat.
 */

import Phaser from 'phaser';
import { EventBus } from '../core/events/EventBus';
import { EntityId } from '../core/types';
import { AttackData, AttackType } from './AttackData';
import { Faction } from './DamageCalculator';

/**
 * Knockback type enumeration.
 */
export enum KnockbackType {
  /** Light hit - small pushback */
  Light = 'light',
  /** Heavy hit - significant knockback */
  Heavy = 'heavy',
  /** Launch - sends target into air (if supported) */
  Launch = 'launch',
  /** Slam - downward force */
  Slam = 'slam',
  /** Force push - extended knockback */
  ForcePush = 'force_push',
  /** Force pull - pulls toward attacker */
  ForcePull = 'force_pull',
}

/**
 * Knockback configuration per type.
 */
export interface KnockbackConfig {
  /** Base force magnitude */
  baseMagnitude: number;
  /** Duration of knockback velocity (ms) */
  duration: number;
  /** Friction applied during knockback (0-1) */
  friction: number;
  /** Does this knockback stun? */
  causesStun: boolean;
  /** Stun duration (ms) */
  stunDuration: number;
  /** Can be reduced by blocking? */
  blockReducible: boolean;
  /** Block reduction factor (0-1) */
  blockReduction: number;
  /** Vertical component (for launch/slam) */
  verticalForce: number;
}

/**
 * Default knockback configurations.
 */
const KNOCKBACK_CONFIGS: Record<KnockbackType, KnockbackConfig> = {
  [KnockbackType.Light]: {
    baseMagnitude: 100,
    duration: 150,
    friction: 0.9,
    causesStun: false,
    stunDuration: 0,
    blockReducible: true,
    blockReduction: 0.8,
    verticalForce: 0,
  },
  [KnockbackType.Heavy]: {
    baseMagnitude: 250,
    duration: 300,
    friction: 0.85,
    causesStun: true,
    stunDuration: 200,
    blockReducible: true,
    blockReduction: 0.6,
    verticalForce: -50,
  },
  [KnockbackType.Launch]: {
    baseMagnitude: 200,
    duration: 400,
    friction: 0.7,
    causesStun: true,
    stunDuration: 400,
    blockReducible: false,
    blockReduction: 0.3,
    verticalForce: -300,
  },
  [KnockbackType.Slam]: {
    baseMagnitude: 150,
    duration: 200,
    friction: 0.8,
    causesStun: true,
    stunDuration: 300,
    blockReducible: true,
    blockReduction: 0.5,
    verticalForce: 200,
  },
  [KnockbackType.ForcePush]: {
    baseMagnitude: 400,
    duration: 500,
    friction: 0.75,
    causesStun: true,
    stunDuration: 350,
    blockReducible: true,
    blockReduction: 0.4,
    verticalForce: -100,
  },
  [KnockbackType.ForcePull]: {
    baseMagnitude: -300, // Negative = pull toward
    duration: 400,
    friction: 0.8,
    causesStun: true,
    stunDuration: 250,
    blockReducible: true,
    blockReduction: 0.5,
    verticalForce: 0,
  },
};

/**
 * Active knockback state for an entity.
 */
interface KnockbackState {
  /** Is knockback active? */
  active: boolean;
  /** Current velocity X */
  velocityX: number;
  /** Current velocity Y */
  velocityY: number;
  /** Knockback end time */
  endTime: number;
  /** Friction to apply */
  friction: number;
  /** Associated stun duration */
  stunDuration: number;
  /** Stun end time */
  stunEndTime: number;
  /** Source of knockback */
  sourceId: EntityId | null;
}

/**
 * Knockback result data.
 */
export interface KnockbackResult {
  /** Applied velocity X */
  velocityX: number;
  /** Applied velocity Y */
  velocityY: number;
  /** Knockback duration */
  duration: number;
  /** Stun duration */
  stunDuration: number;
  /** Was knockback reduced by block? */
  wasReduced: boolean;
}

/**
 * Knockback System - manages knockback physics.
 */
export class KnockbackSystem {
  private eventBus: EventBus;
  private knockbackStates: Map<EntityId, KnockbackState> = new Map();

  // Faction multipliers for knockback dealt
  private factionKnockbackMultipliers: Map<Faction, number> = new Map([
    [Faction.Sith, 1.5], // Vader deals extra knockback
    [Faction.Imperial, 0.8],
    [Faction.Jedi, 1.0],
    [Faction.TempleGuard, 1.2],
    [Faction.Boss, 1.3],
  ]);

  // Faction multipliers for knockback received
  private factionResistanceMultipliers: Map<Faction, number> = new Map([
    [Faction.Sith, 0.3], // Vader barely moves
    [Faction.Imperial, 1.2],
    [Faction.Jedi, 1.0],
    [Faction.TempleGuard, 0.8],
    [Faction.Boss, 0.5],
  ]);

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Register an entity for knockback tracking.
   */
  registerEntity(entityId: EntityId): void {
    this.knockbackStates.set(entityId, {
      active: false,
      velocityX: 0,
      velocityY: 0,
      endTime: 0,
      friction: 0.9,
      stunDuration: 0,
      stunEndTime: 0,
      sourceId: null,
    });
  }

  /**
   * Unregister an entity.
   */
  unregisterEntity(entityId: EntityId): void {
    this.knockbackStates.delete(entityId);
  }

  /**
   * Determine knockback type from attack.
   */
  private getKnockbackType(attack: AttackData): KnockbackType {
    // Check for Force attacks first
    if (attack.id.includes('force_push')) {
      return KnockbackType.ForcePush;
    }
    if (attack.id.includes('force_pull')) {
      return KnockbackType.ForcePull;
    }

    // Check attack type
    switch (attack.type) {
      case AttackType.HeavyAttack:
        // Check for special heavy attacks
        if (attack.id.includes('slam') || attack.id.includes('ground')) {
          return KnockbackType.Slam;
        }
        if (attack.id.includes('rising') || attack.id.includes('launch')) {
          return KnockbackType.Launch;
        }
        return KnockbackType.Heavy;

      case AttackType.ForcePower:
        return KnockbackType.ForcePush;

      case AttackType.LightAttack:
      default:
        return KnockbackType.Light;
    }
  }

  /**
   * Apply knockback to an entity.
   */
  applyKnockback(
    targetId: EntityId,
    sourceId: EntityId,
    attack: AttackData,
    directionX: number,
    directionY: number,
    sourceFaction: Faction,
    targetFaction: Faction,
    isBlocking: boolean = false
  ): KnockbackResult {
    const state = this.knockbackStates.get(targetId);
    if (!state) {
      return {
        velocityX: 0,
        velocityY: 0,
        duration: 0,
        stunDuration: 0,
        wasReduced: false,
      };
    }

    const knockbackType = this.getKnockbackType(attack);
    const config = KNOCKBACK_CONFIGS[knockbackType];

    // Calculate base magnitude
    let magnitude = config.baseMagnitude;

    // Apply attack-specific knockback override
    if (attack.knockback > 0) {
      magnitude = attack.knockback;
    }

    // Apply faction multipliers
    const sourceMultiplier = this.factionKnockbackMultipliers.get(sourceFaction) ?? 1.0;
    const targetResistance = this.factionResistanceMultipliers.get(targetFaction) ?? 1.0;
    magnitude = magnitude * sourceMultiplier * targetResistance;

    // Apply block reduction
    let wasReduced = false;
    if (isBlocking && config.blockReducible) {
      magnitude *= config.blockReduction;
      wasReduced = true;
    }

    // Normalize direction
    const len = Math.sqrt(directionX * directionX + directionY * directionY);
    if (len > 0) {
      directionX /= len;
      directionY /= len;
    }

    // Calculate velocity
    const velocityX = directionX * magnitude;
    const velocityY = directionY * magnitude + config.verticalForce;

    // Calculate durations
    let duration = config.duration;
    let stunDuration = config.causesStun ? config.stunDuration : 0;

    // Reduce stun if blocking
    if (isBlocking && stunDuration > 0) {
      stunDuration *= 0.5;
    }

    const now = Date.now();

    // Update state
    state.active = true;
    state.velocityX = velocityX;
    state.velocityY = velocityY;
    state.endTime = now + duration;
    state.friction = config.friction;
    state.stunDuration = stunDuration;
    state.stunEndTime = stunDuration > 0 ? now + stunDuration : 0;
    state.sourceId = sourceId;

    // Emit knockback event
    this.eventBus.emit({
      type: 'combat:knockback',
      data: {
        targetId,
        sourceId,
        knockbackType,
        velocityX,
        velocityY,
        duration,
        stunDuration,
      },
    });

    return {
      velocityX,
      velocityY,
      duration,
      stunDuration,
      wasReduced,
    };
  }

  /**
   * Apply direct knockback (no attack data needed).
   */
  applyDirectKnockback(
    targetId: EntityId,
    velocityX: number,
    velocityY: number,
    duration: number,
    stunDuration: number = 0,
    sourceId: EntityId | null = null
  ): void {
    const state = this.knockbackStates.get(targetId);
    if (!state) return;

    const now = Date.now();

    state.active = true;
    state.velocityX = velocityX;
    state.velocityY = velocityY;
    state.endTime = now + duration;
    state.friction = 0.85;
    state.stunDuration = stunDuration;
    state.stunEndTime = stunDuration > 0 ? now + stunDuration : 0;
    state.sourceId = sourceId;

    this.eventBus.emit({
      type: 'combat:knockback',
      data: {
        targetId,
        sourceId,
        velocityX,
        velocityY,
        duration,
        stunDuration,
      },
    });
  }

  /**
   * Check if entity is being knocked back.
   */
  isKnockedBack(entityId: EntityId): boolean {
    const state = this.knockbackStates.get(entityId);
    return state?.active ?? false;
  }

  /**
   * Check if entity is stunned from knockback.
   */
  isStunned(entityId: EntityId): boolean {
    const state = this.knockbackStates.get(entityId);
    if (!state) return false;
    return state.stunEndTime > Date.now();
  }

  /**
   * Get remaining stun duration.
   */
  getStunRemaining(entityId: EntityId): number {
    const state = this.knockbackStates.get(entityId);
    if (!state) return 0;
    return Math.max(0, state.stunEndTime - Date.now());
  }

  /**
   * Get current knockback velocity.
   */
  getKnockbackVelocity(entityId: EntityId): { x: number; y: number } {
    const state = this.knockbackStates.get(entityId);
    if (!state || !state.active) {
      return { x: 0, y: 0 };
    }
    return { x: state.velocityX, y: state.velocityY };
  }

  /**
   * Cancel knockback for an entity.
   */
  cancelKnockback(entityId: EntityId): void {
    const state = this.knockbackStates.get(entityId);
    if (state) {
      state.active = false;
      state.velocityX = 0;
      state.velocityY = 0;
    }
  }

  /**
   * Update knockback physics.
   */
  update(deltaMs: number): void {
    const now = Date.now();
    const deltaSeconds = deltaMs / 1000;

    for (const [entityId, state] of this.knockbackStates) {
      if (!state.active) continue;

      // Check if knockback expired
      if (now >= state.endTime) {
        state.active = false;
        state.velocityX = 0;
        state.velocityY = 0;

        this.eventBus.emit({
          type: 'combat:knockback_end',
          data: { entityId },
        });
        continue;
      }

      // Apply friction
      state.velocityX *= Math.pow(state.friction, deltaSeconds * 60);
      state.velocityY *= Math.pow(state.friction, deltaSeconds * 60);

      // Emit velocity update for physics bodies to apply
      this.eventBus.emit({
        type: 'combat:knockback_velocity',
        data: {
          entityId,
          velocityX: state.velocityX,
          velocityY: state.velocityY,
        },
      });
    }
  }

  /**
   * Apply velocities to physics bodies.
   * Call this from the game scene with access to sprites.
   */
  applyToBody(entityId: EntityId, body: Phaser.Physics.Arcade.Body): void {
    const state = this.knockbackStates.get(entityId);
    if (!state || !state.active) return;

    body.setVelocity(state.velocityX, state.velocityY);
  }

  /**
   * Clean up.
   */
  destroy(): void {
    this.knockbackStates.clear();
  }
}
