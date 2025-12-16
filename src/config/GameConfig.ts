/**
 * Phaser Game Configuration
 * Core settings for the Temple March game engine.
 */

import Phaser from 'phaser';
import { SceneKey } from '../core/types';

/** Game dimensions */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Physics configuration */
export const PHYSICS_CONFIG: Phaser.Types.Physics.Arcade.ArcadeWorldConfig = {
  gravity: { x: 0, y: 0 }, // Top-down or side-scroller with manual gravity
  debug: import.meta.env.DEV,
};

/** Main Phaser game configuration */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#000000',
  pixelArt: true,
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: PHYSICS_CONFIG,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    keyboard: true,
    gamepad: true,
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  render: {
    antialias: false,
    pixelArt: true,
  },
  // Scenes will be added dynamically
  scene: [],
};

/** Scene transition configurations */
export interface SceneTransitionConfig {
  duration: number;
  fadeColor: number;
}

export const SCENE_TRANSITIONS: Record<string, SceneTransitionConfig> = {
  default: { duration: 500, fadeColor: 0x000000 },
  dramatic: { duration: 1000, fadeColor: 0x000000 },
  quick: { duration: 250, fadeColor: 0x000000 },
};

/** Temple scene configurations */
export interface TempleSceneConfig {
  key: SceneKey;
  displayName: string;
  quote: string;
  ambientColor: number;
  fogDensity: number;
}

export const TEMPLE_SCENES: TempleSceneConfig[] = [
  {
    key: SceneKey.Senate,
    displayName: 'Senate Chamber',
    quote: '"Henceforth, you shall be known as Darth... Vader."',
    ambientColor: 0x8b0000,
    fogDensity: 0.3,
  },
  {
    key: SceneKey.Streets,
    displayName: 'Coruscant Streets',
    quote: '"Execute Order 66."',
    ambientColor: 0x0a1628,
    fogDensity: 0.2,
  },
  {
    key: SceneKey.Staircase,
    displayName: 'Temple Staircase',
    quote: '"The time has come..."',
    ambientColor: 0x2d1b4e,
    fogDensity: 0.1,
  },
  {
    key: SceneKey.Interior,
    displayName: 'Temple Interior',
    quote: '"...there are too many of them."',
    ambientColor: 0xd4a574,
    fogDensity: 0.4,
  },
  {
    key: SceneKey.Council,
    displayName: 'Council Chamber',
    quote: '"What have I done?"',
    ambientColor: 0x4a4a4a,
    fogDensity: 0.5,
  },
];

/** Player configuration */
export const PLAYER_CONFIG = {
  /** Health and combat */
  maxHealth: 1000,
  maxForce: 100,
  forceRegenRate: 5, // per second

  /** Movement */
  moveSpeed: 200,
  dashSpeed: 400,
  dashDuration: 200, // ms
  dashCooldown: 500, // ms
  dodgeCooldown: 600, // ms

  /** Combat (Vader power fantasy - overwhelming) */
  lightAttackDamage: 50,
  heavyAttackDamage: 100,
  criticalMultiplier: 2.0,
  criticalChance: 0.15,

  /** Form V - Djem So characteristics */
  counterAttackWindow: 300, // ms after successful block
  counterAttackDamage: 150,
  blockDamageReduction: 0.9,

  /** Force powers */
  forcePushCost: 20,
  forcePushDamage: 30,
  forcePushKnockback: 300,
  forcePullCost: 15,
  forceLightningCost: 40,
  forceLightningDamage: 80,
};

/** Enemy configurations */
export const ENEMY_CONFIG = {
  jediDefender: {
    health: 100,
    damage: 15,
    moveSpeed: 150,
    attackRange: 50,
    blockChance: 0.3,
  },
  templeGuard: {
    health: 150,
    damage: 20,
    moveSpeed: 120,
    attackRange: 80, // Pike has longer range
    blockChance: 0.4,
  },
  jediMaster: {
    health: 300,
    damage: 30,
    moveSpeed: 180,
    attackRange: 60,
    blockChance: 0.5,
    canUseForce: true,
  },
};

/** Ally (Clone Trooper) configuration */
export const ALLY_CONFIG = {
  cloneTrooper: {
    health: 50,
    damage: 10,
    moveSpeed: 140,
    fireRate: 500, // ms between shots
    followDistance: 100,
  },
  commanderAppo: {
    health: 100,
    damage: 15,
    moveSpeed: 160,
    fireRate: 400,
    followDistance: 80,
    providesBuffs: true,
  },
};
