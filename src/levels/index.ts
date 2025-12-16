/**
 * Level Systems Module Index
 * Phase 4: Temple Levels
 *
 * Exports all level-related systems for Temple March.
 */

// Tilemap Management
export { TilemapManager, TILEMAP_LAYER_CONFIG } from './TilemapManager';
export type {
  TilemapLayerConfig,
  TilemapObjectType,
  TilemapObject,
  TilemapLoadResult,
  TileProperty,
} from './TilemapManager';

// Level Management
export { LevelManager, TEMPLE_AREAS, DEFAULT_TRANSITION } from './LevelManager';
export type {
  AreaConfig,
  TransitionConfig,
  LevelState,
} from './LevelManager';

// Checkpoint System
export { CheckpointSystem, DEFAULT_CHECKPOINT_CONFIG } from './CheckpointSystem';
export type {
  CheckpointData,
  CheckpointConfig,
  LevelStateSnapshot,
} from './CheckpointSystem';

// Interactive Objects
export { InteractiveObject } from './InteractiveObject';
export type {
  InteractiveObjectType,
  InteractiveObjectConfig,
  InteractionResult,
} from './InteractiveObject';

// Destructibles
export { Destructible, createDestructible, DESTRUCTIBLE_DEFAULTS } from './Destructible';
export type {
  DestructibleType,
  DestructibleConfig,
  LootDrop,
} from './Destructible';

// Pickups
export { Pickup, createPickup, PICKUP_DEFAULTS } from './Pickup';
export type {
  PickupType,
  PickupConfig,
} from './Pickup';

// Temple Area Configuration
export {
  TempleArea,
  TEMPLE_ENTRANCE_CONFIG,
  MAIN_HALLS_CONFIG,
  TRAINING_GROUNDS_CONFIG,
  ARCHIVES_CONFIG,
  COUNCIL_CHAMBER_CONFIG,
  DRALLIG_ARENA_CONFIG,
  ENTRANCE_WAVES,
  HALLS_WAVES,
  TRAINING_WAVES,
  ARCHIVES_WAVES,
  getAllAreaConfigs,
  getAreaConfig,
  getAreaWaves,
  getAreaOrder,
  isBossArea,
} from './TempleAreaConfig';
export type {
  EnemyWave,
  BossArenaConfig,
} from './TempleAreaConfig';

// Boss Encounter System
export {
  BossEncounter,
  BossEncounterState,
} from './BossEncounter';
export type {
  BossEncounterEvents,
} from './BossEncounter';
