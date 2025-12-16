/**
 * EffectsLayer - Bridge between Phaser.js game and p5.js visual effects.
 *
 * This layer renders procedural visual effects (Force lightning, saber trails,
 * Force waves) using p5.js in instance mode, overlaid on the Phaser game canvas.
 */

import p5 from 'p5';
import { Vector2 } from './types';

/** Effect types available */
export enum EffectType {
  Lightning = 'lightning',
  SaberTrail = 'saber_trail',
  ForceWave = 'force_wave',
  ScreenShake = 'screen_shake',
  HitFlash = 'hit_flash',
}

/** Base effect interface */
export interface Effect {
  id: string;
  type: EffectType;
  position: Vector2;
  startTime: number;
  duration: number;
  data: unknown;
}

/** Lightning effect data */
export interface LightningEffectData {
  target: Vector2;
  color: { r: number; g: number; b: number };
  branches: number;
  intensity: number;
}

/** Saber trail effect data */
export interface SaberTrailData {
  points: Vector2[];
  color: { r: number; g: number; b: number };
  width: number;
  fadeTime: number;
}

/** Force wave effect data */
export interface ForceWaveData {
  maxRadius: number;
  color: { r: number; g: number; b: number };
  rings: number;
}

/**
 * EffectsLayer manages p5.js visual effects overlaid on Phaser.
 */
export class EffectsLayer {
  private p5Instance: p5 | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private effects: Map<string, Effect> = new Map();
  private nextEffectId = 0;
  private gameWidth: number;
  private gameHeight: number;

  constructor(gameWidth: number, gameHeight: number) {
    this.gameWidth = gameWidth;
    this.gameHeight = gameHeight;
  }

  /**
   * Initializes the p5.js instance and overlay canvas.
   */
  init(): void {
    const container = document.getElementById('effects-container');
    if (!container) {
      console.error('Effects container not found');
      return;
    }

    // Create p5 instance in instance mode
    this.p5Instance = new p5((p: p5) => {
      p.setup = () => {
        this.canvas = p.createCanvas(this.gameWidth, this.gameHeight).elt;
        p.pixelDensity(1);
        p.noStroke();
      };

      p.draw = () => {
        p.clear();
        this.renderEffects(p);
      };
    }, container);
  }

  /**
   * Cleans up p5.js instance.
   */
  destroy(): void {
    if (this.p5Instance) {
      this.p5Instance.remove();
      this.p5Instance = null;
    }
    this.effects.clear();
  }

  /**
   * Spawns a Force lightning effect.
   */
  spawnLightning(
    source: Vector2,
    target: Vector2,
    color: { r: number; g: number; b: number } = { r: 100, g: 100, b: 255 },
    duration: number = 300,
    branches: number = 3,
    intensity: number = 1.0
  ): string {
    const id = this.generateId();
    const effect: Effect = {
      id,
      type: EffectType.Lightning,
      position: source,
      startTime: Date.now(),
      duration,
      data: { target, color, branches, intensity } as LightningEffectData,
    };
    this.effects.set(id, effect);
    return id;
  }

  /**
   * Spawns a lightsaber trail effect.
   */
  spawnSaberTrail(
    points: Vector2[],
    color: { r: number; g: number; b: number } = { r: 0, g: 100, b: 255 },
    width: number = 4,
    fadeTime: number = 200
  ): string {
    const id = this.generateId();
    const effect: Effect = {
      id,
      type: EffectType.SaberTrail,
      position: points[0] || { x: 0, y: 0 },
      startTime: Date.now(),
      duration: fadeTime,
      data: { points: [...points], color, width, fadeTime } as SaberTrailData,
    };
    this.effects.set(id, effect);
    return id;
  }

  /**
   * Updates a saber trail with new points.
   */
  updateSaberTrail(id: string, points: Vector2[]): void {
    const effect = this.effects.get(id);
    if (effect && effect.type === EffectType.SaberTrail) {
      const data = effect.data as SaberTrailData;
      data.points = [...points];
      effect.startTime = Date.now(); // Reset timer
    }
  }

  /**
   * Spawns a Force wave effect.
   */
  spawnForceWave(
    center: Vector2,
    maxRadius: number = 200,
    color: { r: number; g: number; b: number } = { r: 150, g: 150, b: 255 },
    duration: number = 500,
    rings: number = 3
  ): string {
    const id = this.generateId();
    const effect: Effect = {
      id,
      type: EffectType.ForceWave,
      position: center,
      startTime: Date.now(),
      duration,
      data: { maxRadius, color, rings } as ForceWaveData,
    };
    this.effects.set(id, effect);
    return id;
  }

  /**
   * Removes an effect by ID.
   */
  removeEffect(id: string): void {
    this.effects.delete(id);
  }

  /**
   * Clears all effects.
   */
  clearEffects(): void {
    this.effects.clear();
  }

  /**
   * Renders all active effects.
   */
  private renderEffects(p: p5): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, effect] of this.effects) {
      const elapsed = now - effect.startTime;
      const progress = Math.min(elapsed / effect.duration, 1);

      if (progress >= 1) {
        toRemove.push(id);
        continue;
      }

      switch (effect.type) {
        case EffectType.Lightning:
          this.renderLightning(p, effect, progress);
          break;
        case EffectType.SaberTrail:
          this.renderSaberTrail(p, effect, progress);
          break;
        case EffectType.ForceWave:
          this.renderForceWave(p, effect, progress);
          break;
      }
    }

    // Clean up expired effects
    for (const id of toRemove) {
      this.effects.delete(id);
    }
  }

  /**
   * Renders Force lightning effect using Perlin noise.
   */
  private renderLightning(p: p5, effect: Effect, progress: number): void {
    const data = effect.data as LightningEffectData;
    const { color, branches, intensity } = data;
    const alpha = (1 - progress) * 255 * intensity;

    // Main bolt
    this.renderLightningBolt(
      p,
      effect.position,
      data.target,
      color,
      alpha,
      3
    );

    // Branch bolts
    for (let i = 0; i < branches; i++) {
      const branchStart = {
        x: p.lerp(effect.position.x, data.target.x, 0.3 + Math.random() * 0.4),
        y: p.lerp(effect.position.y, data.target.y, 0.3 + Math.random() * 0.4),
      };
      const branchEnd = {
        x: branchStart.x + (Math.random() - 0.5) * 100,
        y: branchStart.y + (Math.random() - 0.5) * 100,
      };
      this.renderLightningBolt(p, branchStart, branchEnd, color, alpha * 0.6, 1);
    }
  }

  /**
   * Renders a single lightning bolt with Perlin noise displacement.
   */
  private renderLightningBolt(
    p: p5,
    start: Vector2,
    end: Vector2,
    color: { r: number; g: number; b: number },
    alpha: number,
    width: number
  ): void {
    const segments = 10;
    const noiseScale = 0.1;
    const displacement = 20;

    // Glow layer
    p.strokeWeight(width * 4);
    p.stroke(color.r, color.g, color.b, alpha * 0.3);
    p.noFill();
    p.beginShape();
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = p.lerp(start.x, end.x, t);
      const y = p.lerp(start.y, end.y, t);
      const noise = p.noise(x * noiseScale, y * noiseScale, p.frameCount * 0.1);
      const offsetX = (noise - 0.5) * displacement;
      const offsetY = (p.noise(y * noiseScale, x * noiseScale) - 0.5) * displacement;
      p.vertex(x + offsetX, y + offsetY);
    }
    p.endShape();

    // Core layer
    p.strokeWeight(width);
    p.stroke(255, 255, 255, alpha);
    p.beginShape();
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = p.lerp(start.x, end.x, t);
      const y = p.lerp(start.y, end.y, t);
      const noise = p.noise(x * noiseScale, y * noiseScale, p.frameCount * 0.1);
      const offsetX = (noise - 0.5) * displacement * 0.5;
      const offsetY = (p.noise(y * noiseScale, x * noiseScale) - 0.5) * displacement * 0.5;
      p.vertex(x + offsetX, y + offsetY);
    }
    p.endShape();
  }

  /**
   * Renders lightsaber trail effect.
   */
  private renderSaberTrail(p: p5, effect: Effect, progress: number): void {
    const data = effect.data as SaberTrailData;
    const { points, color, width } = data;

    if (points.length < 2) return;

    const alpha = (1 - progress) * 255;

    // Glow layers
    for (let layer = 0; layer < 3; layer++) {
      const layerWidth = width * (3 - layer);
      const layerAlpha = alpha * (0.3 - layer * 0.1);

      p.strokeWeight(layerWidth);
      p.stroke(color.r, color.g, color.b, layerAlpha);
      p.noFill();
      p.beginShape();
      for (const point of points) {
        p.curveVertex(point.x, point.y);
      }
      p.endShape();
    }

    // Core
    p.strokeWeight(width * 0.5);
    p.stroke(255, 255, 255, alpha);
    p.beginShape();
    for (const point of points) {
      p.curveVertex(point.x, point.y);
    }
    p.endShape();
  }

  /**
   * Renders Force wave effect.
   */
  private renderForceWave(p: p5, effect: Effect, progress: number): void {
    const data = effect.data as ForceWaveData;
    const { maxRadius, color, rings } = data;
    const { position } = effect;

    // Easing function
    const easedProgress = this.easeOutQuad(progress);

    for (let ring = 0; ring < rings; ring++) {
      const ringProgress = Math.max(0, Math.min(1, easedProgress - ring * 0.2));
      const radius = ringProgress * maxRadius;
      const alpha = (1 - ringProgress) * 150;

      if (alpha > 0) {
        p.noFill();
        p.strokeWeight(3 - ring);
        p.stroke(color.r, color.g, color.b, alpha);
        p.ellipse(position.x, position.y, radius * 2, radius * 2);
      }
    }
  }

  /**
   * Easing function for smooth animations.
   */
  private easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  /**
   * Generates a unique effect ID.
   */
  private generateId(): string {
    return `effect_${++this.nextEffectId}`;
  }
}

/** Global effects layer instance */
let effectsLayerInstance: EffectsLayer | null = null;

/**
 * Gets or creates the global effects layer.
 */
export function getEffectsLayer(width?: number, height?: number): EffectsLayer {
  if (!effectsLayerInstance && width && height) {
    effectsLayerInstance = new EffectsLayer(width, height);
  }
  return effectsLayerInstance!;
}

/**
 * Initializes the effects layer.
 */
export function initEffectsLayer(width: number, height: number): EffectsLayer {
  if (effectsLayerInstance) {
    effectsLayerInstance.destroy();
  }
  effectsLayerInstance = new EffectsLayer(width, height);
  effectsLayerInstance.init();
  return effectsLayerInstance;
}
