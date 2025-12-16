/**
 * HealthBar - Vader's health bar with damage preview and low health effects.
 * AAA-quality design with gradient fill and smooth animations.
 */

import Phaser from 'phaser';
import { Layer } from '../core/types';
import { HEALTH_BAR_CONFIG, COLORS, TYPOGRAPHY } from './CombatUIConfig';

export class HealthBar {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;

  // Graphics layers
  private backgroundBar!: Phaser.GameObjects.Graphics;
  private damagePreviewBar!: Phaser.GameObjects.Graphics;
  private healthBar!: Phaser.GameObjects.Graphics;
  private borderGraphics!: Phaser.GameObjects.Graphics;
  private labelText!: Phaser.GameObjects.Text;

  // State
  private _currentHealth: number = 1;
  private _maxHealth: number = 1;
  private displayedHealth: number = 1;
  private previewHealth: number = 1;
  private lowHealthTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createElements();
  }

  /**
   * Create all bar elements.
   */
  private createElements(): void {
    const config = HEALTH_BAR_CONFIG;
    const { x, y } = config.POSITION;

    // Container for all elements
    this.container = this.scene.add.container(x, y);
    this.container.setDepth(Layer.UI);

    // Label
    this.labelText = this.scene.add.text(0, config.LABEL.offsetY, config.LABEL.text, {
      fontFamily: TYPOGRAPHY.FONT_PRIMARY,
      fontSize: `${config.LABEL.fontSize}px`,
      color: '#888888',
    });
    this.labelText.setLetterSpacing(3);

    // Background
    this.backgroundBar = this.scene.add.graphics();
    this.drawBackground();

    // Damage preview (white bar showing pending damage)
    this.damagePreviewBar = this.scene.add.graphics();

    // Main health bar
    this.healthBar = this.scene.add.graphics();

    // Border (on top)
    this.borderGraphics = this.scene.add.graphics();
    this.drawBorder();

    // Add to container in order
    this.container.add([
      this.labelText,
      this.backgroundBar,
      this.damagePreviewBar,
      this.healthBar,
      this.borderGraphics,
    ]);
  }

  /**
   * Draw the background rectangle.
   */
  private drawBackground(): void {
    const config = HEALTH_BAR_CONFIG;
    this.backgroundBar.clear();
    this.backgroundBar.fillStyle(config.COLORS.background, 1);
    this.backgroundBar.fillRect(0, 0, config.WIDTH, config.HEIGHT);
  }

  /**
   * Draw the border.
   */
  private drawBorder(): void {
    const config = HEALTH_BAR_CONFIG;
    this.borderGraphics.clear();
    this.borderGraphics.lineStyle(config.BORDER_WIDTH, config.COLORS.border, 1);
    this.borderGraphics.strokeRect(
      -config.BORDER_WIDTH / 2,
      -config.BORDER_WIDTH / 2,
      config.WIDTH + config.BORDER_WIDTH,
      config.HEIGHT + config.BORDER_WIDTH
    );
  }

  /**
   * Set health value with animation.
   */
  setHealth(current: number, max: number): void {
    const previousHealth = this._currentHealth;
    this._currentHealth = current;
    this._maxHealth = max;

    // Taking damage
    if (current < previousHealth) {
      this.onDamage(previousHealth);
    }
    // Healing
    else if (current > previousHealth) {
      this.onHeal();
    }

    // Update display
    this.updateHealthBar();

    // Check low health state
    this.checkLowHealth();
  }

  /**
   * Handle damage taken.
   */
  private onDamage(previousHealth: number): void {
    // Flash the bar
    this.flashBar(0xffffff, 100);

    // Set preview health (for catch-up animation)
    this.previewHealth = previousHealth / this._maxHealth;

    // Animate preview bar catch-up
    const config = HEALTH_BAR_CONFIG.DAMAGE_PREVIEW;
    this.scene.time.delayedCall(config.catchUpDelay, () => {
      this.animatePreviewCatchUp();
    });
  }

  /**
   * Handle healing.
   */
  private onHeal(): void {
    // Smooth heal animation
    this.scene.tweens.add({
      targets: this,
      displayedHealth: this._currentHealth / this._maxHealth,
      duration: 300,
      ease: 'Power2',
      onUpdate: () => this.updateHealthBar(),
    });
  }

  /**
   * Animate the damage preview bar catching up.
   */
  private animatePreviewCatchUp(): void {
    const targetHealth = this._currentHealth / this._maxHealth;
    const duration =
      ((this.previewHealth - targetHealth) * HEALTH_BAR_CONFIG.WIDTH) /
      (HEALTH_BAR_CONFIG.DAMAGE_PREVIEW.catchUpSpeed / 1000);

    this.scene.tweens.add({
      targets: this,
      previewHealth: targetHealth,
      duration: Math.max(duration * 1000, 100),
      ease: 'Linear',
      onUpdate: () => this.updateHealthBar(),
    });
  }

  /**
   * Flash the health bar.
   */
  private flashBar(color: number, duration: number): void {
    // Create flash overlay
    const flash = this.scene.add.graphics();
    flash.fillStyle(color, 0.5);
    flash.fillRect(0, 0, HEALTH_BAR_CONFIG.WIDTH, HEALTH_BAR_CONFIG.HEIGHT);
    this.container.add(flash);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: duration,
      onComplete: () => flash.destroy(),
    });
  }

  /**
   * Update the health bar graphics.
   */
  private updateHealthBar(): void {
    const config = HEALTH_BAR_CONFIG;
    const healthPercent = this._currentHealth / this._maxHealth;
    const currentWidth = healthPercent * config.WIDTH;
    const previewWidth = this.previewHealth * config.WIDTH;

    // Clear previous
    this.healthBar.clear();
    this.damagePreviewBar.clear();

    // Draw damage preview (white bar behind health)
    if (this.previewHealth > healthPercent) {
      this.damagePreviewBar.fillStyle(
        config.COLORS.damagePreview,
        config.DAMAGE_PREVIEW.alpha
      );
      this.damagePreviewBar.fillRect(currentWidth, 0, previewWidth - currentWidth, config.HEIGHT);
    }

    // Draw health gradient
    if (currentWidth > 0) {
      const colors = this.isLowHealth()
        ? config.LOW_HEALTH.colors
        : config.COLORS.health;

      // Create gradient effect with multiple rectangles
      const gradientSteps = 10;
      for (let i = 0; i < gradientSteps; i++) {
        const t = i / (gradientSteps - 1);
        const color = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(colors[0]),
          Phaser.Display.Color.ValueToColor(colors[1]),
          1,
          t
        );
        const stepColor = Phaser.Display.Color.GetColor(color.r, color.g, color.b);

        const stepWidth = currentWidth / gradientSteps;
        this.healthBar.fillStyle(stepColor, 1);
        this.healthBar.fillRect(i * stepWidth, 0, stepWidth + 1, config.HEIGHT);
      }
    }
  }

  /**
   * Check if health is in low state.
   */
  private isLowHealth(): boolean {
    return this._currentHealth / this._maxHealth <= HEALTH_BAR_CONFIG.LOW_HEALTH.threshold;
  }

  /**
   * Check and apply low health effects.
   */
  private checkLowHealth(): void {
    if (this.isLowHealth()) {
      this.startLowHealthPulse();
    } else {
      this.stopLowHealthPulse();
    }
  }

  /**
   * Start low health pulse animation.
   */
  private startLowHealthPulse(): void {
    if (this.lowHealthTween) return;

    const config = HEALTH_BAR_CONFIG.LOW_HEALTH;

    this.lowHealthTween = this.scene.tweens.add({
      targets: this.container,
      scaleX: { from: 1, to: 1.02 },
      scaleY: { from: 1, to: 1.02 },
      duration: config.pulseRate,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Stop low health pulse.
   */
  private stopLowHealthPulse(): void {
    if (this.lowHealthTween) {
      this.lowHealthTween.stop();
      this.lowHealthTween = null;
      this.container.setScale(1);
    }
  }

  /**
   * Get current health percent.
   */
  getHealthPercent(): number {
    return this._currentHealth / this._maxHealth;
  }

  /**
   * Destroy the health bar.
   */
  destroy(): void {
    this.stopLowHealthPulse();
    this.container.destroy();
  }
}
