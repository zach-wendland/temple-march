/**
 * ScreenShake - Trauma-based camera shake system.
 * Implements the GDC talk approach: trauma accumulates and decays,
 * producing natural-feeling screen shake based on Perlin noise.
 *
 * "When Vader uses Force Push, the world should feel the impact."
 */

import Phaser from 'phaser';
import { EventBus } from '../core/events/EventBus';

/**
 * Trauma source types for different shake characteristics.
 */
export enum TraumaSource {
  /** Light impact - small shake */
  LightHit = 'light_hit',
  /** Heavy impact - medium shake */
  HeavyHit = 'heavy_hit',
  /** Force Push - directional shake */
  ForcePush = 'force_push',
  /** Force Pull - pulling shake */
  ForcePull = 'force_pull',
  /** Force Lightning - sustained shake */
  ForceLightning = 'force_lightning',
  /** Kill - satisfying crunch shake */
  Kill = 'kill',
  /** Player damage - screen shake feedback */
  PlayerDamage = 'player_damage',
  /** Explosion - large shake */
  Explosion = 'explosion',
}

/**
 * Screen shake configuration.
 */
export interface ScreenShakeConfig {
  /** Maximum trauma value (0-1) */
  maxTrauma: number;
  /** Trauma decay rate per second */
  traumaDecayRate: number;
  /** Maximum X offset in pixels */
  maxOffsetX: number;
  /** Maximum Y offset in pixels */
  maxOffsetY: number;
  /** Maximum rotation in radians */
  maxRotation: number;
  /** Shake frequency (higher = faster shake) */
  frequency: number;
  /** Use rotation shake? */
  useRotation: boolean;
}

/**
 * Trauma source configuration.
 */
interface TraumaSourceConfig {
  /** Base trauma added */
  trauma: number;
  /** Duration multiplier */
  durationMultiplier: number;
  /** Directional bias (-1 to 1, 0 = no bias) */
  directionalBiasX: number;
  directionalBiasY: number;
}

/**
 * Default screen shake configuration.
 */
const DEFAULT_CONFIG: ScreenShakeConfig = {
  maxTrauma: 1.0,
  traumaDecayRate: 1.5, // Full trauma decays in ~0.67 seconds
  maxOffsetX: 12,
  maxOffsetY: 8,
  maxRotation: 0.02,
  frequency: 20,
  useRotation: true,
};

/**
 * Trauma configurations per source.
 */
const TRAUMA_CONFIGS: Record<TraumaSource, TraumaSourceConfig> = {
  [TraumaSource.LightHit]: {
    trauma: 0.15,
    durationMultiplier: 0.8,
    directionalBiasX: 0,
    directionalBiasY: 0,
  },
  [TraumaSource.HeavyHit]: {
    trauma: 0.35,
    durationMultiplier: 1.0,
    directionalBiasX: 0,
    directionalBiasY: 0,
  },
  [TraumaSource.ForcePush]: {
    trauma: 0.45,
    durationMultiplier: 1.2,
    directionalBiasX: 0.3, // Push forward bias
    directionalBiasY: -0.1, // Slight upward
  },
  [TraumaSource.ForcePull]: {
    trauma: 0.3,
    durationMultiplier: 1.0,
    directionalBiasX: -0.3, // Pull back bias
    directionalBiasY: 0,
  },
  [TraumaSource.ForceLightning]: {
    trauma: 0.5,
    durationMultiplier: 2.0, // Longer shake
    directionalBiasX: 0,
    directionalBiasY: 0,
  },
  [TraumaSource.Kill]: {
    trauma: 0.4,
    durationMultiplier: 0.6, // Quick satisfying punch
    directionalBiasX: 0,
    directionalBiasY: -0.2, // Slight downward crunch
  },
  [TraumaSource.PlayerDamage]: {
    trauma: 0.25,
    durationMultiplier: 1.0,
    directionalBiasX: 0,
    directionalBiasY: 0,
  },
  [TraumaSource.Explosion]: {
    trauma: 0.7,
    durationMultiplier: 1.5,
    directionalBiasX: 0,
    directionalBiasY: 0,
  },
};

/**
 * ScreenShake - trauma-based camera shake system.
 */
export class ScreenShake {
  private scene: Phaser.Scene;
  private eventBus: EventBus;
  private config: ScreenShakeConfig;
  private camera: Phaser.Cameras.Scene2D.Camera & { rotation?: number };

  // Trauma state
  private trauma: number = 0;
  private traumaDecayMultiplier: number = 1.0;

  // Noise time accumulators
  private noiseTimeX: number = 0;
  private noiseTimeY: number = 0;
  private noiseTimeRot: number = 0;

  // Original camera scroll (to restore after shake)
  private originalScrollX: number = 0;
  private originalScrollY: number = 0;
  private originalRotation: number = 0;

  // Directional bias (for Force push/pull effects)
  private biasX: number = 0;
  private biasY: number = 0;
  private biasDecay: number = 0.95;

  // Active state
  private isActive: boolean = false;

  // Simple noise function (approximation using sine)
  private noiseSeed: number = Math.random() * 1000;

  constructor(
    scene: Phaser.Scene,
    eventBus: EventBus,
    config: Partial<ScreenShakeConfig> = {}
  ) {
    this.scene = scene;
    this.eventBus = eventBus;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.camera = scene.cameras.main;

    // Store original camera state
    this.storeOriginalState();

    // Listen for shake events
    this.setupEventListeners();
  }

  /**
   * Store original camera state.
   */
  private storeOriginalState(): void {
    this.originalScrollX = this.camera.scrollX;
    this.originalScrollY = this.camera.scrollY;
    this.originalRotation = this.camera.rotation ?? 0;
  }

  /**
   * Setup event listeners.
   */
  private setupEventListeners(): void {
    this.eventBus.on('effect:screen_shake', (event) => {
      const data = event.data as {
        intensity?: number;
        duration?: number;
        source?: string;
        direction?: number;
      };

      if (data.source && data.source in TraumaSource) {
        this.addTraumaFromSource(data.source as TraumaSource, data.direction);
      } else if (data.intensity !== undefined) {
        this.addTrauma(data.intensity, data.duration);
      }
    });

    // Listen for combat events
    this.eventBus.on('combat:feedback', (event) => {
      const data = event.data as {
        hitType: string;
        damage: number;
        attackerId: number;
      };

      // Determine trauma source from hit type
      let source = TraumaSource.LightHit;
      if (data.hitType === 'heavy') {
        source = TraumaSource.HeavyHit;
      } else if (data.hitType === 'kill') {
        source = TraumaSource.Kill;
      } else if (data.hitType === 'force') {
        source = TraumaSource.ForcePush;
      }

      // Only shake on player attacks (id 0)
      if (data.attackerId === 0) {
        this.addTraumaFromSource(source);
      }
    });

    // Player damage
    this.eventBus.on('player:damaged', () => {
      this.addTraumaFromSource(TraumaSource.PlayerDamage);
    });
  }

  /**
   * Add trauma from a specific source.
   */
  addTraumaFromSource(source: TraumaSource, direction?: number): void {
    const config = TRAUMA_CONFIGS[source];

    this.trauma = Math.min(
      this.config.maxTrauma,
      this.trauma + config.trauma
    );

    this.traumaDecayMultiplier = config.durationMultiplier;

    // Apply directional bias
    if (direction !== undefined) {
      this.biasX = config.directionalBiasX * Math.cos(direction);
      this.biasY = config.directionalBiasX * Math.sin(direction);
    } else {
      this.biasX = config.directionalBiasX;
      this.biasY = config.directionalBiasY;
    }

    if (!this.isActive) {
      this.isActive = true;
      this.storeOriginalState();
    }
  }

  /**
   * Add raw trauma value.
   */
  addTrauma(amount: number, durationMultiplier: number = 1.0): void {
    this.trauma = Math.min(
      this.config.maxTrauma,
      this.trauma + amount
    );
    this.traumaDecayMultiplier = durationMultiplier;

    if (!this.isActive) {
      this.isActive = true;
      this.storeOriginalState();
    }
  }

  /**
   * Simple noise function using sine approximation.
   */
  private noise(t: number, seed: number = 0): number {
    // Multiple sine waves at different frequencies for noise-like behavior
    const s = this.noiseSeed + seed;
    return (
      Math.sin(t * 1.0 + s) * 0.5 +
      Math.sin(t * 2.3 + s * 1.3) * 0.3 +
      Math.sin(t * 4.7 + s * 2.1) * 0.2
    );
  }

  /**
   * Update screen shake - call every frame.
   */
  update(deltaMs: number): void {
    if (!this.isActive || this.trauma <= 0) {
      if (this.isActive) {
        this.resetCamera();
        this.isActive = false;
      }
      return;
    }

    const deltaSeconds = deltaMs / 1000;

    // Update noise time
    const timeStep = deltaSeconds * this.config.frequency;
    this.noiseTimeX += timeStep;
    this.noiseTimeY += timeStep * 1.1; // Slightly different frequency
    this.noiseTimeRot += timeStep * 0.9;

    // Calculate shake amount (trauma squared for exponential feel)
    const shake = this.trauma * this.trauma;

    // Calculate offsets using noise
    const noiseX = this.noise(this.noiseTimeX, 0);
    const noiseY = this.noise(this.noiseTimeY, 100);
    const noiseRot = this.noise(this.noiseTimeRot, 200);

    // Apply shake with directional bias
    const offsetX = (noiseX + this.biasX) * shake * this.config.maxOffsetX;
    const offsetY = (noiseY + this.biasY) * shake * this.config.maxOffsetY;

    // Apply to camera
    this.camera.scrollX = this.originalScrollX + offsetX;
    this.camera.scrollY = this.originalScrollY + offsetY;

    if (this.config.useRotation && this.camera.rotation !== undefined) {
      const rotation = noiseRot * shake * this.config.maxRotation;
      (this.camera as { rotation: number }).rotation = this.originalRotation + rotation;
    }

    // Decay trauma
    this.trauma -= this.config.traumaDecayRate * deltaSeconds / this.traumaDecayMultiplier;
    this.trauma = Math.max(0, this.trauma);

    // Decay bias
    this.biasX *= this.biasDecay;
    this.biasY *= this.biasDecay;

    // Update original state for camera following
    if (this.camera.scrollX !== this.originalScrollX + offsetX) {
      this.originalScrollX = this.camera.scrollX - offsetX;
    }
    if (this.camera.scrollY !== this.originalScrollY + offsetY) {
      this.originalScrollY = this.camera.scrollY - offsetY;
    }
  }

  /**
   * Reset camera to original state.
   */
  private resetCamera(): void {
    if (this.camera.rotation !== undefined) {
      (this.camera as { rotation: number }).rotation = this.originalRotation;
    }
    this.biasX = 0;
    this.biasY = 0;
  }

  /**
   * Get current trauma level.
   */
  getTrauma(): number {
    return this.trauma;
  }

  /**
   * Immediately stop all shake.
   */
  stop(): void {
    this.trauma = 0;
    this.resetCamera();
    this.isActive = false;
  }

  /**
   * Check if shake is active.
   */
  getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * Update configuration.
   */
  setConfig(config: Partial<ScreenShakeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Clean up.
   */
  destroy(): void {
    this.stop();
  }
}
