# Temple March: Combat System UI/UX Specification

## AAA-Quality Combat Feedback Design Document

**Project**: Temple March - Order 66
**Version**: 1.0
**Date**: December 15, 2025
**Resolution**: 1280x720 (16:9)
**Framework**: Phaser.js 3.90 + p5.js overlay

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Color System](#2-color-system)
3. [Typography System](#3-typography-system)
4. [Combo Counter Display](#4-combo-counter-display)
5. [Damage Numbers](#5-damage-numbers)
6. [Hit Indicators](#6-hit-indicators)
7. [Health Bar Design](#7-health-bar-design)
8. [Force Meter Design](#8-force-meter-design)
9. [Enemy Health Bars](#9-enemy-health-bars)
10. [Combat State Indicators](#10-combat-state-indicators)
11. [Implementation Reference](#11-implementation-reference)

---

## 1. Design Philosophy

### 1.1 Vader Power Fantasy Principles

The UI must reinforce the **unstoppable juggernaut** fantasy:

| Principle | UI Application |
|-----------|----------------|
| **Overwhelming Power** | Large, aggressive combo numbers; enemies feel fragile |
| **Relentless Momentum** | Combo timer is generous; UI encourages continuous assault |
| **Dark Authority** | Imperial aesthetic - sharp edges, red accents, military precision |
| **Cinematic Weight** | Hit feedback is heavy and deliberate, not frantic |

### 1.2 Visual Hierarchy (Combat)

```
Priority 1 (Instant Read):  Combo Counter, Hit Markers
Priority 2 (Glanceable):    Health Bar, Force Meter
Priority 3 (Contextual):    Enemy HP, Damage Numbers
Priority 4 (Ambient):       State indicators, buffs
```

### 1.3 The "Vader Rule"

> Every UI element should make the player feel like they ARE Darth Vader - methodical, powerful, inevitable. Avoid frenetic anime-style feedback. Favor deliberate, heavy, and authoritative visual language.

---

## 2. Color System

### 2.1 Primary Combat Palette

| Color Name | Hex | RGB | Usage |
|------------|-----|-----|-------|
| Sith Red | #FF2020 | 255, 32, 32 | Critical hits, low HP warning |
| Imperial Crimson | #CC0000 | 204, 0, 0 | Health bar, damage taken |
| Vader Black | #0A0A0A | 10, 10, 10 | UI backgrounds, borders |
| Saber Red Core | #FF4444 | 255, 68, 68 | Lightsaber UI elements |
| Saber Red Glow | #FF0000 | 255, 0, 0 | Saber glow effects |

### 2.2 Force Power Palette

| Color Name | Hex | RGB | Usage |
|------------|-----|-----|-------|
| Force Blue | #4488FF | 68, 136, 255 | Force meter, Force damage |
| Force Purple | #8844FF | 136, 68, 255 | Force lightning, special |
| Force Glow | #6666FF | 102, 102, 255 | Force ready indicator |

### 2.3 Feedback Colors

| Color Name | Hex | RGB | Usage |
|------------|-----|-----|-------|
| Hit White | #FFFFFF | 255, 255, 255 | Hit flash, damage numbers |
| Combo Gold | #FFD700 | 255, 215, 0 | Combo multiplier, high combo |
| Critical Orange | #FF8800 | 255, 136, 0 | Critical hit numbers |
| Block Silver | #C0C0C0 | 192, 192, 192 | Blocked hits |
| Kill Red | #FF0044 | 255, 0, 68 | Lethal blow indicator |

### 2.4 Colorblind Accessibility

| Standard | Deuteranopia | Protanopia | Description |
|----------|--------------|------------|-------------|
| #FF2020 (Red) | #FFD700 (Gold) | #FFD700 (Gold) | Critical/danger |
| #4488FF (Blue) | #00BFFF (Cyan) | #00BFFF (Cyan) | Force/special |
| #00FF00 (Green) | #00FFFF (Cyan) | #FFFF00 (Yellow) | Health regen |

---

## 3. Typography System

### 3.1 Font Stack

```css
/* Primary UI Font - Sharp, military aesthetic */
--font-primary: 'Orbitron', 'Rajdhani', 'Share Tech', sans-serif;

/* Fallback for numbers */
--font-numbers: 'Oswald', 'Anton', 'Impact', sans-serif;

/* Web-safe fallback */
--font-fallback: 'Arial Black', 'Helvetica Neue', sans-serif;
```

### 3.2 Type Scale (px at 1280x720)

| Element | Size | Weight | Letter Spacing |
|---------|------|--------|----------------|
| Combo Number | 72px | 900 | -2px |
| Combo Label | 18px | 700 | 4px |
| Damage Number (Large) | 48px | 800 | 0 |
| Damage Number (Medium) | 32px | 700 | 0 |
| Damage Number (Small) | 24px | 600 | 0 |
| Bar Labels | 14px | 600 | 2px |
| Boss Name | 28px | 700 | 3px |

---

## 4. Combo Counter Display

### 4.1 Position & Layout

```
+------------------+
|                  |  Screen: 1280x720
|     [COMBO]      |
|       42         |  Position: Right side, vertically centered
|     x1.5         |
|                  |
+------------------+

Position:
  X: 1180 (100px from right edge)
  Y: 360 (vertically centered)
  Anchor: Center-right (1, 0.5)
```

### 4.2 Component Breakdown

```typescript
interface ComboCounterConfig {
  position: { x: 1180, y: 360 };
  anchor: { x: 1, y: 0.5 };

  // "COMBO" label
  label: {
    text: 'COMBO',
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 4,
    color: '#888888',
    offsetY: -50
  };

  // Main number
  number: {
    fontSize: 72,
    fontWeight: 900,
    color: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 4
  };

  // Multiplier (scaling indicator)
  multiplier: {
    fontSize: 24,
    fontWeight: 600,
    color: '#FFD700',
    offsetY: 45
  };
}
```

### 4.3 Animation States

#### On Hit (New Combo Count)

```typescript
const comboHitAnimation = {
  // Scale punch
  scale: {
    from: 1.3,
    to: 1.0,
    duration: 150,
    ease: 'back.out(2)'
  },

  // Color flash based on combo tier
  colorFlash: {
    tier1: { threshold: 1, color: '#FFFFFF' },   // 1-9 hits
    tier2: { threshold: 10, color: '#FFD700' },  // 10-24 hits
    tier3: { threshold: 25, color: '#FF8800' },  // 25-49 hits
    tier4: { threshold: 50, color: '#FF2020' }   // 50+ hits
  },

  // Shake on large combos (25+)
  shake: {
    threshold: 25,
    intensity: 3,
    duration: 100
  }
};
```

#### Combo Timer Decay

```typescript
const comboDecayConfig = {
  // Time before combo drops (generous for Vader fantasy)
  decayTime: 3000, // 3 seconds

  // Warning animation (last 1 second)
  warning: {
    startAt: 1000, // 1 second remaining
    pulseRate: 200, // ms per pulse
    scaleRange: [0.95, 1.05],
    opacityRange: [0.7, 1.0]
  },

  // On drop
  dropAnimation: {
    scale: { to: 0.5, duration: 200 },
    opacity: { to: 0, duration: 200 },
    ease: 'power2.in'
  }
};
```

### 4.4 Combo Tier Visual Escalation

| Combo Range | Background | Glow Effect | Particle Burst |
|-------------|------------|-------------|----------------|
| 1-9 | None | None | None |
| 10-24 | Subtle dark (#1A1A1A) | Soft white | Small sparks |
| 25-49 | Dark red (#330000) | Orange pulse | Medium flames |
| 50-99 | Deep red (#440000) | Red intense | Large flames |
| 100+ | Animated fire | Sith lightning crackle | Explosion |

### 4.5 Combo Scaling Display

```typescript
// Show damage scaling beneath multiplier
const scalingDisplay = {
  visible: true, // When combo > 5
  format: 'DMG: {percentage}%',

  // Scaling values from your spec
  scaling: [
    { hits: 1, percentage: 100 },
    { hits: 2, percentage: 90 },
    { hits: 3, percentage: 80 },
    { hits: 4, percentage: 70 },
    { hits: 5, percentage: 60 },
    { hits: 6, percentage: 50 }  // Minimum cap
  ],

  // Visual
  fontSize: 16,
  color: '#666666',
  offsetY: 70
};
```

---

## 5. Damage Numbers

### 5.1 Float Behavior

```typescript
interface DamageNumberConfig {
  // Spawn position (relative to hit entity)
  spawnOffset: {
    x: { min: -20, max: 20 },  // Randomized horizontal
    y: -30                      // Above target
  };

  // Float animation
  float: {
    distance: 60,              // Pixels upward
    duration: 800,             // ms
    ease: 'power2.out'
  };

  // Fade out
  fade: {
    startAt: 500,              // ms into animation
    duration: 300,
    ease: 'linear'
  };

  // Horizontal drift (adds dynamism)
  drift: {
    x: { min: -15, max: 15 },
    curve: 'sine.inOut'
  };
}
```

### 5.2 Damage Type Styling

#### Normal Physical Damage

```typescript
const normalDamageStyle = {
  fontSize: getDamageSize(damage), // See sizing function below
  fontWeight: 700,
  color: '#FFFFFF',
  stroke: {
    color: '#000000',
    width: 3
  },
  shadow: {
    color: '#000000',
    blur: 4,
    offsetX: 2,
    offsetY: 2
  }
};

// Size based on damage amount
function getDamageSize(damage: number): number {
  if (damage >= 100) return 48;      // Heavy/Boss damage
  if (damage >= 50) return 40;       // Medium damage
  if (damage >= 25) return 32;       // Light damage
  return 24;                          // Chip damage
}
```

#### Critical Hit Damage

```typescript
const criticalDamageStyle = {
  fontSize: getDamageSize(damage) * 1.25, // 25% larger
  fontWeight: 900,
  color: '#FF8800',
  stroke: {
    color: '#FF0000',
    width: 4
  },

  // Extra visual flair
  prefix: '',  // No text prefix - size/color is enough

  // Scale punch animation
  animation: {
    scaleFrom: 1.5,
    scaleTo: 1.0,
    duration: 200,
    ease: 'elastic.out(1, 0.5)'
  },

  // Particle burst
  particles: {
    count: 8,
    color: '#FF8800',
    spread: 360,
    speed: 100
  }
};
```

#### Force Damage

```typescript
const forceDamageStyle = {
  fontSize: getDamageSize(damage),
  fontWeight: 700,
  color: '#4488FF',
  stroke: {
    color: '#0022AA',
    width: 3
  },

  // Unique float pattern (more mystical)
  float: {
    distance: 80,
    duration: 1000,
    ease: 'sine.inOut',
    wobble: true  // Slight horizontal oscillation
  },

  // Force glow effect
  glow: {
    color: '#4488FF',
    blur: 8,
    strength: 0.6
  }
};
```

#### Blocked/Reduced Damage

```typescript
const blockedDamageStyle = {
  fontSize: 20,
  fontWeight: 600,
  color: '#888888',
  stroke: {
    color: '#444444',
    width: 2
  },

  // Shorter display time
  duration: 500,

  // Optional "BLOCKED" text for full blocks
  showBlockedText: true,
  blockedTextStyle: {
    text: 'BLOCKED',
    fontSize: 16,
    color: '#C0C0C0'
  }
};
```

### 5.3 Damage Number Stacking

```typescript
// Prevent visual clutter from rapid hits
const stackingConfig = {
  // Minimum time between spawning numbers on same target
  minInterval: 100, // ms

  // Stack rapid hits into combined number
  stackThreshold: 50, // ms
  stackDisplay: {
    showTotal: true,
    format: '{damage}', // Just show total
    comboIndicator: false // Don't show hit count
  },

  // Offset stacked numbers
  stackOffset: {
    y: -20, // Each stack 20px higher
    maxStack: 5
  }
};
```

---

## 6. Hit Indicators

### 6.1 Screen Flash

```typescript
interface ScreenFlashConfig {
  // Hit confirmation flash (enemy takes damage)
  hitConfirm: {
    color: 0xFFFFFF,
    alpha: 0.15,
    duration: 50,
    ease: 'linear'
  };

  // Critical hit flash
  criticalHit: {
    color: 0xFF8800,
    alpha: 0.25,
    duration: 100,
    ease: 'power2.out'
  };

  // Vader takes damage (rare, impactful)
  playerDamage: {
    color: 0xFF0000,
    alpha: 0.4,
    duration: 150,
    ease: 'power2.out',

    // Vignette effect
    vignette: {
      enabled: true,
      intensity: 0.3,
      duration: 300
    }
  };

  // Force power activation
  forceActivation: {
    color: 0x4488FF,
    alpha: 0.2,
    duration: 100,
    ease: 'power1.out'
  };
}
```

### 6.2 Screen Shake

```typescript
interface ScreenShakeConfig {
  // Light attack hit
  lightHit: {
    intensity: 0.003,
    duration: 50
  };

  // Heavy attack hit
  heavyHit: {
    intensity: 0.008,
    duration: 100
  };

  // Critical hit
  criticalHit: {
    intensity: 0.012,
    duration: 120
  };

  // Force Push
  forcePush: {
    intensity: 0.015,
    duration: 150,
    direction: 'horizontal' // Push direction emphasis
  };

  // Kill (final blow on enemy)
  kill: {
    intensity: 0.020,
    duration: 200
  };

  // Boss stagger
  bossStagger: {
    intensity: 0.025,
    duration: 300
  };
}

// Shake implementation helper
function applyScreenShake(
  camera: Phaser.Cameras.Scene2D.Camera,
  config: { intensity: number; duration: number; direction?: string }
): void {
  camera.shake(config.duration, config.intensity);
}
```

### 6.3 Hit Stop (Freeze Frames)

```typescript
interface HitStopConfig {
  // Light attack
  lightAttack: {
    duration: 0, // No hitstop - maintains flow
  };

  // Heavy attack
  heavyAttack: {
    duration: 50, // Subtle pause
    targetOnly: false // Both attacker and target freeze
  };

  // Critical hit
  critical: {
    duration: 80,
    targetOnly: false,

    // Camera zoom
    zoomPunch: {
      scale: 1.02,
      duration: 80,
      ease: 'power2.out'
    }
  };

  // Killing blow
  kill: {
    duration: 120,
    targetOnly: true, // Vader keeps moving

    // Slowmo alternative for bosses
    slowmo: {
      enabled: false, // Only for special kills
      timeScale: 0.3,
      duration: 300
    }
  };

  // Force powers (no hitstop - flows should feel effortless)
  force: {
    duration: 0
  };
}
```

### 6.4 Directional Hit Indicator

```typescript
interface DirectionalHitConfig {
  // Only shown when Vader takes damage
  enabled: true;

  // Visual style
  style: {
    type: 'arc', // Arc segment pointing to damage source
    color: 0xFF0000,
    alpha: 0.8,
    thickness: 8,

    // Position around screen edge
    radius: 100, // From screen center
    arcLength: 60 // Degrees
  };

  // Animation
  animation: {
    fadeIn: 50,
    hold: 200,
    fadeOut: 150,

    // Pulse for continuous damage
    pulseRate: 100
  };

  // Position calculation
  position: {
    // Arc appears on screen edge in direction of damage source
    offsetFromEdge: 50
  };
}
```

---

## 7. Health Bar Design (Vader)

### 7.1 Position & Dimensions

```typescript
const vaderHealthBar = {
  position: { x: 24, y: 24 },
  anchor: { x: 0, y: 0 },

  dimensions: {
    width: 280,
    height: 28,
    borderWidth: 3,
    borderRadius: 0 // Sharp corners - Imperial aesthetic
  },

  // Background
  background: {
    color: 0x1A1A1A,
    borderColor: 0x444444
  }
};
```

### 7.2 Bar Layers

```
+------------------------------------------+
| [BORDER: #444444, 3px]                   |
|  +--------------------------------------+|
|  | [BACKGROUND: #1A1A1A]                ||
|  |  +----------------------------------+||
|  |  | [DAMAGE PREVIEW: #FFFFFF @ 50%]  |||
|  |  |  +------------------------------+|||
|  |  |  | [CURRENT HP: Gradient]       ||||
|  |  |  +------------------------------+|||
|  |  +----------------------------------+||
|  +--------------------------------------+|
+------------------------------------------+
```

### 7.3 Health Bar Colors

```typescript
const healthBarColors = {
  // Main health gradient
  current: {
    type: 'horizontal-gradient',
    colors: [
      { stop: 0, color: 0xCC0000 },   // Dark red left
      { stop: 1, color: 0xFF2020 }    // Bright red right
    ]
  },

  // Damage preview (white bar showing pending damage)
  damagePreview: {
    color: 0xFFFFFF,
    alpha: 0.5,

    // Animation when taking damage
    catchUpDelay: 500, // ms before starting to shrink
    catchUpSpeed: 200  // Pixels per second
  },

  // Regen preview (shows incoming health)
  regenPreview: {
    color: 0x00FF00,
    alpha: 0.3
  },

  // Low health state
  lowHealth: {
    threshold: 0.25, // 25% HP

    // Pulse animation
    pulse: {
      rate: 500, // ms per pulse
      alphaRange: [0.6, 1.0],
      scaleRange: [1.0, 1.02]
    },

    // Color shift
    color: {
      type: 'horizontal-gradient',
      colors: [
        { stop: 0, color: 0x880000 },
        { stop: 1, color: 0xFF0000 }
      ]
    },

    // Screen vignette
    vignette: {
      color: 0xFF0000,
      intensity: 0.15,
      pulseSync: true
    }
  }
};
```

### 7.4 Health Bar Label

```typescript
const healthLabel = {
  text: 'VITALITY',
  position: { x: 24, y: 8 },
  style: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 3,
    color: '#888888'
  }
};

// Numeric display (optional - can be toggled)
const healthNumeric = {
  visible: false, // Default hidden for cleaner look
  format: '{current}/{max}',
  position: 'inside-right', // Inside bar, right aligned
  style: {
    fontSize: 14,
    fontWeight: 600,
    color: '#FFFFFF',
    shadow: true
  }
};
```

### 7.5 Damage Animation

```typescript
const healthDamageAnimation = {
  // Immediate bar reduction
  instant: {
    duration: 100,
    ease: 'power2.out'
  },

  // Shake on heavy damage
  shake: {
    threshold: 0.1, // 10% HP loss triggers shake
    intensity: 3,
    duration: 100
  },

  // Flash on damage
  flash: {
    color: 0xFFFFFF,
    duration: 100
  }
};
```

---

## 8. Force Meter Design

### 8.1 Position & Dimensions

```typescript
const forceMeter = {
  position: { x: 24, y: 60 },
  anchor: { x: 0, y: 0 },

  dimensions: {
    width: 220,
    height: 20,
    borderWidth: 2,
    borderRadius: 0
  },

  background: {
    color: 0x0A0A1A,
    borderColor: 0x333366
  }
};
```

### 8.2 Force Bar Colors

```typescript
const forceBarColors = {
  // Main Force gradient
  current: {
    type: 'horizontal-gradient',
    colors: [
      { stop: 0, color: 0x2244AA },   // Deep blue
      { stop: 1, color: 0x4488FF }    // Bright blue
    ]
  },

  // Depletion animation (when using Force)
  depletion: {
    flashColor: 0xFFFFFF,
    flashDuration: 50
  },

  // Regeneration visual
  regen: {
    // Subtle pulse on the leading edge
    pulseColor: 0x88AAFF,
    pulseWidth: 4,
    pulseSpeed: 1000 // ms per cycle
  },

  // "Force Ready" glow when full
  fullMeter: {
    glow: {
      color: 0x4488FF,
      blur: 8,
      pulseRate: 2000,
      pulseIntensity: [0.3, 0.6]
    }
  },

  // Low Force warning
  lowForce: {
    threshold: 0.2, // 20%
    color: 0x2244AA, // Dimmer
    noGlow: true
  }
};
```

### 8.3 Force Label

```typescript
const forceLabel = {
  text: 'THE FORCE',
  position: { x: 24, y: 56 },
  style: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 2,
    color: '#4488FF'
  }
};
```

### 8.4 Force Cost Preview

```typescript
// When hovering over Force ability or holding input
const forceCostPreview = {
  enabled: true,

  // Visual indicator showing how much will be consumed
  style: {
    color: 0xFF0000,
    alpha: 0.5,
    blinkRate: 300 // When insufficient Force
  },

  // Cost display
  costText: {
    visible: true,
    format: '-{cost}',
    position: 'above-bar',
    style: {
      fontSize: 14,
      color: '#FF4444'
    }
  }
};
```

### 8.5 Segmented Display (Optional)

```typescript
// Alternative: Segmented Force meter for discrete costs
const segmentedForce = {
  enabled: false, // Set true for segmented style

  segments: 5, // 5 segments of 20 Force each

  style: {
    segmentGap: 2,
    segmentBorderRadius: 0,

    // Per-segment colors
    filled: 0x4488FF,
    empty: 0x1A1A2A,
    partial: 0x223366
  }
};
```

---

## 9. Enemy Health Bars

### 9.1 Standard Enemy (Minion) Health Bar

```typescript
const minionHealthBar = {
  // Position above enemy sprite
  offset: { x: 0, y: -40 },
  anchor: { x: 0.5, y: 1 },

  dimensions: {
    width: 48,
    height: 6,
    borderWidth: 1,
    borderRadius: 0
  },

  colors: {
    background: 0x1A1A1A,
    border: 0x333333,
    health: 0xCC0000, // Simple red, no gradient for performance
    damage: 0xFFFFFF
  },

  // Visibility rules
  visibility: {
    showWhenFull: false,     // Hide at 100% HP
    showOnDamage: true,      // Show when damaged
    hideDelay: 3000,         // Hide after 3s of no damage
    fadeOutDuration: 500
  }
};
```

### 9.2 Elite Enemy (Jedi) Health Bar

```typescript
const eliteHealthBar = {
  offset: { x: 0, y: -50 },
  anchor: { x: 0.5, y: 1 },

  dimensions: {
    width: 64,
    height: 8,
    borderWidth: 2,
    borderRadius: 0
  },

  colors: {
    background: 0x1A1A1A,
    border: 0x666666, // Brighter border for elites
    health: {
      type: 'gradient',
      colors: [0xAA0000, 0xFF2020]
    },
    damage: 0xFFFFFF
  },

  // Name display
  nameTag: {
    visible: true,
    offset: { y: -8 },
    style: {
      fontSize: 10,
      color: '#AAAAAA'
    }
  },

  // Always visible when in combat
  visibility: {
    showWhenFull: true,
    alwaysShow: true
  }
};
```

### 9.3 Boss Health Bar

```typescript
const bossHealthBar = {
  // Screen position (not world position)
  position: { x: 640, y: 680 }, // Bottom center
  anchor: { x: 0.5, y: 1 },

  dimensions: {
    width: 600,
    height: 20,
    borderWidth: 3,
    borderRadius: 0
  },

  // Layered design
  layers: {
    // Decorative frame
    frame: {
      asset: 'boss_hp_frame', // Custom sprite
      fallbackColor: 0x333333
    },

    // Background
    background: 0x1A1A1A,

    // Health segments (multi-phase bosses)
    segments: {
      enabled: true,
      count: 3, // 3 health phases
      dividerColor: 0x000000,
      dividerWidth: 3
    },

    // Main health
    health: {
      type: 'gradient',
      colors: [0x880000, 0xFF0000, 0xFF4444]
    },

    // Damage preview
    damagePreview: {
      color: 0xFFFFFF,
      alpha: 0.4
    }
  },

  // Boss name
  name: {
    position: { y: -30 },
    style: {
      fontSize: 28,
      fontWeight: 700,
      letterSpacing: 3,
      color: '#FFD700', // Gold for bosses
      stroke: {
        color: '#000000',
        width: 4
      }
    }
  },

  // Boss title (subtitle)
  title: {
    position: { y: -8 },
    style: {
      fontSize: 14,
      fontWeight: 400,
      letterSpacing: 2,
      color: '#888888'
    }
  }
};
```

### 9.4 Stagger/Break Indicator

```typescript
const staggerIndicator = {
  // Posture/stagger bar (for blocking enemies like Temple Guards)
  postureBar: {
    enabled: true,
    offset: { x: 0, y: -32 }, // Below health bar

    dimensions: {
      width: 48,
      height: 4
    },

    colors: {
      background: 0x1A1A1A,
      posture: 0xFFD700, // Gold/yellow
      breaking: 0xFF8800 // Orange when about to break
    },

    // Shake when near break
    breakWarning: {
      threshold: 0.9, // 90% posture damage
      shake: {
        intensity: 2,
        rate: 50
      }
    }
  },

  // "BREAK" indicator on stagger
  breakPopup: {
    text: 'STAGGERED',
    style: {
      fontSize: 24,
      fontWeight: 900,
      color: '#FFD700',
      stroke: {
        color: '#000000',
        width: 3
      }
    },
    animation: {
      scaleFrom: 1.5,
      scaleTo: 1.0,
      duration: 300,
      floatUp: 30
    }
  }
};
```

---

## 10. Combat State Indicators

### 10.1 Attack Wind-Up Visual Cues

```typescript
const attackWindup = {
  // Player (Vader) - subtle, player knows their inputs
  player: {
    enabled: false // No wind-up indicator needed
  },

  // Enemy wind-up (telegraphing)
  enemy: {
    // Visual flash before attack
    flash: {
      color: 0xFFFF00, // Yellow warning
      alpha: 0.6,
      duration: 200,
      pulseCount: 2
    },

    // Exclamation indicator
    exclamation: {
      enabled: true,
      asset: 'exclamation_mark',
      position: { y: -60 },

      // Animation
      animation: {
        scaleFrom: 0,
        scaleTo: 1.2,
        duration: 150,
        bounce: true
      }
    },

    // Ground indicator for AoE attacks
    aoeIndicator: {
      type: 'circle', // or 'cone', 'rectangle'
      color: 0xFF0000,
      alpha: 0.3,
      borderColor: 0xFF4444,
      borderWidth: 2,
      fillAnimation: {
        duration: 500, // Fill time = charge time
        ease: 'linear'
      }
    }
  }
};
```

### 10.2 Invincibility/Dodge Feedback

```typescript
const invincibilityFeedback = {
  // During dash/dodge
  dash: {
    // Ghost trail
    ghostTrail: {
      enabled: true,
      count: 3,
      spacing: 50, // ms between ghosts
      alpha: [0.6, 0.4, 0.2],
      tint: 0x4444FF, // Slight blue tint
      fadeTime: 200
    },

    // Motion blur effect (p5.js layer)
    motionBlur: {
      enabled: true,
      samples: 5,
      strength: 0.3
    },

    // Player tint during i-frames
    iframeTint: {
      color: 0x8888FF,
      alpha: 0.3,
      blinkRate: 50
    }
  },

  // Perfect dodge (if implemented)
  perfectDodge: {
    flash: {
      color: 0xFFFFFF,
      screenAlpha: 0.2,
      duration: 100
    },
    slowmo: {
      timeScale: 0.3,
      duration: 300
    },
    text: {
      show: false // No text popup - visual feedback is enough
    }
  }
};
```

### 10.3 Hitstun State Visualization

```typescript
const hitstunFeedback = {
  // Enemy in hitstun
  enemy: {
    // Tint to indicate vulnerable state
    tint: {
      color: 0xFF8888, // Reddish
      alpha: 0.5
    },

    // Stagger animation (handled by sprite)
    useAnimationState: true,

    // Stars/dizzy effect for long stuns
    dizzyEffect: {
      threshold: 500, // ms of hitstun
      asset: 'stars',
      position: { y: -50 },
      rotation: true
    }
  },

  // Vader hitstun (rare - should feel impactful)
  player: {
    // Screen effects
    screen: {
      chromaticAberration: {
        enabled: true,
        intensity: 0.01,
        duration: 200
      },
      vignette: {
        color: 0xFF0000,
        intensity: 0.3
      }
    },

    // Controller rumble (if supported)
    rumble: {
      intensity: 0.5,
      duration: 150
    }
  }
};
```

### 10.4 Block State Indicator

```typescript
const blockIndicator = {
  // When Vader is blocking
  player: {
    // Shield/stance visual
    shieldEffect: {
      type: 'saber-guard', // Lightsaber in defensive position
      useAnimationState: true
    },

    // Successful block flash
    blockSuccess: {
      flash: {
        color: 0xFFFFFF,
        duration: 50
      },
      sparks: {
        count: 5,
        color: 0xFF4444,
        spread: 45
      },
      screenShake: {
        intensity: 0.002,
        duration: 30
      }
    }
  },

  // Enemy blocking Vader's attack
  enemy: {
    // Different visual for blocked attacks
    blockedHit: {
      damageNumber: {
        text: 'BLOCKED',
        color: '#888888',
        fontSize: 18
      },
      sparks: {
        count: 8,
        color: 0x4488FF, // Blue for Jedi blocks
        spread: 90
      },
      sound: 'saber_clash' // Audio cue
    }
  }
};
```

---

## 11. Implementation Reference

### 11.1 Phaser.js UI Layer Setup

```typescript
// UIScene.ts - Dedicated UI scene running parallel to GameScene

export class UIScene extends Phaser.Scene {
  private comboCounter!: ComboCounter;
  private healthBar!: HealthBar;
  private forceBar!: ForceBar;
  private damageNumberPool!: DamageNumberPool;

  constructor() {
    super({ key: 'UIScene', active: true });
  }

  create(): void {
    // UI elements are created here
    this.comboCounter = new ComboCounter(this, 1180, 360);
    this.healthBar = new HealthBar(this, 24, 24, 280, 28);
    this.forceBar = new ForceBar(this, 24, 60, 220, 20);
    this.damageNumberPool = new DamageNumberPool(this, 50);

    // Listen for events from GameScene
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const eventBus = EventBus.getInstance();

    eventBus.on('combat:hit', (data) => {
      this.comboCounter.increment();
      this.damageNumberPool.spawn(data.position, data.damage, data.type);
      this.applyHitFeedback(data);
    });

    eventBus.on('player:damage', (data) => {
      this.healthBar.setHealth(data.current, data.max);
      this.applyDamageFeedback(data);
    });

    eventBus.on('player:force', (data) => {
      this.forceBar.setForce(data.current, data.max);
    });
  }
}
```

### 11.2 Combo Counter Implementation

```typescript
// src/ui/ComboCounter.ts

export class ComboCounter {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private label: Phaser.GameObjects.Text;
  private number: Phaser.GameObjects.Text;
  private multiplier: Phaser.GameObjects.Text;

  private count: number = 0;
  private decayTimer: Phaser.Time.TimerEvent | null = null;
  private readonly DECAY_TIME = 3000;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.createElements(x, y);
  }

  private createElements(x: number, y: number): void {
    this.container = this.scene.add.container(x, y);
    this.container.setDepth(100);
    this.container.setAlpha(0); // Hidden initially

    // COMBO label
    this.label = this.scene.add.text(0, -50, 'COMBO', {
      fontFamily: 'Arial Black',
      fontSize: '18px',
      color: '#888888',
    }).setOrigin(1, 0.5);

    // Main number
    this.number = this.scene.add.text(0, 0, '0', {
      fontFamily: 'Arial Black',
      fontSize: '72px',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(1, 0.5);

    // Multiplier
    this.multiplier = this.scene.add.text(0, 45, 'x1.0', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#FFD700',
    }).setOrigin(1, 0.5);

    this.container.add([this.label, this.number, this.multiplier]);
  }

  increment(): void {
    this.count++;
    this.number.setText(this.count.toString());

    // Update multiplier based on scaling
    const scale = this.getScaling();
    this.multiplier.setText(`DMG: ${Math.round(scale * 100)}%`);

    // Show if hidden
    if (this.container.alpha === 0) {
      this.scene.tweens.add({
        targets: this.container,
        alpha: 1,
        duration: 150,
      });
    }

    // Scale punch animation
    this.scene.tweens.add({
      targets: this.number,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 50,
      yoyo: true,
      ease: 'back.out',
    });

    // Update color based on tier
    this.updateTierColor();

    // Reset decay timer
    this.resetDecayTimer();
  }

  private getScaling(): number {
    const scalingTable = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5];
    const index = Math.min(this.count - 1, scalingTable.length - 1);
    return scalingTable[Math.max(0, index)];
  }

  private updateTierColor(): void {
    if (this.count >= 50) {
      this.number.setColor('#FF2020');
    } else if (this.count >= 25) {
      this.number.setColor('#FF8800');
    } else if (this.count >= 10) {
      this.number.setColor('#FFD700');
    } else {
      this.number.setColor('#FFFFFF');
    }
  }

  private resetDecayTimer(): void {
    if (this.decayTimer) {
      this.decayTimer.destroy();
    }

    this.decayTimer = this.scene.time.addEvent({
      delay: this.DECAY_TIME,
      callback: this.onDecay,
      callbackScope: this,
    });
  }

  private onDecay(): void {
    // Fade out and reset
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scale: 0.5,
      duration: 200,
      onComplete: () => {
        this.count = 0;
        this.number.setText('0');
        this.container.setScale(1);
      },
    });
  }

  destroy(): void {
    this.container.destroy();
  }
}
```

### 11.3 Damage Number Pool Implementation

```typescript
// src/ui/DamageNumberPool.ts

interface DamageNumber {
  text: Phaser.GameObjects.Text;
  active: boolean;
}

export class DamageNumberPool {
  private scene: Phaser.Scene;
  private pool: DamageNumber[] = [];

  constructor(scene: Phaser.Scene, poolSize: number = 50) {
    this.scene = scene;
    this.initPool(poolSize);
  }

  private initPool(size: number): void {
    for (let i = 0; i < size; i++) {
      const text = this.scene.add.text(0, 0, '', {
        fontFamily: 'Arial Black',
        fontSize: '32px',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 3,
      });
      text.setOrigin(0.5);
      text.setDepth(110);
      text.setActive(false);
      text.setVisible(false);

      this.pool.push({ text, active: false });
    }
  }

  spawn(
    position: { x: number; y: number },
    damage: number,
    type: 'normal' | 'critical' | 'force' | 'blocked' = 'normal'
  ): void {
    const damageNum = this.pool.find(d => !d.active);
    if (!damageNum) return;

    damageNum.active = true;
    const text = damageNum.text;

    // Position with random offset
    const offsetX = Phaser.Math.Between(-20, 20);
    text.setPosition(position.x + offsetX, position.y - 30);

    // Style based on type
    const style = this.getStyle(type, damage);
    text.setText(damage.toString());
    text.setFontSize(style.fontSize);
    text.setColor(style.color);
    text.setStroke(style.stroke, style.strokeWidth);

    text.setActive(true);
    text.setVisible(true);
    text.setAlpha(1);
    text.setScale(type === 'critical' ? 1.5 : 1);

    // Float animation
    this.scene.tweens.add({
      targets: text,
      y: text.y - 60,
      alpha: 0,
      scale: type === 'critical' ? 1.0 : 0.8,
      duration: 800,
      ease: 'power2.out',
      onComplete: () => {
        damageNum.active = false;
        text.setActive(false);
        text.setVisible(false);
      },
    });
  }

  private getStyle(type: string, damage: number): {
    fontSize: number;
    color: string;
    stroke: string;
    strokeWidth: number;
  } {
    const baseSize = damage >= 100 ? 48 : damage >= 50 ? 40 : damage >= 25 ? 32 : 24;

    switch (type) {
      case 'critical':
        return {
          fontSize: baseSize * 1.25,
          color: '#FF8800',
          stroke: '#FF0000',
          strokeWidth: 4,
        };
      case 'force':
        return {
          fontSize: baseSize,
          color: '#4488FF',
          stroke: '#0022AA',
          strokeWidth: 3,
        };
      case 'blocked':
        return {
          fontSize: 20,
          color: '#888888',
          stroke: '#444444',
          strokeWidth: 2,
        };
      default:
        return {
          fontSize: baseSize,
          color: '#FFFFFF',
          stroke: '#000000',
          strokeWidth: 3,
        };
    }
  }

  destroy(): void {
    this.pool.forEach(d => d.text.destroy());
    this.pool = [];
  }
}
```

### 11.4 Hit Feedback System

```typescript
// src/systems/HitFeedbackSystem.ts

export class HitFeedbackSystem {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
  }

  applyHitFeedback(type: 'light' | 'heavy' | 'critical' | 'kill'): void {
    switch (type) {
      case 'light':
        this.screenShake(0.003, 50);
        this.screenFlash(0xFFFFFF, 0.15, 50);
        break;

      case 'heavy':
        this.screenShake(0.008, 100);
        this.screenFlash(0xFFFFFF, 0.2, 80);
        this.hitStop(50);
        break;

      case 'critical':
        this.screenShake(0.012, 120);
        this.screenFlash(0xFF8800, 0.25, 100);
        this.hitStop(80);
        this.zoomPunch(1.02, 80);
        break;

      case 'kill':
        this.screenShake(0.020, 200);
        this.screenFlash(0xFF0044, 0.3, 150);
        this.hitStop(120);
        break;
    }
  }

  private screenShake(intensity: number, duration: number): void {
    this.camera.shake(duration, intensity);
  }

  private screenFlash(color: number, alpha: number, duration: number): void {
    this.camera.flash(duration,
      (color >> 16) & 0xFF,
      (color >> 8) & 0xFF,
      color & 0xFF,
      true
    );
  }

  private hitStop(duration: number): void {
    // Pause physics briefly
    this.scene.physics.pause();
    this.scene.time.delayedCall(duration, () => {
      this.scene.physics.resume();
    });
  }

  private zoomPunch(scale: number, duration: number): void {
    const originalZoom = this.camera.zoom;
    this.scene.tweens.add({
      targets: this.camera,
      zoom: originalZoom * scale,
      duration: duration / 2,
      yoyo: true,
      ease: 'power2.out',
    });
  }

  applyDamageFeedback(): void {
    // Red flash when Vader takes damage
    this.screenFlash(0xFF0000, 0.4, 150);
    this.screenShake(0.015, 100);

    // Vignette effect
    this.applyVignette(0xFF0000, 0.3, 300);
  }

  private applyVignette(color: number, intensity: number, duration: number): void {
    // Create vignette overlay (would be better with shader)
    const vignette = this.scene.add.graphics();
    vignette.setDepth(90);

    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    // Radial gradient approximation
    for (let i = 0; i < 10; i++) {
      const alpha = (intensity / 10) * (10 - i);
      vignette.fillStyle(color, alpha);
      vignette.fillRect(0, 0, width * 0.1 * (10 - i), height);
      vignette.fillRect(width - width * 0.1 * (10 - i), 0, width * 0.1 * (10 - i), height);
      vignette.fillRect(0, 0, width, height * 0.1 * (10 - i));
      vignette.fillRect(0, height - height * 0.1 * (10 - i), width, height * 0.1 * (10 - i));
    }

    this.scene.tweens.add({
      targets: vignette,
      alpha: 0,
      duration: duration,
      onComplete: () => vignette.destroy(),
    });
  }
}
```

### 11.5 Event Types Reference

```typescript
// src/core/events/CombatEvents.ts

export interface CombatHitEvent {
  type: 'combat:hit';
  data: {
    attackerId: number;
    defenderId: number;
    damage: number;
    damageType: 'normal' | 'critical' | 'force' | 'blocked';
    position: { x: number; y: number };
    isKill: boolean;
    comboCount: number;
  };
}

export interface PlayerDamageEvent {
  type: 'player:damage';
  data: {
    current: number;
    max: number;
    damage: number;
    source: { x: number; y: number };
  };
}

export interface PlayerForceEvent {
  type: 'player:force';
  data: {
    current: number;
    max: number;
    change: number;
  };
}

export interface ComboEvent {
  type: 'combat:combo';
  data: {
    count: number;
    scaling: number;
    dropped: boolean;
  };
}
```

---

## Performance Considerations

### Object Pooling Requirements

| Element | Recommended Pool Size | Notes |
|---------|----------------------|-------|
| Damage Numbers | 50 | High spawn rate |
| Hit Particles | 100 | Multiple per hit |
| Enemy HP Bars | 20 | Max visible enemies |
| UI Tweens | Reuse | Don't create new tweens |

### Draw Call Budget

| UI Element | Max Draw Calls |
|------------|----------------|
| Combo Counter | 3 |
| Health/Force Bars | 4 |
| Damage Numbers (all) | 10 |
| Enemy HP Bars (all) | 20 |
| **Total UI Budget** | ~40 |

### Update Frequency

| Element | Update Rate |
|---------|-------------|
| Combo Counter | On-event only |
| Health Bar | On-event + 60fps smoothing |
| Force Bar | 60fps (regen animation) |
| Damage Numbers | 60fps (animation) |
| Enemy HP Bars | On-event only |

---

## Accessibility Checklist

- [ ] All critical colors have high contrast alternatives
- [ ] Screen shake can be reduced/disabled
- [ ] Screen flash intensity is configurable
- [ ] UI scale option (100%, 125%, 150%)
- [ ] Colorblind mode toggle
- [ ] Hit indicator shapes differ from colors
- [ ] Combo counter uses size, not just color
- [ ] Low HP warning has non-color indicator (pulse)
