/**
 * ComboCounter - AAA-quality combo counter display.
 * Implements visual escalation, tier coloring, and decay animation.
 */

import Phaser from 'phaser';
import { Layer } from '../core/types';
import {
  COMBO_CONFIG,
  TYPOGRAPHY,
  COLORS_HEX,
  getComboTierColor,
  getComboScaling,
} from './CombatUIConfig';

export class ComboCounter {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private labelText!: Phaser.GameObjects.Text;
  private numberText!: Phaser.GameObjects.Text;
  private scalingText!: Phaser.GameObjects.Text;

  private _count: number = 0;
  private decayTimer: Phaser.Time.TimerEvent | null = null;
  private warningTween: Phaser.Tweens.Tween | null = null;
  private isVisible: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createElements();
  }

  /**
   * Current combo count.
   */
  get count(): number {
    return this._count;
  }

  /**
   * Create all UI elements.
   */
  private createElements(): void {
    const { x, y } = COMBO_CONFIG.POSITION;

    // Container for all combo elements
    this.container = this.scene.add.container(x, y);
    this.container.setDepth(Layer.UI);
    this.container.setAlpha(0);

    // "COMBO" label
    this.labelText = this.scene.add.text(0, -50, 'COMBO', {
      fontFamily: TYPOGRAPHY.FONT_PRIMARY,
      fontSize: `${TYPOGRAPHY.SIZE.COMBO_LABEL}px`,
      color: COLORS_HEX.LABEL_GRAY,
    });
    this.labelText.setOrigin(1, 0.5);
    this.labelText.setLetterSpacing(4);

    // Main combo number
    this.numberText = this.scene.add.text(0, 0, '0', {
      fontFamily: TYPOGRAPHY.FONT_PRIMARY,
      fontSize: `${TYPOGRAPHY.SIZE.COMBO_NUMBER}px`,
      color: COLORS_HEX.HIT_WHITE,
      stroke: '#000000',
      strokeThickness: 4,
    });
    this.numberText.setOrigin(1, 0.5);

    // Damage scaling indicator
    this.scalingText = this.scene.add.text(0, 45, 'DMG: 100%', {
      fontFamily: TYPOGRAPHY.FONT_SECONDARY,
      fontSize: '20px',
      color: COLORS_HEX.COMBO_GOLD,
    });
    this.scalingText.setOrigin(1, 0.5);

    // Add to container
    this.container.add([this.labelText, this.numberText, this.scalingText]);
  }

  /**
   * Increment the combo counter.
   */
  increment(): void {
    this._count++;
    this.updateDisplay();
    this.playHitAnimation();
    this.resetDecayTimer();

    // Show if hidden
    if (!this.isVisible) {
      this.show();
    }
  }

  /**
   * Reset combo to zero.
   */
  reset(): void {
    this._count = 0;
    this.hide();
    this.stopDecayTimer();
  }

  /**
   * Update the display text and colors.
   */
  private updateDisplay(): void {
    // Update number
    this.numberText.setText(this._count.toString());

    // Update color based on tier
    const tierColor = getComboTierColor(this._count);
    this.numberText.setColor(tierColor);

    // Update scaling display
    const scaling = getComboScaling(this._count);
    this.scalingText.setText(`DMG: ${Math.round(scaling * 100)}%`);

    // Dim scaling text at minimum
    if (scaling === 0.5) {
      this.scalingText.setColor('#FF4444');
    } else {
      this.scalingText.setColor(COLORS_HEX.COMBO_GOLD);
    }
  }

  /**
   * Play the hit punch animation.
   */
  private playHitAnimation(): void {
    // Stop any existing tweens on the number
    this.scene.tweens.killTweensOf(this.numberText);

    // Scale punch
    this.numberText.setScale(COMBO_CONFIG.HIT_SCALE.from);
    this.scene.tweens.add({
      targets: this.numberText,
      scaleX: COMBO_CONFIG.HIT_SCALE.to,
      scaleY: COMBO_CONFIG.HIT_SCALE.to,
      duration: COMBO_CONFIG.HIT_SCALE.duration,
      ease: 'Back.easeOut',
    });

    // Shake on high combos
    if (this._count >= COMBO_CONFIG.SHAKE.threshold) {
      this.playShakeAnimation();
    }
  }

  /**
   * Play shake animation for high combos.
   */
  private playShakeAnimation(): void {
    const { intensity, duration } = COMBO_CONFIG.SHAKE;
    const originalX = 0;

    this.scene.tweens.add({
      targets: this.container,
      x: { from: originalX - intensity, to: originalX + intensity },
      duration: duration / 4,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.container.x = COMBO_CONFIG.POSITION.x;
      },
    });
  }

  /**
   * Show the combo counter with fade in.
   */
  private show(): void {
    this.isVisible = true;
    this.container.setScale(1);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 150,
      ease: 'Power2',
    });
  }

  /**
   * Hide the combo counter with animation.
   */
  private hide(): void {
    this.isVisible = false;
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.container.setScale(1);
      },
    });
  }

  /**
   * Reset the decay timer.
   */
  private resetDecayTimer(): void {
    this.stopDecayTimer();
    this.stopWarningAnimation();

    // Start new decay timer
    this.decayTimer = this.scene.time.addEvent({
      delay: COMBO_CONFIG.DECAY_TIME,
      callback: this.onDecay,
      callbackScope: this,
    });

    // Start warning animation near end
    this.scene.time.addEvent({
      delay: COMBO_CONFIG.DECAY_TIME - COMBO_CONFIG.WARNING_TIME,
      callback: this.startWarningAnimation,
      callbackScope: this,
    });
  }

  /**
   * Stop the decay timer.
   */
  private stopDecayTimer(): void {
    if (this.decayTimer) {
      this.decayTimer.destroy();
      this.decayTimer = null;
    }
  }

  /**
   * Start the warning pulse animation.
   */
  private startWarningAnimation(): void {
    if (!this.isVisible) return;

    this.warningTween = this.scene.tweens.add({
      targets: this.container,
      alpha: { from: 1, to: 0.7 },
      scaleX: { from: 1, to: 0.95 },
      scaleY: { from: 1, to: 0.95 },
      duration: 200,
      yoyo: true,
      repeat: -1,
    });
  }

  /**
   * Stop the warning animation.
   */
  private stopWarningAnimation(): void {
    if (this.warningTween) {
      this.warningTween.stop();
      this.warningTween = null;
      this.container.setAlpha(1);
      this.container.setScale(1);
    }
  }

  /**
   * Called when combo decays (drops).
   */
  private onDecay(): void {
    this.stopWarningAnimation();
    this._count = 0;
    this.hide();
  }

  /**
   * Get current combo for external systems.
   */
  getCombo(): number {
    return this._count;
  }

  /**
   * Get current damage scaling multiplier.
   */
  getScaling(): number {
    return getComboScaling(this._count);
  }

  /**
   * Destroy the combo counter.
   */
  destroy(): void {
    this.stopDecayTimer();
    this.stopWarningAnimation();
    this.container.destroy();
  }
}
