/**
 * TilemapGuide - Configuration and documentation for Tiled map creation.
 * Phase 4: Temple Levels
 *
 * This file provides the structure for creating temple levels in Tiled Map Editor.
 * Export maps as JSON with embedded tilesets.
 */

import { Layer } from '../core/types';

/**
 * Tilemap Layer Structure for Temple Levels.
 *
 * Layers should be created in Tiled with these exact names.
 */
export const TILEMAP_LAYERS = {
  // Visual layers (bottom to top)
  background: {
    zIndex: Layer.Background,
    collision: false,
    notes: 'Distant background elements, parallax (temple exterior, sky)',
  },
  floor: {
    zIndex: Layer.Terrain,
    collision: false,
    notes: 'Floor tiles, carpets, grates, meditation circles',
  },
  walls: {
    zIndex: Layer.Terrain + 5,
    collision: true,
    notes: 'Collidable walls, pillars, obstacles',
  },
  wallsUpper: {
    zIndex: Layer.UI - 10,
    collision: false,
    notes: 'Wall tops that player walks behind (depth illusion)',
  },
  decorations: {
    zIndex: Layer.Terrain + 2,
    collision: false,
    notes: 'Props, consoles, debris, holocrons',
  },
  decorationsUpper: {
    zIndex: Layer.UI - 10,
    collision: false,
    notes: 'Overhanging decorations (chandeliers, banners)',
  },

  // Object layers (not rendered, contain spawners/triggers)
  objects: {
    notes: 'Spawn points, triggers, transitions',
    objectTypes: [
      'player_spawn',
      'enemy_spawn',
      'trigger_zone',
      'area_transition',
      'pickup_spawn',
      'checkpoint',
      'destructible',
    ],
  },

  // Collision layer (invisible, for complex shapes)
  collision: {
    notes: 'Additional collision shapes for complex geometry',
  },
};

/**
 * Tile Properties for Tiled.
 *
 * Set these as custom properties on tiles in the tileset.
 */
export const TILE_PROPERTIES = {
  collides: {
    type: 'bool',
    default: false,
    notes: 'Whether tile blocks movement',
  },
  friction: {
    type: 'float',
    default: 1.0,
    notes: 'Surface friction (ice = 0.1, normal = 1.0)',
  },
  damaging: {
    type: 'bool',
    default: false,
    notes: 'Whether tile damages player',
  },
  damageType: {
    type: 'string',
    default: 'physical',
    notes: 'Type of damage if damaging (physical, fire, lightning)',
  },
  sound: {
    type: 'string',
    default: '',
    notes: 'Footstep sound category (stone, metal, carpet)',
  },
};

/**
 * Object Properties for Tiled.
 *
 * Set these as custom properties on objects in object layers.
 */
export const OBJECT_PROPERTIES = {
  // Player spawn
  player_spawn: {
    // No additional properties needed, just position
  },

  // Enemy spawn
  enemy_spawn: {
    enemyType: {
      type: 'string',
      required: true,
      options: ['jedi_defender', 'temple_guard', 'clone_trooper', 'jedi_master'],
      notes: 'Type of enemy to spawn',
    },
    patrolPoints: {
      type: 'string',
      required: false,
      notes: 'Comma-separated patrol point names (e.g., "patrol_1,patrol_2")',
    },
    squadId: {
      type: 'string',
      required: false,
      notes: 'Squad ID for coordinated AI behavior',
    },
  },

  // Checkpoint
  checkpoint: {
    checkpointId: {
      type: 'string',
      required: true,
      notes: 'Unique identifier for this checkpoint',
    },
    displayName: {
      type: 'string',
      required: false,
      notes: 'Name shown when checkpoint is reached',
    },
  },

  // Area transition
  area_transition: {
    targetArea: {
      type: 'string',
      required: true,
      notes: 'Key of the target area (e.g., "archives", "council_chamber")',
    },
    targetSpawn: {
      type: 'string',
      required: false,
      default: 'default',
      notes: 'Name of spawn point in target area',
    },
    fadeColor: {
      type: 'color',
      required: false,
      default: '#000000',
      notes: 'Color for transition fade',
    },
  },

  // Pickup spawn
  pickup_spawn: {
    pickupType: {
      type: 'string',
      required: true,
      options: ['health', 'force', 'health_large', 'force_large', 'combo_extender'],
      notes: 'Type of pickup to spawn',
    },
    value: {
      type: 'int',
      required: false,
      notes: 'Override default value for pickup',
    },
    respawns: {
      type: 'bool',
      required: false,
      default: false,
      notes: 'Whether pickup respawns after collection',
    },
    respawnTime: {
      type: 'int',
      required: false,
      default: 30000,
      notes: 'Time in ms before respawn',
    },
  },

  // Destructible
  destructible: {
    destructibleType: {
      type: 'string',
      required: true,
      options: [
        'crate',
        'pillar',
        'console',
        'statue',
        'barrel',
        'holotable',
        'archive_shelf',
        'training_dummy',
      ],
      notes: 'Type of destructible object',
    },
    health: {
      type: 'int',
      required: false,
      notes: 'Override default health for destructible',
    },
  },

  // Trigger zone (for events, cutscenes)
  trigger_zone: {
    triggerId: {
      type: 'string',
      required: true,
      notes: 'Unique identifier for this trigger',
    },
    triggerType: {
      type: 'string',
      required: true,
      options: ['cutscene', 'dialogue', 'spawn_wave', 'lock_area', 'unlock_area'],
      notes: 'What type of event to trigger',
    },
    repeatable: {
      type: 'bool',
      required: false,
      default: false,
      notes: 'Whether trigger can fire multiple times',
    },
  },
};

/**
 * Sample Tilemap JSON Structure.
 *
 * This shows the expected format when exporting from Tiled.
 */
export const SAMPLE_TILEMAP_STRUCTURE = {
  tiledversion: '1.10.2',
  type: 'map',
  width: 40,
  height: 22,
  tilewidth: 32,
  tileheight: 32,
  layers: [
    {
      name: 'background',
      type: 'tilelayer',
      // ... tile data
    },
    {
      name: 'floor',
      type: 'tilelayer',
      // ... tile data
    },
    {
      name: 'walls',
      type: 'tilelayer',
      // ... tile data
    },
    {
      name: 'decorations',
      type: 'tilelayer',
      // ... tile data
    },
    {
      name: 'objects',
      type: 'objectgroup',
      objects: [
        {
          id: 1,
          name: 'default',
          type: 'player_spawn',
          x: 100,
          y: 600,
          width: 32,
          height: 32,
        },
        {
          id: 2,
          name: 'jedi_1',
          type: 'enemy_spawn',
          x: 400,
          y: 500,
          width: 32,
          height: 32,
          properties: [{ name: 'enemyType', type: 'string', value: 'jedi_defender' }],
        },
        {
          id: 3,
          name: 'hall_checkpoint',
          type: 'checkpoint',
          x: 600,
          y: 500,
          width: 64,
          height: 64,
          properties: [
            { name: 'checkpointId', type: 'string', value: 'main_hall_cp_1' },
            { name: 'displayName', type: 'string', value: 'Great Hall Entrance' },
          ],
        },
        {
          id: 4,
          name: 'to_archives',
          type: 'area_transition',
          x: 1200,
          y: 400,
          width: 80,
          height: 150,
          properties: [
            { name: 'targetArea', type: 'string', value: 'archives' },
            { name: 'targetSpawn', type: 'string', value: 'entrance' },
          ],
        },
      ],
    },
  ],
  tilesets: [
    {
      name: 'temple_tiles',
      image: 'temple_tileset.png',
      imagewidth: 512,
      imageheight: 512,
      tilewidth: 32,
      tileheight: 32,
      // ... tile properties
    },
  ],
};

/**
 * Temple Area Progression.
 *
 * Recommended level flow based on Star Wars lore.
 */
export const TEMPLE_AREA_PROGRESSION = [
  {
    areaKey: 'temple_entrance',
    displayName: 'Temple Entrance',
    description: 'The grand staircase leading to the Jedi Temple. Clone troopers engage initial defenders.',
    enemyTypes: ['jedi_defender'],
    bossEncounter: null,
    transitionsTo: ['main_hall'],
  },
  {
    areaKey: 'main_hall',
    displayName: 'Great Hall',
    description: 'The vast main hall of the temple. Multiple tiers of balconies, fierce resistance.',
    enemyTypes: ['jedi_defender', 'temple_guard'],
    bossEncounter: null,
    transitionsTo: ['training_grounds', 'archives'],
  },
  {
    areaKey: 'training_grounds',
    displayName: 'Training Grounds',
    description: 'Where younglings trained. Now a battleground.',
    enemyTypes: ['jedi_defender'],
    bossEncounter: null,
    transitionsTo: ['meditation_chambers', 'main_hall'],
  },
  {
    areaKey: 'archives',
    displayName: 'Jedi Archives',
    description: 'The vast library of Jedi knowledge. Towering shelves and reading alcoves.',
    enemyTypes: ['jedi_defender', 'temple_guard'],
    bossEncounter: null,
    transitionsTo: ['main_hall', 'meditation_chambers'],
  },
  {
    areaKey: 'meditation_chambers',
    displayName: 'Meditation Chambers',
    description: 'Tranquil rooms for Force meditation. Last line of defense before the Council.',
    enemyTypes: ['temple_guard', 'jedi_master'],
    bossEncounter: null,
    transitionsTo: ['council_chamber'],
  },
  {
    areaKey: 'council_chamber',
    displayName: 'Council Chamber',
    description: 'The High Council Chamber. The final confrontation.',
    enemyTypes: ['jedi_master'],
    bossEncounter: 'battlemaster_cin_drallig',
    transitionsTo: [], // End of level
  },
];

/**
 * Visual Style Guide for Temple Areas.
 */
export const VISUAL_STYLE_GUIDE = {
  temple_entrance: {
    ambientColor: 0x2d1b4e,
    fogDensity: 0.1,
    lighting: 'exterior_twilight',
    notes: 'Night sky visible, burning fires in distance',
  },
  main_hall: {
    ambientColor: 0xd4a574,
    fogDensity: 0.2,
    lighting: 'interior_torchlit',
    notes: 'Warm torchlight, smoke from battles',
  },
  training_grounds: {
    ambientColor: 0x4a3a2a,
    fogDensity: 0.15,
    lighting: 'interior_dim',
    notes: 'Training mats, weapon racks, sparse decoration',
  },
  archives: {
    ambientColor: 0x1a1a3e,
    fogDensity: 0.3,
    lighting: 'interior_blue',
    notes: 'Blue holographic glow from data terminals',
  },
  meditation_chambers: {
    ambientColor: 0x3a4a5a,
    fogDensity: 0.4,
    lighting: 'interior_serene',
    notes: 'Soft lighting, meditation cushions, Force vergence visible',
  },
  council_chamber: {
    ambientColor: 0x4a4a4a,
    fogDensity: 0.5,
    lighting: 'interior_dramatic',
    notes: 'Coruscant city visible through windows, dramatic shadows',
  },
};
