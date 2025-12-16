/**
 * Clone Trooper Enemy
 * Ranged attacker with formation-based tactics.
 * 501st Legion troopers - can be allies or enemies depending on scenario.
 */

import Phaser from 'phaser';
import { BaseEnemy, AIBehavior } from './BaseEnemy';
import { EnemyType, EnemyState } from './EnemyTypes';
import { CombatManager } from '../../combat/CombatManager';
import { EventBus } from '../../core/events/EventBus';

/**
 * Attack patterns for Clone Trooper.
 */
export enum CloneAttack {
  /** Single blaster shot */
  BlasterShot = 'clone_blaster_shot',
  /** Rapid fire burst (3 shots) */
  BlasterBurst = 'clone_blaster_burst',
  /** Suppression fire (continuous) */
  SuppressiveFire = 'clone_suppressive_fire',
  /** Thermal detonator throw */
  ThermalDetonator = 'clone_thermal_detonator',
  /** Rifle melee (desperation) */
  RifleButt = 'clone_rifle_butt',
}

/**
 * Formation role for group tactics.
 */
export enum FormationRole {
  /** Front-line shooter */
  Frontline = 'frontline',
  /** Flanking attacker */
  Flanker = 'flanker',
  /** Suppression/covering fire */
  Suppressor = 'suppressor',
  /** Leader coordinating squad */
  Leader = 'leader',
}

/**
 * Clone Trooper - ranged attacker with squad tactics.
 */
export class CloneTrooper extends BaseEnemy {
  // Ranged combat
  private lastFireTime: number = 0;
  private burstCount: number = 0;
  private isFiring: boolean = false;
  private suppressionEndTime: number = 0;

  // Formation and squad
  private formationRole: FormationRole = FormationRole.Frontline;
  private squadId: string | null = null;
  private assignedPosition: { x: number; y: number } | null = null;

  // Tactical state
  private isInCover: boolean = false;
  private coverPosition: { x: number; y: number } | null = null;
  private lastRepositionTime: number = 0;
  private repositionCooldown: number = 3000;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    combatManager: CombatManager,
    eventBus: EventBus
  ) {
    super(scene, x, y, EnemyType.CloneTrooper, combatManager, eventBus);

    // Visual setup - 501st blue markings
    this.sprite.setTint(0x3366cc);

    // Setup clone-specific behaviors
    this.setupCloneBehaviors();
  }

  /**
   * Perform an attack (ranged).
   */
  performAttack(): void {
    const attacks = this.getAvailableAttacks();
    if (attacks.length === 0) return;

    const attackId = this.selectAttack(attacks);

    if (attackId === CloneAttack.BlasterBurst) {
      this.performBurstFire();
    } else if (attackId === CloneAttack.SuppressiveFire) {
      this.startSuppressiveFire();
    } else {
      this.fireSingleShot(attackId);
    }
  }

  /**
   * Get available attacks for current situation.
   */
  getAvailableAttacks(): string[] {
    const attacks: string[] = [];
    const distance = this.getDistanceToTarget();

    // Standard blaster attacks
    if (distance <= this.config.attackRange && distance > 50) {
      attacks.push(CloneAttack.BlasterShot);
      attacks.push(CloneAttack.BlasterBurst);
    }

    // Suppressive fire for suppressor role
    if (this.formationRole === FormationRole.Suppressor && distance <= this.config.attackRange) {
      attacks.push(CloneAttack.SuppressiveFire);
    }

    // Thermal detonator for longer range or groups
    if (distance >= 100 && distance <= 300) {
      attacks.push(CloneAttack.ThermalDetonator);
    }

    // Melee as last resort
    if (distance <= 40) {
      attacks.push(CloneAttack.RifleButt);
    }

    return attacks;
  }

  /**
   * Select best attack for current situation.
   */
  private selectAttack(availableAttacks: string[]): string {
    // Formation role influences attack choice
    switch (this.formationRole) {
      case FormationRole.Suppressor:
        if (availableAttacks.includes(CloneAttack.SuppressiveFire)) {
          return CloneAttack.SuppressiveFire;
        }
        break;
      case FormationRole.Flanker:
        // Flankers prefer burst fire for damage
        if (availableAttacks.includes(CloneAttack.BlasterBurst)) {
          return CloneAttack.BlasterBurst;
        }
        break;
      case FormationRole.Leader:
        // Leaders use tactical weapons
        if (availableAttacks.includes(CloneAttack.ThermalDetonator) && Math.random() < 0.3) {
          return CloneAttack.ThermalDetonator;
        }
        break;
    }

    // Default: weighted random
    const weights: Record<string, number> = {
      [CloneAttack.BlasterShot]: 4,
      [CloneAttack.BlasterBurst]: 2,
      [CloneAttack.ThermalDetonator]: 1,
      [CloneAttack.RifleButt]: 1,
      [CloneAttack.SuppressiveFire]: 1,
    };

    const weightedAttacks = availableAttacks.flatMap(attack =>
      Array(weights[attack] || 1).fill(attack)
    );

    return weightedAttacks[Math.floor(Math.random() * weightedAttacks.length)];
  }

  /**
   * Fire a single shot.
   */
  private fireSingleShot(attackId: string): void {
    if (this.combatManager.startAttack(this.id, attackId)) {
      this.currentAttackId = attackId;
      this.lastFireTime = Date.now();
      this.isFiring = true;

      // Create projectile
      this.createBlasterBolt();

      // Brief firing animation
      this.scene.time.delayedCall(100, () => {
        this.isFiring = false;
      });

      this.eventBus.emit({
        type: 'enemy:attack',
        data: {
          enemyId: this.id,
          attackId,
          position: this.getPosition(),
          isProjectile: true,
        },
      });
    }
  }

  /**
   * Fire a burst of shots.
   */
  private performBurstFire(): void {
    this.burstCount = 0;
    this.isFiring = true;

    const fireBurst = () => {
      if (this.burstCount >= 3 || !this.isAlive()) {
        this.isFiring = false;
        return;
      }

      this.createBlasterBolt();
      this.burstCount++;

      if (this.burstCount < 3) {
        this.scene.time.delayedCall(100, fireBurst);
      } else {
        this.isFiring = false;
      }
    };

    fireBurst();

    this.eventBus.emit({
      type: 'enemy:attack',
      data: {
        enemyId: this.id,
        attackId: CloneAttack.BlasterBurst,
        position: this.getPosition(),
        isProjectile: true,
      },
    });
  }

  /**
   * Start suppressive fire mode.
   */
  private startSuppressiveFire(): void {
    this.isFiring = true;
    this.suppressionEndTime = Date.now() + 2000; // 2 seconds of suppression

    const fireSuppress = () => {
      if (Date.now() >= this.suppressionEndTime || !this.isAlive()) {
        this.isFiring = false;
        return;
      }

      this.createBlasterBolt();
      this.scene.time.delayedCall(150, fireSuppress); // Faster fire rate
    };

    fireSuppress();

    this.eventBus.emit({
      type: 'enemy:attack',
      data: {
        enemyId: this.id,
        attackId: CloneAttack.SuppressiveFire,
        position: this.getPosition(),
        isSuppression: true,
      },
    });
  }

  /**
   * Create a blaster bolt projectile.
   */
  private createBlasterBolt(): void {
    if (!this.target) return;

    // Calculate direction to target with some spread
    const spread = (Math.random() - 0.5) * 0.1; // Small spread
    const angle = Phaser.Math.Angle.Between(
      this.sprite.x,
      this.sprite.y,
      this.target.x,
      this.target.y
    ) + spread;

    const boltX = this.sprite.x + Math.cos(angle) * 20; // Spawn offset
    const boltY = this.sprite.y + Math.sin(angle) * 20;

    // Emit projectile creation event (projectile manager handles actual creation)
    this.eventBus.emit({
      type: 'projectile:create',
      data: {
        ownerId: this.id,
        type: 'blaster_bolt',
        x: boltX,
        y: boltY,
        velocityX: Math.cos(angle) * this.config.projectileSpeed,
        velocityY: Math.sin(angle) * this.config.projectileSpeed,
        damage: this.config.attackDamage,
      },
    });
  }

  /**
   * Set formation role.
   */
  setFormationRole(role: FormationRole): void {
    this.formationRole = role;

    // Adjust behavior based on role
    switch (role) {
      case FormationRole.Suppressor:
        this.config.preferredDistance = 300; // Stay back
        break;
      case FormationRole.Flanker:
        this.config.preferredDistance = 200;
        this.config.moveSpeed *= 1.2; // Faster movement
        break;
      case FormationRole.Frontline:
        this.config.preferredDistance = 250;
        break;
      case FormationRole.Leader:
        this.config.preferredDistance = 280;
        break;
    }
  }

  /**
   * Set squad ID for coordination.
   */
  setSquad(squadId: string): void {
    this.squadId = squadId;
  }

  /**
   * Get squad ID.
   */
  getSquadId(): string | null {
    return this.squadId;
  }

  /**
   * Set assigned formation position.
   */
  setAssignedPosition(x: number, y: number): void {
    this.assignedPosition = { x, y };
  }

  /**
   * Move to cover.
   */
  seekCover(coverX: number, coverY: number): void {
    this.coverPosition = { x: coverX, y: coverY };
    this.isInCover = false;
    // Will move to cover in chase update
  }

  /**
   * Setup clone-specific AI behaviors.
   */
  private setupCloneBehaviors(): void {
    // Override chase to include tactical positioning
    const originalChase = this.handleChaseUpdate.bind(this);
    this.handleChaseUpdate = (deltaMs: number) => {
      if (!this.target) {
        originalChase(deltaMs);
        return;
      }

      const distance = this.getDistanceToTarget();

      // If we need to move to cover
      if (this.coverPosition && !this.isInCover) {
        const coverDist = Phaser.Math.Distance.Between(
          this.sprite.x,
          this.sprite.y,
          this.coverPosition.x,
          this.coverPosition.y
        );

        if (coverDist > 20) {
          this.moveToward(this.coverPosition.x, this.coverPosition.y);
          return;
        } else {
          this.isInCover = true;
          this.coverPosition = null;
        }
      }

      // If we have an assigned formation position
      if (this.assignedPosition) {
        const formDist = Phaser.Math.Distance.Between(
          this.sprite.x,
          this.sprite.y,
          this.assignedPosition.x,
          this.assignedPosition.y
        );

        if (formDist > 30) {
          this.moveToward(this.assignedPosition.x, this.assignedPosition.y);
          return;
        }
      }

      // Flanker behavior
      if (this.formationRole === FormationRole.Flanker) {
        this.performFlanking(deltaMs);
        return;
      }

      // Standard ranged behavior - maintain distance
      if (distance < this.config.preferredDistance * 0.7) {
        // Too close, back off
        const dir = this.getDirectionToTarget();
        this.body.setVelocity(
          -dir.x * this.config.moveSpeed,
          -dir.y * this.config.moveSpeed
        );
      } else if (distance > this.config.attackRange * 0.9) {
        // Too far, close in
        this.moveToward(this.target.x, this.target.y);
      } else {
        // Good range, strafe
        this.performStrafe(deltaMs);
      }

      // Always face target when in range
      this.faceTarget();

      // Check for attack
      if (distance <= this.config.attackRange && this.canAttack()) {
        this.stateMachine.transitionTo(EnemyState.Attack);
      }
    };
  }

  /**
   * Perform strafing movement.
   */
  private performStrafe(deltaMs: number): void {
    if (!this.target) return;

    const dirToTarget = this.getDirectionToTarget();
    const perpX = -dirToTarget.y;
    const perpY = dirToTarget.x;

    // Change strafe direction periodically
    const strafeDir = Math.sin(Date.now() / 2000 + this.id * 0.5) > 0 ? 1 : -1;

    this.body.setVelocity(
      perpX * this.config.moveSpeed * 0.4 * strafeDir,
      perpY * this.config.moveSpeed * 0.4 * strafeDir
    );
  }

  /**
   * Perform flanking movement.
   */
  private performFlanking(deltaMs: number): void {
    if (!this.target) return;

    const distance = this.getDistanceToTarget();
    const dirToTarget = this.getDirectionToTarget();

    // Calculate flanking angle (try to get to side/behind)
    const flankAngle = Math.PI / 3; // 60 degrees off-center
    const flankDir = this.id % 2 === 0 ? 1 : -1; // Alternate sides

    const desiredAngle = Math.atan2(dirToTarget.y, dirToTarget.x) + flankAngle * flankDir;
    const desiredX = this.target.x - Math.cos(desiredAngle) * this.config.preferredDistance;
    const desiredY = this.target.y - Math.sin(desiredAngle) * this.config.preferredDistance;

    // Move toward flanking position
    const toFlank = Phaser.Math.Distance.Between(
      this.sprite.x,
      this.sprite.y,
      desiredX,
      desiredY
    );

    if (toFlank > 20) {
      this.moveToward(desiredX, desiredY);
    } else {
      this.stopMovement();
    }

    this.faceTarget();
  }

  /**
   * Check if repositioning is needed.
   */
  shouldReposition(): boolean {
    const now = Date.now();
    if (now - this.lastRepositionTime < this.repositionCooldown) {
      return false;
    }

    // Reposition if:
    // - Too close to target
    // - In bad position for role
    // - Taking heavy damage
    const distance = this.getDistanceToTarget();
    const tooClose = distance < this.config.preferredDistance * 0.5;
    const lowHealth = this.stats.health < this.stats.maxHealth * 0.3;

    return tooClose || lowHealth;
  }

  /**
   * Override take damage to trigger repositioning.
   */
  takeDamage(damage: number, knockbackX: number = 0, knockbackY: number = 0): void {
    super.takeDamage(damage, knockbackX, knockbackY);

    // Check if we should reposition after taking damage
    if (this.shouldReposition() && this.isAlive()) {
      this.lastRepositionTime = Date.now();
      this.stateMachine.transitionTo(EnemyState.Retreat);
    }
  }
}
