/**
 * MainMenuScene - Main menu with title and start options.
 */

import Phaser from 'phaser';
import { SceneKey } from '../core/types';
import { GAME_WIDTH, GAME_HEIGHT, TEMPLE_SCENES } from '../config/GameConfig';

export class MainMenuScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private menuItems: Phaser.GameObjects.Text[] = [];
  private selectedIndex = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super({ key: SceneKey.MainMenu });
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;

    // Background with gradient effect
    this.cameras.main.setBackgroundColor('#0a0a12');

    // Animated stars background
    this.createStarfield();

    // Title
    this.titleText = this.add
      .text(centerX, 150, 'TEMPLE MARCH', {
        fontFamily: 'Arial Black',
        fontSize: '64px',
        color: '#FFD700',
        stroke: '#8B0000',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    // Subtitle
    this.subtitleText = this.add
      .text(centerX, 220, 'Operation Knightfall', {
        fontFamily: 'Arial',
        fontSize: '28px',
        color: '#8B0000',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);

    // Menu options
    const menuOptions = [
      { label: 'START GAME', action: () => this.startGame() },
      { label: 'SCENE SELECT', action: () => this.showSceneSelect() },
      { label: 'CONTROLS', action: () => this.showControls() },
    ];

    const startY = 350;
    const spacing = 60;

    menuOptions.forEach((option, index) => {
      const text = this.add
        .text(centerX, startY + index * spacing, option.label, {
          fontFamily: 'Arial',
          fontSize: '32px',
          color: '#FFFFFF',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.selectItem(index))
        .on('pointerdown', () => option.action());

      this.menuItems.push(text);
    });

    // Highlight initial selection
    this.updateSelection();

    // Keyboard controls
    this.cursors = this.input.keyboard!.createCursorKeys();

    this.input.keyboard!.on('keydown-UP', () => {
      this.selectedIndex =
        (this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length;
      this.updateSelection();
    });

    this.input.keyboard!.on('keydown-DOWN', () => {
      this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length;
      this.updateSelection();
    });

    this.input.keyboard!.on('keydown-ENTER', () => {
      this.activateSelection();
    });

    this.input.keyboard!.on('keydown-SPACE', () => {
      this.activateSelection();
    });

    // Quote at bottom
    this.add
      .text(centerX, GAME_HEIGHT - 80, '"Execute Order 66."', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#666666',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);

    // Version
    this.add
      .text(GAME_WIDTH - 20, GAME_HEIGHT - 20, 'v3.0.0', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#444444',
      })
      .setOrigin(1, 1);

    // Title animation
    this.tweens.add({
      targets: this.titleText,
      scale: { from: 0.95, to: 1.05 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createStarfield(): void {
    const starCount = 100;

    for (let i = 0; i < starCount; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const size = Phaser.Math.FloatBetween(0.5, 2);
      const alpha = Phaser.Math.FloatBetween(0.3, 1);

      const star = this.add.circle(x, y, size, 0xffffff, alpha);

      // Twinkle animation
      this.tweens.add({
        targets: star,
        alpha: { from: alpha * 0.3, to: alpha },
        duration: Phaser.Math.Between(1000, 3000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 2000),
      });
    }
  }

  private selectItem(index: number): void {
    this.selectedIndex = index;
    this.updateSelection();
  }

  private updateSelection(): void {
    this.menuItems.forEach((item, index) => {
      if (index === this.selectedIndex) {
        item.setColor('#FFD700');
        item.setScale(1.1);
      } else {
        item.setColor('#FFFFFF');
        item.setScale(1);
      }
    });
  }

  private activateSelection(): void {
    switch (this.selectedIndex) {
      case 0:
        this.startGame();
        break;
      case 1:
        this.showSceneSelect();
        break;
      case 2:
        this.showControls();
        break;
    }
  }

  private startGame(): void {
    // Fade out and start first temple scene
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SceneKey.Game);
    });
  }

  private showSceneSelect(): void {
    // Clear current menu
    this.menuItems.forEach((item) => item.destroy());
    this.menuItems = [];

    const centerX = GAME_WIDTH / 2;
    const startY = 300;
    const spacing = 50;

    // Back button
    const backButton = this.add
      .text(100, 100, '< BACK', {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#FFFFFF',
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => backButton.setColor('#FFD700'))
      .on('pointerout', () => backButton.setColor('#FFFFFF'))
      .on('pointerdown', () => this.scene.restart());

    // Scene options
    TEMPLE_SCENES.forEach((sceneConfig, index) => {
      const text = this.add
        .text(centerX, startY + index * spacing, sceneConfig.displayName, {
          fontFamily: 'Arial',
          fontSize: '24px',
          color: '#FFFFFF',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          text.setColor('#FFD700');
          this.showQuote(sceneConfig.quote);
        })
        .on('pointerout', () => text.setColor('#FFFFFF'))
        .on('pointerdown', () => {
          this.cameras.main.fadeOut(500, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start(SceneKey.Game, { startScene: sceneConfig.key });
          });
        });

      this.menuItems.push(text);
    });

    this.selectedIndex = 0;
  }

  private showQuote(quote: string): void {
    // Update subtitle with scene quote
    this.subtitleText.setText(quote);
  }

  private showControls(): void {
    // Clear current menu
    this.menuItems.forEach((item) => item.destroy());
    this.menuItems = [];

    const centerX = GAME_WIDTH / 2;

    // Back button
    const backButton = this.add
      .text(100, 100, '< BACK', {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#FFFFFF',
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => backButton.setColor('#FFD700'))
      .on('pointerout', () => backButton.setColor('#FFFFFF'))
      .on('pointerdown', () => this.scene.restart());

    // Controls display
    const controls = [
      'WASD / Arrow Keys - Move',
      'J / Left Click - Light Attack',
      'K / Right Click - Heavy Attack',
      'L - Block',
      'F - Force Push',
      'G - Force Pull',
      'E - Force Lightning',
      'SPACE - Dash',
      'ESC - Pause',
    ];

    this.add
      .text(centerX, 280, 'CONTROLS', {
        fontFamily: 'Arial Black',
        fontSize: '36px',
        color: '#FFD700',
      })
      .setOrigin(0.5);

    controls.forEach((control, index) => {
      this.add
        .text(centerX, 340 + index * 35, control, {
          fontFamily: 'Arial',
          fontSize: '20px',
          color: '#CCCCCC',
        })
        .setOrigin(0.5);
    });
  }
}
