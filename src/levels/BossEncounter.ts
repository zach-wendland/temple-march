/**
 * BossEncounter - Manages boss fight initialization, phases, and arena mechanics.
 *
 * Handles:
 * - Boss spawning and introduction
 * - Arena door locking
 * - Phase transition effects
 * - Victory/defeat conditions
 * - Apprentice summoning during phase transitions
 */

import Phaser from 'phaser';
import { EventBus, GameEvent } from '../core/events/EventBus';
import { EntityId } from '../core/types';
import { CombatManager } from '../combat/CombatManager';
import { CinDrallig, DralligPhase, createCinDrallig } from '../entities/enemies/CinDrallig';
import { JediDefender } from '../entities/enemies/JediDefender';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import { BossHealthBar, createCinDralligHealthBar } from '../ui/BossHealthBar';
import { BossArenaConfig, DRALLIG_ARENA_CONFIG } from './TempleAreaConfig';

/**
 * Boss encounter state.
 */
export enum BossEncounterState {
  /** Waiting for player to enter arena */
  Waiting = 'waiting',
  /** Playing introduction sequence */
  Introduction = 'introduction',
  /** Active combat */
  Active = 'active',
  /** Phase transition cinematic */
  PhaseTransition = 'phase_transition',
  /** Boss defeated */
  Victory = 'victory',
  /** Player defeated */
  Defeat = 'defeat',
}

/**
 * Boss encounter events.
 */
export interface BossEncounterEvents {
  'boss:encounter_started': { bossName: string };
  'boss:encounter_ended': { bossName: string; victory: boolean; duration: number };
  'boss:intro_complete': { bossName: string };
  'boss:phase_transition': { bossName: string; oldPhase: number; newPhase: number };
}

/**
 * BossEncounter class - Manages the entire boss fight experience.
 */
export class BossEncounter {
  private scene: Phaser.Scene;
  private eventBus: EventBus;
  private combatManager: CombatManager;

  // Boss and arena
  private boss: CinDrallig | null = null;
  private arenaConfig: BossArenaConfig;
  private healthBar: BossHealthBar | null = null;

  // Summoned enemies
  private summonedEnemies: BaseEnemy[] = [];

  // Arena elements
  private arenaWalls: Phaser.GameObjects.Rectangle[] = [];
  private lockedDoors: Phaser.GameObjects.Rectangle[] = [];

  // State
  private state: BossEncounterState = BossEncounterState.Waiting;
  private fightStartTime: number = 0;
  private currentPhase: DralligPhase = DralligPhase.ShiiCho;

  // UI elements
  private introText: Phaser.GameObjects.Text | null = null;
  private phaseText: Phaser.GameObjects.Text | null = null;

  constructor(
    scene: Phaser.Scene,
    eventBus: EventBus,
    combatManager: CombatManager,
    arenaConfig: BossArenaConfig = DRALLIG_ARENA_CONFIG
  ) {
    this.scene = scene;
    this.eventBus = eventBus;
    this.combatManager = combatManager;
    this.arenaConfig = arenaConfig;

    this.setupEventListeners();
  }

  /**
   * Setup event listeners.
   */
  private setupEventListeners(): void {
    // Boss damage events
    this.eventBus.on('boss:phase_transition', (event: GameEvent) => {
      const data = event.data as { bossId: EntityId; newPhase: number };
      if (this.boss && data.bossId === this.boss.id) {
        this.onPhaseTransition(data.newPhase as DralligPhase);
      }
    });

    // Boss defeated
    this.eventBus.on('boss:defeated', (event: GameEvent) => {
      const data = event.data as { bossId: EntityId };
      if (this.boss && data.bossId === this.boss.id) {
        this.onBossDefeated();
      }
    });

    // Summon apprentices event
    this.eventBus.on('boss:summon_apprentices', (event: GameEvent) => {
      const data = event.data as { bossId: EntityId; position: { x: number; y: number }; count: number };
      if (this.boss && data.bossId === this.boss.id) {
        this.summonApprentices(data.position, data.count);
      }
    });

    // Player death
    this.eventBus.on('player:death', () => {
      if (this.state === BossEncounterState.Active) {
        this.onPlayerDefeated();
      }
    });
  }

  /**
   * Check if player is in trigger zone to start encounter.
   */
  checkTriggerZone(playerX: number, playerY: number): boolean {
    if (this.state !== BossEncounterState.Waiting) return false;

    const { bounds } = this.arenaConfig;
    const inArena =
      playerX >= bounds.x &&
      playerX <= bounds.x + bounds.width &&
      playerY >= bounds.y &&
      playerY <= bounds.y + bounds.height;

    if (inArena) {
      this.startEncounter();
      return true;
    }

    return false;
  }

  /**
   * Start the boss encounter.
   */
  startEncounter(): void {
    if (this.state !== BossEncounterState.Waiting) return;

    this.state = BossEncounterState.Introduction;
    this.fightStartTime = Date.now();

    // Lock the arena doors
    this.lockArenaDoors();

    // Create invisible arena walls
    this.createArenaWalls();

    // Play introduction sequence
    this.playIntroduction();

    this.eventBus.emit({
      type: 'boss:encounter_started',
      data: { bossName: 'Cin Drallig' },
    });
  }

  /**
   * Lock arena doors.
   */
  private lockArenaDoors(): void {
    for (const door of this.arenaConfig.lockedDoors) {
      const doorRect = this.scene.add.rectangle(
        door.x + door.width / 2,
        door.y + door.height / 2,
        door.width,
        door.height,
        0x444444,
        0.8
      );
      doorRect.setDepth(50);

      // Add physics
      this.scene.physics.add.existing(doorRect, true);

      this.lockedDoors.push(doorRect);

      // Door closing animation
      doorRect.setScale(0, 1);
      this.scene.tweens.add({
        targets: doorRect,
        scaleX: 1,
        duration: 500,
        ease: 'Power2',
      });
    }
  }

  /**
   * Create invisible arena walls for boundary.
   */
  private createArenaWalls(): void {
    const { bounds } = this.arenaConfig;
    const wallThickness = 20;

    // Create walls on each side (invisible physics boundaries)
    const walls = [
      // Top
      { x: bounds.x + bounds.width / 2, y: bounds.y - wallThickness / 2, w: bounds.width, h: wallThickness },
      // Bottom
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height + wallThickness / 2, w: bounds.width, h: wallThickness },
      // Left
      { x: bounds.x - wallThickness / 2, y: bounds.y + bounds.height / 2, w: wallThickness, h: bounds.height },
      // Right
      { x: bounds.x + bounds.width + wallThickness / 2, y: bounds.y + bounds.height / 2, w: wallThickness, h: bounds.height },
    ];

    for (const wall of walls) {
      const rect = this.scene.add.rectangle(wall.x, wall.y, wall.w, wall.h, 0x000000, 0);
      this.scene.physics.add.existing(rect, true);
      this.arenaWalls.push(rect);
    }
  }

  /**
   * Play boss introduction sequence.
   */
  private playIntroduction(): void {
    // Dim the screen
    const overlay = this.scene.add.rectangle(
      640,
      360,
      1280,
      720,
      0x000000,
      0.5
    );
    overlay.setDepth(200);
    overlay.setScrollFactor(0);

    // Boss name reveal
    this.introText = this.scene.add.text(640, 300, 'CIN DRALLIG', {
      fontFamily: 'Arial Black',
      fontSize: '64px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 6,
    });
    this.introText.setOrigin(0.5);
    this.introText.setDepth(201);
    this.introText.setScrollFactor(0);
    this.introText.setAlpha(0);

    const titleText = this.scene.add.text(640, 380, 'Battlemaster of the Jedi Order', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#CCCCCC',
      stroke: '#000000',
      strokeThickness: 3,
    });
    titleText.setOrigin(0.5);
    titleText.setDepth(201);
    titleText.setScrollFactor(0);
    titleText.setAlpha(0);

    // Animate intro
    this.scene.tweens.add({
      targets: this.introText,
      alpha: 1,
      y: 280,
      duration: 1000,
      ease: 'Power2',
    });

    this.scene.tweens.add({
      targets: titleText,
      alpha: 1,
      duration: 1000,
      delay: 500,
      ease: 'Power2',
    });

    // After intro, spawn boss
    this.scene.time.delayedCall(2500, () => {
      // Fade out intro
      this.scene.tweens.add({
        targets: [overlay, this.introText, titleText],
        alpha: 0,
        duration: 500,
        onComplete: () => {
          overlay.destroy();
          this.introText?.destroy();
          titleText.destroy();
          this.introText = null;
        },
      });

      // Spawn the boss
      this.spawnBoss();
    });
  }

  /**
   * Spawn Cin Drallig.
   */
  private spawnBoss(): void {
    const { bossSpawn } = this.arenaConfig;

    // Create boss
    this.boss = createCinDrallig(
      this.scene,
      bossSpawn.x,
      bossSpawn.y,
      this.combatManager,
      this.eventBus
    );

    // Create health bar
    this.healthBar = createCinDralligHealthBar(this.scene);
    this.healthBar.show();

    // Dramatic spawn effect
    const bossSprite = this.boss.getSprite();
    bossSprite.setAlpha(0);
    bossSprite.setScale(2);

    this.scene.tweens.add({
      targets: bossSprite,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 1000,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Begin combat
        this.state = BossEncounterState.Active;

        this.eventBus.emit({
          type: 'boss:intro_complete',
          data: { bossName: 'Cin Drallig' },
        });
      },
    });
  }

  /**
   * Handle phase transition.
   */
  private onPhaseTransition(newPhase: DralligPhase): void {
    this.currentPhase = newPhase;

    // Update health bar
    if (this.healthBar && this.boss) {
      const info = this.boss.getBossInfo();
      this.healthBar.setHealth(info.health, info.maxHealth);
    }

    // Show phase transition text
    this.showPhaseText(newPhase);

    // Check for phase-specific events
    const phaseEvents = this.arenaConfig.phaseEvents?.filter((e) => e.phase === newPhase);
    if (phaseEvents) {
      for (const event of phaseEvents) {
        this.handlePhaseEvent(event);
      }
    }
  }

  /**
   * Show phase transition text.
   */
  private showPhaseText(phase: DralligPhase): void {
    let phaseName = '';
    switch (phase) {
      case DralligPhase.ShiiCho:
        phaseName = 'Form I: Shii-Cho';
        break;
      case DralligPhase.Ataru:
        phaseName = 'Form IV: Ataru';
        break;
      case DralligPhase.Juyo:
        phaseName = 'Form VII: Juyo';
        break;
    }

    if (this.phaseText) {
      this.phaseText.destroy();
    }

    this.phaseText = this.scene.add.text(640, 150, phaseName, {
      fontFamily: 'Arial Black',
      fontSize: '36px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 4,
    });
    this.phaseText.setOrigin(0.5);
    this.phaseText.setDepth(150);
    this.phaseText.setScrollFactor(0);
    this.phaseText.setAlpha(0);

    this.scene.tweens.add({
      targets: this.phaseText,
      alpha: 1,
      y: 120,
      duration: 500,
      ease: 'Power2',
      hold: 2000,
      yoyo: true,
      onComplete: () => {
        this.phaseText?.destroy();
        this.phaseText = null;
      },
    });
  }

  /**
   * Handle phase-specific events.
   */
  private handlePhaseEvent(event: { phase: number; event: string; data: Record<string, unknown> }): void {
    switch (event.event) {
      case 'spawn_adds':
        const spawnData = event.data as {
          enemyType: string;
          count: number;
          spawnPositions: { x: number; y: number }[];
        };
        for (let i = 0; i < spawnData.count && i < spawnData.spawnPositions.length; i++) {
          const pos = spawnData.spawnPositions[i];
          this.summonApprentice(pos.x, pos.y);
        }
        break;

      case 'dialogue':
        const dialogueData = event.data as { speaker: string; text: string };
        this.showDialogue(dialogueData.speaker, dialogueData.text);
        break;

      case 'activate_hazard':
        // Future: Add arena hazards
        break;
    }
  }

  /**
   * Summon apprentice padawans.
   */
  private summonApprentices(position: { x: number; y: number }, count: number): void {
    const offsets = [
      { x: -100, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: -100 },
      { x: 0, y: 100 },
    ];

    for (let i = 0; i < count && i < offsets.length; i++) {
      this.summonApprentice(
        position.x + offsets[i].x,
        position.y + offsets[i].y
      );
    }
  }

  /**
   * Summon a single apprentice.
   */
  private summonApprentice(x: number, y: number): void {
    const apprentice = new JediDefender(
      this.scene,
      x,
      y,
      this.combatManager,
      this.eventBus
    );

    // Weaker than normal defenders
    const stats = this.combatManager.getEntityStats(apprentice.id);
    if (stats) {
      stats.health = 75;
      stats.maxHealth = 75;
    }

    this.summonedEnemies.push(apprentice);

    // Spawn effect
    const sprite = apprentice.getSprite();
    sprite.setAlpha(0);
    sprite.setTint(0xffffff);

    this.scene.tweens.add({
      targets: sprite,
      alpha: 1,
      duration: 500,
      onComplete: () => {
        sprite.clearTint();
      },
    });

    // Emit summon event for UI/effects
    this.eventBus.emit({
      type: 'boss:apprentice_summoned',
      data: { position: { x, y } },
    });
  }

  /**
   * Show dialogue text.
   */
  private showDialogue(speaker: string, text: string): void {
    const dialogueBox = this.scene.add.rectangle(640, 600, 800, 80, 0x000000, 0.8);
    dialogueBox.setDepth(200);
    dialogueBox.setScrollFactor(0);

    const speakerText = this.scene.add.text(260, 570, speaker + ':', {
      fontFamily: 'Arial Black',
      fontSize: '18px',
      color: '#FFD700',
    });
    speakerText.setDepth(201);
    speakerText.setScrollFactor(0);

    const dialogueText = this.scene.add.text(260, 595, text, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#FFFFFF',
      wordWrap: { width: 760 },
    });
    dialogueText.setDepth(201);
    dialogueText.setScrollFactor(0);

    // Auto-dismiss after 3 seconds
    this.scene.time.delayedCall(3000, () => {
      this.scene.tweens.add({
        targets: [dialogueBox, speakerText, dialogueText],
        alpha: 0,
        duration: 300,
        onComplete: () => {
          dialogueBox.destroy();
          speakerText.destroy();
          dialogueText.destroy();
        },
      });
    });
  }

  /**
   * Handle boss defeat.
   */
  private onBossDefeated(): void {
    this.state = BossEncounterState.Victory;
    const duration = Date.now() - this.fightStartTime;

    // Kill all summoned enemies
    for (const enemy of this.summonedEnemies) {
      if (enemy.isAlive()) {
        enemy.die();
      }
    }

    // Hide health bar
    this.healthBar?.hide();

    // Unlock doors
    this.unlockDoors();

    // Victory sequence
    this.playVictorySequence(duration);

    this.eventBus.emit({
      type: 'boss:encounter_ended',
      data: {
        bossName: 'Cin Drallig',
        victory: true,
        duration,
      },
    });
  }

  /**
   * Handle player defeat.
   */
  private onPlayerDefeated(): void {
    this.state = BossEncounterState.Defeat;
    const duration = Date.now() - this.fightStartTime;

    // Hide health bar
    this.healthBar?.hide();

    this.eventBus.emit({
      type: 'boss:encounter_ended',
      data: {
        bossName: 'Cin Drallig',
        victory: false,
        duration,
      },
    });
  }

  /**
   * Unlock arena doors.
   */
  private unlockDoors(): void {
    for (const door of this.lockedDoors) {
      this.scene.tweens.add({
        targets: door,
        scaleX: 0,
        alpha: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          door.destroy();
        },
      });
    }
    this.lockedDoors = [];
  }

  /**
   * Play victory sequence.
   */
  private playVictorySequence(duration: number): void {
    // Slow motion effect
    this.scene.time.timeScale = 0.3;

    this.scene.time.delayedCall(1000, () => {
      this.scene.time.timeScale = 1;
    });

    // Victory text
    const victoryText = this.scene.add.text(640, 300, 'BATTLEMASTER DEFEATED', {
      fontFamily: 'Arial Black',
      fontSize: '48px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 6,
    });
    victoryText.setOrigin(0.5);
    victoryText.setDepth(200);
    victoryText.setScrollFactor(0);
    victoryText.setAlpha(0);

    const durationText = this.scene.add.text(
      640,
      380,
      `Fight Duration: ${Math.floor(duration / 1000)}s`,
      {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#CCCCCC',
      }
    );
    durationText.setOrigin(0.5);
    durationText.setDepth(200);
    durationText.setScrollFactor(0);
    durationText.setAlpha(0);

    this.scene.tweens.add({
      targets: [victoryText, durationText],
      alpha: 1,
      duration: 1000,
      hold: 3000,
      yoyo: true,
      onComplete: () => {
        victoryText.destroy();
        durationText.destroy();
      },
    });
  }

  /**
   * Update boss encounter.
   */
  update(deltaMs: number): void {
    if (this.state !== BossEncounterState.Active) return;

    // Update boss
    if (this.boss && this.boss.isAlive()) {
      this.boss.update(deltaMs);

      // Update health bar
      if (this.healthBar) {
        const info = this.boss.getBossInfo();
        this.healthBar.setHealth(info.health, info.maxHealth);
      }
    }

    // Update summoned enemies
    for (const enemy of this.summonedEnemies) {
      if (enemy.isAlive()) {
        enemy.update(deltaMs);
      }
    }

    // Clean up dead enemies
    this.summonedEnemies = this.summonedEnemies.filter((e) => e.isAlive());
  }

  /**
   * Get boss sprite for collision detection.
   */
  getBossSprite(): Phaser.GameObjects.Sprite | null {
    return this.boss?.getSprite() ?? null;
  }

  /**
   * Get all enemy sprites (boss + adds).
   */
  getAllEnemySprites(): Phaser.GameObjects.Sprite[] {
    const sprites: Phaser.GameObjects.Sprite[] = [];

    if (this.boss && this.boss.isAlive()) {
      sprites.push(this.boss.getSprite());
    }

    for (const enemy of this.summonedEnemies) {
      if (enemy.isAlive()) {
        sprites.push(enemy.getSprite());
      }
    }

    return sprites;
  }

  /**
   * Get arena walls for collision.
   */
  getArenaWalls(): Phaser.GameObjects.Rectangle[] {
    return this.arenaWalls;
  }

  /**
   * Get current encounter state.
   */
  getState(): BossEncounterState {
    return this.state;
  }

  /**
   * Reset encounter for retry.
   */
  reset(): void {
    // Clean up
    this.boss?.destroy();
    this.boss = null;

    this.healthBar?.destroy();
    this.healthBar = null;

    for (const enemy of this.summonedEnemies) {
      enemy.destroy();
    }
    this.summonedEnemies = [];

    for (const wall of this.arenaWalls) {
      wall.destroy();
    }
    this.arenaWalls = [];

    for (const door of this.lockedDoors) {
      door.destroy();
    }
    this.lockedDoors = [];

    this.introText?.destroy();
    this.phaseText?.destroy();

    // Reset state
    this.state = BossEncounterState.Waiting;
    this.currentPhase = DralligPhase.ShiiCho;
    this.fightStartTime = 0;
  }

  /**
   * Destroy encounter.
   */
  destroy(): void {
    this.reset();
  }
}
