/**
 * ObjectPool - Generic object pooling system for performance optimization.
 * Prevents garbage collection spikes by reusing objects.
 *
 * "Efficiency is the dark side's weapon - waste nothing."
 */

import { Logger } from '../utils/Logger';

/**
 * Poolable object interface.
 */
export interface Poolable {
  /** Reset object to initial state for reuse */
  reset(): void;
  /** Check if object is currently active */
  isActive(): boolean;
  /** Deactivate and return to pool */
  deactivate(): void;
}

/**
 * Pool configuration.
 */
export interface PoolConfig {
  /** Initial pool size */
  initialSize: number;
  /** Maximum pool size (0 = unlimited) */
  maxSize: number;
  /** Auto-expand when empty */
  autoExpand: boolean;
  /** Expansion batch size */
  expandSize: number;
}

const DEFAULT_POOL_CONFIG: PoolConfig = {
  initialSize: 20,
  maxSize: 100,
  autoExpand: true,
  expandSize: 10,
};

/**
 * Generic object pool.
 */
export class ObjectPool<T extends Poolable> {
  private pool: T[] = [];
  private active: Set<T> = new Set();
  private factory: () => T;
  private config: PoolConfig;

  // Stats
  private totalCreated: number = 0;
  private peakActive: number = 0;

  constructor(factory: () => T, config: Partial<PoolConfig> = {}) {
    this.factory = factory;
    this.config = { ...DEFAULT_POOL_CONFIG, ...config };

    // Pre-populate pool
    this.expand(this.config.initialSize);
  }

  /**
   * Get an object from the pool.
   */
  acquire(): T | null {
    let obj: T | undefined;

    // Try to get from pool
    if (this.pool.length > 0) {
      obj = this.pool.pop();
    } else if (this.config.autoExpand) {
      // Expand pool if allowed
      if (this.config.maxSize === 0 || this.totalCreated < this.config.maxSize) {
        this.expand(Math.min(this.config.expandSize, this.config.maxSize - this.totalCreated || this.config.expandSize));
        obj = this.pool.pop();
      }
    }

    if (obj) {
      obj.reset();
      this.active.add(obj);
      this.peakActive = Math.max(this.peakActive, this.active.size);
      return obj;
    }

    return null;
  }

  /**
   * Return an object to the pool.
   */
  release(obj: T): void {
    if (!this.active.has(obj)) {
      Logger.warn('Attempted to release object not from this pool');
      return;
    }

    obj.deactivate();
    this.active.delete(obj);
    this.pool.push(obj);
  }

  /**
   * Release all active objects.
   */
  releaseAll(): void {
    for (const obj of this.active) {
      obj.deactivate();
      this.pool.push(obj);
    }
    this.active.clear();
  }

  /**
   * Get pool statistics.
   */
  getStats(): {
    poolSize: number;
    activeCount: number;
    totalCreated: number;
    peakActive: number;
    utilization: number;
  } {
    return {
      poolSize: this.pool.length,
      activeCount: this.active.size,
      totalCreated: this.totalCreated,
      peakActive: this.peakActive,
      utilization: this.active.size / (this.pool.length + this.active.size) || 0,
    };
  }

  /**
   * Expand the pool.
   */
  private expand(count: number): void {
    for (let i = 0; i < count; i++) {
      const obj = this.factory();
      obj.deactivate();
      this.pool.push(obj);
      this.totalCreated++;
    }
  }

  /**
   * Shrink pool to target size.
   */
  shrink(targetSize: number): void {
    while (this.pool.length > targetSize) {
      this.pool.pop();
    }
  }

  /**
   * Get active count.
   */
  getActiveCount(): number {
    return this.active.size;
  }

  /**
   * Get available count.
   */
  getAvailableCount(): number {
    return this.pool.length;
  }

  /**
   * Iterate over active objects.
   */
  forEachActive(callback: (obj: T) => void): void {
    for (const obj of this.active) {
      callback(obj);
    }
  }

  /**
   * Destroy pool and all objects.
   */
  destroy(): void {
    this.releaseAll();
    this.pool = [];
    this.active.clear();
  }
}

/**
 * Particle pool for visual effects.
 */
export interface PooledParticle extends Poolable {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: { r: number; g: number; b: number; a: number };
  active: boolean;
}

/**
 * Create a particle factory.
 */
export function createParticleFactory(): () => PooledParticle {
  return () => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 1000,
    size: 2,
    color: { r: 255, g: 255, b: 255, a: 1 },
    active: false,
    reset() {
      this.life = this.maxLife;
      this.active = true;
    },
    isActive() {
      return this.active && this.life > 0;
    },
    deactivate() {
      this.active = false;
      this.life = 0;
    },
  });
}

/**
 * Vector pool for physics calculations.
 */
export interface PooledVector extends Poolable {
  x: number;
  y: number;
  active: boolean;
  set(x: number, y: number): this;
  add(other: { x: number; y: number }): this;
  scale(scalar: number): this;
  normalize(): this;
  length(): number;
}

/**
 * Create a vector factory.
 */
export function createVectorFactory(): () => PooledVector {
  return () => ({
    x: 0,
    y: 0,
    active: false,
    reset() {
      this.x = 0;
      this.y = 0;
      this.active = true;
    },
    isActive() {
      return this.active;
    },
    deactivate() {
      this.active = false;
    },
    set(x: number, y: number) {
      this.x = x;
      this.y = y;
      return this;
    },
    add(other: { x: number; y: number }) {
      this.x += other.x;
      this.y += other.y;
      return this;
    },
    scale(scalar: number) {
      this.x *= scalar;
      this.y *= scalar;
      return this;
    },
    normalize() {
      const len = this.length();
      if (len > 0) {
        this.x /= len;
        this.y /= len;
      }
      return this;
    },
    length() {
      return Math.sqrt(this.x * this.x + this.y * this.y);
    },
  });
}

/**
 * Performance monitor for tracking frame times and memory.
 */
export class PerformanceMonitor {
  private frameTimes: number[] = [];
  private maxSamples: number = 60;
  private lastTime: number = 0;

  // Warnings
  private frameDropWarnings: number = 0;
  private targetFps: number = 60;
  private warningThreshold: number = 1000 / 30; // Below 30fps

  /**
   * Record frame start.
   */
  frameStart(): void {
    this.lastTime = performance.now();
  }

  /**
   * Record frame end.
   */
  frameEnd(): void {
    const frameTime = performance.now() - this.lastTime;
    this.frameTimes.push(frameTime);

    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }

    // Check for frame drops
    if (frameTime > this.warningThreshold) {
      this.frameDropWarnings++;
    }
  }

  /**
   * Get average frame time.
   */
  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 0;
    return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
  }

  /**
   * Get current FPS.
   */
  getFps(): number {
    const avgFrameTime = this.getAverageFrameTime();
    return avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
  }

  /**
   * Get frame time percentiles.
   */
  getPercentiles(): { p50: number; p95: number; p99: number } {
    if (this.frameTimes.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const p50Index = Math.floor(sorted.length * 0.5);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      p50: sorted[p50Index] || 0,
      p95: sorted[p95Index] || 0,
      p99: sorted[p99Index] || 0,
    };
  }

  /**
   * Get frame drop count.
   */
  getFrameDropWarnings(): number {
    return this.frameDropWarnings;
  }

  /**
   * Reset stats.
   */
  reset(): void {
    this.frameTimes = [];
    this.frameDropWarnings = 0;
  }

  /**
   * Get full performance report.
   */
  getReport(): {
    fps: number;
    avgFrameTime: number;
    percentiles: { p50: number; p95: number; p99: number };
    frameDrops: number;
    memoryUsage?: number;
  } {
    const report: {
      fps: number;
      avgFrameTime: number;
      percentiles: { p50: number; p95: number; p99: number };
      frameDrops: number;
      memoryUsage?: number;
    } = {
      fps: this.getFps(),
      avgFrameTime: this.getAverageFrameTime(),
      percentiles: this.getPercentiles(),
      frameDrops: this.frameDropWarnings,
    };

    // Add memory usage if available
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory;
      report.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
    }

    return report;
  }
}

/**
 * Global performance monitor instance.
 */
export const performanceMonitor = new PerformanceMonitor();
