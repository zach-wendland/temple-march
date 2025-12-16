/**
 * Input Mappings - Key bindings and input action definitions.
 */

import Phaser from 'phaser';

/**
 * All available input actions.
 */
export type InputAction =
  | 'moveUp'
  | 'moveDown'
  | 'moveLeft'
  | 'moveRight'
  | 'attackLight'
  | 'attackHeavy'
  | 'forcePush'
  | 'forcePull'
  | 'dodge'
  | 'block'
  | 'special'
  | 'pause'
  | 'interact';

/**
 * Direction input enum.
 */
export enum DirectionInput {
  None = 'none',
  Up = 'up',
  Down = 'down',
  Left = 'left',
  Right = 'right',
  UpLeft = 'up_left',
  UpRight = 'up_right',
  DownLeft = 'down_left',
  DownRight = 'down_right',
}

/**
 * Input mappings type - maps actions to key codes.
 */
export type InputMappings = Record<InputAction, number>;

/**
 * Default keyboard mappings.
 *
 * Movement: WASD
 * Attacks: J (light), K (heavy)
 * Force: F (push), G (pull)
 * Dodge: Space
 * Block: L
 * Special: H
 * Pause: Escape
 */
export const DEFAULT_KEYBOARD_MAPPINGS: InputMappings = {
  // Movement
  moveUp: Phaser.Input.Keyboard.KeyCodes.W,
  moveDown: Phaser.Input.Keyboard.KeyCodes.S,
  moveLeft: Phaser.Input.Keyboard.KeyCodes.A,
  moveRight: Phaser.Input.Keyboard.KeyCodes.D,

  // Combat
  attackLight: Phaser.Input.Keyboard.KeyCodes.J,
  attackHeavy: Phaser.Input.Keyboard.KeyCodes.K,
  forcePush: Phaser.Input.Keyboard.KeyCodes.F,
  forcePull: Phaser.Input.Keyboard.KeyCodes.G,
  dodge: Phaser.Input.Keyboard.KeyCodes.SPACE,
  block: Phaser.Input.Keyboard.KeyCodes.L,
  special: Phaser.Input.Keyboard.KeyCodes.H,

  // System
  pause: Phaser.Input.Keyboard.KeyCodes.ESC,
  interact: Phaser.Input.Keyboard.KeyCodes.E,
};

/**
 * Alternative keyboard mappings (Arrow keys + ZXCV).
 */
export const ALTERNATIVE_KEYBOARD_MAPPINGS: InputMappings = {
  // Movement
  moveUp: Phaser.Input.Keyboard.KeyCodes.UP,
  moveDown: Phaser.Input.Keyboard.KeyCodes.DOWN,
  moveLeft: Phaser.Input.Keyboard.KeyCodes.LEFT,
  moveRight: Phaser.Input.Keyboard.KeyCodes.RIGHT,

  // Combat
  attackLight: Phaser.Input.Keyboard.KeyCodes.Z,
  attackHeavy: Phaser.Input.Keyboard.KeyCodes.X,
  forcePush: Phaser.Input.Keyboard.KeyCodes.C,
  forcePull: Phaser.Input.Keyboard.KeyCodes.V,
  dodge: Phaser.Input.Keyboard.KeyCodes.SHIFT,
  block: Phaser.Input.Keyboard.KeyCodes.CTRL,
  special: Phaser.Input.Keyboard.KeyCodes.A,

  // System
  pause: Phaser.Input.Keyboard.KeyCodes.ESC,
  interact: Phaser.Input.Keyboard.KeyCodes.ENTER,
};

/**
 * Gamepad button mappings (Xbox layout).
 */
export const GAMEPAD_MAPPINGS = {
  // Face buttons
  attackLight: 2, // X
  attackHeavy: 3, // Y
  dodge: 0, // A
  forcePush: 1, // B

  // Shoulders
  block: 4, // LB
  forcePull: 5, // RB
  special: 6, // LT (analog, handled specially)

  // System
  pause: 9, // Start

  // D-pad (handled separately)
  dpadUp: 12,
  dpadDown: 13,
  dpadLeft: 14,
  dpadRight: 15,
};

/**
 * Get human-readable key name for display.
 */
export function getKeyDisplayName(keyCode: number): string {
  const keyNames: Record<number, string> = {
    [Phaser.Input.Keyboard.KeyCodes.W]: 'W',
    [Phaser.Input.Keyboard.KeyCodes.A]: 'A',
    [Phaser.Input.Keyboard.KeyCodes.S]: 'S',
    [Phaser.Input.Keyboard.KeyCodes.D]: 'D',
    [Phaser.Input.Keyboard.KeyCodes.J]: 'J',
    [Phaser.Input.Keyboard.KeyCodes.K]: 'K',
    [Phaser.Input.Keyboard.KeyCodes.L]: 'L',
    [Phaser.Input.Keyboard.KeyCodes.F]: 'F',
    [Phaser.Input.Keyboard.KeyCodes.G]: 'G',
    [Phaser.Input.Keyboard.KeyCodes.H]: 'H',
    [Phaser.Input.Keyboard.KeyCodes.E]: 'E',
    [Phaser.Input.Keyboard.KeyCodes.SPACE]: 'Space',
    [Phaser.Input.Keyboard.KeyCodes.ESC]: 'Esc',
    [Phaser.Input.Keyboard.KeyCodes.SHIFT]: 'Shift',
    [Phaser.Input.Keyboard.KeyCodes.CTRL]: 'Ctrl',
    [Phaser.Input.Keyboard.KeyCodes.UP]: '↑',
    [Phaser.Input.Keyboard.KeyCodes.DOWN]: '↓',
    [Phaser.Input.Keyboard.KeyCodes.LEFT]: '←',
    [Phaser.Input.Keyboard.KeyCodes.RIGHT]: '→',
    [Phaser.Input.Keyboard.KeyCodes.Z]: 'Z',
    [Phaser.Input.Keyboard.KeyCodes.X]: 'X',
    [Phaser.Input.Keyboard.KeyCodes.C]: 'C',
    [Phaser.Input.Keyboard.KeyCodes.V]: 'V',
    [Phaser.Input.Keyboard.KeyCodes.ENTER]: 'Enter',
  };

  return keyNames[keyCode] ?? `Key ${keyCode}`;
}

/**
 * Get action display name.
 */
export function getActionDisplayName(action: InputAction): string {
  const actionNames: Record<InputAction, string> = {
    moveUp: 'Move Up',
    moveDown: 'Move Down',
    moveLeft: 'Move Left',
    moveRight: 'Move Right',
    attackLight: 'Light Attack',
    attackHeavy: 'Heavy Attack',
    forcePush: 'Force Push',
    forcePull: 'Force Pull',
    dodge: 'Dodge',
    block: 'Block',
    special: 'Special',
    pause: 'Pause',
    interact: 'Interact',
  };

  return actionNames[action];
}

/**
 * Generate controls display string.
 */
export function getControlsDisplayString(mappings: InputMappings): string {
  const lines: string[] = [
    `${getKeyDisplayName(mappings.moveUp)}${getKeyDisplayName(mappings.moveLeft)}${getKeyDisplayName(mappings.moveDown)}${getKeyDisplayName(mappings.moveRight)}: Move`,
    `${getKeyDisplayName(mappings.attackLight)}: Light Attack`,
    `${getKeyDisplayName(mappings.attackHeavy)}: Heavy Attack`,
    `${getKeyDisplayName(mappings.forcePush)}: Force Push`,
    `${getKeyDisplayName(mappings.forcePull)}: Force Pull`,
    `${getKeyDisplayName(mappings.dodge)}: Dodge`,
    `${getKeyDisplayName(mappings.block)}: Block`,
    `${getKeyDisplayName(mappings.pause)}: Pause`,
  ];

  return lines.join(' | ');
}
