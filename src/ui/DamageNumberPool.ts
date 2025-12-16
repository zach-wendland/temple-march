/**
 * DamageNumberPool - Object-pooled damage number system.
 * Efficiently spawns and animates floating damage numbers.
 */

import Phaser from 'phaser';
import { Layer } from '../core/types';
import {
  DAMAGE_NUMBER_CONFIG,
  TYPOGRAPHY,
  getDamageSize,
} from './CombatUIConfig';

export type DamageType = 'normal' | 'critical' | 'force' | 'blocked';

interface PooledDamageNumber {
  text: Phaser.GameObjects.Text;
  active: boolean;
}

export class DamageNumberPool {
  private scene: Phaser.Scene;
  private pool: PooledDamageNumber[] = [];
  private poolSize: number;

  constructor(scene: Phaser.Scene, poolSize?: number) {
    this.scene = scene;
    this.poolSize = poolSize ?? DAMAGE_NUMBER_CONFIG.POOL_SIZE;
    this.initializePool();
  }

  /**
   * Initialize the object pool.
   */
  private initializePool(): void {
    for (let i = 0; i < this.poolSize; i++) {
      const text = this.scene.add.text(0, 0, '', {
        fontFamily: TYPOGRAPHY.FONT_PRIMARY,
        fontSize: '32px',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 3,
      });

      text.setOrigin(0.5);
      text.setDepth(Layer.UI + 10);
      text.setActive(false);
      text.setVisible(false);

      this.pool.push({ text, active: false });
    }
  }

  /**
   * Spawn a damage number at the given position.
   */
  spawn(
    position: { x: number; y: number },
    damage: number,
    type: DamageType = 'normal'
  ): void {
    // Find inactive pooled object
    const pooledObj = this.pool.find((obj) => !obj.active);
    if (!pooledObj) {
      console.warn('DamageNumberPool exhausted');
      return;
    }

    pooledObj.active = true;
    const text = pooledObj.text;

    // Calculate spawn position with random offset
    const offsetX = Phaser.Math.Between(
      DAMAGE_NUMBER_CONFIG.SPAWN_OFFSET.x.min,
      DAMAGE_NUMBER_CONFIG.SPAWN_OFFSET.x.max
    );
    const spawnX = position.x + offsetX;
    const spawnY = position.y + DAMAGE_NUMBER_CONFIG.SPAWN_OFFSET.y;

    text.setPosition(spawnX, spawnY);

    // Apply style based on damage type
    this.applyStyle(text, damage, type);

    // Show the text
    text.setActive(true);
    text.setVisible(true);
    text.setAlpha(1);

    // Initial scale for critical hits
    const initialScale = type === 'critical' ? 1.5 : 1;
    text.setScale(initialScale);

    // Animate
    this.animateDamageNumber(pooledObj, type);
  }

  /**
   * Apply visual style based on damage type.
   */
  private applyStyle(
    text: Phaser.GameObjects.Text,
    damage: number,
    type: DamageType
  ): void {
    const styles = DAMAGE_NUMBER_CONFIG.STYLES;
    const style = styles[type];

    // Set text content
    text.setText(damage.toString());

    // Calculate size
    let fontSize: number;
    if ('fixedSize' in style && style.fixedSize) {
      fontSize = style.fixedSize;
    } else {
      fontSize = getDamageSize(damage);
      if ('sizeMultiplier' in style && style.sizeMultiplier) {
        fontSize = Math.round(fontSize * style.sizeMultiplier);
      }
    }

    // Apply style
    text.setFontSize(fontSize);
    text.setColor(style.color);
    text.setStroke(style.stroke, style.strokeWidth);
  }

  /**
   * Animate the damage number float and fade.
   */
  private animateDamageNumber(
    pooledObj: PooledDamageNumber,
    type: DamageType
  ): void {
    const text = pooledObj.text;
    const config = DAMAGE_NUMBER_CONFIG.FLOAT;

    // Random horizontal drift
    const driftX = Phaser.Math.Between(-15, 15);

    // Main float animation
    this.scene.tweens.add({
      targets: text,
      y: text.y - config.distance,
      x: text.x + driftX,
      duration: config.duration,
      ease: 'Power2',
    });

    // Scale down (except for blocked which stays small)
    const targetScale = type === 'critical' ? 1.0 : 0.8;
    this.scene.tweens.add({
      targets: text,
      scaleX: targetScale,
      scaleY: targetScale,
      duration: config.duration,
      ease: 'Power2',
    });

    // Fade out
    this.scene.tweens.add({
      targets: text,
      alpha: 0,
      delay: config.fadeStart,
      duration: config.fadeDuration,
      ease: 'Linear',
      onComplete: () => {
        this.returnToPool(pooledObj);
      },
    });
  }

  /**
   * Return a damage number to the pool.
   */
  private returnToPool(pooledObj: PooledDamageNumber): void {
    pooledObj.active = false;
    pooledObj.text.setActive(false);
    pooledObj.text.setVisible(false);
  }

  /**
   * Spawn multiple damage numbers for multi-hit attacks.
   * Staggers the spawn times to prevent overlap.
   */
  spawnMultiple(
    position: { x: number; y: number },
    damages: number[],
    type: DamageType = 'normal',
    staggerMs: number = 100
  ): void {
    damages.forEach((damage, index) => {
      this.scene.time.delayedCall(index * staggerMs, () => {
        // Slight position offset for each number
        const offsetPosition = {
          x: position.x + index * 10,
          y: position.y - index * 15,
        };
        this.spawn(offsetPosition, damage, type);
      });
    });
  }

  /**
   * Spawn a combined damage number (for rapid hits).
   */
  spawnCombined(
    position: { x: number; y: number },
    totalDamage: number,
    hitCount: number,
    type: DamageType = 'normal'
  ): void {
    // For combined damage, always show as slightly larger
    const adjustedType: DamageType =
      hitCount >= 3 && type === 'normal' ? 'critical' : type;
    this.spawn(position, totalDamage, adjustedType);
  }

  /**
   * Get pool statistics for debugging.
   */
  getPoolStats(): { total: number; active: number; available: number } {
    const active = this.pool.filter((obj) => obj.active).length;
    return {
      total: this.poolSize,
      active,
      available: this.poolSize - active,
    };
  }

  /**
   * Clear all active damage numbers.
   */
  clearAll(): void {
    this.pool.forEach((obj) => {
      if (obj.active) {
        this.scene.tweens.killTweensOf(obj.text);
        this.returnToPool(obj);
      }
    });
  }

  /**
   * Destroy the pool and all objects.
   */
  destroy(): void {
    this.clearAll();
    this.pool.forEach((obj) => obj.text.destroy());
    this.pool = [];
  }
}
