/**
 * Attack Data - Frame data definitions for all attacks.
 * Based on Form V (Djem So) - overwhelming offensive pressure.
 */

/**
 * Attack phase enum - frames of an attack.
 */
export enum AttackPhase {
  /** Wind-up frames (can be cancelled) */
  Startup = 'startup',
  /** Active hitbox frames */
  Active = 'active',
  /** Recovery frames (vulnerable) */
  Recovery = 'recovery',
}

/**
 * Attack type enum.
 */
export enum AttackType {
  LightAttack = 'light',
  HeavyAttack = 'heavy',
  Special = 'special',
  ForcePower = 'force',
}

/**
 * Direction for hitbox placement.
 */
export enum HitboxDirection {
  Forward = 'forward',
  Up = 'up',
  Down = 'down',
  All = 'all', // For AoE attacks
}

/**
 * Hitbox definition for an attack frame.
 */
export interface HitboxData {
  /** Offset from character center (X) */
  offsetX: number;
  /** Offset from character center (Y) */
  offsetY: number;
  /** Width of hitbox */
  width: number;
  /** Height of hitbox */
  height: number;
  /** Direction relative to facing */
  direction: HitboxDirection;
}

/**
 * Full attack data definition.
 */
export interface AttackData {
  /** Unique attack identifier */
  id: string;
  /** Display name */
  name: string;
  /** Attack type */
  type: AttackType;
  /** Base damage */
  damage: number;
  /** Startup frames (ms) */
  startupMs: number;
  /** Active frames (ms) */
  activeMs: number;
  /** Recovery frames (ms) */
  recoveryMs: number;
  /** Hitbox data */
  hitbox: HitboxData;
  /** Knockback force applied to target */
  knockback: number;
  /** Hitstun applied to target (ms) */
  hitstun: number;
  /** Can be cancelled into (attack ids) */
  cancelInto: string[];
  /** Force cost (for Force powers) */
  forceCost?: number;
  /** Movement during attack (X velocity) */
  movementX?: number;
  /** Movement during attack (Y velocity) */
  movementY?: number;
  /** Is this a multi-hit attack? */
  multiHit?: boolean;
  /** Delay between multi-hits (ms) */
  multiHitDelay?: number;
  /** Can this attack be held for charge? */
  chargeable?: boolean;
  /** Max charge time (ms) */
  maxChargeMs?: number;
  /** Damage multiplier at max charge */
  chargeMultiplier?: number;
}

// =============================================================================
// VADER'S ATTACK DATA - Form V (Djem So)
// Overwhelming offensive pressure, high damage, forward momentum
// =============================================================================

/**
 * Light Attack Chain (3 hits)
 * Quick slashes with decent damage - Vader's basic attack chain
 */
export const LIGHT_ATTACK_1: AttackData = {
  id: 'light_1',
  name: 'Horizontal Slash',
  type: AttackType.LightAttack,
  damage: 50,
  startupMs: 80,
  activeMs: 100,
  recoveryMs: 120,
  hitbox: {
    offsetX: 40,
    offsetY: 0,
    width: 80,
    height: 40,
    direction: HitboxDirection.Forward,
  },
  knockback: 100,
  hitstun: 200,
  cancelInto: ['light_2', 'heavy_1', 'force_push'],
  movementX: 20,
};

export const LIGHT_ATTACK_2: AttackData = {
  id: 'light_2',
  name: 'Diagonal Slash',
  type: AttackType.LightAttack,
  damage: 55,
  startupMs: 60,
  activeMs: 100,
  recoveryMs: 150,
  hitbox: {
    offsetX: 50,
    offsetY: -10,
    width: 90,
    height: 50,
    direction: HitboxDirection.Forward,
  },
  knockback: 120,
  hitstun: 250,
  cancelInto: ['light_3', 'heavy_1', 'force_push'],
  movementX: 30,
};

export const LIGHT_ATTACK_3: AttackData = {
  id: 'light_3',
  name: 'Overhead Strike',
  type: AttackType.LightAttack,
  damage: 70,
  startupMs: 100,
  activeMs: 120,
  recoveryMs: 200,
  hitbox: {
    offsetX: 45,
    offsetY: -20,
    width: 70,
    height: 80,
    direction: HitboxDirection.Forward,
  },
  knockback: 200,
  hitstun: 400,
  cancelInto: ['force_push', 'force_pull'],
  movementX: 50,
};

/**
 * Heavy Attack Chain (2 hits)
 * Powerful strikes that deal massive damage
 */
export const HEAVY_ATTACK_1: AttackData = {
  id: 'heavy_1',
  name: 'Power Slash',
  type: AttackType.HeavyAttack,
  damage: 100,
  startupMs: 200,
  activeMs: 150,
  recoveryMs: 250,
  hitbox: {
    offsetX: 50,
    offsetY: 0,
    width: 100,
    height: 60,
    direction: HitboxDirection.Forward,
  },
  knockback: 250,
  hitstun: 500,
  cancelInto: ['heavy_2', 'force_push'],
  movementX: 40,
  chargeable: true,
  maxChargeMs: 1000,
  chargeMultiplier: 1.5,
};

export const HEAVY_ATTACK_2: AttackData = {
  id: 'heavy_2',
  name: 'Crushing Blow',
  type: AttackType.HeavyAttack,
  damage: 150,
  startupMs: 250,
  activeMs: 200,
  recoveryMs: 350,
  hitbox: {
    offsetX: 60,
    offsetY: 10,
    width: 120,
    height: 80,
    direction: HitboxDirection.Forward,
  },
  knockback: 350,
  hitstun: 700,
  cancelInto: ['force_push'],
  movementX: 60,
};

/**
 * Special Attacks
 */
export const RISING_STRIKE: AttackData = {
  id: 'rising_strike',
  name: 'Rising Strike',
  type: AttackType.Special,
  damage: 120,
  startupMs: 120,
  activeMs: 180,
  recoveryMs: 300,
  hitbox: {
    offsetX: 30,
    offsetY: -40,
    width: 80,
    height: 100,
    direction: HitboxDirection.Up,
  },
  knockback: 300,
  hitstun: 600,
  cancelInto: ['light_1', 'force_push'],
  movementX: 20,
  movementY: -150,
};

export const SABER_THROW: AttackData = {
  id: 'saber_throw',
  name: 'Saber Throw',
  type: AttackType.Special,
  damage: 80,
  startupMs: 200,
  activeMs: 500, // Projectile lifetime
  recoveryMs: 400,
  hitbox: {
    offsetX: 0,
    offsetY: 0,
    width: 40,
    height: 40,
    direction: HitboxDirection.Forward,
  },
  knockback: 150,
  hitstun: 400,
  cancelInto: [],
  forceCost: 15,
  multiHit: true,
  multiHitDelay: 200,
};

/**
 * Force Powers
 */
export const FORCE_PUSH: AttackData = {
  id: 'force_push',
  name: 'Force Push',
  type: AttackType.ForcePower,
  damage: 30,
  startupMs: 150,
  activeMs: 100,
  recoveryMs: 300,
  hitbox: {
    offsetX: 0,
    offsetY: 0,
    width: 200,
    height: 100,
    direction: HitboxDirection.Forward,
  },
  knockback: 400,
  hitstun: 500,
  cancelInto: [],
  forceCost: 25,
};

export const FORCE_PULL: AttackData = {
  id: 'force_pull',
  name: 'Force Pull',
  type: AttackType.ForcePower,
  damage: 20,
  startupMs: 200,
  activeMs: 150,
  recoveryMs: 250,
  hitbox: {
    offsetX: 100,
    offsetY: 0,
    width: 250,
    height: 80,
    direction: HitboxDirection.Forward,
  },
  knockback: -300, // Negative = pull
  hitstun: 600,
  cancelInto: ['light_1', 'heavy_1'],
  forceCost: 20,
};

export const FORCE_CHOKE: AttackData = {
  id: 'force_choke',
  name: 'Force Choke',
  type: AttackType.ForcePower,
  damage: 40,
  startupMs: 300,
  activeMs: 1500, // Sustained damage
  recoveryMs: 400,
  hitbox: {
    offsetX: 80,
    offsetY: 0,
    width: 60,
    height: 60,
    direction: HitboxDirection.Forward,
  },
  knockback: 0,
  hitstun: 2000,
  cancelInto: ['force_push'],
  forceCost: 40,
  multiHit: true,
  multiHitDelay: 300,
};

// =============================================================================
// ATTACK REGISTRY
// =============================================================================

/**
 * All registered attacks, keyed by ID.
 */
export const ATTACK_REGISTRY: Map<string, AttackData> = new Map([
  // Light attacks
  [LIGHT_ATTACK_1.id, LIGHT_ATTACK_1],
  [LIGHT_ATTACK_2.id, LIGHT_ATTACK_2],
  [LIGHT_ATTACK_3.id, LIGHT_ATTACK_3],
  // Heavy attacks
  [HEAVY_ATTACK_1.id, HEAVY_ATTACK_1],
  [HEAVY_ATTACK_2.id, HEAVY_ATTACK_2],
  // Specials
  [RISING_STRIKE.id, RISING_STRIKE],
  [SABER_THROW.id, SABER_THROW],
  // Force powers
  [FORCE_PUSH.id, FORCE_PUSH],
  [FORCE_PULL.id, FORCE_PULL],
  [FORCE_CHOKE.id, FORCE_CHOKE],
]);

/**
 * Get attack data by ID.
 */
export function getAttackData(attackId: string): AttackData | undefined {
  return ATTACK_REGISTRY.get(attackId);
}

/**
 * Get total attack duration (startup + active + recovery).
 */
export function getAttackDuration(attack: AttackData): number {
  return attack.startupMs + attack.activeMs + attack.recoveryMs;
}

/**
 * Get the current phase of an attack based on elapsed time.
 */
export function getAttackPhase(attack: AttackData, elapsedMs: number): AttackPhase | null {
  if (elapsedMs < attack.startupMs) {
    return AttackPhase.Startup;
  }
  if (elapsedMs < attack.startupMs + attack.activeMs) {
    return AttackPhase.Active;
  }
  if (elapsedMs < getAttackDuration(attack)) {
    return AttackPhase.Recovery;
  }
  return null; // Attack complete
}

/**
 * Check if attack can cancel into another attack.
 */
export function canCancelInto(currentAttack: AttackData, targetAttackId: string): boolean {
  return currentAttack.cancelInto.includes(targetAttackId);
}

/**
 * Light attack chain order.
 */
export const LIGHT_CHAIN = ['light_1', 'light_2', 'light_3'];

/**
 * Heavy attack chain order.
 */
export const HEAVY_CHAIN = ['heavy_1', 'heavy_2'];

/**
 * Get next attack in chain, or null if at end.
 */
export function getNextInChain(currentAttackId: string): string | null {
  const lightIndex = LIGHT_CHAIN.indexOf(currentAttackId);
  if (lightIndex !== -1 && lightIndex < LIGHT_CHAIN.length - 1) {
    return LIGHT_CHAIN[lightIndex + 1];
  }

  const heavyIndex = HEAVY_CHAIN.indexOf(currentAttackId);
  if (heavyIndex !== -1 && heavyIndex < HEAVY_CHAIN.length - 1) {
    return HEAVY_CHAIN[heavyIndex + 1];
  }

  return null;
}
