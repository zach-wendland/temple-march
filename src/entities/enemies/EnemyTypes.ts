/**
 * Enemy Types and Configuration
 * Defines all enemy archetypes for the Temple March.
 */

import { Faction, CombatStats, DefenseType, createDefaultStats } from '../../combat/DamageCalculator';

/**
 * Enemy type enumeration.
 */
export enum EnemyType {
  /** Clone Trooper - Ranged, formation-based tactics */
  CloneTrooper = 'clone_trooper',
  /** Jedi Defender - Melee lightsaber combat */
  JediDefender = 'jedi_defender',
  /** Temple Guard - Pike weapons, defensive stance */
  TempleGuard = 'temple_guard',
  /** Jedi Master - Boss-level enemy with Force powers */
  JediMaster = 'jedi_master',
}

/**
 * Enemy state enumeration - common states for all enemies.
 */
export enum EnemyState {
  /** Idle - standing still, aware */
  Idle = 'idle',
  /** Patrol - moving along patrol route */
  Patrol = 'patrol',
  /** Alert - detected player, transitioning to combat */
  Alert = 'alert',
  /** Chase - pursuing the player */
  Chase = 'chase',
  /** Attack - executing an attack */
  Attack = 'attack',
  /** Block - blocking incoming attacks */
  Block = 'block',
  /** Hitstun - recoiling from damage */
  Hitstun = 'hitstun',
  /** Staggered - posture broken, vulnerable */
  Staggered = 'staggered',
  /** Retreat - falling back (tactical) */
  Retreat = 'retreat',
  /** Dead - defeated */
  Dead = 'dead',
}

/**
 * Enemy configuration data.
 */
export interface EnemyConfig {
  /** Enemy type identifier */
  type: EnemyType;
  /** Display name */
  displayName: string;
  /** Faction for damage calculations */
  faction: Faction;
  /** Base health */
  health: number;
  /** Movement speed (pixels per second) */
  moveSpeed: number;
  /** Detection range for player */
  detectionRange: number;
  /** Attack range */
  attackRange: number;
  /** Preferred combat distance */
  preferredDistance: number;
  /** Time between attacks (ms) */
  attackCooldown: number;
  /** Base attack damage */
  attackDamage: number;
  /** Can this enemy block? */
  canBlock: boolean;
  /** Block chance (0-1) */
  blockChance: number;
  /** Can this enemy parry? */
  canParry: boolean;
  /** Parry window (ms) */
  parryWindow: number;
  /** Can this enemy use Force powers? */
  canUseForce: boolean;
  /** Is this a ranged attacker? */
  isRanged: boolean;
  /** Projectile speed (if ranged) */
  projectileSpeed: number;
  /** Fire rate (ms between shots, if ranged) */
  fireRate: number;
  /** Should this enemy coordinate with others? */
  coordinatesWithGroup: boolean;
  /** Sprite key for rendering */
  spriteKey: string;
  /** Physics body width */
  bodyWidth: number;
  /** Physics body height */
  bodyHeight: number;
}

/**
 * Clone Trooper configuration.
 * Ranged attackers with formation tactics from 501st Legion.
 */
export const CLONE_TROOPER_CONFIG: EnemyConfig = {
  type: EnemyType.CloneTrooper,
  displayName: '501st Clone Trooper',
  faction: Faction.Imperial, // Allied with Vader but can be enemies in certain scenarios
  health: 50,
  moveSpeed: 140,
  detectionRange: 400,
  attackRange: 350,
  preferredDistance: 250,
  attackCooldown: 500,
  attackDamage: 10,
  canBlock: false,
  blockChance: 0,
  canParry: false,
  parryWindow: 0,
  canUseForce: false,
  isRanged: true,
  projectileSpeed: 500,
  fireRate: 500,
  coordinatesWithGroup: true,
  spriteKey: 'clone_trooper',
  bodyWidth: 20,
  bodyHeight: 30,
};

/**
 * Jedi Defender configuration.
 * Melee combatants with lightsaber skills.
 */
export const JEDI_DEFENDER_CONFIG: EnemyConfig = {
  type: EnemyType.JediDefender,
  displayName: 'Jedi Knight',
  faction: Faction.Jedi,
  health: 150,
  moveSpeed: 180,
  detectionRange: 300,
  attackRange: 60,
  preferredDistance: 50,
  attackCooldown: 800,
  attackDamage: 25,
  canBlock: true,
  blockChance: 0.4,
  canParry: true,
  parryWindow: 150,
  canUseForce: false, // Regular knights don't use Force offensively
  isRanged: false,
  projectileSpeed: 0,
  fireRate: 0,
  coordinatesWithGroup: true,
  spriteKey: 'jedi_knight',
  bodyWidth: 24,
  bodyHeight: 32,
};

/**
 * Temple Guard configuration.
 * Defensive specialists with pike weapons.
 */
export const TEMPLE_GUARD_CONFIG: EnemyConfig = {
  type: EnemyType.TempleGuard,
  displayName: 'Temple Guard',
  faction: Faction.TempleGuard,
  health: 300,
  moveSpeed: 120,
  detectionRange: 250,
  attackRange: 100, // Pike has longer reach
  preferredDistance: 80,
  attackCooldown: 1000,
  attackDamage: 35,
  canBlock: true,
  blockChance: 0.6, // Excellent blockers
  canParry: true,
  parryWindow: 200, // Larger parry window
  canUseForce: false,
  isRanged: false,
  projectileSpeed: 0,
  fireRate: 0,
  coordinatesWithGroup: true,
  spriteKey: 'temple_guard',
  bodyWidth: 28,
  bodyHeight: 36,
};

/**
 * Jedi Master configuration (mini-boss).
 * Powerful Force users with advanced combat skills.
 */
export const JEDI_MASTER_CONFIG: EnemyConfig = {
  type: EnemyType.JediMaster,
  displayName: 'Jedi Master',
  faction: Faction.Boss,
  health: 800,
  moveSpeed: 200,
  detectionRange: 400,
  attackRange: 70,
  preferredDistance: 60,
  attackCooldown: 600,
  attackDamage: 40,
  canBlock: true,
  blockChance: 0.7,
  canParry: true,
  parryWindow: 250,
  canUseForce: true,
  isRanged: false,
  projectileSpeed: 0,
  fireRate: 0,
  coordinatesWithGroup: false, // Masters fight independently
  spriteKey: 'jedi_master',
  bodyWidth: 26,
  bodyHeight: 34,
};

/**
 * Get enemy configuration by type.
 */
export function getEnemyConfig(type: EnemyType): EnemyConfig {
  switch (type) {
    case EnemyType.CloneTrooper:
      return CLONE_TROOPER_CONFIG;
    case EnemyType.JediDefender:
      return JEDI_DEFENDER_CONFIG;
    case EnemyType.TempleGuard:
      return TEMPLE_GUARD_CONFIG;
    case EnemyType.JediMaster:
      return JEDI_MASTER_CONFIG;
    default:
      return JEDI_DEFENDER_CONFIG;
  }
}

/**
 * Create combat stats from enemy config.
 */
export function createEnemyCombatStats(config: EnemyConfig): CombatStats {
  const baseStats = createDefaultStats(config.faction);
  return {
    ...baseStats,
    health: config.health,
    maxHealth: config.health,
    defenseType: DefenseType.None,
    stagger: 0,
  };
}
