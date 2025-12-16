/**
 * TempleLevelScene - Base scene for temple level gameplay.
 * Integrates tilemap system, level management, and environment interactions.
 * This scene replaces/extends GameScene for actual level gameplay.
 */

import Phaser from 'phaser';
import { SceneKey, Layer, EntityId } from '../core/types';
import { GAME_WIDTH, GAME_HEIGHT, PLAYER_CONFIG } from '../config/GameConfig';
import { EventBus, GameEvent } from '../core/events/EventBus';
import { initEffectsLayer, EffectsLayer } from '../core/EffectsLayer';

// Combat systems
import { CombatManager } from '../combat/CombatManager';
import { Faction, createDefaultStats } from '../combat/DamageCalculator';

// Force Powers & Effects
import {
  ForceSystem,
  ForcePowerType,
  ForceTarget,
  ScreenShake,
  HitStop,
} from '../force';

// Input
import { InputManager } from '../input/InputManager';

// Entities
import { Player } from '../entities/Player';

// Enemy system
import { EnemyType } from '../entities/enemies/EnemyTypes';
import { JediDefender } from '../entities/enemies/JediDefender';
import { CloneTrooper } from '../entities/enemies/CloneTrooper';
import { TempleGuard } from '../entities/enemies/TempleGuard';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';

// UI Components
import {
  ComboCounter,
  DamageNumberPool,
  HitFeedbackSystem,
  HealthBar,
  ForceBar,
  EnemyHealthBarManager,
} from '../ui';

// Level systems
import {
  LevelManager,
  TilemapManager,
  AreaConfig,
  TilemapLoadResult,
  Destructible,
  createDestructible,
  DestructibleType,
  Pickup,
  createPickup,
  PickupType,
} from '../levels';

/**
 * Scene data passed when starting the scene.
 */
interface TempleLevelSceneData {
  areaKey?: string;
  spawnPoint?: string;
  fromCheckpoint?: boolean;
}

/**
 * TempleLevelScene - Main gameplay scene with tilemap integration.
 */
export class TempleLevelScene extends Phaser.Scene {
  // Core systems
  private eventBus!: EventBus;
  private inputManager!: InputManager;
  private combatManager!: CombatManager;
  private levelManager!: LevelManager;

  // Force Powers & Effects Systems
  private forceSystem!: ForceSystem;
  private screenShake!: ScreenShake;
  private hitStop!: HitStop;
  private effectsLayer!: EffectsLayer;

  // Player
  private player!: Player;

  // Entity groups
  private enemies!: Phaser.GameObjects.Group;
  private allies!: Phaser.GameObjects.Group;
  private destructibles!: Phaser.GameObjects.Group;
  private pickups!: Phaser.GameObjects.Group;

  // Active entities
  private activeEnemies: Map<EntityId, BaseEnemy> = new Map();
  private activeDestructibles: Map<string, Destructible> = new Map();
  private activePickups: Map<string, Pickup> = new Map();

  // UI Components
  private comboCounter!: ComboCounter;
  private damageNumbers!: DamageNumberPool;
  private hitFeedback!: HitFeedbackSystem;
  private healthBar!: HealthBar;
  private forceBar!: ForceBar;
  private enemyBars!: EnemyHealthBarManager;
  private areaNameText!: Phaser.GameObjects.Text;

  // Game state
  private isPaused = false;
  private enemyIdCounter = 100;

  // Checkpoint triggers
  private checkpointTriggers: Phaser.GameObjects.Zone[] = [];
  private transitionTriggers: Phaser.GameObjects.Zone[] = [];

  constructor() {
    super({ key: SceneKey.Game });
  }

  init(data: TempleLevelSceneData): void {
    this.eventBus = new EventBus();
  }

  create(data: TempleLevelSceneData): void {
    // Initialize input manager
    this.inputManager = new InputManager(this);

    // Initialize combat manager
    this.combatManager = new CombatManager(this, this.eventBus, {
      debugHitboxes: false,
    });

    // Initialize level manager
    this.levelManager = new LevelManager(this, this.eventBus);

    // Initialize Force Powers & Effects Systems
    this.forceSystem = new ForceSystem(this, this.eventBus, this.combatManager);
    this.screenShake = new ScreenShake(this, this.eventBus);
    this.hitStop = new HitStop(this, this.eventBus);

    // Initialize p5.js effects layer
    this.effectsLayer = initEffectsLayer(GAME_WIDTH, GAME_HEIGHT);
    this.forceSystem.setEffectsLayer(this.effectsLayer);

    // Create entity groups
    this.enemies = this.add.group();
    this.allies = this.add.group();
    this.destructibles = this.add.group();
    this.pickups = this.add.group();

    // Register level load callback
    this.levelManager.onAreaLoad((area, result) => {
      this.onAreaLoaded(area, result);
    });

    // Register level unload callback
    this.levelManager.onAreaUnload((area) => {
      this.onAreaUnloaded(area);
    });

    // Create UI
    this.createUI();

    // Setup event listeners
    this.setupEvents();

    // Setup input handlers
    this.setupInputHandlers();

    // Load initial area
    const areaKey = data.areaKey || 'temple_entrance';
    const spawnPoint = data.spawnPoint || 'default';

    // If loading from checkpoint, use checkpoint system
    if (data.fromCheckpoint) {
      this.levelManager.respawnAtCheckpoint();
    } else {
      this.levelManager.loadArea(areaKey, spawnPoint);
    }

    // Fade in
    this.cameras.main.fadeIn(500);
  }

  update(time: number, delta: number): void {
    if (this.isPaused) return;

    // Update hit stop (must be first to apply time scale)
    this.hitStop.update(delta);

    // Update input
    this.inputManager.update();

    // Update player
    if (this.player) {
      this.player.update(delta);

      // Handle Force power input
      this.handleForcePowerInput();
    }

    // Update combat manager
    this.combatManager.update(delta);

    // Update Force system (for sustained powers)
    this.forceSystem.update(delta);

    // Update screen shake
    this.screenShake.update(delta);

    // Update enemies
    for (const enemy of this.activeEnemies.values()) {
      if (enemy.isAlive()) {
        enemy.update(delta);
      }
    }

    // Update destructibles
    for (const destructible of this.activeDestructibles.values()) {
      destructible.update(delta);
    }

    // Update pickups and check collection
    for (const pickup of this.activePickups.values()) {
      pickup.update(delta);

      // Try to collect if player is nearby
      if (this.player && pickup.getIsActive() && !pickup.getIsCollected()) {
        pickup.tryCollect(this.player.getSprite(), this.player.id);
      }
    }

    // Update allies to follow player
    this.updateAllies(delta);

    // Update UI
    this.updateUI();
  }

  /**
   * Handle Force power input from player.
   */
  private handleForcePowerInput(): void {
    if (!this.player) return;

    const inputState = this.inputManager.getState();
    const playerPos = this.player.getPosition();
    const direction = this.player.isFacingRight() ? 0 : Math.PI;
    const currentForce = this.player.getForce();

    // Get targets for Force powers
    const targets = this.getForceTargets();

    // Force Push (F key)
    if (inputState.forcePush && this.inputManager.justPressed('forcePush')) {
      const result = this.forceSystem.executeForcePush(
        this.player.id,
        playerPos,
        direction,
        targets,
        currentForce
      );

      if (result.success) {
        // Deduct Force from player (handled via event)
        this.eventBus.emit({
          type: 'player:force_consumed',
          data: { amount: result.forceCost },
        });
      }
    }

    // Force Pull (G key)
    if (inputState.forcePull && this.inputManager.justPressed('forcePull')) {
      const result = this.forceSystem.executeForcePull(
        this.player.id,
        playerPos,
        direction,
        targets,
        currentForce
      );

      if (result.success) {
        this.eventBus.emit({
          type: 'player:force_consumed',
          data: { amount: result.forceCost },
        });
      }
    }

    // Force Lightning (Hold special + Force button combo - or we can add a dedicated key)
    // For now, let's trigger it with special + forcePush
    if (inputState.special && inputState.forcePush && this.inputManager.justPressed('special')) {
      const result = this.forceSystem.executeForceLightning(
        this.player.id,
        playerPos,
        direction,
        targets,
        currentForce
      );

      if (result.success) {
        this.eventBus.emit({
          type: 'player:force_consumed',
          data: { amount: result.forceCost },
        });
      }
    }
  }

  /**
   * Get valid Force power targets from active enemies.
   */
  private getForceTargets(): ForceTarget[] {
    const targets: ForceTarget[] = [];

    for (const enemy of this.activeEnemies.values()) {
      if (!enemy.isAlive()) continue;

      const stats = this.combatManager.getEntityStats(enemy.id);
      const pos = enemy.getPosition();

      targets.push({
        id: enemy.id,
        sprite: enemy.getSprite(),
        position: pos,
        health: stats?.health ?? enemy.getHealth(),
        isBlocking: enemy.getCurrentState() === 'block',
      });
    }

    return targets;
  }

  // ==========================================================================
  // AREA LIFECYCLE
  // ==========================================================================

  /**
   * Called when an area is loaded.
   */
  private onAreaLoaded(area: AreaConfig, result: TilemapLoadResult): void {
    // Clear existing entities
    this.clearEntities();

    // Get tilemap manager
    const tilemapManager = this.levelManager.getTilemapManager();

    // Setup camera bounds if map loaded successfully
    if (result.map) {
      const dimensions = tilemapManager.getMapDimensions();
      if (dimensions) {
        this.cameras.main.setBounds(0, 0, dimensions.width, dimensions.height);
      }
    }

    // Get player spawn point
    const playerSpawn = tilemapManager.getPlayerSpawn();
    const spawnX = playerSpawn?.x ?? GAME_WIDTH / 2;
    const spawnY = playerSpawn?.y ?? GAME_HEIGHT / 2;

    // Create or reposition player
    if (!this.player) {
      this.player = new Player(
        this,
        spawnX,
        spawnY,
        this.inputManager,
        this.combatManager,
        this.eventBus
      );

      // Add collision with tilemap
      tilemapManager.addCollider(this.player.getSprite());

      // Camera follows player
      this.cameras.main.startFollow(this.player.getSprite(), true, 0.1, 0.1);
    } else {
      // Reposition existing player
      this.player.getSprite().setPosition(spawnX, spawnY);
    }

    // Spawn enemies from tilemap
    this.spawnEnemiesFromMap(tilemapManager);

    // Spawn destructibles from tilemap
    this.spawnDestructiblesFromMap(tilemapManager);

    // Spawn pickups from tilemap
    this.spawnPickupsFromMap(tilemapManager);

    // Create checkpoint triggers
    this.createCheckpointTriggers(tilemapManager);

    // Create area transition triggers
    this.createTransitionTriggers(tilemapManager);

    // Update area name display
    this.updateAreaName(area.displayName);
  }

  /**
   * Called when an area is unloaded.
   */
  private onAreaUnloaded(area: AreaConfig): void {
    // Clear triggers
    this.checkpointTriggers.forEach(t => t.destroy());
    this.checkpointTriggers = [];

    this.transitionTriggers.forEach(t => t.destroy());
    this.transitionTriggers = [];
  }

  // ==========================================================================
  // ENTITY SPAWNING
  // ==========================================================================

  /**
   * Spawn enemies from tilemap object layer.
   */
  private spawnEnemiesFromMap(tilemapManager: TilemapManager): void {
    const enemySpawns = tilemapManager.getEnemySpawns();

    for (const spawn of enemySpawns) {
      // Check if this enemy should spawn (not previously cleared)
      const enemyId = `enemy_${spawn.x}_${spawn.y}`;
      if (!this.levelManager.shouldSpawnEnemy(enemyId)) {
        continue;
      }

      this.spawnEnemy(spawn.x, spawn.y, spawn.enemyType as EnemyType);
    }
  }

  /**
   * Spawn a single enemy.
   */
  private spawnEnemy(x: number, y: number, enemyType: EnemyType): BaseEnemy | null {
    let enemy: BaseEnemy;

    switch (enemyType) {
      case EnemyType.JediDefender:
        enemy = new JediDefender(this, x, y, this.combatManager, this.eventBus);
        break;
      case EnemyType.CloneTrooper:
        enemy = new CloneTrooper(this, x, y, this.combatManager, this.eventBus);
        break;
      case EnemyType.TempleGuard:
        enemy = new TempleGuard(this, x, y, this.combatManager, this.eventBus);
        break;
      default:
        enemy = new JediDefender(this, x, y, this.combatManager, this.eventBus);
    }

    // Set player as target
    if (this.player) {
      enemy.setTarget(this.player.getSprite());
    }

    // Add to tracking
    this.activeEnemies.set(enemy.id, enemy);
    this.enemies.add(enemy.getSprite());

    // Add collision with tilemap
    const tilemapManager = this.levelManager.getTilemapManager();
    tilemapManager.addCollider(enemy.getSprite());

    return enemy;
  }

  /**
   * Spawn destructibles from tilemap object layer.
   */
  private spawnDestructiblesFromMap(tilemapManager: TilemapManager): void {
    const destructibleSpawns = tilemapManager.getDestructibleSpawns();

    for (const spawn of destructibleSpawns) {
      this.spawnDestructible(
        spawn.x,
        spawn.y,
        spawn.destructibleType as DestructibleType,
        spawn.health
      );
    }
  }

  /**
   * Spawn a single destructible.
   */
  private spawnDestructible(
    x: number,
    y: number,
    destructibleType: DestructibleType,
    health?: number
  ): Destructible {
    const destructible = createDestructible(this, x, y, destructibleType, this.eventBus, {
      health,
      maxHealth: health,
    });

    // Add to tracking
    this.activeDestructibles.set(destructible.id, destructible);
    this.destructibles.add(destructible.getSprite());

    // Add collision with tilemap
    const tilemapManager = this.levelManager.getTilemapManager();
    tilemapManager.addCollider(destructible.getSprite());

    return destructible;
  }

  /**
   * Spawn pickups from tilemap object layer.
   */
  private spawnPickupsFromMap(tilemapManager: TilemapManager): void {
    const pickupSpawns = tilemapManager.getPickupSpawns();

    for (const spawn of pickupSpawns) {
      // Check if this pickup should spawn (not previously collected)
      const pickupId = `pickup_${spawn.x}_${spawn.y}`;
      if (!this.levelManager.shouldSpawnPickup(pickupId)) {
        continue;
      }

      this.spawnPickup(spawn.x, spawn.y, spawn.pickupType as PickupType, spawn.value);
    }
  }

  /**
   * Spawn a single pickup.
   */
  private spawnPickup(x: number, y: number, pickupType: PickupType, value?: number): Pickup {
    const pickup = createPickup(this, x, y, pickupType, this.eventBus, { value });

    // Set player as magnet target
    if (this.player) {
      pickup.setMagnetTarget(this.player.getSprite());
    }

    // Add to tracking
    this.activePickups.set(pickup.id, pickup);
    this.pickups.add(pickup.getSprite());

    return pickup;
  }

  /**
   * Clear all spawned entities.
   */
  private clearEntities(): void {
    // Clear enemies
    for (const enemy of this.activeEnemies.values()) {
      enemy.destroy();
    }
    this.activeEnemies.clear();

    // Clear destructibles
    for (const destructible of this.activeDestructibles.values()) {
      destructible.destroy();
    }
    this.activeDestructibles.clear();

    // Clear pickups
    for (const pickup of this.activePickups.values()) {
      pickup.destroy();
    }
    this.activePickups.clear();
  }

  // ==========================================================================
  // TRIGGERS
  // ==========================================================================

  /**
   * Create checkpoint trigger zones.
   */
  private createCheckpointTriggers(tilemapManager: TilemapManager): void {
    const checkpoints = tilemapManager.getCheckpoints();

    for (const checkpoint of checkpoints) {
      const zone = this.add.zone(checkpoint.x, checkpoint.y, 64, 64);
      this.physics.add.existing(zone, true);

      // Setup overlap detection with player
      if (this.player) {
        this.physics.add.overlap(
          this.player.getSprite(),
          zone,
          () => this.onCheckpointEntered(checkpoint.id, checkpoint),
          undefined,
          this
        );
      }

      this.checkpointTriggers.push(zone);
    }
  }

  /**
   * Create area transition trigger zones.
   */
  private createTransitionTriggers(tilemapManager: TilemapManager): void {
    const transitions = tilemapManager.getAreaTransitions();

    for (const transition of transitions) {
      const zone = this.add.zone(
        transition.x + transition.width / 2,
        transition.y + transition.height / 2,
        transition.width,
        transition.height
      );
      this.physics.add.existing(zone, true);

      // Store transition data
      zone.setData('targetArea', transition.targetArea);
      zone.setData('targetSpawn', transition.targetSpawn);

      // Setup overlap detection with player
      if (this.player) {
        this.physics.add.overlap(
          this.player.getSprite(),
          zone,
          () => this.onTransitionEntered(transition.targetArea, transition.targetSpawn),
          undefined,
          this
        );
      }

      this.transitionTriggers.push(zone);
    }
  }

  /**
   * Handle checkpoint entered.
   */
  private onCheckpointEntered(
    checkpointId: string,
    checkpoint: { x: number; y: number; name: string }
  ): void {
    // Only trigger once per checkpoint
    if (this.levelManager.getCheckpointSystem().hasCheckpoint(checkpointId)) {
      return;
    }

    this.eventBus.emit({
      type: 'checkpoint:reached',
      data: {
        checkpointId,
        position: { x: checkpoint.x, y: checkpoint.y },
      },
    });

    // Visual/audio feedback
    this.showCheckpointNotification(checkpoint.name);
  }

  /**
   * Handle area transition entered.
   */
  private onTransitionEntered(targetArea: string, targetSpawn: string): void {
    if (this.levelManager.getIsTransitioning()) {
      return;
    }

    this.levelManager.transitionToArea(targetArea, targetSpawn);
  }

  // ==========================================================================
  // UI
  // ==========================================================================

  /**
   * Create UI elements.
   */
  private createUI(): void {
    // Initialize UI components
    this.comboCounter = new ComboCounter(this);
    this.damageNumbers = new DamageNumberPool(this);
    this.hitFeedback = new HitFeedbackSystem(this);
    this.healthBar = new HealthBar(this);
    this.forceBar = new ForceBar(this);
    this.enemyBars = new EnemyHealthBarManager(this);

    // Area name display
    this.areaNameText = this.add
      .text(GAME_WIDTH / 2, 60, '', {
        fontFamily: 'Arial',
        fontSize: '32px',
        color: '#FFD700',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(Layer.UI)
      .setScrollFactor(0)
      .setAlpha(0);

    // Controls hint
    const hint = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 30,
        'WASD: Move | J/K: Attack | F/G: Force | Space: Dodge | L: Block | ESC: Pause',
        {
          fontFamily: 'Arial',
          fontSize: '14px',
          color: '#666666',
        }
      )
      .setOrigin(0.5)
      .setDepth(Layer.UI)
      .setScrollFactor(0);

    // Fade out hint after 5 seconds
    this.time.delayedCall(5000, () => {
      this.tweens.add({
        targets: hint,
        alpha: 0,
        duration: 1000,
      });
    });
  }

  /**
   * Update UI elements.
   */
  private updateUI(): void {
    if (!this.player) return;

    // Update health bar
    this.healthBar.setHealth(this.player.getHealth(), this.player.getMaxHealth());

    // Update force bar
    this.forceBar.setForce(this.player.getForce(), this.player.getMaxForce());

    // Update enemy health bars
    for (const enemy of this.activeEnemies.values()) {
      if (enemy.isAlive() && enemy.getHealth() < enemy.getMaxHealth()) {
        this.enemyBars.setHealth(enemy.id, enemy.getHealth(), enemy.getMaxHealth());
      }
    }

    // Update enemy bar positions
    this.enemyBars.update();
  }

  /**
   * Update area name display.
   */
  private updateAreaName(name: string): void {
    this.areaNameText.setText(name);

    // Fade in, hold, fade out
    this.tweens.add({
      targets: this.areaNameText,
      alpha: 1,
      duration: 500,
      hold: 2000,
      yoyo: true,
    });
  }

  /**
   * Show checkpoint notification.
   */
  private showCheckpointNotification(name: string): void {
    const notification = this.add
      .text(GAME_WIDTH / 2, 120, `Checkpoint: ${name}`, {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#44FF44',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(Layer.UI)
      .setScrollFactor(0)
      .setAlpha(0);

    this.tweens.add({
      targets: notification,
      alpha: 1,
      y: 100,
      duration: 300,
      hold: 1500,
      yoyo: true,
      onComplete: () => notification.destroy(),
    });
  }

  // ==========================================================================
  // EVENTS
  // ==========================================================================

  /**
   * Setup event listeners.
   */
  private setupEvents(): void {
    // Combat feedback for UI
    this.eventBus.on('combat:feedback', (event) => {
      const data = event.data as {
        hitPosition: { x: number; y: number };
        damage: number;
        damageType: string;
        attackerId: EntityId;
        hitType: string;
      };

      // Spawn damage number
      this.damageNumbers.spawn(
        data.hitPosition,
        data.damage,
        data.damageType === 'critical' ? 'critical' : data.damageType === 'force' ? 'force' : 'normal'
      );

      // Update combo counter (only for player attacks)
      if (data.attackerId === 0) {
        this.comboCounter.increment();
      }

      // Apply hit feedback
      this.hitFeedback.applyHitFeedback(data.hitType as 'light' | 'heavy' | 'critical' | 'kill' | 'force');
    });

    // Enemy death
    this.eventBus.on('enemy:death', (event) => {
      const data = event.data as { enemyId: EntityId; position: { x: number; y: number } };
      this.onEnemyDeath(data.enemyId, data.position);
    });

    // Destructible destroyed
    this.eventBus.on('destructible:destroyed', (event) => {
      const data = event.data as {
        id: string;
        position: { x: number; y: number };
        lootDrops: Array<{ type: string; value: number }>;
      };
      this.onDestructibleDestroyed(data.id, data.position, data.lootDrops);
    });

    // Pickup collected
    this.eventBus.on('pickup:collected', (event) => {
      const data = event.data as {
        id: string;
        pickupType: PickupType;
        value: number;
        effectType: string;
      };
      this.onPickupCollected(data);
    });

    // Combo dropped
    this.eventBus.on('combat:combo_dropped', () => {
      this.comboCounter.reset();
    });

    // Player death
    this.eventBus.on('player:death', () => {
      this.showGameOver();
    });

    // Player respawn
    this.eventBus.on('player:respawn', (event) => {
      const data = event.data as { position: { x: number; y: number } };
      if (this.player) {
        this.player.getSprite().setPosition(data.position.x, data.position.y);
        this.player.heal(this.player.getMaxHealth());
      }
    });

    // Force power consumption
    this.eventBus.on('player:force_consumed', (event) => {
      const data = event.data as { amount: number };
      if (this.player) {
        this.player.consumeForce(data.amount);
      }
    });

    // Force power used - spawn additional visual effects
    this.eventBus.on('force:power_used', (event) => {
      const data = event.data as {
        powerType: ForcePowerType;
        position: { x: number; y: number };
        direction: number;
        targetsHit: EntityId[];
      };

      // Spawn additional p5.js effects based on power type
      if (this.effectsLayer) {
        switch (data.powerType) {
          case ForcePowerType.Push:
            this.effectsLayer.spawnForcePushCone(
              data.position,
              data.direction,
              250,
              60,
              { r: 80, g: 80, b: 200 }
            );
            break;
          case ForcePowerType.Pull:
            this.effectsLayer.spawnForcePullVortex(
              data.position,
              200,
              { r: 150, g: 50, b: 180 }
            );
            break;
          case ForcePowerType.Lightning:
            // Lightning effects are already spawned in ForceSystem
            // Add dark side aura around Vader
            this.effectsLayer.spawnDarkSideAura(
              data.position,
              50,
              { r: 30, g: 0, b: 80 },
              800
            );
            break;
        }
      }

      // Spawn impact sparks at each target hit
      for (const targetId of data.targetsHit) {
        const enemy = this.activeEnemies.get(targetId);
        if (enemy && this.effectsLayer) {
          const enemyPos = enemy.getPosition();
          this.effectsLayer.spawnImpactSparks(
            enemyPos,
            { r: 100, g: 100, b: 255 },
            6,
            15
          );
        }
      }
    });
  }

  /**
   * Handle enemy death.
   */
  private onEnemyDeath(enemyId: EntityId, position: { x: number; y: number }): void {
    const enemy = this.activeEnemies.get(enemyId);
    if (!enemy) return;

    // Mark as cleared
    this.levelManager.markEnemyCleared(`enemy_${position.x}_${position.y}`);

    // Death effect
    const sprite = enemy.getSprite();
    this.tweens.add({
      targets: sprite,
      alpha: 0,
      scale: 0.5,
      duration: 300,
      onComplete: () => {
        this.activeEnemies.delete(enemyId);
        this.enemyBars.remove(enemyId);
        enemy.destroy();
      },
    });

    // Chance to drop health pickup
    if (Math.random() < 0.3) {
      this.spawnPickup(position.x, position.y, 'health', 25);
    }
  }

  /**
   * Handle destructible destroyed.
   */
  private onDestructibleDestroyed(
    id: string,
    position: { x: number; y: number },
    lootDrops: Array<{ type: string; value: number }>
  ): void {
    // Spawn loot pickups
    for (const drop of lootDrops) {
      const offsetX = Phaser.Math.Between(-20, 20);
      const offsetY = Phaser.Math.Between(-20, 20);

      if (drop.type === 'health') {
        this.spawnPickup(position.x + offsetX, position.y + offsetY, 'health', drop.value);
      } else if (drop.type === 'force') {
        this.spawnPickup(position.x + offsetX, position.y + offsetY, 'force', drop.value);
      }
    }

    // Remove from tracking
    this.activeDestructibles.delete(id);
  }

  /**
   * Handle pickup collected.
   */
  private onPickupCollected(data: {
    id: string;
    pickupType: PickupType;
    value: number;
    effectType: string;
  }): void {
    // Apply effect to player
    if (!this.player) return;

    switch (data.effectType) {
      case 'restore_health':
        this.player.heal(data.value);
        break;
      case 'restore_force':
        // Force restoration would need to be added to Player class
        break;
      case 'extend_combo':
        // Combo extension would need to be added to ComboSystem
        break;
    }

    // Mark as collected for level state
    this.levelManager.markPickupCollected(data.id);

    // Remove from tracking
    this.activePickups.delete(data.id);
  }

  // ==========================================================================
  // INPUT HANDLERS
  // ==========================================================================

  /**
   * Setup input handlers.
   */
  private setupInputHandlers(): void {
    // Pause input
    this.input.keyboard!.on('keydown-ESC', () => {
      this.togglePause();
    });

    // Debug keys
    this.input.keyboard!.on('keydown-F1', () => {
      this.combatManager.setDebug(true);
    });

    this.input.keyboard!.on('keydown-F2', () => {
      this.combatManager.setDebug(false);
    });
  }

  // ==========================================================================
  // ALLIES
  // ==========================================================================

  /**
   * Update allies to follow player.
   */
  private updateAllies(delta: number): void {
    if (!this.player) return;

    const playerPos = this.player.getPosition();

    this.allies.getChildren().forEach((ally, index) => {
      const allySprite = ally as Phaser.GameObjects.Sprite;
      const allyBody = allySprite.body as Phaser.Physics.Arcade.Body;

      // Calculate follow position in formation
      const angle = (index / this.allies.getLength()) * Math.PI * 2 + Math.PI;
      const followDistance = 80;
      const targetX = playerPos.x + Math.cos(angle) * followDistance;
      const targetY = playerPos.y + Math.sin(angle) * followDistance;

      // Move towards target
      const dx = targetX - allySprite.x;
      const dy = targetY - allySprite.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 10) {
        allyBody.setVelocity((dx / distance) * 120, (dy / distance) * 120);
      } else {
        allyBody.setVelocity(0, 0);
      }

      // Face same direction as player
      allySprite.setFlipX(!this.player.isFacingRight());
    });
  }

  // ==========================================================================
  // PAUSE / GAME OVER
  // ==========================================================================

  /**
   * Toggle pause state.
   */
  private togglePause(): void {
    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      const overlay = this.add
        .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
        .setOrigin(0, 0)
        .setDepth(Layer.UI + 10)
        .setScrollFactor(0);

      const pauseText = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'PAUSED', {
          fontFamily: 'Arial Black',
          fontSize: '64px',
          color: '#FFFFFF',
        })
        .setOrigin(0.5)
        .setDepth(Layer.UI + 11)
        .setScrollFactor(0);

      const resumeText = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, 'Press ESC to Resume', {
          fontFamily: 'Arial',
          fontSize: '24px',
          color: '#AAAAAA',
        })
        .setOrigin(0.5)
        .setDepth(Layer.UI + 11)
        .setScrollFactor(0);

      (this as unknown as { pauseOverlay: Phaser.GameObjects.GameObject[] }).pauseOverlay = [
        overlay,
        pauseText,
        resumeText,
      ];

      this.physics.pause();
    } else {
      const pauseOverlay = (this as unknown as { pauseOverlay: Phaser.GameObjects.GameObject[] }).pauseOverlay;
      if (pauseOverlay) {
        pauseOverlay.forEach((obj) => obj.destroy());
      }

      this.physics.resume();
    }
  }

  /**
   * Show game over screen.
   */
  private showGameOver(): void {
    this.isPaused = true;
    this.physics.pause();

    const overlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8)
      .setOrigin(0, 0)
      .setDepth(Layer.UI + 10)
      .setScrollFactor(0);

    const gameOverText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 'GAME OVER', {
        fontFamily: 'Arial Black',
        fontSize: '72px',
        color: '#FF0000',
      })
      .setOrigin(0.5)
      .setDepth(Layer.UI + 11)
      .setScrollFactor(0);

    const restartText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, 'Press SPACE to Respawn at Checkpoint', {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#FFFFFF',
      })
      .setOrigin(0.5)
      .setDepth(Layer.UI + 11)
      .setScrollFactor(0);

    // Respawn on space
    this.input.keyboard!.once('keydown-SPACE', () => {
      overlay.destroy();
      gameOverText.destroy();
      restartText.destroy();
      this.isPaused = false;
      this.physics.resume();
      this.levelManager.respawnAtCheckpoint();
    });
  }

  /**
   * Cleanup when scene is destroyed.
   */
  shutdown(): void {
    this.clearEntities();
    this.levelManager.destroy();

    // Cleanup Force Power & Effects systems
    if (this.forceSystem) {
      this.forceSystem.destroy();
    }
    if (this.screenShake) {
      this.screenShake.destroy();
    }
    if (this.hitStop) {
      this.hitStop.destroy();
    }
    if (this.effectsLayer) {
      this.effectsLayer.destroy();
    }
  }
}
