/**
 * Base Enemy Class
 * Foundation for all enemy types in Temple March.
 * Implements state machine, combat integration, and common behaviors.
 */

import Phaser from 'phaser';
import { StateMachine, State, Transition } from '../../systems/combat/StateMachine';
import { CombatManager } from '../../combat/CombatManager';
import { EventBus, GameEvent } from '../../core/events/EventBus';
import { EntityId } from '../../core/types';
import { CombatStats, DefenseType } from '../../combat/DamageCalculator';
import {
  EnemyType,
  EnemyState,
  EnemyConfig,
  getEnemyConfig,
  createEnemyCombatStats,
} from './EnemyTypes';

/**
 * Enemy context for state machine.
 */
export interface EnemyContext {
  enemy: BaseEnemy;
  target: Phaser.GameObjects.Sprite | null;
  deltaMs: number;
}

/**
 * AI Behavior interface - pluggable behaviors for enemies.
 */
export interface AIBehavior {
  /** Behavior name */
  readonly name: string;
  /** Check if this behavior should activate */
  shouldActivate(enemy: BaseEnemy, target: Phaser.GameObjects.Sprite | null): boolean;
  /** Execute the behavior */
  execute(enemy: BaseEnemy, target: Phaser.GameObjects.Sprite | null, deltaMs: number): void;
  /** Called when behavior is interrupted */
  onInterrupt?(enemy: BaseEnemy): void;
}

/**
 * Base Enemy class - abstract foundation for all enemies.
 */
export abstract class BaseEnemy {
  // Identity
  readonly id: EntityId;
  readonly config: EnemyConfig;

  // Phaser objects
  protected scene: Phaser.Scene;
  protected sprite: Phaser.GameObjects.Sprite;
  protected body: Phaser.Physics.Arcade.Body;

  // Systems
  protected combatManager: CombatManager;
  protected eventBus: EventBus;
  protected stateMachine: StateMachine<EnemyContext>;

  // AI
  protected behaviors: Map<string, AIBehavior> = new Map();
  protected activeBehavior: AIBehavior | null = null;

  // Combat state
  protected stats: CombatStats;
  protected facingRight: boolean = true;
  protected lastAttackTime: number = 0;
  protected blockStartTime: number = 0;
  protected hitstunRemaining: number = 0;
  protected staggerDuration: number = 0;
  protected currentAttackId: string | null = null;

  // Target tracking
  protected target: Phaser.GameObjects.Sprite | null = null;
  protected lastKnownTargetPosition: { x: number; y: number } | null = null;

  // Patrol
  protected patrolPoints: { x: number; y: number }[] = [];
  protected currentPatrolIndex: number = 0;
  protected patrolWaitTime: number = 0;

  // State flags
  protected isActive: boolean = true;
  protected isDying: boolean = false;

  // Static ID counter
  private static nextId: EntityId = 1000; // Start enemies at 1000 to avoid conflict with player

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    enemyType: EnemyType,
    combatManager: CombatManager,
    eventBus: EventBus
  ) {
    this.id = BaseEnemy.nextId++;
    this.scene = scene;
    this.combatManager = combatManager;
    this.eventBus = eventBus;
    this.config = getEnemyConfig(enemyType);

    // Create sprite
    this.sprite = scene.add.sprite(x, y, this.config.spriteKey);
    this.sprite.setDepth(90); // Below player

    // Add physics
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.body.setSize(this.config.bodyWidth, this.config.bodyHeight);

    // Initialize stats
    this.stats = createEnemyCombatStats(this.config);

    // Initialize state machine
    this.stateMachine = new StateMachine<EnemyContext>();
    this.setupStateMachine();

    // Register with combat manager
    this.combatManager.registerEntity(this.id, this.sprite, this.stats, false);

    // Setup event listeners
    this.setupEvents();
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Get sprite reference.
   */
  getSprite(): Phaser.GameObjects.Sprite {
    return this.sprite;
  }

  /**
   * Get current position.
   */
  getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  /**
   * Get current health.
   */
  getHealth(): number {
    return this.stats.health;
  }

  /**
   * Get max health.
   */
  getMaxHealth(): number {
    return this.stats.maxHealth;
  }

  /**
   * Get current state.
   */
  getCurrentState(): EnemyState {
    return (this.stateMachine.currentState?.name as EnemyState) ?? EnemyState.Idle;
  }

  /**
   * Is enemy facing right?
   */
  isFacingRight(): boolean {
    return this.facingRight;
  }

  /**
   * Is enemy alive?
   */
  isAlive(): boolean {
    return this.stats.health > 0 && !this.isDying;
  }

  /**
   * Is enemy active (not pooled)?
   */
  getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * Get enemy type.
   */
  getType(): EnemyType {
    return this.config.type;
  }

  /**
   * Set target for AI.
   */
  setTarget(target: Phaser.GameObjects.Sprite | null): void {
    this.target = target;
    if (target) {
      this.lastKnownTargetPosition = { x: target.x, y: target.y };
    }
  }

  /**
   * Get current target.
   */
  getTarget(): Phaser.GameObjects.Sprite | null {
    return this.target;
  }

  /**
   * Set patrol points.
   */
  setPatrolPoints(points: { x: number; y: number }[]): void {
    this.patrolPoints = points;
    this.currentPatrolIndex = 0;
  }

  /**
   * Add an AI behavior.
   */
  addBehavior(behavior: AIBehavior): void {
    this.behaviors.set(behavior.name, behavior);
  }

  /**
   * Get distance to target.
   */
  getDistanceToTarget(): number {
    if (!this.target) return Infinity;
    return Phaser.Math.Distance.Between(
      this.sprite.x,
      this.sprite.y,
      this.target.x,
      this.target.y
    );
  }

  /**
   * Get direction to target.
   */
  getDirectionToTarget(): { x: number; y: number } {
    if (!this.target) return { x: 0, y: 0 };
    const angle = Phaser.Math.Angle.Between(
      this.sprite.x,
      this.sprite.y,
      this.target.x,
      this.target.y
    );
    return {
      x: Math.cos(angle),
      y: Math.sin(angle),
    };
  }

  /**
   * Check if target is in range.
   */
  isTargetInAttackRange(): boolean {
    return this.getDistanceToTarget() <= this.config.attackRange;
  }

  /**
   * Check if target is in detection range.
   */
  isTargetInDetectionRange(): boolean {
    return this.getDistanceToTarget() <= this.config.detectionRange;
  }

  /**
   * Move toward a position.
   */
  moveToward(x: number, y: number, speedMultiplier: number = 1.0): void {
    const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, x, y);
    const speed = this.config.moveSpeed * speedMultiplier;

    this.body.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );

    // Update facing direction
    this.facingRight = Math.cos(angle) > 0;
    this.sprite.setFlipX(!this.facingRight);
  }

  /**
   * Stop movement.
   */
  stopMovement(): void {
    this.body.setVelocity(0, 0);
  }

  /**
   * Face toward a position.
   */
  faceToward(x: number, y: number): void {
    this.facingRight = x > this.sprite.x;
    this.sprite.setFlipX(!this.facingRight);
  }

  /**
   * Face toward target.
   */
  faceTarget(): void {
    if (this.target) {
      this.faceToward(this.target.x, this.target.y);
    }
  }

  /**
   * Take damage.
   */
  takeDamage(damage: number, knockbackX: number = 0, knockbackY: number = 0): void {
    this.stats.health = Math.max(0, this.stats.health - damage);

    // Apply knockback
    if (knockbackX !== 0 || knockbackY !== 0) {
      this.body.setVelocity(knockbackX, knockbackY);
    }

    if (this.stats.health <= 0) {
      this.die();
    } else {
      this.stateMachine.transitionTo(EnemyState.Hitstun);
    }

    // Emit damage event
    this.eventBus.emit({
      type: 'enemy:damaged',
      data: {
        enemyId: this.id,
        damage,
        currentHealth: this.stats.health,
        maxHealth: this.stats.maxHealth,
      },
    });
  }

  /**
   * Handle death.
   */
  die(): void {
    if (this.isDying) return;
    this.isDying = true;

    this.stateMachine.transitionTo(EnemyState.Dead);

    this.eventBus.emit({
      type: 'enemy:death',
      data: {
        enemyId: this.id,
        enemyType: this.config.type,
        position: this.getPosition(),
      },
    });
  }

  /**
   * Update enemy - call every frame.
   */
  update(deltaMs: number): void {
    if (!this.isActive) return;

    // Update target position tracking
    if (this.target && this.target.active) {
      this.lastKnownTargetPosition = { x: this.target.x, y: this.target.y };
    }

    // Update state machine
    const context: EnemyContext = {
      enemy: this,
      target: this.target,
      deltaMs,
    };
    this.stateMachine.setContext(context);
    this.stateMachine.update(deltaMs);

    // Update hitstun
    if (this.hitstunRemaining > 0) {
      this.hitstunRemaining = Math.max(0, this.hitstunRemaining - deltaMs);
    }

    // Update stagger
    if (this.staggerDuration > 0) {
      this.staggerDuration = Math.max(0, this.staggerDuration - deltaMs);
    }

    // Update facing direction based on velocity
    if (Math.abs(this.body.velocity.x) > 10) {
      this.facingRight = this.body.velocity.x > 0;
      this.sprite.setFlipX(!this.facingRight);
    }
  }

  /**
   * Activate enemy (from pool).
   */
  activate(x: number, y: number): void {
    this.isActive = true;
    this.isDying = false;
    this.sprite.setActive(true);
    this.sprite.setVisible(true);
    this.sprite.setPosition(x, y);

    // Reset stats
    this.stats = createEnemyCombatStats(this.config);
    this.hitstunRemaining = 0;
    this.staggerDuration = 0;
    this.lastAttackTime = 0;
    this.currentAttackId = null;
    this.target = null;
    this.lastKnownTargetPosition = null;

    // Restart state machine
    this.stateMachine.start(EnemyState.Idle, {
      enemy: this,
      target: null,
      deltaMs: 0,
    });

    // Re-register with combat manager
    this.combatManager.registerEntity(this.id, this.sprite, this.stats, false);
  }

  /**
   * Deactivate enemy (return to pool).
   */
  deactivate(): void {
    this.isActive = false;
    this.sprite.setActive(false);
    this.sprite.setVisible(false);
    this.body.setVelocity(0, 0);
    this.stateMachine.stop();

    // Unregister from combat
    this.combatManager.unregisterEntity(this.id);
  }

  /**
   * Destroy enemy completely.
   */
  destroy(): void {
    this.deactivate();
    this.sprite.destroy();
  }

  // ==========================================================================
  // ABSTRACT METHODS - Subclasses must implement
  // ==========================================================================

  /**
   * Perform an attack - implemented by subclasses.
   */
  abstract performAttack(): void;

  /**
   * Get available attacks for current situation.
   */
  abstract getAvailableAttacks(): string[];

  // ==========================================================================
  // STATE MACHINE SETUP
  // ==========================================================================

  /**
   * Setup state machine with all states and transitions.
   */
  protected setupStateMachine(): void {
    // Define states
    const idleState: State<EnemyContext> = {
      name: EnemyState.Idle,
      onEnter: () => {
        this.stopMovement();
      },
      onUpdate: (deltaMs, context) => {
        this.handleIdleUpdate(deltaMs);
      },
    };

    const patrolState: State<EnemyContext> = {
      name: EnemyState.Patrol,
      onUpdate: (deltaMs, context) => {
        this.handlePatrolUpdate(deltaMs);
      },
    };

    const alertState: State<EnemyContext> = {
      name: EnemyState.Alert,
      onEnter: () => {
        this.stopMovement();
        // Visual feedback - alert animation
        this.sprite.setTint(0xffff00);
      },
      onExit: () => {
        this.sprite.clearTint();
      },
      onUpdate: (deltaMs, context) => {
        // Brief alert state before engaging
        if (this.stateMachine.timeInCurrentState > 300) {
          if (this.isTargetInDetectionRange()) {
            this.stateMachine.transitionTo(EnemyState.Chase);
          } else {
            this.stateMachine.transitionTo(EnemyState.Idle);
          }
        }
      },
    };

    const chaseState: State<EnemyContext> = {
      name: EnemyState.Chase,
      onUpdate: (deltaMs, context) => {
        this.handleChaseUpdate(deltaMs);
      },
    };

    const attackState: State<EnemyContext> = {
      name: EnemyState.Attack,
      onEnter: () => {
        this.performAttack();
        this.sprite.setTint(0xff8800);
      },
      onExit: () => {
        this.sprite.clearTint();
        this.currentAttackId = null;
      },
      onUpdate: (deltaMs, context) => {
        this.handleAttackUpdate(deltaMs);
      },
    };

    const blockState: State<EnemyContext> = {
      name: EnemyState.Block,
      onEnter: () => {
        this.blockStartTime = Date.now();
        this.combatManager.setDefenseType(this.id, DefenseType.Block);
        this.sprite.setTint(0x8888ff);
      },
      onExit: () => {
        this.combatManager.setDefenseType(this.id, DefenseType.None);
        this.sprite.clearTint();
      },
      onUpdate: (deltaMs, context) => {
        this.handleBlockUpdate(deltaMs);
      },
    };

    const hitstunState: State<EnemyContext> = {
      name: EnemyState.Hitstun,
      onEnter: () => {
        this.hitstunRemaining = 200; // Default hitstun
        this.sprite.setTint(0xff4444);
      },
      onExit: () => {
        this.sprite.clearTint();
      },
      onUpdate: (deltaMs, context) => {
        // Wait for hitstun to end
      },
    };

    const staggeredState: State<EnemyContext> = {
      name: EnemyState.Staggered,
      onEnter: () => {
        this.staggerDuration = 1500; // Vulnerable for 1.5 seconds
        this.sprite.setTint(0xff00ff);
        this.stopMovement();
      },
      onExit: () => {
        this.sprite.clearTint();
        this.stats.stagger = 0;
      },
      onUpdate: (deltaMs, context) => {
        // Wait for stagger to end
      },
    };

    const retreatState: State<EnemyContext> = {
      name: EnemyState.Retreat,
      onUpdate: (deltaMs, context) => {
        this.handleRetreatUpdate(deltaMs);
      },
    };

    const deadState: State<EnemyContext> = {
      name: EnemyState.Dead,
      onEnter: () => {
        this.stopMovement();
        this.sprite.setTint(0x444444);
        // Death animation and cleanup handled elsewhere
      },
    };

    // Add states
    this.stateMachine
      .addState(idleState)
      .addState(patrolState)
      .addState(alertState)
      .addState(chaseState)
      .addState(attackState)
      .addState(blockState)
      .addState(hitstunState)
      .addState(staggeredState)
      .addState(retreatState)
      .addState(deadState);

    // Setup transitions
    this.setupTransitions();

    // Start in idle
    this.stateMachine.start(EnemyState.Idle, {
      enemy: this,
      target: null,
      deltaMs: 0,
    });
  }

  /**
   * Setup state transitions.
   */
  protected setupTransitions(): void {
    // From Idle
    this.stateMachine.addTransition({
      from: EnemyState.Idle,
      to: EnemyState.Alert,
      condition: () => this.isTargetInDetectionRange() && this.target !== null,
    });
    this.stateMachine.addTransition({
      from: EnemyState.Idle,
      to: EnemyState.Patrol,
      condition: () => this.patrolPoints.length > 0 && !this.isTargetInDetectionRange(),
    });

    // From Patrol
    this.stateMachine.addTransition({
      from: EnemyState.Patrol,
      to: EnemyState.Alert,
      condition: () => this.isTargetInDetectionRange() && this.target !== null,
    });

    // From Alert
    this.stateMachine.addTransition({
      from: EnemyState.Alert,
      to: EnemyState.Chase,
      condition: () => this.stateMachine.timeInCurrentState > 300 && this.isTargetInDetectionRange(),
      automatic: true,
    });

    // From Chase
    this.stateMachine.addTransition({
      from: EnemyState.Chase,
      to: EnemyState.Attack,
      condition: () => this.isTargetInAttackRange() && this.canAttack(),
    });
    this.stateMachine.addTransition({
      from: EnemyState.Chase,
      to: EnemyState.Idle,
      condition: () => !this.isTargetInDetectionRange() && this.target === null,
    });

    // From Attack
    this.stateMachine.addTransition({
      from: EnemyState.Attack,
      to: EnemyState.Chase,
      condition: () => !this.combatManager.isAttacking(this.id) && !this.isTargetInAttackRange(),
      automatic: true,
    });
    this.stateMachine.addTransition({
      from: EnemyState.Attack,
      to: EnemyState.Idle,
      condition: () => !this.combatManager.isAttacking(this.id),
      automatic: true,
    });

    // From Block
    this.stateMachine.addTransition({
      from: EnemyState.Block,
      to: EnemyState.Chase,
      condition: () => this.stateMachine.timeInCurrentState > 500,
      automatic: true,
    });

    // From Hitstun
    this.stateMachine.addTransition({
      from: EnemyState.Hitstun,
      to: EnemyState.Chase,
      condition: () => this.hitstunRemaining <= 0 && this.isTargetInDetectionRange(),
      automatic: true,
    });
    this.stateMachine.addTransition({
      from: EnemyState.Hitstun,
      to: EnemyState.Idle,
      condition: () => this.hitstunRemaining <= 0,
      automatic: true,
    });

    // From Staggered
    this.stateMachine.addTransition({
      from: EnemyState.Staggered,
      to: EnemyState.Chase,
      condition: () => this.staggerDuration <= 0 && this.isTargetInDetectionRange(),
      automatic: true,
    });
    this.stateMachine.addTransition({
      from: EnemyState.Staggered,
      to: EnemyState.Idle,
      condition: () => this.staggerDuration <= 0,
      automatic: true,
    });

    // From Retreat
    this.stateMachine.addTransition({
      from: EnemyState.Retreat,
      to: EnemyState.Chase,
      condition: () => this.getDistanceToTarget() > this.config.preferredDistance * 1.5,
    });

    // Stagger trigger from any combat state
    for (const state of [EnemyState.Idle, EnemyState.Chase, EnemyState.Attack, EnemyState.Block]) {
      this.stateMachine.addTransition({
        from: state,
        to: EnemyState.Staggered,
        condition: () => this.stats.stagger >= 100,
        automatic: true,
        priority: 10,
      });
    }
  }

  // ==========================================================================
  // STATE HANDLERS
  // ==========================================================================

  /**
   * Handle Idle state update.
   */
  protected handleIdleUpdate(deltaMs: number): void {
    // Check for target detection
    if (this.target && this.isTargetInDetectionRange()) {
      this.stateMachine.transitionTo(EnemyState.Alert);
    }
  }

  /**
   * Handle Patrol state update.
   */
  protected handlePatrolUpdate(deltaMs: number): void {
    if (this.patrolPoints.length === 0) {
      this.stateMachine.transitionTo(EnemyState.Idle);
      return;
    }

    const targetPoint = this.patrolPoints[this.currentPatrolIndex];
    const distance = Phaser.Math.Distance.Between(
      this.sprite.x,
      this.sprite.y,
      targetPoint.x,
      targetPoint.y
    );

    if (distance < 10) {
      // Reached patrol point, wait then move to next
      this.patrolWaitTime += deltaMs;
      this.stopMovement();

      if (this.patrolWaitTime > 1000) {
        this.patrolWaitTime = 0;
        this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
      }
    } else {
      this.moveToward(targetPoint.x, targetPoint.y, 0.7); // Slower patrol speed
    }
  }

  /**
   * Handle Chase state update.
   */
  protected handleChaseUpdate(deltaMs: number): void {
    if (!this.target) {
      // Move to last known position
      if (this.lastKnownTargetPosition) {
        const dist = Phaser.Math.Distance.Between(
          this.sprite.x,
          this.sprite.y,
          this.lastKnownTargetPosition.x,
          this.lastKnownTargetPosition.y
        );
        if (dist > 20) {
          this.moveToward(this.lastKnownTargetPosition.x, this.lastKnownTargetPosition.y);
        } else {
          this.lastKnownTargetPosition = null;
          this.stateMachine.transitionTo(EnemyState.Idle);
        }
      } else {
        this.stateMachine.transitionTo(EnemyState.Idle);
      }
      return;
    }

    // Update facing
    this.faceTarget();

    // Move toward target, stopping at preferred distance
    const distance = this.getDistanceToTarget();
    if (distance > this.config.preferredDistance) {
      this.moveToward(this.target.x, this.target.y);
    } else if (distance < this.config.preferredDistance * 0.8) {
      // Too close, back off slightly
      const dir = this.getDirectionToTarget();
      this.body.setVelocity(-dir.x * this.config.moveSpeed * 0.5, -dir.y * this.config.moveSpeed * 0.5);
    } else {
      this.stopMovement();
    }

    // Check for attack opportunity
    if (this.isTargetInAttackRange() && this.canAttack()) {
      this.stateMachine.transitionTo(EnemyState.Attack);
    }
  }

  /**
   * Handle Attack state update.
   */
  protected handleAttackUpdate(deltaMs: number): void {
    // Attack is in progress, wait for completion
    if (!this.combatManager.isAttacking(this.id)) {
      // Attack finished
      this.lastAttackTime = Date.now();

      if (this.isTargetInAttackRange()) {
        // Stay in attack range, decide next action
        if (this.shouldBlock()) {
          this.stateMachine.transitionTo(EnemyState.Block);
        } else if (this.canAttack()) {
          // Chain attack
          this.performAttack();
        } else {
          this.stateMachine.transitionTo(EnemyState.Chase);
        }
      } else {
        this.stateMachine.transitionTo(EnemyState.Chase);
      }
    }
  }

  /**
   * Handle Block state update.
   */
  protected handleBlockUpdate(deltaMs: number): void {
    // Face target while blocking
    this.faceTarget();
    this.stopMovement();
  }

  /**
   * Handle Retreat state update.
   */
  protected handleRetreatUpdate(deltaMs: number): void {
    if (!this.target) {
      this.stateMachine.transitionTo(EnemyState.Idle);
      return;
    }

    // Move away from target
    const dir = this.getDirectionToTarget();
    this.body.setVelocity(
      -dir.x * this.config.moveSpeed,
      -dir.y * this.config.moveSpeed
    );
  }

  // ==========================================================================
  // COMBAT HELPERS
  // ==========================================================================

  /**
   * Check if enemy can attack.
   */
  protected canAttack(): boolean {
    const now = Date.now();
    return now - this.lastAttackTime >= this.config.attackCooldown;
  }

  /**
   * Check if enemy should block (based on config and RNG).
   */
  protected shouldBlock(): boolean {
    if (!this.config.canBlock) return false;
    return Math.random() < this.config.blockChance;
  }

  /**
   * Check if enemy should parry (timing-based).
   */
  protected shouldParry(): boolean {
    if (!this.config.canParry) return false;
    // Parry is a timing-based block at the start of the block
    const blockTime = Date.now() - this.blockStartTime;
    return blockTime <= this.config.parryWindow;
  }

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  /**
   * Setup event listeners.
   */
  protected setupEvents(): void {
    // Listen for combat feedback
    this.eventBus.on('combat:feedback', (event: GameEvent) => {
      const data = event.data as { defenderId: EntityId; damage: number };
      if (data.defenderId === this.id) {
        // We were hit
        if (this.getCurrentState() !== EnemyState.Hitstun &&
            this.getCurrentState() !== EnemyState.Dead) {
          this.stateMachine.transitionTo(EnemyState.Hitstun);
        }
      }
    });

    // Listen for stagger break
    this.eventBus.on('combat:stagger_break', (event: GameEvent) => {
      const data = event.data as { entityId: EntityId };
      if (data.entityId === this.id) {
        this.stateMachine.transitionTo(EnemyState.Staggered);
      }
    });
  }
}
