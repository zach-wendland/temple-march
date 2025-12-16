/**
 * BootScene - Asset preloading and initialization.
 * First scene loaded, handles all asset loading before game starts.
 */

import Phaser from 'phaser';
import { SceneKey } from '../core/types';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';

export class BootScene extends Phaser.Scene {
  private loadingText!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBox!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: SceneKey.Boot });
  }

  preload(): void {
    this.createLoadingUI();
    this.loadAssets();
  }

  create(): void {
    // Transition to main menu after loading
    this.time.delayedCall(500, () => {
      this.scene.start(SceneKey.MainMenu);
    });
  }

  private createLoadingUI(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // Background
    this.cameras.main.setBackgroundColor('#000000');

    // Title
    this.add
      .text(centerX, centerY - 100, 'TEMPLE MARCH', {
        fontFamily: 'Arial Black',
        fontSize: '48px',
        color: '#FFD700',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Subtitle
    this.add
      .text(centerX, centerY - 50, 'Order 66', {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#8B0000',
      })
      .setOrigin(0.5);

    // Progress box (background)
    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x222222, 0.8);
    this.progressBox.fillRect(centerX - 160, centerY + 20, 320, 30);

    // Progress bar (fill)
    this.progressBar = this.add.graphics();

    // Loading text
    this.loadingText = this.add
      .text(centerX, centerY + 70, 'Loading... 0%', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#FFFFFF',
      })
      .setOrigin(0.5);

    // Progress events
    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0xffd700, 1);
      this.progressBar.fillRect(centerX - 155, centerY + 25, 310 * value, 20);
      this.loadingText.setText(`Loading... ${Math.floor(value * 100)}%`);
    });

    this.load.on('complete', () => {
      this.loadingText.setText('Complete!');
    });
  }

  private loadAssets(): void {
    // Placeholder assets - will be replaced with actual sprites
    // For now, create placeholder graphics

    // Generate placeholder sprites programmatically
    this.createPlaceholderSprites();

    // Load any actual assets here when available
    // this.load.spritesheet('vader', 'assets/vader.png', { frameWidth: 80, frameHeight: 120 });
    // this.load.spritesheet('clone', 'assets/clone.png', { frameWidth: 32, frameHeight: 32 });
    // etc.
  }

  private createPlaceholderSprites(): void {
    // Create cleaner placeholder graphics
    // These will be replaced with actual sprites later

    // VADER - Dark Lord (Black with red saber)
    const playerGraphics = this.make.graphics({ x: 0, y: 0 });
    // Body - dark silhouette
    playerGraphics.fillStyle(0x111111, 1);
    playerGraphics.fillRoundedRect(8, 8, 32, 48, 4);
    // Cape flowing
    playerGraphics.fillStyle(0x0a0a0a, 1);
    playerGraphics.fillTriangle(8, 56, 40, 56, 24, 72);
    // Helmet
    playerGraphics.fillStyle(0x1a1a1a, 1);
    playerGraphics.fillCircle(24, 12, 10);
    // Red lightsaber glow
    playerGraphics.fillStyle(0xff0000, 0.3);
    playerGraphics.fillRect(40, 8, 12, 48);
    playerGraphics.fillStyle(0xff3333, 1);
    playerGraphics.fillRect(44, 10, 4, 44);
    playerGraphics.fillStyle(0xffffff, 1);
    playerGraphics.fillRect(45, 12, 2, 40);
    playerGraphics.generateTexture('player_placeholder', 56, 80);
    playerGraphics.destroy();

    // CLONE TROOPER - 501st Legion (White with blue)
    const cloneGraphics = this.make.graphics({ x: 0, y: 0 });
    // Armor body
    cloneGraphics.fillStyle(0xeeeeee, 1);
    cloneGraphics.fillRoundedRect(4, 8, 24, 36, 2);
    // Helmet
    cloneGraphics.fillStyle(0xffffff, 1);
    cloneGraphics.fillCircle(16, 8, 8);
    // Blue 501st markings
    cloneGraphics.fillStyle(0x4169e1, 1);
    cloneGraphics.fillRect(4, 8, 24, 6);
    cloneGraphics.fillRect(4, 20, 8, 4);
    // Visor
    cloneGraphics.fillStyle(0x111111, 1);
    cloneGraphics.fillRect(10, 4, 12, 4);
    // Blaster
    cloneGraphics.fillStyle(0x333333, 1);
    cloneGraphics.fillRect(26, 20, 10, 4);
    cloneGraphics.generateTexture('clone_placeholder', 40, 48);
    cloneGraphics.destroy();

    // JEDI - Brown robes with green saber
    const jediGraphics = this.make.graphics({ x: 0, y: 0 });
    // Robe body
    jediGraphics.fillStyle(0x8b6914, 1);
    jediGraphics.fillRoundedRect(4, 12, 32, 44, 4);
    // Hood/head
    jediGraphics.fillStyle(0x6b4914, 1);
    jediGraphics.fillCircle(20, 10, 10);
    // Face
    jediGraphics.fillStyle(0xdeb887, 1);
    jediGraphics.fillCircle(20, 10, 6);
    // Green lightsaber glow
    jediGraphics.fillStyle(0x00ff00, 0.3);
    jediGraphics.fillRect(36, 8, 10, 44);
    jediGraphics.fillStyle(0x00ff00, 1);
    jediGraphics.fillRect(40, 10, 4, 40);
    jediGraphics.fillStyle(0xaaffaa, 1);
    jediGraphics.fillRect(41, 12, 2, 36);
    jediGraphics.generateTexture('jedi_placeholder', 52, 64);
    jediGraphics.destroy();

    // TEMPLE GUARD - Masked with yellow pike
    const guardGraphics = this.make.graphics({ x: 0, y: 0 });
    // Robe
    guardGraphics.fillStyle(0x8b6914, 1);
    guardGraphics.fillRoundedRect(8, 16, 32, 52, 4);
    // Gold mask
    guardGraphics.fillStyle(0xffd700, 1);
    guardGraphics.fillRoundedRect(12, 4, 24, 16, 4);
    // Mask slots
    guardGraphics.fillStyle(0x111111, 1);
    guardGraphics.fillRect(16, 8, 6, 3);
    guardGraphics.fillRect(26, 8, 6, 3);
    // Yellow saber pike - long
    guardGraphics.fillStyle(0xffd700, 0.3);
    guardGraphics.fillRect(40, 0, 10, 72);
    guardGraphics.fillStyle(0xffd700, 1);
    guardGraphics.fillRect(44, 0, 4, 72);
    guardGraphics.fillStyle(0xffff88, 1);
    guardGraphics.fillRect(45, 2, 2, 68);
    guardGraphics.generateTexture('guard_placeholder', 56, 80);
    guardGraphics.destroy();

    // Floor tile - not needed with gradient bg
    const tileGraphics = this.make.graphics({ x: 0, y: 0 });
    tileGraphics.fillStyle(0x2a2a3a, 1);
    tileGraphics.fillRect(0, 0, 32, 32);
    tileGraphics.generateTexture('tile_placeholder', 32, 32);
    tileGraphics.destroy();

    // Glow particle for effects
    const glowGraphics = this.make.graphics({ x: 0, y: 0 });
    glowGraphics.fillStyle(0xffffff, 1);
    glowGraphics.fillCircle(8, 8, 8);
    glowGraphics.generateTexture('glow_particle', 16, 16);
    glowGraphics.destroy();
  }
}
