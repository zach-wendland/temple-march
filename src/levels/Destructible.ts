/**
 * Destructible - Breakable environment objects.
 * Examples: crates, pillars, consoles, statues, etc.
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
 * Types of destructible objects.
 */
export type DestructibleType =
  | 'crate'
  | 'pillar'
  | 'console'
  | 'statue'
  | 'barrel'
  | 'holotable'
  | 'archive_shelf'
  | 'training_dummy';

/**
 * Loot drop configuration.
 */
export interface LootDrop {
  type: 'health' | 'force' | 'none';
  chance: number; // 0-1
  minValue: number;
  maxValue: number;
}

/**
 * Destructible configuration.
 */
export interface DestructibleConfig extends Omit<InteractiveObjectConfig, 'type'> {
  destructibleType: DestructibleType;
  health: number;
  maxHealth: number;
  lootDrops: LootDrop[];
  debris: boolean;
  debrisCount: number;
  destroyAnimation?: string;
  destroySound?: string;
  hitSound?: string;
  invulnerableTime: number; // Brief invulnerability after being hit
}

/**
 * Default configurations for destructible types.
 */
export const DESTRUCTIBLE_DEFAULTS: Record<DestructibleType, Partial<DestructibleConfig>> = {
  crate: {
    health: 50,
    maxHealth: 50,
    debris: true,
    debrisCount: 4,
    invulnerableTime: 100,
    lootDrops: [
      { type: 'health', chance: 0.3, minValue: 15, maxValue: 25 },
      { type: 'force', chance: 0.2, minValue: 10, maxValue: 20 },
    ],
  },
  pillar: {
    health: 200,
    maxHealth: 200,
    debris: true,
    debrisCount: 8,
    invulnerableTime: 200,
    lootDrops: [],
  },
  console: {
    health: 75,
    maxHealth: 75,
    debris: true,
    debrisCount: 3,
    invulnerableTime: 150,
    lootDrops: [{ type: 'force', chance: 0.5, minValue: 15, maxValue: 30 }],
  },
  statue: {
    health: 150,
    maxHealth: 150,
    debris: true,
    debrisCount: 6,
    invulnerableTime: 200,
    lootDrops: [],
  },
  barrel: {
    health: 30,
    maxHealth: 30,
    debris: true,
    debrisCount: 3,
    invulnerableTime: 50,
    lootDrops: [{ type: 'health', chance: 0.4, minValue: 10, maxValue: 20 }],
  },
  holotable: {
    health: 100,
    maxHealth: 100,
    debris: true,
    debrisCount: 5,
    invulnerableTime: 150,
    lootDrops: [{ type: 'force', chance: 0.4, minValue: 20, maxValue: 40 }],
  },
  archive_shelf: {
    health: 80,
    maxHealth: 80,
    debris: true,
    debrisCount: 6,
    invulnerableTime: 100,
    lootDrops: [],
  },
  training_dummy: {
    health: 1000,
    maxHealth: 1000,
    debris: false,
    debrisCount: 0,
    invulnerableTime: 0,
    lootDrops: [],
  },
};

/**
 * Destructible - Breakable environment object.
 */
export class Destructible extends InteractiveObject {
  // Destructible-specific properties
  private destructibleType: DestructibleType;
  private health: number;
  private maxHealth: number;
  private lootDrops: LootDrop[];
  private debris: boolean;
  private debrisCount: number;
  private destroyAnimation?: string;
  private destroySound?: string;
  private hitSound?: string;
  private invulnerableTime: number;

  // State
  private isDestroyed: boolean = false;
  private invulnerableUntil: number = 0;
  private hitFlashTime: number = 0;

  // Visual feedback
  private originalTint: number = 0xffffff;

  constructor(scene: Phaser.Scene, config: DestructibleConfig, eventBus: EventBus) {
    // Get defaults for this type
    const defaults = DESTRUCTIBLE_DEFAULTS[config.destructibleType] || {};

    super(
      scene,
      {
        ...config,
        type: 'destructible',
        depth: config.depth ?? Layer.Terrain + 3,
        collisionEnabled: true,
        physicsEnabled: true,
      },
      eventBus
    );

    // Apply configuration with defaults
    this.destructibleType = config.destructibleType;
    this.health = config.health ?? defaults.health ?? 50;
    this.maxHealth = config.maxHealth ?? defaults.maxHealth ?? 50;
    this.lootDrops = config.lootDrops ?? defaults.lootDrops ?? [];
    this.debris = config.debris ?? defaults.debris ?? true;
    this.debrisCount = config.debrisCount ?? defaults.debrisCount ?? 4;
    this.destroyAnimation = config.destroyAnimation;
    this.destroySound = config.destroySound;
    this.hitSound = config.hitSound;
    this.invulnerableTime = config.invulnerableTime ?? defaults.invulnerableTime ?? 100;

    // Make the physics body static for collision
    if (this.body && this.body instanceof Phaser.Physics.Arcade.Body) {
      this.body.setImmovable(true);
    }
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Get current health.
   */
  getHealth(): number {
    return this.health;
  }

  /**
   * Get max health.
   */
  getMaxHealth(): number {
    return this.maxHealth;
  }

  /**
   * Get health percentage (0-1).
   */
  getHealthPercent(): number {
    return this.health / this.maxHealth;
  }

  /**
   * Check if destroyed.
   */
  getIsDestroyed(): boolean {
    return this.isDestroyed;
  }

  /**
   * Get destructible type.
   */
  getDestructibleType(): DestructibleType {
    return this.destructibleType;
  }

  // ==========================================================================
  // INTERACTION HANDLERS
  // ==========================================================================

  /**
   * Handle interaction (attack/use).
   */
  protected onInteract(source: EntityId): InteractionResult {
    // Default interaction deals damage
    const destroyed = this.applyDamage(10, source);

    return {
      success: true,
      consumed: destroyed,
      effectType: destroyed ? 'destroyed' : 'damaged',
      message: destroyed ? 'Object destroyed' : 'Object damaged',
    };
  }

  /**
   * Handle damage application.
   */
  protected onDamage(damage: number, sourceId?: EntityId): boolean {
    // Check if currently invulnerable
    const now = Date.now();
    if (now < this.invulnerableUntil) {
      return false;
    }

    // Apply damage
    this.health = Math.max(0, this.health - damage);

    // Visual feedback - flash red
    this.hitFlashTime = 150;
    this.sprite.setTint(0xff4444);

    // Play hit sound
    if (this.hitSound) {
      this.scene.sound.play(this.hitSound, { volume: 0.5 });
    }

    // Set invulnerability
    this.invulnerableUntil = now + this.invulnerableTime;

    // Emit damage event
    this.eventBus.emit({
      type: 'destructible:damaged',
      data: {
        id: this.id,
        destructibleType: this.destructibleType,
        damage,
        currentHealth: this.health,
        maxHealth: this.maxHealth,
        sourceId,
      },
    });

    // Check for destruction
    if (this.health <= 0) {
      this.onDestroy(sourceId);
      return true;
    }

    return false;
  }

  /**
   * Handle destruction.
   */
  private onDestroy(sourceId?: EntityId): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.isInteractable = false;

    // Play destroy animation if available
    if (this.destroyAnimation) {
      this.sprite.play(this.destroyAnimation);
      this.sprite.once('animationcomplete', () => {
        this.finalizeDestruction(sourceId);
      });
    } else {
      // Default destruction effect
      this.playDefaultDestructionEffect();
      this.finalizeDestruction(sourceId);
    }

    // Play destroy sound
    if (this.destroySound) {
      this.scene.sound.play(this.destroySound, { volume: 0.7 });
    }
  }

  /**
   * Play default destruction visual effect.
   */
  private playDefaultDestructionEffect(): void {
    // Scale down and fade
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 0.5,
      scaleY: 0.5,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
    });
  }

  /**
   * Finalize destruction - spawn debris and loot.
   */
  private finalizeDestruction(sourceId?: EntityId): void {
    const position = this.getPosition();

    // Spawn debris particles
    if (this.debris && this.debrisCount > 0) {
      this.spawnDebris(position);
    }

    // Roll for loot drops
    const drops = this.rollLootDrops();

    // Emit destruction event with loot info
    this.eventBus.emit({
      type: 'destructible:destroyed',
      data: {
        id: this.id,
        destructibleType: this.destructibleType,
        position,
        sourceId,
        lootDrops: drops,
      },
    });

    // Deactivate the object
    this.deactivate();
  }

  /**
   * Spawn debris particles.
   */
  private spawnDebris(position: { x: number; y: number }): void {
    // Create debris particles using Phaser graphics or sprites
    for (let i = 0; i < this.debrisCount; i++) {
      const debris = this.scene.add.rectangle(
        position.x,
        position.y,
        Phaser.Math.Between(4, 12),
        Phaser.Math.Between(4, 12),
        this.getDebrisColor()
      );
      debris.setDepth(Layer.Effects);

      // Physics for debris
      this.scene.physics.add.existing(debris);
      const body = debris.body as Phaser.Physics.Arcade.Body;

      // Random velocity
      const angle = Phaser.Math.DegToRad(Phaser.Math.Between(0, 360));
      const speed = Phaser.Math.Between(100, 250);
      body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      body.setDrag(200);

      // Fade out and destroy
      this.scene.tweens.add({
        targets: debris,
        alpha: 0,
        duration: Phaser.Math.Between(500, 1000),
        onComplete: () => debris.destroy(),
      });
    }
  }

  /**
   * Get debris color based on destructible type.
   */
  private getDebrisColor(): number {
    switch (this.destructibleType) {
      case 'crate':
        return 0x8b4513; // Brown
      case 'pillar':
        return 0x808080; // Gray
      case 'console':
        return 0x444444; // Dark gray
      case 'statue':
        return 0xa0a0a0; // Light gray
      case 'barrel':
        return 0x654321; // Dark brown
      case 'holotable':
        return 0x4488ff; // Blue
      case 'archive_shelf':
        return 0x8b4513; // Brown
      default:
        return 0x666666; // Default gray
    }
  }

  /**
   * Roll for loot drops.
   */
  private rollLootDrops(): Array<{ type: string; value: number }> {
    const drops: Array<{ type: string; value: number }> = [];

    for (const loot of this.lootDrops) {
      if (Math.random() <= loot.chance) {
        const value = Phaser.Math.Between(loot.minValue, loot.maxValue);
        drops.push({ type: loot.type, value });
      }
    }

    return drops;
  }

  /**
   * Per-frame update.
   */
  protected onUpdate(deltaMs: number): void {
    // Handle hit flash
    if (this.hitFlashTime > 0) {
      this.hitFlashTime = Math.max(0, this.hitFlashTime - deltaMs);
      if (this.hitFlashTime <= 0) {
        this.sprite.setTint(this.originalTint);
      }
    }

    // Show damage state through tint if below 50% health
    if (!this.isDestroyed && this.hitFlashTime <= 0) {
      if (this.getHealthPercent() < 0.5) {
        // Slight red tint to show damage
        this.sprite.setTint(0xffaaaa);
      } else if (this.getHealthPercent() < 0.25) {
        // More red tint for critical damage
        this.sprite.setTint(0xff7777);
      }
    }
  }

  /**
   * Reset the destructible (for object pooling).
   */
  reset(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    this.health = this.maxHealth;
    this.isDestroyed = false;
    this.isInteractable = true;
    this.invulnerableUntil = 0;
    this.hitFlashTime = 0;
    this.sprite.setTint(this.originalTint);
    this.sprite.setScale(1);
    this.sprite.setAlpha(1);
    this.activate();
  }
}

/**
 * Factory function to create destructibles.
 */
export function createDestructible(
  scene: Phaser.Scene,
  x: number,
  y: number,
  destructibleType: DestructibleType,
  eventBus: EventBus,
  overrides: Partial<DestructibleConfig> = {}
): Destructible {
  const defaults = DESTRUCTIBLE_DEFAULTS[destructibleType] || {};

  const config: DestructibleConfig = {
    id: `destructible_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    x,
    y,
    spriteKey: `destructible_${destructibleType}`,
    depth: Layer.Terrain + 3,
    collisionEnabled: true,
    physicsEnabled: true,
    destructibleType,
    health: defaults.health ?? 50,
    maxHealth: defaults.maxHealth ?? 50,
    lootDrops: defaults.lootDrops ?? [],
    debris: defaults.debris ?? true,
    debrisCount: defaults.debrisCount ?? 4,
    invulnerableTime: defaults.invulnerableTime ?? 100,
    ...overrides,
  };

  return new Destructible(scene, config, eventBus);
}
