/**
 * Combat Manager - Orchestrates all combat systems.
 * Central hub for attacks, damage, combos, and hit detection.
 */

import Phaser from 'phaser';
import { EventBus, GameEvent, DamageEvent, HitEvent, BlockEvent } from '../core/events/EventBus';
import { EntityId } from '../core/types';
import { HitboxManager, HitResult, Hurtbox } from './HitboxManager';
import { ComboSystem, ComboState, ComboInput } from './ComboSystem';
import {
  AttackData,
  getAttackData,
  getAttackPhase,
  AttackPhase,
} from './AttackData';
import {
  calculateDamage,
  calculateStaggerDamage,
  CombatStats,
  DamageResult,
  Faction,
  DefenseType,
} from './DamageCalculator';

/**
 * Entity combat data for the combat manager.
 */
export interface CombatEntity {
  /** Entity ID */
  id: EntityId;
  /** Phaser sprite */
  sprite: Phaser.GameObjects.Sprite;
  /** Combat stats */
  stats: CombatStats;
  /** Current attack (if any) */
  currentAttack: AttackData | null;
  /** Attack start time */
  attackStartTime: number;
  /** Active hitbox ID */
  activeHitboxId: string | null;
  /** Is facing right? */
  facingRight: boolean;
  /** Hitstun remaining (ms) */
  hitstunRemaining: number;
  /** Is invulnerable? */
  invulnerable: boolean;
  /** Invulnerability end time */
  invulnerabilityEndTime: number;
}

/**
 * Combat event for UI feedback.
 */
export interface CombatFeedbackEvent extends GameEvent {
  type: 'combat:feedback';
  data: {
    hitPosition: { x: number; y: number };
    damage: number;
    damageType: 'normal' | 'critical' | 'force' | 'blocked';
    hitType: 'light' | 'heavy' | 'critical' | 'force' | 'kill';
    attackerId: EntityId;
    defenderId: EntityId;
    comboCount: number;
  };
}

/**
 * Combat Manager configuration.
 */
export interface CombatManagerConfig {
  /** Enable debug hitbox visualization */
  debugHitboxes: boolean;
}

const DEFAULT_CONFIG: CombatManagerConfig = {
  debugHitboxes: false,
};

/**
 * Combat Manager - orchestrates all combat.
 */
export class CombatManager {
  private scene: Phaser.Scene;
  private eventBus: EventBus;
  private config: CombatManagerConfig;

  // Sub-systems
  private hitboxManager: HitboxManager;
  private comboSystems: Map<EntityId, ComboSystem> = new Map();

  // Registered entities
  private entities: Map<EntityId, CombatEntity> = new Map();

  // Player reference (for combo tracking)
  private playerId: EntityId | null = null;

  constructor(scene: Phaser.Scene, eventBus: EventBus, config: Partial<CombatManagerConfig> = {}) {
    this.scene = scene;
    this.eventBus = eventBus;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.hitboxManager = new HitboxManager(scene);

    if (this.config.debugHitboxes) {
      this.hitboxManager.setDebug(true);
    }
  }

  /**
   * Register an entity for combat.
   */
  registerEntity(
    id: EntityId,
    sprite: Phaser.GameObjects.Sprite,
    stats: CombatStats,
    isPlayer: boolean = false
  ): void {
    const entity: CombatEntity = {
      id,
      sprite,
      stats,
      currentAttack: null,
      attackStartTime: 0,
      activeHitboxId: null,
      facingRight: !sprite.flipX,
      hitstunRemaining: 0,
      invulnerable: false,
      invulnerabilityEndTime: 0,
    };

    this.entities.set(id, entity);

    // Register hurtbox
    const bounds = sprite.getBounds();
    this.hitboxManager.registerHurtbox({
      entityId: id,
      x: sprite.x,
      y: sprite.y,
      width: bounds.width * 0.8, // Slightly smaller hurtbox
      height: bounds.height * 0.9,
      invulnerable: false,
      defenseType: 'none',
    });

    // Create combo system for player
    if (isPlayer) {
      this.playerId = id;
      this.comboSystems.set(id, new ComboSystem());
    }
  }

  /**
   * Unregister an entity.
   */
  unregisterEntity(id: EntityId): void {
    this.entities.delete(id);
    this.hitboxManager.removeHurtbox(id);
    this.comboSystems.delete(id);
  }

  /**
   * Start an attack for an entity.
   */
  startAttack(entityId: EntityId, attackId: string): boolean {
    const entity = this.entities.get(entityId);
    if (!entity) return false;

    // Check if entity can attack (not in hitstun)
    if (entity.hitstunRemaining > 0) return false;

    const attack = getAttackData(attackId);
    if (!attack) return false;

    // Check force cost
    if (attack.forceCost && entity.stats.faction === Faction.Sith) {
      // Force check would go here - for now allow all
    }

    // Set attack state
    entity.currentAttack = attack;
    entity.attackStartTime = Date.now();
    entity.facingRight = !entity.sprite.flipX;

    // Create hitbox
    entity.activeHitboxId = this.hitboxManager.createHitbox(
      entityId,
      attack,
      entity.sprite.x,
      entity.sprite.y,
      entity.facingRight
    );

    // Update combo system if player
    const comboSystem = this.comboSystems.get(entityId);
    if (comboSystem) {
      comboSystem.startAttack(attack);
    }

    // Emit attack event
    this.eventBus.emit({
      type: 'combat:attack',
      data: {
        attackerId: entityId,
        attackId: attack.id,
        position: { x: entity.sprite.x, y: entity.sprite.y },
        direction: entity.facingRight ? 1 : -1,
      },
    });

    return true;
  }

  /**
   * Buffer a combo input for the player.
   */
  bufferPlayerInput(input: ComboInput): void {
    if (!this.playerId) return;

    const comboSystem = this.comboSystems.get(this.playerId);
    if (comboSystem) {
      comboSystem.bufferInput(input);
    }
  }

  /**
   * Get player combo count.
   */
  getPlayerComboCount(): number {
    if (!this.playerId) return 0;

    const comboSystem = this.comboSystems.get(this.playerId);
    return comboSystem?.getComboCount() ?? 0;
  }

  /**
   * Set entity defense type.
   */
  setDefenseType(entityId: EntityId, defenseType: DefenseType): void {
    const entity = this.entities.get(entityId);
    if (entity) {
      entity.stats.defenseType = defenseType;
    }
  }

  /**
   * Set entity invulnerability.
   */
  setInvulnerable(entityId: EntityId, invulnerable: boolean, durationMs: number = 0): void {
    const entity = this.entities.get(entityId);
    if (entity) {
      entity.invulnerable = invulnerable;
      entity.invulnerabilityEndTime = invulnerable ? Date.now() + durationMs : 0;
      this.hitboxManager.setInvulnerable(entityId, invulnerable);
    }
  }

  /**
   * Apply damage to an entity directly (for environmental damage, etc.).
   */
  applyDamage(entityId: EntityId, damage: number, knockbackX: number = 0, knockbackY: number = 0): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;

    // Reduce health
    entity.stats.health = Math.max(0, entity.stats.health - damage);

    // Apply knockback
    if (knockbackX !== 0 || knockbackY !== 0) {
      const body = entity.sprite.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.setVelocity(knockbackX, knockbackY);
      }
    }

    // Check for death
    if (entity.stats.health <= 0) {
      this.eventBus.emit({
        type: 'combat:death',
        data: {
          entityId,
          killerId: undefined,
        },
      });
    }
  }

  /**
   * Update the combat manager - call every frame.
   */
  update(deltaMs: number): void {
    const now = Date.now();

    // Update hitbox manager
    this.hitboxManager.update();

    // Check for hits
    const hits = this.hitboxManager.checkHits();
    this.processHits(hits);

    // Update entities
    for (const entity of this.entities.values()) {
      // Update hurtbox position
      this.hitboxManager.updateHurtboxPosition(entity.id, entity.sprite.x, entity.sprite.y);

      // Update hitbox position if attacking
      if (entity.activeHitboxId) {
        this.hitboxManager.updateHitboxPosition(
          entity.activeHitboxId,
          entity.sprite.x,
          entity.sprite.y,
          entity.facingRight
        );

        // Check if attack is complete
        if (entity.currentAttack) {
          const elapsed = now - entity.attackStartTime;
          const totalDuration =
            entity.currentAttack.startupMs +
            entity.currentAttack.activeMs +
            entity.currentAttack.recoveryMs;

          if (elapsed >= totalDuration) {
            this.hitboxManager.removeHitbox(entity.activeHitboxId);
            entity.activeHitboxId = null;
            entity.currentAttack = null;
          }
        }
      }

      // Update hitstun
      if (entity.hitstunRemaining > 0) {
        entity.hitstunRemaining = Math.max(0, entity.hitstunRemaining - deltaMs);
      }

      // Update invulnerability
      if (entity.invulnerable && entity.invulnerabilityEndTime > 0 && now >= entity.invulnerabilityEndTime) {
        entity.invulnerable = false;
        this.hitboxManager.setInvulnerable(entity.id, false);
      }

      // Update facing direction
      entity.facingRight = !entity.sprite.flipX;
    }

    // Update combo systems
    for (const [entityId, comboSystem] of this.comboSystems) {
      const result = comboSystem.update(now);

      // Check if combo system wants to start a new attack
      if (result.attackStarted && result.startedAttack) {
        // Attack already started by combo system
      }

      // Handle combo drop
      if (result.comboDropped) {
        this.eventBus.emit({
          type: 'combat:combo_dropped',
          data: { entityId },
        });
      }
    }
  }

  /**
   * Process hit results.
   */
  private processHits(hits: HitResult[]): void {
    for (const hit of hits) {
      const attacker = this.entities.get(hit.hitbox.ownerId);
      const defender = this.entities.get(hit.hurtbox.entityId);

      if (!attacker || !defender) continue;

      // Calculate damage
      const comboCount = this.getPlayerComboCount();
      const damageResult = calculateDamage(
        hit.hitbox.attackData,
        attacker.stats,
        defender.stats,
        comboCount
      );

      // Calculate stagger
      const staggerDamage = calculateStaggerDamage(
        hit.hitbox.attackData,
        attacker.stats,
        defender.stats
      );

      // Apply damage
      defender.stats.health = Math.max(0, defender.stats.health - damageResult.damage);

      // Apply stagger
      defender.stats.stagger = Math.min(100, defender.stats.stagger + staggerDamage);

      // Apply hitstun
      defender.hitstunRemaining = damageResult.hitstun;

      // Apply knockback
      const body = defender.sprite.body as Phaser.Physics.Arcade.Body;
      if (body) {
        const direction = attacker.facingRight ? 1 : -1;
        body.setVelocity(direction * damageResult.knockback, -50);

        // Friction to slow down
        this.scene.time.delayedCall(200, () => {
          body.setVelocity(body.velocity.x * 0.5, body.velocity.y);
        });
      }

      // Update combo system
      const comboSystem = this.comboSystems.get(attacker.id);
      if (comboSystem) {
        comboSystem.registerHit();
      }

      // Determine hit type for feedback
      const isKill = defender.stats.health <= 0;
      let hitType: 'light' | 'heavy' | 'critical' | 'force' | 'kill' = 'light';
      if (isKill) {
        hitType = 'kill';
      } else if (damageResult.isCritical) {
        hitType = 'critical';
      } else if (hit.hitbox.attackData.type === 'force') {
        hitType = 'force';
      } else if (hit.hitbox.attackData.type === 'heavy') {
        hitType = 'heavy';
      }

      // Emit combat feedback event for UI
      this.eventBus.emit({
        type: 'combat:feedback',
        data: {
          hitPosition: hit.hitPosition,
          damage: damageResult.damage,
          damageType: damageResult.damageType,
          hitType,
          attackerId: attacker.id,
          defenderId: defender.id,
          comboCount: comboSystem?.getComboCount() ?? 0,
        },
      } as CombatFeedbackEvent);

      // Emit damage event
      this.eventBus.emit({
        type: 'combat:damage',
        data: {
          sourceId: attacker.id,
          targetId: defender.id,
          damage: damageResult.damage,
          damageType: damageResult.damageType,
          blocked: damageResult.wasBlocked,
          critical: damageResult.isCritical,
        },
      } as DamageEvent);

      // Emit hit event
      this.eventBus.emit({
        type: 'combat:hit',
        data: {
          attackerId: attacker.id,
          defenderId: defender.id,
          hitboxId: hit.hitbox.id,
        },
      } as HitEvent);

      // Check for death
      if (defender.stats.health <= 0) {
        this.eventBus.emit({
          type: 'combat:death',
          data: {
            entityId: defender.id,
            killerId: attacker.id,
          },
        });
      }

      // Check for stagger break
      if (defender.stats.stagger >= 100) {
        this.eventBus.emit({
          type: 'combat:stagger_break',
          data: {
            entityId: defender.id,
          },
        });
        defender.stats.stagger = 0;
      }
    }
  }

  /**
   * Get entity combat stats.
   */
  getEntityStats(entityId: EntityId): CombatStats | undefined {
    return this.entities.get(entityId)?.stats;
  }

  /**
   * Check if entity is attacking.
   */
  isAttacking(entityId: EntityId): boolean {
    const entity = this.entities.get(entityId);
    return entity?.currentAttack !== null;
  }

  /**
   * Get current attack phase for entity.
   */
  getAttackPhase(entityId: EntityId): AttackPhase | null {
    const entity = this.entities.get(entityId);
    if (!entity || !entity.currentAttack) return null;

    const elapsed = Date.now() - entity.attackStartTime;
    return getAttackPhase(entity.currentAttack, elapsed);
  }

  /**
   * Enable/disable debug mode.
   */
  setDebug(enabled: boolean): void {
    this.config.debugHitboxes = enabled;
    this.hitboxManager.setDebug(enabled);
  }

  /**
   * Clean up.
   */
  destroy(): void {
    this.entities.clear();
    this.comboSystems.clear();
    this.hitboxManager.clear();
  }
}
