/**
 * Combat UI System - Public API
 * Export all UI components for the Temple March combat system.
 */

// Configuration
export {
  COLORS,
  COLORS_HEX,
  TYPOGRAPHY,
  COMBO_CONFIG,
  DAMAGE_NUMBER_CONFIG,
  HIT_FEEDBACK_CONFIG,
  HEALTH_BAR_CONFIG,
  FORCE_BAR_CONFIG,
  ENEMY_HEALTH_CONFIG,
  COMBAT_STATE_CONFIG,
  PERFORMANCE_CONFIG,
  ACCESSIBILITY_CONFIG,
  getDamageSize,
  getComboTierColor,
  getComboScaling,
  applyColorblindMode,
} from './CombatUIConfig';

// Components
export { ComboCounter } from './ComboCounter';
export { DamageNumberPool, type DamageType } from './DamageNumberPool';
export { HitFeedbackSystem, type HitType } from './HitFeedbackSystem';
export { HealthBar } from './HealthBar';
export { ForceBar } from './ForceBar';
export {
  EnemyHealthBar,
  EnemyHealthBarManager,
  type EnemyType,
} from './EnemyHealthBar';
