/**
 * Combo System - Tracks combos and manages attack chaining.
 * Supports input buffering and cancel windows.
 */

import {
  AttackData,
  LIGHT_CHAIN,
  HEAVY_CHAIN,
  getAttackData,
  getAttackPhase,
  getAttackDuration,
  AttackPhase,
  canCancelInto,
} from './AttackData';

/**
 * Combo state.
 */
export enum ComboState {
  /** No combo active */
  Idle = 'idle',
  /** Currently attacking */
  Attacking = 'attacking',
  /** In cancel window, can chain to next attack */
  CancelWindow = 'cancel_window',
  /** Combo dropped, cooling down */
  Dropped = 'dropped',
}

/**
 * Input for combo system.
 */
export interface ComboInput {
  /** Input type */
  type: 'light' | 'heavy' | 'special' | 'force';
  /** Direction modifier (up, down, forward, back) */
  direction?: 'up' | 'down' | 'forward' | 'back';
  /** Timestamp when input was received */
  timestamp: number;
}

/**
 * Combo system configuration.
 */
export interface ComboConfig {
  /** Time before combo drops after last hit (ms) */
  comboDropTime: number;
  /** Input buffer window (ms) */
  inputBufferWindow: number;
  /** Cancel window after active frames (ms) */
  cancelWindow: number;
}

const DEFAULT_CONFIG: ComboConfig = {
  comboDropTime: 3000, // Generous for power fantasy
  inputBufferWindow: 500,
  cancelWindow: 200,
};

/**
 * Combo system result when updating.
 */
export interface ComboUpdateResult {
  /** Current combo state */
  state: ComboState;
  /** Current combo count */
  comboCount: number;
  /** Current attack (if attacking) */
  currentAttack: AttackData | null;
  /** Time in current attack (ms) */
  attackTime: number;
  /** Current attack phase */
  attackPhase: AttackPhase | null;
  /** Whether a new attack started this frame */
  attackStarted: boolean;
  /** The attack that started (if attackStarted) */
  startedAttack: AttackData | null;
  /** Whether combo was dropped this frame */
  comboDropped: boolean;
  /** Whether in cancel window */
  canCancel: boolean;
}

/**
 * Combo System - manages attack chains and combo counting.
 */
export class ComboSystem {
  private config: ComboConfig;
  private state: ComboState = ComboState.Idle;
  private comboCount: number = 0;
  private currentAttack: AttackData | null = null;
  private attackStartTime: number = 0;
  private lastHitTime: number = 0;
  private inputBuffer: ComboInput[] = [];
  private chainPosition: Map<string, number> = new Map();

  constructor(config: Partial<ComboConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current combo count.
   */
  getComboCount(): number {
    return this.comboCount;
  }

  /**
   * Get current state.
   */
  getState(): ComboState {
    return this.state;
  }

  /**
   * Get current attack.
   */
  getCurrentAttack(): AttackData | null {
    return this.currentAttack;
  }

  /**
   * Buffer an input for processing.
   */
  bufferInput(input: ComboInput): void {
    // Only keep inputs within buffer window
    const now = Date.now();
    this.inputBuffer = this.inputBuffer.filter(
      (i) => now - i.timestamp < this.config.inputBufferWindow
    );
    this.inputBuffer.push(input);
  }

  /**
   * Process buffered inputs and get next attack to perform.
   */
  getNextAttack(): AttackData | null {
    if (this.inputBuffer.length === 0) {
      return null;
    }

    // Get oldest buffered input
    const input = this.inputBuffer[0];
    const now = Date.now();

    // Check if input is still valid
    if (now - input.timestamp > this.config.inputBufferWindow) {
      this.inputBuffer.shift();
      return this.getNextAttack();
    }

    // Determine which attack based on input and current state
    let attackId: string | null = null;

    if (this.state === ComboState.Idle || this.state === ComboState.Dropped) {
      // Start new combo
      attackId = this.getInitialAttack(input);
    } else if (this.state === ComboState.CancelWindow && this.currentAttack) {
      // Continue combo
      attackId = this.getChainAttack(input, this.currentAttack);
    } else if (this.state === ComboState.Attacking && this.currentAttack) {
      // Check if we can cancel current attack
      const attackTime = now - this.attackStartTime;
      const phase = getAttackPhase(this.currentAttack, attackTime);

      if (phase === AttackPhase.Active || phase === AttackPhase.Recovery) {
        attackId = this.getChainAttack(input, this.currentAttack);
      }
    }

    if (attackId) {
      this.inputBuffer.shift(); // Consume the input
      return getAttackData(attackId) ?? null;
    }

    return null;
  }

  /**
   * Start a new attack.
   */
  startAttack(attack: AttackData): void {
    this.currentAttack = attack;
    this.attackStartTime = Date.now();
    this.state = ComboState.Attacking;

    // Track position in chains
    const lightIndex = LIGHT_CHAIN.indexOf(attack.id);
    if (lightIndex !== -1) {
      this.chainPosition.set('light', lightIndex);
    }

    const heavyIndex = HEAVY_CHAIN.indexOf(attack.id);
    if (heavyIndex !== -1) {
      this.chainPosition.set('heavy', heavyIndex);
    }
  }

  /**
   * Register a hit connecting (increments combo).
   */
  registerHit(): void {
    this.comboCount++;
    this.lastHitTime = Date.now();
  }

  /**
   * Update the combo system.
   */
  update(currentTime: number): ComboUpdateResult {
    const result: ComboUpdateResult = {
      state: this.state,
      comboCount: this.comboCount,
      currentAttack: this.currentAttack,
      attackTime: 0,
      attackPhase: null,
      attackStarted: false,
      startedAttack: null,
      comboDropped: false,
      canCancel: false,
    };

    // Check for combo drop
    if (this.comboCount > 0 && currentTime - this.lastHitTime > this.config.comboDropTime) {
      this.dropCombo();
      result.comboDropped = true;
      result.comboCount = 0;
    }

    // Update attack state
    if (this.currentAttack && this.state === ComboState.Attacking) {
      const attackTime = currentTime - this.attackStartTime;
      const totalDuration = getAttackDuration(this.currentAttack);
      const phase = getAttackPhase(this.currentAttack, attackTime);

      result.attackTime = attackTime;
      result.attackPhase = phase;

      // Check if entering cancel window
      const cancelWindowStart = this.currentAttack.startupMs + this.currentAttack.activeMs;
      if (attackTime >= cancelWindowStart && attackTime < cancelWindowStart + this.config.cancelWindow) {
        this.state = ComboState.CancelWindow;
        result.canCancel = true;
      }

      // Check if attack completed
      if (attackTime >= totalDuration) {
        this.currentAttack = null;
        this.state = this.comboCount > 0 ? ComboState.CancelWindow : ComboState.Idle;
      }
    }

    // Check for cancel window expiry
    if (this.state === ComboState.CancelWindow) {
      result.canCancel = true;

      // Try to process buffered input
      const nextAttack = this.getNextAttack();
      if (nextAttack) {
        this.startAttack(nextAttack);
        result.attackStarted = true;
        result.startedAttack = nextAttack;
      }
    }

    result.state = this.state;
    result.currentAttack = this.currentAttack;

    return result;
  }

  /**
   * Drop the current combo.
   */
  dropCombo(): void {
    this.comboCount = 0;
    this.currentAttack = null;
    this.state = ComboState.Dropped;
    this.chainPosition.clear();

    // Brief cooldown before new combo
    setTimeout(() => {
      if (this.state === ComboState.Dropped) {
        this.state = ComboState.Idle;
      }
    }, 200);
  }

  /**
   * Reset the combo system.
   */
  reset(): void {
    this.state = ComboState.Idle;
    this.comboCount = 0;
    this.currentAttack = null;
    this.attackStartTime = 0;
    this.lastHitTime = 0;
    this.inputBuffer = [];
    this.chainPosition.clear();
  }

  /**
   * Get initial attack for a new combo.
   */
  private getInitialAttack(input: ComboInput): string | null {
    // Check for directional specials
    if (input.direction === 'up') {
      if (input.type === 'heavy') {
        return 'rising_strike';
      }
    }

    // Basic attacks
    switch (input.type) {
      case 'light':
        return LIGHT_CHAIN[0];
      case 'heavy':
        return HEAVY_CHAIN[0];
      case 'force':
        if (input.direction === 'back') {
          return 'force_pull';
        }
        return 'force_push';
      case 'special':
        return 'saber_throw';
      default:
        return null;
    }
  }

  /**
   * Get next attack in chain or cancel.
   */
  private getChainAttack(input: ComboInput, currentAttack: AttackData): string | null {
    // Check for directional specials (always available as cancels)
    if (input.direction === 'up' && input.type === 'heavy') {
      if (canCancelInto(currentAttack, 'rising_strike') || currentAttack.cancelInto.length === 0) {
        return 'rising_strike';
      }
    }

    // Force powers can always cancel
    if (input.type === 'force') {
      const forcePower = input.direction === 'back' ? 'force_pull' : 'force_push';
      if (canCancelInto(currentAttack, forcePower)) {
        return forcePower;
      }
    }

    // Chain attacks
    const lightPos = this.chainPosition.get('light') ?? -1;
    const heavyPos = this.chainPosition.get('heavy') ?? -1;

    if (input.type === 'light') {
      // Continue light chain if possible
      if (lightPos >= 0 && lightPos < LIGHT_CHAIN.length - 1) {
        const nextLight = LIGHT_CHAIN[lightPos + 1];
        if (canCancelInto(currentAttack, nextLight)) {
          return nextLight;
        }
      }
      // Start new light chain
      if (canCancelInto(currentAttack, LIGHT_CHAIN[0])) {
        return LIGHT_CHAIN[0];
      }
    }

    if (input.type === 'heavy') {
      // Continue heavy chain if possible
      if (heavyPos >= 0 && heavyPos < HEAVY_CHAIN.length - 1) {
        const nextHeavy = HEAVY_CHAIN[heavyPos + 1];
        if (canCancelInto(currentAttack, nextHeavy)) {
          return nextHeavy;
        }
      }
      // Start heavy chain from light
      if (canCancelInto(currentAttack, HEAVY_CHAIN[0])) {
        return HEAVY_CHAIN[0];
      }
    }

    return null;
  }
}
