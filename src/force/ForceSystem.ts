/**
 * ForceSystem - Central orchestrator for all Force powers.
 * Manages Force power execution, cooldowns, and visual effects integration.
 * This is Vader's dark side power fantasy - overwhelming, ruthless Force usage.
 */

import Phaser from 'phaser';
import { EventBus, GameEvent } from '../core/events/EventBus';
import { EntityId } from '../core/types';
import { EffectsLayer, getEffectsLayer } from '../core/EffectsLayer';
import { CombatManager } from '../combat/CombatManager';

/**
 * Force power types available.
 */
export enum ForcePowerType {
  Push = 'force_push',
  Pull = 'force_pull',
  Lightning = 'force_lightning',
  Choke = 'force_choke',
}

/**
 * Force power configuration.
 */
export interface ForcePowerConfig {
  /** Force cost to use */
  cost: number;
  /** Cooldown in ms */
  cooldown: number;
  /** Base damage */
  damage: number;
  /** Range of effect */
  range: number;
  /** Duration of effect (for sustained powers) */
  duration: number;
  /** Knockback force (positive = push away, negative = pull) */
  knockback: number;
  /** Cone angle in degrees (for directional powers) */
  coneAngle: number;
  /** Can hit multiple targets? */
  multiTarget: boolean;
  /** Max targets if multiTarget */
  maxTargets: number;
}

/**
 * Default configurations for Force powers.
 */
export const FORCE_POWER_CONFIGS: Record<ForcePowerType, ForcePowerConfig> = {
  [ForcePowerType.Push]: {
    cost: 20,
    cooldown: 800,
    damage: 30,
    range: 250,
    duration: 100,
    knockback: 450,
    coneAngle: 60,
    multiTarget: true,
    maxTargets: 8,
  },
  [ForcePowerType.Pull]: {
    cost: 15,
    cooldown: 600,
    damage: 15,
    range: 300,
    duration: 200,
    knockback: -350, // Negative = pull toward
    coneAngle: 45,
    multiTarget: true,
    maxTargets: 5,
  },
  [ForcePowerType.Lightning]: {
    cost: 40,
    cooldown: 1500,
    damage: 80,
    range: 350,
    duration: 1200,
    knockback: 100,
    coneAngle: 30,
    multiTarget: true,
    maxTargets: 4, // Chain lightning
  },
  [ForcePowerType.Choke]: {
    cost: 35,
    cooldown: 2000,
    damage: 40,
    range: 200,
    duration: 2000,
    knockback: 0,
    coneAngle: 15,
    multiTarget: false,
    maxTargets: 1,
  },
};

/**
 * Force power execution result.
 */
export interface ForcePowerResult {
  /** Was the power executed? */
  success: boolean;
  /** Reason for failure (if any) */
  failReason?: string;
  /** Targets hit */
  targetsHit: EntityId[];
  /** Total damage dealt */
  totalDamage: number;
  /** Force cost consumed */
  forceCost: number;
}

/**
 * Force power event data.
 */
export interface ForcePowerEventData {
  powerType: ForcePowerType;
  casterId: EntityId;
  position: { x: number; y: number };
  direction: number;
  targetsHit: EntityId[];
  damage: number;
}

/**
 * Target entity interface for Force powers.
 */
export interface ForceTarget {
  id: EntityId;
  sprite: Phaser.GameObjects.Sprite;
  position: { x: number; y: number };
  health: number;
  isBlocking: boolean;
}

/**
 * ForceSystem - manages all Force power mechanics.
 */
export class ForceSystem {
  private scene: Phaser.Scene;
  private eventBus: EventBus;
  private combatManager: CombatManager;
  private effectsLayer: EffectsLayer | null = null;

  // Cooldown tracking
  private cooldowns: Map<ForcePowerType, number> = new Map();

  // Active sustained powers
  private activePowers: Map<string, {
    type: ForcePowerType;
    startTime: number;
    duration: number;
    targets: EntityId[];
    tickInterval: number;
    lastTickTime: number;
  }> = new Map();

  // Power ID counter
  private nextPowerId = 0;

  constructor(
    scene: Phaser.Scene,
    eventBus: EventBus,
    combatManager: CombatManager
  ) {
    this.scene = scene;
    this.eventBus = eventBus;
    this.combatManager = combatManager;

    // Initialize cooldowns
    for (const powerType of Object.values(ForcePowerType)) {
      this.cooldowns.set(powerType, 0);
    }

    // Try to get effects layer
    this.effectsLayer = getEffectsLayer();
  }

  /**
   * Set effects layer reference.
   */
  setEffectsLayer(effectsLayer: EffectsLayer): void {
    this.effectsLayer = effectsLayer;
  }

  /**
   * Check if a Force power can be used.
   */
  canUsePower(powerType: ForcePowerType, currentForce: number): boolean {
    const config = FORCE_POWER_CONFIGS[powerType];

    // Check Force cost
    if (currentForce < config.cost) {
      return false;
    }

    // Check cooldown
    const cooldownEnd = this.cooldowns.get(powerType) ?? 0;
    if (Date.now() < cooldownEnd) {
      return false;
    }

    return true;
  }

  /**
   * Get remaining cooldown for a power.
   */
  getCooldownRemaining(powerType: ForcePowerType): number {
    const cooldownEnd = this.cooldowns.get(powerType) ?? 0;
    return Math.max(0, cooldownEnd - Date.now());
  }

  /**
   * Execute Force Push.
   */
  executeForcePush(
    casterId: EntityId,
    casterPosition: { x: number; y: number },
    direction: number,
    targets: ForceTarget[],
    currentForce: number
  ): ForcePowerResult {
    const config = FORCE_POWER_CONFIGS[ForcePowerType.Push];

    // Validate execution
    if (!this.canUsePower(ForcePowerType.Push, currentForce)) {
      return {
        success: false,
        failReason: currentForce < config.cost ? 'Insufficient Force' : 'On cooldown',
        targetsHit: [],
        totalDamage: 0,
        forceCost: 0,
      };
    }

    // Find targets in cone
    const hitTargets = this.findTargetsInCone(
      casterPosition,
      direction,
      config.range,
      config.coneAngle,
      targets,
      config.maxTargets
    );

    // Apply damage and knockback
    let totalDamage = 0;
    const targetsHit: EntityId[] = [];

    for (const target of hitTargets) {
      // Calculate knockback direction (away from caster)
      const angle = Math.atan2(
        target.position.y - casterPosition.y,
        target.position.x - casterPosition.x
      );

      // Calculate distance-based damage falloff
      const distance = Phaser.Math.Distance.Between(
        casterPosition.x, casterPosition.y,
        target.position.x, target.position.y
      );
      const falloff = 1 - (distance / config.range) * 0.5;
      const damage = Math.round(config.damage * falloff);

      // Apply knockback
      const knockbackX = Math.cos(angle) * config.knockback;
      const knockbackY = Math.sin(angle) * config.knockback - 100; // Slight upward lift

      // Apply damage through combat manager
      this.combatManager.applyDamage(target.id, damage, knockbackX, knockbackY);

      totalDamage += damage;
      targetsHit.push(target.id);
    }

    // Set cooldown
    this.cooldowns.set(ForcePowerType.Push, Date.now() + config.cooldown);

    // Spawn visual effects
    this.spawnForcePushEffects(casterPosition, direction, config.range);

    // Emit event
    this.emitPowerEvent(ForcePowerType.Push, casterId, casterPosition, direction, targetsHit, totalDamage);

    return {
      success: true,
      targetsHit,
      totalDamage,
      forceCost: config.cost,
    };
  }

  /**
   * Execute Force Pull.
   */
  executeForcePull(
    casterId: EntityId,
    casterPosition: { x: number; y: number },
    direction: number,
    targets: ForceTarget[],
    currentForce: number
  ): ForcePowerResult {
    const config = FORCE_POWER_CONFIGS[ForcePowerType.Pull];

    // Validate execution
    if (!this.canUsePower(ForcePowerType.Pull, currentForce)) {
      return {
        success: false,
        failReason: currentForce < config.cost ? 'Insufficient Force' : 'On cooldown',
        targetsHit: [],
        totalDamage: 0,
        forceCost: 0,
      };
    }

    // Find targets in cone
    const hitTargets = this.findTargetsInCone(
      casterPosition,
      direction,
      config.range,
      config.coneAngle,
      targets,
      config.maxTargets
    );

    // Apply damage and pull
    let totalDamage = 0;
    const targetsHit: EntityId[] = [];

    for (const target of hitTargets) {
      // Calculate pull direction (toward caster)
      const angle = Math.atan2(
        casterPosition.y - target.position.y,
        casterPosition.x - target.position.x
      );

      // Calculate distance to determine pull strength
      const distance = Phaser.Math.Distance.Between(
        casterPosition.x, casterPosition.y,
        target.position.x, target.position.y
      );

      // Pull strength increases with distance (far targets get pulled harder)
      const pullStrength = Math.min(1, distance / config.range) * Math.abs(config.knockback);

      const pullX = Math.cos(angle) * pullStrength;
      const pullY = Math.sin(angle) * pullStrength;

      // Apply damage through combat manager
      this.combatManager.applyDamage(target.id, config.damage, pullX, pullY);

      totalDamage += config.damage;
      targetsHit.push(target.id);
    }

    // Set cooldown
    this.cooldowns.set(ForcePowerType.Pull, Date.now() + config.cooldown);

    // Spawn visual effects
    this.spawnForcePullEffects(casterPosition, direction, config.range);

    // Emit event
    this.emitPowerEvent(ForcePowerType.Pull, casterId, casterPosition, direction, targetsHit, totalDamage);

    return {
      success: true,
      targetsHit,
      totalDamage,
      forceCost: config.cost,
    };
  }

  /**
   * Execute Force Lightning.
   * This is a sustained channeled ability.
   */
  executeForceLightning(
    casterId: EntityId,
    casterPosition: { x: number; y: number },
    direction: number,
    targets: ForceTarget[],
    currentForce: number
  ): ForcePowerResult {
    const config = FORCE_POWER_CONFIGS[ForcePowerType.Lightning];

    // Validate execution
    if (!this.canUsePower(ForcePowerType.Lightning, currentForce)) {
      return {
        success: false,
        failReason: currentForce < config.cost ? 'Insufficient Force' : 'On cooldown',
        targetsHit: [],
        totalDamage: 0,
        forceCost: 0,
      };
    }

    // Find primary target
    const hitTargets = this.findTargetsInCone(
      casterPosition,
      direction,
      config.range,
      config.coneAngle,
      targets,
      1 // Start with primary target
    );

    if (hitTargets.length === 0) {
      return {
        success: false,
        failReason: 'No targets in range',
        targetsHit: [],
        totalDamage: 0,
        forceCost: 0,
      };
    }

    // Find chain targets (enemies near the primary target)
    const primaryTarget = hitTargets[0];
    const chainTargets = this.findChainLightningTargets(
      primaryTarget,
      targets.filter(t => t.id !== primaryTarget.id),
      config.maxTargets - 1,
      150 // Chain range
    );

    // Combine primary and chain targets
    const allTargets = [primaryTarget, ...chainTargets];

    // Apply initial damage
    let totalDamage = 0;
    const targetsHit: EntityId[] = [];

    for (let i = 0; i < allTargets.length; i++) {
      const target = allTargets[i];
      // Chain damage falloff
      const chainFalloff = Math.pow(0.8, i);
      const damage = Math.round(config.damage * chainFalloff);

      this.combatManager.applyDamage(target.id, damage, config.knockback * (Math.random() - 0.5), -50);
      totalDamage += damage;
      targetsHit.push(target.id);
    }

    // Create sustained power entry for tick damage
    const powerId = `lightning_${++this.nextPowerId}`;
    this.activePowers.set(powerId, {
      type: ForcePowerType.Lightning,
      startTime: Date.now(),
      duration: config.duration,
      targets: targetsHit,
      tickInterval: 200, // Damage tick every 200ms
      lastTickTime: Date.now(),
    });

    // Set cooldown
    this.cooldowns.set(ForcePowerType.Lightning, Date.now() + config.cooldown);

    // Spawn lightning visual effects
    this.spawnForceLightningEffects(casterPosition, allTargets);

    // Emit event
    this.emitPowerEvent(ForcePowerType.Lightning, casterId, casterPosition, direction, targetsHit, totalDamage);

    return {
      success: true,
      targetsHit,
      totalDamage,
      forceCost: config.cost,
    };
  }

  /**
   * Update active sustained powers.
   */
  update(deltaMs: number): void {
    const now = Date.now();
    const expiredPowers: string[] = [];

    for (const [powerId, power] of this.activePowers) {
      // Check if power has expired
      if (now >= power.startTime + power.duration) {
        expiredPowers.push(powerId);
        continue;
      }

      // Apply tick damage
      if (now >= power.lastTickTime + power.tickInterval) {
        this.applyPowerTick(power);
        power.lastTickTime = now;
      }
    }

    // Clean up expired powers
    for (const powerId of expiredPowers) {
      this.activePowers.delete(powerId);
    }
  }

  /**
   * Apply tick damage for sustained powers.
   */
  private applyPowerTick(power: {
    type: ForcePowerType;
    targets: EntityId[];
    tickInterval: number;
  }): void {
    const config = FORCE_POWER_CONFIGS[power.type];
    const tickDamage = Math.round(config.damage * 0.2); // 20% of base per tick

    for (const targetId of power.targets) {
      this.combatManager.applyDamage(targetId, tickDamage, 0, 0);
    }
  }

  /**
   * Find targets within a cone.
   */
  private findTargetsInCone(
    origin: { x: number; y: number },
    direction: number,
    range: number,
    coneAngle: number,
    targets: ForceTarget[],
    maxTargets: number
  ): ForceTarget[] {
    const halfAngle = (coneAngle * Math.PI) / 180 / 2;
    const validTargets: { target: ForceTarget; distance: number }[] = [];

    for (const target of targets) {
      // Check distance
      const distance = Phaser.Math.Distance.Between(
        origin.x, origin.y,
        target.position.x, target.position.y
      );

      if (distance > range) continue;

      // Check angle
      const angleToTarget = Math.atan2(
        target.position.y - origin.y,
        target.position.x - origin.x
      );

      const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(angleToTarget - direction));

      if (angleDiff <= halfAngle) {
        validTargets.push({ target, distance });
      }
    }

    // Sort by distance and limit
    validTargets.sort((a, b) => a.distance - b.distance);
    return validTargets.slice(0, maxTargets).map(t => t.target);
  }

  /**
   * Find chain lightning targets near a source.
   */
  private findChainLightningTargets(
    source: ForceTarget,
    potentialTargets: ForceTarget[],
    maxChain: number,
    chainRange: number
  ): ForceTarget[] {
    const chainedTargets: ForceTarget[] = [];
    let currentSource = source;

    for (let i = 0; i < maxChain; i++) {
      let closestTarget: ForceTarget | null = null;
      let closestDistance = Infinity;

      for (const target of potentialTargets) {
        // Skip already chained targets
        if (chainedTargets.includes(target)) continue;

        const distance = Phaser.Math.Distance.Between(
          currentSource.position.x, currentSource.position.y,
          target.position.x, target.position.y
        );

        if (distance <= chainRange && distance < closestDistance) {
          closestDistance = distance;
          closestTarget = target;
        }
      }

      if (closestTarget) {
        chainedTargets.push(closestTarget);
        currentSource = closestTarget;
      } else {
        break;
      }
    }

    return chainedTargets;
  }

  /**
   * Spawn Force Push visual effects.
   */
  private spawnForcePushEffects(
    origin: { x: number; y: number },
    direction: number,
    range: number
  ): void {
    if (!this.effectsLayer) return;

    // Spawn Force wave effect
    this.effectsLayer.spawnForceWave(
      origin,
      range,
      { r: 100, g: 100, b: 255 }, // Dark side blue-purple
      400,
      3
    );

    // Emit screen shake event
    this.eventBus.emit({
      type: 'effect:screen_shake',
      data: {
        intensity: 0.4,
        duration: 200,
        source: 'force_push',
      },
    });
  }

  /**
   * Spawn Force Pull visual effects.
   */
  private spawnForcePullEffects(
    origin: { x: number; y: number },
    direction: number,
    range: number
  ): void {
    if (!this.effectsLayer) return;

    // Spawn reverse wave effect (imploding)
    this.effectsLayer.spawnForceWave(
      origin,
      range * 0.7,
      { r: 180, g: 50, b: 200 }, // Dark purple
      350,
      2
    );

    // Emit screen shake event (smaller)
    this.eventBus.emit({
      type: 'effect:screen_shake',
      data: {
        intensity: 0.25,
        duration: 150,
        source: 'force_pull',
      },
    });
  }

  /**
   * Spawn Force Lightning visual effects.
   */
  private spawnForceLightningEffects(
    origin: { x: number; y: number },
    targets: ForceTarget[]
  ): void {
    if (!this.effectsLayer) return;

    // Create lightning to each target
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const source = i === 0 ? origin : targets[i - 1].position;

      this.effectsLayer.spawnLightning(
        source,
        target.position,
        { r: 50, g: 50, b: 255 }, // Dark side blue
        300 + i * 100, // Stagger duration for chain effect
        2 + Math.floor(Math.random() * 2),
        1.0 - i * 0.2 // Intensity falloff
      );
    }

    // Major screen shake for lightning
    this.eventBus.emit({
      type: 'effect:screen_shake',
      data: {
        intensity: 0.6,
        duration: 300,
        source: 'force_lightning',
      },
    });
  }

  /**
   * Emit Force power event.
   */
  private emitPowerEvent(
    powerType: ForcePowerType,
    casterId: EntityId,
    position: { x: number; y: number },
    direction: number,
    targetsHit: EntityId[],
    damage: number
  ): void {
    this.eventBus.emit({
      type: 'force:power_used',
      data: {
        powerType,
        casterId,
        position,
        direction,
        targetsHit,
        damage,
      } as ForcePowerEventData,
    });
  }

  /**
   * Cancel all active powers.
   */
  cancelAllPowers(): void {
    this.activePowers.clear();
  }

  /**
   * Check if any power is active.
   */
  hasActivePower(): boolean {
    return this.activePowers.size > 0;
  }

  /**
   * Get config for a power type.
   */
  getPowerConfig(powerType: ForcePowerType): ForcePowerConfig {
    return FORCE_POWER_CONFIGS[powerType];
  }

  /**
   * Clean up.
   */
  destroy(): void {
    this.activePowers.clear();
    this.cooldowns.clear();
  }
}
