# Order 66 March Sequence - Lighting & Atmosphere Direction

## Art Direction Document
**Project**: Temple March
**Version**: 1.0
**Date**: December 14, 2025
**Author**: Art Direction Team

---

## Table of Contents

1. [Overview & Cinematic Philosophy](#1-overview--cinematic-philosophy)
2. [Color Palette Progression](#2-color-palette-progression)
3. [Mood Transitions](#3-mood-transitions)
4. [Visual Storytelling Elements](#4-visual-storytelling-elements)
5. [Technical Implementation](#5-technical-implementation)
6. [Reference Sources](#6-reference-sources)

---

## 1. Overview & Cinematic Philosophy

### 1.1 Core Visual Thesis

This sequence draws from two primary cinematic influences:

1. **The Godfather's Baptism Sequence** - George Lucas explicitly modeled Order 66 after the climactic killings montage in Coppola's masterpiece. The parallel editing, the contrast between sacred ritual and brutal violence, the inevitability of tragedy.

2. **German Expressionism (Nosferatu, Metropolis)** - Lucas draws from silent cinema masters, using light and shadow to externalize internal psychological states. Morality is codified through color, especially in lightsaber hues.

### 1.2 Guiding Principles

| Principle | Application |
|-----------|-------------|
| **Show, Don't Tell** | Lucas is a visual auteur who fills frames with light, shadow, and detail that confound the senses |
| **Color as Morality** | Red/orange = corruption, Blue = night/cold truth, Gold = sacred (lost), White = purity (destroyed) |
| **Composition as Foreboding** | Characters appear in relation to setting to create sense of impending tragedy |
| **Operatic Scale** | This is grand tragedy, not action schlock - every lighting choice serves the emotional arc |

### 1.3 The Emotional Arc

```
TENSE ANTICIPATION → DETERMINED MARCH → BRUTAL EFFICIENCY → TRAGIC CLIMAX → HOLLOW VICTORY
      Senate            Streets          Staircase           Temple         Aftermath
```

---

## 2. Color Palette Progression

### 2.1 Scene 1: Senate Chamber - "The Naming"

**Primary Palette**: Sith Corruption

| Element | Color | Hex | RGB | Purpose |
|---------|-------|-----|-----|---------|
| Key Light | Crimson Red | #8B0000 | 139, 0, 0 | Palpatine's corruption |
| Fill Light | Blood Orange | #CC5500 | 204, 85, 0 | Dark side energy |
| Accent | Sith Lightning Purple | #4B0082 | 75, 0, 130 | Force corruption sparks |
| Shadow | Volcanic Black | #1A0A0A | 26, 10, 10 | Oppressive darkness |
| Highlight | Ember Gold | #FFD700 | 255, 215, 0 | Palpatine's robes (ironic "gold") |

**Lighting Setup**:
- Single strong key light from below/side (Palpatine's desk holo-projector)
- Creates demonic uplighting on faces
- Shadows stretch unnaturally upward
- Reference: Classic villain lighting, Murnau's Nosferatu ascending stairs

**Atmospheric Effects**:
- Subtle smoke/haze from recent Force lightning
- Dust motes catching red light
- No natural light - windows show only the burning city

**Implementation Notes**:
```typescript
// Scene lighting configuration
const senateChamberLighting = {
  ambient: { color: 0x1A0A0A, intensity: 0.1 },
  keyLight: {
    color: 0x8B0000,
    intensity: 1.5,
    position: { x: 0, y: -1, z: 0.5 }, // Below, slightly forward
    castShadow: true
  },
  fillLight: {
    color: 0xCC5500,
    intensity: 0.4,
    position: { x: 1, y: 0.5, z: -1 }
  },
  rimLight: {
    color: 0x4B0082,
    intensity: 0.2,
    // Subtle purple edge on figures
  }
};
```

---

### 2.2 Scene 2: Coruscant Streets - "The March Begins"

**Primary Palette**: Urban Night / Teal-Orange Contrast

| Element | Color | Hex | RGB | Purpose |
|---------|-------|-----|-----|---------|
| Sky/Ambient | Deep Night Blue | #0A1628 | 10, 22, 40 | Cold truth of night |
| City Lights | Sodium Orange | #FF6B35 | 255, 107, 53 | Urban warmth (false safety) |
| Clone Armor | Cool White | #E8E8F0 | 232, 232, 240 | Military precision |
| 501st Markings | Legion Blue | #0066CC | 0, 102, 204 | Identity / irony |
| Vader Silhouette | Pure Black | #000000 | 0, 0, 0 | Death walks among them |
| Building Windows | Amber Glow | #FFBF00 | 255, 191, 0 | Lives unaware of doom |

**Lighting Setup**:
- Classic "teal and orange" cinematography
- Skin tones read warm against cold shadows
- Creates visual tension and "cinematic pop"
- Reference: Mad Max: Fury Road, The Dark Knight night sequences

**Why Teal-Orange Works**:
> "Skin tones are orange, and shadows and skies are teal. This creates contrast and visual punch, resulting in high energy, cinematic tension, and vibrancy."

**Atmospheric Effects**:
- Light rain beginning (foreshadowing)
- Rain MUST be backlit to be visible
- Wet ground reflections (doubles light sources)
- Distant emergency vehicle lights
- Haze from city emissions

**Rain Lighting Rules**:
```typescript
// Rain visibility requires backlighting
const rainConfig = {
  backlight: {
    color: 0xFF6B35, // Orange streetlight
    intensity: 2.0,  // Strong to catch droplets
    angle: 135       // Behind rain relative to camera
  },
  dropletSize: 2,
  density: 0.6,
  windAngle: 15,     // Slight wind
  groundReflection: {
    enabled: true,
    wetness: 0.7
  }
};
```

---

### 2.3 Scene 3: Temple Staircase - "The Approach"

**Primary Palette**: Dramatic Silhouette / Baroque Chiaroscuro

| Element | Color | Hex | RGB | Purpose |
|---------|-------|-----|-----|---------|
| Temple Backlight | Sacred Gold | #FFD93D | 255, 217, 61 | The light they march to destroy |
| Clone Silhouettes | Absolute Black | #000000 | 0, 0, 0 | Faceless death |
| Vader Silhouette | Void Black | #000000 | 0, 0, 0 | Center of darkness |
| Step Edges | Rim White | #FFFFFF | 255, 255, 255 | Defining form in shadow |
| Sky Behind | Bruised Purple | #2D1B4E | 45, 27, 78 | Storm approaching |

**Lighting Setup**:
- **Pure silhouette lighting** - light source directly behind Temple
- Single strong backlight creating figure outlines
- Minimal fill - we see only shapes, not faces
- Reference: Nosferatu stair climb, samurai films, film noir

**Silhouette Cinematography Rules**:
> "Position the light source behind your subject ensuring it remains brighter than the light on the subject itself. Underexpose by one or two stops to increase contrast and capture a complete silhouette."

**The March Rhythm**:
- Clones in perfect formation - geometric shadows
- Vader slightly forward of center - the point of the spear
- Temple gates glow with warm light (soon to be extinguished)
- Thunder flashes illuminate momentarily - reveals faces briefly (horror beat)

**Implementation Notes**:
```typescript
const staircaseLighting = {
  // Primary backlight from temple entrance
  backlight: {
    color: 0xFFD93D,
    intensity: 3.0,
    position: { x: 0, y: 2, z: -10 },
    castShadow: false // Backlight doesn't cast forward shadows
  },
  // Environment
  ambient: { color: 0x2D1B4E, intensity: 0.05 },
  // Rim light for figure definition
  rimLight: {
    color: 0xFFFFFF,
    intensity: 0.3,
    // Edge-only, no fill
  },
  // Lightning flashes (timed events)
  lightningFlash: {
    color: 0xFFFFFF,
    intensity: 5.0,
    duration: 150,  // milliseconds
    decay: 'exponential'
  }
};
```

---

### 2.4 Scene 4: Temple Interior - "The Massacre"

**Primary Palette**: Gold-to-Red Transition

This scene undergoes the most dramatic color shift, representing the corruption of a sacred space.

#### Phase A: Initial Breach (0:00 - 0:30)

| Element | Color | Hex | RGB | Purpose |
|---------|-------|-----|-----|---------|
| Ambient | Temple Gold | #FFD700 | 255, 215, 0 | Sacred peace (for now) |
| Holocron Glow | Jedi Blue | #00BFFF | 0, 191, 255 | Knowledge, wisdom |
| Architecture | Warm Sandstone | #D4A574 | 212, 165, 116 | Ancient, sacred |
| Jedi Robes | Earth Brown | #8B7355 | 139, 115, 85 | Humble, natural |
| Vader's Saber | Jedi Blue | #0080FF | 0, 128, 255 | Tragic irony - still blue |

#### Phase B: Combat Begins (0:30 - 1:30)

| Element | Color | Hex | RGB | Purpose |
|---------|-------|-----|-----|---------|
| Blaster Fire | Hot Orange | #FF4500 | 255, 69, 0 | Violence intrusion |
| Emergency Lights | Warning Red | #FF0000 | 255, 0, 0 | Alarm activation |
| Saber Clashes | White Flash | #FFFFFF | 255, 255, 255 | Combat intensity |
| Smoke | Dark Gray | #2F2F2F | 47, 47, 47 | Chaos, confusion |
| Fire Glow | Inferno Orange | #FF6600 | 255, 102, 0 | Destruction begins |

#### Phase C: Temple Falls (1:30+)

| Element | Color | Hex | RGB | Purpose |
|---------|-------|-----|-----|---------|
| Dominant Light | Flame Red | #B22222 | 178, 34, 34 | Complete corruption |
| Emergency | Strobing Red | #DC143C | 220, 20, 60 | Panic, no escape |
| Smoke Thick | Choking Black | #1C1C1C | 28, 28, 28 | Suffocation |
| Vader's Face | Lit from Below | Firelight | - | Demonic revelation |
| Holocron Death | Flickering Dim | #003366 | 0, 51, 102 | Wisdom dying |

**Color Transition Timeline**:
```
Gold (100%) ────────────────────────────────────> Red (100%)
    │                    │                    │
    0:00              1:00                  2:00
    "Peace"          "Chaos"              "Ashes"
```

**Implementation Notes**:
```typescript
const templeLightingPhases = {
  phaseA: {
    duration: 30000,
    ambient: { color: 0xFFD700, intensity: 0.4 },
    pointLights: [
      // Warm temple braziers
      { color: 0xFFD700, intensity: 1.0, position: 'columns' }
    ],
    holocronGlow: { color: 0x00BFFF, intensity: 0.6, pulse: true }
  },

  phaseB: {
    duration: 60000,
    // Gradual shift
    ambient: {
      color: 0xFFD700,
      targetColor: 0xFF4500,
      intensity: 0.3
    },
    // Add emergency lights
    emergencyLights: {
      color: 0xFF0000,
      intensity: 1.0,
      strobe: { frequency: 2, duty: 0.5 }
    },
    // Blaster flash lights
    combatFlashes: { color: 0xFF4500, intensity: 2.0, random: true }
  },

  phaseC: {
    duration: -1, // Until scene end
    ambient: { color: 0xB22222, intensity: 0.2 },
    fireLight: {
      color: 0xFF6600,
      intensity: 1.5,
      flicker: { min: 0.8, max: 1.2, speed: 0.3 }
    },
    smoke: {
      color: 0x1C1C1C,
      density: 0.8,
      height: 'ceiling-down'
    }
  }
};
```

---

### 2.5 Scene 5: Aftermath - "What Have I Done"

**Primary Palette**: Desaturated Tragedy

| Element | Color | Hex | RGB | Purpose |
|---------|-------|-----|-----|---------|
| Dominant | Ash Gray | #4A4A4A | 74, 74, 74 | Life drained |
| Smoke | Cool Gray | #708090 | 112, 128, 144 | Settling aftermath |
| Embers | Dying Orange | #8B4513 | 139, 69, 19 | Fading destruction |
| Dawn Light | Sickly Yellow | #9B870C | 155, 135, 12 | New day, no hope |
| Vader | Deep Black | #0A0A0A | 10, 10, 10 | Consumed by darkness |

**Visual Treatment**:
- Desaturate entire palette by 40%
- Lower contrast
- Heavy lens diffusion (smoke particles)
- Reference: The aftermath quiet of war films

---

## 3. Mood Transitions

### 3.1 Emotional Lighting Curve

```
Tension ────────────────────────────────────────────────────────────>
(Fear)
   │    ╭──────╮                               ╭────╮
   │   /        \                             /      \
   │  /          \           ╭──────╮        /        \
   │ /            \         /        \      /          ╰─────
   │/              \───────╯          \────╯
   └──────────────────────────────────────────────────────────>
   Senate    March    Stairs    Breach    Combat    Aftermath

Saturation ────────────────────────────────────────────────────────>
   │
   │  HIGH                    MEDIUM              LOW
   │   ████                     ██████            ░░░░░░░
   │   (Red)                   (Orange)          (Gray)
   └──────────────────────────────────────────────────────────>
```

### 3.2 Transition Techniques

#### Senate to Streets
- **Cut Type**: Hard cut
- **Lighting Shift**: Interior red/orange to exterior blue/orange
- **Mood Shift**: Intimate corruption to public consequence
- **Sound Bridge**: Palpatine's last word echoes into march drums

#### Streets to Staircase
- **Cut Type**: Slow dissolve
- **Lighting Shift**: Detailed to silhouette
- **Mood Shift**: Detail to abstraction (dehumanizing the march)
- **Camera**: Pull back to wide shot as silhouettes form

#### Staircase to Temple Interior
- **Cut Type**: Door opens (practical transition)
- **Lighting Shift**: Backlit silhouettes to warm interior
- **Mood Shift**: External threat becomes internal violation
- **The Last Peace**: Brief moment of golden calm before violence

#### Interior Combat Phases
- **Cut Type**: Continuous (no cuts during lighting shift)
- **Lighting Shift**: Gradual gold to red (ambient bleed)
- **Mood Shift**: Sacred to profane over 2 minutes
- **Implementation**: Linear interpolation of light color values

---

## 4. Visual Storytelling Elements

### 4.1 Weather Effects

#### Rain System

**Narrative Purpose**:
- Pathetic fallacy - the heavens weep
- Practical visibility enhancement for backlit scenes
- Adds texture and depth to flat night shots

**Technical Requirements**:
```typescript
interface RainConfig {
  // Core parameters
  dropletCount: number;        // 1000-5000 depending on intensity
  dropletLength: number;       // Pixels, affected by wind
  dropletWidth: number;        // Usually 1-2px
  fallSpeed: number;           // Pixels per frame
  windAngle: number;           // Degrees from vertical

  // Lighting interaction
  backlight: {
    required: true;            // "You have to backlight rain or you won't see it"
    color: number;
    intensity: number;
    position: 'behind-camera' | 'behind-subject';
  };

  // Ground interaction
  splashes: {
    enabled: boolean;
    poolSize: number;
    rippleCount: number;
    wetReflection: number;     // 0-1 reflectivity
  };

  // Intensity curve over sequence
  intensityCurve: {
    senate: 0,                 // No rain indoors
    streets: 0.3,              // Light rain beginning
    staircase: 0.7,            // Heavy rain
    temple: 0.5,               // Diminishing outside
    aftermath: 0.1             // Drizzle, clearing
  };
}
```

#### Lightning (Weather)

**Narrative Purpose**:
- Reveals silhouettes momentarily (horror beats)
- Pathetic fallacy - nature's violence mirrors human violence
- Practical: Illuminates key moments

**Implementation**:
```typescript
interface LightningFlash {
  // Flash characteristics
  color: 0xE0E0FF;             // Slightly blue-white
  intensity: 5.0;              // Bright enough to wash out scene
  duration: 150;               // Milliseconds
  decayCurve: 'exponential';

  // Timing
  triggerType: 'scripted' | 'random';
  scriptedBeats: [
    { time: 45000, note: 'First clear view of Vader face' },
    { time: 72000, note: 'Clone formation reveal' },
    { time: 98000, note: 'Temple gates in full view' }
  ];
  randomInterval: { min: 15000, max: 45000 };

  // Thunder follow
  thunderDelay: { min: 1000, max: 4000 }; // Based on "distance"
}
```

### 4.2 Smoke & Debris Effects

#### Smoke Types

| Type | Use Case | Color | Density | Behavior |
|------|----------|-------|---------|----------|
| Battle Haze | Combat scenes | Light gray (#808080) | 0.2 | Dispersed, hanging |
| Blaster Smoke | Shot impacts | White-gray (#C0C0C0) | 0.4 | Quick dissipation |
| Fire Smoke | Temple burning | Black (#1C1C1C) | 0.8 | Rising, billowing |
| Force Smoke | Dark side power | Purple-black (#2D1B4E) | 0.3 | Swirling, unnatural |

**Smoke/Haze Cinematography Principles**:
> "Haze creates amazing light streaks and produces an evocative, smoky feeling. It adds depth to shots because light has to pass through the haze to get to the sensor, which diffuses the light."

**Implementation**:
```typescript
interface SmokeSystem {
  // Per-scene configuration
  scenes: {
    streets: {
      type: 'urban-haze',
      color: 0x808080,
      density: 0.15,
      // Enhances light beams from windows/signs
      lightInteraction: {
        scattering: true,
        godRays: true
      }
    },
    templeExterior: {
      type: 'fire-smoke',
      color: 0x1C1C1C,
      density: { start: 0, end: 0.6 }, // Builds over time
      sources: ['windows', 'door-cracks', 'roof'],
      rise: {
        speed: 2.0,
        turbulence: 0.4
      }
    },
    templeInterior: {
      type: 'battle-haze',
      color: 0x606060,
      density: { start: 0, end: 0.5 },
      ceiling: {
        // Smoke accumulates at ceiling
        accumulation: true,
        dropHeight: 0.8 // Drops to 80% of room height
      }
    }
  };
}
```

#### Debris System

**Types**:
- **Architectural**: Stone chunks, column fragments, floor tiles
- **Organic**: Shattered wood, torn fabric, scattered datapads
- **Combat**: Deflected blaster bolts, sparks, shrapnel
- **Atmospheric**: Ash, embers, floating particles

**Implementation**:
```typescript
interface DebrisConfig {
  // Destruction debris
  architectural: {
    triggerEvents: ['explosion', 'force-push', 'structural-fail'],
    particleCount: { min: 10, max: 50 },
    size: { min: 5, max: 30 },
    physics: {
      gravity: 9.8,
      bounce: 0.3,
      friction: 0.7
    },
    lifetime: { min: 5000, max: 15000 }
  },

  // Constant atmospheric
  embers: {
    density: 0.4,
    color: 0xFF6600,
    glow: { enabled: true, intensity: 0.5 },
    rise: { speed: 1.5, wobble: 0.3 },
    spawn: 'fire-sources',
    lifetime: { min: 3000, max: 8000 }
  },

  ash: {
    density: 0.6,
    color: 0x3C3C3C,
    fall: { speed: 0.5, drift: 0.8 },
    spawn: 'ceiling',
    lifetime: { min: 10000, max: 30000 }
  }
}
```

### 4.3 Emergency Lighting System

**Narrative Purpose**:
- Signals the shift from peace to crisis
- Creates disorienting strobe effect
- Provides practical motivation for red color shift

**Types**:

| Type | Location | Color | Pattern | Purpose |
|------|----------|-------|---------|---------|
| Wall Klaxons | Corridors | Red (#FF0000) | Strobe 2Hz | Alert, danger |
| Floor Strips | Evacuation routes | Amber (#FFB000) | Pulse 1Hz | Guide to exits |
| Console Alerts | Control rooms | Red/Blue alternating | Flash 3Hz | System failure |
| Holocron Pulse | Archives | Blue dimming | Fade | Knowledge dying |

**Implementation**:
```typescript
interface EmergencyLightingSystem {
  // Activation trigger
  activationTime: number; // Timestamp in sequence

  // Light types
  klaxons: {
    color: 0xFF0000,
    intensity: { min: 0.3, max: 1.0 },
    frequency: 2,              // Hz
    duty: 0.5,                 // 50% on, 50% off
    positions: Vector3[],      // Wall mount points
    range: 10                  // Units of light reach
  },

  floorStrips: {
    color: 0xFFB000,
    intensity: { min: 0.2, max: 0.8 },
    pattern: 'pulse',          // Smooth sine wave
    frequency: 1,
    direction: 'to-exit'       // Visual flow toward exits
  },

  // Failure progression
  degradation: {
    enabled: true,
    startTime: 60000,          // 1 minute after activation
    flickerChance: 0.1,        // Increasing
    failureChance: 0.02,       // Lights going out permanently
    finalState: 'fire-only'    // Eventually only fire provides light
  }
}
```

### 4.4 Lightsaber Glow Contrast

**The Visual Power of Lightsabers in Darkness**:

Lightsabers are not just weapons - they are light sources that define space and character.

#### Saber Color Psychology

| Color | Character | Emotional Read | Lighting Effect |
|-------|-----------|----------------|-----------------|
| Blue (Jedi) | Defenders | Hope, peace, defense | Cool ambient glow |
| Blue (Vader) | Anakin/Vader | Tragic irony - still Jedi blade | Contaminated by red context |
| Green | Jedi Masters | Wisdom, nature | Calm, centered glow |
| Yellow | Temple Guards | Duty, sacrifice | Vigilant, warning |
| Red (future) | Inquisitors | Corruption complete | Aggressive, bleeding |

#### Saber Glow Implementation

```typescript
interface LightsaberLight {
  // Core blade
  blade: {
    color: number,              // Hex color
    coreIntensity: 2.0,         // Bright core
    glowIntensity: 0.8,         // Softer outer glow
    glowRadius: 2.0,            // Units around blade
    length: 1.2                 // Blade length in units
  },

  // Dynamic lighting
  pointLight: {
    color: number,              // Matches blade
    intensity: 1.5,
    distance: 8,                // How far light reaches
    decay: 2,                   // Falloff
    castShadow: true
  },

  // Combat effects
  clash: {
    flashColor: 0xFFFFFF,       // White burst
    flashIntensity: 3.0,
    flashDuration: 100,
    sparks: {
      count: 20,
      color: [0xFFFFFF, 0xFFFF00], // White and yellow
      spread: 60                 // Degrees
    }
  },

  // Swing trail (p5.js)
  trail: {
    enabled: true,
    points: 20,                 // Trail history
    fadeTime: 200,              // Milliseconds
    coreColor: number,          // Blade color
    glowColor: number,          // Lighter version
    width: 4
  }
}
```

#### Contrast Scenarios

**Scenario 1: Single Saber in Darkness**
- The blade becomes the only light source
- Face half-lit, half in shadow
- Classic villain lighting achieved naturally
- Implementation: Reduce ambient to near-zero, saber light only

**Scenario 2: Saber Duel**
- Two light sources creating complex shadows
- Colors mix where glows overlap (blue + green = cyan wash)
- Rapid lighting changes as blades move
- Implementation: Real-time point light movement with blade positions

**Scenario 3: Saber vs. Blaster Fire**
- Blue blade steady light vs. orange flash bursts
- Deflection creates momentary flash overlap
- Rhythm of light matches combat rhythm
- Implementation: Flash lights on deflection events

---

## 5. Technical Implementation

### 5.1 Lighting System Architecture

```typescript
// src/systems/lighting/LightingSystem.ts

interface LightingSystemConfig {
  // Scene-based presets
  presets: Map<string, LightingPreset>;

  // Transition system
  transitions: {
    defaultDuration: number;    // ms
    easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  };

  // Dynamic lights
  maxDynamicLights: number;     // Performance limit
  shadowMapSize: number;        // 512, 1024, 2048

  // Post-processing
  postProcess: {
    bloom: BloomConfig;
    colorGrade: ColorGradeConfig;
    fog: FogConfig;
  };
}

interface LightingPreset {
  name: string;
  ambient: AmbientLightConfig;
  directional: DirectionalLightConfig[];
  point: PointLightConfig[];
  spot: SpotLightConfig[];
  fog: FogConfig;
  colorGrade: ColorGradeConfig;
}

interface ColorGradeConfig {
  // LUT-based color grading
  lutTexture?: string;

  // Manual adjustments
  saturation: number;           // 0-2, 1 = normal
  contrast: number;             // 0-2, 1 = normal
  brightness: number;           // -1 to 1, 0 = normal

  // Color balance
  shadows: { r: number, g: number, b: number };
  midtones: { r: number, g: number, b: number };
  highlights: { r: number, g: number, b: number };

  // Film grain (for texture)
  grain: {
    enabled: boolean;
    intensity: number;
    animated: boolean;
  };
}
```

### 5.2 Scene-Specific Configurations

```typescript
// src/config/lighting/order66Sequence.ts

export const ORDER_66_LIGHTING_SEQUENCE = {
  senate: {
    ambient: { color: 0x1A0A0A, intensity: 0.1 },
    keyLight: {
      type: 'point',
      color: 0x8B0000,
      intensity: 1.5,
      position: { x: 0, y: -2, z: 3 },
      castShadow: true,
      shadowBias: -0.001
    },
    fillLight: {
      type: 'point',
      color: 0xCC5500,
      intensity: 0.4,
      position: { x: 5, y: 2, z: -3 }
    },
    colorGrade: {
      saturation: 1.3,          // Punchy reds
      contrast: 1.2,
      shadows: { r: 0.15, g: 0, b: 0 },
      grain: { enabled: true, intensity: 0.02 }
    },
    fog: {
      type: 'exponential',
      color: 0x1A0A0A,
      density: 0.02
    }
  },

  streets: {
    ambient: { color: 0x0A1628, intensity: 0.08 },
    moonlight: {
      type: 'directional',
      color: 0x4466AA,          // Blue moonlight
      intensity: 0.3,
      direction: { x: -0.5, y: -1, z: 0.5 },
      castShadow: true
    },
    streetLights: [
      // Array of point lights at street lamp positions
      { color: 0xFF6B35, intensity: 1.0, distance: 15, decay: 2 }
    ],
    windowLights: {
      // Emissive rectangles with warm glow
      color: 0xFFBF00,
      intensity: 0.6
    },
    colorGrade: {
      saturation: 0.9,
      contrast: 1.1,
      shadows: { r: 0, g: 0.1, b: 0.2 },   // Teal shadows
      highlights: { r: 0.2, g: 0.1, b: 0 }, // Orange highlights
      grain: { enabled: true, intensity: 0.03 }
    },
    rain: {
      enabled: true,
      intensity: 0.3,
      backlight: { color: 0xFF6B35, intensity: 2.0 }
    }
  },

  staircase: {
    // Silhouette lighting
    ambient: { color: 0x2D1B4E, intensity: 0.03 },
    templeBacklight: {
      type: 'area',             // Large soft source
      color: 0xFFD93D,
      intensity: 3.0,
      position: { x: 0, y: 5, z: -20 },
      width: 30,
      height: 20
    },
    rimLight: {
      type: 'directional',
      color: 0xFFFFFF,
      intensity: 0.15,
      direction: { x: 0, y: 0, z: 1 } // From behind camera
    },
    colorGrade: {
      saturation: 0.7,          // Desaturated
      contrast: 1.4,            // High contrast for silhouettes
      brightness: -0.2,         // Overall darker
      grain: { enabled: true, intensity: 0.04 }
    },
    lightning: {
      enabled: true,
      interval: { min: 15000, max: 45000 },
      scriptedFlashes: [45000, 72000, 98000]
    }
  },

  templeInterior: {
    // Phase-based - see templeLightingPhases above
    phases: ['phaseA', 'phaseB', 'phaseC'],
    transitionDurations: [30000, 60000, -1],

    // Constant elements
    holocronGlow: {
      color: 0x00BFFF,
      intensity: { start: 0.6, end: 0.1 },
      pulse: { frequency: 0.5, amplitude: 0.2 }
    },

    // Emergency system
    emergency: {
      activationTime: 10000,    // 10 seconds into scene
      klaxons: true,
      floorStrips: true,
      degradation: true
    },

    colorGrade: {
      // Transitions with phase
      phaseA: { saturation: 1.0, warmth: 0.3 },
      phaseB: { saturation: 1.1, warmth: 0.0 },
      phaseC: { saturation: 0.8, warmth: -0.2, grain: 0.05 }
    }
  },

  aftermath: {
    ambient: { color: 0x4A4A4A, intensity: 0.15 },
    dawnLight: {
      type: 'directional',
      color: 0x9B870C,          // Sickly yellow
      intensity: 0.4,
      direction: { x: 1, y: -0.3, z: 0.5 }
    },
    fireEmbers: {
      color: 0x8B4513,
      intensity: 0.3,
      flicker: true
    },
    colorGrade: {
      saturation: 0.5,          // Heavily desaturated
      contrast: 0.9,
      brightness: -0.1,
      grain: { enabled: true, intensity: 0.06 }
    },
    smoke: {
      density: 0.4,
      color: 0x708090
    }
  }
};
```

### 5.3 Lighting Transition System

```typescript
// src/systems/lighting/LightingTransition.ts

export class LightingTransition {
  private currentPreset: LightingPreset;
  private targetPreset: LightingPreset | null = null;
  private transitionProgress: number = 0;
  private transitionDuration: number = 0;
  private easing: (t: number) => number;

  /**
   * Start transition to new lighting preset.
   */
  transitionTo(preset: LightingPreset, duration: number, easing: string = 'ease-in-out'): void {
    this.targetPreset = preset;
    this.transitionDuration = duration;
    this.transitionProgress = 0;
    this.easing = this.getEasingFunction(easing);
  }

  /**
   * Update transition each frame.
   */
  update(deltaTime: number): LightingPreset {
    if (!this.targetPreset) {
      return this.currentPreset;
    }

    this.transitionProgress += deltaTime / this.transitionDuration;

    if (this.transitionProgress >= 1) {
      this.currentPreset = this.targetPreset;
      this.targetPreset = null;
      this.transitionProgress = 0;
      return this.currentPreset;
    }

    const t = this.easing(this.transitionProgress);
    return this.interpolatePresets(this.currentPreset, this.targetPreset, t);
  }

  /**
   * Interpolate between two lighting presets.
   */
  private interpolatePresets(from: LightingPreset, to: LightingPreset, t: number): LightingPreset {
    return {
      name: `transition_${from.name}_${to.name}`,
      ambient: {
        color: this.lerpColor(from.ambient.color, to.ambient.color, t),
        intensity: this.lerp(from.ambient.intensity, to.ambient.intensity, t)
      },
      // ... interpolate all other properties
    };
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private lerpColor(a: number, b: number, t: number): number {
    const aR = (a >> 16) & 0xFF;
    const aG = (a >> 8) & 0xFF;
    const aB = a & 0xFF;

    const bR = (b >> 16) & 0xFF;
    const bG = (b >> 8) & 0xFF;
    const bB = b & 0xFF;

    const r = Math.round(this.lerp(aR, bR, t));
    const g = Math.round(this.lerp(aG, bG, t));
    const b_val = Math.round(this.lerp(aB, bB, t));

    return (r << 16) | (g << 8) | b_val;
  }

  private getEasingFunction(easing: string): (t: number) => number {
    switch (easing) {
      case 'linear': return (t) => t;
      case 'ease-in': return (t) => t * t;
      case 'ease-out': return (t) => t * (2 - t);
      case 'ease-in-out': return (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      default: return (t) => t;
    }
  }
}
```

### 5.4 p5.js Effects Integration

```typescript
// src/effects/p5/AtmosphericEffects.ts

import p5 from 'p5';

export class AtmosphericEffects {
  private p: p5;

  // Rain system
  private raindrops: Raindrop[] = [];
  private rainIntensity: number = 0;
  private rainBacklightColor: p5.Color;

  // Smoke particles
  private smokeParticles: SmokeParticle[] = [];

  // Ember particles
  private embers: Ember[] = [];

  constructor(p5Instance: p5) {
    this.p = p5Instance;
    this.rainBacklightColor = this.p.color(255, 107, 53); // Orange backlight
  }

  /**
   * Render rain with proper backlighting.
   */
  renderRain(config: RainConfig): void {
    if (config.intensity <= 0) return;

    // Update raindrop count based on intensity
    const targetCount = Math.floor(config.intensity * 2000);
    while (this.raindrops.length < targetCount) {
      this.raindrops.push(this.createRaindrop(config));
    }
    while (this.raindrops.length > targetCount) {
      this.raindrops.pop();
    }

    // Draw backlit raindrops
    this.p.push();
    this.p.stroke(this.rainBacklightColor);
    this.p.strokeWeight(config.dropletWidth);

    for (const drop of this.raindrops) {
      // Calculate brightness based on position relative to light
      const brightness = this.calculateBacklightBrightness(drop, config);
      const alpha = this.p.map(brightness, 0, 1, 50, 200);

      this.p.stroke(
        this.p.red(this.rainBacklightColor),
        this.p.green(this.rainBacklightColor),
        this.p.blue(this.rainBacklightColor),
        alpha
      );

      // Draw streak
      const endY = drop.y + config.dropletLength;
      const endX = drop.x + Math.tan(config.windAngle * Math.PI / 180) * config.dropletLength;
      this.p.line(drop.x, drop.y, endX, endY);

      // Update position
      drop.y += config.fallSpeed;
      drop.x += config.windSpeed;

      // Reset if off screen
      if (drop.y > this.p.height) {
        this.resetRaindrop(drop, config);
        // Create splash
        if (config.splashes?.enabled) {
          this.createSplash(endX, this.p.height);
        }
      }
    }

    this.p.pop();
  }

  /**
   * Render volumetric smoke/haze.
   */
  renderSmoke(config: SmokeConfig): void {
    this.p.push();
    this.p.noStroke();

    for (const particle of this.smokeParticles) {
      const alpha = this.p.map(particle.life, 0, particle.maxLife, 0, config.maxAlpha);
      this.p.fill(
        this.p.red(config.color),
        this.p.green(config.color),
        this.p.blue(config.color),
        alpha
      );

      // Soft circle for smoke puff
      this.p.circle(particle.x, particle.y, particle.size);

      // Update
      particle.y -= config.riseSpeed;
      particle.x += this.p.random(-config.drift, config.drift);
      particle.size += config.expansion;
      particle.life++;

      if (particle.life > particle.maxLife || particle.y < config.ceilingHeight) {
        // Remove or reset
        this.resetSmokeParticle(particle, config);
      }
    }

    this.p.pop();
  }

  /**
   * Render floating embers.
   */
  renderEmbers(config: EmberConfig): void {
    this.p.push();
    this.p.noStroke();

    for (const ember of this.embers) {
      // Ember glow
      const glowSize = ember.size * 3;
      const glowAlpha = 50 * ember.brightness;
      this.p.fill(255, 102, 0, glowAlpha);
      this.p.circle(ember.x, ember.y, glowSize);

      // Ember core
      const coreAlpha = 255 * ember.brightness;
      this.p.fill(255, 200, 100, coreAlpha);
      this.p.circle(ember.x, ember.y, ember.size);

      // Update
      ember.y -= config.riseSpeed;
      ember.x += Math.sin(ember.wobblePhase) * config.wobbleAmount;
      ember.wobblePhase += config.wobbleSpeed;
      ember.brightness *= 0.995; // Fade
      ember.life++;

      if (ember.life > ember.maxLife || ember.brightness < 0.1) {
        this.resetEmber(ember, config);
      }
    }

    this.p.pop();
  }

  /**
   * Render lightning flash.
   */
  renderLightningFlash(intensity: number, decay: number): void {
    if (intensity <= 0) return;

    this.p.push();
    this.p.fill(224, 224, 255, intensity * 255);
    this.p.rect(0, 0, this.p.width, this.p.height);
    this.p.pop();
  }

  private calculateBacklightBrightness(drop: Raindrop, config: RainConfig): number {
    // Simplified: brighter toward center/back of scene
    const centerDistance = Math.abs(drop.x - this.p.width / 2) / (this.p.width / 2);
    return 1 - centerDistance * 0.5;
  }

  private createRaindrop(config: RainConfig): Raindrop {
    return {
      x: this.p.random(this.p.width),
      y: this.p.random(-100, 0),
      speed: config.fallSpeed + this.p.random(-2, 2)
    };
  }

  private resetRaindrop(drop: Raindrop, config: RainConfig): void {
    drop.x = this.p.random(this.p.width);
    drop.y = this.p.random(-100, -10);
  }

  // ... additional helper methods
}

interface Raindrop {
  x: number;
  y: number;
  speed: number;
}

interface SmokeParticle {
  x: number;
  y: number;
  size: number;
  life: number;
  maxLife: number;
}

interface Ember {
  x: number;
  y: number;
  size: number;
  brightness: number;
  wobblePhase: number;
  life: number;
  maxLife: number;
}
```

---

## 6. Reference Sources

### 6.1 Cinematography Analysis

- [Clashing Sabers: Visual Composition in Revenge of the Sith](https://clashingsabers.net/2017/06/11/worth-a-thousand-words-how-george-lucas-used-visual-composition-to-tell-the-story-of-revenge-of-the-sith/) - Lucas's visual storytelling approach
- [Filmdiction: Anakin's Transformation Cinematography Analysis](https://filmdiction.wordpress.com/2019/12/12/star-wars-episode-iii-revenge-of-the-sith-anakins-transformation-cinematography-and-lighting/) - Lighting breakdown
- [Bright Lights Film Journal: George Lucas's Greatest Artistic Statement](https://brightlightsfilm.com/star-wars-episode-iii-revenge-sith-george-lucass-greatest-artistic-statement/) - Silent cinema influences

### 6.2 Color Grading & Lighting Techniques

- [Fstoppers: Blue and Orange Look](https://fstoppers.com/lighting/how-balance-color-tones-blue-and-orange-look-587391) - Teal/orange contrast
- [Videomaker: How to Light a Night Scene](https://www.videomaker.com/light-the-night-how-to-light-a-realistic-night-scene/) - Night cinematography
- [Indie Tips: Backlight for Cinematic Storytelling](https://indietips.com/how-to-use-backlight-for-cinematic-storytelling/) - Silhouette techniques
- [Studio Binder: What is Backlight Photography](https://www.studiobinder.com/blog/what-is-backlight-photography-definition/) - Backlight fundamentals
- [Vaia: Silhouette Lighting](https://www.vaia.com/en-us/explanations/media-studies/filmmaking/silhouette-lighting/) - Silhouette mood creation

### 6.3 Atmospheric Effects

- [Filmmakers Academy: Smoke & Haze](https://www.filmmakersacademy.com/smoke-haze/) - Haze cinematography
- [In Depth Cine: Why Rain in Fincher Films](https://www.indepthcine.com/videos/why-does-it-always-rain-in-david-finchers-films) - Rain as storytelling
- [Premium Beat: Tips for Filming in Rain](https://www.premiumbeat.com/blog/tips-for-filming-in-the-rain/) - Rain lighting rules
- [Premium Beat: Haze vs Fog vs Smoke](https://www.premiumbeat.com/blog/filmmaking-diffusion-haze-fog-smoke/) - Atmospheric diffusion
- [Fiveable: Particle Effects and Simulations](https://fiveable.me/advanced-cinematography/unit-7/particle-effects-simulations/study-guide/UirxUpFTA4J9JE8M) - VFX particle systems

### 6.4 Film Noir & Dramatic Lighting

- [Filmmakers Academy: Film Noir Lighting](https://www.filmmakersacademy.com/blog-film-noir-lighting/) - Classic noir techniques
- [Adorama: Basic Cinematography Lighting Techniques](https://www.adorama.com/alc/basic-cinematography-lighting-techniques/) - Lighting fundamentals
- [Taste of Cinema: 10 Best Lit Movie Scenes](https://www.tasteofcinema.com/2019/the-10-best-lit-movie-scenes-of-all-time/) - Lighting excellence examples

---

## Appendix A: Quick Reference Color Codes

### Senate Chamber
```css
--senate-key: #8B0000;
--senate-fill: #CC5500;
--senate-accent: #4B0082;
--senate-shadow: #1A0A0A;
```

### Coruscant Streets
```css
--streets-sky: #0A1628;
--streets-city-light: #FF6B35;
--streets-clone-armor: #E8E8F0;
--streets-501st-blue: #0066CC;
--streets-window: #FFBF00;
```

### Temple Staircase
```css
--stairs-backlight: #FFD93D;
--stairs-sky: #2D1B4E;
--stairs-rim: #FFFFFF;
--stairs-silhouette: #000000;
```

### Temple Interior
```css
--temple-gold: #FFD700;
--temple-holocron: #00BFFF;
--temple-emergency: #FF0000;
--temple-fire: #FF6600;
--temple-smoke: #1C1C1C;
--temple-blaster: #FF4500;
```

### Aftermath
```css
--aftermath-ash: #4A4A4A;
--aftermath-smoke: #708090;
--aftermath-ember: #8B4513;
--aftermath-dawn: #9B870C;
```

---

*Document prepared for Temple March development team. References canonical Star Wars cinematography and professional film lighting techniques.*
