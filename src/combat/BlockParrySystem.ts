/**
 * Block/Parry System
 * Advanced defensive mechanics with timing windows and feedback.
 */

import { EventBus, GameEvent } from '../core/events/EventBus';
import { EntityId } from '../core/types';
import { AttackData, AttackType } from './AttackData';
import { DefenseType, CombatStats, Faction } from './DamageCalculator';

/**
 * Block result types.
 */
export enum BlockResult {
  /** No block attempted */
  None = 'none',
  /** Standard block - reduced damage */
  Block = 'block',
  /** Perfect parry - no damage, counterattack window */
  Parry = 'parry',
  /** Block failed (guard broken) */
  GuardBreak = 'guard_break',
  /** Deflected projectile */
  Deflect = 'deflect',
}

/**
 * Parry timing configuration.
 */
export interface ParryConfig {
  /** Parry window start (ms from block start) */
  windowStart: number;
  /** Parry window duration (ms) */
  windowDuration: number;
  /** Counter-attack window after successful parry (ms) */
  counterWindow: number;
  /** Damage multiplier for counter-attacks */
  counterDamageMultiplier: number;
  /** Stagger dealt to attacker on parry */
  parryStaggerDamage: number;
  /** Invincibility frames after parry (ms) */
  parryIFrames: number;
}

/**
 * Default parry configuration.
 */
const DEFAULT_PARRY_CONFIG: ParryConfig = {
  windowStart: 0,
  windowDuration: 150, // 150ms parry window
  counterWindow: 300,
  counterDamageMultiplier: 1.5,
  parryStaggerDamage: 30,
  parryIFrames: 100,
};

/**
 * Block state for an entity.
 */
interface BlockState {
  /** Is currently blocking? */
  isBlocking: boolean;
  /** Block start time */
  blockStartTime: number;
  /** Current block stamina (depletes when blocking) */
  blockStamina: number;
  /** Maximum block stamina */
  maxBlockStamina: number;
  /** Block stamina regen rate (per second) */
  blockStaminaRegen: number;
  /** Is in counter-attack window? */
  inCounterWindow: boolean;
  /** Counter window end time */
  counterWindowEnd: number;
  /** Last parry time (for cooldown) */
  lastParryTime: number;
  /** Parry cooldown (ms) */
  parryCooldown: number;
  /** Current defense type */
  defenseType: DefenseType;
}

/**
 * Block result data.
 */
export interface BlockResultData {
  result: BlockResult;
  damageBlocked: number;
  staminaCost: number;
  staggerDealt: number;
  knockbackReduction: number;
  counterWindowActive: boolean;
  deflectedProjectile: boolean;
}

/**
 * Block/Parry System - manages defensive mechanics.
 */
export class BlockParrySystem {
  private eventBus: EventBus;
  private parryConfig: ParryConfig;
  private blockStates: Map<EntityId, BlockState> = new Map();

  // Faction-specific parry configs
  private factionConfigs: Map<Faction, ParryConfig> = new Map();

  constructor(eventBus: EventBus, parryConfig: Partial<ParryConfig> = {}) {
    this.eventBus = eventBus;
    this.parryConfig = { ...DEFAULT_PARRY_CONFIG, ...parryConfig };

    this.setupFactionConfigs();
    this.setupEvents();
  }

  /**
   * Setup faction-specific parry configurations.
   */
  private setupFactionConfigs(): void {
    // Vader (Sith) - excellent defense with Form V Djem So
    this.factionConfigs.set(Faction.Sith, {
      windowStart: 0,
      windowDuration: 200, // Generous parry window
      counterWindow: 400,
      counterDamageMultiplier: 2.0, // Devastating counters
      parryStaggerDamage: 50,
      parryIFrames: 150,
    });

    // Temple Guards - defensive specialists
    this.factionConfigs.set(Faction.TempleGuard, {
      windowStart: 0,
      windowDuration: 180,
      counterWindow: 250,
      counterDamageMultiplier: 1.3,
      parryStaggerDamage: 40,
      parryIFrames: 100,
    });

    // Jedi - good defense
    this.factionConfigs.set(Faction.Jedi, {
      windowStart: 0,
      windowDuration: 150,
      counterWindow: 300,
      counterDamageMultiplier: 1.5,
      parryStaggerDamage: 30,
      parryIFrames: 100,
    });

    // Bosses - hard to parry
    this.factionConfigs.set(Faction.Boss, {
      windowStart: 50, // Delayed window
      windowDuration: 100,
      counterWindow: 200,
      counterDamageMultiplier: 1.2,
      parryStaggerDamage: 20,
      parryIFrames: 80,
    });
  }

  /**
   * Register an entity for block/parry tracking.
   */
  registerEntity(
    entityId: EntityId,
    maxBlockStamina: number = 100,
    faction: Faction = Faction.Jedi
  ): void {
    this.blockStates.set(entityId, {
      isBlocking: false,
      blockStartTime: 0,
      blockStamina: maxBlockStamina,
      maxBlockStamina,
      blockStaminaRegen: 20, // 20 stamina per second
      inCounterWindow: false,
      counterWindowEnd: 0,
      lastParryTime: 0,
      parryCooldown: 500,
      defenseType: DefenseType.None,
    });
  }

  /**
   * Unregister an entity.
   */
  unregisterEntity(entityId: EntityId): void {
    this.blockStates.delete(entityId);
  }

  /**
   * Start blocking for an entity.
   */
  startBlock(entityId: EntityId): boolean {
    const state = this.blockStates.get(entityId);
    if (!state) return false;

    // Check if we have stamina to block
    if (state.blockStamina <= 0) {
      return false;
    }

    state.isBlocking = true;
    state.blockStartTime = Date.now();
    state.defenseType = DefenseType.Block;

    this.eventBus.emit({
      type: 'combat:block_start',
      data: { entityId },
    });

    return true;
  }

  /**
   * Stop blocking for an entity.
   */
  stopBlock(entityId: EntityId): void {
    const state = this.blockStates.get(entityId);
    if (!state) return;

    state.isBlocking = false;
    state.defenseType = DefenseType.None;

    this.eventBus.emit({
      type: 'combat:block_end',
      data: { entityId },
    });
  }

  /**
   * Process an incoming attack against a blocking entity.
   */
  processBlock(
    defenderId: EntityId,
    attackerId: EntityId,
    attack: AttackData,
    attackerFaction: Faction,
    defenderFaction: Faction
  ): BlockResultData {
    const state = this.blockStates.get(defenderId);

    // No block state or not blocking
    if (!state || !state.isBlocking) {
      return {
        result: BlockResult.None,
        damageBlocked: 0,
        staminaCost: 0,
        staggerDealt: 0,
        knockbackReduction: 0,
        counterWindowActive: false,
        deflectedProjectile: false,
      };
    }

    const now = Date.now();
    const blockDuration = now - state.blockStartTime;
    const config = this.factionConfigs.get(defenderFaction) ?? this.parryConfig;

    // Check for parry timing
    const inParryWindow = blockDuration >= config.windowStart &&
                         blockDuration <= config.windowStart + config.windowDuration;
    const canParry = now - state.lastParryTime >= state.parryCooldown;

    // Successful parry
    if (inParryWindow && canParry) {
      return this.processParry(defenderId, attackerId, attack, state, config);
    }

    // Calculate stamina cost based on attack type
    let staminaCost = this.calculateStaminaCost(attack);

    // Check for guard break
    if (state.blockStamina < staminaCost) {
      state.blockStamina = 0;
      state.isBlocking = false;
      state.defenseType = DefenseType.None;

      this.eventBus.emit({
        type: 'combat:guard_break',
        data: { entityId: defenderId, attackerId },
      });

      return {
        result: BlockResult.GuardBreak,
        damageBlocked: 0,
        staminaCost: state.blockStamina,
        staggerDealt: 0,
        knockbackReduction: 0,
        counterWindowActive: false,
        deflectedProjectile: false,
      };
    }

    // Standard block
    state.blockStamina -= staminaCost;

    // Calculate damage reduction
    const damageBlocked = attack.damage * 0.8; // 80% damage blocked
    const knockbackReduction = 0.7; // 70% knockback reduction

    this.eventBus.emit({
      type: 'combat:block_success',
      data: {
        defenderId,
        attackerId,
        damageBlocked,
        staminaCost,
      },
    });

    // Check for projectile deflection
    const deflected = attack.type === AttackType.ForcePower || attack.id.includes('blaster');

    return {
      result: deflected ? BlockResult.Deflect : BlockResult.Block,
      damageBlocked,
      staminaCost,
      staggerDealt: 0,
      knockbackReduction,
      counterWindowActive: false,
      deflectedProjectile: deflected,
    };
  }

  /**
   * Process a successful parry.
   */
  private processParry(
    defenderId: EntityId,
    attackerId: EntityId,
    attack: AttackData,
    state: BlockState,
    config: ParryConfig
  ): BlockResultData {
    const now = Date.now();

    state.lastParryTime = now;
    state.inCounterWindow = true;
    state.counterWindowEnd = now + config.counterWindow;
    state.defenseType = DefenseType.Parry;

    // Minimal stamina cost for parry
    const staminaCost = this.calculateStaminaCost(attack) * 0.2;
    state.blockStamina = Math.max(0, state.blockStamina - staminaCost);

    this.eventBus.emit({
      type: 'combat:parry_success',
      data: {
        defenderId,
        attackerId,
        counterWindowDuration: config.counterWindow,
        staggerDealt: config.parryStaggerDamage,
      },
    });

    return {
      result: BlockResult.Parry,
      damageBlocked: attack.damage, // Full damage blocked
      staminaCost,
      staggerDealt: config.parryStaggerDamage,
      knockbackReduction: 1.0, // No knockback on parry
      counterWindowActive: true,
      deflectedProjectile: false,
    };
  }

  /**
   * Calculate stamina cost for blocking an attack.
   */
  private calculateStaminaCost(attack: AttackData): number {
    let baseCost = 10;

    switch (attack.type) {
      case AttackType.LightAttack:
        baseCost = 10;
        break;
      case AttackType.HeavyAttack:
        baseCost = 25;
        break;
      case AttackType.Special:
        baseCost = 20;
        break;
      case AttackType.ForcePower:
        baseCost = 30; // Force attacks are hard to block
        break;
    }

    return baseCost;
  }

  /**
   * Check if entity is in counter-attack window.
   */
  isInCounterWindow(entityId: EntityId): boolean {
    const state = this.blockStates.get(entityId);
    if (!state) return false;

    if (state.inCounterWindow && Date.now() <= state.counterWindowEnd) {
      return true;
    }

    // Window expired
    if (state.inCounterWindow) {
      state.inCounterWindow = false;
      state.defenseType = state.isBlocking ? DefenseType.Block : DefenseType.None;
    }

    return false;
  }

  /**
   * Get counter-attack damage multiplier.
   */
  getCounterMultiplier(entityId: EntityId, faction: Faction): number {
    if (!this.isInCounterWindow(entityId)) {
      return 1.0;
    }

    const config = this.factionConfigs.get(faction) ?? this.parryConfig;
    return config.counterDamageMultiplier;
  }

  /**
   * Get current block stamina.
   */
  getBlockStamina(entityId: EntityId): number {
    return this.blockStates.get(entityId)?.blockStamina ?? 0;
  }

  /**
   * Get max block stamina.
   */
  getMaxBlockStamina(entityId: EntityId): number {
    return this.blockStates.get(entityId)?.maxBlockStamina ?? 100;
  }

  /**
   * Check if entity is blocking.
   */
  isBlocking(entityId: EntityId): boolean {
    return this.blockStates.get(entityId)?.isBlocking ?? false;
  }

  /**
   * Get defense type for entity.
   */
  getDefenseType(entityId: EntityId): DefenseType {
    return this.blockStates.get(entityId)?.defenseType ?? DefenseType.None;
  }

  /**
   * Update - regenerate stamina for non-blocking entities.
   */
  update(deltaMs: number): void {
    for (const [entityId, state] of this.blockStates) {
      // Regenerate stamina when not blocking
      if (!state.isBlocking && state.blockStamina < state.maxBlockStamina) {
        const regenAmount = (state.blockStaminaRegen * deltaMs) / 1000;
        state.blockStamina = Math.min(state.maxBlockStamina, state.blockStamina + regenAmount);
      }

      // Clear expired counter windows
      if (state.inCounterWindow && Date.now() > state.counterWindowEnd) {
        state.inCounterWindow = false;
        state.defenseType = state.isBlocking ? DefenseType.Block : DefenseType.None;
      }
    }
  }

  /**
   * Setup event listeners.
   */
  private setupEvents(): void {
    // Listen for combat hits to process blocks
    this.eventBus.on('combat:attack_incoming', (event: GameEvent) => {
      // This would be called by CombatManager before applying damage
      // to check for blocks
    });
  }

  /**
   * Clean up.
   */
  destroy(): void {
    this.blockStates.clear();
  }
}
