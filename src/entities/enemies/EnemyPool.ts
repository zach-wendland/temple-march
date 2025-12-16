/**
 * Enemy Pool - Object pooling for efficient enemy management.
 * Minimizes garbage collection by recycling enemy instances.
 */

import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy';
import { EnemyType, getEnemyConfig } from './EnemyTypes';
import { JediDefender } from './JediDefender';
import { CloneTrooper } from './CloneTrooper';
import { TempleGuard } from './TempleGuard';
import { CombatManager } from '../../combat/CombatManager';
import { EventBus } from '../../core/events/EventBus';
import { EntityId } from '../../core/types';

/**
 * Pool configuration.
 */
export interface EnemyPoolConfig {
  /** Initial pool size per enemy type */
  initialSize: number;
  /** Maximum pool size per enemy type */
  maxSize: number;
  /** Auto-expand pool when exhausted */
  autoExpand: boolean;
  /** Expansion increment */
  expandIncrement: number;
}

const DEFAULT_POOL_CONFIG: EnemyPoolConfig = {
  initialSize: 10,
  maxSize: 50,
  autoExpand: true,
  expandIncrement: 5,
};

/**
 * Pool statistics for debugging/optimization.
 */
export interface PoolStats {
  /** Total enemies in pool */
  totalPooled: number;
  /** Currently active enemies */
  activeCount: number;
  /** Peak active count */
  peakActive: number;
  /** Total spawns */
  totalSpawns: number;
  /** Total recycles */
  totalRecycles: number;
  /** Pool expansions */
  expansions: number;
}

/**
 * Enemy Pool - manages pools of reusable enemy instances.
 */
export class EnemyPool {
  private scene: Phaser.Scene;
  private combatManager: CombatManager;
  private eventBus: EventBus;
  private config: EnemyPoolConfig;

  // Pools by enemy type
  private pools: Map<EnemyType, BaseEnemy[]> = new Map();

  // Active enemies (for quick access)
  private activeEnemies: Map<EntityId, BaseEnemy> = new Map();

  // Statistics
  private stats: PoolStats = {
    totalPooled: 0,
    activeCount: 0,
    peakActive: 0,
    totalSpawns: 0,
    totalRecycles: 0,
    expansions: 0,
  };

  constructor(
    scene: Phaser.Scene,
    combatManager: CombatManager,
    eventBus: EventBus,
    config: Partial<EnemyPoolConfig> = {}
  ) {
    this.scene = scene;
    this.combatManager = combatManager;
    this.eventBus = eventBus;
    this.config = { ...DEFAULT_POOL_CONFIG, ...config };

    this.initializePools();
    this.setupEvents();
  }

  /**
   * Initialize pools for all enemy types.
   */
  private initializePools(): void {
    for (const type of Object.values(EnemyType)) {
      this.pools.set(type, []);
      this.expandPool(type, this.config.initialSize);
    }
  }

  /**
   * Expand a pool by creating new enemy instances.
   */
  private expandPool(type: EnemyType, count: number): void {
    const pool = this.pools.get(type);
    if (!pool) return;

    const currentSize = pool.length + this.getActiveCountForType(type);
    const maxExpansion = Math.min(count, this.config.maxSize - currentSize);

    if (maxExpansion <= 0) {
      console.warn(`Enemy pool for ${type} at maximum capacity (${this.config.maxSize})`);
      return;
    }

    for (let i = 0; i < maxExpansion; i++) {
      const enemy = this.createEnemy(type);
      enemy.deactivate();
      pool.push(enemy);
      this.stats.totalPooled++;
    }

    this.stats.expansions++;
  }

  /**
   * Create an enemy instance based on type.
   */
  private createEnemy(type: EnemyType): BaseEnemy {
    // Create off-screen
    const x = -1000;
    const y = -1000;

    switch (type) {
      case EnemyType.JediDefender:
        return new JediDefender(this.scene, x, y, this.combatManager, this.eventBus);
      case EnemyType.CloneTrooper:
        return new CloneTrooper(this.scene, x, y, this.combatManager, this.eventBus);
      case EnemyType.TempleGuard:
        return new TempleGuard(this.scene, x, y, this.combatManager, this.eventBus);
      case EnemyType.JediMaster:
        // JediMaster uses JediDefender as base for now
        return new JediDefender(this.scene, x, y, this.combatManager, this.eventBus);
      default:
        return new JediDefender(this.scene, x, y, this.combatManager, this.eventBus);
    }
  }

  /**
   * Get count of active enemies for a specific type.
   */
  private getActiveCountForType(type: EnemyType): number {
    let count = 0;
    for (const enemy of this.activeEnemies.values()) {
      if (enemy.getType() === type) {
        count++;
      }
    }
    return count;
  }

  /**
   * Spawn an enemy from the pool.
   */
  spawn(type: EnemyType, x: number, y: number): BaseEnemy | null {
    const pool = this.pools.get(type);
    if (!pool) {
      console.error(`No pool for enemy type: ${type}`);
      return null;
    }

    let enemy: BaseEnemy | undefined;

    // Try to get from pool
    if (pool.length > 0) {
      enemy = pool.pop();
    } else if (this.config.autoExpand) {
      // Pool exhausted, try to expand
      this.expandPool(type, this.config.expandIncrement);
      enemy = pool.pop();
    }

    if (!enemy) {
      console.warn(`Cannot spawn ${type}: pool exhausted and at max capacity`);
      return null;
    }

    // Activate enemy
    enemy.activate(x, y);
    this.activeEnemies.set(enemy.id, enemy);

    // Update stats
    this.stats.activeCount++;
    this.stats.totalSpawns++;
    if (this.stats.activeCount > this.stats.peakActive) {
      this.stats.peakActive = this.stats.activeCount;
    }

    this.eventBus.emit({
      type: 'enemy:spawned',
      data: {
        enemyId: enemy.id,
        enemyType: type,
        position: { x, y },
      },
    });

    return enemy;
  }

  /**
   * Spawn multiple enemies of the same type.
   */
  spawnMultiple(
    type: EnemyType,
    positions: { x: number; y: number }[]
  ): BaseEnemy[] {
    const enemies: BaseEnemy[] = [];
    for (const pos of positions) {
      const enemy = this.spawn(type, pos.x, pos.y);
      if (enemy) {
        enemies.push(enemy);
      }
    }
    return enemies;
  }

  /**
   * Return an enemy to the pool.
   */
  recycle(enemy: BaseEnemy): void {
    if (!this.activeEnemies.has(enemy.id)) {
      console.warn(`Attempting to recycle enemy ${enemy.id} that is not active`);
      return;
    }

    const type = enemy.getType();
    const pool = this.pools.get(type);

    if (!pool) {
      console.error(`No pool for enemy type: ${type}`);
      enemy.destroy();
      return;
    }

    // Deactivate and return to pool
    enemy.deactivate();
    this.activeEnemies.delete(enemy.id);
    pool.push(enemy);

    // Update stats
    this.stats.activeCount--;
    this.stats.totalRecycles++;

    this.eventBus.emit({
      type: 'enemy:recycled',
      data: {
        enemyId: enemy.id,
        enemyType: type,
      },
    });
  }

  /**
   * Recycle an enemy by ID.
   */
  recycleById(enemyId: EntityId): void {
    const enemy = this.activeEnemies.get(enemyId);
    if (enemy) {
      this.recycle(enemy);
    }
  }

  /**
   * Get an active enemy by ID.
   */
  getEnemy(enemyId: EntityId): BaseEnemy | undefined {
    return this.activeEnemies.get(enemyId);
  }

  /**
   * Get all active enemies.
   */
  getActiveEnemies(): BaseEnemy[] {
    return Array.from(this.activeEnemies.values());
  }

  /**
   * Get all active enemies of a specific type.
   */
  getActiveEnemiesByType(type: EnemyType): BaseEnemy[] {
    return this.getActiveEnemies().filter(e => e.getType() === type);
  }

  /**
   * Get count of active enemies.
   */
  getActiveCount(): number {
    return this.activeEnemies.size;
  }

  /**
   * Update all active enemies.
   */
  update(deltaMs: number): void {
    for (const enemy of this.activeEnemies.values()) {
      if (enemy.getIsActive()) {
        enemy.update(deltaMs);
      }
    }
  }

  /**
   * Set target for all active enemies.
   */
  setTargetForAll(target: Phaser.GameObjects.Sprite | null): void {
    for (const enemy of this.activeEnemies.values()) {
      enemy.setTarget(target);
    }
  }

  /**
   * Set target for enemies within a radius.
   */
  setTargetInRadius(
    target: Phaser.GameObjects.Sprite,
    centerX: number,
    centerY: number,
    radius: number
  ): void {
    for (const enemy of this.activeEnemies.values()) {
      const pos = enemy.getPosition();
      const dist = Phaser.Math.Distance.Between(pos.x, pos.y, centerX, centerY);
      if (dist <= radius) {
        enemy.setTarget(target);
      }
    }
  }

  /**
   * Get pool statistics.
   */
  getStats(): PoolStats {
    return { ...this.stats };
  }

  /**
   * Recycle all active enemies.
   */
  recycleAll(): void {
    const enemies = Array.from(this.activeEnemies.values());
    for (const enemy of enemies) {
      this.recycle(enemy);
    }
  }

  /**
   * Clean up dead enemies.
   */
  cleanupDead(): void {
    const deadEnemies: BaseEnemy[] = [];

    for (const enemy of this.activeEnemies.values()) {
      if (!enemy.isAlive()) {
        deadEnemies.push(enemy);
      }
    }

    for (const enemy of deadEnemies) {
      this.recycle(enemy);
    }
  }

  /**
   * Setup event listeners.
   */
  private setupEvents(): void {
    // Auto-recycle dead enemies after delay
    this.eventBus.on('enemy:death', (event) => {
      const data = event.data as { enemyId: EntityId };
      // Delay recycle to allow death animation
      this.scene.time.delayedCall(2000, () => {
        this.recycleById(data.enemyId);
      });
    });
  }

  /**
   * Destroy the pool and all enemies.
   */
  destroy(): void {
    // Destroy all active enemies
    for (const enemy of this.activeEnemies.values()) {
      enemy.destroy();
    }
    this.activeEnemies.clear();

    // Destroy pooled enemies
    for (const pool of this.pools.values()) {
      for (const enemy of pool) {
        enemy.destroy();
      }
      pool.length = 0;
    }
    this.pools.clear();
  }
}
