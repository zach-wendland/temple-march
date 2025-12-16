/**
 * Hitbox Manager - Handles hitbox/hurtbox collision detection.
 * Supports frame-accurate hit detection and multi-hit prevention.
 */

import Phaser from 'phaser';
import { AttackData, HitboxData, HitboxDirection, getAttackPhase, AttackPhase } from './AttackData';
import { EntityId } from '../core/types';

/**
 * Active hitbox in the world.
 */
export interface ActiveHitbox {
  /** Unique ID for this hitbox instance */
  id: string;
  /** Entity that owns this hitbox */
  ownerId: EntityId;
  /** The attack data this hitbox is from */
  attackData: AttackData;
  /** World position X */
  x: number;
  /** World position Y */
  y: number;
  /** Width */
  width: number;
  /** Height */
  height: number;
  /** Is owner facing right? */
  facingRight: boolean;
  /** Time hitbox was created */
  createdAt: number;
  /** Entities already hit by this hitbox */
  hitEntities: Set<EntityId>;
  /** Is hitbox currently active? */
  active: boolean;
}

/**
 * Hurtbox (damageable area) of an entity.
 */
export interface Hurtbox {
  /** Entity ID */
  entityId: EntityId;
  /** World position X (center) */
  x: number;
  /** World position Y (center) */
  y: number;
  /** Width */
  width: number;
  /** Height */
  height: number;
  /** Is entity currently invulnerable? */
  invulnerable: boolean;
  /** Current defense type */
  defenseType: string;
}

/**
 * Hit detection result.
 */
export interface HitResult {
  /** The hitbox that hit */
  hitbox: ActiveHitbox;
  /** The hurtbox that was hit */
  hurtbox: Hurtbox;
  /** World position of hit */
  hitPosition: { x: number; y: number };
}

/**
 * Hitbox Manager - manages all combat hitboxes and collision detection.
 */
export class HitboxManager {
  private activeHitboxes: Map<string, ActiveHitbox> = new Map();
  private hurtboxes: Map<EntityId, Hurtbox> = new Map();
  private hitboxIdCounter = 0;
  private scene: Phaser.Scene;

  // Debug visualization
  private debugGraphics: Phaser.GameObjects.Graphics | null = null;
  private debugEnabled = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Enable/disable debug visualization.
   */
  setDebug(enabled: boolean): void {
    this.debugEnabled = enabled;
    if (enabled && !this.debugGraphics) {
      this.debugGraphics = this.scene.add.graphics();
      this.debugGraphics.setDepth(1000);
    } else if (!enabled && this.debugGraphics) {
      this.debugGraphics.destroy();
      this.debugGraphics = null;
    }
  }

  /**
   * Register or update a hurtbox for an entity.
   */
  registerHurtbox(hurtbox: Hurtbox): void {
    this.hurtboxes.set(hurtbox.entityId, hurtbox);
  }

  /**
   * Update hurtbox position.
   */
  updateHurtboxPosition(entityId: EntityId, x: number, y: number): void {
    const hurtbox = this.hurtboxes.get(entityId);
    if (hurtbox) {
      hurtbox.x = x;
      hurtbox.y = y;
    }
  }

  /**
   * Set hurtbox invulnerability.
   */
  setInvulnerable(entityId: EntityId, invulnerable: boolean): void {
    const hurtbox = this.hurtboxes.get(entityId);
    if (hurtbox) {
      hurtbox.invulnerable = invulnerable;
    }
  }

  /**
   * Remove a hurtbox.
   */
  removeHurtbox(entityId: EntityId): void {
    this.hurtboxes.delete(entityId);
  }

  /**
   * Create a hitbox from attack data.
   */
  createHitbox(
    ownerId: EntityId,
    attackData: AttackData,
    ownerX: number,
    ownerY: number,
    facingRight: boolean
  ): string {
    const id = `hitbox_${this.hitboxIdCounter++}`;
    const hitboxData = attackData.hitbox;

    // Calculate world position based on facing direction
    const offsetX = facingRight ? hitboxData.offsetX : -hitboxData.offsetX;

    const hitbox: ActiveHitbox = {
      id,
      ownerId,
      attackData,
      x: ownerX + offsetX,
      y: ownerY + hitboxData.offsetY,
      width: hitboxData.width,
      height: hitboxData.height,
      facingRight,
      createdAt: Date.now(),
      hitEntities: new Set(),
      active: true,
    };

    this.activeHitboxes.set(id, hitbox);
    return id;
  }

  /**
   * Update hitbox position (for moving hitboxes).
   */
  updateHitboxPosition(hitboxId: string, ownerX: number, ownerY: number, facingRight: boolean): void {
    const hitbox = this.activeHitboxes.get(hitboxId);
    if (hitbox) {
      const offsetX = facingRight
        ? hitbox.attackData.hitbox.offsetX
        : -hitbox.attackData.hitbox.offsetX;
      hitbox.x = ownerX + offsetX;
      hitbox.y = ownerY + hitbox.attackData.hitbox.offsetY;
      hitbox.facingRight = facingRight;
    }
  }

  /**
   * Deactivate a hitbox.
   */
  deactivateHitbox(hitboxId: string): void {
    const hitbox = this.activeHitboxes.get(hitboxId);
    if (hitbox) {
      hitbox.active = false;
    }
  }

  /**
   * Remove a hitbox.
   */
  removeHitbox(hitboxId: string): void {
    this.activeHitboxes.delete(hitboxId);
  }

  /**
   * Check all hitboxes against all hurtboxes.
   * Returns array of hits that occurred.
   */
  checkHits(): HitResult[] {
    const results: HitResult[] = [];

    for (const hitbox of this.activeHitboxes.values()) {
      if (!hitbox.active) continue;

      // Check if hitbox is in active phase
      const elapsed = Date.now() - hitbox.createdAt;
      const phase = getAttackPhase(hitbox.attackData, elapsed);
      if (phase !== AttackPhase.Active) continue;

      for (const hurtbox of this.hurtboxes.values()) {
        // Skip self-hits
        if (hitbox.ownerId === hurtbox.entityId) continue;

        // Skip invulnerable targets
        if (hurtbox.invulnerable) continue;

        // Skip already hit entities (unless multi-hit)
        if (hitbox.hitEntities.has(hurtbox.entityId)) {
          if (!hitbox.attackData.multiHit) continue;
        }

        // AABB collision check
        if (this.checkAABBCollision(hitbox, hurtbox)) {
          // Record the hit
          hitbox.hitEntities.add(hurtbox.entityId);

          // Calculate hit position (center of overlap)
          const hitPosition = this.calculateHitPosition(hitbox, hurtbox);

          results.push({
            hitbox,
            hurtbox,
            hitPosition,
          });
        }
      }
    }

    return results;
  }

  /**
   * Update hitboxes - remove expired ones.
   */
  update(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, hitbox] of this.activeHitboxes) {
      const elapsed = now - hitbox.createdAt;
      const totalDuration =
        hitbox.attackData.startupMs +
        hitbox.attackData.activeMs +
        hitbox.attackData.recoveryMs;

      if (elapsed >= totalDuration) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.activeHitboxes.delete(id);
    }

    // Debug rendering
    if (this.debugEnabled && this.debugGraphics) {
      this.renderDebug();
    }
  }

  /**
   * Clear all hitboxes.
   */
  clearHitboxes(): void {
    this.activeHitboxes.clear();
  }

  /**
   * Clear all data.
   */
  clear(): void {
    this.activeHitboxes.clear();
    this.hurtboxes.clear();
  }

  /**
   * AABB collision check.
   */
  private checkAABBCollision(hitbox: ActiveHitbox, hurtbox: Hurtbox): boolean {
    const hbLeft = hitbox.x - hitbox.width / 2;
    const hbRight = hitbox.x + hitbox.width / 2;
    const hbTop = hitbox.y - hitbox.height / 2;
    const hbBottom = hitbox.y + hitbox.height / 2;

    const hurLeft = hurtbox.x - hurtbox.width / 2;
    const hurRight = hurtbox.x + hurtbox.width / 2;
    const hurTop = hurtbox.y - hurtbox.height / 2;
    const hurBottom = hurtbox.y + hurtbox.height / 2;

    return hbLeft < hurRight && hbRight > hurLeft && hbTop < hurBottom && hbBottom > hurTop;
  }

  /**
   * Calculate hit position (center of overlap region).
   */
  private calculateHitPosition(
    hitbox: ActiveHitbox,
    hurtbox: Hurtbox
  ): { x: number; y: number } {
    const hbLeft = hitbox.x - hitbox.width / 2;
    const hbRight = hitbox.x + hitbox.width / 2;
    const hbTop = hitbox.y - hitbox.height / 2;
    const hbBottom = hitbox.y + hitbox.height / 2;

    const hurLeft = hurtbox.x - hurtbox.width / 2;
    const hurRight = hurtbox.x + hurtbox.width / 2;
    const hurTop = hurtbox.y - hurtbox.height / 2;
    const hurBottom = hurtbox.y + hurtbox.height / 2;

    const overlapLeft = Math.max(hbLeft, hurLeft);
    const overlapRight = Math.min(hbRight, hurRight);
    const overlapTop = Math.max(hbTop, hurTop);
    const overlapBottom = Math.min(hbBottom, hurBottom);

    return {
      x: (overlapLeft + overlapRight) / 2,
      y: (overlapTop + overlapBottom) / 2,
    };
  }

  /**
   * Render debug visualization.
   */
  private renderDebug(): void {
    if (!this.debugGraphics) return;

    this.debugGraphics.clear();

    // Draw hurtboxes (green)
    this.debugGraphics.lineStyle(2, 0x00ff00, 0.8);
    for (const hurtbox of this.hurtboxes.values()) {
      const alpha = hurtbox.invulnerable ? 0.3 : 0.8;
      this.debugGraphics.lineStyle(2, 0x00ff00, alpha);
      this.debugGraphics.strokeRect(
        hurtbox.x - hurtbox.width / 2,
        hurtbox.y - hurtbox.height / 2,
        hurtbox.width,
        hurtbox.height
      );
    }

    // Draw hitboxes
    for (const hitbox of this.activeHitboxes.values()) {
      const elapsed = Date.now() - hitbox.createdAt;
      const phase = getAttackPhase(hitbox.attackData, elapsed);

      // Color based on phase
      let color = 0x666666; // Inactive
      let alpha = 0.5;
      if (phase === AttackPhase.Startup) {
        color = 0xffff00; // Yellow = startup
        alpha = 0.6;
      } else if (phase === AttackPhase.Active) {
        color = 0xff0000; // Red = active
        alpha = 0.8;
      } else if (phase === AttackPhase.Recovery) {
        color = 0x0000ff; // Blue = recovery
        alpha = 0.5;
      }

      this.debugGraphics.lineStyle(2, color, alpha);
      this.debugGraphics.strokeRect(
        hitbox.x - hitbox.width / 2,
        hitbox.y - hitbox.height / 2,
        hitbox.width,
        hitbox.height
      );
    }
  }
}
