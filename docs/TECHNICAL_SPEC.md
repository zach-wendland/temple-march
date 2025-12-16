# Temple March: Technical Implementation Specification

## 2D Star Wars Action Game - Phaser.js + p5.js + TypeScript Architecture

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Framework Integration Strategy](#2-framework-integration-strategy)
3. [Project Structure](#3-project-structure)
4. [Phaser.js Implementation Details](#4-phaserjs-implementation-details)
5. [p5.js Integration Layer](#5-p5js-integration-layer)
6. [Combat System Architecture](#6-combat-system-architecture)
7. [State Management Patterns](#7-state-management-patterns)
8. [Performance Optimization](#8-performance-optimization)
9. [Asset Pipeline](#9-asset-pipeline)
10. [Implementation Roadmap](#10-implementation-roadmap)

---

## 1. Architecture Overview

### 1.1 High-Level Architecture

```
+------------------------------------------------------------------+
|                         GAME APPLICATION                          |
+------------------------------------------------------------------+
|  +------------------+  +------------------+  +------------------+ |
|  |   Phaser Game    |  |  p5.js Instance  |  |   State Store    | |
|  |    (Primary)     |  |   (Effects)      |  |    (Global)      | |
|  +--------+---------+  +--------+---------+  +--------+---------+ |
|           |                     |                     |           |
+------------------------------------------------------------------+
|                         CORE SYSTEMS                              |
+------------------------------------------------------------------+
|  +---------------+  +---------------+  +---------------+          |
|  | Scene Manager |  | Combat System |  | Input Handler |          |
|  +---------------+  +---------------+  +---------------+          |
|  +---------------+  +---------------+  +---------------+          |
|  | Physics World |  | Animation Sys |  | Effects Layer |          |
|  +---------------+  +---------------+  +---------------+          |
+------------------------------------------------------------------+
|                      ENTITY COMPONENT SYSTEM                      |
+------------------------------------------------------------------+
|  Entities -> Components -> Systems -> World                       |
+------------------------------------------------------------------+
```

### 1.2 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Game Engine | Phaser 3.90.x | Core game loop, physics, rendering |
| Creative Effects | p5.js 2.x (Instance Mode) | Procedural effects, Force powers |
| Language | TypeScript 5.x | Type safety, better tooling |
| Build | Vite or Webpack | Module bundling, HMR |
| Testing | Vitest | Unit and integration testing |

### 1.3 Design Principles

1. **Separation of Concerns**: Phaser handles game logic; p5.js handles creative effects
2. **Data-Driven Design**: Configuration files drive game behavior
3. **Object Pooling**: Reuse objects to minimize garbage collection
4. **State Machines**: Explicit state management for complex behaviors
5. **Event-Driven Communication**: Loose coupling between systems

---

## 2. Framework Integration Strategy

### 2.1 When to Use Phaser vs p5.js

| Feature | Phaser.js | p5.js | Rationale |
|---------|-----------|-------|-----------|
| Sprite rendering | Yes | No | Phaser optimized for sprite batching |
| Physics/collision | Yes | No | Arcade physics built-in |
| Scene management | Yes | No | Native scene graph |
| Input handling | Yes | No | Unified keyboard/gamepad support |
| Particle systems (basic) | Yes | No | Built-in emitters |
| Force lightning | No | Yes | Procedural generation |
| Saber trails | No | Yes | Bezier curves, glow effects |
| Dynamic backgrounds | No | Yes | Perlin noise, shaders |
| Procedural patterns | No | Yes | Creative coding strength |

### 2.2 Integration Architecture

```typescript
// src/core/EffectsLayer.ts

import p5 from 'p5';
import Phaser from 'phaser';

/**
 * Bridge between Phaser game world and p5.js effects layer.
 * p5.js renders to a separate canvas overlaid on Phaser.
 */
export class EffectsLayer {
  private p5Instance: p5;
  private effectsCanvas: HTMLCanvasElement;
  private gameScene: Phaser.Scene;

  // Queue of effects to render
  private effectQueue: EffectRequest[] = [];

  constructor(gameScene: Phaser.Scene, containerId: string) {
    this.gameScene = gameScene;
    this.initializeP5(containerId);
  }

  private initializeP5(containerId: string): void {
    const sketch = (p: p5) => {
      p.setup = () => {
        // Match Phaser canvas dimensions
        const phaserCanvas = this.gameScene.game.canvas;
        this.effectsCanvas = p.createCanvas(
          phaserCanvas.width,
          phaserCanvas.height
        ).elt as HTMLCanvasElement;

        // Position over Phaser canvas
        this.effectsCanvas.style.position = 'absolute';
        this.effectsCanvas.style.pointerEvents = 'none';
        this.effectsCanvas.style.zIndex = '10';

        p.clear();
      };

      p.draw = () => {
        p.clear(); // Transparent background

        // Process effect queue synchronized with Phaser
        this.processEffects(p);
      };
    };

    this.p5Instance = new p5(sketch, document.getElementById(containerId)!);
  }

  private processEffects(p: p5): void {
    for (const effect of this.effectQueue) {
      switch (effect.type) {
        case 'lightning':
          this.renderLightning(p, effect);
          break;
        case 'saberTrail':
          this.renderSaberTrail(p, effect);
          break;
        case 'forceWave':
          this.renderForceWave(p, effect);
          break;
      }
    }

    // Clear processed one-shot effects
    this.effectQueue = this.effectQueue.filter(e => e.persistent);
  }

  /**
   * Queue a new effect to be rendered.
   * Called from Phaser game objects.
   */
  public queueEffect(effect: EffectRequest): void {
    this.effectQueue.push(effect);
  }

  /**
   * Render Force lightning between two points.
   */
  private renderLightning(p: p5, effect: LightningEffect): void {
    const { startX, startY, endX, endY, color, branches } = effect;

    p.stroke(color.r, color.g, color.b, 200);
    p.strokeWeight(2);

    // Main bolt with fractal subdivision
    this.drawLightningBolt(p, startX, startY, endX, endY, 5);

    // Secondary branches
    for (let i = 0; i < branches; i++) {
      const midX = p.lerp(startX, endX, p.random(0.3, 0.7));
      const midY = p.lerp(startY, endY, p.random(0.3, 0.7));
      const branchEndX = midX + p.random(-50, 50);
      const branchEndY = midY + p.random(-50, 50);

      p.strokeWeight(1);
      this.drawLightningBolt(p, midX, midY, branchEndX, branchEndY, 3);
    }
  }

  private drawLightningBolt(
    p: p5,
    x1: number, y1: number,
    x2: number, y2: number,
    iterations: number
  ): void {
    if (iterations <= 0) {
      p.line(x1, y1, x2, y2);
      return;
    }

    const midX = (x1 + x2) / 2 + p.random(-15, 15);
    const midY = (y1 + y2) / 2 + p.random(-15, 15);

    this.drawLightningBolt(p, x1, y1, midX, midY, iterations - 1);
    this.drawLightningBolt(p, midX, midY, x2, y2, iterations - 1);
  }

  /**
   * Render lightsaber trail effect.
   */
  private renderSaberTrail(p: p5, effect: SaberTrailEffect): void {
    const { points, coreColor, glowColor, width } = effect;

    if (points.length < 2) return;

    // Outer glow
    p.noFill();
    p.stroke(glowColor.r, glowColor.g, glowColor.b, 100);
    p.strokeWeight(width * 3);
    p.beginShape();
    for (const point of points) {
      p.curveVertex(point.x, point.y);
    }
    p.endShape();

    // Inner core
    p.stroke(coreColor.r, coreColor.g, coreColor.b, 255);
    p.strokeWeight(width);
    p.beginShape();
    for (const point of points) {
      p.curveVertex(point.x, point.y);
    }
    p.endShape();
  }

  private renderForceWave(p: p5, effect: ForceWaveEffect): void {
    const { x, y, radius, maxRadius, color } = effect;
    const alpha = p.map(radius, 0, maxRadius, 255, 0);

    p.noFill();
    p.stroke(color.r, color.g, color.b, alpha);
    p.strokeWeight(3);
    p.circle(x, y, radius * 2);
  }

  public destroy(): void {
    this.p5Instance.remove();
  }
}

// Effect type definitions
interface EffectRequest {
  type: string;
  persistent: boolean;
}

interface LightningEffect extends EffectRequest {
  type: 'lightning';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: { r: number; g: number; b: number };
  branches: number;
}

interface SaberTrailEffect extends EffectRequest {
  type: 'saberTrail';
  points: { x: number; y: number }[];
  coreColor: { r: number; g: number; b: number };
  glowColor: { r: number; g: number; b: number };
  width: number;
}

interface ForceWaveEffect extends EffectRequest {
  type: 'forceWave';
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: { r: number; g: number; b: number };
}
```

### 2.3 Canvas Layering Setup

```typescript
// src/core/GameBootstrap.ts

export function createGameContainer(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'game-container';
  container.style.position = 'relative';
  container.style.width = '1280px';
  container.style.height = '720px';

  // Phaser will create its canvas here
  const phaserContainer = document.createElement('div');
  phaserContainer.id = 'phaser-game';
  phaserContainer.style.position = 'absolute';
  phaserContainer.style.zIndex = '1';

  // p5.js effects layer
  const effectsContainer = document.createElement('div');
  effectsContainer.id = 'effects-layer';
  effectsContainer.style.position = 'absolute';
  effectsContainer.style.zIndex = '10';
  effectsContainer.style.pointerEvents = 'none';

  // UI overlay (HTML/CSS)
  const uiContainer = document.createElement('div');
  uiContainer.id = 'ui-layer';
  uiContainer.style.position = 'absolute';
  uiContainer.style.zIndex = '100';
  uiContainer.style.pointerEvents = 'auto';

  container.appendChild(phaserContainer);
  container.appendChild(effectsContainer);
  container.appendChild(uiContainer);

  return container;
}
```

---

## 3. Project Structure

### 3.1 Recommended Directory Layout

```
temple-march/
+-- src/
|   +-- core/                      # Core engine systems
|   |   +-- types.ts               # Base type definitions
|   |   +-- Game.ts                # Main game class
|   |   +-- World.ts               # ECS world container
|   |   +-- Entity.ts              # Entity class
|   |   +-- Component.ts           # Component base class
|   |   +-- System.ts              # System base class
|   |   +-- EventBus.ts            # Global event system
|   |   +-- EffectsLayer.ts        # p5.js integration
|   |   +-- ObjectPool.ts          # Generic object pooling
|   |
|   +-- components/                # ECS Components
|   |   +-- TransformComponent.ts
|   |   +-- SpriteComponent.ts
|   |   +-- PhysicsComponent.ts
|   |   +-- HealthComponent.ts
|   |   +-- CombatComponent.ts
|   |   +-- AnimationComponent.ts
|   |   +-- AIComponent.ts
|   |   +-- InputComponent.ts
|   |
|   +-- systems/                   # ECS Systems
|   |   +-- MovementSystem.ts
|   |   +-- PhysicsSystem.ts
|   |   +-- CombatSystem.ts
|   |   +-- AnimationSystem.ts
|   |   +-- AISystem.ts
|   |   +-- InputSystem.ts
|   |   +-- RenderSystem.ts
|   |   +-- EffectsSystem.ts
|   |
|   +-- entities/                  # Entity factories/prefabs
|   |   +-- PlayerFactory.ts
|   |   +-- EnemyFactory.ts
|   |   +-- ProjectileFactory.ts
|   |   +-- EffectFactory.ts
|   |
|   +-- scenes/                    # Phaser scenes
|   |   +-- BootScene.ts           # Asset preloading
|   |   +-- MainMenuScene.ts
|   |   +-- GameScene.ts           # Main gameplay
|   |   +-- PauseScene.ts          # Overlay scene
|   |   +-- UIScene.ts             # HUD overlay
|   |   +-- temple/                # Temple-specific scenes
|   |       +-- TempleEntranceScene.ts
|   |       +-- TempleHallsScene.ts
|   |       +-- TempleArchivesScene.ts
|   |       +-- TempleCouncilScene.ts
|   |
|   +-- combat/                    # Combat system
|   |   +-- CombatManager.ts
|   |   +-- HitboxManager.ts
|   |   +-- ComboSystem.ts
|   |   +-- DamageCalculator.ts
|   |   +-- AttackData.ts
|   |
|   +-- ai/                        # Enemy AI
|   |   +-- BehaviorTree.ts
|   |   +-- AIController.ts
|   |   +-- behaviors/
|   |       +-- PatrolBehavior.ts
|   |       +-- ChaseBehavior.ts
|   |       +-- AttackBehavior.ts
|   |       +-- FlankBehavior.ts
|   |
|   +-- effects/                   # p5.js effect definitions
|   |   +-- LightningEffect.ts
|   |   +-- SaberTrailEffect.ts
|   |   +-- ForceWaveEffect.ts
|   |   +-- ParticlePresets.ts
|   |
|   +-- input/                     # Input handling
|   |   +-- InputManager.ts
|   |   +-- InputMappings.ts
|   |   +-- ComboInputBuffer.ts
|   |
|   +-- config/                    # Game configuration
|   |   +-- GameConfig.ts
|   |   +-- PhysicsConfig.ts
|   |   +-- CombatConfig.ts
|   |   +-- AnimationConfig.ts
|   |   +-- EnemyConfig.ts
|   |
|   +-- utils/                     # Utilities
|   |   +-- MathUtils.ts
|   |   +-- CollisionUtils.ts
|   |   +-- AnimationUtils.ts
|   |
|   +-- index.ts                   # Application entry point
|
+-- assets/
|   +-- sprites/                   # Sprite sheets
|   |   +-- player/
|   |   +-- enemies/
|   |   +-- effects/
|   |   +-- environment/
|   +-- tilemaps/                  # Tiled map files
|   +-- data/                      # JSON configs
|   +-- fonts/
|
+-- tests/
|   +-- unit/
|   +-- integration/
|
+-- docs/
|   +-- TECHNICAL_SPEC.md
|
+-- package.json
+-- tsconfig.json
+-- vite.config.ts
```

### 3.2 Module Dependencies

```typescript
// Dependency graph (arrows show "depends on")
/*
  index.ts
     |
     v
  Game.ts --> World.ts --> Entity.ts
     |           |             |
     v           v             v
  Scenes   Systems      Components
     |           |
     v           v
  EffectsLayer  CombatManager
     |
     v
  p5.js (external)
*/
```

---

## 4. Phaser.js Implementation Details

### 4.1 Game Configuration

```typescript
// src/config/GameConfig.ts

import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { GameScene } from '../scenes/GameScene';
import { UIScene } from '../scenes/UIScene';
import { PauseScene } from '../scenes/PauseScene';

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: 'phaser-game',
  width: 1280,
  height: 720,
  pixelArt: true, // Crisp pixel scaling
  roundPixels: true,

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 }, // Top-down or zero-G
      debug: process.env.NODE_ENV === 'development',
      tileBias: 16,
    },
  },

  input: {
    keyboard: true,
    gamepad: true,
    mouse: true,
    touch: false,
  },

  render: {
    antialias: false, // Pixel art
    pixelArt: true,
    batchSize: 4096, // Increase for many sprites
  },

  scene: [
    BootScene,
    MainMenuScene,
    GameScene,
    UIScene,
    PauseScene,
  ],

  callbacks: {
    preBoot: (game) => {
      // Custom pre-boot logic
    },
    postBoot: (game) => {
      // Initialize global systems after boot
    },
  },
};
```

### 4.2 Scene Management for Temple Areas

```typescript
// src/scenes/GameScene.ts

import Phaser from 'phaser';
import { World } from '../core/World';
import { EffectsLayer } from '../core/EffectsLayer';
import { CombatManager } from '../combat/CombatManager';
import { InputManager } from '../input/InputManager';

export class GameScene extends Phaser.Scene {
  // Core systems
  private world!: World;
  private effectsLayer!: EffectsLayer;
  private combatManager!: CombatManager;
  private inputManager!: InputManager;

  // Phaser groups for object pooling
  private enemyPool!: Phaser.GameObjects.Group;
  private projectilePool!: Phaser.GameObjects.Group;
  private effectPool!: Phaser.GameObjects.Group;

  // Current area data
  private currentArea: string = 'entrance';
  private areaTransitioning: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { area?: string }): void {
    this.currentArea = data.area || 'entrance';
  }

  create(): void {
    // Initialize core systems
    this.initializeSystems();

    // Load area-specific content
    this.loadArea(this.currentArea);

    // Start parallel UI scene
    this.scene.launch('UIScene');

    // Setup camera
    this.setupCamera();

    // Listen for area transitions
    this.events.on('area-transition', this.handleAreaTransition, this);

    // Start background music
    this.startAreaMusic();
  }

  private initializeSystems(): void {
    // Initialize ECS World
    this.world = new World(this);

    // Initialize p5.js effects layer
    this.effectsLayer = new EffectsLayer(this, 'effects-layer');

    // Initialize combat system
    this.combatManager = new CombatManager(this, this.world);

    // Initialize input
    this.inputManager = new InputManager(this);

    // Create object pools
    this.createObjectPools();
  }

  private createObjectPools(): void {
    // Enemy pool with recycling
    this.enemyPool = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: 50,
      runChildUpdate: true,
      createCallback: (enemy) => {
        const sprite = enemy as Phaser.Physics.Arcade.Sprite;
        sprite.setActive(false);
        sprite.setVisible(false);
      },
    });

    // Projectile pool
    this.projectilePool = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: 100,
      runChildUpdate: false,
    });

    // Effect pool (non-physics)
    this.effectPool = this.add.group({
      classType: Phaser.GameObjects.Sprite,
      maxSize: 200,
    });
  }

  private loadArea(areaKey: string): void {
    // Clear existing area
    this.clearCurrentArea();

    // Load tilemap for area
    const map = this.make.tilemap({ key: `map_${areaKey}` });
    const tileset = map.addTilesetImage('temple_tiles', 'temple_tileset');

    if (!tileset) {
      console.error(`Failed to load tileset for area: ${areaKey}`);
      return;
    }

    // Create layers
    const backgroundLayer = map.createLayer('background', tileset);
    const groundLayer = map.createLayer('ground', tileset);
    const wallsLayer = map.createLayer('walls', tileset);
    const decorLayer = map.createLayer('decorations', tileset);

    // Set collision on walls
    wallsLayer?.setCollisionByProperty({ collides: true });

    // Spawn entities from object layer
    const objectLayer = map.getObjectLayer('objects');
    if (objectLayer) {
      this.spawnEntitiesFromMap(objectLayer);
    }

    // Setup collision between player and walls
    if (wallsLayer && this.world.player) {
      this.physics.add.collider(
        this.world.player.sprite,
        wallsLayer
      );
    }
  }

  private spawnEntitiesFromMap(
    objectLayer: Phaser.Tilemaps.ObjectLayer
  ): void {
    for (const obj of objectLayer.objects) {
      switch (obj.type) {
        case 'player_spawn':
          this.spawnPlayer(obj.x!, obj.y!);
          break;
        case 'enemy_spawn':
          this.spawnEnemy(obj.x!, obj.y!, obj.name);
          break;
        case 'trigger':
          this.createTrigger(obj);
          break;
        case 'area_transition':
          this.createAreaTransition(obj);
          break;
      }
    }
  }

  private handleAreaTransition(targetArea: string): void {
    if (this.areaTransitioning) return;
    this.areaTransitioning = true;

    // Fade out
    this.cameras.main.fadeOut(500, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Load new area
      this.loadArea(targetArea);
      this.currentArea = targetArea;

      // Fade in
      this.cameras.main.fadeIn(500, 0, 0, 0);
      this.areaTransitioning = false;
    });
  }

  update(time: number, delta: number): void {
    // Update ECS world
    this.world.update({
      total: time,
      delta,
      frame: this.game.loop.frame
    });

    // Update combat system
    this.combatManager.update(delta);

    // Process input
    this.inputManager.update();
  }

  // ... additional methods
  private clearCurrentArea(): void { /* ... */ }
  private spawnPlayer(x: number, y: number): void { /* ... */ }
  private spawnEnemy(x: number, y: number, type: string): void { /* ... */ }
  private createTrigger(obj: Phaser.Types.Tilemaps.TiledObject): void { /* ... */ }
  private createAreaTransition(obj: Phaser.Types.Tilemaps.TiledObject): void { /* ... */ }
  private setupCamera(): void { /* ... */ }
  private startAreaMusic(): void { /* ... */ }
}
```

### 4.3 Physics System Setup

```typescript
// src/config/PhysicsConfig.ts

export const PHYSICS_CONFIG = {
  // Player physics
  player: {
    bodyWidth: 24,
    bodyHeight: 32,
    bodyOffsetX: 4,
    bodyOffsetY: 0,
    maxSpeed: 200,
    acceleration: 1000,
    drag: 800,
    dodgeSpeed: 400,
    dodgeDuration: 200,
  },

  // Enemy physics (by type)
  enemies: {
    clone_trooper: {
      bodyWidth: 20,
      bodyHeight: 30,
      maxSpeed: 120,
      acceleration: 600,
      drag: 400,
    },
    battle_droid: {
      bodyWidth: 16,
      bodyHeight: 28,
      maxSpeed: 100,
      acceleration: 400,
      drag: 300,
    },
    magna_guard: {
      bodyWidth: 24,
      bodyHeight: 34,
      maxSpeed: 150,
      acceleration: 800,
      drag: 500,
    },
  },

  // Projectile physics
  projectiles: {
    blaster_bolt: {
      speed: 500,
      bodyRadius: 4,
    },
    force_push: {
      speed: 300,
      bodyWidth: 48,
      bodyHeight: 48,
    },
  },

  // Collision categories (bitmask)
  categories: {
    PLAYER: 0b0001,
    ENEMY: 0b0010,
    PLAYER_ATTACK: 0b0100,
    ENEMY_ATTACK: 0b1000,
    TERRAIN: 0b10000,
    TRIGGER: 0b100000,
  },
};

// src/systems/PhysicsSystem.ts

import Phaser from 'phaser';
import { PHYSICS_CONFIG } from '../config/PhysicsConfig';

export class PhysicsSystem {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupCollisionGroups();
  }

  private setupCollisionGroups(): void {
    // Get physics world
    const world = this.scene.physics.world;

    // Player collides with terrain and enemy attacks
    // Player attacks collide with enemies
    // Enemies collide with terrain and player attacks
  }

  /**
   * Configure a sprite's physics body for combat.
   */
  public setupCombatBody(
    sprite: Phaser.Physics.Arcade.Sprite,
    config: {
      width: number;
      height: number;
      offsetX?: number;
      offsetY?: number;
      category: number;
      collidesWith: number;
    }
  ): void {
    const body = sprite.body as Phaser.Physics.Arcade.Body;

    // Set body size
    body.setSize(config.width, config.height);

    if (config.offsetX !== undefined || config.offsetY !== undefined) {
      body.setOffset(config.offsetX || 0, config.offsetY || 0);
    }

    // Set collision category and mask
    body.setCollisionCategory(config.category);
    body.setCollidesWith(config.collidesWith);
  }

  /**
   * Create a temporary hitbox for attacks.
   */
  public createAttackHitbox(
    x: number,
    y: number,
    width: number,
    height: number,
    duration: number,
    category: number,
    onHit: (target: Phaser.Physics.Arcade.Sprite) => void
  ): Phaser.GameObjects.Zone {
    const hitbox = this.scene.add.zone(x, y, width, height);
    this.scene.physics.add.existing(hitbox, false);

    const body = hitbox.body as Phaser.Physics.Arcade.Body;
    body.setCollisionCategory(category);

    // Auto-destroy after duration
    this.scene.time.delayedCall(duration, () => {
      hitbox.destroy();
    });

    return hitbox;
  }
}
```

### 4.4 Animation System

```typescript
// src/config/AnimationConfig.ts

export interface AnimationDefinition {
  key: string;
  frames: { start: number; end: number } | number[];
  frameRate: number;
  repeat: number; // -1 for infinite
  yoyo?: boolean;
}

export const PLAYER_ANIMATIONS: Record<string, AnimationDefinition> = {
  // Movement
  idle: {
    key: 'player_idle',
    frames: { start: 0, end: 3 },
    frameRate: 8,
    repeat: -1,
  },
  walk: {
    key: 'player_walk',
    frames: { start: 4, end: 11 },
    frameRate: 12,
    repeat: -1,
  },
  run: {
    key: 'player_run',
    frames: { start: 12, end: 19 },
    frameRate: 14,
    repeat: -1,
  },

  // Combat - Light attacks
  attack_light_1: {
    key: 'player_attack_light_1',
    frames: { start: 20, end: 25 },
    frameRate: 18,
    repeat: 0,
  },
  attack_light_2: {
    key: 'player_attack_light_2',
    frames: { start: 26, end: 31 },
    frameRate: 18,
    repeat: 0,
  },
  attack_light_3: {
    key: 'player_attack_light_3',
    frames: { start: 32, end: 39 },
    frameRate: 20,
    repeat: 0,
  },

  // Combat - Heavy attacks
  attack_heavy_1: {
    key: 'player_attack_heavy_1',
    frames: { start: 40, end: 49 },
    frameRate: 14,
    repeat: 0,
  },
  attack_heavy_2: {
    key: 'player_attack_heavy_2',
    frames: { start: 50, end: 61 },
    frameRate: 14,
    repeat: 0,
  },

  // Force powers
  force_push: {
    key: 'player_force_push',
    frames: { start: 70, end: 79 },
    frameRate: 16,
    repeat: 0,
  },
  force_pull: {
    key: 'player_force_pull',
    frames: { start: 80, end: 89 },
    frameRate: 16,
    repeat: 0,
  },
  force_lightning: {
    key: 'player_force_lightning',
    frames: { start: 90, end: 95 },
    frameRate: 12,
    repeat: -1, // Loops while holding
  },

  // Defensive
  block_start: {
    key: 'player_block_start',
    frames: { start: 100, end: 102 },
    frameRate: 20,
    repeat: 0,
  },
  block_hold: {
    key: 'player_block_hold',
    frames: { start: 103, end: 103 },
    frameRate: 1,
    repeat: -1,
  },
  block_deflect: {
    key: 'player_block_deflect',
    frames: { start: 104, end: 108 },
    frameRate: 20,
    repeat: 0,
  },
  dodge: {
    key: 'player_dodge',
    frames: { start: 110, end: 117 },
    frameRate: 20,
    repeat: 0,
  },

  // Damage
  hit: {
    key: 'player_hit',
    frames: { start: 120, end: 123 },
    frameRate: 16,
    repeat: 0,
  },
  death: {
    key: 'player_death',
    frames: { start: 130, end: 145 },
    frameRate: 12,
    repeat: 0,
  },
};

// src/systems/AnimationSystem.ts

import Phaser from 'phaser';
import { PLAYER_ANIMATIONS, AnimationDefinition } from '../config/AnimationConfig';

export class AnimationSystem {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Register all animations from a sprite sheet.
   */
  public registerAnimations(
    spriteKey: string,
    animations: Record<string, AnimationDefinition>
  ): void {
    for (const [name, config] of Object.entries(animations)) {
      // Skip if animation already exists
      if (this.scene.anims.exists(config.key)) continue;

      const frames = Array.isArray(config.frames)
        ? config.frames.map(f => ({ key: spriteKey, frame: f }))
        : this.scene.anims.generateFrameNumbers(spriteKey, {
            start: config.frames.start,
            end: config.frames.end,
          });

      this.scene.anims.create({
        key: config.key,
        frames,
        frameRate: config.frameRate,
        repeat: config.repeat,
        yoyo: config.yoyo || false,
      });
    }
  }

  /**
   * Play animation with attack hitbox synchronization.
   * Returns a promise that resolves when animation completes.
   */
  public playAttackAnimation(
    sprite: Phaser.Physics.Arcade.Sprite,
    animKey: string,
    hitboxConfig: {
      activeFrames: number[]; // Frame indices where hitbox is active
      width: number;
      height: number;
      offsetX: number;
      offsetY: number;
      onHit: (target: Phaser.Physics.Arcade.Sprite) => void;
    }
  ): Promise<void> {
    return new Promise((resolve) => {
      let hitboxActive = false;
      let currentHitbox: Phaser.GameObjects.Zone | null = null;

      // Listen for frame changes
      sprite.on('animationupdate', (
        _anim: Phaser.Animations.Animation,
        frame: Phaser.Animations.AnimationFrame
      ) => {
        const frameIndex = frame.index;
        const shouldBeActive = hitboxConfig.activeFrames.includes(frameIndex);

        if (shouldBeActive && !hitboxActive) {
          // Activate hitbox
          hitboxActive = true;
          currentHitbox = this.createHitbox(sprite, hitboxConfig);
        } else if (!shouldBeActive && hitboxActive) {
          // Deactivate hitbox
          hitboxActive = false;
          currentHitbox?.destroy();
          currentHitbox = null;
        }
      });

      // Clean up on animation complete
      sprite.once('animationcomplete', () => {
        sprite.off('animationupdate');
        currentHitbox?.destroy();
        resolve();
      });

      // Play the animation
      sprite.play(animKey);
    });
  }

  private createHitbox(
    sprite: Phaser.Physics.Arcade.Sprite,
    config: {
      width: number;
      height: number;
      offsetX: number;
      offsetY: number;
      onHit: (target: Phaser.Physics.Arcade.Sprite) => void;
    }
  ): Phaser.GameObjects.Zone {
    const facing = sprite.flipX ? -1 : 1;
    const x = sprite.x + config.offsetX * facing;
    const y = sprite.y + config.offsetY;

    const hitbox = this.scene.add.zone(x, y, config.width, config.height);
    this.scene.physics.add.existing(hitbox, false);

    // Store callback for collision handling
    hitbox.setData('onHit', config.onHit);
    hitbox.setData('owner', sprite);

    return hitbox;
  }
}
```

### 4.5 Input Handling

```typescript
// src/input/InputMappings.ts

export enum GameAction {
  // Movement
  MoveUp = 'move_up',
  MoveDown = 'move_down',
  MoveLeft = 'move_left',
  MoveRight = 'move_right',

  // Combat
  AttackLight = 'attack_light',
  AttackHeavy = 'attack_heavy',
  Block = 'block',
  Dodge = 'dodge',

  // Force powers
  ForcePush = 'force_push',
  ForcePull = 'force_pull',
  ForceLightning = 'force_lightning',

  // System
  Pause = 'pause',
  Interact = 'interact',
}

export interface InputMapping {
  keyboard: number[]; // Phaser.Input.Keyboard.KeyCodes
  gamepad: {
    buttons?: number[];
    axes?: { index: number; direction: 1 | -1 }[];
  };
}

export const DEFAULT_INPUT_MAPPINGS: Record<GameAction, InputMapping> = {
  [GameAction.MoveUp]: {
    keyboard: [Phaser.Input.Keyboard.KeyCodes.W, Phaser.Input.Keyboard.KeyCodes.UP],
    gamepad: { axes: [{ index: 1, direction: -1 }] }, // Left stick up
  },
  [GameAction.MoveDown]: {
    keyboard: [Phaser.Input.Keyboard.KeyCodes.S, Phaser.Input.Keyboard.KeyCodes.DOWN],
    gamepad: { axes: [{ index: 1, direction: 1 }] },
  },
  [GameAction.MoveLeft]: {
    keyboard: [Phaser.Input.Keyboard.KeyCodes.A, Phaser.Input.Keyboard.KeyCodes.LEFT],
    gamepad: { axes: [{ index: 0, direction: -1 }] },
  },
  [GameAction.MoveRight]: {
    keyboard: [Phaser.Input.Keyboard.KeyCodes.D, Phaser.Input.Keyboard.KeyCodes.RIGHT],
    gamepad: { axes: [{ index: 0, direction: 1 }] },
  },

  [GameAction.AttackLight]: {
    keyboard: [Phaser.Input.Keyboard.KeyCodes.J],
    gamepad: { buttons: [0] }, // A / X
  },
  [GameAction.AttackHeavy]: {
    keyboard: [Phaser.Input.Keyboard.KeyCodes.K],
    gamepad: { buttons: [2] }, // X / Square
  },
  [GameAction.Block]: {
    keyboard: [Phaser.Input.Keyboard.KeyCodes.L],
    gamepad: { buttons: [4] }, // LB / L1
  },
  [GameAction.Dodge]: {
    keyboard: [Phaser.Input.Keyboard.KeyCodes.SPACE],
    gamepad: { buttons: [1] }, // B / Circle
  },

  [GameAction.ForcePush]: {
    keyboard: [Phaser.Input.Keyboard.KeyCodes.Q],
    gamepad: { buttons: [5] }, // RB / R1
  },
  [GameAction.ForcePull]: {
    keyboard: [Phaser.Input.Keyboard.KeyCodes.E],
    gamepad: { buttons: [6] }, // LT / L2
  },
  [GameAction.ForceLightning]: {
    keyboard: [Phaser.Input.Keyboard.KeyCodes.R],
    gamepad: { buttons: [7] }, // RT / R2
  },

  [GameAction.Pause]: {
    keyboard: [Phaser.Input.Keyboard.KeyCodes.ESC],
    gamepad: { buttons: [9] }, // Start
  },
  [GameAction.Interact]: {
    keyboard: [Phaser.Input.Keyboard.KeyCodes.F],
    gamepad: { buttons: [3] }, // Y / Triangle
  },
};

// src/input/InputManager.ts

import Phaser from 'phaser';
import { GameAction, DEFAULT_INPUT_MAPPINGS, InputMapping } from './InputMappings';
import { ComboInputBuffer } from './ComboInputBuffer';

export class InputManager {
  private scene: Phaser.Scene;
  private mappings: Record<GameAction, InputMapping>;
  private keyboard: Phaser.Input.Keyboard.KeyboardPlugin;
  private gamepad: Phaser.Input.Gamepad.Gamepad | null = null;

  // Input state
  private actionStates: Map<GameAction, boolean> = new Map();
  private actionJustPressed: Map<GameAction, boolean> = new Map();
  private actionJustReleased: Map<GameAction, boolean> = new Map();

  // Combo system
  private comboBuffer: ComboInputBuffer;

  // Axis deadzone
  private readonly DEADZONE = 0.2;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.mappings = { ...DEFAULT_INPUT_MAPPINGS };
    this.keyboard = scene.input.keyboard!;
    this.comboBuffer = new ComboInputBuffer();

    this.initializeGamepad();
    this.initializeActionStates();
  }

  private initializeGamepad(): void {
    // Listen for gamepad connection
    this.scene.input.gamepad?.once('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
      this.gamepad = pad;
      console.log('Gamepad connected:', pad.id);
    });

    // Check if already connected
    if (this.scene.input.gamepad?.total > 0) {
      this.gamepad = this.scene.input.gamepad.getPad(0);
    }
  }

  private initializeActionStates(): void {
    for (const action of Object.values(GameAction)) {
      this.actionStates.set(action, false);
      this.actionJustPressed.set(action, false);
      this.actionJustReleased.set(action, false);
    }
  }

  public update(): void {
    for (const [action, mapping] of Object.entries(this.mappings)) {
      const wasPressed = this.actionStates.get(action as GameAction) || false;
      const isPressed = this.checkActionPressed(mapping);

      this.actionStates.set(action as GameAction, isPressed);
      this.actionJustPressed.set(action as GameAction, isPressed && !wasPressed);
      this.actionJustReleased.set(action as GameAction, !isPressed && wasPressed);

      // Feed combo buffer on just pressed
      if (isPressed && !wasPressed) {
        this.comboBuffer.addInput(action as GameAction);
      }
    }

    // Update combo buffer timing
    this.comboBuffer.update(this.scene.game.loop.delta);
  }

  private checkActionPressed(mapping: InputMapping): boolean {
    // Check keyboard
    for (const keyCode of mapping.keyboard) {
      if (this.keyboard.checkDown(
        this.keyboard.addKey(keyCode, false, false)
      )) {
        return true;
      }
    }

    // Check gamepad
    if (this.gamepad) {
      // Check buttons
      if (mapping.gamepad.buttons) {
        for (const buttonIndex of mapping.gamepad.buttons) {
          if (this.gamepad.buttons[buttonIndex]?.pressed) {
            return true;
          }
        }
      }

      // Check axes
      if (mapping.gamepad.axes) {
        for (const axisConfig of mapping.gamepad.axes) {
          const axisValue = this.gamepad.axes[axisConfig.index]?.getValue() || 0;
          if (Math.abs(axisValue) > this.DEADZONE) {
            if ((axisConfig.direction > 0 && axisValue > this.DEADZONE) ||
                (axisConfig.direction < 0 && axisValue < -this.DEADZONE)) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  // Public API
  public isPressed(action: GameAction): boolean {
    return this.actionStates.get(action) || false;
  }

  public justPressed(action: GameAction): boolean {
    return this.actionJustPressed.get(action) || false;
  }

  public justReleased(action: GameAction): boolean {
    return this.actionJustReleased.get(action) || false;
  }

  public getMovementVector(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    if (this.isPressed(GameAction.MoveLeft)) x -= 1;
    if (this.isPressed(GameAction.MoveRight)) x += 1;
    if (this.isPressed(GameAction.MoveUp)) y -= 1;
    if (this.isPressed(GameAction.MoveDown)) y += 1;

    // Normalize diagonal movement
    if (x !== 0 && y !== 0) {
      const magnitude = Math.sqrt(x * x + y * y);
      x /= magnitude;
      y /= magnitude;
    }

    return { x, y };
  }

  public checkCombo(sequence: GameAction[]): boolean {
    return this.comboBuffer.matchSequence(sequence);
  }
}
```

---

## 5. p5.js Integration Layer

### 5.1 Advanced Effect Implementations

```typescript
// src/effects/LightningEffect.ts

import p5 from 'p5';

export interface LightningParams {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: { r: number; g: number; b: number };
  coreWidth: number;
  glowWidth: number;
  branches: number;
  jitter: number;
  lifetime: number;
}

export class LightningEffect {
  private params: LightningParams;
  private segments: { x: number; y: number }[][] = [];
  private age: number = 0;
  private regenerateTimer: number = 0;
  private readonly REGENERATE_INTERVAL = 50; // ms

  constructor(params: LightningParams) {
    this.params = params;
    this.generateSegments();
  }

  private generateSegments(): void {
    this.segments = [];

    // Main bolt
    this.segments.push(this.generateBolt(
      this.params.startX,
      this.params.startY,
      this.params.endX,
      this.params.endY,
      6, // iterations
      this.params.jitter
    ));

    // Branch bolts
    for (let i = 0; i < this.params.branches; i++) {
      const t = 0.3 + Math.random() * 0.4; // 30-70% along main bolt
      const mainBolt = this.segments[0];
      const branchStart = mainBolt[Math.floor(mainBolt.length * t)];

      const angle = Math.random() * Math.PI - Math.PI / 2;
      const length = 30 + Math.random() * 50;
      const branchEndX = branchStart.x + Math.cos(angle) * length;
      const branchEndY = branchStart.y + Math.sin(angle) * length;

      this.segments.push(this.generateBolt(
        branchStart.x,
        branchStart.y,
        branchEndX,
        branchEndY,
        3,
        this.params.jitter * 0.5
      ));
    }
  }

  private generateBolt(
    x1: number, y1: number,
    x2: number, y2: number,
    iterations: number,
    jitter: number
  ): { x: number; y: number }[] {
    let points = [{ x: x1, y: y1 }, { x: x2, y: y2 }];

    for (let i = 0; i < iterations; i++) {
      const newPoints: { x: number; y: number }[] = [];

      for (let j = 0; j < points.length - 1; j++) {
        const p1 = points[j];
        const p2 = points[j + 1];

        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        // Perpendicular offset
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const perpX = -dy / len;
        const perpY = dx / len;

        const offset = (Math.random() - 0.5) * jitter;

        newPoints.push(p1);
        newPoints.push({
          x: midX + perpX * offset,
          y: midY + perpY * offset,
        });
      }
      newPoints.push(points[points.length - 1]);
      points = newPoints;
      jitter *= 0.5;
    }

    return points;
  }

  public update(delta: number): boolean {
    this.age += delta;
    this.regenerateTimer += delta;

    // Regenerate bolt shape periodically for flickering effect
    if (this.regenerateTimer >= this.REGENERATE_INTERVAL) {
      this.regenerateTimer = 0;
      this.generateSegments();
    }

    return this.age < this.params.lifetime;
  }

  public render(p: p5): void {
    const alpha = 1 - (this.age / this.params.lifetime);
    const { r, g, b } = this.params.color;

    // Glow layer (outer)
    p.strokeWeight(this.params.glowWidth);
    p.stroke(r, g, b, 50 * alpha);
    this.drawAllSegments(p);

    // Mid layer
    p.strokeWeight(this.params.glowWidth * 0.5);
    p.stroke(r, g, b, 100 * alpha);
    this.drawAllSegments(p);

    // Core layer
    p.strokeWeight(this.params.coreWidth);
    p.stroke(255, 255, 255, 255 * alpha);
    this.drawAllSegments(p);
  }

  private drawAllSegments(p: p5): void {
    for (const segment of this.segments) {
      p.beginShape();
      for (const point of segment) {
        p.vertex(point.x, point.y);
      }
      p.endShape();
    }
  }
}

// src/effects/SaberTrailEffect.ts

export interface SaberTrailParams {
  maxPoints: number;
  fadeTime: number;
  coreColor: { r: number; g: number; b: number };
  glowColor: { r: number; g: number; b: number };
  coreWidth: number;
  glowWidth: number;
}

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

export class SaberTrailEffect {
  private params: SaberTrailParams;
  private points: TrailPoint[] = [];

  constructor(params: SaberTrailParams) {
    this.params = params;
  }

  public addPoint(x: number, y: number): void {
    this.points.unshift({ x, y, age: 0 });

    // Limit total points
    if (this.points.length > this.params.maxPoints) {
      this.points.pop();
    }
  }

  public update(delta: number): void {
    // Age all points
    for (const point of this.points) {
      point.age += delta;
    }

    // Remove old points
    this.points = this.points.filter(p => p.age < this.params.fadeTime);
  }

  public render(p: p5): void {
    if (this.points.length < 2) return;

    const { coreColor, glowColor, coreWidth, glowWidth, fadeTime } = this.params;

    // Draw glow layer
    p.noFill();
    for (let layer = 0; layer < 3; layer++) {
      const layerWidth = glowWidth * (1 - layer * 0.3);
      const layerAlpha = 80 - layer * 20;

      p.beginShape();
      for (let i = 0; i < this.points.length; i++) {
        const point = this.points[i];
        const alpha = (1 - point.age / fadeTime) * layerAlpha;
        p.stroke(glowColor.r, glowColor.g, glowColor.b, alpha);
        p.strokeWeight(layerWidth * (1 - i / this.points.length));
        p.curveVertex(point.x, point.y);
      }
      p.endShape();
    }

    // Draw core
    p.beginShape();
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i];
      const alpha = (1 - point.age / fadeTime) * 255;
      const width = coreWidth * (1 - i / this.points.length);
      p.stroke(coreColor.r, coreColor.g, coreColor.b, alpha);
      p.strokeWeight(width);
      p.curveVertex(point.x, point.y);
    }
    p.endShape();
  }

  public clear(): void {
    this.points = [];
  }
}

// src/effects/ForceWaveEffect.ts

export interface ForceWaveParams {
  x: number;
  y: number;
  maxRadius: number;
  duration: number;
  color: { r: number; g: number; b: number };
  rings: number;
}

export class ForceWaveEffect {
  private params: ForceWaveParams;
  private age: number = 0;

  constructor(params: ForceWaveParams) {
    this.params = params;
  }

  public update(delta: number): boolean {
    this.age += delta;
    return this.age < this.params.duration;
  }

  public render(p: p5): void {
    const progress = this.age / this.params.duration;
    const { x, y, maxRadius, color, rings } = this.params;

    p.noFill();

    for (let i = 0; i < rings; i++) {
      const ringProgress = Math.max(0, progress - (i * 0.1));
      if (ringProgress <= 0) continue;

      const radius = maxRadius * this.easeOutQuad(ringProgress);
      const alpha = (1 - ringProgress) * (255 - i * 40);
      const weight = 4 - i;

      p.stroke(color.r, color.g, color.b, alpha);
      p.strokeWeight(weight);
      p.circle(x, y, radius * 2);

      // Distortion particles
      if (i === 0) {
        const particleCount = 12;
        for (let j = 0; j < particleCount; j++) {
          const angle = (j / particleCount) * Math.PI * 2;
          const particleRadius = radius + p.noise(j * 0.5, this.age * 0.01) * 20;
          const px = x + Math.cos(angle) * particleRadius;
          const py = y + Math.sin(angle) * particleRadius;

          p.strokeWeight(2);
          p.point(px, py);
        }
      }
    }
  }

  private easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
  }
}
```

### 5.2 Dynamic Background System

```typescript
// src/effects/DynamicBackground.ts

import p5 from 'p5';

export interface BackgroundParams {
  type: 'temple' | 'space' | 'forest';
  baseColor: { r: number; g: number; b: number };
  noiseScale: number;
  scrollSpeed: number;
}

export class DynamicBackground {
  private params: BackgroundParams;
  private offset: number = 0;
  private particles: { x: number; y: number; size: number; speed: number }[] = [];

  constructor(params: BackgroundParams, width: number, height: number) {
    this.params = params;
    this.initializeParticles(width, height);
  }

  private initializeParticles(width: number, height: number): void {
    // Floating dust/debris particles
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 1 + Math.random() * 2,
        speed: 0.2 + Math.random() * 0.5,
      });
    }
  }

  public update(delta: number, cameraX: number, cameraY: number): void {
    this.offset += delta * this.params.scrollSpeed;

    // Update particle positions based on camera parallax
    for (const particle of this.particles) {
      particle.x -= delta * particle.speed * 0.01;
      if (particle.x < 0) {
        particle.x = 1280; // Reset to right side
        particle.y = Math.random() * 720;
      }
    }
  }

  public render(p: p5, width: number, height: number): void {
    const { baseColor, noiseScale } = this.params;

    // Gradient background with noise
    p.loadPixels();
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const noiseVal = p.noise(
          x * noiseScale + this.offset,
          y * noiseScale
        );

        const r = baseColor.r + noiseVal * 20 - 10;
        const g = baseColor.g + noiseVal * 20 - 10;
        const b = baseColor.b + noiseVal * 30 - 15;

        // Fill 4x4 block
        for (let dy = 0; dy < 4 && y + dy < height; dy++) {
          for (let dx = 0; dx < 4 && x + dx < width; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            p.pixels[idx] = r;
            p.pixels[idx + 1] = g;
            p.pixels[idx + 2] = b;
            p.pixels[idx + 3] = 255;
          }
        }
      }
    }
    p.updatePixels();

    // Render floating particles
    p.noStroke();
    for (const particle of this.particles) {
      const alpha = 100 + Math.sin(this.offset + particle.x * 0.1) * 50;
      p.fill(255, 255, 255, alpha);
      p.circle(particle.x, particle.y, particle.size);
    }
  }
}
```

---

## 6. Combat System Architecture

### 6.1 Hitbox/Hurtbox System

```typescript
// src/combat/HitboxManager.ts

import Phaser from 'phaser';

export enum HitboxType {
  Hurtbox = 'hurtbox',    // Can receive damage
  Hitbox = 'hitbox',      // Deals damage
  Blockbox = 'blockbox',  // Blocks incoming attacks
  Grabbox = 'grabbox',    // For throws/grabs
}

export interface HitboxData {
  type: HitboxType;
  damage: number;
  knockback: { x: number; y: number };
  hitstun: number; // frames
  blockstun: number;
  priority: number; // Higher priority hits first
}

export interface HitboxDefinition {
  frameStart: number;
  frameEnd: number;
  x: number;
  y: number;
  width: number;
  height: number;
  data: HitboxData;
}

export class HitboxManager {
  private scene: Phaser.Scene;
  private activeHitboxes: Map<string, Phaser.GameObjects.Zone[]> = new Map();
  private hitRecords: Map<string, Set<string>> = new Map(); // Prevent multi-hit

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Create hitboxes for an attack animation.
   */
  public createHitboxes(
    owner: Phaser.Physics.Arcade.Sprite,
    ownerId: string,
    definitions: HitboxDefinition[],
    currentFrame: number,
    facingRight: boolean
  ): void {
    // Clear previous hitboxes for this owner
    this.clearHitboxes(ownerId);

    const activeZones: Phaser.GameObjects.Zone[] = [];

    for (const def of definitions) {
      // Check if this hitbox should be active this frame
      if (currentFrame < def.frameStart || currentFrame > def.frameEnd) {
        continue;
      }

      // Calculate position relative to owner
      const offsetX = facingRight ? def.x : -def.x - def.width;
      const x = owner.x + offsetX + def.width / 2;
      const y = owner.y + def.y + def.height / 2;

      // Create zone
      const zone = this.scene.add.zone(x, y, def.width, def.height);
      this.scene.physics.add.existing(zone, false);

      // Store hitbox data
      zone.setData('hitboxData', def.data);
      zone.setData('ownerId', ownerId);
      zone.setData('owner', owner);

      activeZones.push(zone);
    }

    this.activeHitboxes.set(ownerId, activeZones);
  }

  /**
   * Check for collisions between hitboxes and hurtboxes.
   */
  public processCollisions(
    attackers: Phaser.GameObjects.Zone[],
    defenders: Phaser.Physics.Arcade.Sprite[],
    onHit: (attacker: Phaser.GameObjects.Zone, defender: Phaser.Physics.Arcade.Sprite, data: HitboxData) => void
  ): void {
    for (const attacker of attackers) {
      const attackerData = attacker.getData('hitboxData') as HitboxData;
      const attackerId = attacker.getData('ownerId') as string;

      if (attackerData.type !== HitboxType.Hitbox) continue;

      for (const defender of defenders) {
        const defenderId = defender.getData('entityId') as string;

        // Skip self-collision
        if (attackerId === defenderId) continue;

        // Skip if already hit this attack
        const hitKey = `${attackerId}_${defenderId}`;
        if (this.hitRecords.get(attackerId)?.has(defenderId)) continue;

        // Check overlap
        if (this.checkOverlap(attacker, defender)) {
          // Record hit
          if (!this.hitRecords.has(attackerId)) {
            this.hitRecords.set(attackerId, new Set());
          }
          this.hitRecords.get(attackerId)!.add(defenderId);

          onHit(attacker, defender, attackerData);
        }
      }
    }
  }

  private checkOverlap(
    zone: Phaser.GameObjects.Zone,
    sprite: Phaser.Physics.Arcade.Sprite
  ): boolean {
    const zoneBounds = zone.getBounds();
    const spriteBounds = sprite.getBounds();

    return Phaser.Geom.Intersects.RectangleToRectangle(zoneBounds, spriteBounds);
  }

  public clearHitboxes(ownerId: string): void {
    const zones = this.activeHitboxes.get(ownerId);
    if (zones) {
      for (const zone of zones) {
        zone.destroy();
      }
      this.activeHitboxes.delete(ownerId);
    }
  }

  public clearHitRecord(ownerId: string): void {
    this.hitRecords.delete(ownerId);
  }

  public clearAllHitRecords(): void {
    this.hitRecords.clear();
  }
}
```

### 6.2 Combo System State Machine

```typescript
// src/combat/ComboSystem.ts

import { GameAction } from '../input/InputMappings';

export interface ComboMove {
  name: string;
  inputs: GameAction[];
  windowMs: number; // Time window for input sequence
  damage: number;
  animationKey: string;
  canCancel: boolean;
  cancelIntoMoves: string[];
  hitboxFrames: { start: number; end: number };
  recoveryFrames: number;
}

export enum ComboState {
  Idle = 'idle',
  Startup = 'startup',
  Active = 'active',
  Recovery = 'recovery',
  Hitstun = 'hitstun',
  Blockstun = 'blockstun',
}

export interface ComboContext {
  currentState: ComboState;
  currentMove: ComboMove | null;
  frameCounter: number;
  comboCounter: number;
  lastHitTime: number;
  canCancel: boolean;
  inputBuffer: GameAction[];
  bufferTime: number;
}

// Define combo tree
export const COMBO_MOVES: ComboMove[] = [
  // Light attack chain
  {
    name: 'light_1',
    inputs: [GameAction.AttackLight],
    windowMs: 500,
    damage: 10,
    animationKey: 'player_attack_light_1',
    canCancel: true,
    cancelIntoMoves: ['light_2', 'heavy_1', 'force_push'],
    hitboxFrames: { start: 4, end: 6 },
    recoveryFrames: 8,
  },
  {
    name: 'light_2',
    inputs: [GameAction.AttackLight],
    windowMs: 400,
    damage: 12,
    animationKey: 'player_attack_light_2',
    canCancel: true,
    cancelIntoMoves: ['light_3', 'heavy_2', 'force_push'],
    hitboxFrames: { start: 3, end: 5 },
    recoveryFrames: 10,
  },
  {
    name: 'light_3',
    inputs: [GameAction.AttackLight],
    windowMs: 400,
    damage: 18,
    animationKey: 'player_attack_light_3',
    canCancel: false,
    cancelIntoMoves: [],
    hitboxFrames: { start: 5, end: 9 },
    recoveryFrames: 16,
  },

  // Heavy attacks
  {
    name: 'heavy_1',
    inputs: [GameAction.AttackHeavy],
    windowMs: 600,
    damage: 25,
    animationKey: 'player_attack_heavy_1',
    canCancel: true,
    cancelIntoMoves: ['heavy_2', 'force_push'],
    hitboxFrames: { start: 8, end: 12 },
    recoveryFrames: 20,
  },
  {
    name: 'heavy_2',
    inputs: [GameAction.AttackHeavy],
    windowMs: 500,
    damage: 35,
    animationKey: 'player_attack_heavy_2',
    canCancel: false,
    cancelIntoMoves: [],
    hitboxFrames: { start: 10, end: 16 },
    recoveryFrames: 28,
  },

  // Special: Directional + Attack
  {
    name: 'rising_strike',
    inputs: [GameAction.MoveUp, GameAction.AttackHeavy],
    windowMs: 200,
    damage: 30,
    animationKey: 'player_rising_strike',
    canCancel: false,
    cancelIntoMoves: [],
    hitboxFrames: { start: 6, end: 14 },
    recoveryFrames: 24,
  },
];

export class ComboSystem {
  private context: ComboContext;
  private moveMap: Map<string, ComboMove>;

  constructor() {
    this.context = {
      currentState: ComboState.Idle,
      currentMove: null,
      frameCounter: 0,
      comboCounter: 0,
      lastHitTime: 0,
      canCancel: false,
      inputBuffer: [],
      bufferTime: 0,
    };

    this.moveMap = new Map();
    for (const move of COMBO_MOVES) {
      this.moveMap.set(move.name, move);
    }
  }

  public update(delta: number, inputActions: GameAction[]): ComboMove | null {
    // Add to input buffer
    for (const action of inputActions) {
      this.context.inputBuffer.push(action);
    }

    // Decay buffer
    this.context.bufferTime += delta;
    if (this.context.bufferTime > 500) {
      this.context.inputBuffer = [];
      this.context.bufferTime = 0;
    }

    switch (this.context.currentState) {
      case ComboState.Idle:
        return this.processIdleState();

      case ComboState.Startup:
      case ComboState.Active:
        this.context.frameCounter++;
        return this.processActiveState();

      case ComboState.Recovery:
        this.context.frameCounter++;
        return this.processRecoveryState();

      case ComboState.Hitstun:
      case ComboState.Blockstun:
        this.context.frameCounter++;
        if (this.context.frameCounter >= (this.context.currentMove?.recoveryFrames || 0)) {
          this.resetToIdle();
        }
        return null;
    }

    return null;
  }

  private processIdleState(): ComboMove | null {
    // Check for move inputs
    const move = this.findMatchingMove(null);
    if (move) {
      return this.startMove(move);
    }
    return null;
  }

  private processActiveState(): ComboMove | null {
    const move = this.context.currentMove!;

    // Check if in cancel window
    if (this.context.canCancel && move.canCancel) {
      const cancelMove = this.findMatchingMove(move);
      if (cancelMove && move.cancelIntoMoves.includes(cancelMove.name)) {
        return this.startMove(cancelMove);
      }
    }

    // Transition to recovery after active frames
    if (this.context.frameCounter > move.hitboxFrames.end) {
      this.context.currentState = ComboState.Recovery;
      this.context.frameCounter = 0;
    }

    return null;
  }

  private processRecoveryState(): ComboMove | null {
    const move = this.context.currentMove!;

    // Check for buffered cancel
    if (this.context.inputBuffer.length > 0) {
      const cancelMove = this.findMatchingMove(move);
      if (cancelMove && move.cancelIntoMoves.includes(cancelMove.name)) {
        // Buffer the cancel for end of recovery
        this.context.canCancel = true;
      }
    }

    // Recovery complete
    if (this.context.frameCounter >= move.recoveryFrames) {
      if (this.context.canCancel) {
        const cancelMove = this.findMatchingMove(move);
        if (cancelMove) {
          return this.startMove(cancelMove);
        }
      }
      this.resetToIdle();
    }

    return null;
  }

  private findMatchingMove(currentMove: ComboMove | null): ComboMove | null {
    if (this.context.inputBuffer.length === 0) return null;

    // Check for special moves first (more inputs = higher priority)
    const sortedMoves = [...COMBO_MOVES].sort(
      (a, b) => b.inputs.length - a.inputs.length
    );

    for (const move of sortedMoves) {
      // Skip if we need to be in a cancel state for this move
      if (currentMove && !currentMove.cancelIntoMoves.includes(move.name)) {
        continue;
      }

      if (this.matchInputSequence(move.inputs)) {
        return move;
      }
    }

    return null;
  }

  private matchInputSequence(required: GameAction[]): boolean {
    const buffer = this.context.inputBuffer;
    if (buffer.length < required.length) return false;

    // Check last N inputs match
    const startIndex = buffer.length - required.length;
    for (let i = 0; i < required.length; i++) {
      if (buffer[startIndex + i] !== required[i]) {
        return false;
      }
    }

    return true;
  }

  private startMove(move: ComboMove): ComboMove {
    this.context.currentState = ComboState.Startup;
    this.context.currentMove = move;
    this.context.frameCounter = 0;
    this.context.canCancel = false;
    this.context.comboCounter++;
    this.context.inputBuffer = [];
    this.context.bufferTime = 0;

    return move;
  }

  private resetToIdle(): void {
    this.context.currentState = ComboState.Idle;
    this.context.currentMove = null;
    this.context.frameCounter = 0;
    this.context.canCancel = false;
    this.context.comboCounter = 0;
  }

  public onHit(): void {
    this.context.canCancel = true;
    this.context.lastHitTime = Date.now();
  }

  public enterHitstun(frames: number): void {
    this.context.currentState = ComboState.Hitstun;
    this.context.frameCounter = 0;
    // Store required frames in move for recovery check
  }

  public getState(): ComboState {
    return this.context.currentState;
  }

  public getCurrentMove(): ComboMove | null {
    return this.context.currentMove;
  }

  public getComboCount(): number {
    return this.context.comboCounter;
  }
}
```

### 6.3 Damage Calculator

```typescript
// src/combat/DamageCalculator.ts

import { DamageType, DamageResult, Vector2 } from '../core/types';

export interface AttackData {
  baseDamage: number;
  damageType: DamageType;
  critChance: number;
  critMultiplier: number;
  knockbackForce: number;
  knockbackAngle: number; // degrees, 0 = right
  canBeBlocked: boolean;
  canBeDeflected: boolean; // For projectiles
  armorPenetration: number; // 0-1, percentage
}

export interface DefenseData {
  armor: number;
  resistances: Partial<Record<DamageType, number>>; // 0-1, percentage reduction
  blockEfficiency: number; // 0-1, damage reduction when blocking
  isBlocking: boolean;
  isInvulnerable: boolean;
  currentHealth: number;
  maxHealth: number;
}

export class DamageCalculator {
  private readonly CRIT_VARIANCE = 0.1; // +/- 10% random variance

  public calculate(attack: AttackData, defense: DefenseData): DamageResult {
    // Invulnerability check
    if (defense.isInvulnerable) {
      return {
        finalDamage: 0,
        blocked: false,
        critical: false,
        lethal: false,
      };
    }

    // Block check
    if (defense.isBlocking && attack.canBeBlocked) {
      const blockDamage = attack.baseDamage * (1 - defense.blockEfficiency);
      return {
        finalDamage: Math.ceil(blockDamage),
        blocked: true,
        critical: false,
        lethal: false,
        knockback: this.calculateKnockback(attack, 0.5),
      };
    }

    // Calculate base damage
    let damage = attack.baseDamage;

    // Critical hit
    const isCritical = Math.random() < attack.critChance;
    if (isCritical) {
      damage *= attack.critMultiplier;
    }

    // Apply random variance
    const variance = 1 + (Math.random() * 2 - 1) * this.CRIT_VARIANCE;
    damage *= variance;

    // Apply armor (reduced by penetration)
    const effectiveArmor = defense.armor * (1 - attack.armorPenetration);
    damage = this.applyArmor(damage, effectiveArmor);

    // Apply resistance
    const resistance = defense.resistances[attack.damageType] || 0;
    damage *= (1 - resistance);

    // Floor damage
    const finalDamage = Math.max(1, Math.floor(damage));

    // Check lethal
    const lethal = finalDamage >= defense.currentHealth;

    return {
      finalDamage,
      blocked: false,
      critical: isCritical,
      lethal,
      knockback: this.calculateKnockback(attack, 1),
    };
  }

  private applyArmor(damage: number, armor: number): number {
    // Diminishing returns armor formula
    // At 100 armor, reduce damage by 50%
    const reduction = armor / (armor + 100);
    return damage * (1 - reduction);
  }

  private calculateKnockback(attack: AttackData, multiplier: number): Vector2 {
    const force = attack.knockbackForce * multiplier;
    const angleRad = (attack.knockbackAngle * Math.PI) / 180;

    return {
      x: Math.cos(angleRad) * force,
      y: Math.sin(angleRad) * force,
    };
  }

  /**
   * Calculate combo damage scaling.
   * Subsequent hits in a combo deal reduced damage.
   */
  public applyComboScaling(baseDamage: number, hitNumber: number): number {
    // Scaling: 100%, 90%, 80%, 70%, 60%, 50% (minimum)
    const scalingFactor = Math.max(0.5, 1 - (hitNumber - 1) * 0.1);
    return Math.floor(baseDamage * scalingFactor);
  }
}
```

---

## 7. State Management Patterns

### 7.1 Global Event Bus

```typescript
// src/core/EventBus.ts

type EventCallback = (...args: unknown[]) => void;

export class EventBus {
  private static instance: EventBus;
  private listeners: Map<string, Set<EventCallback>> = new Map();

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  public emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in event listener for "${event}":`, error);
      }
    });
  }

  public once(event: string, callback: EventCallback): void {
    const wrapper = (...args: unknown[]) => {
      this.off(event, wrapper);
      callback(...args);
    };
    this.on(event, wrapper);
  }
}

// Event type definitions for type safety
export enum GameEvent {
  // Combat events
  PlayerAttack = 'player:attack',
  PlayerHit = 'player:hit',
  PlayerDeath = 'player:death',
  EnemyDeath = 'enemy:death',
  ComboHit = 'combat:combo_hit',
  ComboEnd = 'combat:combo_end',

  // Game flow events
  SceneTransition = 'scene:transition',
  AreaChange = 'area:change',
  CheckpointReached = 'checkpoint:reached',

  // UI events
  HealthChanged = 'ui:health_changed',
  ForceChanged = 'ui:force_changed',
  ComboCounterUpdate = 'ui:combo_update',

  // Effect events
  SpawnEffect = 'effect:spawn',
  ScreenShake = 'effect:screen_shake',
}
```

### 7.2 Entity State Machine

```typescript
// src/core/StateMachine.ts

export interface State<T> {
  name: string;
  onEnter?(entity: T, previousState: string): void;
  onUpdate?(entity: T, delta: number): void;
  onExit?(entity: T, nextState: string): void;
}

export class StateMachine<T> {
  private states: Map<string, State<T>> = new Map();
  private currentState: State<T> | null = null;
  private entity: T;
  private stateHistory: string[] = [];
  private readonly MAX_HISTORY = 10;

  constructor(entity: T) {
    this.entity = entity;
  }

  public addState(state: State<T>): this {
    this.states.set(state.name, state);
    return this;
  }

  public setState(stateName: string): void {
    const newState = this.states.get(stateName);
    if (!newState) {
      console.warn(`State "${stateName}" not found`);
      return;
    }

    const previousStateName = this.currentState?.name || '';

    // Exit current state
    this.currentState?.onExit?.(this.entity, stateName);

    // Track history
    if (this.currentState) {
      this.stateHistory.push(this.currentState.name);
      if (this.stateHistory.length > this.MAX_HISTORY) {
        this.stateHistory.shift();
      }
    }

    // Enter new state
    this.currentState = newState;
    this.currentState.onEnter?.(this.entity, previousStateName);
  }

  public update(delta: number): void {
    this.currentState?.onUpdate?.(this.entity, delta);
  }

  public getCurrentState(): string {
    return this.currentState?.name || '';
  }

  public wasInState(stateName: string): boolean {
    return this.stateHistory.includes(stateName);
  }

  public getLastState(): string | null {
    return this.stateHistory[this.stateHistory.length - 1] || null;
  }
}

// Example: Player State Machine
export const createPlayerStateMachine = (player: Player) => {
  const sm = new StateMachine(player);

  sm.addState({
    name: 'idle',
    onEnter: (p) => {
      p.sprite.play('player_idle');
      p.velocity.set(0, 0);
    },
    onUpdate: (p, delta) => {
      // Check for state transitions
      if (p.inputManager.getMovementVector().x !== 0 ||
          p.inputManager.getMovementVector().y !== 0) {
        sm.setState('moving');
      }
      if (p.inputManager.justPressed(GameAction.AttackLight)) {
        sm.setState('attacking');
      }
      if (p.inputManager.justPressed(GameAction.Dodge)) {
        sm.setState('dodging');
      }
    },
  });

  sm.addState({
    name: 'moving',
    onEnter: (p) => {
      p.sprite.play('player_walk');
    },
    onUpdate: (p, delta) => {
      const movement = p.inputManager.getMovementVector();
      if (movement.x === 0 && movement.y === 0) {
        sm.setState('idle');
        return;
      }

      p.velocity.x = movement.x * p.speed;
      p.velocity.y = movement.y * p.speed;

      // Face direction
      if (movement.x !== 0) {
        p.sprite.setFlipX(movement.x < 0);
      }

      // Attack cancels movement
      if (p.inputManager.justPressed(GameAction.AttackLight)) {
        sm.setState('attacking');
      }
      if (p.inputManager.justPressed(GameAction.Dodge)) {
        sm.setState('dodging');
      }
    },
  });

  sm.addState({
    name: 'attacking',
    onEnter: (p) => {
      const move = p.comboSystem.update(0, [GameAction.AttackLight]);
      if (move) {
        p.sprite.play(move.animationKey);
      }
    },
    onUpdate: (p, delta) => {
      // Combo system handles attack logic
      const move = p.comboSystem.getCurrentMove();
      if (!move) {
        sm.setState('idle');
        return;
      }

      // Check for next combo input
      const newInputs: GameAction[] = [];
      if (p.inputManager.justPressed(GameAction.AttackLight)) {
        newInputs.push(GameAction.AttackLight);
      }
      if (p.inputManager.justPressed(GameAction.AttackHeavy)) {
        newInputs.push(GameAction.AttackHeavy);
      }

      p.comboSystem.update(delta, newInputs);
    },
    onExit: (p) => {
      p.hitboxManager.clearHitboxes(p.id);
    },
  });

  sm.addState({
    name: 'dodging',
    onEnter: (p, prevState) => {
      p.sprite.play('player_dodge');

      // Dodge in movement direction or facing direction
      const movement = p.inputManager.getMovementVector();
      const direction = movement.x !== 0 || movement.y !== 0
        ? movement
        : { x: p.sprite.flipX ? -1 : 1, y: 0 };

      p.dodgeVelocity.x = direction.x * p.dodgeSpeed;
      p.dodgeVelocity.y = direction.y * p.dodgeSpeed;

      // Invulnerability frames
      p.invulnerable = true;
      p.sprite.setAlpha(0.5);
    },
    onUpdate: (p, delta) => {
      p.dodgeTimer -= delta;
      if (p.dodgeTimer <= 0) {
        sm.setState('idle');
      }
    },
    onExit: (p) => {
      p.invulnerable = false;
      p.sprite.setAlpha(1);
      p.dodgeTimer = p.dodgeDuration;
    },
  });

  sm.addState({
    name: 'hit',
    onEnter: (p) => {
      p.sprite.play('player_hit');
      // Apply knockback from damage result
    },
    onUpdate: (p, delta) => {
      p.hitstunTimer -= delta;
      if (p.hitstunTimer <= 0) {
        sm.setState('idle');
      }
    },
  });

  sm.addState({
    name: 'blocking',
    onEnter: (p) => {
      p.sprite.play('player_block_start');
      p.isBlocking = true;
    },
    onUpdate: (p, delta) => {
      if (!p.inputManager.isPressed(GameAction.Block)) {
        sm.setState('idle');
      }

      // Transition to hold animation after start
      if (p.sprite.anims.currentAnim?.key === 'player_block_start' &&
          !p.sprite.anims.isPlaying) {
        p.sprite.play('player_block_hold');
      }
    },
    onExit: (p) => {
      p.isBlocking = false;
    },
  });

  return sm;
};

// Placeholder type
interface Player {
  id: string;
  sprite: Phaser.Physics.Arcade.Sprite;
  velocity: Phaser.Math.Vector2;
  speed: number;
  inputManager: InputManager;
  comboSystem: ComboSystem;
  hitboxManager: HitboxManager;
  dodgeSpeed: number;
  dodgeVelocity: Phaser.Math.Vector2;
  dodgeTimer: number;
  dodgeDuration: number;
  hitstunTimer: number;
  invulnerable: boolean;
  isBlocking: boolean;
}
```

---

## 8. Performance Optimization

### 8.1 Object Pooling Implementation

```typescript
// src/core/ObjectPool.ts

export interface Poolable {
  reset(): void;
  setActive(active: boolean): void;
  isActive(): boolean;
}

export class ObjectPool<T extends Poolable> {
  private pool: T[] = [];
  private active: T[] = [];
  private factory: () => T;
  private maxSize: number;

  constructor(factory: () => T, initialSize: number, maxSize: number) {
    this.factory = factory;
    this.maxSize = maxSize;

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      const obj = this.factory();
      obj.setActive(false);
      this.pool.push(obj);
    }
  }

  public acquire(): T | null {
    let obj: T;

    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else if (this.active.length < this.maxSize) {
      obj = this.factory();
    } else {
      // Pool exhausted
      console.warn('Object pool exhausted');
      return null;
    }

    obj.reset();
    obj.setActive(true);
    this.active.push(obj);

    return obj;
  }

  public release(obj: T): void {
    const index = this.active.indexOf(obj);
    if (index === -1) return;

    this.active.splice(index, 1);
    obj.setActive(false);
    this.pool.push(obj);
  }

  public releaseAll(): void {
    for (const obj of this.active) {
      obj.setActive(false);
      this.pool.push(obj);
    }
    this.active = [];
  }

  public getActiveCount(): number {
    return this.active.length;
  }

  public getAvailableCount(): number {
    return this.pool.length;
  }

  public forEach(callback: (obj: T) => void): void {
    for (const obj of this.active) {
      callback(obj);
    }
  }
}

// Example: Projectile Pool
export class ProjectilePool {
  private scene: Phaser.Scene;
  private group: Phaser.GameObjects.Group;

  constructor(scene: Phaser.Scene, maxSize: number = 100) {
    this.scene = scene;

    this.group = scene.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize,
      runChildUpdate: false,
      createCallback: (go) => {
        const sprite = go as Phaser.Physics.Arcade.Sprite;
        scene.physics.add.existing(sprite);
        sprite.setActive(false);
        sprite.setVisible(false);
      },
    });

    // Pre-create projectiles
    this.group.createMultiple({
      key: 'projectile',
      quantity: Math.floor(maxSize * 0.5),
      active: false,
      visible: false,
    });
  }

  public spawn(
    x: number,
    y: number,
    velocityX: number,
    velocityY: number,
    frame: string | number
  ): Phaser.Physics.Arcade.Sprite | null {
    const projectile = this.group.get(x, y) as Phaser.Physics.Arcade.Sprite | null;

    if (!projectile) return null;

    projectile.setActive(true);
    projectile.setVisible(true);
    projectile.setPosition(x, y);
    projectile.setFrame(frame);
    projectile.setVelocity(velocityX, velocityY);

    // Auto-despawn when off-screen
    projectile.setData('checkBounds', true);

    return projectile;
  }

  public despawn(projectile: Phaser.Physics.Arcade.Sprite): void {
    projectile.setActive(false);
    projectile.setVisible(false);
    projectile.setVelocity(0, 0);
    projectile.setPosition(-100, -100);
  }

  public update(): void {
    // Check bounds for auto-despawn
    const bounds = this.scene.cameras.main.getBounds();
    const margin = 50;

    this.group.getChildren().forEach((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) return;

      if (sprite.getData('checkBounds')) {
        if (sprite.x < bounds.x - margin ||
            sprite.x > bounds.x + bounds.width + margin ||
            sprite.y < bounds.y - margin ||
            sprite.y > bounds.y + bounds.height + margin) {
          this.despawn(sprite);
        }
      }
    });
  }

  public getGroup(): Phaser.GameObjects.Group {
    return this.group;
  }
}
```

### 8.2 Performance Monitoring

```typescript
// src/utils/PerformanceMonitor.ts

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  updateTime: number;
  renderTime: number;
  activeEntities: number;
  activeParticles: number;
  drawCalls: number;
  memoryUsage: number | null;
}

export class PerformanceMonitor {
  private scene: Phaser.Scene;
  private metrics: PerformanceMetrics;
  private updateTimes: number[] = [];
  private renderTimes: number[] = [];
  private readonly SAMPLE_SIZE = 60;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.metrics = {
      fps: 60,
      frameTime: 16.67,
      updateTime: 0,
      renderTime: 0,
      activeEntities: 0,
      activeParticles: 0,
      drawCalls: 0,
      memoryUsage: null,
    };
  }

  public startUpdate(): void {
    performance.mark('update-start');
  }

  public endUpdate(): void {
    performance.mark('update-end');
    performance.measure('update', 'update-start', 'update-end');

    const measure = performance.getEntriesByName('update').pop();
    if (measure) {
      this.updateTimes.push(measure.duration);
      if (this.updateTimes.length > this.SAMPLE_SIZE) {
        this.updateTimes.shift();
      }
    }

    performance.clearMarks();
    performance.clearMeasures();
  }

  public update(): void {
    const game = this.scene.game;

    this.metrics.fps = Math.round(game.loop.actualFps);
    this.metrics.frameTime = game.loop.delta;

    // Average update time
    if (this.updateTimes.length > 0) {
      this.metrics.updateTime = this.updateTimes.reduce((a, b) => a + b, 0)
        / this.updateTimes.length;
    }

    // Memory usage (if available)
    if ((performance as unknown as { memory?: { usedJSHeapSize: number } }).memory) {
      this.metrics.memoryUsage =
        (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize / 1024 / 1024;
    }

    // Count active entities (example)
    // this.metrics.activeEntities = this.scene.world.getActiveEntityCount();
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public logMetrics(): void {
    console.table(this.metrics);
  }
}
```

### 8.3 Optimization Best Practices

```typescript
// src/systems/OptimizedRenderSystem.ts

/**
 * Best practices for Phaser 3 performance:
 *
 * 1. Use sprite atlases instead of individual images
 * 2. Object pooling for frequently created/destroyed objects
 * 3. Disable physics bodies when not needed
 * 4. Use setActive(false) and setVisible(false) instead of destroy()
 * 5. Limit particle emitter quantities
 * 6. Use spatial partitioning for collision checks
 * 7. Avoid creating objects in update loops
 * 8. Cache references to frequently accessed objects
 * 9. Use integer positions for pixel art (roundPixels: true)
 * 10. Batch similar draw calls
 */

export class OptimizedRenderSystem {
  private scene: Phaser.Scene;

  // Cached references
  private camera!: Phaser.Cameras.Scene2D.Camera;
  private cameraBounds!: Phaser.Geom.Rectangle;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.cameraBounds = new Phaser.Geom.Rectangle();
  }

  /**
   * Cull sprites outside camera view.
   */
  public cullOffscreenSprites(sprites: Phaser.GameObjects.Sprite[]): void {
    // Update camera bounds once per frame
    this.cameraBounds.setTo(
      this.camera.scrollX - 50,
      this.camera.scrollY - 50,
      this.camera.width + 100,
      this.camera.height + 100
    );

    for (const sprite of sprites) {
      const inView = Phaser.Geom.Rectangle.ContainsPoint(
        this.cameraBounds,
        new Phaser.Geom.Point(sprite.x, sprite.y)
      );

      sprite.setVisible(inView);

      // Also disable physics for off-screen enemies
      if (sprite.body) {
        (sprite.body as Phaser.Physics.Arcade.Body).enable = inView;
      }
    }
  }

  /**
   * Spatial grid for efficient collision queries.
   */
  private spatialGrid: Map<string, Phaser.GameObjects.Sprite[]> = new Map();
  private readonly GRID_SIZE = 128;

  public updateSpatialGrid(sprites: Phaser.GameObjects.Sprite[]): void {
    this.spatialGrid.clear();

    for (const sprite of sprites) {
      if (!sprite.active) continue;

      const cellX = Math.floor(sprite.x / this.GRID_SIZE);
      const cellY = Math.floor(sprite.y / this.GRID_SIZE);
      const key = `${cellX},${cellY}`;

      if (!this.spatialGrid.has(key)) {
        this.spatialGrid.set(key, []);
      }
      this.spatialGrid.get(key)!.push(sprite);
    }
  }

  public getNearbySprites(x: number, y: number, radius: number): Phaser.GameObjects.Sprite[] {
    const results: Phaser.GameObjects.Sprite[] = [];
    const cellRadius = Math.ceil(radius / this.GRID_SIZE);

    const centerCellX = Math.floor(x / this.GRID_SIZE);
    const centerCellY = Math.floor(y / this.GRID_SIZE);

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const key = `${centerCellX + dx},${centerCellY + dy}`;
        const cell = this.spatialGrid.get(key);
        if (cell) {
          results.push(...cell);
        }
      }
    }

    return results;
  }
}
```

---

## 9. Asset Pipeline

### 9.1 Sprite Sheet Organization

```
assets/
  sprites/
    player/
      jedi_knight.png          # 512x512 sprite atlas
      jedi_knight.json         # Texture Packer JSON
    enemies/
      clone_trooper.png
      clone_trooper.json
      battle_droid.png
      battle_droid.json
      magna_guard.png
      magna_guard.json
    effects/
      lightsaber_effects.png   # Glow, sparks
      force_effects.png        # Push, pull, lightning base
      impact_effects.png       # Hit sparks, blocks
    environment/
      temple_tileset.png       # 16x16 or 32x32 tiles
      temple_props.png         # Pillars, consoles, debris
```

### 9.2 Animation Frame Recommendations

```typescript
// src/config/AnimationFrameGuide.ts

/**
 * Animation Frame Count Recommendations for Smooth Combat
 *
 * General Guidelines:
 * - 12 FPS minimum for idle/ambient animations
 * - 15-18 FPS for movement
 * - 18-24 FPS for combat (higher = snappier feel)
 * - Key poses: Anticipation -> Active -> Follow-through
 */

export const ANIMATION_FRAME_GUIDE = {
  // Movement animations
  idle: {
    frames: 4,
    fps: 8,
    notes: 'Subtle breathing, cloak movement',
  },
  walk: {
    frames: 8,
    fps: 12,
    notes: 'Full step cycle',
  },
  run: {
    frames: 8,
    fps: 14,
    notes: 'Dynamic movement, cape flow',
  },

  // Light attack chain (fast, responsive)
  attackLight1: {
    frames: 6,
    fps: 18,
    notes: '2 startup, 3 active, 1 recovery',
    hitboxFrames: [3, 4, 5],
  },
  attackLight2: {
    frames: 6,
    fps: 18,
    notes: '2 startup, 3 active, 1 recovery',
    hitboxFrames: [3, 4, 5],
  },
  attackLight3: {
    frames: 8,
    fps: 20,
    notes: 'Finisher: 2 startup, 4 active, 2 recovery',
    hitboxFrames: [3, 4, 5, 6],
  },

  // Heavy attacks (powerful, slower)
  attackHeavy1: {
    frames: 10,
    fps: 14,
    notes: '4 anticipation, 4 active, 2 recovery',
    hitboxFrames: [5, 6, 7, 8],
  },
  attackHeavy2: {
    frames: 12,
    fps: 14,
    notes: 'Big finisher: 5 anticipation, 5 active, 2 recovery',
    hitboxFrames: [6, 7, 8, 9, 10],
  },

  // Defensive
  blockStart: {
    frames: 3,
    fps: 20,
    notes: 'Quick transition to guard',
  },
  blockHold: {
    frames: 1,
    fps: 1,
    notes: 'Static hold pose',
  },
  blockDeflect: {
    frames: 5,
    fps: 20,
    notes: 'Parry animation when blocking attack',
  },
  dodge: {
    frames: 8,
    fps: 20,
    notes: 'Fast dash with i-frames on 2-6',
  },

  // Force powers
  forcePush: {
    frames: 10,
    fps: 16,
    notes: '4 charge, 3 release, 3 recovery',
  },
  forcePull: {
    frames: 10,
    fps: 16,
    notes: 'Mirror of push',
  },
  forceLightning: {
    frames: 6,
    fps: 12,
    notes: 'Looping channel animation',
  },

  // Reactions
  hit: {
    frames: 4,
    fps: 16,
    notes: 'Quick flinch reaction',
  },
  knockdown: {
    frames: 10,
    fps: 12,
    notes: 'Fall and hit ground',
  },
  getUp: {
    frames: 8,
    fps: 12,
    notes: 'Recovery from knockdown',
  },
  death: {
    frames: 16,
    fps: 12,
    notes: 'Dramatic death animation',
  },
};
```

### 9.3 Tilemap Structure

```typescript
// src/config/TilemapGuide.ts

/**
 * Tilemap Layer Structure for Temple Levels
 *
 * Use Tiled Map Editor for creation.
 * Export as JSON with embedded tilesets.
 */

export const TILEMAP_LAYERS = {
  // Visual layers (bottom to top)
  background: {
    zIndex: 0,
    collision: false,
    notes: 'Distant background elements, parallax',
  },
  floor: {
    zIndex: 10,
    collision: false,
    notes: 'Floor tiles, carpets, grates',
  },
  walls: {
    zIndex: 20,
    collision: true,
    notes: 'Collidable walls, pillars',
  },
  wallsUpper: {
    zIndex: 100, // Renders above player
    collision: false,
    notes: 'Wall tops that player walks behind',
  },
  decorations: {
    zIndex: 15,
    collision: false,
    notes: 'Props, consoles, debris',
  },
  decorationsUpper: {
    zIndex: 100,
    collision: false,
    notes: 'Overhanging decorations',
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
    ],
  },

  // Collision layer (invisible)
  collision: {
    notes: 'Additional collision shapes for complex geometry',
  },
};

/**
 * Tile Properties for Tiled
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
    notes: 'Type of damage if damaging',
  },
  sound: {
    type: 'string',
    default: '',
    notes: 'Footstep sound category',
  },
};
```

---

## 10. Implementation Roadmap

### Phase 1: Core Foundation (Week 1-2)

1. **Project Setup**
   - Initialize Vite + TypeScript project
   - Configure Phaser 3 with TypeScript
   - Set up p5.js instance mode
   - Establish folder structure

2. **Core Systems**
   - Implement EventBus
   - Create base Entity class
   - Build StateMachine utility
   - Set up ObjectPool system

3. **Basic Scene Flow**
   - BootScene (asset loading)
   - MainMenuScene
   - Basic GameScene

### Phase 2: Player & Combat (Week 3-4)

1. **Player Implementation**
   - Player entity with physics
   - State machine (idle, walk, attack)
   - Input handling (keyboard + gamepad)
   - Basic animations

2. **Combat Foundation**
   - Hitbox/Hurtbox system
   - Combo state machine
   - Damage calculator
   - Attack animations with frame data

3. **Effects Layer**
   - p5.js integration
   - Saber trail effect
   - Hit spark effects

### Phase 3: Enemies & AI (Week 5-6)

1. **Enemy System**
   - Base enemy class
   - Enemy state machines
   - Object pooling for enemies

2. **AI Behaviors**
   - Patrol behavior
   - Chase behavior
   - Attack patterns
   - Group coordination

3. **Combat Polish**
   - Block/parry system
   - Knockback physics
   - Hitstun/blockstun

### Phase 4: Temple Levels (Week 7-8)

1. **Tilemap Integration**
   - Load Tiled maps
   - Collision setup
   - Layer management

2. **Level Transitions**
   - Area loading/unloading
   - Checkpoint system
   - Camera transitions

3. **Environment**
   - Interactive props
   - Destructibles
   - Pickups

### Phase 5: Force Powers & Effects (Week 9-10)

1. **Force Powers**
   - Force Push
   - Force Pull
   - Force Lightning (p5.js)

2. **Visual Polish**
   - Screen shake
   - Hit stop (frame freeze)
   - Particle effects

3. **Performance**
   - Optimization pass
   - Profiling
   - Memory management

### Phase 6: Polish & Content (Week 11-12)

1. **UI Implementation**
   - Health bar
   - Force meter
   - Combo counter

2. **Content**
   - Multiple enemy types
   - Boss encounters
   - Full temple layout

3. **Final Polish**
   - Bug fixes
   - Balance tuning
   - Performance optimization

---

## References

### Phaser.js Resources
- [Phaser 3 Official Documentation](https://phaser.io/docs)
- [Phaser 3 TypeScript Template](https://github.com/digitsensitive/phaser3-typescript)
- [Object Pooling in Phaser 3](https://blog.ourcade.co/posts/2020/phaser-3-optimization-object-pool-basic/)
- [Phaser 3 Best Practices](https://phaser.discourse.group/t/what-are-phaser-3-bad-best-practices/5088)

### p5.js Resources
- [p5.js Instance Mode](https://github.com/processing/p5.js/wiki/Global-and-instance-mode)
- [p5.js TypeScript Setup](https://github.com/Gaweph/p5-typescript-starter)
- [p5i - Friendly Instance Mode](https://github.com/antfu/p5i)

### Combat System Design
- [Game Programming Patterns - State](https://gameprogrammingpatterns.com/state.html)
- [Character Logic State Machine](https://blog.ourcade.co/posts/2021/character-logic-state-machine-typescript/)
- [Hitbox Implementation in Phaser](https://phaser.discourse.group/t/how-to-alter-sprite-hitbox-in-sprite-animation/819)
- [LaliaSprite Hitbox Tool](https://github.com/Shadoworker/LaliaSprite)

### Performance
- [Phaser 3 Optimization Guide](https://franzeus.medium.com/how-i-optimized-my-phaser-3-action-game-in-2025-5a648753f62b)
- [Object Pooling for Performance](https://www.thepolyglotdeveloper.com/2020/09/object-pooling-sprites-phaser-game-performance-gains/)

---

*Document Version: 1.0*
*Last Updated: December 2024*
*Target Phaser Version: 3.90.x*
*Target p5.js Version: 2.x*
