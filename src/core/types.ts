/**
 * Core type definitions for the Temple March 2D game engine.
 * Optimized for Phaser.js + p5.js architecture.
 */

/** Unique identifier for entities */
export type EntityId = number;

/** Unique identifier for component types */
export type ComponentType = string;

/** Timestamp in milliseconds */
export type Timestamp = number;

/** 2D Vector representation */
export interface Vector2 {
  x: number;
  y: number;
}

/** Rectangle for collision/bounds */
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Circle for collision */
export interface Circle {
  x: number;
  y: number;
  radius: number;
}

/** Game time context passed to systems */
export interface GameTime {
  /** Total elapsed time since game start (ms) */
  total: Timestamp;
  /** Delta time since last frame (ms) */
  delta: number;
  /** Current frame number */
  frame: number;
}

/** Base interface for all components */
export interface IComponent {
  /** Type identifier for the component */
  readonly type: ComponentType;
  /** Whether the component is currently active */
  enabled: boolean;
}

/** Base interface for all systems */
export interface ISystem {
  /** Unique name of the system */
  readonly name: string;
  /** Priority for update order (lower = earlier) */
  readonly priority: number;
  /** Whether the system is currently active */
  enabled: boolean;
  /** Called each frame to update entities */
  update(time: GameTime): void;
  /** Called when system is added to the world */
  onAdd?(): void;
  /** Called when system is removed from the world */
  onRemove?(): void;
}

/** Entity tag for categorization */
export type EntityTag =
  | 'player'
  | 'enemy'
  | 'ally'
  | 'projectile'
  | 'effect'
  | 'pickup'
  | 'obstacle'
  | 'trigger';

/** Layers for rendering (Phaser depth) */
export enum Layer {
  Background = 0,
  Terrain = 10,
  Effects = 20,
  Allies = 25,
  Entities = 30,
  Projectiles = 40,
  Player = 50,
  ForegroundEffects = 60,
  UI = 100,
}

/** Collision groups for Phaser Arcade Physics */
export enum CollisionGroup {
  None = 0,
  Player = 1 << 0,
  Enemy = 1 << 1,
  Ally = 1 << 2,
  PlayerProjectile = 1 << 3,
  EnemyProjectile = 1 << 4,
  Terrain = 1 << 5,
  Trigger = 1 << 6,
}

/** Direction enum for facing/movement */
export enum Direction {
  None = 0,
  Up = 1,
  Down = 2,
  Left = 4,
  Right = 8,
  UpLeft = Up | Left,
  UpRight = Up | Right,
  DownLeft = Down | Left,
  DownRight = Down | Right,
}

/** Damage types for combat calculations */
export enum DamageType {
  Physical = 'physical',
  Force = 'force',
  Fire = 'fire',
  Lightning = 'lightning',
  Blaster = 'blaster',
}

/** Result of a damage calculation */
export interface DamageResult {
  /** Final damage after modifiers */
  finalDamage: number;
  /** Whether the attack was blocked */
  blocked: boolean;
  /** Whether the attack was a critical hit */
  critical: boolean;
  /** Whether the target was killed */
  lethal: boolean;
  /** Knockback direction and magnitude */
  knockback?: Vector2;
}

/** Combat state for characters */
export enum CombatState {
  Idle = 'idle',
  Moving = 'moving',
  Attacking = 'attacking',
  Blocking = 'blocking',
  Dodging = 'dodging',
  Hitstun = 'hitstun',
  Dead = 'dead',
}

/** Force power types */
export enum ForcePower {
  Push = 'push',
  Pull = 'pull',
  Lightning = 'lightning',
  Choke = 'choke',
}

/** Character faction */
export enum Faction {
  Empire = 'empire',
  Jedi = 'jedi',
  Neutral = 'neutral',
}

/** Phaser scene keys */
export enum SceneKey {
  Boot = 'BootScene',
  MainMenu = 'MainMenuScene',
  Game = 'GameScene',
  UI = 'UIScene',
  Pause = 'PauseScene',
  // Temple levels
  Senate = 'SenateScene',
  Streets = 'StreetsScene',
  Staircase = 'StaircaseScene',
  Interior = 'InteriorScene',
  Council = 'CouncilScene',
}
