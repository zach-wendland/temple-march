/**
 * Configuration Module Index
 * Central export for all game configuration.
 */

// Core game configuration
export {
  GAME_WIDTH,
  GAME_HEIGHT,
  PHYSICS_CONFIG,
  gameConfig,
  SCENE_TRANSITIONS,
  TEMPLE_SCENES,
  PLAYER_CONFIG,
  ENEMY_CONFIG,
  ALLY_CONFIG,
} from './GameConfig';
export type {
  SceneTransitionConfig,
  TempleSceneConfig,
} from './GameConfig';

// Balance configuration
export {
  PLAYER_BALANCE,
  ENEMY_BALANCE,
  BOSS_BALANCE,
  COMBAT_FEEL,
  PROGRESSION,
  DifficultyLevel,
  DIFFICULTY_MODIFIERS,
  BalanceManager,
  calculateFinalDamage,
  getKnockback,
  getHitStop,
  getScreenShake,
} from './BalanceConfig';
