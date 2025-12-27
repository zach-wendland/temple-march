# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Temple March is a Star Wars-themed 2D action game where you play as Darth Vader during Order 66 (Operation Knightfall). Built with Phaser.js for core game logic and p5.js for procedural visual effects.

## Commands

```bash
# Development
npm run dev          # Start Vite dev server with HMR

# Build
npm run build        # TypeScript compile + Vite build

# Testing
npm test             # Run all tests once
npm run test:watch   # Run tests in watch mode
npx vitest run tests/ai/AIBehavior.test.ts  # Run single test file
npm run test:coverage  # Run with coverage report

# Preview production build
npm run preview
```

## Architecture

### Dual-Framework Design
- **Phaser.js** (primary): Game loop, physics, sprite rendering, input handling, collision detection
- **p5.js** (effects overlay): Procedural effects rendered on transparent canvas above Phaser - Force lightning, saber trails, Force waves, dark side aura

### Core System Interactions
```
Player -> InputManager -> StateMachine -> CombatManager -> EventBus -> UI
                                       -> ComboSystem
Enemies -> AIBehavior -> SquadCoordinator -> CombatManager
```

### Key Patterns
- **State Machines**: Player and enemies use `StateMachine<Context>` from `src/systems/combat/StateMachine.ts` for explicit state management
- **Event-Driven**: `EventBus` (`src/core/events/EventBus.ts`) decouples systems via typed events
- **Object Pooling**: `ObjectPool<T>` (`src/core/ObjectPool.ts`) minimizes GC for projectiles, effects, damage numbers
- **Pluggable AI Behaviors**: Enemies use composable `AIBehavior` interface with behaviors like `PatrolBehavior`, `AggressiveMeleeBehavior`, `CautiousRangedBehavior`

### Directory Structure
```
src/
├── ai/              # AI behaviors and squad coordination
├── combat/          # Combat systems (CombatManager, ComboSystem, HitboxManager, BlockParry, Stun, Knockback)
├── config/          # Game balance and configuration (GameConfig, BalanceConfig)
├── core/            # Core types, EventBus, EffectsLayer, ObjectPool
├── entities/        # Player and enemies (BaseEnemy subclasses: JediDefender, TempleGuard, CloneTrooper, CinDrallig boss)
├── force/           # Force power systems (ForceSystem, HitStop, ScreenShake)
├── input/           # InputManager and key mappings
├── levels/          # Level management, tilemaps, checkpoints, pickups, boss encounters
├── scenes/          # Phaser scenes (Boot, MainMenu, Game, TempleLevel)
├── systems/         # State machine implementation
├── ui/              # HUD components (health bars, combo counter, damage numbers)
└── utils/           # Utility functions
```

### Entity Hierarchy
- `Player`: Single player entity with full combat and Force powers
- `BaseEnemy` -> `JediDefender`, `TempleGuard`, `CloneTrooper` (ally)
- `CinDrallig`: Boss enemy with special phase-based behavior

### Combat System
- Damage flows through `CombatManager.registerAttack()` -> hitbox collision -> `DamageCalculator.calculateDamage()` -> events
- `ComboSystem` tracks player input sequences for combo attacks
- Block/parry window system in `BlockParrySystem`
- Hitstun and knockback handled by dedicated systems

### Path Aliases (configured in tsconfig.json and vitest.config.ts)
```
@core/*     -> src/core/*
@combat/*   -> src/combat/*
@entities/* -> src/entities/*
@ai/*       -> src/ai/*
@scenes/*   -> src/scenes/*
@config/*   -> src/config/*
```

## Testing

Tests mirror source structure in `tests/`. Vitest runs in Node environment with globals enabled.

When adding new systems, add corresponding test file in `tests/<directory>/<SystemName>.test.ts`.
