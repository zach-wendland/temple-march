/**
 * Enemy System Exports
 * Central export point for enemy-related modules.
 */

// Enemy types and configuration
export {
  EnemyType,
  EnemyState,
  EnemyConfig,
  getEnemyConfig,
  createEnemyCombatStats,
  CLONE_TROOPER_CONFIG,
  JEDI_DEFENDER_CONFIG,
  TEMPLE_GUARD_CONFIG,
  JEDI_MASTER_CONFIG,
} from './EnemyTypes';

// Base enemy class
export { BaseEnemy, EnemyContext, AIBehavior } from './BaseEnemy';

// Specific enemy types
export { JediDefender, JediAttack } from './JediDefender';
export { CloneTrooper, CloneAttack, FormationRole } from './CloneTrooper';
export { TempleGuard, GuardAttack, GuardStance } from './TempleGuard';

// Object pooling
export { EnemyPool, EnemyPoolConfig, PoolStats } from './EnemyPool';
