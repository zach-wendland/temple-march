/**
 * HitStop - Frame freeze system for combat impact.
 * Momentarily pauses the game on significant hits to add weight and impact.
 *
 * "When Vader's saber connects, time itself hesitates."
 */

import Phaser from 'phaser';
import { EventBus } from '../core/events/EventBus';

/**
 * Hit stop configuration.
 */
export interface HitStopConfig {
  /** Duration of frame freeze in ms */
  duration: number;
  /** Scale multiplier during hit stop (slight zoom) */
  scale: number;
  /** Should we also freeze enemies? */
  freezeEnemies: boolean;
  /** Time scale during hit stop (0 = complete freeze, 0.1 = slow motion) */
  timeScale: number;
}

/**
 * Hit stop intensity presets.
 */
export enum HitStopIntensity {
  /** Light attack - brief pause */
  Light = 'light',
  /** Heavy attack - noticeable pause */
  Heavy = 'heavy',
  /** Critical hit - dramatic pause */
  Critical = 'critical',
  /** Kill - satisfying freeze */
  Kill = 'kill',
  /** Force power - dark side impact */
  Force = 'force',
  /** Parry - clash freeze */
  Parry = 'parry',
}

/**
 * Hit stop configurations per intensity.
 */
const HIT_STOP_CONFIGS: Record<HitStopIntensity, HitStopConfig> = {
  [HitStopIntensity.Light]: {
    duration: 30,
    scale: 1.0,
    freezeEnemies: true,
    timeScale: 0.1,
  },
  [HitStopIntensity.Heavy]: {
    duration: 60,
    scale: 1.01,
    freezeEnemies: true,
    timeScale: 0.05,
  },
  [HitStopIntensity.Critical]: {
    duration: 100,
    scale: 1.02,
    freezeEnemies: true,
    timeScale: 0.02,
  },
  [HitStopIntensity.Kill]: {
    duration: 120,
    scale: 1.03,
    freezeEnemies: true,
    timeScale: 0.0,
  },
  [HitStopIntensity.Force]: {
    duration: 80,
    scale: 1.015,
    freezeEnemies: true,
    timeScale: 0.03,
  },
  [HitStopIntensity.Parry]: {
    duration: 70,
    scale: 1.01,
    freezeEnemies: true,
    timeScale: 0.05,
  },
};

/**
 * Active hit stop state.
 */
interface HitStopState {
  /** Is hit stop currently active? */
  active: boolean;
  /** Start time */
  startTime: number;
  /** Duration */
  duration: number;
  /** Original time scale */
  originalTimeScale: number;
  /** Target time scale */
  targetTimeScale: number;
  /** Target camera scale */
  targetScale: number;
  /** Original camera zoom */
  originalZoom: number;
  /** Intensity level */
  intensity: HitStopIntensity;
}

/**
 * HitStop - frame freeze system for combat impact.
 */
export class HitStop {
  private scene: Phaser.Scene;
  private eventBus: EventBus;
  private camera: Phaser.Cameras.Scene2D.Camera;

  // State
  private state: HitStopState = {
    active: false,
    startTime: 0,
    duration: 0,
    originalTimeScale: 1,
    targetTimeScale: 0,
    targetScale: 1,
    originalZoom: 1,
    intensity: HitStopIntensity.Light,
  };

  // Queue for overlapping hit stops
  private queue: { intensity: HitStopIntensity; priority: number }[] = [];

  // Callbacks
  private onHitStopStart: (() => void) | null = null;
  private onHitStopEnd: (() => void) | null = null;

  constructor(scene: Phaser.Scene, eventBus: EventBus) {
    this.scene = scene;
    this.eventBus = eventBus;
    this.camera = scene.cameras.main;

    this.setupEventListeners();
  }

  /**
   * Setup event listeners for automatic hit stop.
   */
  private setupEventListeners(): void {
    // Listen for combat feedback
    this.eventBus.on('combat:feedback', (event) => {
      const data = event.data as {
        hitType: string;
        attackerId: number;
        damage: number;
      };

      // Only trigger on player attacks (id 0)
      if (data.attackerId !== 0) return;

      // Determine intensity based on hit type
      let intensity = HitStopIntensity.Light;
      switch (data.hitType) {
        case 'light':
          intensity = HitStopIntensity.Light;
          break;
        case 'heavy':
          intensity = HitStopIntensity.Heavy;
          break;
        case 'critical':
          intensity = HitStopIntensity.Critical;
          break;
        case 'kill':
          intensity = HitStopIntensity.Kill;
          break;
        case 'force':
          intensity = HitStopIntensity.Force;
          break;
      }

      this.trigger(intensity);
    });

    // Listen for parry events
    this.eventBus.on('combat:parry', () => {
      this.trigger(HitStopIntensity.Parry);
    });

    // Listen for Force power events
    this.eventBus.on('force:power_used', (event) => {
      const data = event.data as { targetsHit: number[]; damage: number };
      if (data.targetsHit.length > 0) {
        this.trigger(HitStopIntensity.Force);
      }
    });
  }

  /**
   * Trigger hit stop with specified intensity.
   */
  trigger(intensity: HitStopIntensity, priority: number = 0): void {
    const config = HIT_STOP_CONFIGS[intensity];

    // If already in hit stop
    if (this.state.active) {
      // Higher intensity can override
      const currentPriority = this.getIntensityPriority(this.state.intensity);
      const newPriority = this.getIntensityPriority(intensity);

      if (newPriority > currentPriority) {
        // Override current hit stop
        this.endHitStop();
        this.startHitStop(intensity, config);
      } else {
        // Queue for later
        this.queue.push({ intensity, priority });
      }
      return;
    }

    this.startHitStop(intensity, config);
  }

  /**
   * Get priority value for intensity level.
   */
  private getIntensityPriority(intensity: HitStopIntensity): number {
    const priorities: Record<HitStopIntensity, number> = {
      [HitStopIntensity.Light]: 1,
      [HitStopIntensity.Heavy]: 2,
      [HitStopIntensity.Parry]: 3,
      [HitStopIntensity.Force]: 4,
      [HitStopIntensity.Critical]: 5,
      [HitStopIntensity.Kill]: 6,
    };
    return priorities[intensity];
  }

  /**
   * Start hit stop effect.
   */
  private startHitStop(intensity: HitStopIntensity, config: HitStopConfig): void {
    this.state = {
      active: true,
      startTime: Date.now(),
      duration: config.duration,
      originalTimeScale: this.scene.time.timeScale,
      targetTimeScale: config.timeScale,
      targetScale: config.scale,
      originalZoom: this.camera.zoom,
      intensity,
    };

    // Apply time scale
    this.scene.time.timeScale = config.timeScale;

    // Apply camera zoom (slight punch in)
    this.scene.tweens.add({
      targets: this.camera,
      zoom: this.state.originalZoom * config.scale,
      duration: config.duration * 0.3,
      ease: 'Power2',
    });

    // Emit event
    this.eventBus.emit({
      type: 'effect:hit_stop_start',
      data: {
        intensity,
        duration: config.duration,
      },
    });

    // Call callback
    if (this.onHitStopStart) {
      this.onHitStopStart();
    }
  }

  /**
   * End hit stop effect.
   */
  private endHitStop(): void {
    if (!this.state.active) return;

    // Restore time scale
    this.scene.time.timeScale = this.state.originalTimeScale;

    // Restore camera zoom
    this.scene.tweens.add({
      targets: this.camera,
      zoom: this.state.originalZoom,
      duration: 100,
      ease: 'Power2',
    });

    this.state.active = false;

    // Emit event
    this.eventBus.emit({
      type: 'effect:hit_stop_end',
      data: {
        intensity: this.state.intensity,
      },
    });

    // Call callback
    if (this.onHitStopEnd) {
      this.onHitStopEnd();
    }
  }

  /**
   * Update hit stop - call every frame.
   */
  update(deltaMs: number): void {
    if (!this.state.active) {
      // Check queue
      if (this.queue.length > 0) {
        // Sort by priority and trigger highest
        this.queue.sort((a, b) => b.priority - a.priority);
        const next = this.queue.shift();
        if (next) {
          this.trigger(next.intensity, next.priority);
        }
      }
      return;
    }

    const now = Date.now();
    const elapsed = now - this.state.startTime;

    // Check if hit stop should end
    if (elapsed >= this.state.duration) {
      this.endHitStop();
    }
  }

  /**
   * Check if hit stop is active.
   */
  isActive(): boolean {
    return this.state.active;
  }

  /**
   * Get current hit stop intensity.
   */
  getCurrentIntensity(): HitStopIntensity | null {
    return this.state.active ? this.state.intensity : null;
  }

  /**
   * Get remaining duration.
   */
  getRemainingDuration(): number {
    if (!this.state.active) return 0;
    return Math.max(0, this.state.duration - (Date.now() - this.state.startTime));
  }

  /**
   * Force end hit stop immediately.
   */
  cancel(): void {
    this.endHitStop();
    this.queue = [];
  }

  /**
   * Set callback for hit stop start.
   */
  setOnHitStopStart(callback: () => void): void {
    this.onHitStopStart = callback;
  }

  /**
   * Set callback for hit stop end.
   */
  setOnHitStopEnd(callback: () => void): void {
    this.onHitStopEnd = callback;
  }

  /**
   * Get configuration for an intensity level.
   */
  getConfig(intensity: HitStopIntensity): HitStopConfig {
    return { ...HIT_STOP_CONFIGS[intensity] };
  }

  /**
   * Clean up.
   */
  destroy(): void {
    this.cancel();
    this.onHitStopStart = null;
    this.onHitStopEnd = null;
  }
}
