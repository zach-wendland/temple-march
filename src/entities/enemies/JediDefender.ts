/**
 * Jedi Defender Enemy
 * Melee lightsaber combatant that can block and parry.
 * Represents the Knights defending the Temple during Order 66.
 */

import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy';
import { EnemyType, EnemyState } from './EnemyTypes';
import { CombatManager } from '../../combat/CombatManager';
import { EventBus } from '../../core/events/EventBus';
import { DefenseType } from '../../combat/DamageCalculator';

/**
 * Attack patterns for Jedi Defender.
 */
export enum JediAttack {
  /** Quick horizontal slash */
  LightSlash = 'jedi_light_slash',
  /** Powerful overhead strike */
  HeavySlash = 'jedi_heavy_slash',
  /** Sweeping attack for multiple targets */
  SpinAttack = 'jedi_spin_attack',
  /** Rising diagonal cut */
  RisingSlash = 'jedi_rising_slash',
  /** Quick thrust */
  Thrust = 'jedi_thrust',
}

/**
 * Jedi Defender - melee lightsaber combatant.
 */
export class JediDefender extends BaseEnemy {
  // Combat tracking
  private comboCount: number = 0;
  private maxCombo: number = 3;
  private lastBlockedTime: number = 0;
  private counterAttackWindow: number = 300; // ms

  // Form-based fighting style
  private currentForm: 'defensive' | 'aggressive' = 'defensive';

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    combatManager: CombatManager,
    eventBus: EventBus
  ) {
    super(scene, x, y, EnemyType.JediDefender, combatManager, eventBus);

    // Visual setup
    this.sprite.setTint(0x4488ff); // Blue tint for Jedi

    // Setup Jedi-specific behaviors
    this.setupJediBehaviors();
  }

  /**
   * Perform an attack.
   */
  performAttack(): void {
    const attacks = this.getAvailableAttacks();
    if (attacks.length === 0) return;

    // Choose attack based on situation
    let attackId = this.selectAttack(attacks);

    // Start the attack
    if (this.combatManager.startAttack(this.id, attackId)) {
      this.currentAttackId = attackId;
      this.comboCount++;

      // Reset combo after max
      if (this.comboCount >= this.maxCombo) {
        this.comboCount = 0;
      }

      // Emit attack event
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

    // Light attacks are always available in range
    if (distance <= this.config.attackRange) {
      attacks.push(JediAttack.LightSlash);
      attacks.push(JediAttack.Thrust);
    }

    // Heavy attacks if target is close
    if (distance <= this.config.attackRange * 0.8) {
      attacks.push(JediAttack.HeavySlash);
      attacks.push(JediAttack.RisingSlash);
    }

    // Spin attack for group situations (check nearby enemies)
    if (this.isGroupFight()) {
      attacks.push(JediAttack.SpinAttack);
    }

    return attacks;
  }

  /**
   * Select best attack for current situation.
   */
  private selectAttack(availableAttacks: string[]): string {
    // Counter-attack opportunity
    if (Date.now() - this.lastBlockedTime < this.counterAttackWindow) {
      // Quick counter
      if (availableAttacks.includes(JediAttack.Thrust)) {
        return JediAttack.Thrust;
      }
    }

    // Combo chain
    if (this.comboCount === 1 && availableAttacks.includes(JediAttack.HeavySlash)) {
      return JediAttack.HeavySlash;
    }
    if (this.comboCount === 2 && availableAttacks.includes(JediAttack.RisingSlash)) {
      return JediAttack.RisingSlash;
    }

    // Default: random from available with weighting
    const weights: Record<string, number> = {
      [JediAttack.LightSlash]: 3,
      [JediAttack.Thrust]: 2,
      [JediAttack.HeavySlash]: 1,
      [JediAttack.RisingSlash]: 1,
      [JediAttack.SpinAttack]: 2,
    };

    const weightedAttacks = availableAttacks.flatMap(attack =>
      Array(weights[attack] || 1).fill(attack)
    );

    return weightedAttacks[Math.floor(Math.random() * weightedAttacks.length)];
  }

  /**
   * Check if this is a group fight (multiple enemies nearby).
   */
  private isGroupFight(): boolean {
    // This would check for nearby allied enemies
    // For now, return false - will be implemented with group coordination
    return false;
  }

  /**
   * Handle successful block.
   */
  onBlockSuccess(): void {
    this.lastBlockedTime = Date.now();

    // Check for parry
    if (this.shouldParry()) {
      this.combatManager.setDefenseType(this.id, DefenseType.Parry);

      // Emit parry event for visual feedback
      this.eventBus.emit({
        type: 'enemy:parry',
        data: {
          enemyId: this.id,
          position: this.getPosition(),
        },
      });

      // Quick transition to counter-attack
      this.scene.time.delayedCall(100, () => {
        if (this.getCurrentState() === EnemyState.Block) {
          this.stateMachine.transitionTo(EnemyState.Attack);
        }
      });
    }
  }

  /**
   * Switch fighting form based on situation.
   */
  switchForm(form: 'defensive' | 'aggressive'): void {
    this.currentForm = form;

    if (form === 'defensive') {
      // Increase block chance, decrease attack frequency
      this.config.blockChance = Math.min(0.6, this.config.blockChance * 1.5);
      this.config.attackCooldown *= 1.2;
    } else {
      // Decrease block chance, increase attack frequency
      this.config.blockChance *= 0.7;
      this.config.attackCooldown *= 0.8;
    }
  }

  /**
   * Setup Jedi-specific AI behaviors.
   */
  private setupJediBehaviors(): void {
    // Override chase behavior to include strafing
    const originalChase = this.handleChaseUpdate.bind(this);
    this.handleChaseUpdate = (deltaMs: number) => {
      if (!this.target) {
        originalChase(deltaMs);
        return;
      }

      const distance = this.getDistanceToTarget();

      // At optimal range, strafe instead of directly approaching
      if (distance >= this.config.preferredDistance * 0.9 &&
          distance <= this.config.preferredDistance * 1.2) {
        this.performStrafe(deltaMs);
      } else {
        originalChase(deltaMs);
      }

      // Adapt form based on health
      if (this.stats.health < this.stats.maxHealth * 0.3) {
        this.switchForm('aggressive'); // Desperate attack
      }
    };
  }

  /**
   * Perform strafing movement.
   */
  private performStrafe(deltaMs: number): void {
    if (!this.target) return;

    // Calculate perpendicular direction
    const dirToTarget = this.getDirectionToTarget();
    const perpX = -dirToTarget.y;
    const perpY = dirToTarget.x;

    // Strafe direction changes periodically
    const strafeDir = Math.sin(Date.now() / 1000) > 0 ? 1 : -1;

    this.body.setVelocity(
      perpX * this.config.moveSpeed * 0.6 * strafeDir,
      perpY * this.config.moveSpeed * 0.6 * strafeDir
    );

    // Always face target
    this.faceTarget();
  }

  /**
   * Override take damage to potentially block.
   */
  takeDamage(damage: number, knockbackX: number = 0, knockbackY: number = 0): void {
    // Check if we should auto-block
    if (this.getCurrentState() !== EnemyState.Hitstun &&
        this.getCurrentState() !== EnemyState.Staggered &&
        this.shouldBlock()) {
      // Successful block
      this.stateMachine.transitionTo(EnemyState.Block);
      this.onBlockSuccess();
      return;
    }

    super.takeDamage(damage, knockbackX, knockbackY);
  }
}
