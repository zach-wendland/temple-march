/**
 * Damage Calculator - Damage formulas for the Vader power fantasy.
 * Vader deals massive damage and takes minimal damage.
 */

import { AttackData, AttackType } from './AttackData';

/**
 * Faction type for damage calculations.
 */
export enum Faction {
  /** Vader/Player */
  Sith = 'sith',
  /** 501st Legion - allies */
  Imperial = 'imperial',
  /** Jedi defenders - enemies */
  Jedi = 'jedi',
  /** Temple Guards - tougher enemies */
  TempleGuard = 'temple_guard',
  /** Boss enemies */
  Boss = 'boss',
}

/**
 * Defense type modifiers.
 */
export enum DefenseType {
  /** No defense active */
  None = 'none',
  /** Blocking with saber */
  Block = 'block',
  /** Perfect block (parry) */
  Parry = 'parry',
  /** Dodging (i-frames) */
  Dodge = 'dodge',
  /** Force barrier */
  ForceBarrier = 'force_barrier',
}

/**
 * Damage result after calculation.
 */
export interface DamageResult {
  /** Final damage dealt */
  damage: number;
  /** Raw damage before modifiers */
  rawDamage: number;
  /** Was this a critical hit? */
  isCritical: boolean;
  /** Was damage blocked? */
  wasBlocked: boolean;
  /** Was damage parried? */
  wasParried: boolean;
  /** Knockback force */
  knockback: number;
  /** Hitstun duration (ms) */
  hitstun: number;
  /** Damage type for effects */
  damageType: 'normal' | 'critical' | 'force' | 'blocked';
}

/**
 * Entity combat stats for damage calculation.
 */
export interface CombatStats {
  /** Entity faction */
  faction: Faction;
  /** Current health */
  health: number;
  /** Maximum health */
  maxHealth: number;
  /** Attack power multiplier (1.0 = base) */
  attackPower: number;
  /** Defense multiplier (1.0 = base) */
  defense: number;
  /** Critical hit chance (0-1) */
  critChance: number;
  /** Critical damage multiplier */
  critMultiplier: number;
  /** Current defense type */
  defenseType: DefenseType;
  /** Stagger/posture value (0-100) */
  stagger: number;
}

// =============================================================================
// DAMAGE MULTIPLIERS
// =============================================================================

/**
 * Faction-based damage multipliers (attacker vs defender).
 * Vader deals extra damage to all enemies, takes reduced damage.
 */
const FACTION_DAMAGE_MULTIPLIERS: Record<Faction, Record<Faction, number>> = {
  [Faction.Sith]: {
    [Faction.Sith]: 0.5, // Self-damage reduced
    [Faction.Imperial]: 0.8, // Clones take less damage from Vader
    [Faction.Jedi]: 2.0, // Vader destroys Jedi
    [Faction.TempleGuard]: 1.5, // Guards are tougher
    [Faction.Boss]: 1.0, // Normal against bosses
  },
  [Faction.Imperial]: {
    [Faction.Sith]: 0.0, // Clones don't hurt Vader
    [Faction.Imperial]: 0.5, // Friendly fire reduced
    [Faction.Jedi]: 0.5, // Clones are weak against Jedi
    [Faction.TempleGuard]: 0.3, // Very weak against Guards
    [Faction.Boss]: 0.2, // Almost no damage to bosses
  },
  [Faction.Jedi]: {
    [Faction.Sith]: 0.3, // Jedi deal reduced damage to Vader
    [Faction.Imperial]: 1.5, // Jedi are effective against Clones
    [Faction.Jedi]: 0.5, // Jedi vs Jedi
    [Faction.TempleGuard]: 0.5,
    [Faction.Boss]: 0.0,
  },
  [Faction.TempleGuard]: {
    [Faction.Sith]: 0.4, // Guards deal some damage to Vader
    [Faction.Imperial]: 2.0, // Guards destroy Clones
    [Faction.Jedi]: 0.5,
    [Faction.TempleGuard]: 0.5,
    [Faction.Boss]: 0.0,
  },
  [Faction.Boss]: {
    [Faction.Sith]: 0.5, // Bosses deal decent damage to Vader
    [Faction.Imperial]: 3.0, // Bosses destroy Clones
    [Faction.Jedi]: 1.0,
    [Faction.TempleGuard]: 1.0,
    [Faction.Boss]: 0.5,
  },
};

/**
 * Defense type damage reduction.
 */
const DEFENSE_MODIFIERS: Record<DefenseType, number> = {
  [DefenseType.None]: 1.0,
  [DefenseType.Block]: 0.2, // 80% reduction
  [DefenseType.Parry]: 0.0, // Full block + counterattack window
  [DefenseType.Dodge]: 0.0, // Full invincibility
  [DefenseType.ForceBarrier]: 0.1, // 90% reduction
};

/**
 * Attack type vs defense type effectiveness.
 * Some attack types bypass certain defenses.
 */
const ATTACK_VS_DEFENSE: Record<AttackType, Record<DefenseType, number>> = {
  [AttackType.LightAttack]: {
    [DefenseType.None]: 1.0,
    [DefenseType.Block]: 0.2,
    [DefenseType.Parry]: 0.0,
    [DefenseType.Dodge]: 0.0,
    [DefenseType.ForceBarrier]: 0.3,
  },
  [AttackType.HeavyAttack]: {
    [DefenseType.None]: 1.0,
    [DefenseType.Block]: 0.4, // Heavy attacks partially break blocks
    [DefenseType.Parry]: 0.0,
    [DefenseType.Dodge]: 0.0,
    [DefenseType.ForceBarrier]: 0.5,
  },
  [AttackType.Special]: {
    [DefenseType.None]: 1.0,
    [DefenseType.Block]: 0.3,
    [DefenseType.Parry]: 0.0,
    [DefenseType.Dodge]: 0.0,
    [DefenseType.ForceBarrier]: 0.4,
  },
  [AttackType.ForcePower]: {
    [DefenseType.None]: 1.0,
    [DefenseType.Block]: 0.8, // Force powers mostly ignore blocks
    [DefenseType.Parry]: 0.5, // Even parries only partially block
    [DefenseType.Dodge]: 0.0,
    [DefenseType.ForceBarrier]: 0.2, // Force barrier is effective vs Force
  },
};

/**
 * Combo scaling - damage reduction per combo hit.
 * Minimum 50% damage at high combo counts.
 */
const COMBO_SCALING = [1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5];

// =============================================================================
// DAMAGE CALCULATOR
// =============================================================================

/**
 * Calculate damage for an attack.
 */
export function calculateDamage(
  attack: AttackData,
  attacker: CombatStats,
  defender: CombatStats,
  comboCount: number = 0,
  chargeMultiplier: number = 1.0
): DamageResult {
  // Start with base damage
  let rawDamage = attack.damage;

  // Apply charge multiplier (for charged heavy attacks)
  rawDamage *= chargeMultiplier;

  // Apply attacker's attack power
  rawDamage *= attacker.attackPower;

  // Check for critical hit
  const critRoll = Math.random();
  const isCritical = critRoll < attacker.critChance;
  if (isCritical) {
    rawDamage *= attacker.critMultiplier;
  }

  // Store raw damage before defense
  const finalRawDamage = rawDamage;

  // Apply faction multiplier
  const factionMult = FACTION_DAMAGE_MULTIPLIERS[attacker.faction][defender.faction];
  rawDamage *= factionMult;

  // Apply defense type modifier based on attack type
  const defenseEffectiveness = ATTACK_VS_DEFENSE[attack.type][defender.defenseType];
  const wasBlocked = defender.defenseType === DefenseType.Block;
  const wasParried = defender.defenseType === DefenseType.Parry;
  rawDamage *= defenseEffectiveness;

  // Apply defender's defense stat
  rawDamage /= defender.defense;

  // Apply combo scaling
  const comboIndex = Math.min(comboCount, COMBO_SCALING.length - 1);
  const comboScale = COMBO_SCALING[comboIndex];
  rawDamage *= comboScale;

  // Calculate knockback (reduced if blocking)
  let knockback = attack.knockback;
  if (wasBlocked) {
    knockback *= 0.3;
  } else if (wasParried) {
    knockback = 0;
  }

  // Calculate hitstun (reduced if blocking)
  let hitstun = attack.hitstun;
  if (wasBlocked) {
    hitstun *= 0.5;
  } else if (wasParried) {
    hitstun = 0;
  }

  // Determine damage type for visual effects
  let damageType: 'normal' | 'critical' | 'force' | 'blocked' = 'normal';
  if (wasBlocked || wasParried) {
    damageType = 'blocked';
  } else if (attack.type === AttackType.ForcePower) {
    damageType = 'force';
  } else if (isCritical) {
    damageType = 'critical';
  }

  // Ensure minimum 1 damage if attack connected (not blocked/parried)
  const finalDamage = Math.max(wasParried ? 0 : 1, Math.round(rawDamage));

  return {
    damage: finalDamage,
    rawDamage: finalRawDamage,
    isCritical,
    wasBlocked,
    wasParried,
    knockback,
    hitstun,
    damageType,
  };
}

/**
 * Calculate stagger/posture damage from an attack.
 * When stagger reaches 100, enemy is vulnerable to a finisher.
 */
export function calculateStaggerDamage(
  attack: AttackData,
  attacker: CombatStats,
  defender: CombatStats
): number {
  // Base stagger damage based on attack type
  let staggerDamage = 0;
  switch (attack.type) {
    case AttackType.LightAttack:
      staggerDamage = 5;
      break;
    case AttackType.HeavyAttack:
      staggerDamage = 15;
      break;
    case AttackType.Special:
      staggerDamage = 10;
      break;
    case AttackType.ForcePower:
      staggerDamage = 20; // Force powers deal high stagger
      break;
  }

  // Blocked attacks deal more stagger damage
  if (defender.defenseType === DefenseType.Block) {
    staggerDamage *= 2.0;
  }

  // Vader deals extra stagger (power fantasy)
  if (attacker.faction === Faction.Sith) {
    staggerDamage *= 1.5;
  }

  return staggerDamage;
}

/**
 * Check if an attack would kill the target.
 */
export function wouldKill(damageResult: DamageResult, defenderHealth: number): boolean {
  return damageResult.damage >= defenderHealth;
}

/**
 * Get the combo scaling multiplier for a given combo count.
 */
export function getComboScaling(comboCount: number): number {
  const index = Math.min(comboCount, COMBO_SCALING.length - 1);
  return COMBO_SCALING[index];
}

/**
 * Create default combat stats for a faction.
 */
export function createDefaultStats(faction: Faction): CombatStats {
  switch (faction) {
    case Faction.Sith:
      return {
        faction,
        health: 1000,
        maxHealth: 1000,
        attackPower: 1.5, // Vader hits hard
        defense: 2.0, // Vader is tough
        critChance: 0.15,
        critMultiplier: 2.0,
        defenseType: DefenseType.None,
        stagger: 0,
      };
    case Faction.Imperial:
      return {
        faction,
        health: 100,
        maxHealth: 100,
        attackPower: 0.5,
        defense: 0.8,
        critChance: 0.05,
        critMultiplier: 1.5,
        defenseType: DefenseType.None,
        stagger: 0,
      };
    case Faction.Jedi:
      return {
        faction,
        health: 150,
        maxHealth: 150,
        attackPower: 1.0,
        defense: 1.0,
        critChance: 0.1,
        critMultiplier: 1.5,
        defenseType: DefenseType.None,
        stagger: 0,
      };
    case Faction.TempleGuard:
      return {
        faction,
        health: 300,
        maxHealth: 300,
        attackPower: 1.2,
        defense: 1.5,
        critChance: 0.1,
        critMultiplier: 1.5,
        defenseType: DefenseType.None,
        stagger: 0,
      };
    case Faction.Boss:
      return {
        faction,
        health: 2000,
        maxHealth: 2000,
        attackPower: 1.5,
        defense: 2.0,
        critChance: 0.15,
        critMultiplier: 2.0,
        defenseType: DefenseType.None,
        stagger: 0,
      };
  }
}
