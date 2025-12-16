/**
 * CinDrallig - Battlemaster of the Jedi Order
 *
 * The final boss of Temple March. Cin Drallig is the Jedi Temple's Chief of Security
 * and master of all seven lightsaber forms. He fights with dual green lightsabers
 * and adapts his fighting style based on the phase of the battle.
 *
 * Phase 1 (100%-66%): Form I Shii-Cho - Wide sweeping attacks, basic combos
 * Phase 2 (66%-33%): Form IV Ataru - Acrobatic leaps, fast combos, Force-enhanced strikes
 * Phase 3 (33%-0%): Form VII Juyo - Aggressive, unpredictable, desperate final stand
 *
 * Based on lore: "The deleted scene showing Drallig's full duel with Vader was deemed
 * too violent for theatrical release."
 */

import Phaser from 'phaser';
import { BaseEnemy, EnemyContext, AIBehavior } from './BaseEnemy';
import { EnemyType, EnemyState, EnemyConfig } from './EnemyTypes';
import { CombatManager } from '../../combat/CombatManager';
import { EventBus, GameEvent } from '../../core/events/EventBus';
import { EntityId } from '../../core/types';
import { Faction, CombatStats, DefenseType, createDefaultStats } from '../../combat/DamageCalculator';

/**
 * Cin Drallig's combat phases.
 */
export enum DralligPhase {
  /** Form I: Shii-Cho - "Way of the Sarlacc" - Basic, sweeping attacks */
  ShiiCho = 1,
  /** Form IV: Ataru - "Way of the Hawk-Bat" - Acrobatic, aggressive */
  Ataru = 2,
  /** Form VII: Juyo - "Way of the Vornskr" - Ferocious, unpredictable */
  Juyo = 3,
}

/**
 * Attack patterns for each form.
 */
export interface FormAttackPattern {
  /** Attack ID */
  id: string;
  /** Damage */
  damage: number;
  /** Range */
  range: number;
  /** Startup time (ms) */
  startup: number;
  /** Active frames (ms) */
  active: number;
  /** Recovery (ms) */
  recovery: number;
  /** Knockback force */
  knockback: number;
  /** Can be parried */
  parryable: boolean;
  /** Force cost (if any) */
  forceCost?: number;
  /** Special properties */
  properties?: string[];
}

/**
 * Cin Drallig configuration - extends base enemy config.
 */
export const CIN_DRALLIG_CONFIG: EnemyConfig = {
  type: EnemyType.JediMaster,
  displayName: 'Cin Drallig',
  faction: Faction.Boss,
  health: 3000,
  moveSpeed: 220,
  detectionRange: 500,
  attackRange: 80,
  preferredDistance: 60,
  attackCooldown: 400,
  attackDamage: 50,
  canBlock: true,
  blockChance: 0.8,
  canParry: true,
  parryWindow: 300,
  canUseForce: true,
  isRanged: false,
  projectileSpeed: 0,
  fireRate: 0,
  coordinatesWithGroup: false,
  spriteKey: 'cin_drallig',
  bodyWidth: 28,
  bodyHeight: 40,
};

/**
 * Form I: Shii-Cho attack patterns.
 * "Determination" - Wide sweeping attacks, effective against multiple opponents.
 */
const SHII_CHO_ATTACKS: FormAttackPattern[] = [
  {
    id: 'shii_cho_sweep',
    damage: 40,
    range: 90,
    startup: 300,
    active: 200,
    recovery: 400,
    knockback: 150,
    parryable: true,
    properties: ['wide_arc', 'hits_multiple'],
  },
  {
    id: 'shii_cho_thrust',
    damage: 35,
    range: 100,
    startup: 200,
    active: 150,
    recovery: 300,
    knockback: 100,
    parryable: true,
  },
  {
    id: 'shii_cho_overhead',
    damage: 55,
    range: 70,
    startup: 400,
    active: 200,
    recovery: 500,
    knockback: 200,
    parryable: true,
    properties: ['overhead', 'guard_break'],
  },
];

/**
 * Form IV: Ataru attack patterns.
 * "Aggression" - Acrobatic, Force-enhanced attacks.
 */
const ATARU_ATTACKS: FormAttackPattern[] = [
  {
    id: 'ataru_leap_strike',
    damage: 60,
    range: 150,
    startup: 500,
    active: 300,
    recovery: 400,
    knockback: 250,
    parryable: true,
    forceCost: 20,
    properties: ['leap', 'gap_closer', 'unblockable_landing'],
  },
  {
    id: 'ataru_spin_combo',
    damage: 45,
    range: 80,
    startup: 200,
    active: 400,
    recovery: 300,
    knockback: 100,
    parryable: false, // Too fast
    properties: ['multi_hit', 'spin'],
  },
  {
    id: 'ataru_rising_slash',
    damage: 50,
    range: 70,
    startup: 150,
    active: 200,
    recovery: 350,
    knockback: 180,
    parryable: true,
    forceCost: 15,
    properties: ['anti_air', 'launches'],
  },
  {
    id: 'ataru_force_dash',
    damage: 40,
    range: 200,
    startup: 100,
    active: 150,
    recovery: 300,
    knockback: 150,
    parryable: true,
    forceCost: 25,
    properties: ['dash', 'invulnerable_startup'],
  },
];

/**
 * Form VII: Juyo attack patterns.
 * "Ferocity" - Unpredictable, aggressive, desperate.
 */
const JUYO_ATTACKS: FormAttackPattern[] = [
  {
    id: 'juyo_frenzy',
    damage: 35,
    range: 70,
    startup: 100,
    active: 800,
    recovery: 600,
    knockback: 80,
    parryable: false,
    properties: ['multi_hit', 'frenzy', 'interruptible'],
  },
  {
    id: 'juyo_feint_strike',
    damage: 65,
    range: 90,
    startup: 400,
    active: 150,
    recovery: 300,
    knockback: 200,
    parryable: true,
    properties: ['feint', 'delayed'],
  },
  {
    id: 'juyo_double_saber_slam',
    damage: 80,
    range: 100,
    startup: 600,
    active: 300,
    recovery: 700,
    knockback: 300,
    parryable: true,
    properties: ['dual_wield', 'ground_slam', 'aoe'],
  },
  {
    id: 'juyo_desperation',
    damage: 100,
    range: 150,
    startup: 800,
    active: 400,
    recovery: 1000,
    knockback: 400,
    parryable: false,
    forceCost: 50,
    properties: ['super_attack', 'full_screen', 'unblockable'],
  },
];

/**
 * Cin Drallig Boss Class.
 */
export class CinDrallig extends BaseEnemy {
  // Boss-specific state
  private currentPhase: DralligPhase = DralligPhase.ShiiCho;
  private bossForce: number = 200;
  private maxBossForce: number = 200;
  private comboCount: number = 0;
  private maxComboLength: number = 3;
  private lastAttackPattern: string | null = null;

  // Phase-specific timers
  private phaseTransitionTime: number = 0;
  private isInPhaseTransition: boolean = false;
  private enrageTimer: number = 0;
  private enrageThreshold: number = 60000; // 60 seconds before enrage

  // Summon tracking
  private summonedApprentices: EntityId[] = [];
  private canSummon: boolean = true;
  private summonCooldown: number = 0;

  // Special move cooldowns
  private specialCooldowns: Map<string, number> = new Map();

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    combatManager: CombatManager,
    eventBus: EventBus
  ) {
    super(scene, x, y, EnemyType.JediMaster, combatManager, eventBus);

    // Override config with Drallig specifics
    this.stats.health = CIN_DRALLIG_CONFIG.health;
    this.stats.maxHealth = CIN_DRALLIG_CONFIG.health;

    // Setup boss-specific state machine
    this.setupBossStateMachine();

    // Setup event listeners
    this.setupBossEvents();
  }

  /**
   * Get current combat phase.
   */
  getCurrentPhase(): DralligPhase {
    return this.currentPhase;
  }

  /**
   * Get boss Force energy.
   */
  getBossForce(): number {
    return this.bossForce;
  }

  /**
   * Setup boss-specific state machine overrides.
   */
  private setupBossStateMachine(): void {
    // Add phase transition state
    // The base state machine is already set up in BaseEnemy
    // We'll handle phase transitions in the update loop
  }

  /**
   * Setup boss-specific event listeners.
   */
  private setupBossEvents(): void {
    this.eventBus.on('combat:feedback', (event: GameEvent) => {
      const data = event.data as { defenderId: EntityId; damage: number };
      if (data.defenderId === this.id) {
        this.onBossDamaged(data.damage);
      }
    });
  }

  /**
   * Handle boss taking damage.
   */
  private onBossDamaged(damage: number): void {
    // Check for phase transition
    const healthPercent = this.stats.health / this.stats.maxHealth;

    if (healthPercent <= 0.33 && this.currentPhase !== DralligPhase.Juyo) {
      this.transitionToPhase(DralligPhase.Juyo);
    } else if (healthPercent <= 0.66 && this.currentPhase === DralligPhase.ShiiCho) {
      this.transitionToPhase(DralligPhase.Ataru);
    }
  }

  /**
   * Transition to a new combat phase.
   */
  private transitionToPhase(newPhase: DralligPhase): void {
    const oldPhase = this.currentPhase;
    this.currentPhase = newPhase;
    this.isInPhaseTransition = true;
    this.phaseTransitionTime = 1500; // 1.5 second transition

    // Emit phase transition event
    this.eventBus.emit({
      type: 'boss:phase_transition',
      data: {
        bossId: this.id,
        bossName: CIN_DRALLIG_CONFIG.displayName,
        oldPhase,
        newPhase,
        healthPercent: this.stats.health / this.stats.maxHealth,
      },
    });

    // Apply phase-specific buffs
    this.applyPhaseBuffs(newPhase);

    // Visual feedback
    this.sprite.setTint(this.getPhaseColor(newPhase));
    this.scene.time.delayedCall(1500, () => {
      this.sprite.clearTint();
      this.isInPhaseTransition = false;
    });
  }

  /**
   * Apply buffs based on current phase.
   */
  private applyPhaseBuffs(phase: DralligPhase): void {
    switch (phase) {
      case DralligPhase.Ataru:
        // Increased speed and aggression
        this.config.moveSpeed = 280;
        this.config.attackCooldown = 300;
        this.maxComboLength = 4;
        break;
      case DralligPhase.Juyo:
        // Maximum aggression, reduced defense
        this.config.moveSpeed = 320;
        this.config.attackCooldown = 200;
        this.config.blockChance = 0.4;
        this.maxComboLength = 6;
        // Summon apprentices
        if (this.canSummon) {
          this.summonApprentices();
        }
        break;
    }
  }

  /**
   * Get phase color for visual feedback.
   */
  private getPhaseColor(phase: DralligPhase): number {
    switch (phase) {
      case DralligPhase.ShiiCho:
        return 0x44ff44; // Green
      case DralligPhase.Ataru:
        return 0x88ff88; // Bright green
      case DralligPhase.Juyo:
        return 0xff8844; // Orange
      default:
        return 0x44ff44;
    }
  }

  /**
   * Summon apprentice padawans (Whie and Bene style).
   */
  private summonApprentices(): void {
    this.canSummon = false;
    this.summonCooldown = 30000; // 30 second cooldown

    this.eventBus.emit({
      type: 'boss:summon_apprentices',
      data: {
        bossId: this.id,
        position: this.getPosition(),
        count: 2, // Whie and Bene
      },
    });
  }

  /**
   * Override update for boss-specific logic.
   */
  update(deltaMs: number): void {
    if (!this.isActive) return;

    // Phase transition handling
    if (this.isInPhaseTransition) {
      this.phaseTransitionTime -= deltaMs;
      if (this.phaseTransitionTime <= 0) {
        this.isInPhaseTransition = false;
      }
      return; // Don't act during transition
    }

    // Enrage timer
    this.enrageTimer += deltaMs;
    if (this.enrageTimer >= this.enrageThreshold) {
      this.applyEnrage();
    }

    // Force regeneration
    this.regenerateBossForce(deltaMs);

    // Update cooldowns
    this.updateCooldowns(deltaMs);

    // Summon cooldown
    if (!this.canSummon && this.summonCooldown > 0) {
      this.summonCooldown -= deltaMs;
      if (this.summonCooldown <= 0) {
        this.canSummon = true;
      }
    }

    // Base update
    super.update(deltaMs);
  }

  /**
   * Regenerate boss Force energy.
   */
  private regenerateBossForce(deltaMs: number): void {
    const regenRate = 15; // Force per second
    this.bossForce = Math.min(this.maxBossForce, this.bossForce + (regenRate * deltaMs) / 1000);
  }

  /**
   * Update special move cooldowns.
   */
  private updateCooldowns(deltaMs: number): void {
    for (const [key, cooldown] of this.specialCooldowns) {
      const newCooldown = cooldown - deltaMs;
      if (newCooldown <= 0) {
        this.specialCooldowns.delete(key);
      } else {
        this.specialCooldowns.set(key, newCooldown);
      }
    }
  }

  /**
   * Apply enrage when fight takes too long.
   */
  private applyEnrage(): void {
    if (this.stats.health > this.stats.maxHealth * 0.1) {
      // Only enrage once
      this.enrageThreshold = Infinity;

      this.eventBus.emit({
        type: 'boss:enrage',
        data: {
          bossId: this.id,
          bossName: CIN_DRALLIG_CONFIG.displayName,
        },
      });

      // Massive stat boost
      this.config.attackDamage *= 1.5;
      this.config.moveSpeed *= 1.3;
      this.config.attackCooldown *= 0.5;

      // Visual feedback
      this.sprite.setTint(0xff0000);
    }
  }

  /**
   * Get available attacks based on current phase.
   */
  getAvailableAttacks(): string[] {
    const attacks = this.getCurrentPhaseAttacks();
    return attacks
      .filter((attack) => {
        // Check Force cost
        if (attack.forceCost && attack.forceCost > this.bossForce) {
          return false;
        }
        // Check cooldown
        if (this.specialCooldowns.has(attack.id)) {
          return false;
        }
        // Don't repeat same attack in combo
        if (attack.id === this.lastAttackPattern && this.comboCount < this.maxComboLength) {
          return false;
        }
        return true;
      })
      .map((attack) => attack.id);
  }

  /**
   * Get attacks for current phase.
   */
  private getCurrentPhaseAttacks(): FormAttackPattern[] {
    switch (this.currentPhase) {
      case DralligPhase.ShiiCho:
        return SHII_CHO_ATTACKS;
      case DralligPhase.Ataru:
        return ATARU_ATTACKS;
      case DralligPhase.Juyo:
        return JUYO_ATTACKS;
      default:
        return SHII_CHO_ATTACKS;
    }
  }

  /**
   * Perform attack implementation.
   */
  performAttack(): void {
    const availableAttacks = this.getAvailableAttacks();
    if (availableAttacks.length === 0) {
      // Reset combo if no attacks available
      this.comboCount = 0;
      this.lastAttackPattern = null;
      return;
    }

    // Weight attack selection based on distance and situation
    const attack = this.selectBestAttack(availableAttacks);
    if (!attack) return;

    const pattern = this.getCurrentPhaseAttacks().find((p) => p.id === attack);
    if (!pattern) return;

    // Face target
    this.faceTarget();

    // Consume Force if needed
    if (pattern.forceCost) {
      this.bossForce -= pattern.forceCost;
    }

    // Set cooldown for special moves
    if (pattern.properties?.includes('super_attack') || pattern.properties?.includes('leap')) {
      this.specialCooldowns.set(pattern.id, 10000); // 10 second cooldown
    }

    // Start attack via combat manager
    if (this.combatManager.startAttack(this.id, pattern.id)) {
      this.currentAttackId = pattern.id;
      this.lastAttackPattern = pattern.id;
      this.comboCount++;

      // Emit attack event
      this.eventBus.emit({
        type: 'boss:attack',
        data: {
          bossId: this.id,
          attackId: pattern.id,
          phase: this.currentPhase,
          damage: pattern.damage,
          properties: pattern.properties,
        },
      });
    }
  }

  /**
   * Select the best attack based on situation.
   */
  private selectBestAttack(available: string[]): string | null {
    if (available.length === 0) return null;

    const distance = this.getDistanceToTarget();
    const patterns = this.getCurrentPhaseAttacks().filter((p) => available.includes(p.id));

    // Prioritize gap closers when far
    if (distance > 150) {
      const gapClosers = patterns.filter((p) => p.properties?.includes('gap_closer') || p.properties?.includes('dash'));
      if (gapClosers.length > 0) {
        return gapClosers[Math.floor(Math.random() * gapClosers.length)].id;
      }
    }

    // Prioritize AoE when close
    if (distance < 60) {
      const aoeAttacks = patterns.filter(
        (p) => p.properties?.includes('aoe') || p.properties?.includes('wide_arc')
      );
      if (aoeAttacks.length > 0 && Math.random() < 0.4) {
        return aoeAttacks[Math.floor(Math.random() * aoeAttacks.length)].id;
      }
    }

    // Use super attack in Juyo phase at low health
    if (this.currentPhase === DralligPhase.Juyo && this.stats.health < this.stats.maxHealth * 0.2) {
      const superAttack = patterns.find((p) => p.properties?.includes('super_attack'));
      if (superAttack && Math.random() < 0.3) {
        return superAttack.id;
      }
    }

    // Random weighted selection
    return patterns[Math.floor(Math.random() * patterns.length)].id;
  }

  /**
   * Override block behavior for boss.
   */
  protected shouldBlock(): boolean {
    if (!this.config.canBlock) return false;

    // Higher block chance based on phase
    let blockChance = this.config.blockChance;
    if (this.currentPhase === DralligPhase.ShiiCho) {
      blockChance = 0.7; // Defensive form
    } else if (this.currentPhase === DralligPhase.Juyo) {
      blockChance = 0.3; // Aggressive, less blocking
    }

    return Math.random() < blockChance;
  }

  /**
   * Override parry for boss.
   */
  protected shouldParry(): boolean {
    if (!this.config.canParry) return false;

    // Cin Drallig has excellent parry timing
    const blockTime = Date.now() - this.blockStartTime;
    const parryWindow = this.currentPhase === DralligPhase.ShiiCho ? 250 : 150;

    return blockTime <= parryWindow;
  }

  /**
   * Get boss info for UI.
   */
  getBossInfo(): {
    name: string;
    title: string;
    health: number;
    maxHealth: number;
    phase: DralligPhase;
    force: number;
    maxForce: number;
  } {
    return {
      name: 'CIN DRALLIG',
      title: 'Battlemaster of the Jedi Order',
      health: this.stats.health,
      maxHealth: this.stats.maxHealth,
      phase: this.currentPhase,
      force: this.bossForce,
      maxForce: this.maxBossForce,
    };
  }

  /**
   * Death handling for boss.
   */
  die(): void {
    if (this.isDying) return;
    this.isDying = true;

    this.eventBus.emit({
      type: 'boss:defeated',
      data: {
        bossId: this.id,
        bossName: CIN_DRALLIG_CONFIG.displayName,
        fightDuration: this.enrageTimer,
      },
    });

    // Dramatic death sequence
    this.sprite.setTint(0xffffff);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scaleX: 0,
      scaleY: 2,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        super.die();
      },
    });
  }
}

/**
 * Factory function to create Cin Drallig.
 */
export function createCinDrallig(
  scene: Phaser.Scene,
  x: number,
  y: number,
  combatManager: CombatManager,
  eventBus: EventBus
): CinDrallig {
  return new CinDrallig(scene, x, y, combatManager, eventBus);
}
