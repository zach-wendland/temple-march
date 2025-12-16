/**
 * Combat UI Configuration
 * AAA-quality combat feedback constants and configuration.
 * All values are implementation-ready for Phaser.js 3.90.
 */

// ============================================================================
// COLOR SYSTEM
// ============================================================================

export const COLORS = {
  // Primary Combat Palette
  SITH_RED: 0xff2020,
  IMPERIAL_CRIMSON: 0xcc0000,
  VADER_BLACK: 0x0a0a0a,
  SABER_RED_CORE: 0xff4444,
  SABER_RED_GLOW: 0xff0000,

  // Force Power Palette
  FORCE_BLUE: 0x4488ff,
  FORCE_PURPLE: 0x8844ff,
  FORCE_GLOW: 0x6666ff,

  // Feedback Colors
  HIT_WHITE: 0xffffff,
  COMBO_GOLD: 0xffd700,
  CRITICAL_ORANGE: 0xff8800,
  BLOCK_SILVER: 0xc0c0c0,
  KILL_RED: 0xff0044,

  // UI Colors
  BAR_BACKGROUND: 0x1a1a1a,
  BAR_BORDER: 0x444444,
  LABEL_GRAY: 0x888888,
} as const;

// Hex string versions for Phaser Text
export const COLORS_HEX = {
  SITH_RED: '#FF2020',
  IMPERIAL_CRIMSON: '#CC0000',
  VADER_BLACK: '#0A0A0A',
  SABER_RED_CORE: '#FF4444',
  FORCE_BLUE: '#4488FF',
  FORCE_PURPLE: '#8844FF',
  HIT_WHITE: '#FFFFFF',
  COMBO_GOLD: '#FFD700',
  CRITICAL_ORANGE: '#FF8800',
  BLOCK_SILVER: '#C0C0C0',
  KILL_RED: '#FF0044',
  LABEL_GRAY: '#888888',
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const TYPOGRAPHY = {
  // Font families (with fallbacks)
  FONT_PRIMARY: 'Arial Black, Helvetica Neue, sans-serif',
  FONT_SECONDARY: 'Arial, Helvetica, sans-serif',

  // Type scale (at 1280x720)
  SIZE: {
    COMBO_NUMBER: 72,
    COMBO_LABEL: 18,
    DAMAGE_LARGE: 48,
    DAMAGE_MEDIUM: 32,
    DAMAGE_SMALL: 24,
    BAR_LABEL: 14,
    BOSS_NAME: 28,
  },
} as const;

// ============================================================================
// COMBO COUNTER
// ============================================================================

export const COMBO_CONFIG = {
  // Position (right side, vertically centered)
  POSITION: { x: 1180, y: 360 },

  // Timing
  DECAY_TIME: 3000, // ms before combo drops
  WARNING_TIME: 1000, // Last second warning

  // Animation
  HIT_SCALE: {
    from: 1.3,
    to: 1.0,
    duration: 150,
  },

  // Color tiers
  TIERS: [
    { threshold: 1, color: '#FFFFFF' },
    { threshold: 10, color: '#FFD700' },
    { threshold: 25, color: '#FF8800' },
    { threshold: 50, color: '#FF2020' },
  ],

  // Shake on large combos
  SHAKE: {
    threshold: 25,
    intensity: 3,
    duration: 100,
  },
} as const;

// ============================================================================
// DAMAGE NUMBERS
// ============================================================================

export const DAMAGE_NUMBER_CONFIG = {
  // Pool size (for object pooling)
  POOL_SIZE: 50,

  // Spawn offset
  SPAWN_OFFSET: {
    x: { min: -20, max: 20 },
    y: -30,
  },

  // Float animation
  FLOAT: {
    distance: 60,
    duration: 800,
    fadeStart: 500,
    fadeDuration: 300,
  },

  // Size function thresholds
  SIZE_THRESHOLDS: [
    { damage: 100, size: 48 },
    { damage: 50, size: 40 },
    { damage: 25, size: 32 },
    { damage: 0, size: 24 },
  ],

  // Type-specific styles
  STYLES: {
    normal: {
      color: '#FFFFFF',
      stroke: '#000000',
      strokeWidth: 3,
    },
    critical: {
      color: '#FF8800',
      stroke: '#FF0000',
      strokeWidth: 4,
      sizeMultiplier: 1.25,
    },
    force: {
      color: '#4488FF',
      stroke: '#0022AA',
      strokeWidth: 3,
    },
    blocked: {
      color: '#888888',
      stroke: '#444444',
      strokeWidth: 2,
      fixedSize: 20,
    },
  },
} as const;

// ============================================================================
// HIT INDICATORS
// ============================================================================

export const HIT_FEEDBACK_CONFIG = {
  // Screen flash
  FLASH: {
    hitConfirm: { color: 0xffffff, alpha: 0.15, duration: 50 },
    critical: { color: 0xff8800, alpha: 0.25, duration: 100 },
    playerDamage: { color: 0xff0000, alpha: 0.4, duration: 150 },
    forceActivation: { color: 0x4488ff, alpha: 0.2, duration: 100 },
  },

  // Screen shake
  SHAKE: {
    light: { intensity: 0.003, duration: 50 },
    heavy: { intensity: 0.008, duration: 100 },
    critical: { intensity: 0.012, duration: 120 },
    forcePush: { intensity: 0.015, duration: 150 },
    kill: { intensity: 0.02, duration: 200 },
    bossStagger: { intensity: 0.025, duration: 300 },
  },

  // Hit stop (freeze frames)
  HITSTOP: {
    light: 0,
    heavy: 50,
    critical: 80,
    kill: 120,
    force: 0,
  },

  // Zoom punch for critical hits
  ZOOM_PUNCH: {
    scale: 1.02,
    duration: 80,
  },
} as const;

// ============================================================================
// HEALTH BAR (VADER)
// ============================================================================

export const HEALTH_BAR_CONFIG = {
  // Position and size
  POSITION: { x: 24, y: 24 },
  WIDTH: 280,
  HEIGHT: 28,
  BORDER_WIDTH: 3,

  // Colors
  COLORS: {
    background: 0x1a1a1a,
    border: 0x444444,
    health: [0xcc0000, 0xff2020], // Gradient
    damagePreview: 0xffffff,
  },

  // Damage preview
  DAMAGE_PREVIEW: {
    alpha: 0.5,
    catchUpDelay: 500,
    catchUpSpeed: 200,
  },

  // Low health warning
  LOW_HEALTH: {
    threshold: 0.25,
    pulseRate: 500,
    colors: [0x880000, 0xff0000],
    vignetteIntensity: 0.15,
  },

  // Label
  LABEL: {
    text: 'VITALITY',
    offsetY: -16,
    fontSize: 12,
  },
} as const;

// ============================================================================
// FORCE METER
// ============================================================================

export const FORCE_BAR_CONFIG = {
  // Position and size
  POSITION: { x: 24, y: 60 },
  WIDTH: 220,
  HEIGHT: 20,
  BORDER_WIDTH: 2,

  // Colors
  COLORS: {
    background: 0x0a0a1a,
    border: 0x333366,
    force: [0x2244aa, 0x4488ff], // Gradient
    regenPulse: 0x88aaff,
  },

  // Full meter glow
  FULL_GLOW: {
    color: 0x4488ff,
    blur: 8,
    pulseRate: 2000,
  },

  // Low force
  LOW_FORCE: {
    threshold: 0.2,
    color: 0x2244aa,
  },

  // Label
  LABEL: {
    text: 'THE FORCE',
    offsetY: -4,
    fontSize: 10,
    color: '#4488FF',
  },
} as const;

// ============================================================================
// ENEMY HEALTH BARS
// ============================================================================

export const ENEMY_HEALTH_CONFIG = {
  // Minion (standard enemy)
  MINION: {
    width: 48,
    height: 6,
    offsetY: -40,
    borderWidth: 1,
    showWhenFull: false,
    hideDelay: 3000,
  },

  // Elite (Jedi)
  ELITE: {
    width: 64,
    height: 8,
    offsetY: -50,
    borderWidth: 2,
    showWhenFull: true,
    showName: true,
  },

  // Boss
  BOSS: {
    position: { x: 640, y: 680 },
    width: 600,
    height: 20,
    borderWidth: 3,
    segments: 3,
    showName: true,
    showTitle: true,
  },

  // Stagger/posture bar
  STAGGER: {
    width: 48,
    height: 4,
    offsetY: -32,
    color: 0xffd700,
    breakingColor: 0xff8800,
    breakThreshold: 0.9,
  },
} as const;

// ============================================================================
// COMBAT STATE INDICATORS
// ============================================================================

export const COMBAT_STATE_CONFIG = {
  // Enemy attack wind-up
  ENEMY_WINDUP: {
    flashColor: 0xffff00,
    flashAlpha: 0.6,
    flashDuration: 200,
    pulseCount: 2,
    exclamationOffsetY: -60,
  },

  // Invincibility frames
  IFRAMES: {
    ghostTrailCount: 3,
    ghostTrailSpacing: 50,
    ghostAlphas: [0.6, 0.4, 0.2],
    ghostTint: 0x4444ff,
    ghostFadeTime: 200,
    blinkRate: 50,
  },

  // Hitstun
  HITSTUN: {
    enemyTint: 0xff8888,
    enemyTintAlpha: 0.5,
    dizzyThreshold: 500,
    playerChromaticAberration: 0.01,
  },

  // Block
  BLOCK: {
    successFlashDuration: 50,
    sparkCount: 5,
    sparkColor: 0xff4444,
    enemyBlockSparkColor: 0x4488ff,
  },
} as const;

// ============================================================================
// PERFORMANCE SETTINGS
// ============================================================================

export const PERFORMANCE_CONFIG = {
  // Object pool sizes
  POOLS: {
    damageNumbers: 50,
    hitParticles: 100,
    enemyHpBars: 20,
  },

  // Update frequencies (for optimization)
  UPDATE_RATES: {
    comboCounter: 'event', // Only on events
    healthBar: 60, // fps
    forceBar: 60, // fps (regen animation)
    enemyHpBars: 'event', // Only on events
  },
} as const;

// ============================================================================
// ACCESSIBILITY OPTIONS
// ============================================================================

export const ACCESSIBILITY_CONFIG = {
  // Defaults (can be overridden by user settings)
  defaults: {
    screenShakeIntensity: 1.0, // 0 to disable
    screenFlashIntensity: 1.0, // 0 to disable
    uiScale: 1.0, // 1.0, 1.25, 1.5
    colorblindMode: 'none', // 'none', 'deuteranopia', 'protanopia'
    highContrastMode: false,
  },

  // Colorblind palettes
  colorblind: {
    deuteranopia: {
      critical: 0xffd700, // Gold instead of red
      force: 0x00bfff, // Cyan instead of blue
    },
    protanopia: {
      critical: 0xffd700,
      force: 0x00bfff,
    },
  },
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get damage number size based on damage amount.
 */
export function getDamageSize(damage: number): number {
  for (const threshold of DAMAGE_NUMBER_CONFIG.SIZE_THRESHOLDS) {
    if (damage >= threshold.damage) {
      return threshold.size;
    }
  }
  return DAMAGE_NUMBER_CONFIG.SIZE_THRESHOLDS[
    DAMAGE_NUMBER_CONFIG.SIZE_THRESHOLDS.length - 1
  ].size;
}

/**
 * Get combo tier color based on combo count.
 */
export function getComboTierColor(count: number): string {
  for (let i = COMBO_CONFIG.TIERS.length - 1; i >= 0; i--) {
    if (count >= COMBO_CONFIG.TIERS[i].threshold) {
      return COMBO_CONFIG.TIERS[i].color;
    }
  }
  return COMBO_CONFIG.TIERS[0].color;
}

/**
 * Get combo damage scaling based on hit count.
 */
export function getComboScaling(hitCount: number): number {
  const scalingTable = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5];
  const index = Math.min(hitCount - 1, scalingTable.length - 1);
  return scalingTable[Math.max(0, index)];
}

/**
 * Apply accessibility settings to a color.
 */
export function applyColorblindMode(
  color: number,
  mode: string,
  type: 'critical' | 'force'
): number {
  if (mode === 'none') return color;
  const palette =
    ACCESSIBILITY_CONFIG.colorblind[
      mode as keyof typeof ACCESSIBILITY_CONFIG.colorblind
    ];
  return palette ? palette[type] : color;
}
