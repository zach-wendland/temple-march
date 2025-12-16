/**
 * BalanceConfig - Central configuration for all game balance values.
 *
 * This file provides a single source of truth for tuning:
 * - Player stats and abilities
 * - Enemy difficulty scaling
 * - Boss parameters
 * - Combat feel (damage, knockback, etc.)
 * - Progression pacing
 *
 * All values are designed to be easily tweaked for playtesting.
 */

// ============================================================================
// PLAYER BALANCE
// ============================================================================

export const PLAYER_BALANCE = {
  // Health
  baseHealth: 500,
  healthPerLevel: 0, // No leveling in this game

  // Force
  baseForce: 150,
  forceRegenRate: 20, // Per second
  forceRegenDelay: 1000, // ms after last use

  // Movement
  walkSpeed: 180,
  runSpeed: 280,
  dodgeSpeed: 400,
  dodgeDuration: 300, // ms
  dodgeCooldown: 500, // ms
  dodgeInvulnerability: 200, // ms

  // Attack Damage
  lightAttackDamage: 35,
  heavyAttackDamage: 60,
  risingStrikeDamage: 50,
  saberThrowDamage: 40,

  // Attack Speeds (ms)
  lightAttackStartup: 100,
  lightAttackActive: 100,
  lightAttackRecovery: 150,
  heavyAttackStartup: 250,
  heavyAttackActive: 150,
  heavyAttackRecovery: 300,

  // Force Powers
  forcePushCost: 30,
  forcePushDamage: 25,
  forcePushKnockback: 300,
  forcePushRange: 250,

  forcePullCost: 25,
  forcePullDamage: 15,
  forcePullRange: 300,

  forceLightningCost: 50,
  forceLightningDamage: 15, // Per tick
  forceLightningDuration: 2000,
  forceLightningRange: 200,

  // Defense
  blockStaminaCost: 0, // Vader has infinite block stamina
  parryWindow: 150, // ms
  parryDamageMultiplier: 0, // Perfect parry negates damage
  parryStunDuration: 500, // Enemy stun on parry

  // Hitstun
  hitstunDuration: 200, // Very short - Vader is tanky
  knockbackResistance: 0.5, // 50% knockback reduction
} as const;

// ============================================================================
// ENEMY BALANCE
// ============================================================================

export const ENEMY_BALANCE = {
  // Clone Trooper
  cloneTrooper: {
    health: 50,
    damage: 10,
    attackCooldown: 500,
    detectionRange: 400,
    projectileSpeed: 500,
    accuracy: 0.7, // 70% hit chance at optimal range
  },

  // Jedi Defender
  jediDefender: {
    health: 150,
    damage: 25,
    attackCooldown: 800,
    detectionRange: 300,
    blockChance: 0.4,
    parryWindow: 150,
    comboLength: 3,
  },

  // Temple Guard
  templeGuard: {
    health: 300,
    damage: 35,
    attackCooldown: 1000,
    detectionRange: 250,
    blockChance: 0.6,
    parryWindow: 200,
    pikeRange: 100, // Extended reach
  },

  // General enemy modifiers
  hitstunDuration: 400,
  knockbackMultiplier: 1.0,
  aggroTransferRange: 200, // How far away enemies can be alerted
  maxSimultaneousAttackers: 3, // Limit for fairness
} as const;

// ============================================================================
// BOSS BALANCE - CIN DRALLIG
// ============================================================================

export const BOSS_BALANCE = {
  cinDrallig: {
    // Health (3 phases)
    totalHealth: 3000,
    phase1HealthPercent: 1.0,
    phase2HealthPercent: 0.66,
    phase3HealthPercent: 0.33,

    // Base stats
    baseMoveSpeed: 220,
    baseAttackCooldown: 400,
    baseBlockChance: 0.8,
    baseParryWindow: 300,

    // Phase 1: Shii-Cho
    phase1: {
      moveSpeed: 220,
      attackCooldown: 500,
      blockChance: 0.7,
      damageMultiplier: 1.0,
      comboLength: 3,
    },

    // Phase 2: Ataru
    phase2: {
      moveSpeed: 280,
      attackCooldown: 300,
      blockChance: 0.5,
      damageMultiplier: 1.2,
      comboLength: 4,
      canLeapAttack: true,
      canForceDash: true,
    },

    // Phase 3: Juyo
    phase3: {
      moveSpeed: 320,
      attackCooldown: 200,
      blockChance: 0.3,
      damageMultiplier: 1.5,
      comboLength: 6,
      enraged: true,
      canSummonApprentices: true,
    },

    // Force usage
    maxBossForce: 200,
    forceRegenRate: 15,

    // Enrage (if fight takes too long)
    enrageTimer: 60000, // 60 seconds
    enrageDamageMultiplier: 1.5,
    enrageSpeedMultiplier: 1.3,

    // Apprentice summons
    apprenticeHealth: 75,
    apprenticeDamage: 15,
    maxApprentices: 2,
  },
} as const;

// ============================================================================
// COMBAT FEEL
// ============================================================================

export const COMBAT_FEEL = {
  // Screen Shake
  lightHitShake: { intensity: 0.003, duration: 50 },
  heavyHitShake: { intensity: 0.008, duration: 100 },
  criticalHitShake: { intensity: 0.012, duration: 120 },
  killShake: { intensity: 0.02, duration: 200 },
  forcePowerShake: { intensity: 0.015, duration: 150 },
  bossPhaseShake: { intensity: 0.025, duration: 300 },

  // Hit Stop (freeze frames)
  lightHitStop: 0, // No freeze for light attacks
  heavyHitStop: 50, // ms
  criticalHitStop: 80,
  killHitStop: 120,
  bossHitStop: 60,

  // Knockback
  lightKnockback: 100,
  heavyKnockback: 180,
  forceKnockback: 300,

  // Hitstun
  minHitstun: 100,
  maxHitstun: 500,

  // Combo System
  comboDuration: 3000, // Time before combo drops
  comboWarningTime: 1000, // Last second warning
  comboDamageScaling: [1.0, 0.9, 0.8, 0.7, 0.6, 0.5], // Per hit

  // I-Frames
  dodgeIFrames: 200,
  hitstunIFrames: 100,
  respawnIFrames: 2000,
} as const;

// ============================================================================
// PROGRESSION PACING
// ============================================================================

export const PROGRESSION = {
  // Area difficulty scaling
  areaScaling: {
    temple_entrance: { enemyHealthMult: 1.0, enemyDamageMult: 1.0 },
    temple_halls: { enemyHealthMult: 1.1, enemyDamageMult: 1.1 },
    training_grounds: { enemyHealthMult: 1.2, enemyDamageMult: 1.15 },
    temple_archives: { enemyHealthMult: 1.3, enemyDamageMult: 1.2 },
    council_chamber: { enemyHealthMult: 1.0, enemyDamageMult: 1.0 }, // Boss uses own stats
  },

  // Enemy density
  maxEnemiesPerWave: 5,
  timeBetweenWaves: 2000, // ms

  // Checkpoint healing
  checkpointHealPercent: 0.5, // Heal 50% on checkpoint
  checkpointForceRestore: 1.0, // Full Force restore

  // Pickups
  healthPickupValue: 25,
  forcePickupValue: 30,
  pickupDropChance: 0.3, // 30% chance from enemies
} as const;

// ============================================================================
// DIFFICULTY PRESETS
// ============================================================================

export enum DifficultyLevel {
  Story = 'story',
  Normal = 'normal',
  Hard = 'hard',
  Nightmare = 'nightmare',
}

export const DIFFICULTY_MODIFIERS: Record<
  DifficultyLevel,
  {
    playerDamageTaken: number;
    playerDamageDealt: number;
    enemyHealth: number;
    enemyDamage: number;
    enemyAggression: number;
    forceRegenRate: number;
    pickupDropChance: number;
  }
> = {
  [DifficultyLevel.Story]: {
    playerDamageTaken: 0.5,
    playerDamageDealt: 1.5,
    enemyHealth: 0.7,
    enemyDamage: 0.5,
    enemyAggression: 0.7,
    forceRegenRate: 1.5,
    pickupDropChance: 0.5,
  },
  [DifficultyLevel.Normal]: {
    playerDamageTaken: 1.0,
    playerDamageDealt: 1.0,
    enemyHealth: 1.0,
    enemyDamage: 1.0,
    enemyAggression: 1.0,
    forceRegenRate: 1.0,
    pickupDropChance: 0.3,
  },
  [DifficultyLevel.Hard]: {
    playerDamageTaken: 1.5,
    playerDamageDealt: 0.9,
    enemyHealth: 1.3,
    enemyDamage: 1.3,
    enemyAggression: 1.2,
    forceRegenRate: 0.8,
    pickupDropChance: 0.2,
  },
  [DifficultyLevel.Nightmare]: {
    playerDamageTaken: 2.0,
    playerDamageDealt: 0.8,
    enemyHealth: 1.5,
    enemyDamage: 1.5,
    enemyAggression: 1.5,
    forceRegenRate: 0.6,
    pickupDropChance: 0.1,
  },
};

// ============================================================================
// BALANCE MANAGER
// ============================================================================

/**
 * Balance Manager - Provides access to balance values with difficulty modifiers.
 */
export class BalanceManager {
  private static instance: BalanceManager | null = null;
  private currentDifficulty: DifficultyLevel = DifficultyLevel.Normal;

  private constructor() {}

  static getInstance(): BalanceManager {
    if (!BalanceManager.instance) {
      BalanceManager.instance = new BalanceManager();
    }
    return BalanceManager.instance;
  }

  setDifficulty(difficulty: DifficultyLevel): void {
    this.currentDifficulty = difficulty;
  }

  getDifficulty(): DifficultyLevel {
    return this.currentDifficulty;
  }

  getModifiers() {
    return DIFFICULTY_MODIFIERS[this.currentDifficulty];
  }

  // Player values
  getPlayerHealth(): number {
    return PLAYER_BALANCE.baseHealth;
  }

  getPlayerDamage(baseDamage: number): number {
    return baseDamage * this.getModifiers().playerDamageDealt;
  }

  getPlayerDamageTaken(baseDamage: number): number {
    return baseDamage * this.getModifiers().playerDamageTaken;
  }

  // Enemy values
  getEnemyHealth(baseHealth: number, areaId?: string): number {
    const areaScaling = areaId
      ? PROGRESSION.areaScaling[areaId as keyof typeof PROGRESSION.areaScaling]?.enemyHealthMult ?? 1.0
      : 1.0;
    return baseHealth * this.getModifiers().enemyHealth * areaScaling;
  }

  getEnemyDamage(baseDamage: number, areaId?: string): number {
    const areaScaling = areaId
      ? PROGRESSION.areaScaling[areaId as keyof typeof PROGRESSION.areaScaling]?.enemyDamageMult ?? 1.0
      : 1.0;
    return baseDamage * this.getModifiers().enemyDamage * areaScaling;
  }

  // Boss values
  getBossHealth(): number {
    return BOSS_BALANCE.cinDrallig.totalHealth * this.getModifiers().enemyHealth;
  }

  getBossDamage(baseDamage: number, phase: number): number {
    let phaseMult = 1.0;
    switch (phase) {
      case 1:
        phaseMult = BOSS_BALANCE.cinDrallig.phase1.damageMultiplier;
        break;
      case 2:
        phaseMult = BOSS_BALANCE.cinDrallig.phase2.damageMultiplier;
        break;
      case 3:
        phaseMult = BOSS_BALANCE.cinDrallig.phase3.damageMultiplier;
        break;
    }
    return baseDamage * phaseMult * this.getModifiers().enemyDamage;
  }

  // Pickup drop chance
  getPickupDropChance(): number {
    return this.getModifiers().pickupDropChance;
  }

  // Force regen
  getForceRegenRate(): number {
    return PLAYER_BALANCE.forceRegenRate * this.getModifiers().forceRegenRate;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate damage with all modifiers applied.
 */
export function calculateFinalDamage(
  baseDamage: number,
  attackerIsPlayer: boolean,
  comboHitNumber: number = 1,
  isCritical: boolean = false,
  areaId?: string
): number {
  const balance = BalanceManager.getInstance();
  let damage = baseDamage;

  // Apply attacker modifier
  if (attackerIsPlayer) {
    damage = balance.getPlayerDamage(damage);
  } else {
    damage = balance.getEnemyDamage(damage, areaId);
  }

  // Apply combo scaling
  if (comboHitNumber > 0) {
    const scalingIndex = Math.min(
      comboHitNumber - 1,
      COMBAT_FEEL.comboDamageScaling.length - 1
    );
    damage *= COMBAT_FEEL.comboDamageScaling[scalingIndex];
  }

  // Apply critical multiplier
  if (isCritical) {
    damage *= 1.5;
  }

  return Math.round(damage);
}

/**
 * Get knockback based on attack type.
 */
export function getKnockback(attackType: 'light' | 'heavy' | 'force'): number {
  switch (attackType) {
    case 'light':
      return COMBAT_FEEL.lightKnockback;
    case 'heavy':
      return COMBAT_FEEL.heavyKnockback;
    case 'force':
      return COMBAT_FEEL.forceKnockback;
    default:
      return COMBAT_FEEL.lightKnockback;
  }
}

/**
 * Get hit stop duration based on hit type.
 */
export function getHitStop(hitType: 'light' | 'heavy' | 'critical' | 'kill' | 'boss'): number {
  switch (hitType) {
    case 'light':
      return COMBAT_FEEL.lightHitStop;
    case 'heavy':
      return COMBAT_FEEL.heavyHitStop;
    case 'critical':
      return COMBAT_FEEL.criticalHitStop;
    case 'kill':
      return COMBAT_FEEL.killHitStop;
    case 'boss':
      return COMBAT_FEEL.bossHitStop;
    default:
      return 0;
  }
}

/**
 * Get screen shake parameters based on hit type.
 */
export function getScreenShake(
  hitType: 'light' | 'heavy' | 'critical' | 'kill' | 'force' | 'bossPhase'
): { intensity: number; duration: number } {
  switch (hitType) {
    case 'light':
      return COMBAT_FEEL.lightHitShake;
    case 'heavy':
      return COMBAT_FEEL.heavyHitShake;
    case 'critical':
      return COMBAT_FEEL.criticalHitShake;
    case 'kill':
      return COMBAT_FEEL.killShake;
    case 'force':
      return COMBAT_FEEL.forcePowerShake;
    case 'bossPhase':
      return COMBAT_FEEL.bossPhaseShake;
    default:
      return COMBAT_FEEL.lightHitShake;
  }
}
