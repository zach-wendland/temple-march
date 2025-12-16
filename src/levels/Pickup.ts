/**
 * Pickup - Collectible items for health, force, and other bonuses.
 * Used throughout temple levels for player restoration and power-ups.
 */

import Phaser from 'phaser';
import { EventBus } from '../core/events/EventBus';
import { EntityId, Layer } from '../core/types';
import {
  InteractiveObject,
  InteractiveObjectConfig,
  InteractionResult,
} from './InteractiveObject';

/**
 * Types of pickup items.
 */
export type PickupType = 'health' | 'force' | 'health_large' | 'force_large' | 'combo_extender';

/**
 * Pickup configuration.
 */
export interface PickupConfig extends Omit<InteractiveObjectConfig, 'type'> {
  pickupType: PickupType;
  value: number;
  magnetDistance: number; // Distance at which pickup starts moving toward player
  collectDistance: number; // Distance at which pickup is collected
  bobHeight: number; // Visual bob animation height
  bobSpeed: number; // Visual bob animation speed
  glowColor: number; // Glow effect color
  respawns: boolean; // Whether pickup respawns after collection
  respawnTime: number; // Time in ms before respawn
  collectSound?: string;
}

/**
 * Default configurations for pickup types.
 */
export const PICKUP_DEFAULTS: Record<PickupType, Partial<PickupConfig>> = {
  health: {
    value: 25,
    magnetDistance: 80,
    collectDistance: 30,
    bobHeight: 4,
    bobSpeed: 2,
    glowColor: 0x44ff44,
    respawns: false,
    respawnTime: 0,
  },
  force: {
    value: 20,
    magnetDistance: 80,
    collectDistance: 30,
    bobHeight: 4,
    bobSpeed: 2.5,
    glowColor: 0x4488ff,
    respawns: false,
    respawnTime: 0,
  },
  health_large: {
    value: 75,
    magnetDistance: 100,
    collectDistance: 35,
    bobHeight: 6,
    bobSpeed: 1.5,
    glowColor: 0x00ff00,
    respawns: false,
    respawnTime: 0,
  },
  force_large: {
    value: 50,
    magnetDistance: 100,
    collectDistance: 35,
    bobHeight: 6,
    bobSpeed: 2,
    glowColor: 0x0066ff,
    respawns: false,
    respawnTime: 0,
  },
  combo_extender: {
    value: 3000, // Adds 3 seconds to combo timer
    magnetDistance: 60,
    collectDistance: 25,
    bobHeight: 5,
    bobSpeed: 3,
    glowColor: 0xffff00,
    respawns: false,
    respawnTime: 0,
  },
};

/**
 * Pickup - Collectible item.
 */
export class Pickup extends InteractiveObject {
  // Pickup-specific properties
  private pickupType: PickupType;
  private value: number;
  private magnetDistance: number;
  private collectDistance: number;
  private bobHeight: number;
  private bobSpeed: number;
  private glowColor: number;
  private respawns: boolean;
  private respawnTime: number;
  private collectSound?: string;

  // State
  private isCollected: boolean = false;
  private isBeingMagnetized: boolean = false;
  private respawnTimer: number = 0;
  private originalY: number;
  private bobPhase: number = 0;

  // Target for magnetization
  private magnetTarget: Phaser.GameObjects.GameObject | null = null;

  // Visual elements
  private glowEffect: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, config: PickupConfig, eventBus: EventBus) {
    // Get defaults for this type
    const defaults = PICKUP_DEFAULTS[config.pickupType] || {};

    super(
      scene,
      {
        ...config,
        type: 'pickup',
        depth: config.depth ?? Layer.Effects + 5,
        collisionEnabled: false,
        physicsEnabled: true,
      },
      eventBus
    );

    // Apply configuration with defaults
    this.pickupType = config.pickupType;
    this.value = config.value ?? defaults.value ?? 25;
    this.magnetDistance = config.magnetDistance ?? defaults.magnetDistance ?? 80;
    this.collectDistance = config.collectDistance ?? defaults.collectDistance ?? 30;
    this.bobHeight = config.bobHeight ?? defaults.bobHeight ?? 4;
    this.bobSpeed = config.bobSpeed ?? defaults.bobSpeed ?? 2;
    this.glowColor = config.glowColor ?? defaults.glowColor ?? 0x44ff44;
    this.respawns = config.respawns ?? defaults.respawns ?? false;
    this.respawnTime = config.respawnTime ?? defaults.respawnTime ?? 0;
    this.collectSound = config.collectSound;

    this.originalY = config.y;
    this.bobPhase = Math.random() * Math.PI * 2; // Random starting phase

    // Create glow effect
    this.createGlowEffect();
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Get pickup type.
   */
  getPickupType(): PickupType {
    return this.pickupType;
  }

  /**
   * Get pickup value.
   */
  getValue(): number {
    return this.value;
  }

  /**
   * Check if pickup has been collected.
   */
  getIsCollected(): boolean {
    return this.isCollected;
  }

  /**
   * Set the magnet target (usually the player).
   */
  setMagnetTarget(target: Phaser.GameObjects.GameObject | null): void {
    this.magnetTarget = target;
  }

  /**
   * Try to collect the pickup if in range.
   * Returns true if collected.
   */
  tryCollect(collector: Phaser.GameObjects.GameObject, collectorId: EntityId): boolean {
    if (this.isCollected || !this.isActive) {
      return false;
    }

    const distance = Phaser.Math.Distance.Between(
      this.sprite.x,
      this.sprite.y,
      collector.x,
      collector.y
    );

    if (distance <= this.collectDistance) {
      this.collect(collectorId);
      return true;
    }

    return false;
  }

  // ==========================================================================
  // INTERACTION HANDLERS
  // ==========================================================================

  /**
   * Handle interaction (direct collection).
   */
  protected onInteract(source: EntityId): InteractionResult {
    if (this.isCollected) {
      return { success: false, consumed: false, message: 'Already collected' };
    }

    this.collect(source);

    return {
      success: true,
      consumed: true,
      effectType: this.getEffectType(),
      effectValue: this.value,
      message: `Collected ${this.pickupType}`,
    };
  }

  /**
   * Handle damage (pickups are not damageable).
   */
  protected onDamage(damage: number, sourceId?: EntityId): boolean {
    return false;
  }

  /**
   * Override base update to handle respawn timer even when deactivated.
   */
  update(deltaMs: number): void {
    // Handle respawn timer even when deactivated/collected
    if (this.isCollected && this.respawns && this.respawnTimer > 0) {
      this.respawnTimer -= deltaMs;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
      return;
    }

    // Call base update for normal active behavior
    if (!this.isActive) return;
    this.onUpdate(deltaMs);
  }

  /**
   * Per-frame update (for active pickups).
   */
  protected onUpdate(deltaMs: number): void {
    if (this.isCollected) {
      return;
    }

    // Bob animation
    this.bobPhase += (deltaMs / 1000) * this.bobSpeed;
    const bobOffset = Math.sin(this.bobPhase) * this.bobHeight;
    this.sprite.y = this.originalY + bobOffset;

    // Update glow position
    if (this.glowEffect) {
      this.glowEffect.setPosition(this.sprite.x, this.sprite.y);
    }

    // Magnetization behavior
    if (this.magnetTarget && this.magnetTarget.active) {
      const distance = Phaser.Math.Distance.Between(
        this.sprite.x,
        this.sprite.y,
        this.magnetTarget.x,
        this.magnetTarget.y
      );

      if (distance <= this.magnetDistance) {
        this.isBeingMagnetized = true;
        this.moveTowardTarget(deltaMs);
      } else {
        this.isBeingMagnetized = false;
      }
    }

    // Pulse the glow
    if (this.glowEffect) {
      const glowScale = 1 + Math.sin(this.bobPhase * 2) * 0.2;
      this.glowEffect.setScale(glowScale);
    }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Create the glow effect around the pickup.
   */
  private createGlowEffect(): void {
    this.glowEffect = this.scene.add.graphics();
    this.glowEffect.setDepth(this.sprite.depth - 1);

    // Draw a glowing circle
    const radius = 16;
    this.glowEffect.fillStyle(this.glowColor, 0.3);
    this.glowEffect.fillCircle(0, 0, radius * 1.5);
    this.glowEffect.fillStyle(this.glowColor, 0.5);
    this.glowEffect.fillCircle(0, 0, radius);
    this.glowEffect.setPosition(this.sprite.x, this.sprite.y);
  }

  /**
   * Move toward the magnet target.
   */
  private moveTowardTarget(deltaMs: number): void {
    if (!this.magnetTarget) return;

    const speed = 300; // pixels per second
    const distance = Phaser.Math.Distance.Between(
      this.sprite.x,
      this.sprite.y,
      this.magnetTarget.x,
      this.magnetTarget.y
    );

    // Increase speed as we get closer
    const speedMultiplier = Math.max(0.5, 1 - distance / this.magnetDistance);
    const adjustedSpeed = speed * (1 + speedMultiplier);

    // Calculate direction
    const angle = Phaser.Math.Angle.Between(
      this.sprite.x,
      this.sprite.y,
      this.magnetTarget.x,
      this.magnetTarget.y
    );

    // Move toward target
    const moveX = Math.cos(angle) * adjustedSpeed * (deltaMs / 1000);
    const moveY = Math.sin(angle) * adjustedSpeed * (deltaMs / 1000);

    this.sprite.x += moveX;
    this.originalY += moveY; // Update originalY for correct bobbing
    this.sprite.y += moveY;
  }

  /**
   * Collect the pickup.
   */
  private collect(collectorId: EntityId): void {
    if (this.isCollected) return;

    this.isCollected = true;
    this.isInteractable = false;

    // Play collection sound
    if (this.collectSound) {
      this.scene.sound.play(this.collectSound, { volume: 0.6 });
    }

    // Collection animation
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.deactivate();
        if (this.respawns) {
          this.respawnTimer = this.respawnTime;
        }
      },
    });

    // Fade out glow
    if (this.glowEffect) {
      this.scene.tweens.add({
        targets: this.glowEffect,
        alpha: 0,
        duration: 200,
      });
    }

    // Emit collection event
    this.eventBus.emit({
      type: 'pickup:collected',
      data: {
        id: this.id,
        pickupType: this.pickupType,
        value: this.value,
        collectorId,
        effectType: this.getEffectType(),
      },
    });
  }

  /**
   * Get the effect type for this pickup.
   */
  private getEffectType(): string {
    switch (this.pickupType) {
      case 'health':
      case 'health_large':
        return 'restore_health';
      case 'force':
      case 'force_large':
        return 'restore_force';
      case 'combo_extender':
        return 'extend_combo';
      default:
        return 'unknown';
    }
  }

  /**
   * Respawn the pickup.
   */
  private respawn(): void {
    this.isCollected = false;
    this.isInteractable = true;
    this.sprite.setScale(1);
    this.sprite.setAlpha(1);
    this.activate();

    // Reset glow
    if (this.glowEffect) {
      this.glowEffect.setAlpha(1);
    }

    // Emit respawn event
    this.eventBus.emit({
      type: 'pickup:respawned',
      data: {
        id: this.id,
        pickupType: this.pickupType,
        position: this.getPosition(),
      },
    });
  }

  /**
   * Reset the pickup (for object pooling).
   */
  reset(x: number, y: number, pickupType?: PickupType, value?: number): void {
    this.sprite.setPosition(x, y);
    this.originalY = y;

    if (pickupType !== undefined) {
      this.pickupType = pickupType;
      const defaults = PICKUP_DEFAULTS[pickupType] || {};
      this.value = value ?? defaults.value ?? 25;
      this.glowColor = defaults.glowColor ?? 0x44ff44;

      // Recreate glow with new color
      if (this.glowEffect) {
        this.glowEffect.destroy();
      }
      this.createGlowEffect();
    } else if (value !== undefined) {
      this.value = value;
    }

    this.isCollected = false;
    this.isInteractable = true;
    this.isBeingMagnetized = false;
    this.respawnTimer = 0;
    this.bobPhase = Math.random() * Math.PI * 2;
    this.sprite.setScale(1);
    this.sprite.setAlpha(1);
    this.activate();

    if (this.glowEffect) {
      this.glowEffect.setAlpha(1);
    }
  }

  /**
   * Destroy the pickup.
   */
  destroy(): void {
    if (this.glowEffect) {
      this.glowEffect.destroy();
      this.glowEffect = null;
    }
    super.destroy();
  }
}

/**
 * Factory function to create pickups.
 */
export function createPickup(
  scene: Phaser.Scene,
  x: number,
  y: number,
  pickupType: PickupType,
  eventBus: EventBus,
  overrides: Partial<PickupConfig> = {}
): Pickup {
  const defaults = PICKUP_DEFAULTS[pickupType] || {};

  const config: PickupConfig = {
    id: `pickup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    x,
    y,
    spriteKey: `pickup_${pickupType}`,
    depth: Layer.Effects + 5,
    collisionEnabled: false,
    physicsEnabled: true,
    pickupType,
    value: defaults.value ?? 25,
    magnetDistance: defaults.magnetDistance ?? 80,
    collectDistance: defaults.collectDistance ?? 30,
    bobHeight: defaults.bobHeight ?? 4,
    bobSpeed: defaults.bobSpeed ?? 2,
    glowColor: defaults.glowColor ?? 0x44ff44,
    respawns: defaults.respawns ?? false,
    respawnTime: defaults.respawnTime ?? 0,
    ...overrides,
  };

  return new Pickup(scene, config, eventBus);
}
