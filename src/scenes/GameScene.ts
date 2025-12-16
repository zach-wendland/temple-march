/**
 * GameScene - Main gameplay scene.
 * Integrates combat systems, player, enemies, and UI.
 */

import Phaser from 'phaser';
import { SceneKey, Layer, EntityId } from '../core/types';
import { GAME_WIDTH, GAME_HEIGHT, PLAYER_CONFIG } from '../config/GameConfig';
import { EventBus, CombatFeedbackEvent } from '../core/events/EventBus';

// Combat systems
import { CombatManager } from '../combat/CombatManager';
import { Faction, createDefaultStats } from '../combat/DamageCalculator';

// Input
import { InputManager } from '../input/InputManager';

// Entities
import { Player } from '../entities/Player';

// UI Components
import {
  ComboCounter,
  DamageNumberPool,
  HitFeedbackSystem,
  HealthBar,
  ForceBar,
  EnemyHealthBarManager,
} from '../ui';

interface GameSceneData {
  startScene?: SceneKey;
}

export class GameScene extends Phaser.Scene {
  // Core systems
  private eventBus!: EventBus;
  private inputManager!: InputManager;
  private combatManager!: CombatManager;

  // Player
  private player!: Player;

  // Groups
  private enemies!: Phaser.GameObjects.Group;
  private allies!: Phaser.GameObjects.Group;

  // UI Components
  private comboCounter!: ComboCounter;
  private damageNumbers!: DamageNumberPool;
  private hitFeedback!: HitFeedbackSystem;
  private healthBar!: HealthBar;
  private forceBar!: ForceBar;
  private enemyBars!: EnemyHealthBarManager;
  private sceneIndicator!: Phaser.GameObjects.Text;

  // Game state
  private isPaused = false;
  private enemyIdCounter = 100; // Start at 100 to avoid player ID

  constructor() {
    super({ key: SceneKey.Game });
  }

  init(data: GameSceneData): void {
    this.eventBus = new EventBus();
  }

  create(): void {
    // Background
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Create tile floor
    this.createFloor();

    // Create groups
    this.enemies = this.add.group();
    this.allies = this.add.group();

    // Initialize input manager
    this.inputManager = new InputManager(this);

    // Initialize combat manager
    this.combatManager = new CombatManager(this, this.eventBus, {
      debugHitboxes: false,
    });

    // Create player
    this.player = new Player(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      this.inputManager,
      this.combatManager,
      this.eventBus
    );

    // Create test enemies
    this.createTestEntities();

    // Create UI
    this.createUI();

    // Setup event listeners
    this.setupEvents();

    // Pause input
    this.input.keyboard!.on('keydown-ESC', () => {
      this.togglePause();
    });

    // Fade in
    this.cameras.main.fadeIn(500);
  }

  update(time: number, delta: number): void {
    if (this.isPaused) return;

    // Update input
    this.inputManager.update();

    // Update player
    this.player.update(delta);

    // Update combat manager
    this.combatManager.update(delta);

    // Update allies to follow player
    this.updateAllies(delta);

    // Update UI
    this.updateUI();
  }

  private createFloor(): void {
    // Clean dark gradient background
    const bg = this.add.graphics();
    bg.setDepth(Layer.Background);

    // Vertical gradient from dark blue to darker
    for (let y = 0; y < GAME_HEIGHT; y += 4) {
      const t = y / GAME_HEIGHT;
      const r = Math.floor(15 + t * 10);
      const g = Math.floor(15 + t * 5);
      const b = Math.floor(30 + t * 15);
      const color = (r << 16) | (g << 8) | b;
      bg.fillStyle(color, 1);
      bg.fillRect(0, y, GAME_WIDTH, 4);
    }

    // Subtle grid lines for temple floor effect
    const grid = this.add.graphics();
    grid.setDepth(Layer.Background + 1);
    grid.lineStyle(1, 0x2a2a3a, 0.3);

    // Vertical lines
    for (let x = 0; x < GAME_WIDTH; x += 64) {
      grid.lineBetween(x, 0, x, GAME_HEIGHT);
    }

    // Horizontal lines
    for (let y = 0; y < GAME_HEIGHT; y += 64) {
      grid.lineBetween(0, y, GAME_WIDTH, y);
    }
  }

  private createTestEntities(): void {
    // Create Jedi enemies
    const jediPositions = [
      { x: 200, y: 200 },
      { x: 1000, y: 150 },
      { x: 800, y: 500 },
      { x: 300, y: 600 },
    ];

    jediPositions.forEach((pos) => {
      this.createEnemy(pos.x, pos.y, Faction.Jedi, 'jedi_placeholder');
    });

    // Create Temple Guard
    this.createEnemy(600, 300, Faction.TempleGuard, 'guard_placeholder');

    // Create Clone allies
    const clonePositions = [
      { x: GAME_WIDTH / 2 - 60, y: GAME_HEIGHT / 2 + 40 },
      { x: GAME_WIDTH / 2 + 60, y: GAME_HEIGHT / 2 + 40 },
      { x: GAME_WIDTH / 2 - 40, y: GAME_HEIGHT / 2 + 80 },
      { x: GAME_WIDTH / 2 + 40, y: GAME_HEIGHT / 2 + 80 },
    ];

    clonePositions.forEach((pos) => {
      this.createAlly(pos.x, pos.y);
    });
  }

  private createEnemy(x: number, y: number, faction: Faction, texture: string): EntityId {
    const enemyId = this.enemyIdCounter++ as EntityId;

    const sprite = this.add.sprite(x, y, texture);
    sprite.setDepth(Layer.Entities);
    sprite.setData('entityId', enemyId);
    sprite.setData('faction', faction);

    this.physics.add.existing(sprite);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);

    this.enemies.add(sprite);

    // Register with combat manager
    const stats = createDefaultStats(faction);
    this.combatManager.registerEntity(enemyId, sprite, stats);

    // Simple AI: face player
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        const playerPos = this.player.getPosition();
        if (playerPos.x < sprite.x) {
          sprite.setFlipX(true);
        } else {
          sprite.setFlipX(false);
        }
      },
    });

    return enemyId;
  }

  private createAlly(x: number, y: number): void {
    const sprite = this.add.sprite(x, y, 'clone_placeholder');
    sprite.setDepth(Layer.Allies);

    this.physics.add.existing(sprite);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);

    this.allies.add(sprite);
  }

  private updateAllies(delta: number): void {
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

  private createUI(): void {
    // Initialize UI components
    this.comboCounter = new ComboCounter(this);
    this.damageNumbers = new DamageNumberPool(this);
    this.hitFeedback = new HitFeedbackSystem(this);
    this.healthBar = new HealthBar(this);
    this.forceBar = new ForceBar(this);
    this.enemyBars = new EnemyHealthBarManager(this);

    // Scene indicator
    this.sceneIndicator = this.add
      .text(GAME_WIDTH - 20, 20, 'Temple Interior', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#FFD700',
      })
      .setOrigin(1, 0)
      .setDepth(Layer.UI);

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
      .setDepth(Layer.UI);

    // Fade out hint after 5 seconds
    this.time.delayedCall(5000, () => {
      this.tweens.add({
        targets: hint,
        alpha: 0,
        duration: 1000,
      });
    });
  }

  private updateUI(): void {
    // Update health bar
    this.healthBar.setHealth(this.player.getHealth(), this.player.getMaxHealth());

    // Update force bar
    this.forceBar.setForce(this.player.getForce(), this.player.getMaxForce());

    // Update enemy health bars
    this.enemies.getChildren().forEach((enemy) => {
      const sprite = enemy as Phaser.GameObjects.Sprite;
      const entityId = sprite.getData('entityId') as EntityId;
      const stats = this.combatManager.getEntityStats(entityId);

      if (stats && stats.health < stats.maxHealth) {
        this.enemyBars.setHealth(entityId, stats.health, stats.maxHealth);
      }
    });

    // Update enemy bar positions
    this.enemyBars.update();
  }

  private setupEvents(): void {
    // Combat feedback for UI
    this.eventBus.on('combat:feedback', (event) => {
      const data = (event as CombatFeedbackEvent).data;

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
      this.hitFeedback.applyHitFeedback(data.hitType);
    });

    // Enemy death
    this.eventBus.on('combat:death', (event) => {
      const data = event.data as { entityId: EntityId; killerId?: EntityId };
      const entityId = data.entityId;

      // Find and destroy the enemy sprite
      const enemy = this.enemies.getChildren().find((e) => {
        const sprite = e as Phaser.GameObjects.Sprite;
        return sprite.getData('entityId') === entityId;
      });

      if (enemy) {
        const sprite = enemy as Phaser.GameObjects.Sprite;

        // Death effect
        this.tweens.add({
          targets: sprite,
          alpha: 0,
          scale: 0.5,
          duration: 300,
          onComplete: () => {
            this.combatManager.unregisterEntity(entityId);
            this.enemyBars.remove(entityId);
            sprite.destroy();
          },
        });
      }
    });

    // Combo dropped
    this.eventBus.on('combat:combo_dropped', (event) => {
      this.comboCounter.reset();
    });

    // Stagger break
    this.eventBus.on('combat:stagger_break', (event) => {
      const data = event.data as { entityId: EntityId };
      const entityId = data.entityId;
      // Visual feedback for stagger break
      const enemy = this.enemies.getChildren().find((e) => {
        return (e as Phaser.GameObjects.Sprite).getData('entityId') === entityId;
      });

      if (enemy) {
        const sprite = enemy as Phaser.GameObjects.Sprite;
        this.hitFeedback.applyHitFeedback('kill'); // Big screen shake
        sprite.setTint(0xffff00);
        this.time.delayedCall(500, () => sprite.clearTint());
      }
    });

    // Player death
    this.eventBus.on('player:death', () => {
      this.showGameOver();
    });

    // Debug: Toggle hitbox visualization
    this.input.keyboard!.on('keydown-F1', () => {
      this.combatManager.setDebug(true);
    });

    this.input.keyboard!.on('keydown-F2', () => {
      this.combatManager.setDebug(false);
    });
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      const overlay = this.add
        .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
        .setOrigin(0, 0)
        .setDepth(Layer.UI + 10);

      const pauseText = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'PAUSED', {
          fontFamily: 'Arial Black',
          fontSize: '64px',
          color: '#FFFFFF',
        })
        .setOrigin(0.5)
        .setDepth(Layer.UI + 11);

      const resumeText = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, 'Press ESC to Resume', {
          fontFamily: 'Arial',
          fontSize: '24px',
          color: '#AAAAAA',
        })
        .setOrigin(0.5)
        .setDepth(Layer.UI + 11);

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

  private showGameOver(): void {
    this.isPaused = true;
    this.physics.pause();

    const overlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8)
      .setOrigin(0, 0)
      .setDepth(Layer.UI + 10);

    const gameOverText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 'GAME OVER', {
        fontFamily: 'Arial Black',
        fontSize: '72px',
        color: '#FF0000',
      })
      .setOrigin(0.5)
      .setDepth(Layer.UI + 11);

    const restartText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, 'Press SPACE to Restart', {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#FFFFFF',
      })
      .setOrigin(0.5)
      .setDepth(Layer.UI + 11);

    // Restart on space
    this.input.keyboard!.once('keydown-SPACE', () => {
      this.scene.restart();
    });
  }
}
