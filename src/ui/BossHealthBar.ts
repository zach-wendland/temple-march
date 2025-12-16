/**
 * BossHealthBar - AAA-quality boss health bar with multi-phase segments.
 * Displays Cin Drallig (and other boss) health at the bottom of the screen.
 * Features: Phase segments, damage preview, name/title display, phase transition effects.
 */

import Phaser from 'phaser';
import { Layer } from '../core/types';
import { ENEMY_HEALTH_CONFIG, COLORS, TYPOGRAPHY } from './CombatUIConfig';

/**
 * Boss phase configuration.
 */
export interface BossPhase {
  /** Phase number (1-indexed) */
  number: number;
  /** Health threshold to enter this phase (percentage 0-1) */
  threshold: number;
  /** Optional name for this phase */
  name?: string;
  /** Color override for this phase */
  color?: number;
}

/**
 * Boss configuration for the health bar.
 */
export interface BossConfig {
  /** Boss name */
  name: string;
  /** Boss title (subtitle) */
  title: string;
  /** Maximum health */
  maxHealth: number;
  /** Number of phases */
  phases: BossPhase[];
  /** Custom bar color */
  barColor?: number;
}

/**
 * BossHealthBar - Screen-anchored boss health display.
 */
export class BossHealthBar {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;

  // Graphics layers
  private backgroundBar!: Phaser.GameObjects.Graphics;
  private damagePreviewBar!: Phaser.GameObjects.Graphics;
  private healthBar!: Phaser.GameObjects.Graphics;
  private segmentDividers!: Phaser.GameObjects.Graphics;
  private borderGraphics!: Phaser.GameObjects.Graphics;

  // Text elements
  private nameText!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;

  // Configuration
  private config: BossConfig;
  private barConfig = ENEMY_HEALTH_CONFIG.BOSS;

  // State
  private _currentHealth: number;
  private _maxHealth: number;
  private displayedHealth: number;
  private previewHealth: number;
  private currentPhase: number = 1;
  private isVisible: boolean = false;
  private phaseTransitionTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, config: BossConfig) {
    this.scene = scene;
    this.config = config;
    this._maxHealth = config.maxHealth;
    this._currentHealth = config.maxHealth;
    this.displayedHealth = config.maxHealth;
    this.previewHealth = config.maxHealth;

    this.createElements();
    this.hide(); // Start hidden
  }

  /**
   * Create all UI elements.
   */
  private createElements(): void {
    const { position, width, height, borderWidth } = this.barConfig;

    // Container positioned at bottom center
    this.container = this.scene.add.container(position.x, position.y);
    this.container.setDepth(Layer.UI + 5); // Above regular UI
    this.container.setScrollFactor(0); // Fixed to screen

    // Background
    this.backgroundBar = this.scene.add.graphics();
    this.drawBackground();

    // Damage preview bar
    this.damagePreviewBar = this.scene.add.graphics();

    // Main health bar
    this.healthBar = this.scene.add.graphics();

    // Phase segment dividers
    this.segmentDividers = this.scene.add.graphics();
    this.drawSegmentDividers();

    // Border
    this.borderGraphics = this.scene.add.graphics();
    this.drawBorder();

    // Boss name (above bar)
    this.nameText = this.scene.add.text(0, -50, this.config.name, {
      fontFamily: TYPOGRAPHY.FONT_PRIMARY,
      fontSize: `${TYPOGRAPHY.SIZE.BOSS_NAME}px`,
      color: '#FFD700', // Gold for bosses
      stroke: '#000000',
      strokeThickness: 4,
    });
    this.nameText.setOrigin(0.5, 0.5);
    this.nameText.setLetterSpacing(3);

    // Boss title (below name)
    this.titleText = this.scene.add.text(0, -25, this.config.title, {
      fontFamily: TYPOGRAPHY.FONT_SECONDARY,
      fontSize: '16px',
      color: '#CCCCCC',
      stroke: '#000000',
      strokeThickness: 2,
    });
    this.titleText.setOrigin(0.5, 0.5);
    this.titleText.setLetterSpacing(2);

    // Phase indicator (right side)
    this.phaseText = this.scene.add.text(
      width / 2 + 20,
      height / 2,
      `Phase ${this.currentPhase}`,
      {
        fontFamily: TYPOGRAPHY.FONT_SECONDARY,
        fontSize: '14px',
        color: '#888888',
      }
    );
    this.phaseText.setOrigin(0, 0.5);

    // Add to container (order matters for layering)
    this.container.add([
      this.backgroundBar,
      this.damagePreviewBar,
      this.healthBar,
      this.segmentDividers,
      this.borderGraphics,
      this.nameText,
      this.titleText,
      this.phaseText,
    ]);

    // Initial render
    this.updateHealthBar();
  }

  /**
   * Draw the background rectangle.
   */
  private drawBackground(): void {
    const { width, height } = this.barConfig;
    this.backgroundBar.clear();
    this.backgroundBar.fillStyle(0x1a1a1a, 1);
    this.backgroundBar.fillRect(-width / 2, 0, width, height);
  }

  /**
   * Draw the border.
   */
  private drawBorder(): void {
    const { width, height, borderWidth } = this.barConfig;
    this.borderGraphics.clear();
    this.borderGraphics.lineStyle(borderWidth, 0x666666, 1);
    this.borderGraphics.strokeRect(
      -width / 2 - borderWidth / 2,
      -borderWidth / 2,
      width + borderWidth,
      height + borderWidth
    );

    // Decorative corner accents
    const accentSize = 8;
    this.borderGraphics.lineStyle(2, 0xffd700, 1); // Gold accents

    // Top-left
    this.borderGraphics.beginPath();
    this.borderGraphics.moveTo(-width / 2 - 2, accentSize);
    this.borderGraphics.lineTo(-width / 2 - 2, -2);
    this.borderGraphics.lineTo(-width / 2 + accentSize, -2);
    this.borderGraphics.strokePath();

    // Top-right
    this.borderGraphics.beginPath();
    this.borderGraphics.moveTo(width / 2 + 2, accentSize);
    this.borderGraphics.lineTo(width / 2 + 2, -2);
    this.borderGraphics.lineTo(width / 2 - accentSize, -2);
    this.borderGraphics.strokePath();

    // Bottom-left
    this.borderGraphics.beginPath();
    this.borderGraphics.moveTo(-width / 2 - 2, height - accentSize);
    this.borderGraphics.lineTo(-width / 2 - 2, height + 2);
    this.borderGraphics.lineTo(-width / 2 + accentSize, height + 2);
    this.borderGraphics.strokePath();

    // Bottom-right
    this.borderGraphics.beginPath();
    this.borderGraphics.moveTo(width / 2 + 2, height - accentSize);
    this.borderGraphics.lineTo(width / 2 + 2, height + 2);
    this.borderGraphics.lineTo(width / 2 - accentSize, height + 2);
    this.borderGraphics.strokePath();
  }

  /**
   * Draw segment dividers for multi-phase bosses.
   */
  private drawSegmentDividers(): void {
    const { width, height } = this.barConfig;
    const phases = this.config.phases;

    this.segmentDividers.clear();
    this.segmentDividers.lineStyle(2, 0x000000, 0.8);

    for (let i = 1; i < phases.length; i++) {
      const threshold = phases[i].threshold;
      const xPos = -width / 2 + width * threshold;
      this.segmentDividers.beginPath();
      this.segmentDividers.moveTo(xPos, 0);
      this.segmentDividers.lineTo(xPos, height);
      this.segmentDividers.strokePath();
    }
  }

  /**
   * Update the health bar graphics.
   */
  private updateHealthBar(): void {
    const { width, height } = this.barConfig;
    const healthPercent = this._currentHealth / this._maxHealth;
    const previewPercent = this.previewHealth / this._maxHealth;
    const currentWidth = healthPercent * width;
    const previewWidth = previewPercent * width;

    // Clear previous
    this.healthBar.clear();
    this.damagePreviewBar.clear();

    // Draw damage preview (white bar behind health)
    if (this.previewHealth > this._currentHealth) {
      this.damagePreviewBar.fillStyle(0xffffff, 0.5);
      this.damagePreviewBar.fillRect(
        -width / 2 + currentWidth,
        0,
        previewWidth - currentWidth,
        height
      );
    }

    // Draw health with gradient based on current phase
    if (currentWidth > 0) {
      const phaseColor = this.getPhaseColor();

      // Create gradient effect
      const gradientSteps = 20;
      for (let i = 0; i < gradientSteps; i++) {
        const t = i / (gradientSteps - 1);
        // Lighten the color at the top
        const lightenAmount = Math.floor(30 * (1 - t));
        const r = Math.min(255, ((phaseColor >> 16) & 0xff) + lightenAmount);
        const g = Math.min(255, ((phaseColor >> 8) & 0xff) + lightenAmount);
        const b = Math.min(255, (phaseColor & 0xff) + lightenAmount);
        const stepColor = (r << 16) | (g << 8) | b;

        const stepHeight = height / gradientSteps;
        this.healthBar.fillStyle(stepColor, 1);
        this.healthBar.fillRect(
          -width / 2,
          i * stepHeight,
          currentWidth,
          stepHeight + 1
        );
      }
    }
  }

  /**
   * Get the color for the current phase.
   */
  private getPhaseColor(): number {
    // Check for phase-specific color
    const phase = this.config.phases.find((p) => p.number === this.currentPhase);
    if (phase?.color) {
      return phase.color;
    }

    // Default boss colors per phase
    const healthPercent = this._currentHealth / this._maxHealth;
    if (healthPercent <= 0.33) {
      return 0xff4444; // Red - final phase
    } else if (healthPercent <= 0.66) {
      return 0xff8844; // Orange - second phase
    }
    return this.config.barColor ?? 0x44ff44; // Green - first phase (or custom)
  }

  /**
   * Set health with animation.
   */
  setHealth(current: number, max: number): void {
    const previousHealth = this._currentHealth;
    this._currentHealth = Math.max(0, current);
    this._maxHealth = max;

    // Taking damage
    if (current < previousHealth) {
      this.onDamage(previousHealth);
    }
    // Healing
    else if (current > previousHealth) {
      this.onHeal();
    }

    // Check for phase transition
    this.checkPhaseTransition();

    // Update display
    this.updateHealthBar();
  }

  /**
   * Handle damage taken.
   */
  private onDamage(previousHealth: number): void {
    // Flash the bar white
    this.flashBar(0xffffff, 100);

    // Set preview health for catch-up animation
    this.previewHealth = previousHealth;

    // Animate preview bar catching up
    this.scene.time.delayedCall(300, () => {
      this.scene.tweens.add({
        targets: this,
        previewHealth: this._currentHealth,
        duration: 400,
        ease: 'Power2',
        onUpdate: () => this.updateHealthBar(),
      });
    });
  }

  /**
   * Handle healing.
   */
  private onHeal(): void {
    this.scene.tweens.add({
      targets: this,
      displayedHealth: this._currentHealth,
      duration: 300,
      ease: 'Power2',
      onUpdate: () => this.updateHealthBar(),
    });
  }

  /**
   * Flash the bar.
   */
  private flashBar(color: number, duration: number): void {
    const { width, height } = this.barConfig;
    const flash = this.scene.add.graphics();
    flash.fillStyle(color, 0.6);
    flash.fillRect(-width / 2, 0, width, height);
    this.container.add(flash);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration,
      onComplete: () => flash.destroy(),
    });
  }

  /**
   * Check and handle phase transitions.
   */
  private checkPhaseTransition(): void {
    const healthPercent = this._currentHealth / this._maxHealth;

    // Find current phase based on health
    let newPhase = 1;
    for (let i = this.config.phases.length - 1; i >= 0; i--) {
      if (healthPercent <= this.config.phases[i].threshold) {
        newPhase = this.config.phases[i].number;
        break;
      }
    }

    if (newPhase !== this.currentPhase) {
      this.onPhaseTransition(newPhase);
    }
  }

  /**
   * Handle phase transition effects.
   */
  private onPhaseTransition(newPhase: number): void {
    const oldPhase = this.currentPhase;
    this.currentPhase = newPhase;

    // Update phase text
    const phase = this.config.phases.find((p) => p.number === newPhase);
    if (phase?.name) {
      this.phaseText.setText(phase.name);
    } else {
      this.phaseText.setText(`Phase ${newPhase}`);
    }

    // Phase transition flash effect
    this.flashBar(0xffd700, 200); // Gold flash

    // Screen shake would be triggered via event
    this.scene.events.emit('boss:phase_transition', {
      bossName: this.config.name,
      oldPhase,
      newPhase,
      healthPercent: this._currentHealth / this._maxHealth,
    });

    // Dramatic pulse animation on the bar
    if (this.phaseTransitionTween) {
      this.phaseTransitionTween.stop();
    }

    this.phaseTransitionTween = this.scene.tweens.add({
      targets: this.container,
      scaleX: { from: 1.05, to: 1 },
      scaleY: { from: 1.1, to: 1 },
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Flash the name gold
    this.scene.tweens.add({
      targets: this.nameText,
      alpha: { from: 0, to: 1 },
      duration: 150,
      yoyo: true,
      repeat: 2,
    });
  }

  /**
   * Show the boss bar with entrance animation.
   */
  show(): void {
    if (this.isVisible) return;
    this.isVisible = true;

    this.container.setAlpha(0);
    this.container.setScale(0.8);
    this.container.setVisible(true);

    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });
  }

  /**
   * Hide the boss bar with exit animation.
   */
  hide(): void {
    if (!this.isVisible) return;
    this.isVisible = false;

    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scaleY: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.container.setVisible(false);
      },
    });
  }

  /**
   * Update boss name (for multi-form bosses).
   */
  setName(name: string, title?: string): void {
    this.nameText.setText(name);
    if (title) {
      this.titleText.setText(title);
    }
  }

  /**
   * Get current phase number.
   */
  getCurrentPhase(): number {
    return this.currentPhase;
  }

  /**
   * Get health percentage.
   */
  getHealthPercent(): number {
    return this._currentHealth / this._maxHealth;
  }

  /**
   * Check if boss is visible.
   */
  getIsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Destroy the boss health bar.
   */
  destroy(): void {
    if (this.phaseTransitionTween) {
      this.phaseTransitionTween.stop();
    }
    this.container.destroy();
  }
}

/**
 * Factory function for creating standard boss health bars.
 */
export function createBossHealthBar(
  scene: Phaser.Scene,
  name: string,
  title: string,
  maxHealth: number,
  phaseCount: number = 3
): BossHealthBar {
  // Generate phase thresholds
  const phases: BossPhase[] = [];
  for (let i = 1; i <= phaseCount; i++) {
    phases.push({
      number: i,
      threshold: 1 - (i - 1) / phaseCount,
    });
  }

  return new BossHealthBar(scene, {
    name,
    title,
    maxHealth,
    phases,
  });
}

/**
 * Cin Drallig specific boss bar factory.
 */
export function createCinDralligHealthBar(scene: Phaser.Scene): BossHealthBar {
  return new BossHealthBar(scene, {
    name: 'CIN DRALLIG',
    title: 'Battlemaster of the Jedi Order',
    maxHealth: 3000, // Will be configured properly in boss class
    barColor: 0x44ff44, // Green for Jedi
    phases: [
      { number: 1, threshold: 1.0, name: 'Form I: Shii-Cho' },
      { number: 2, threshold: 0.66, name: 'Form IV: Ataru', color: 0x88ff88 },
      { number: 3, threshold: 0.33, name: 'Form VII: Juyo', color: 0xff8844 },
    ],
  });
}
