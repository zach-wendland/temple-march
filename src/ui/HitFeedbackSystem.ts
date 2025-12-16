/**
 * HitFeedbackSystem - Screen-level combat feedback effects.
 * Handles screen shake, flash, hit stop, and camera effects.
 */

import Phaser from 'phaser';
import { HIT_FEEDBACK_CONFIG } from './CombatUIConfig';

export type HitType = 'light' | 'heavy' | 'critical' | 'kill' | 'force';

interface FeedbackSettings {
  shakeIntensity: number;
  flashIntensity: number;
  hitstopEnabled: boolean;
}

export class HitFeedbackSystem {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;
  private settings: FeedbackSettings;
  private isHitStopped: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;

    // Default settings (can be modified for accessibility)
    this.settings = {
      shakeIntensity: 1.0,
      flashIntensity: 1.0,
      hitstopEnabled: true,
    };
  }

  /**
   * Apply feedback based on hit type.
   */
  applyHitFeedback(type: HitType): void {
    switch (type) {
      case 'light':
        this.lightHitFeedback();
        break;
      case 'heavy':
        this.heavyHitFeedback();
        break;
      case 'critical':
        this.criticalHitFeedback();
        break;
      case 'kill':
        this.killFeedback();
        break;
      case 'force':
        this.forceFeedback();
        break;
    }
  }

  /**
   * Light attack hit feedback.
   */
  private lightHitFeedback(): void {
    const { SHAKE, FLASH } = HIT_FEEDBACK_CONFIG;

    this.screenShake(SHAKE.light.intensity, SHAKE.light.duration);
    this.screenFlash(
      FLASH.hitConfirm.color,
      FLASH.hitConfirm.alpha,
      FLASH.hitConfirm.duration
    );
  }

  /**
   * Heavy attack hit feedback.
   */
  private heavyHitFeedback(): void {
    const { SHAKE, FLASH, HITSTOP } = HIT_FEEDBACK_CONFIG;

    this.screenShake(SHAKE.heavy.intensity, SHAKE.heavy.duration);
    this.screenFlash(
      FLASH.hitConfirm.color,
      FLASH.hitConfirm.alpha * 1.3,
      FLASH.hitConfirm.duration * 1.5
    );
    this.hitStop(HITSTOP.heavy);
  }

  /**
   * Critical hit feedback - maximum impact.
   */
  private criticalHitFeedback(): void {
    const { SHAKE, FLASH, HITSTOP, ZOOM_PUNCH } = HIT_FEEDBACK_CONFIG;

    this.screenShake(SHAKE.critical.intensity, SHAKE.critical.duration);
    this.screenFlash(
      FLASH.critical.color,
      FLASH.critical.alpha,
      FLASH.critical.duration
    );
    this.hitStop(HITSTOP.critical);
    this.zoomPunch(ZOOM_PUNCH.scale, ZOOM_PUNCH.duration);
  }

  /**
   * Kill (final blow) feedback.
   */
  private killFeedback(): void {
    const { SHAKE, FLASH, HITSTOP } = HIT_FEEDBACK_CONFIG;

    this.screenShake(SHAKE.kill.intensity, SHAKE.kill.duration);
    this.screenFlash(FLASH.critical.color, 0.3, 150);
    this.hitStop(HITSTOP.kill);
  }

  /**
   * Force power feedback.
   */
  private forceFeedback(): void {
    const { SHAKE, FLASH } = HIT_FEEDBACK_CONFIG;

    this.screenShake(SHAKE.forcePush.intensity, SHAKE.forcePush.duration);
    this.screenFlash(
      FLASH.forceActivation.color,
      FLASH.forceActivation.alpha,
      FLASH.forceActivation.duration
    );
  }

  /**
   * Apply player damage feedback.
   */
  applyPlayerDamageFeedback(damagePercent: number): void {
    const { FLASH, SHAKE } = HIT_FEEDBACK_CONFIG;
    const config = FLASH.playerDamage;

    // Scale intensity based on damage
    const intensityMultiplier = Math.min(1 + damagePercent, 2);

    this.screenFlash(
      config.color,
      config.alpha * intensityMultiplier,
      config.duration
    );
    this.screenShake(
      SHAKE.heavy.intensity * intensityMultiplier,
      SHAKE.heavy.duration
    );

    // Red vignette for heavy damage
    if (damagePercent > 0.1) {
      this.applyVignette(0xff0000, 0.3, 300);
    }
  }

  /**
   * Apply screen shake.
   */
  private screenShake(intensity: number, duration: number): void {
    if (this.settings.shakeIntensity === 0) return;

    const adjustedIntensity = intensity * this.settings.shakeIntensity;
    this.camera.shake(duration, adjustedIntensity);
  }

  /**
   * Apply screen flash.
   */
  private screenFlash(color: number, alpha: number, duration: number): void {
    if (this.settings.flashIntensity === 0) return;

    const adjustedAlpha = alpha * this.settings.flashIntensity;
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    this.camera.flash(duration, r, g, b, true);
  }

  /**
   * Apply hit stop (freeze frame).
   */
  private hitStop(duration: number): void {
    if (!this.settings.hitstopEnabled || duration === 0 || this.isHitStopped) {
      return;
    }

    this.isHitStopped = true;

    // Pause physics
    this.scene.physics.pause();

    // Pause all tweens
    this.scene.tweens.pauseAll();

    // Resume after duration
    this.scene.time.delayedCall(duration, () => {
      this.scene.physics.resume();
      this.scene.tweens.resumeAll();
      this.isHitStopped = false;
    });
  }

  /**
   * Apply zoom punch effect.
   */
  private zoomPunch(scale: number, duration: number): void {
    const originalZoom = this.camera.zoom;

    this.scene.tweens.add({
      targets: this.camera,
      zoom: originalZoom * scale,
      duration: duration / 2,
      yoyo: true,
      ease: 'Power2',
    });
  }

  /**
   * Apply vignette effect.
   */
  private applyVignette(
    color: number,
    intensity: number,
    duration: number
  ): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    // Create vignette graphics
    const vignette = this.scene.add.graphics();
    vignette.setDepth(90);

    // Create gradient-like vignette with multiple rects
    const steps = 8;
    const edgeWidth = width * 0.15;
    const edgeHeight = height * 0.15;

    for (let i = 0; i < steps; i++) {
      const stepAlpha = (intensity / steps) * (steps - i);
      vignette.fillStyle(color, stepAlpha);

      const inset = (i / steps) * edgeWidth;
      const insetY = (i / steps) * edgeHeight;

      // Left edge
      vignette.fillRect(0, 0, edgeWidth - inset, height);
      // Right edge
      vignette.fillRect(width - edgeWidth + inset, 0, edgeWidth - inset, height);
      // Top edge
      vignette.fillRect(0, 0, width, edgeHeight - insetY);
      // Bottom edge
      vignette.fillRect(0, height - edgeHeight + insetY, width, edgeHeight - insetY);
    }

    // Fade out
    this.scene.tweens.add({
      targets: vignette,
      alpha: 0,
      duration: duration,
      ease: 'Power2',
      onComplete: () => {
        vignette.destroy();
      },
    });
  }

  /**
   * Apply low health vignette (persistent).
   */
  applyLowHealthVignette(healthPercent: number): void {
    // This would be called from the health bar when HP is low
    // Implementation would create a persistent vignette that pulses
  }

  /**
   * Apply slowmo effect for special moments.
   */
  applySlowmo(timeScale: number, duration: number): void {
    this.scene.time.timeScale = timeScale;

    this.scene.time.delayedCall(duration / timeScale, () => {
      this.scene.time.timeScale = 1;
    });
  }

  /**
   * Update accessibility settings.
   */
  updateSettings(settings: Partial<FeedbackSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Get current settings.
   */
  getSettings(): FeedbackSettings {
    return { ...this.settings };
  }
}
