/**
 * Squad Coordinator
 * Manages group tactics for enemy squads (especially Clone Troopers).
 * Implements formation-based tactics from Star Wars lore.
 */

import Phaser from 'phaser';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import { CloneTrooper, FormationRole } from '../entities/enemies/CloneTrooper';
import { EnemyType } from '../entities/enemies/EnemyTypes';
import { EventBus } from '../core/events/EventBus';

/**
 * Formation types for squad tactics.
 */
export enum FormationType {
  /** Line formation - standard firing line */
  Line = 'line',
  /** Wedge formation - aggressive advance */
  Wedge = 'wedge',
  /** Pincer - flanking maneuver */
  Pincer = 'pincer',
  /** Surround - encirclement */
  Surround = 'surround',
  /** Defensive - protect position */
  Defensive = 'defensive',
  /** Retreat - organized withdrawal */
  Retreat = 'retreat',
}

/**
 * Squad state for tracking coordination.
 */
export enum SquadState {
  /** Patrolling area */
  Patrol = 'patrol',
  /** Engaging target */
  Engage = 'engage',
  /** Executing formation */
  Formation = 'formation',
  /** Retreating */
  Retreat = 'retreat',
  /** Regrouping after losses */
  Regroup = 'regroup',
}

/**
 * Squad configuration.
 */
export interface SquadConfig {
  /** Minimum members for squad tactics */
  minMembers: number;
  /** Formation spacing */
  spacing: number;
  /** Coordination radius */
  coordinationRadius: number;
  /** Formation change cooldown (ms) */
  formationCooldown: number;
}

const DEFAULT_SQUAD_CONFIG: SquadConfig = {
  minMembers: 3,
  spacing: 60,
  coordinationRadius: 300,
  formationCooldown: 3000,
};

/**
 * Squad class - represents a coordinated group of enemies.
 */
export class Squad {
  readonly id: string;
  private members: BaseEnemy[] = [];
  private leader: BaseEnemy | null = null;
  private target: Phaser.GameObjects.Sprite | null = null;
  private formation: FormationType = FormationType.Line;
  private state: SquadState = SquadState.Patrol;
  private config: SquadConfig;
  private lastFormationChange: number = 0;
  private eventBus: EventBus;

  constructor(id: string, eventBus: EventBus, config: Partial<SquadConfig> = {}) {
    this.id = id;
    this.eventBus = eventBus;
    this.config = { ...DEFAULT_SQUAD_CONFIG, ...config };
  }

  /**
   * Add member to squad.
   */
  addMember(enemy: BaseEnemy): void {
    if (!this.members.includes(enemy)) {
      this.members.push(enemy);

      // First member becomes leader
      if (!this.leader) {
        this.setLeader(enemy);
      }

      // Assign formation role if clone trooper
      if (enemy instanceof CloneTrooper) {
        this.assignRole(enemy);
      }
    }
  }

  /**
   * Remove member from squad.
   */
  removeMember(enemy: BaseEnemy): void {
    const index = this.members.indexOf(enemy);
    if (index !== -1) {
      this.members.splice(index, 1);

      // If leader was removed, assign new leader
      if (this.leader === enemy) {
        this.leader = this.members.length > 0 ? this.members[0] : null;
        if (this.leader) {
          this.setLeader(this.leader);
        }
      }
    }
  }

  /**
   * Get all members.
   */
  getMembers(): BaseEnemy[] {
    return [...this.members];
  }

  /**
   * Get living members.
   */
  getLivingMembers(): BaseEnemy[] {
    return this.members.filter(m => m.isAlive());
  }

  /**
   * Set squad leader.
   */
  private setLeader(enemy: BaseEnemy): void {
    this.leader = enemy;
    if (enemy instanceof CloneTrooper) {
      enemy.setFormationRole(FormationRole.Leader);
    }
  }

  /**
   * Assign formation role to clone trooper.
   */
  private assignRole(trooper: CloneTrooper): void {
    const livingMembers = this.getLivingMembers();
    const index = livingMembers.indexOf(trooper);

    if (trooper === this.leader) {
      trooper.setFormationRole(FormationRole.Leader);
    } else if (index % 3 === 1) {
      trooper.setFormationRole(FormationRole.Flanker);
    } else if (index % 3 === 2) {
      trooper.setFormationRole(FormationRole.Suppressor);
    } else {
      trooper.setFormationRole(FormationRole.Frontline);
    }
  }

  /**
   * Set target for entire squad.
   */
  setTarget(target: Phaser.GameObjects.Sprite | null): void {
    this.target = target;
    for (const member of this.members) {
      member.setTarget(target);
    }

    if (target) {
      this.setState(SquadState.Engage);
    } else {
      this.setState(SquadState.Patrol);
    }
  }

  /**
   * Set squad state.
   */
  setState(state: SquadState): void {
    if (this.state === state) return;

    this.state = state;

    this.eventBus.emit({
      type: 'squad:state_change',
      data: {
        squadId: this.id,
        state,
        memberCount: this.getLivingMembers().length,
      },
    });
  }

  /**
   * Set formation type.
   */
  setFormation(formation: FormationType): void {
    const now = Date.now();
    if (now - this.lastFormationChange < this.config.formationCooldown) {
      return; // Cooldown not elapsed
    }

    this.formation = formation;
    this.lastFormationChange = now;
    this.calculateFormationPositions();

    this.eventBus.emit({
      type: 'squad:formation_change',
      data: {
        squadId: this.id,
        formation,
      },
    });
  }

  /**
   * Calculate positions for current formation.
   */
  private calculateFormationPositions(): void {
    if (!this.target && !this.leader) return;

    const livingMembers = this.getLivingMembers();
    if (livingMembers.length === 0) return;

    const centerX = this.target?.x ?? this.leader?.getPosition().x ?? 0;
    const centerY = this.target?.y ?? this.leader?.getPosition().y ?? 0;

    switch (this.formation) {
      case FormationType.Line:
        this.calculateLineFormation(livingMembers, centerX, centerY);
        break;
      case FormationType.Wedge:
        this.calculateWedgeFormation(livingMembers, centerX, centerY);
        break;
      case FormationType.Pincer:
        this.calculatePincerFormation(livingMembers, centerX, centerY);
        break;
      case FormationType.Surround:
        this.calculateSurroundFormation(livingMembers, centerX, centerY);
        break;
      case FormationType.Defensive:
        this.calculateDefensiveFormation(livingMembers, centerX, centerY);
        break;
      case FormationType.Retreat:
        this.calculateRetreatFormation(livingMembers, centerX, centerY);
        break;
    }
  }

  /**
   * Line formation - side by side.
   */
  private calculateLineFormation(
    members: BaseEnemy[],
    targetX: number,
    targetY: number
  ): void {
    const spacing = this.config.spacing;
    const lineWidth = (members.length - 1) * spacing;
    const startX = -lineWidth / 2;

    // Position line perpendicular to target, at preferred distance
    const distance = 200;
    const angleToTarget = Math.atan2(targetY - members[0].getPosition().y, targetX - members[0].getPosition().x);
    const lineAngle = angleToTarget + Math.PI / 2;

    for (let i = 0; i < members.length; i++) {
      const offsetAlongLine = startX + i * spacing;
      const x = targetX - Math.cos(angleToTarget) * distance + Math.cos(lineAngle) * offsetAlongLine;
      const y = targetY - Math.sin(angleToTarget) * distance + Math.sin(lineAngle) * offsetAlongLine;

      if (members[i] instanceof CloneTrooper) {
        (members[i] as CloneTrooper).setAssignedPosition(x, y);
      }
    }
  }

  /**
   * Wedge formation - V-shape with leader at point.
   */
  private calculateWedgeFormation(
    members: BaseEnemy[],
    targetX: number,
    targetY: number
  ): void {
    if (members.length === 0) return;

    const spacing = this.config.spacing;
    const angleToTarget = Math.atan2(targetY - members[0].getPosition().y, targetX - members[0].getPosition().x);
    const distance = 150;

    // Leader at point
    const leaderX = targetX - Math.cos(angleToTarget) * distance;
    const leaderY = targetY - Math.sin(angleToTarget) * distance;

    if (members[0] instanceof CloneTrooper) {
      (members[0] as CloneTrooper).setAssignedPosition(leaderX, leaderY);
    }

    // Others form V behind
    const wedgeAngle = Math.PI / 4; // 45 degrees
    for (let i = 1; i < members.length; i++) {
      const row = Math.ceil(i / 2);
      const side = i % 2 === 1 ? 1 : -1;
      const angle = angleToTarget + Math.PI + wedgeAngle * side;

      const x = leaderX + Math.cos(angle) * spacing * row;
      const y = leaderY + Math.sin(angle) * spacing * row;

      if (members[i] instanceof CloneTrooper) {
        (members[i] as CloneTrooper).setAssignedPosition(x, y);
      }
    }
  }

  /**
   * Pincer formation - split for flanking.
   */
  private calculatePincerFormation(
    members: BaseEnemy[],
    targetX: number,
    targetY: number
  ): void {
    const distance = 180;
    const flankAngle = Math.PI / 3; // 60 degrees

    const angleToTarget = Math.atan2(targetY - members[0].getPosition().y, targetX - members[0].getPosition().x);

    // Split into left and right flanks
    const leftFlank: BaseEnemy[] = [];
    const rightFlank: BaseEnemy[] = [];

    for (let i = 0; i < members.length; i++) {
      if (i % 2 === 0) {
        leftFlank.push(members[i]);
      } else {
        rightFlank.push(members[i]);
      }
    }

    // Position left flank
    const leftAngle = angleToTarget + Math.PI + flankAngle;
    for (let i = 0; i < leftFlank.length; i++) {
      const x = targetX + Math.cos(leftAngle) * (distance + i * this.config.spacing);
      const y = targetY + Math.sin(leftAngle) * (distance + i * this.config.spacing);

      if (leftFlank[i] instanceof CloneTrooper) {
        (leftFlank[i] as CloneTrooper).setAssignedPosition(x, y);
        (leftFlank[i] as CloneTrooper).setFormationRole(FormationRole.Flanker);
      }
    }

    // Position right flank
    const rightAngle = angleToTarget + Math.PI - flankAngle;
    for (let i = 0; i < rightFlank.length; i++) {
      const x = targetX + Math.cos(rightAngle) * (distance + i * this.config.spacing);
      const y = targetY + Math.sin(rightAngle) * (distance + i * this.config.spacing);

      if (rightFlank[i] instanceof CloneTrooper) {
        (rightFlank[i] as CloneTrooper).setAssignedPosition(x, y);
        (rightFlank[i] as CloneTrooper).setFormationRole(FormationRole.Flanker);
      }
    }
  }

  /**
   * Surround formation - encircle target.
   */
  private calculateSurroundFormation(
    members: BaseEnemy[],
    targetX: number,
    targetY: number
  ): void {
    const distance = 150;
    const angleStep = (Math.PI * 2) / members.length;

    for (let i = 0; i < members.length; i++) {
      const angle = angleStep * i;
      const x = targetX + Math.cos(angle) * distance;
      const y = targetY + Math.sin(angle) * distance;

      if (members[i] instanceof CloneTrooper) {
        (members[i] as CloneTrooper).setAssignedPosition(x, y);
      }
    }
  }

  /**
   * Defensive formation - clustered for protection.
   */
  private calculateDefensiveFormation(
    members: BaseEnemy[],
    centerX: number,
    centerY: number
  ): void {
    // Tight circle around a defensive position
    const radius = this.config.spacing * 0.8;
    const angleStep = (Math.PI * 2) / members.length;

    for (let i = 0; i < members.length; i++) {
      const angle = angleStep * i;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      if (members[i] instanceof CloneTrooper) {
        (members[i] as CloneTrooper).setAssignedPosition(x, y);
      }
    }
  }

  /**
   * Retreat formation - staggered withdrawal.
   */
  private calculateRetreatFormation(
    members: BaseEnemy[],
    threatX: number,
    threatY: number
  ): void {
    // Move away from threat in staggered formation
    const retreatDistance = 300;
    const angleFromThreat = Math.atan2(
      members[0].getPosition().y - threatY,
      members[0].getPosition().x - threatX
    );

    for (let i = 0; i < members.length; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3 - 1; // -1, 0, 1

      const x = threatX + Math.cos(angleFromThreat) * (retreatDistance + row * this.config.spacing);
      const y = threatY + Math.sin(angleFromThreat) * (retreatDistance + row * this.config.spacing);

      // Lateral offset
      const lateralAngle = angleFromThreat + Math.PI / 2;
      const finalX = x + Math.cos(lateralAngle) * col * this.config.spacing;
      const finalY = y + Math.sin(lateralAngle) * col * this.config.spacing;

      if (members[i] instanceof CloneTrooper) {
        (members[i] as CloneTrooper).setAssignedPosition(finalX, finalY);
      }
    }
  }

  /**
   * Update squad coordination.
   */
  update(deltaMs: number): void {
    this.cleanupDeadMembers();

    const livingMembers = this.getLivingMembers();
    if (livingMembers.length === 0) {
      return;
    }

    // Check if we need to adapt formation
    this.adaptFormation(livingMembers);

    // Update formation positions
    if (this.target) {
      this.calculateFormationPositions();
    }
  }

  /**
   * Remove dead members from squad.
   */
  private cleanupDeadMembers(): void {
    const deadMembers = this.members.filter(m => !m.isAlive());
    for (const dead of deadMembers) {
      this.removeMember(dead);
    }
  }

  /**
   * Adapt formation based on situation.
   */
  private adaptFormation(livingMembers: BaseEnemy[]): void {
    if (!this.target) return;

    const memberCount = livingMembers.length;
    const avgHealth = livingMembers.reduce((sum, m) => sum + m.getHealth() / m.getMaxHealth(), 0) / memberCount;

    // Low members - defensive or retreat
    if (memberCount < this.config.minMembers) {
      if (avgHealth < 0.3) {
        this.setFormation(FormationType.Retreat);
        this.setState(SquadState.Retreat);
      } else {
        this.setFormation(FormationType.Defensive);
      }
      return;
    }

    // Good numbers - tactical formations
    if (memberCount >= 4) {
      // Enough for pincer
      if (this.formation !== FormationType.Pincer && Math.random() < 0.3) {
        this.setFormation(FormationType.Pincer);
      }
    } else if (memberCount >= this.config.minMembers) {
      // Standard formations
      if (this.formation !== FormationType.Line && this.formation !== FormationType.Wedge) {
        this.setFormation(Math.random() < 0.5 ? FormationType.Line : FormationType.Wedge);
      }
    }
  }

  /**
   * Check if squad is still operational.
   */
  isOperational(): boolean {
    return this.getLivingMembers().length >= this.config.minMembers;
  }

  /**
   * Get current formation.
   */
  getFormation(): FormationType {
    return this.formation;
  }

  /**
   * Get current state.
   */
  getState(): SquadState {
    return this.state;
  }
}

/**
 * Squad Coordinator - manages multiple squads.
 */
export class SquadCoordinator {
  private squads: Map<string, Squad> = new Map();
  private eventBus: EventBus;
  private squadIdCounter: number = 0;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Create a new squad.
   */
  createSquad(config?: Partial<SquadConfig>): Squad {
    const id = `squad_${this.squadIdCounter++}`;
    const squad = new Squad(id, this.eventBus, config);
    this.squads.set(id, squad);
    return squad;
  }

  /**
   * Get squad by ID.
   */
  getSquad(id: string): Squad | undefined {
    return this.squads.get(id);
  }

  /**
   * Remove a squad.
   */
  removeSquad(id: string): void {
    this.squads.delete(id);
  }

  /**
   * Create a squad from existing enemies.
   */
  formSquad(enemies: BaseEnemy[], config?: Partial<SquadConfig>): Squad {
    const squad = this.createSquad(config);
    for (const enemy of enemies) {
      squad.addMember(enemy);
    }
    return squad;
  }

  /**
   * Update all squads.
   */
  update(deltaMs: number): void {
    for (const squad of this.squads.values()) {
      squad.update(deltaMs);
    }

    // Clean up non-operational squads
    for (const [id, squad] of this.squads) {
      if (!squad.isOperational() && squad.getState() !== SquadState.Retreat) {
        this.removeSquad(id);
      }
    }
  }

  /**
   * Get all active squads.
   */
  getActiveSquads(): Squad[] {
    return Array.from(this.squads.values());
  }

  /**
   * Set target for all squads.
   */
  setTargetForAll(target: Phaser.GameObjects.Sprite | null): void {
    for (const squad of this.squads.values()) {
      squad.setTarget(target);
    }
  }
}
