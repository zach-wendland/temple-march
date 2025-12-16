/**
 * Player Entity - Darth Vader
 * Implements the Vader power fantasy with overwhelming combat power.
 */

import Phaser from 'phaser';
import { StateMachine, State, Transition } from '../systems/combat/StateMachine';
import { InputManager } from '../input/InputManager';
import { CombatManager } from '../combat/CombatManager';
import { ComboSystem, ComboInput } from '../combat/ComboSystem';
import { EventBus } from '../core/events/EventBus';
import { EntityId } from '../core/types';
import { Faction, createDefaultStats, CombatStats, DefenseType } from '../combat/DamageCalculator';
import { PLAYER_CONFIG } from '../config/GameConfig';

/**
 * Player states.
 */
export enum PlayerState {
  Idle = 'idle',
  Moving = 'moving',
  Attacking = 'attacking',
  Blocking = 'blocking',
  Dodging = 'dodging',
  Hitstun = 'hitstun',
  ForcePower = 'force_power',
  Dead = 'dead',
}

/**
 * Player context for state machine.
 */
interface PlayerContext {
  player: Player;
  deltaMs: number;
}

/**
 * Player entity class.
 */
export class Player {
  // Identity
  readonly id: EntityId = 0;

  // Phaser objects
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Sprite;
  private body: Phaser.Physics.Arcade.Body;

  // Systems
  private inputManager: InputManager;
  private combatManager: CombatManager;
  private eventBus: EventBus;
  private stateMachine: StateMachine<PlayerContext>;
  private comboSystem: ComboSystem;

  // Stats
  private stats: CombatStats;
  private force: number;
  private maxForce: number;

  // State tracking
  private facingRight: boolean = true;
  private dodgeCooldown: number = 0;
  private currentAttackId: string | null = null;

  // Movement
  private moveSpeed: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    inputManager: InputManager,
    combatManager: CombatManager,
    eventBus: EventBus
  ) {
    this.scene = scene;
    this.inputManager = inputManager;
    this.combatManager = combatManager;
    this.eventBus = eventBus;

    // Create sprite
    this.sprite = scene.add.sprite(x, y, 'player_placeholder');
    this.sprite.setDepth(100);

    // Add physics
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.body.setSize(24, 48);
    this.body.setOffset(6, 8);

    // Initialize stats
    this.stats = createDefaultStats(Faction.Sith);
    this.stats.health = PLAYER_CONFIG.maxHealth;
    this.stats.maxHealth = PLAYER_CONFIG.maxHealth;
    this.force = PLAYER_CONFIG.maxForce;
    this.maxForce = PLAYER_CONFIG.maxForce;
    this.moveSpeed = PLAYER_CONFIG.moveSpeed;

    // Initialize systems
    this.comboSystem = new ComboSystem({
      comboDropTime: 3000,
      inputBufferWindow: 500,
      cancelWindow: 200,
    });

    this.stateMachine = new StateMachine<PlayerContext>();
    this.setupStateMachine();

    // Register with combat manager
    this.combatManager.registerEntity(this.id, this.sprite, this.stats, true);

    // Setup event listeners
    this.setupEvents();
  }

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
   * Get current force.
   */
  getForce(): number {
    return this.force;
  }

  /**
   * Get max force.
   */
  getMaxForce(): number {
    return this.maxForce;
  }

  /**
   * Get current state.
   */
  getCurrentState(): PlayerState {
    return (this.stateMachine.currentState?.name as PlayerState) ?? PlayerState.Idle;
  }

  /**
   * Is player facing right?
   */
  isFacingRight(): boolean {
    return this.facingRight;
  }

  /**
   * Update player - call every frame.
   */
  update(deltaMs: number): void {
    // Update state machine
    this.stateMachine.update(deltaMs);

    // Update combo system
    const comboResult = this.comboSystem.update(Date.now());

    // Regenerate Force
    this.regenerateForce(deltaMs);

    // Update dodge cooldown
    if (this.dodgeCooldown > 0) {
      this.dodgeCooldown = Math.max(0, this.dodgeCooldown - deltaMs);
    }
  }

  /**
   * Take damage.
   */
  takeDamage(damage: number): void {
    this.stats.health = Math.max(0, this.stats.health - damage);

    if (this.stats.health <= 0) {
      this.stateMachine.transitionTo(PlayerState.Dead);
    } else {
      this.stateMachine.transitionTo(PlayerState.Hitstun);
    }

    this.eventBus.emit({
      type: 'player:damaged',
      data: {
        damage,
        currentHealth: this.stats.health,
        maxHealth: this.stats.maxHealth,
      },
    });
  }

  /**
   * Heal player.
   */
  heal(amount: number): void {
    this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + amount);
  }

  /**
   * Setup state machine with all states and transitions.
   */
  private setupStateMachine(): void {
    // Define states
    const idleState: State<PlayerContext> = {
      name: PlayerState.Idle,
      onEnter: () => {
        this.body.setVelocity(0, 0);
      },
      onUpdate: (deltaMs, context) => {
        this.handleIdleUpdate(deltaMs);
      },
    };

    const movingState: State<PlayerContext> = {
      name: PlayerState.Moving,
      onUpdate: (deltaMs, context) => {
        this.handleMovingUpdate(deltaMs);
      },
    };

    const attackingState: State<PlayerContext> = {
      name: PlayerState.Attacking,
      onEnter: () => {
        // Visual feedback
        this.sprite.setTint(0xffff00);
      },
      onExit: () => {
        this.sprite.clearTint();
        this.currentAttackId = null;
      },
      onUpdate: (deltaMs, context) => {
        this.handleAttackingUpdate(deltaMs);
      },
    };

    const blockingState: State<PlayerContext> = {
      name: PlayerState.Blocking,
      onEnter: () => {
        this.combatManager.setDefenseType(this.id, DefenseType.Block);
        this.sprite.setTint(0x8888ff);
      },
      onExit: () => {
        this.combatManager.setDefenseType(this.id, DefenseType.None);
        this.sprite.clearTint();
      },
      onUpdate: (deltaMs, context) => {
        this.handleBlockingUpdate(deltaMs);
      },
    };

    const dodgingState: State<PlayerContext> = {
      name: PlayerState.Dodging,
      onEnter: () => {
        this.performDodge();
      },
      onUpdate: (deltaMs, context) => {
        // Dodge is automatic, just wait for it to complete
      },
    };

    const hitstunState: State<PlayerContext> = {
      name: PlayerState.Hitstun,
      onEnter: () => {
        this.sprite.setTint(0xff8888);
      },
      onExit: () => {
        this.sprite.clearTint();
      },
      onUpdate: (deltaMs, context) => {
        // Wait for hitstun to end
      },
    };

    const forcePowerState: State<PlayerContext> = {
      name: PlayerState.ForcePower,
      onEnter: () => {
        this.sprite.setTint(0x4444ff);
      },
      onExit: () => {
        this.sprite.clearTint();
      },
      onUpdate: (deltaMs, context) => {
        this.handleForcePowerUpdate(deltaMs);
      },
    };

    const deadState: State<PlayerContext> = {
      name: PlayerState.Dead,
      onEnter: () => {
        this.body.setVelocity(0, 0);
        this.sprite.setTint(0x444444);
        this.eventBus.emit({
          type: 'player:death',
          data: { playerId: this.id },
        });
      },
    };

    // Add states
    this.stateMachine
      .addState(idleState)
      .addState(movingState)
      .addState(attackingState)
      .addState(blockingState)
      .addState(dodgingState)
      .addState(hitstunState)
      .addState(forcePowerState)
      .addState(deadState);

    // Define transitions
    // From Idle
    this.stateMachine.addTransition({
      from: PlayerState.Idle,
      to: PlayerState.Moving,
      condition: () => this.isMovementInput(),
    });
    this.stateMachine.addTransition({
      from: PlayerState.Idle,
      to: PlayerState.Attacking,
      condition: () => this.isAttackInput(),
    });
    this.stateMachine.addTransition({
      from: PlayerState.Idle,
      to: PlayerState.Blocking,
      condition: () => this.inputManager.isHeld('block'),
    });
    this.stateMachine.addTransition({
      from: PlayerState.Idle,
      to: PlayerState.Dodging,
      condition: () => this.inputManager.justPressed('dodge') && this.canDodge(),
    });
    this.stateMachine.addTransition({
      from: PlayerState.Idle,
      to: PlayerState.ForcePower,
      condition: () => this.isForcePowerInput(),
    });

    // From Moving
    this.stateMachine.addTransition({
      from: PlayerState.Moving,
      to: PlayerState.Idle,
      condition: () => !this.isMovementInput(),
    });
    this.stateMachine.addTransition({
      from: PlayerState.Moving,
      to: PlayerState.Attacking,
      condition: () => this.isAttackInput(),
    });
    this.stateMachine.addTransition({
      from: PlayerState.Moving,
      to: PlayerState.Blocking,
      condition: () => this.inputManager.isHeld('block'),
    });
    this.stateMachine.addTransition({
      from: PlayerState.Moving,
      to: PlayerState.Dodging,
      condition: () => this.inputManager.justPressed('dodge') && this.canDodge(),
    });
    this.stateMachine.addTransition({
      from: PlayerState.Moving,
      to: PlayerState.ForcePower,
      condition: () => this.isForcePowerInput(),
    });

    // From Attacking
    this.stateMachine.addTransition({
      from: PlayerState.Attacking,
      to: PlayerState.Idle,
      condition: () => !this.combatManager.isAttacking(this.id),
    });

    // From Blocking
    this.stateMachine.addTransition({
      from: PlayerState.Blocking,
      to: PlayerState.Idle,
      condition: () => !this.inputManager.isHeld('block'),
    });

    // From Dodging
    this.stateMachine.addTransition({
      from: PlayerState.Dodging,
      to: PlayerState.Idle,
      condition: () => this.stateMachine.timeInCurrentState > 300, // 300ms dodge
      automatic: true,
    });

    // From Hitstun
    this.stateMachine.addTransition({
      from: PlayerState.Hitstun,
      to: PlayerState.Idle,
      condition: () => this.stateMachine.timeInCurrentState > 200, // Quick recovery for Vader
      automatic: true,
    });

    // From ForcePower
    this.stateMachine.addTransition({
      from: PlayerState.ForcePower,
      to: PlayerState.Idle,
      condition: () => !this.combatManager.isAttacking(this.id),
    });

    // Start in Idle
    this.stateMachine.start(PlayerState.Idle, { player: this, deltaMs: 0 });
  }

  /**
   * Handle Idle state update.
   */
  private handleIdleUpdate(deltaMs: number): void {
    this.body.setVelocity(0, 0);
    this.checkStateTransitions();
  }

  /**
   * Handle Moving state update.
   */
  private handleMovingUpdate(deltaMs: number): void {
    const state = this.inputManager.getState();

    let vx = 0;
    let vy = 0;

    if (state.left) {
      vx = -this.moveSpeed;
      this.facingRight = false;
      this.sprite.setFlipX(true);
    } else if (state.right) {
      vx = this.moveSpeed;
      this.facingRight = true;
      this.sprite.setFlipX(false);
    }

    if (state.up) {
      vy = -this.moveSpeed;
    } else if (state.down) {
      vy = this.moveSpeed;
    }

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    this.body.setVelocity(vx, vy);
    this.checkStateTransitions();
  }

  /**
   * Handle Attacking state update.
   */
  private handleAttackingUpdate(deltaMs: number): void {
    // Allow movement during attacks (Vader doesn't stop)
    const state = this.inputManager.getState();
    let vx = 0;
    let vy = 0;

    if (state.left) {
      vx = -this.moveSpeed * 0.5; // Reduced speed during attack
    } else if (state.right) {
      vx = this.moveSpeed * 0.5;
    }

    if (state.up) {
      vy = -this.moveSpeed * 0.3;
    } else if (state.down) {
      vy = this.moveSpeed * 0.3;
    }

    this.body.setVelocity(vx, vy);

    // Check for combo inputs
    const comboInput = this.inputManager.getComboInput();
    if (comboInput) {
      this.comboSystem.bufferInput(comboInput);
    }

    this.checkStateTransitions();
  }

  /**
   * Handle Blocking state update.
   */
  private handleBlockingUpdate(deltaMs: number): void {
    // Slow movement while blocking
    const state = this.inputManager.getState();
    let vx = 0;
    let vy = 0;

    if (state.left) {
      vx = -this.moveSpeed * 0.3;
    } else if (state.right) {
      vx = this.moveSpeed * 0.3;
    }

    if (state.up) {
      vy = -this.moveSpeed * 0.3;
    } else if (state.down) {
      vy = this.moveSpeed * 0.3;
    }

    this.body.setVelocity(vx, vy);
    this.checkStateTransitions();
  }

  /**
   * Handle Force Power state update.
   */
  private handleForcePowerUpdate(deltaMs: number): void {
    this.body.setVelocity(0, 0);
    this.checkStateTransitions();
  }

  /**
   * Check and trigger state transitions.
   */
  private checkStateTransitions(): void {
    // Handle attack input
    if (this.isAttackInput() && this.canAttack()) {
      this.performAttack();
    }

    // Handle Force power input
    if (this.isForcePowerInput() && this.canUseForcePower()) {
      this.performForcePower();
    }
  }

  /**
   * Check if there's movement input.
   */
  private isMovementInput(): boolean {
    const state = this.inputManager.getState();
    return state.up || state.down || state.left || state.right;
  }

  /**
   * Check if there's attack input.
   */
  private isAttackInput(): boolean {
    const state = this.inputManager.getState();
    return state.attackLight || state.attackHeavy || state.special;
  }

  /**
   * Check if there's Force power input.
   */
  private isForcePowerInput(): boolean {
    const state = this.inputManager.getState();
    return state.forcePush || state.forcePull;
  }

  /**
   * Check if player can attack.
   */
  private canAttack(): boolean {
    const currentState = this.getCurrentState();
    return currentState !== PlayerState.Hitstun && currentState !== PlayerState.Dead;
  }

  /**
   * Check if player can dodge.
   */
  private canDodge(): boolean {
    return this.dodgeCooldown <= 0 && this.getCurrentState() !== PlayerState.Dead;
  }

  /**
   * Check if player can use Force power.
   */
  private canUseForcePower(): boolean {
    const currentState = this.getCurrentState();
    return (
      currentState !== PlayerState.Hitstun &&
      currentState !== PlayerState.Dead &&
      this.force >= PLAYER_CONFIG.forcePushCost
    );
  }

  /**
   * Perform attack based on input.
   */
  private performAttack(): void {
    const state = this.inputManager.getState();
    let attackId = 'light_1';

    if (state.attackHeavy) {
      if (state.up) {
        attackId = 'rising_strike';
      } else {
        attackId = 'heavy_1';
      }
    } else if (state.special) {
      attackId = 'saber_throw';
    }

    if (this.combatManager.startAttack(this.id, attackId)) {
      this.currentAttackId = attackId;
      this.stateMachine.transitionTo(PlayerState.Attacking);
    }
  }

  /**
   * Perform Force power based on input.
   */
  private performForcePower(): void {
    const state = this.inputManager.getState();
    let powerType = 'force_push';
    let forceCost = PLAYER_CONFIG.forcePushCost;

    if (state.forcePull) {
      powerType = 'force_pull';
      forceCost = PLAYER_CONFIG.forcePullCost ?? PLAYER_CONFIG.forcePushCost;
    }

    if (this.force >= forceCost && this.combatManager.startAttack(this.id, powerType)) {
      this.force -= forceCost;
      this.stateMachine.transitionTo(PlayerState.ForcePower);

      this.eventBus.emit({
        type: 'player:force_used',
        data: {
          powerType,
          forceCost,
          currentForce: this.force,
          maxForce: this.maxForce,
        },
      });
    }
  }

  /**
   * Perform dodge.
   */
  private performDodge(): void {
    const state = this.inputManager.getState();

    // Determine dodge direction
    let dodgeX = this.facingRight ? 1 : -1;
    let dodgeY = 0;

    if (state.left) dodgeX = -1;
    if (state.right) dodgeX = 1;
    if (state.up) dodgeY = -1;
    if (state.down) dodgeY = 1;

    // Apply dodge velocity
    const dodgeSpeed = 400;
    this.body.setVelocity(dodgeX * dodgeSpeed, dodgeY * dodgeSpeed);

    // Set invulnerability
    this.combatManager.setInvulnerable(this.id, true, 200);

    // Set cooldown
    this.dodgeCooldown = PLAYER_CONFIG.dodgeCooldown;

    // Visual effect
    this.sprite.setAlpha(0.5);
    this.scene.time.delayedCall(200, () => {
      this.sprite.setAlpha(1);
    });
  }

  /**
   * Regenerate Force over time.
   */
  private regenerateForce(deltaMs: number): void {
    if (this.force < this.maxForce) {
      const regenAmount = (PLAYER_CONFIG.forceRegenRate * deltaMs) / 1000;
      this.force = Math.min(this.maxForce, this.force + regenAmount);
    }
  }

  /**
   * Setup event listeners.
   */
  private setupEvents(): void {
    // Listen for damage feedback
    this.eventBus.on('combat:feedback', (event) => {
      const data = event.data as { defenderId: EntityId };
      if (data.defenderId === this.id) {
        // Player was hit
        this.stateMachine.transitionTo(PlayerState.Hitstun);
      }
    });
  }

  /**
   * Destroy player.
   */
  destroy(): void {
    this.combatManager.unregisterEntity(this.id);
    this.sprite.destroy();
  }
}
