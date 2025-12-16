/**
 * AI Behavior System
 * Pluggable behavior patterns for enemy AI.
 */

import Phaser from 'phaser';
import { BaseEnemy, AIBehavior } from '../entities/enemies/BaseEnemy';
import { EnemyState } from '../entities/enemies/EnemyTypes';

/**
 * Base class for AI behaviors with common utilities.
 */
export abstract class BaseBehavior implements AIBehavior {
  abstract readonly name: string;
  abstract shouldActivate(enemy: BaseEnemy, target: Phaser.GameObjects.Sprite | null): boolean;
  abstract execute(enemy: BaseEnemy, target: Phaser.GameObjects.Sprite | null, deltaMs: number): void;

  onInterrupt?(enemy: BaseEnemy): void;

  /**
   * Get distance between enemy and a point.
   */
  protected getDistanceTo(enemy: BaseEnemy, x: number, y: number): number {
    const pos = enemy.getPosition();
    return Phaser.Math.Distance.Between(pos.x, pos.y, x, y);
  }

  /**
   * Get angle from enemy to a point.
   */
  protected getAngleTo(enemy: BaseEnemy, x: number, y: number): number {
    const pos = enemy.getPosition();
    return Phaser.Math.Angle.Between(pos.x, pos.y, x, y);
  }
}

/**
 * Patrol Behavior - move between waypoints.
 */
export class PatrolBehavior extends BaseBehavior {
  readonly name = 'patrol';
  private waypoints: { x: number; y: number }[] = [];
  private currentIndex: number = 0;
  private waitTime: number = 0;
  private waypointReachedThreshold: number = 15;
  private waitDuration: number = 1500; // Wait at each point

  constructor(waypoints?: { x: number; y: number }[]) {
    super();
    if (waypoints) {
      this.waypoints = waypoints;
    }
  }

  setWaypoints(waypoints: { x: number; y: number }[]): void {
    this.waypoints = waypoints;
    this.currentIndex = 0;
  }

  shouldActivate(enemy: BaseEnemy, target: Phaser.GameObjects.Sprite | null): boolean {
    // Activate when no target and have waypoints
    return target === null && this.waypoints.length > 0;
  }

  execute(enemy: BaseEnemy, target: Phaser.GameObjects.Sprite | null, deltaMs: number): void {
    if (this.waypoints.length === 0) return;

    const currentWaypoint = this.waypoints[this.currentIndex];
    const distance = this.getDistanceTo(enemy, currentWaypoint.x, currentWaypoint.y);

    if (distance <= this.waypointReachedThreshold) {
      // Reached waypoint, wait
      enemy.stopMovement();
      this.waitTime += deltaMs;

      if (this.waitTime >= this.waitDuration) {
        this.waitTime = 0;
        this.currentIndex = (this.currentIndex + 1) % this.waypoints.length;
      }
    } else {
      // Move toward waypoint
      enemy.moveToward(currentWaypoint.x, currentWaypoint.y, 0.6); // Slower patrol speed
    }
  }

  onInterrupt(enemy: BaseEnemy): void {
    this.waitTime = 0;
  }
}

/**
 * Chase Behavior - pursue target with optional anticipation.
 */
export class ChaseBehavior extends BaseBehavior {
  readonly name = 'chase';
  private anticipationStrength: number = 0.3;
  private lastTargetPos: { x: number; y: number } | null = null;
  private lastTargetVelocity: { x: number; y: number } = { x: 0, y: 0 };

  setAnticipation(strength: number): void {
    this.anticipationStrength = Math.max(0, Math.min(1, strength));
  }

  shouldActivate(enemy: BaseEnemy, target: Phaser.GameObjects.Sprite | null): boolean {
    if (!target) return false;
    return enemy.isTargetInDetectionRange() && !enemy.isTargetInAttackRange();
  }

  execute(enemy: BaseEnemy, target: Phaser.GameObjects.Sprite | null, deltaMs: number): void {
    if (!target) return;

    // Calculate target velocity for anticipation
    if (this.lastTargetPos) {
      this.lastTargetVelocity = {
        x: (target.x - this.lastTargetPos.x) / deltaMs * 1000,
        y: (target.y - this.lastTargetPos.y) / deltaMs * 1000,
      };
    }
    this.lastTargetPos = { x: target.x, y: target.y };

    // Anticipate target position
    const anticipationTime = 0.5; // Look ahead 0.5 seconds
    const predictedX = target.x + this.lastTargetVelocity.x * anticipationTime * this.anticipationStrength;
    const predictedY = target.y + this.lastTargetVelocity.y * anticipationTime * this.anticipationStrength;

    // Move toward predicted position
    enemy.moveToward(predictedX, predictedY);
    enemy.faceToward(target.x, target.y);
  }

  onInterrupt(enemy: BaseEnemy): void {
    this.lastTargetPos = null;
    this.lastTargetVelocity = { x: 0, y: 0 };
  }
}

/**
 * Strafe Behavior - circle around target while maintaining distance.
 */
export class StrafeBehavior extends BaseBehavior {
  readonly name = 'strafe';
  private preferredDistance: number = 100;
  private strafeSpeed: number = 0.6;
  private directionChangeInterval: number = 2000;
  private lastDirectionChange: number = 0;
  private strafeDirection: number = 1;

  setPreferredDistance(distance: number): void {
    this.preferredDistance = distance;
  }

  shouldActivate(enemy: BaseEnemy, target: Phaser.GameObjects.Sprite | null): boolean {
    if (!target) return false;
    const distance = enemy.getDistanceToTarget();
    // Activate when at good range (not too close, not too far)
    return distance >= this.preferredDistance * 0.8 && distance <= this.preferredDistance * 1.4;
  }

  execute(enemy: BaseEnemy, target: Phaser.GameObjects.Sprite | null, deltaMs: number): void {
    if (!target) return;

    // Periodically change strafe direction
    const now = Date.now();
    if (now - this.lastDirectionChange > this.directionChangeInterval) {
      this.strafeDirection *= -1;
      this.lastDirectionChange = now;
    }

    // Calculate perpendicular movement
    const dir = enemy.getDirectionToTarget();
    const perpX = -dir.y * this.strafeDirection;
    const perpY = dir.x * this.strafeDirection;

    // Also adjust distance
    const distance = enemy.getDistanceToTarget();
    let radialX = 0;
    let radialY = 0;

    if (distance < this.preferredDistance * 0.9) {
      // Too close, move away
      radialX = -dir.x * 0.5;
      radialY = -dir.y * 0.5;
    } else if (distance > this.preferredDistance * 1.1) {
      // Too far, move closer
      radialX = dir.x * 0.3;
      radialY = dir.y * 0.3;
    }

    // Combine strafe and radial movement
    const sprite = enemy.getSprite();
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    const speed = enemy['config'].moveSpeed * this.strafeSpeed;

    body.setVelocity(
      (perpX + radialX) * speed,
      (perpY + radialY) * speed
    );

    // Always face target
    enemy.faceTarget();
  }
}

/**
 * Flee Behavior - run away from target.
 */
export class FleeBehavior extends BaseBehavior {
  readonly name = 'flee';
  private fleeDistance: number = 200;
  private healthThreshold: number = 0.25; // 25% health

  setFleeDistance(distance: number): void {
    this.fleeDistance = distance;
  }

  setHealthThreshold(threshold: number): void {
    this.healthThreshold = Math.max(0, Math.min(1, threshold));
  }

  shouldActivate(enemy: BaseEnemy, target: Phaser.GameObjects.Sprite | null): boolean {
    if (!target) return false;

    // Flee when low health and target is close
    const healthPercent = enemy.getHealth() / enemy.getMaxHealth();
    const distance = enemy.getDistanceToTarget();

    return healthPercent <= this.healthThreshold && distance < this.fleeDistance;
  }

  execute(enemy: BaseEnemy, target: Phaser.GameObjects.Sprite | null, deltaMs: number): void {
    if (!target) return;

    // Run directly away from target
    const dir = enemy.getDirectionToTarget();
    const sprite = enemy.getSprite();
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    const speed = enemy['config'].moveSpeed * 1.2; // Faster when fleeing

    body.setVelocity(-dir.x * speed, -dir.y * speed);
  }
}

/**
 * Surround Behavior - position to encircle target with other enemies.
 */
export class SurroundBehavior extends BaseBehavior {
  readonly name = 'surround';
  private squadEnemies: BaseEnemy[] = [];
  private surroundRadius: number = 120;

  setSquad(enemies: BaseEnemy[]): void {
    this.squadEnemies = enemies;
  }

  setSurroundRadius(radius: number): void {
    this.surroundRadius = radius;
  }

  shouldActivate(enemy: BaseEnemy, target: Phaser.GameObjects.Sprite | null): boolean {
    return target !== null && this.squadEnemies.length >= 2;
  }

  execute(enemy: BaseEnemy, target: Phaser.GameObjects.Sprite | null, deltaMs: number): void {
    if (!target || this.squadEnemies.length < 2) return;

    // Find this enemy's index in squad
    const myIndex = this.squadEnemies.indexOf(enemy);
    if (myIndex === -1) return;

    // Calculate evenly distributed positions around target
    const angleStep = (Math.PI * 2) / this.squadEnemies.length;
    const baseAngle = Date.now() / 10000; // Slowly rotate around target
    const myAngle = baseAngle + angleStep * myIndex;

    const desiredX = target.x + Math.cos(myAngle) * this.surroundRadius;
    const desiredY = target.y + Math.sin(myAngle) * this.surroundRadius;

    // Move toward assigned position
    const distance = this.getDistanceTo(enemy, desiredX, desiredY);
    if (distance > 20) {
      enemy.moveToward(desiredX, desiredY, 0.8);
    } else {
      enemy.stopMovement();
    }

    enemy.faceToward(target.x, target.y);
  }
}

/**
 * Cover Fire Behavior - provide suppressive fire while allies advance.
 */
export class CoverFireBehavior extends BaseBehavior {
  readonly name = 'cover_fire';
  private coverDuration: number = 3000;
  private coverStartTime: number = 0;
  private isCovering: boolean = false;

  shouldActivate(enemy: BaseEnemy, target: Phaser.GameObjects.Sprite | null): boolean {
    // Only for ranged enemies with a target
    return target !== null && enemy['config']?.isRanged === true;
  }

  execute(enemy: BaseEnemy, target: Phaser.GameObjects.Sprite | null, deltaMs: number): void {
    if (!target) return;

    if (!this.isCovering) {
      this.isCovering = true;
      this.coverStartTime = Date.now();
    }

    // Stop moving and focus on shooting
    enemy.stopMovement();
    enemy.faceTarget();

    // Check if cover duration expired
    if (Date.now() - this.coverStartTime > this.coverDuration) {
      this.isCovering = false;
    }
  }

  onInterrupt(enemy: BaseEnemy): void {
    this.isCovering = false;
  }
}

/**
 * Formation Behavior - maintain position relative to leader.
 */
export class FormationBehavior extends BaseBehavior {
  readonly name = 'formation';
  private leader: BaseEnemy | null = null;
  private offset: { x: number; y: number } = { x: 0, y: 0 };
  private formationTolerance: number = 20;

  setLeader(leader: BaseEnemy): void {
    this.leader = leader;
  }

  setOffset(x: number, y: number): void {
    this.offset = { x, y };
  }

  shouldActivate(enemy: BaseEnemy, target: Phaser.GameObjects.Sprite | null): boolean {
    return this.leader !== null && this.leader.isAlive();
  }

  execute(enemy: BaseEnemy, target: Phaser.GameObjects.Sprite | null, deltaMs: number): void {
    if (!this.leader || !this.leader.isAlive()) return;

    const leaderPos = this.leader.getPosition();
    const leaderFacing = this.leader.isFacingRight();

    // Calculate formation position relative to leader facing
    const effectiveOffsetX = leaderFacing ? this.offset.x : -this.offset.x;
    const desiredX = leaderPos.x + effectiveOffsetX;
    const desiredY = leaderPos.y + this.offset.y;

    const distance = this.getDistanceTo(enemy, desiredX, desiredY);

    if (distance > this.formationTolerance) {
      enemy.moveToward(desiredX, desiredY);
    } else {
      enemy.stopMovement();
    }

    // Face same direction as leader, or toward target if present
    if (target) {
      enemy.faceToward(target.x, target.y);
    } else {
      // Match leader facing
      const sprite = enemy.getSprite();
      sprite.setFlipX(!leaderFacing);
    }
  }

  onInterrupt(enemy: BaseEnemy): void {
    this.leader = null;
  }
}
