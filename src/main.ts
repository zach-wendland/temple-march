/**
 * Temple March - Main Entry Point
 *
 * A Star Wars themed 2D action game built with Phaser.js + p5.js.
 * Play as Vader during Order 66 - Operation Knightfall.
 */

import Phaser from 'phaser';
import { gameConfig, GAME_WIDTH, GAME_HEIGHT } from './config/GameConfig';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { GameScene } from './scenes/GameScene';
import { initEffectsLayer } from './core/EffectsLayer';
import { Logger } from './utils/Logger';

// Register all scenes
const scenes = [BootScene, MainMenuScene, GameScene];

// Create game configuration with scenes
const config: Phaser.Types.Core.GameConfig = {
  ...gameConfig,
  scene: scenes,
};

// Initialize the game when DOM is ready
function initGame(): void {
  // Create Phaser game instance
  const game = new Phaser.Game(config);

  // Initialize p5.js effects layer
  initEffectsLayer(GAME_WIDTH, GAME_HEIGHT);

  // Expose game instance for debugging (dev only)
  if (import.meta.env.DEV) {
    (window as unknown as { game: Phaser.Game }).game = game;
    Logger.info('🎮 Temple March v3.0.0 - Development Mode');
    Logger.info('📦 Phaser.js + p5.js Architecture');
    Logger.info('🎯 Access game instance: window.game');
  }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
