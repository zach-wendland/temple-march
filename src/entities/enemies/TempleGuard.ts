/**
 * Temple Guard Enemy
 * Defensive specialists with pike weapons (lightsaber pikes).
 * Elite protectors of the Jedi Temple with extended reach.
 */

import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy';
import { EnemyType, EnemyState } from './EnemyTypes';
import { CombatManager } from '../../combat/CombatManager';
import { EventBus } from '../../core/events/EventBus';
import { DefenseType } from '../../combat/DamageCalculator';

/**
 * Attack patterns for Temple Guard.
 */
export enum GuardAttack {
  /** Forward pike thrust */
  PikeThrust = 'guard_pike_thrust',
  /** Wide sweeping attack */
  PikeSweep = 'guard_pike_sweep',
  /** Overhead slam */
  PikeSlam = 'guard_pike_slam',
  /** Quick jab */
  QuickJab = 'guard_quick_jab',
  /** Spinning guard attack */
  SpinningStrike = 'guard_spinning_strike',
  /** Defensive push (Force-enhanced) */
  DefensivePush = 'guard_defensive_push',
}

/**
 * Guard stance modes.
 */
export enum GuardStance {
  /** Standard defensive stance */
  Defensive = 'defensive',
  /** Aggressive pressing attack */
  Aggressive = 'aggressive',
  /** Coordinated pair defense */
  Paired = 'paired',
  /** Protecting others */
  Protector = 'protector',
}

/**
 * Temple Guard - defensive pike specialist.
 */
export class TempleGuard extends BaseEnemy {
  // Guard-specific state
  private currentStance: GuardStance = GuardStance.Defensive;
  private pairedGuard: TempleGuard | null = null;
  private protectedTargets: Phaser.GameObjects.Sprite[] = [];
  private consecutiveBlocks: number = 0;
  private lastBlockTime: number = 0;
  private blockFatigueTime: number = 0;

  // Pike mechanics
  private pikeExtended: boolean = false;
  private zoneControlActive: boolean = false;
  private zoneControlEndTime: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    combatManager: CombatManager,
    eventBus: EventBus
  ) {
    super(scene, x, y, EnemyType.TempleGuard, combatManager, eventBus);

    // Visual setup - yellow/gold for Temple Guards
    this.sprite.setTint(0xccaa00);

    // Setup guard-specific behaviors
    this.setupGuardBehaviors();
  }

  /**
   * Perform an attack.
   */
  performAttack(): void {
    const attacks = this.getAvailableAttacks();
    if (attacks.length === 0) return;

    const attackId = this.selectAttack(attacks);

    if (this.combatManager.startAttack(this.id, attackId)) {
      this.currentAttackId = attackId;

      // Pike thrust extends the pike
      if (attackId === GuardAttack.PikeThrust || attackId === GuardAttack.QuickJab) {
        this.pikeExtended = true;
        this.scene.time.delayedCall(300, () => {
          this.pikeExtended = false;
        });
      }

      this.eventBus.emit({
        type: 'enemy:attack',
        data: {
          enemyId: this.id,
          attackId,
          position: this.getPosition(),
        },
      });
    }
  }

  /**
   * Get available attacks for current situation.
   */
  getAvailableAttacks(): string[] {
    const attacks: string[] = [];
    const distance = this.getDistanceToTarget();

    // Pike has excellent reach
    if (distance <= this.config.attackRange) {
      attacks.push(GuardAttack.PikeThrust);
      attacks.push(GuardAttack.QuickJab);
    }

    // Sweep for multiple targets or close range
    if (distance <= this.config.attackRange * 0.8) {
      attacks.push(GuardAttack.PikeSweep);
      attacks.push(GuardAttack.PikeSlam);
    }

    // Special attacks based on stance
    if (this.currentStance === GuardStance.Aggressive) {
      attacks.push(GuardAttack.SpinningStrike);
    }

    // Defensive push when overwhelmed
    if (distance <= 50 && this.consecutiveBlocks >= 3) {
      attacks.push(GuardAttack.DefensivePush);
    }

    return attacks;
  }

  /**
   * Select best attack for current situation.
   */
  private selectAttack(availableAttacks: string[]): string {
    const distance = this.getDistanceToTarget();

    // Stance-based preferences
    switch (this.currentStance) {
      case GuardStance.Defensive:
        // Prefer safe, ranged attacks
        if (availableAttacks.includes(GuardAttack.PikeThrust)) {
          return GuardAttack.PikeThrust;
        }
        break;

      case GuardStance.Aggressive:
        // Prefer heavy attacks
        if (availableAttacks.includes(GuardAttack.PikeSlam)) {
          return GuardAttack.PikeSlam;
        }
        if (availableAttacks.includes(GuardAttack.SpinningStrike)) {
          return GuardAttack.SpinningStrike;
        }
        break;

      case GuardStance.Paired:
        // Coordinate with paired guard - use sweep to cover area
        if (availableAttacks.includes(GuardAttack.PikeSweep)) {
          return GuardAttack.PikeSweep;
        }
        break;

      case GuardStance.Protector:
        // Keep enemies at bay
        if (availableAttacks.includes(GuardAttack.DefensivePush) && distance < 60) {
          return GuardAttack.DefensivePush;
        }
        if (availableAttacks.includes(GuardAttack.PikeSweep)) {
          return GuardAttack.PikeSweep;
        }
        break;
    }

    // Zone control - when under pressure
    if (this.consecutiveBlocks >= 2 && availableAttacks.includes(GuardAttack.PikeSweep)) {
      return GuardAttack.PikeSweep;
    }

    // Default: weighted random
    const weights: Record<string, number> = {
      [GuardAttack.PikeThrust]: 4,
      [GuardAttack.QuickJab]: 3,
      [GuardAttack.PikeSweep]: 2,
      [GuardAttack.PikeSlam]: 1,
      [GuardAttack.SpinningStrike]: 1,
      [GuardAttack.DefensivePush]: 2,
    };

    const weightedAttacks = availableAttacks.flatMap(attack =>
      Array(weights[attack] || 1).fill(attack)
    );

    return weightedAttacks[Math.floor(Math.random() * weightedAttacks.length)];
  }

  /**
   * Set guard stance.
   */
  setStance(stance: GuardStance): void {
    this.currentStance = stance;

    switch (stance) {
      case GuardStance.Defensive:
        this.config.blockChance = 0.7;
        this.config.attackCooldown = 1200;
        break;
      case GuardStance.Aggressive:
        this.config.blockChance = 0.3;
        this.config.attackCooldown = 800;
        break;
      case GuardStance.Paired:
        this.config.blockChance = 0.8; // Better blocking when paired
        this.config.attackCooldown = 1000;
        break;
      case GuardStance.Protector:
        this.config.blockChance = 0.9;
        this.config.attackCooldown = 1400;
        break;
    }

    this.eventBus.emit({
      type: 'enemy:stance_change',
      data: {
        enemyId: this.id,
        stance,
      },
    });
  }

  /**
   * Pair with another guard for coordinated defense.
   */
  pairWith(guard: TempleGuard): void {
    this.pairedGuard = guard;
    this.setStance(GuardStance.Paired);
    guard.pairedGuard = this;
    guard.setStance(GuardStance.Paired);
  }

  /**
   * Set targets to protect.
   */
  setProtectedTargets(targets: Phaser.GameObjects.Sprite[]): void {
    this.protectedTargets = targets;
    if (targets.length > 0) {
      this.setStance(GuardStance.Protector);
    }
  }

  /**
   * Activate zone control - deny area to enemies.
   */
  activateZoneControl(duration: number = 2000): void {
    this.zoneControlActive = true;
    this.zoneControlEndTime = Date.now() + duration;

    // Visual feedback
    this.sprite.setTint(0xffcc00);

    this.eventBus.emit({
      type: 'enemy:zone_control',
      data: {
        enemyId: this.id,
        position: this.getPosition(),
        radius: this.config.attackRange,
        duration,
      },
    });
  }

  /**
   * Handle successful block.
   */
  onBlockSuccess(): void {
    const now = Date.now();

    // Track consecutive blocks for block fatigue
    if (now - this.lastBlockTime < 1000) {
      this.consecutiveBlocks++;
    } else {
      this.consecutiveBlocks = 1;
    }
    this.lastBlockTime = now;

    // Check for parry
    if (this.shouldParry()) {
      this.combatManager.setDefenseType(this.id, DefenseType.Parry);

      // Guards have a powerful parry riposte
      this.eventBus.emit({
        type: 'enemy:parry',
        data: {
          enemyId: this.id,
          position: this.getPosition(),
          isPikeParry: true,
        },
      });

      // Counter with pike thrust
      this.scene.time.delayedCall(150, () => {
        if (this.getCurrentState() === EnemyState.Block) {
          this.stateMachine.transitionTo(EnemyState.Attack);
        }
      });
    }

    // Block fatigue - too many blocks reduces effectiveness
    if (this.consecutiveBlocks >= 5) {
      this.blockFatigueTime = now + 2000; // 2 second fatigue
      this.consecutiveBlocks = 0;
    }

    // Coordinate with paired guard
    if (this.pairedGuard && this.pairedGuard.isAlive()) {
      // Signal paired guard to attack while we block
      this.eventBus.emit({
        type: 'guard:coordinate',
        data: {
          blockingGuardId: this.id,
          attackingGuardId: this.pairedGuard.id,
        },
      });
    }
  }

  /**
   * Check if blocking is effective (not fatigued).
   */
  isBlockEffective(): boolean {
    return Date.now() > this.blockFatigueTime;
  }

  /**
   * Setup guard-specific AI behaviors.
   */
  private setupGuardBehaviors(): void {
    // Override chase to include pike spacing
    const originalChase = this.handleChaseUpdate.bind(this);
    this.handleChaseUpdate = (deltaMs: number) => {
      // Update zone control
      if (this.zoneControlActive && Date.now() >= this.zoneControlEndTime) {
        this.zoneControlActive = false;
        this.sprite.setTint(0xccaa00);
      }

      // Protector stance - stay near protected targets
      if (this.currentStance === GuardStance.Protector && this.protectedTargets.length > 0) {
        this.handleProtectorBehavior(deltaMs);
        return;
      }

      // Paired stance - coordinate with partner
      if (this.currentStance === GuardStance.Paired && this.pairedGuard) {
        this.handlePairedBehavior(deltaMs);
        return;
      }

      if (!this.target) {
        originalChase(deltaMs);
        return;
      }

      const distance = this.getDistanceToTarget();

      // Pike gives good reach - maintain distance
      if (distance < this.config.preferredDistance * 0.6) {
        // Too close, back off while attacking
        const dir = this.getDirectionToTarget();
        this.body.setVelocity(
          -dir.x * this.config.moveSpeed * 0.8,
          -dir.y * this.config.moveSpeed * 0.8
        );

        // Counter-attack while retreating
        if (this.canAttack()) {
          this.stateMachine.transitionTo(EnemyState.Attack);
        }
      } else if (distance > this.config.attackRange * 0.9) {
        // Close distance to optimal range
        this.moveToward(this.target.x, this.target.y, 0.8);
      } else {
        // Optimal range - hold position and attack
        this.stopMovement();
        if (this.canAttack()) {
          this.stateMachine.transitionTo(EnemyState.Attack);
        }
      }

      this.faceTarget();
    };
  }

  /**
   * Handle protector behavior - guard a position/target.
   */
  private handleProtectorBehavior(deltaMs: number): void {
    if (this.protectedTargets.length === 0) return;

    // Calculate center of protected targets
    let centerX = 0;
    let centerY = 0;
    let activeTargets = 0;

    for (const target of this.protectedTargets) {
      if (target.active) {
        centerX += target.x;
        centerY += target.y;
        activeTargets++;
      }
    }

    if (activeTargets === 0) {
      this.setStance(GuardStance.Defensive);
      return;
    }

    centerX /= activeTargets;
    centerY /= activeTargets;

    // Stay between threat and protected targets
    if (this.target) {
      const targetAngle = Phaser.Math.Angle.Between(
        centerX, centerY,
        this.target.x, this.target.y
      );

      const guardX = centerX + Math.cos(targetAngle) * 60;
      const guardY = centerY + Math.sin(targetAngle) * 60;

      const distToGuardPos = Phaser.Math.Distance.Between(
        this.sprite.x, this.sprite.y,
        guardX, guardY
      );

      if (distToGuardPos > 20) {
        this.moveToward(guardX, guardY);
      } else {
        this.stopMovement();
      }

      this.faceTarget();

      // Attack if threat gets too close
      if (this.getDistanceToTarget() <= this.config.attackRange && this.canAttack()) {
        this.stateMachine.transitionTo(EnemyState.Attack);
      }
    } else {
      // No threat, stay near center
      const distToCenter = Phaser.Math.Distance.Between(
        this.sprite.x, this.sprite.y,
        centerX, centerY
      );

      if (distToCenter > 80) {
        this.moveToward(centerX, centerY);
      } else {
        this.stopMovement();
      }
    }
  }

  /**
   * Handle paired guard behavior.
   */
  private handlePairedBehavior(deltaMs: number): void {
    if (!this.pairedGuard || !this.pairedGuard.isAlive()) {
      this.pairedGuard = null;
      this.setStance(GuardStance.Defensive);
      return;
    }

    if (!this.target) return;

    // Position opposite to paired guard relative to target
    const partnerAngle = Phaser.Math.Angle.Between(
      this.target.x, this.target.y,
      this.pairedGuard.sprite.x, this.pairedGuard.sprite.y
    );

    // We want to be on the opposite side
    const myAngle = partnerAngle + Math.PI;
    const desiredX = this.target.x + Math.cos(myAngle) * this.config.preferredDistance;
    const desiredY = this.target.y + Math.sin(myAngle) * this.config.preferredDistance;

    const distToDesired = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      desiredX, desiredY
    );

    if (distToDesired > 30) {
      this.moveToward(desiredX, desiredY);
    } else {
      this.stopMovement();
    }

    this.faceTarget();

    // Attack when in position
    if (this.isTargetInAttackRange() && this.canAttack()) {
      this.stateMachine.transitionTo(EnemyState.Attack);
    }
  }

  /**
   * Override take damage for guard-specific reactions.
   */
  takeDamage(damage: number, knockbackX: number = 0, knockbackY: number = 0): void {
    // Check if we should auto-block (guards are excellent blockers)
    if (this.getCurrentState() !== EnemyState.Hitstun &&
        this.getCurrentState() !== EnemyState.Staggered &&
        this.isBlockEffective() &&
        this.shouldBlock()) {
      this.stateMachine.transitionTo(EnemyState.Block);
      this.onBlockSuccess();
      return;
    }

    super.takeDamage(damage, knockbackX, knockbackY);

    // If low health, become more aggressive (desperate defense)
    if (this.stats.health < this.stats.maxHealth * 0.25 && this.currentStance !== GuardStance.Aggressive) {
      this.setStance(GuardStance.Aggressive);
    }
  }

  /**
   * Override destroy to clean up paired guard reference.
   */
  destroy(): void {
    if (this.pairedGuard) {
      this.pairedGuard.pairedGuard = null;
      this.pairedGuard.setStance(GuardStance.Defensive);
    }
    super.destroy();
  }
}
