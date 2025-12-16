/**
 * EnemyHealthBar - Health bars for enemies with auto-hide and stagger support.
 * Supports minion, elite, and boss variants.
 */

import Phaser from 'phaser';
import { Layer } from '../core/types';
import { ENEMY_HEALTH_CONFIG, COLORS, TYPOGRAPHY } from './CombatUIConfig';

export type EnemyType = 'minion' | 'elite' | 'boss';

interface EnemyHealthBarConfig {
  width: number;
  height: number;
  offsetY: number;
  borderWidth: number;
  showWhenFull: boolean;
  showName?: boolean;
  hideDelay?: number;
}

export class EnemyHealthBar {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private target: Phaser.GameObjects.Sprite | null = null;

  // Graphics
  private backgroundBar!: Phaser.GameObjects.Graphics;
  private healthBar!: Phaser.GameObjects.Graphics;
  private staggerBar: Phaser.GameObjects.Graphics | null = null;
  private nameText: Phaser.GameObjects.Text | null = null;

  // Config
  private config: EnemyHealthBarConfig;
  private enemyType: EnemyType;

  // State
  private _currentHealth: number = 100;
  private _maxHealth: number = 100;
  private _currentStagger: number = 0;
  private _maxStagger: number = 100;
  private hideTimer: Phaser.Time.TimerEvent | null = null;
  private isVisible: boolean = false;

  constructor(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.Sprite,
    type: EnemyType = 'minion',
    name?: string
  ) {
    this.scene = scene;
    this.target = target;
    this.enemyType = type;
    this.config = this.getConfig(type);

    this.createElements(name);
  }

  /**
   * Get configuration based on enemy type.
   */
  private getConfig(type: EnemyType): EnemyHealthBarConfig {
    switch (type) {
      case 'elite':
        return ENEMY_HEALTH_CONFIG.ELITE;
      case 'boss':
        return {
          ...ENEMY_HEALTH_CONFIG.BOSS,
          offsetY: 0, // Boss bar is screen-positioned
          showWhenFull: true,
        };
      default:
        return ENEMY_HEALTH_CONFIG.MINION;
    }
  }

  /**
   * Create health bar elements.
   */
  private createElements(name?: string): void {
    // Container
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(Layer.UI - 10);
    this.container.setAlpha(0);

    // Background
    this.backgroundBar = this.scene.add.graphics();
    this.backgroundBar.fillStyle(COLORS.BAR_BACKGROUND, 1);
    this.backgroundBar.fillRect(
      -this.config.width / 2,
      0,
      this.config.width,
      this.config.height
    );

    // Border
    this.backgroundBar.lineStyle(this.config.borderWidth, COLORS.BAR_BORDER, 1);
    this.backgroundBar.strokeRect(
      -this.config.width / 2 - this.config.borderWidth / 2,
      -this.config.borderWidth / 2,
      this.config.width + this.config.borderWidth,
      this.config.height + this.config.borderWidth
    );

    // Health bar
    this.healthBar = this.scene.add.graphics();

    // Add to container
    this.container.add([this.backgroundBar, this.healthBar]);

    // Name tag for elites
    if (this.config.showName && name) {
      this.nameText = this.scene.add.text(0, -12, name, {
        fontFamily: TYPOGRAPHY.FONT_SECONDARY,
        fontSize: '10px',
        color: '#AAAAAA',
      });
      this.nameText.setOrigin(0.5, 1);
      this.container.add(this.nameText);
    }

    // Stagger bar for elites
    if (this.enemyType === 'elite') {
      this.createStaggerBar();
    }

    // Initial state
    if (this.config.showWhenFull) {
      this.show();
    }
  }

  /**
   * Create stagger/posture bar.
   */
  private createStaggerBar(): void {
    const staggerConfig = ENEMY_HEALTH_CONFIG.STAGGER;

    this.staggerBar = this.scene.add.graphics();
    this.container.add(this.staggerBar);
  }

  /**
   * Set health values.
   */
  setHealth(current: number, max: number): void {
    const wasAtFull = this._currentHealth >= this._maxHealth;
    this._currentHealth = current;
    this._maxHealth = max;

    // Show bar on damage
    if (!wasAtFull || this.config.showWhenFull) {
      this.show();
    } else if (current < max && !this.isVisible) {
      this.show();
    }

    // Update display
    this.updateHealthBar();

    // Start hide timer for minions
    if (this.enemyType === 'minion' && this.config.hideDelay) {
      this.resetHideTimer();
    }
  }

  /**
   * Set stagger values (for elites).
   */
  setStagger(current: number, max: number): void {
    this._currentStagger = current;
    this._maxStagger = max;
    this.updateStaggerBar();
  }

  /**
   * Update health bar graphics.
   */
  private updateHealthBar(): void {
    this.healthBar.clear();

    const healthPercent = Math.max(0, this._currentHealth / this._maxHealth);
    const width = healthPercent * this.config.width;

    if (width > 0) {
      this.healthBar.fillStyle(COLORS.IMPERIAL_CRIMSON, 1);
      this.healthBar.fillRect(-this.config.width / 2, 0, width, this.config.height);
    }
  }

  /**
   * Update stagger bar graphics.
   */
  private updateStaggerBar(): void {
    if (!this.staggerBar) return;

    const staggerConfig = ENEMY_HEALTH_CONFIG.STAGGER;
    this.staggerBar.clear();

    // Background
    this.staggerBar.fillStyle(COLORS.BAR_BACKGROUND, 1);
    this.staggerBar.fillRect(
      -staggerConfig.width / 2,
      this.config.height + 4,
      staggerConfig.width,
      staggerConfig.height
    );

    // Stagger fill
    const staggerPercent = this._currentStagger / this._maxStagger;
    const width = staggerPercent * staggerConfig.width;

    if (width > 0) {
      const isBreaking = staggerPercent >= staggerConfig.breakThreshold;
      const color = isBreaking ? staggerConfig.breakingColor : staggerConfig.color;

      this.staggerBar.fillStyle(color, 1);
      this.staggerBar.fillRect(
        -staggerConfig.width / 2,
        this.config.height + 4,
        width,
        staggerConfig.height
      );
    }
  }

  /**
   * Update position to follow target.
   */
  update(): void {
    if (!this.target || !this.target.active) {
      this.hide();
      return;
    }

    // For non-boss types, follow the target
    if (this.enemyType !== 'boss') {
      this.container.setPosition(
        this.target.x,
        this.target.y + this.config.offsetY
      );
    }
  }

  /**
   * Show the health bar.
   */
  show(): void {
    if (this.isVisible) return;

    this.isVisible = true;
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 150,
      ease: 'Power2',
    });
  }

  /**
   * Hide the health bar.
   */
  hide(): void {
    if (!this.isVisible) return;

    this.isVisible = false;
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
    });
  }

  /**
   * Reset the hide timer.
   */
  private resetHideTimer(): void {
    if (this.hideTimer) {
      this.hideTimer.destroy();
    }

    if (this.config.hideDelay) {
      this.hideTimer = this.scene.time.addEvent({
        delay: this.config.hideDelay,
        callback: () => {
          if (this._currentHealth >= this._maxHealth) {
            this.hide();
          }
        },
      });
    }
  }

  /**
   * Flash on damage.
   */
  flashDamage(): void {
    const flash = this.scene.add.graphics();
    flash.fillStyle(0xffffff, 0.5);
    flash.fillRect(
      -this.config.width / 2,
      0,
      this.config.width,
      this.config.height
    );
    this.container.add(flash);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 100,
      onComplete: () => flash.destroy(),
    });
  }

  /**
   * Destroy the health bar.
   */
  destroy(): void {
    if (this.hideTimer) {
      this.hideTimer.destroy();
    }
    this.container.destroy();
  }
}

/**
 * EnemyHealthBarManager - Manages health bars for multiple enemies.
 */
export class EnemyHealthBarManager {
  private scene: Phaser.Scene;
  private healthBars: Map<number, EnemyHealthBar> = new Map();
  private nextId: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Create a health bar for an enemy.
   */
  create(
    target: Phaser.GameObjects.Sprite,
    type: EnemyType = 'minion',
    name?: string
  ): number {
    const id = this.nextId++;
    const healthBar = new EnemyHealthBar(this.scene, target, type, name);
    this.healthBars.set(id, healthBar);
    return id;
  }

  /**
   * Update health for an enemy.
   */
  setHealth(id: number, current: number, max: number): void {
    const bar = this.healthBars.get(id);
    if (bar) {
      bar.setHealth(current, max);
    }
  }

  /**
   * Update stagger for an enemy.
   */
  setStagger(id: number, current: number, max: number): void {
    const bar = this.healthBars.get(id);
    if (bar) {
      bar.setStagger(current, max);
    }
  }

  /**
   * Flash damage on a health bar.
   */
  flashDamage(id: number): void {
    const bar = this.healthBars.get(id);
    if (bar) {
      bar.flashDamage();
    }
  }

  /**
   * Update all health bars.
   */
  update(): void {
    this.healthBars.forEach((bar) => bar.update());
  }

  /**
   * Remove a health bar.
   */
  remove(id: number): void {
    const bar = this.healthBars.get(id);
    if (bar) {
      bar.destroy();
      this.healthBars.delete(id);
    }
  }

  /**
   * Destroy all health bars.
   */
  destroy(): void {
    this.healthBars.forEach((bar) => bar.destroy());
    this.healthBars.clear();
  }
}
