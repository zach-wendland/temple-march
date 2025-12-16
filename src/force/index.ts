/**
 * Force Powers module exports.
 * Provides Force power mechanics for Vader's dark side abilities.
 *
 * Phase 5 - Force Powers & Effects:
 * - ForceSystem: Central orchestrator for all Force powers
 * - Force Push: Cone-based knockback with damage falloff
 * - Force Pull: Attraction physics pulling enemies toward Vader
 * - Force Lightning: Chained lightning with sustained damage
 * - ScreenShake: Trauma-based camera shake system
 * - HitStop: Frame freeze for combat impact feedback
 */

export {
  ForceSystem,
  ForcePowerType,
  ForcePowerConfig,
  ForcePowerResult,
  ForcePowerEventData,
  ForceTarget,
  FORCE_POWER_CONFIGS,
} from './ForceSystem';

export { ScreenShake, ScreenShakeConfig, TraumaSource } from './ScreenShake';
export { HitStop, HitStopConfig, HitStopIntensity } from './HitStop';
