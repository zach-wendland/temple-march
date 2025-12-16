/**
 * AI System Exports
 * Central export point for AI-related modules.
 */

// Behaviors
export {
  BaseBehavior,
  PatrolBehavior,
  ChaseBehavior,
  StrafeBehavior,
  FleeBehavior,
  SurroundBehavior,
  CoverFireBehavior,
  FormationBehavior,
} from './AIBehavior';

// Squad coordination
export {
  Squad,
  SquadCoordinator,
  FormationType,
  SquadState,
  SquadConfig,
} from './SquadCoordinator';
