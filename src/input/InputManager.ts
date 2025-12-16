/**
 * Input Manager - Handles all player input with buffering.
 * Supports keyboard, gamepad, and input buffering for combos.
 */

import Phaser from 'phaser';
import { InputMappings, DEFAULT_KEYBOARD_MAPPINGS, InputAction, DirectionInput } from './InputMappings';
import { ComboInput } from '../combat/ComboSystem';

/**
 * Input state snapshot.
 */
export interface InputState {
  /** Movement direction */
  movement: DirectionInput;
  /** Whether attack light was just pressed */
  attackLight: boolean;
  /** Whether attack heavy was just pressed */
  attackHeavy: boolean;
  /** Whether force push was just pressed */
  forcePush: boolean;
  /** Whether force pull was just pressed */
  forcePull: boolean;
  /** Whether dodge was just pressed */
  dodge: boolean;
  /** Whether block is held */
  block: boolean;
  /** Whether special was just pressed */
  special: boolean;
  /** Whether pause was just pressed */
  pause: boolean;
  /** Raw directional inputs */
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/**
 * Buffered input for combo system.
 */
interface BufferedInput {
  action: InputAction;
  direction: DirectionInput;
  timestamp: number;
}

/**
 * Input Manager configuration.
 */
export interface InputManagerConfig {
  /** Input buffer window in ms */
  bufferWindowMs: number;
  /** Deadzone for analog sticks */
  analogDeadzone: number;
}

const DEFAULT_CONFIG: InputManagerConfig = {
  bufferWindowMs: 500,
  analogDeadzone: 0.2,
};

/**
 * Input Manager - centralized input handling with buffering.
 */
export class InputManager {
  private scene: Phaser.Scene;
  private config: InputManagerConfig;
  private mappings: InputMappings;

  // Input keys
  private keys: Map<string, Phaser.Input.Keyboard.Key> = new Map();

  // Input state
  private currentState: InputState;
  private previousState: InputState;

  // Input buffer
  private inputBuffer: BufferedInput[] = [];

  // Gamepad
  private gamepad: Phaser.Input.Gamepad.Gamepad | null = null;

  constructor(scene: Phaser.Scene, config: Partial<InputManagerConfig> = {}) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.mappings = DEFAULT_KEYBOARD_MAPPINGS;

    this.currentState = this.createEmptyState();
    this.previousState = this.createEmptyState();

    this.setupKeyboard();
    this.setupGamepad();
  }

  /**
   * Get current input state.
   */
  getState(): InputState {
    return { ...this.currentState };
  }

  /**
   * Get direction facing (for attacks).
   */
  getFacingDirection(): 'left' | 'right' | 'neutral' {
    if (this.currentState.right) return 'right';
    if (this.currentState.left) return 'left';
    return 'neutral';
  }

  /**
   * Get combo input from current state.
   */
  getComboInput(): ComboInput | null {
    const now = Date.now();

    // Determine input type
    let type: 'light' | 'heavy' | 'special' | 'force' | null = null;

    if (this.currentState.attackLight) {
      type = 'light';
    } else if (this.currentState.attackHeavy) {
      type = 'heavy';
    } else if (this.currentState.forcePush || this.currentState.forcePull) {
      type = 'force';
    } else if (this.currentState.special) {
      type = 'special';
    }

    if (!type) return null;

    // Determine direction modifier
    let direction: 'up' | 'down' | 'forward' | 'back' | undefined;
    if (this.currentState.up) {
      direction = 'up';
    } else if (this.currentState.down) {
      direction = 'down';
    } else if (this.currentState.forcePull) {
      direction = 'back'; // Force pull uses back direction
    }

    return {
      type,
      direction,
      timestamp: now,
    };
  }

  /**
   * Get and consume buffered inputs.
   */
  getBufferedInputs(): ComboInput[] {
    const now = Date.now();

    // Filter out expired inputs
    this.inputBuffer = this.inputBuffer.filter(
      (input) => now - input.timestamp < this.config.bufferWindowMs
    );

    // Convert to combo inputs
    const comboInputs: ComboInput[] = this.inputBuffer.map((input) => ({
      type: this.actionToComboType(input.action),
      direction: this.directionToComboDirection(input.direction),
      timestamp: input.timestamp,
    }));

    // Clear buffer
    this.inputBuffer = [];

    return comboInputs;
  }

  /**
   * Update input state - call every frame.
   */
  update(): void {
    // Store previous state
    this.previousState = { ...this.currentState };

    // Read new state
    this.currentState = this.readInputState();

    // Buffer new inputs
    this.bufferNewInputs();
  }

  /**
   * Check if action was just pressed this frame.
   */
  justPressed(action: InputAction): boolean {
    const key = this.keys.get(action);
    if (key) {
      return Phaser.Input.Keyboard.JustDown(key);
    }
    return false;
  }

  /**
   * Check if action is currently held.
   */
  isHeld(action: InputAction): boolean {
    const key = this.keys.get(action);
    return key?.isDown ?? false;
  }

  /**
   * Check if action was just released this frame.
   */
  justReleased(action: InputAction): boolean {
    const key = this.keys.get(action);
    if (key) {
      return Phaser.Input.Keyboard.JustUp(key);
    }
    return false;
  }

  /**
   * Destroy and clean up.
   */
  destroy(): void {
    this.keys.clear();
    this.inputBuffer = [];
  }

  /**
   * Set up keyboard input.
   */
  private setupKeyboard(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) return;

    // Create keys for all mappings
    for (const [action, keyCode] of Object.entries(this.mappings)) {
      const key = keyboard.addKey(keyCode);
      this.keys.set(action, key);
    }
  }

  /**
   * Set up gamepad input.
   */
  private setupGamepad(): void {
    this.scene.input.gamepad?.on('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
      this.gamepad = pad;
      console.log('Gamepad connected:', pad.id);
    });

    this.scene.input.gamepad?.on('disconnected', () => {
      this.gamepad = null;
      console.log('Gamepad disconnected');
    });

    // Check for already connected gamepad
    if (this.scene.input.gamepad?.total && this.scene.input.gamepad.total > 0) {
      this.gamepad = this.scene.input.gamepad.getPad(0);
    }
  }

  /**
   * Read current input state from all sources.
   */
  private readInputState(): InputState {
    const state = this.createEmptyState();

    // Read keyboard
    state.up = this.isHeld('moveUp');
    state.down = this.isHeld('moveDown');
    state.left = this.isHeld('moveLeft');
    state.right = this.isHeld('moveRight');

    state.attackLight = this.justPressed('attackLight');
    state.attackHeavy = this.justPressed('attackHeavy');
    state.forcePush = this.justPressed('forcePush');
    state.forcePull = this.justPressed('forcePull');
    state.dodge = this.justPressed('dodge');
    state.block = this.isHeld('block');
    state.special = this.justPressed('special');
    state.pause = this.justPressed('pause');

    // Calculate movement direction
    state.movement = this.calculateMovementDirection(state);

    // Read gamepad (if connected)
    if (this.gamepad) {
      this.readGamepadState(state);
    }

    return state;
  }

  /**
   * Read gamepad state into InputState.
   */
  private readGamepadState(state: InputState): void {
    if (!this.gamepad) return;

    // Left stick for movement
    const leftX = this.gamepad.leftStick.x;
    const leftY = this.gamepad.leftStick.y;

    if (Math.abs(leftX) > this.config.analogDeadzone) {
      state.left = leftX < -this.config.analogDeadzone;
      state.right = leftX > this.config.analogDeadzone;
    }

    if (Math.abs(leftY) > this.config.analogDeadzone) {
      state.up = leftY < -this.config.analogDeadzone;
      state.down = leftY > this.config.analogDeadzone;
    }

    // D-pad
    state.up = state.up || this.gamepad.up;
    state.down = state.down || this.gamepad.down;
    state.left = state.left || this.gamepad.left;
    state.right = state.right || this.gamepad.right;

    // Buttons
    // X/Square = Light attack
    // Y/Triangle = Heavy attack
    // A/Cross = Dodge
    // B/Circle = Force Push
    // LB/L1 = Block
    // RB/R1 = Force Pull
    // LT/L2 = Special
    state.attackLight = state.attackLight || !!this.gamepad.X;
    state.attackHeavy = state.attackHeavy || !!this.gamepad.Y;
    state.dodge = state.dodge || !!this.gamepad.A;
    state.forcePush = state.forcePush || !!this.gamepad.B;
    state.block = state.block || !!this.gamepad.L1;
    state.forcePull = state.forcePull || !!this.gamepad.R1;
    state.special = state.special || this.gamepad.L2 > 0.5;
    state.pause = state.pause || !!this.gamepad.buttons[9]?.pressed; // Start button

    // Recalculate movement
    state.movement = this.calculateMovementDirection(state);
  }

  /**
   * Calculate movement direction from directional inputs.
   */
  private calculateMovementDirection(state: InputState): DirectionInput {
    if (!state.up && !state.down && !state.left && !state.right) {
      return DirectionInput.None;
    }

    if (state.up && state.right) return DirectionInput.UpRight;
    if (state.up && state.left) return DirectionInput.UpLeft;
    if (state.down && state.right) return DirectionInput.DownRight;
    if (state.down && state.left) return DirectionInput.DownLeft;
    if (state.up) return DirectionInput.Up;
    if (state.down) return DirectionInput.Down;
    if (state.left) return DirectionInput.Left;
    if (state.right) return DirectionInput.Right;

    return DirectionInput.None;
  }

  /**
   * Buffer new inputs that were pressed this frame.
   */
  private bufferNewInputs(): void {
    const now = Date.now();
    const direction = this.currentState.movement;

    if (this.currentState.attackLight) {
      this.inputBuffer.push({ action: 'attackLight', direction, timestamp: now });
    }
    if (this.currentState.attackHeavy) {
      this.inputBuffer.push({ action: 'attackHeavy', direction, timestamp: now });
    }
    if (this.currentState.forcePush) {
      this.inputBuffer.push({ action: 'forcePush', direction, timestamp: now });
    }
    if (this.currentState.forcePull) {
      this.inputBuffer.push({ action: 'forcePull', direction, timestamp: now });
    }
    if (this.currentState.dodge) {
      this.inputBuffer.push({ action: 'dodge', direction, timestamp: now });
    }
    if (this.currentState.special) {
      this.inputBuffer.push({ action: 'special', direction, timestamp: now });
    }
  }

  /**
   * Create empty input state.
   */
  private createEmptyState(): InputState {
    return {
      movement: DirectionInput.None,
      attackLight: false,
      attackHeavy: false,
      forcePush: false,
      forcePull: false,
      dodge: false,
      block: false,
      special: false,
      pause: false,
      up: false,
      down: false,
      left: false,
      right: false,
    };
  }

  /**
   * Convert InputAction to combo input type.
   */
  private actionToComboType(action: InputAction): 'light' | 'heavy' | 'special' | 'force' {
    switch (action) {
      case 'attackLight':
        return 'light';
      case 'attackHeavy':
        return 'heavy';
      case 'forcePush':
      case 'forcePull':
        return 'force';
      default:
        return 'special';
    }
  }

  /**
   * Convert DirectionInput to combo direction.
   */
  private directionToComboDirection(
    direction: DirectionInput
  ): 'up' | 'down' | 'forward' | 'back' | undefined {
    switch (direction) {
      case DirectionInput.Up:
      case DirectionInput.UpLeft:
      case DirectionInput.UpRight:
        return 'up';
      case DirectionInput.Down:
      case DirectionInput.DownLeft:
      case DirectionInput.DownRight:
        return 'down';
      default:
        return undefined;
    }
  }
}
