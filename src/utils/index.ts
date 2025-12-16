/**
 * Utility Functions Module
 * Common helpers for the Temple March game.
 */

/**
 * Clamps a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values.
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Calculates distance between two 2D points.
 */
export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Normalizes an angle to be between -PI and PI.
 */
export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

/**
 * Generates a seeded random number for deterministic results.
 */
export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Converts degrees to radians.
 */
export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Converts radians to degrees.
 */
export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Easing function: ease out quad.
 */
export function easeOutQuad(t: number): number {
  return t * (2 - t);
}

/**
 * Easing function: ease in quad.
 */
export function easeInQuad(t: number): number {
  return t * t;
}

/**
 * Easing function: ease in out quad.
 */
export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
