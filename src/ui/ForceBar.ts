/**
 * ForceBar - Vader's Force meter with regen animation and full-meter glow.
 * Complements the health bar with a mystical Force energy aesthetic.
 */

import Phaser from 'phaser';
import { Layer } from '../core/types';
import { FORCE_BAR_CONFIG, COLORS, TYPOGRAPHY } from './CombatUIConfig';

export class ForceBar {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;

  // Graphics layers
  private backgroundBar!: Phaser.GameObjects.Graphics;
  private forceBar!: Phaser.GameObjects.Graphics;
  private regenPulse!: Phaser.GameObjects.Graphics;
  private borderGraphics!: Phaser.GameObjects.Graphics;
  private labelText!: Phaser.GameObjects.Text;
  private glowEffect: Phaser.GameObjects.Graphics | null = null;

  // State
  private _currentForce: number = 100;
  private _maxForce: number = 100;
  private displayedForce: number = 100;
  private isRegenerating: boolean = false;
  private fullGlowTween: Phaser.Tweens.Tween | null = null;
  private regenPulseTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createElements();
  }

  /**
   * Create all bar elements.
   */
  private createElements(): void {
    const config = FORCE_BAR_CONFIG;
    const { x, y } = config.POSITION;

    // Container
    this.container = this.scene.add.container(x, y);
    this.container.setDepth(Layer.UI);

    // Label
    this.labelText = this.scene.add.text(0, config.LABEL.offsetY, config.LABEL.text, {
      fontFamily: TYPOGRAPHY.FONT_PRIMARY,
      fontSize: `${config.LABEL.fontSize}px`,
      color: config.LABEL.color,
    });
    this.labelText.setLetterSpacing(2);

    // Background
    this.backgroundBar = this.scene.add.graphics();
    this.drawBackground();

    // Regen pulse effect (leading edge glow)
    this.regenPulse = this.scene.add.graphics();

    // Main force bar
    this.forceBar = this.scene.add.graphics();

    // Border
    this.borderGraphics = this.scene.add.graphics();
    this.drawBorder();

    // Add to container
    this.container.add([
      this.labelText,
      this.backgroundBar,
      this.regenPulse,
      this.forceBar,
      this.borderGraphics,
    ]);

    // Initial render
    this.updateForceBar();
  }

  /**
   * Draw background.
   */
  private drawBackground(): void {
    const config = FORCE_BAR_CONFIG;
    this.backgroundBar.clear();
    this.backgroundBar.fillStyle(config.COLORS.background, 1);
    this.backgroundBar.fillRect(0, 0, config.WIDTH, config.HEIGHT);
  }

  /**
   * Draw border.
   */
  private drawBorder(): void {
    const config = FORCE_BAR_CONFIG;
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
   * Set Force value.
   */
  setForce(current: number, max: number): void {
    const previousForce = this._currentForce;
    this._currentForce = current;
    this._maxForce = max;

    // Consuming Force
    if (current < previousForce) {
      this.onForceConsume();
    }
    // Regenerating
    else if (current > previousForce) {
      this.onForceRegen();
    }

    // Update display
    this.updateForceBar();

    // Check full meter
    this.checkFullMeter();
  }

  /**
   * Handle Force consumption.
   */
  private onForceConsume(): void {
    // Quick flash on use
    this.flashBar(0xffffff, 50);

    // Smooth decrease animation
    this.scene.tweens.add({
      targets: this,
      displayedForce: this._currentForce,
      duration: 100,
      ease: 'Power2',
      onUpdate: () => this.updateForceBar(),
    });
  }

  /**
   * Handle Force regeneration.
   */
  private onForceRegen(): void {
    // Start regen pulse if not already running
    if (!this.isRegenerating && this._currentForce < this._maxForce) {
      this.startRegenPulse();
    }

    // Smooth increase
    this.displayedForce = this._currentForce;
    this.updateForceBar();
  }

  /**
   * Flash the bar.
   */
  private flashBar(color: number, duration: number): void {
    const flash = this.scene.add.graphics();
    flash.fillStyle(color, 0.5);
    flash.fillRect(0, 0, FORCE_BAR_CONFIG.WIDTH, FORCE_BAR_CONFIG.HEIGHT);
    this.container.add(flash);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration,
      onComplete: () => flash.destroy(),
    });
  }

  /**
   * Start regen pulse animation.
   */
  private startRegenPulse(): void {
    if (this.regenPulseTween) return;

    this.isRegenerating = true;

    // Pulse the leading edge
    let pulseAlpha = 0;
    this.regenPulseTween = this.scene.tweens.add({
      targets: { alpha: 0 },
      alpha: 1,
      duration: 500,
      yoyo: true,
      repeat: -1,
      onUpdate: (tween) => {
        pulseAlpha = tween.getValue() as number;
        this.drawRegenPulse(pulseAlpha);
      },
    });
  }

  /**
   * Stop regen pulse.
   */
  private stopRegenPulse(): void {
    if (this.regenPulseTween) {
      this.regenPulseTween.stop();
      this.regenPulseTween = null;
      this.regenPulse.clear();
      this.isRegenerating = false;
    }
  }

  /**
   * Draw regen pulse effect.
   */
  private drawRegenPulse(alpha: number): void {
    const config = FORCE_BAR_CONFIG;
    const forcePercent = this._currentForce / this._maxForce;
    const currentWidth = forcePercent * config.WIDTH;

    this.regenPulse.clear();

    if (forcePercent < 1 && currentWidth > 0) {
      // Glowing leading edge
      this.regenPulse.fillStyle(config.COLORS.regenPulse, alpha * 0.6);
      this.regenPulse.fillRect(
        currentWidth - 4,
        0,
        8,
        config.HEIGHT
      );
    }
  }

  /**
   * Update the force bar graphics.
   */
  private updateForceBar(): void {
    const config = FORCE_BAR_CONFIG;
    const forcePercent = this._currentForce / this._maxForce;
    const currentWidth = forcePercent * config.WIDTH;

    this.forceBar.clear();

    if (currentWidth > 0) {
      // Check if low Force
      const isLowForce = forcePercent <= config.LOW_FORCE.threshold;
      const colors = isLowForce
        ? [config.LOW_FORCE.color, config.LOW_FORCE.color]
        : config.COLORS.force;

      // Draw gradient
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
        this.forceBar.fillStyle(stepColor, 1);
        this.forceBar.fillRect(i * stepWidth, 0, stepWidth + 1, config.HEIGHT);
      }
    }

    // Stop regen pulse when full
    if (forcePercent >= 1 && this.isRegenerating) {
      this.stopRegenPulse();
    }
  }

  /**
   * Check and apply full meter effects.
   */
  private checkFullMeter(): void {
    const isFull = this._currentForce >= this._maxForce;

    if (isFull && !this.fullGlowTween) {
      this.startFullGlow();
    } else if (!isFull && this.fullGlowTween) {
      this.stopFullGlow();
    }
  }

  /**
   * Start full meter glow.
   */
  private startFullGlow(): void {
    const config = FORCE_BAR_CONFIG.FULL_GLOW;

    // Create glow graphics if needed
    if (!this.glowEffect) {
      this.glowEffect = this.scene.add.graphics();
      this.container.addAt(this.glowEffect, 0); // Behind everything
    }

    // Pulsing glow
    let glowIntensity = 0.3;
    this.fullGlowTween = this.scene.tweens.add({
      targets: { intensity: 0.3 },
      intensity: 0.6,
      duration: config.pulseRate,
      yoyo: true,
      repeat: -1,
      onUpdate: (tween) => {
        glowIntensity = tween.getValue() as number;
        this.drawGlow(glowIntensity);
      },
    });
  }

  /**
   * Stop full meter glow.
   */
  private stopFullGlow(): void {
    if (this.fullGlowTween) {
      this.fullGlowTween.stop();
      this.fullGlowTween = null;
    }
    if (this.glowEffect) {
      this.glowEffect.clear();
    }
  }

  /**
   * Draw glow effect.
   */
  private drawGlow(intensity: number): void {
    if (!this.glowEffect) return;

    const config = FORCE_BAR_CONFIG;
    this.glowEffect.clear();

    // Outer glow
    const glowSize = 6;
    this.glowEffect.fillStyle(config.FULL_GLOW.color, intensity * 0.3);
    this.glowEffect.fillRect(
      -glowSize,
      -glowSize,
      config.WIDTH + glowSize * 2,
      config.HEIGHT + glowSize * 2
    );
  }

  /**
   * Preview Force cost (for ability hover).
   */
  previewCost(cost: number): void {
    // Show how much Force will be consumed
    const config = FORCE_BAR_CONFIG;
    const currentWidth = (this._currentForce / this._maxForce) * config.WIDTH;
    const costWidth = (cost / this._maxForce) * config.WIDTH;

    // Draw cost preview (red section)
    const preview = this.scene.add.graphics();
    preview.fillStyle(0xff0000, 0.5);
    preview.fillRect(currentWidth - costWidth, 0, costWidth, config.HEIGHT);
    this.container.add(preview);

    // Auto-remove on next frame
    this.scene.time.delayedCall(16, () => preview.destroy());
  }

  /**
   * Check if enough Force for cost.
   */
  hasEnoughForce(cost: number): boolean {
    return this._currentForce >= cost;
  }

  /**
   * Get current Force percent.
   */
  getForcePercent(): number {
    return this._currentForce / this._maxForce;
  }

  /**
   * Destroy the Force bar.
   */
  destroy(): void {
    this.stopRegenPulse();
    this.stopFullGlow();
    this.container.destroy();
  }
}
