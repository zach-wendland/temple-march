/**
 * Temple Area Configuration
 * Defines the full Jedi Temple level progression for Operation Knightfall.
 *
 * Level Flow:
 * 1. Temple Entrance - The March begins
 * 2. Main Halls - Clone trooper squads, initial resistance
 * 3. Training Grounds - Jedi Defenders and Temple Guards
 * 4. Archives - Narrow corridors, Jedi Knights
 * 5. Council Chamber - Final boss: Cin Drallig
 *
 * Based on lore: "Operation Knightfall was executed in four phases:
 * Breach, Systematic Purge, Beacon Manipulation, Completion"
 */

import { EnemyType } from '../entities/enemies/EnemyTypes';

/**
 * Extended area configuration for temple levels.
 * Includes all gameplay-specific configuration beyond base AreaConfig.
 */
export interface TempleAreaConfig {
  id: string;
  displayName: string;
  tilemapKey: string;
  tilesetKey: string;
  width: number;
  height: number;
  spawnPoints: Record<string, { x: number; y: number }>;
  transitions: Array<{
    targetArea: string;
    triggerZone: { x: number; y: number; width: number; height: number };
    targetSpawn: string;
  }>;
  checkpoints: Array<{
    id: string;
    position: { x: number; y: number };
    name: string;
  }>;
  musicTrack?: string;
  ambientSounds?: string[];
  bossArena?: BossArenaConfig;
}

/**
 * Temple area identifiers.
 */
export enum TempleArea {
  Entrance = 'temple_entrance',
  MainHalls = 'temple_halls',
  TrainingGrounds = 'training_grounds',
  Archives = 'temple_archives',
  CouncilChamber = 'council_chamber',
}

/**
 * Enemy wave configuration.
 */
export interface EnemyWave {
  /** Wave identifier */
  id: string;
  /** Enemies to spawn */
  enemies: Array<{
    type: EnemyType;
    x: number;
    y: number;
    patrol?: { x: number; y: number }[];
  }>;
  /** Trigger type */
  trigger: 'immediate' | 'position' | 'clear_previous' | 'timer';
  /** Trigger value (position or timer in ms) */
  triggerValue?: { x?: number; y?: number; time?: number };
  /** Wave name for UI */
  displayName?: string;
}

/**
 * Boss arena configuration.
 */
export interface BossArenaConfig {
  /** Arena bounds */
  bounds: { x: number; y: number; width: number; height: number };
  /** Boss spawn position */
  bossSpawn: { x: number; y: number };
  /** Player entry position */
  playerEntry: { x: number; y: number };
  /** Locked door positions */
  lockedDoors: { x: number; y: number; width: number; height: number }[];
  /** Phase-specific hazards or spawns */
  phaseEvents?: {
    phase: number;
    event: 'spawn_adds' | 'activate_hazard' | 'dialogue';
    data: Record<string, unknown>;
  }[];
}

/**
 * Temple Entrance configuration.
 * The March begins here - Vader leads the 501st through the Temple gates.
 */
export const TEMPLE_ENTRANCE_CONFIG: TempleAreaConfig = {
  id: TempleArea.Entrance,
  displayName: 'Temple Entrance',
  tilemapKey: 'temple_entrance_map',
  tilesetKey: 'temple_tileset',
  width: 2560,
  height: 720,
  spawnPoints: {
    default: { x: 100, y: 360 },
    from_halls: { x: 2400, y: 360 },
  },
  transitions: [
    {
      targetArea: TempleArea.MainHalls,
      triggerZone: { x: 2500, y: 200, width: 60, height: 320 },
      targetSpawn: 'from_entrance',
    },
  ],
  checkpoints: [
    {
      id: 'entrance_start',
      position: { x: 200, y: 360 },
      name: 'Temple Gates',
    },
    {
      id: 'entrance_mid',
      position: { x: 1280, y: 360 },
      name: 'Processional Way',
    },
  ],
  musicTrack: 'march_theme',
  ambientSounds: ['distant_blasters', 'clone_march'],
};

/**
 * Main Halls configuration.
 * Wide corridors with Clone Trooper squads.
 */
export const MAIN_HALLS_CONFIG: TempleAreaConfig = {
  id: TempleArea.MainHalls,
  displayName: 'Main Halls',
  tilemapKey: 'temple_halls_map',
  tilesetKey: 'temple_tileset',
  width: 3200,
  height: 720,
  spawnPoints: {
    default: { x: 100, y: 360 },
    from_entrance: { x: 100, y: 360 },
    from_training: { x: 3100, y: 360 },
  },
  transitions: [
    {
      targetArea: TempleArea.Entrance,
      triggerZone: { x: 0, y: 200, width: 60, height: 320 },
      targetSpawn: 'from_halls',
    },
    {
      targetArea: TempleArea.TrainingGrounds,
      triggerZone: { x: 3140, y: 200, width: 60, height: 320 },
      targetSpawn: 'from_halls',
    },
  ],
  checkpoints: [
    {
      id: 'halls_start',
      position: { x: 200, y: 360 },
      name: 'Great Hall',
    },
    {
      id: 'halls_mid',
      position: { x: 1600, y: 360 },
      name: 'Central Corridor',
    },
  ],
  musicTrack: 'combat_theme_1',
  ambientSounds: ['temple_ambience', 'distant_fighting'],
};

/**
 * Training Grounds configuration.
 * Jedi Defenders make their stand here.
 */
export const TRAINING_GROUNDS_CONFIG: TempleAreaConfig = {
  id: TempleArea.TrainingGrounds,
  displayName: 'Training Grounds',
  tilemapKey: 'training_grounds_map',
  tilesetKey: 'temple_tileset',
  width: 2560,
  height: 720,
  spawnPoints: {
    default: { x: 100, y: 360 },
    from_halls: { x: 100, y: 360 },
    from_archives: { x: 2400, y: 360 },
  },
  transitions: [
    {
      targetArea: TempleArea.MainHalls,
      triggerZone: { x: 0, y: 200, width: 60, height: 320 },
      targetSpawn: 'from_training',
    },
    {
      targetArea: TempleArea.Archives,
      triggerZone: { x: 2500, y: 200, width: 60, height: 320 },
      targetSpawn: 'from_training',
    },
  ],
  checkpoints: [
    {
      id: 'training_start',
      position: { x: 200, y: 360 },
      name: 'Dojo Entrance',
    },
    {
      id: 'training_arena',
      position: { x: 1280, y: 360 },
      name: 'Sparring Arena',
    },
  ],
  musicTrack: 'combat_theme_2',
  ambientSounds: ['lightsaber_hums', 'training_sounds'],
};

/**
 * Archives configuration.
 * Narrow corridors with towering shelves.
 */
export const ARCHIVES_CONFIG: TempleAreaConfig = {
  id: TempleArea.Archives,
  displayName: 'Jedi Archives',
  tilemapKey: 'archives_map',
  tilesetKey: 'temple_tileset',
  width: 3840,
  height: 720,
  spawnPoints: {
    default: { x: 100, y: 360 },
    from_training: { x: 100, y: 360 },
    from_council: { x: 3700, y: 360 },
  },
  transitions: [
    {
      targetArea: TempleArea.TrainingGrounds,
      triggerZone: { x: 0, y: 200, width: 60, height: 320 },
      targetSpawn: 'from_archives',
    },
    {
      targetArea: TempleArea.CouncilChamber,
      triggerZone: { x: 3780, y: 200, width: 60, height: 320 },
      targetSpawn: 'from_archives',
    },
  ],
  checkpoints: [
    {
      id: 'archives_start',
      position: { x: 200, y: 360 },
      name: 'Archive Entrance',
    },
    {
      id: 'archives_mid',
      position: { x: 1920, y: 360 },
      name: 'Central Stacks',
    },
    {
      id: 'archives_end',
      position: { x: 3600, y: 360 },
      name: 'Archive Exit',
    },
  ],
  musicTrack: 'tension_theme',
  ambientSounds: ['archive_whispers', 'holocron_hum'],
};

/**
 * Council Chamber configuration.
 * Final boss arena - Cin Drallig awaits.
 */
export const COUNCIL_CHAMBER_CONFIG: TempleAreaConfig = {
  id: TempleArea.CouncilChamber,
  displayName: 'High Council Chamber',
  tilemapKey: 'council_chamber_map',
  tilesetKey: 'temple_tileset',
  width: 1280,
  height: 720,
  spawnPoints: {
    default: { x: 640, y: 600 },
    from_archives: { x: 640, y: 600 },
  },
  transitions: [
    {
      targetArea: TempleArea.Archives,
      triggerZone: { x: 560, y: 680, width: 160, height: 40 },
      targetSpawn: 'from_council',
    },
  ],
  checkpoints: [
    {
      id: 'council_entrance',
      position: { x: 640, y: 550 },
      name: 'Council Chamber',
    },
  ],
  musicTrack: 'boss_theme',
  ambientSounds: ['wind', 'coruscant_traffic'],
};

/**
 * Boss arena configuration for Cin Drallig fight.
 */
export const DRALLIG_ARENA_CONFIG: BossArenaConfig = {
  bounds: {
    x: 100,
    y: 100,
    width: 1080,
    height: 520,
  },
  bossSpawn: {
    x: 640,
    y: 200,
  },
  playerEntry: {
    x: 640,
    y: 550,
  },
  lockedDoors: [
    { x: 560, y: 620, width: 160, height: 40 }, // Entry door locks behind player
  ],
  phaseEvents: [
    {
      phase: 2,
      event: 'dialogue',
      data: {
        speaker: 'Cin Drallig',
        text: 'You were the Chosen One, Anakin! How could you betray us?',
      },
    },
    {
      phase: 3,
      event: 'spawn_adds',
      data: {
        enemyType: EnemyType.JediDefender,
        count: 2,
        spawnPositions: [
          { x: 200, y: 300 },
          { x: 1080, y: 300 },
        ],
      },
    },
  ],
};

/**
 * Enemy wave configurations for each area.
 */
export const ENTRANCE_WAVES: EnemyWave[] = [
  {
    id: 'entrance_wave_1',
    displayName: 'Temple Defenders',
    trigger: 'position',
    triggerValue: { x: 400 },
    enemies: [
      { type: EnemyType.JediDefender, x: 600, y: 300 },
      { type: EnemyType.JediDefender, x: 650, y: 420 },
    ],
  },
  {
    id: 'entrance_wave_2',
    displayName: 'Temple Guards',
    trigger: 'position',
    triggerValue: { x: 1000 },
    enemies: [
      { type: EnemyType.TempleGuard, x: 1200, y: 360 },
    ],
  },
  {
    id: 'entrance_wave_3',
    displayName: 'Reinforcements',
    trigger: 'position',
    triggerValue: { x: 1800 },
    enemies: [
      { type: EnemyType.JediDefender, x: 2000, y: 280 },
      { type: EnemyType.JediDefender, x: 2050, y: 360 },
      { type: EnemyType.JediDefender, x: 2000, y: 440 },
    ],
  },
];

export const HALLS_WAVES: EnemyWave[] = [
  {
    id: 'halls_wave_1',
    displayName: 'Jedi Patrol',
    trigger: 'immediate',
    enemies: [
      {
        type: EnemyType.JediDefender,
        x: 400,
        y: 360,
        patrol: [
          { x: 400, y: 360 },
          { x: 800, y: 360 },
        ],
      },
    ],
  },
  {
    id: 'halls_wave_2',
    displayName: 'Temple Guards',
    trigger: 'position',
    triggerValue: { x: 1000 },
    enemies: [
      { type: EnemyType.TempleGuard, x: 1300, y: 300 },
      { type: EnemyType.TempleGuard, x: 1300, y: 420 },
    ],
  },
  {
    id: 'halls_wave_3',
    displayName: 'Jedi Knights',
    trigger: 'clear_previous',
    enemies: [
      { type: EnemyType.JediDefender, x: 1800, y: 280 },
      { type: EnemyType.JediDefender, x: 1900, y: 360 },
      { type: EnemyType.JediDefender, x: 1800, y: 440 },
    ],
  },
  {
    id: 'halls_wave_4',
    displayName: 'Elite Guards',
    trigger: 'position',
    triggerValue: { x: 2400 },
    enemies: [
      { type: EnemyType.TempleGuard, x: 2700, y: 360 },
      { type: EnemyType.JediDefender, x: 2600, y: 280 },
      { type: EnemyType.JediDefender, x: 2600, y: 440 },
    ],
  },
];

export const TRAINING_WAVES: EnemyWave[] = [
  {
    id: 'training_wave_1',
    displayName: 'Sparring Masters',
    trigger: 'position',
    triggerValue: { x: 500 },
    enemies: [
      { type: EnemyType.JediDefender, x: 700, y: 360 },
      { type: EnemyType.JediDefender, x: 800, y: 360 },
    ],
  },
  {
    id: 'training_wave_2',
    displayName: 'Dojo Defense',
    trigger: 'clear_previous',
    enemies: [
      { type: EnemyType.TempleGuard, x: 1100, y: 360 },
      { type: EnemyType.JediDefender, x: 1000, y: 280 },
      { type: EnemyType.JediDefender, x: 1000, y: 440 },
      { type: EnemyType.JediDefender, x: 1200, y: 280 },
      { type: EnemyType.JediDefender, x: 1200, y: 440 },
    ],
  },
  {
    id: 'training_wave_3',
    displayName: 'Last Stand',
    trigger: 'position',
    triggerValue: { x: 1800 },
    enemies: [
      { type: EnemyType.TempleGuard, x: 2000, y: 300 },
      { type: EnemyType.TempleGuard, x: 2000, y: 420 },
      { type: EnemyType.JediDefender, x: 2100, y: 360 },
    ],
  },
];

export const ARCHIVES_WAVES: EnemyWave[] = [
  {
    id: 'archives_wave_1',
    displayName: 'Archive Guards',
    trigger: 'immediate',
    enemies: [
      { type: EnemyType.JediDefender, x: 500, y: 360 },
    ],
  },
  {
    id: 'archives_wave_2',
    displayName: 'Hidden Defenders',
    trigger: 'position',
    triggerValue: { x: 1000 },
    enemies: [
      { type: EnemyType.JediDefender, x: 1200, y: 280 },
      { type: EnemyType.JediDefender, x: 1400, y: 440 },
    ],
  },
  {
    id: 'archives_wave_3',
    displayName: 'Central Stacks',
    trigger: 'position',
    triggerValue: { x: 1800 },
    enemies: [
      { type: EnemyType.TempleGuard, x: 2000, y: 360 },
      { type: EnemyType.JediDefender, x: 2100, y: 280 },
      { type: EnemyType.JediDefender, x: 2100, y: 440 },
    ],
  },
  {
    id: 'archives_wave_4',
    displayName: 'Final Defense',
    trigger: 'position',
    triggerValue: { x: 2800 },
    enemies: [
      { type: EnemyType.TempleGuard, x: 3000, y: 300 },
      { type: EnemyType.TempleGuard, x: 3000, y: 420 },
      { type: EnemyType.JediDefender, x: 3200, y: 360 },
      { type: EnemyType.JediDefender, x: 3300, y: 280 },
      { type: EnemyType.JediDefender, x: 3300, y: 440 },
    ],
  },
];

/**
 * Get all area configurations.
 */
export function getAllAreaConfigs(): TempleAreaConfig[] {
  return [
    TEMPLE_ENTRANCE_CONFIG,
    MAIN_HALLS_CONFIG,
    TRAINING_GROUNDS_CONFIG,
    ARCHIVES_CONFIG,
    COUNCIL_CHAMBER_CONFIG,
  ];
}

/**
 * Get area config by ID.
 */
export function getAreaConfig(areaId: string): TempleAreaConfig | undefined {
  return getAllAreaConfigs().find((config) => config.id === areaId);
}

/**
 * Get enemy waves for an area.
 */
export function getAreaWaves(areaId: string): EnemyWave[] {
  switch (areaId) {
    case TempleArea.Entrance:
      return ENTRANCE_WAVES;
    case TempleArea.MainHalls:
      return HALLS_WAVES;
    case TempleArea.TrainingGrounds:
      return TRAINING_WAVES;
    case TempleArea.Archives:
      return ARCHIVES_WAVES;
    default:
      return [];
  }
}

/**
 * Get area progression order.
 */
export function getAreaOrder(): TempleArea[] {
  return [
    TempleArea.Entrance,
    TempleArea.MainHalls,
    TempleArea.TrainingGrounds,
    TempleArea.Archives,
    TempleArea.CouncilChamber,
  ];
}

/**
 * Check if area is boss area.
 */
export function isBossArea(areaId: string): boolean {
  return areaId === TempleArea.CouncilChamber;
}
