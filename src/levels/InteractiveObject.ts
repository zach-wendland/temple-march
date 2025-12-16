/**
 * InteractiveObject - Base class for all interactive environment objects.
 * Provides foundation for destructibles, pickups, triggers, etc.
 */

import Phaser from 'phaser';
import { EventBus, GameEvent } from '../core/events/EventBus';
import { EntityId, Layer } from '../core/types';

/**
 * Types of interactive objects.
 */
export type InteractiveObjectType = 'destructible' | 'pickup' | 'trigger' | 'switch' | 'door';

/**
 * Base configuration for interactive objects.
 */
export interface InteractiveObjectConfig {
  id: string;
  type: InteractiveObjectType;
  x: number;
  y: number;
  spriteKey: string;
  depth: number;
  collisionEnabled: boolean;
  physicsEnabled: boolean;
}

/**
 * Interaction result returned after player interacts with object.
 */
export interface InteractionResult {
  success: boolean;
  consumed: boolean;
  effectType?: string;
  effectValue?: number;
  message?: string;
}

/**
 * InteractiveObject - Abstract base class for environment objects.
 */
export abstract class InteractiveObject {
  // Identity
  readonly id: string;
  readonly type: InteractiveObjectType;

  // Phaser objects
  protected scene: Phaser.Scene;
  protected sprite: Phaser.GameObjects.Sprite;
  protected body: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | null = null;

  // Systems
  protected eventBus: EventBus;

  // State
  protected isActive: boolean = true;
  protected isInteractable: boolean = true;
  protected hasBeenInteracted: boolean = false;

  constructor(scene: Phaser.Scene, config: InteractiveObjectConfig, eventBus: EventBus) {
    this.scene = scene;
    this.eventBus = eventBus;
    this.id = config.id;
    this.type = config.type;

    // Create sprite
    this.sprite = scene.add.sprite(config.x, config.y, config.spriteKey);
    this.sprite.setDepth(config.depth);
    this.sprite.setData('interactiveObjectId', this.id);
    this.sprite.setData('interactiveObjectType', this.type);

    // Add physics if enabled
    if (config.physicsEnabled) {
      scene.physics.add.existing(this.sprite, !config.collisionEnabled);
      this.body = this.sprite.body as Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;
    }
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Get the sprite.
   */
  getSprite(): Phaser.GameObjects.Sprite {
    return this.sprite;
  }

  /**
   * Get position.
   */
  getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  /**
   * Check if object is active.
   */
  getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * Check if object can be interacted with.
   */
  getIsInteractable(): boolean {
    return this.isActive && this.isInteractable;
  }

  /**
   * Set interactable state.
   */
  setInteractable(interactable: boolean): void {
    this.isInteractable = interactable;
  }

  /**
   * Interact with the object.
   * Returns result of interaction.
   */
  interact(source: EntityId): InteractionResult {
    if (!this.getIsInteractable()) {
      return { success: false, consumed: false, message: 'Cannot interact' };
    }

    this.hasBeenInteracted = true;
    const result = this.onInteract(source);

    // Emit interaction event
    this.eventBus.emit({
      type: 'environment:interaction',
      data: {
        objectId: this.id,
        objectType: this.type,
        sourceId: source,
        result,
      },
    });

    return result;
  }

  /**
   * Apply damage to the object (for destructibles).
   * Returns true if object was destroyed.
   */
  applyDamage(damage: number, sourceId?: EntityId): boolean {
    if (!this.isActive) return false;
    return this.onDamage(damage, sourceId);
  }

  /**
   * Activate the object.
   */
  activate(): void {
    this.isActive = true;
    this.sprite.setActive(true);
    this.sprite.setVisible(true);
  }

  /**
   * Deactivate the object.
   */
  deactivate(): void {
    this.isActive = false;
    this.sprite.setActive(false);
    this.sprite.setVisible(false);
  }

  /**
   * Update the object (called each frame).
   */
  update(deltaMs: number): void {
    if (!this.isActive) return;
    this.onUpdate(deltaMs);
  }

  /**
   * Destroy the object.
   */
  destroy(): void {
    this.deactivate();
    this.sprite.destroy();
  }

  // ==========================================================================
  // ABSTRACT METHODS - Subclasses must implement
  // ==========================================================================

  /**
   * Handle interaction with the object.
   */
  protected abstract onInteract(source: EntityId): InteractionResult;

  /**
   * Handle damage to the object.
   * Returns true if object was destroyed.
   */
  protected abstract onDamage(damage: number, sourceId?: EntityId): boolean;

  /**
   * Handle per-frame updates.
   */
  protected abstract onUpdate(deltaMs: number): void;
}
