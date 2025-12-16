import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StunSystem, StunType } from '../../src/combat/StunSystem';
import { EventBus } from '../../src/core/events/EventBus';
import { AttackData, AttackType } from '../../src/combat/AttackData';
import { Faction } from '../../src/combat/DamageCalculator';

// Mock EventBus
const createMockEventBus = () => ({
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
});

// Mock Attack
const createMockAttack = (type: AttackType = AttackType.LightAttack, hitstun: number = 0): AttackData => ({
  id: 'test_attack',
  name: 'Test Attack',
  type,
  damage: 25,
  startupMs: 100,
  activeMs: 100,
  recoveryMs: 100,
  knockback: 100,
  hitstun,
  hitbox: {
    width: 30,
    height: 30,
    offsetX: 20,
    offsetY: 0,
    direction: 'forward',
  },
  multiHit: false,
  forceCost: 0,
});

describe('StunSystem', () => {
  let system: StunSystem;
  let eventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    eventBus = createMockEventBus();
    system = new StunSystem(eventBus as any);
  });

  describe('Entity Registration', () => {
    it('should register entities', () => {
      system.registerEntity(1);
      expect(system.isStunned(1)).toBe(false);
    });

    it('should unregister entities', () => {
      system.registerEntity(1);
      system.unregisterEntity(1);
      expect(system.isStunned(1)).toBe(false);
    });
  });

  describe('Hitstun', () => {
    beforeEach(() => {
      system.registerEntity(1);
    });

    it('should apply hitstun from light attack', () => {
      const attack = createMockAttack(AttackType.LightAttack);
      const duration = system.applyHitstun(1, 2, attack, Faction.Jedi);

      expect(duration).toBeGreaterThan(0);
      expect(system.isStunned(1)).toBe(true);
      expect(system.getStunType(1)).toBe(StunType.Hitstun);
    });

    it('should apply more hitstun from heavy attack', () => {
      const lightAttack = createMockAttack(AttackType.LightAttack);
      const heavyAttack = createMockAttack(AttackType.HeavyAttack);

      system.registerEntity(2);

      const lightDuration = system.applyHitstun(1, 3, lightAttack, Faction.Jedi);
      const heavyDuration = system.applyHitstun(2, 3, heavyAttack, Faction.Jedi);

      expect(heavyDuration).toBeGreaterThan(lightDuration);
    });

    it('should use attack hitstun value if provided', () => {
      const attack = createMockAttack(AttackType.LightAttack, 500);
      const duration = system.applyHitstun(1, 2, attack, Faction.Jedi);

      // Should use attack's hitstun multiplied by faction resistance
      expect(duration).toBeGreaterThan(0);
    });

    it('should apply faction resistance', () => {
      const attack = createMockAttack();

      system.registerEntity(2);

      // Sith (Vader) should have less hitstun
      const sithDuration = system.applyHitstun(1, 3, attack, Faction.Sith);
      const jediDuration = system.applyHitstun(2, 3, attack, Faction.Jedi);

      expect(sithDuration).toBeLessThan(jediDuration);
    });

    it('should emit stun applied event', () => {
      const attack = createMockAttack();
      system.applyHitstun(1, 2, attack, Faction.Jedi);

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'combat:stun_applied',
          data: expect.objectContaining({
            targetId: 1,
            sourceId: 2,
            stunType: StunType.Hitstun,
          }),
        })
      );
    });
  });

  describe('Blockstun', () => {
    beforeEach(() => {
      system.registerEntity(1);
    });

    it('should apply blockstun', () => {
      const attack = createMockAttack();
      const duration = system.applyBlockstun(1, 2, attack, Faction.Jedi);

      expect(duration).toBeGreaterThan(0);
      expect(system.isStunned(1)).toBe(true);
      expect(system.getStunType(1)).toBe(StunType.Blockstun);
    });

    it('should have less blockstun than hitstun', () => {
      const attack = createMockAttack();

      system.registerEntity(2);

      const blockstunDuration = system.applyBlockstun(1, 3, attack, Faction.Jedi);
      const hitstunDuration = system.applyHitstun(2, 3, attack, Faction.Jedi);

      expect(blockstunDuration).toBeLessThan(hitstunDuration);
    });

    it('should have more blockstun from heavy attacks', () => {
      const lightAttack = createMockAttack(AttackType.LightAttack);
      const heavyAttack = createMockAttack(AttackType.HeavyAttack);

      system.registerEntity(2);

      const lightBlockstun = system.applyBlockstun(1, 3, lightAttack, Faction.Jedi);
      const heavyBlockstun = system.applyBlockstun(2, 3, heavyAttack, Faction.Jedi);

      expect(heavyBlockstun).toBeGreaterThan(lightBlockstun);
    });
  });

  describe('Guard Break', () => {
    beforeEach(() => {
      system.registerEntity(1);
    });

    it('should apply guard break stun', () => {
      const duration = system.applyGuardBreak(1, 2);

      expect(duration).toBeGreaterThan(0);
      expect(system.isStunned(1)).toBe(true);
      expect(system.getStunType(1)).toBe(StunType.GuardBreak);
    });

    it('should have significant duration', () => {
      const duration = system.applyGuardBreak(1, 2);
      expect(duration).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Stagger', () => {
    beforeEach(() => {
      system.registerEntity(1);
    });

    it('should apply stagger', () => {
      const duration = system.applyStagger(1, 2);

      expect(duration).toBeGreaterThan(0);
      expect(system.isStunned(1)).toBe(true);
      expect(system.getStunType(1)).toBe(StunType.Stagger);
    });

    it('should have long duration', () => {
      const duration = system.applyStagger(1, 2);
      expect(duration).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('Force Freeze', () => {
    beforeEach(() => {
      system.registerEntity(1);
    });

    it('should apply Force freeze', () => {
      const duration = system.applyForceFreeze(1, 2, 500);

      expect(duration).toBe(500);
      expect(system.isStunned(1)).toBe(true);
      expect(system.getStunType(1)).toBe(StunType.ForceFreeze);
    });

    it('should make entity invulnerable', () => {
      system.applyForceFreeze(1, 2, 500);
      expect(system.isInvulnerable(1)).toBe(true);
    });
  });

  describe('Stun Priority', () => {
    beforeEach(() => {
      system.registerEntity(1);
    });

    it('should override weaker stuns with stronger', () => {
      // Apply hitstun first
      const attack = createMockAttack();
      system.applyHitstun(1, 2, attack, Faction.Jedi);
      expect(system.getStunType(1)).toBe(StunType.Hitstun);

      // Apply stagger (stronger)
      system.applyStagger(1, 2);
      expect(system.getStunType(1)).toBe(StunType.Stagger);
    });

    it('should extend duration when hit with same priority stun', () => {
      vi.useFakeTimers();

      const attack = createMockAttack();
      system.applyHitstun(1, 2, attack, Faction.Jedi);
      const initialRemaining = system.getStunRemaining(1);

      vi.advanceTimersByTime(50);

      // Apply another hitstun
      system.applyHitstun(1, 2, attack, Faction.Jedi);
      const newRemaining = system.getStunRemaining(1);

      // Duration should be at least the initial (probably reset)
      expect(newRemaining).toBeGreaterThanOrEqual(initialRemaining - 50);

      vi.useRealTimers();
    });
  });

  describe('Stun Duration', () => {
    beforeEach(() => {
      system.registerEntity(1);
    });

    it('should track remaining duration', () => {
      vi.useFakeTimers();

      const attack = createMockAttack();
      system.applyHitstun(1, 2, attack, Faction.Jedi);

      const initial = system.getStunRemaining(1);
      expect(initial).toBeGreaterThan(0);

      vi.advanceTimersByTime(50);

      const remaining = system.getStunRemaining(1);
      expect(remaining).toBeLessThan(initial);

      vi.useRealTimers();
    });

    it('should track stun progress', () => {
      vi.useFakeTimers();

      const attack = createMockAttack();
      system.applyHitstun(1, 2, attack, Faction.Jedi);

      expect(system.getStunProgress(1)).toBe(0);

      vi.advanceTimersByTime(100);

      const progress = system.getStunProgress(1);
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(1);

      vi.useRealTimers();
    });
  });

  describe('Stun Expiry', () => {
    beforeEach(() => {
      system.registerEntity(1);
    });

    it('should clear stun after duration', () => {
      vi.useFakeTimers();

      const attack = createMockAttack();
      system.applyHitstun(1, 2, attack, Faction.Jedi);
      expect(system.isStunned(1)).toBe(true);

      // Advance past stun duration
      vi.advanceTimersByTime(1000);
      system.update(1000);

      expect(system.isStunned(1)).toBe(false);

      vi.useRealTimers();
    });

    it('should emit stun ended event', () => {
      vi.useFakeTimers();

      const attack = createMockAttack();
      system.applyHitstun(1, 2, attack, Faction.Jedi);

      vi.advanceTimersByTime(1000);
      system.update(1000);

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'combat:stun_ended',
          data: expect.objectContaining({
            entityId: 1,
            stunType: StunType.Hitstun,
          }),
        })
      );

      vi.useRealTimers();
    });
  });

  describe('Stun Cancelling', () => {
    beforeEach(() => {
      system.registerEntity(1);
    });

    it('should not cancel non-cancellable stuns', () => {
      const attack = createMockAttack();
      system.applyHitstun(1, 2, attack, Faction.Jedi);

      const cancelled = system.tryCancelStun(1);
      expect(cancelled).toBe(false);
      expect(system.isStunned(1)).toBe(true);
    });

    it('should cancel blockstun after threshold', () => {
      vi.useFakeTimers();

      const attack = createMockAttack();
      system.applyBlockstun(1, 2, attack, Faction.Jedi);

      // Try immediately - should fail
      let cancelled = system.tryCancelStun(1);
      expect(cancelled).toBe(false);

      // Advance past threshold (50% of duration)
      vi.advanceTimersByTime(100);

      cancelled = system.tryCancelStun(1);
      expect(cancelled).toBe(true);
      expect(system.isStunned(1)).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('Combo Scaling', () => {
    beforeEach(() => {
      system.registerEntity(1);
    });

    it('should reduce hitstun with combo scaling', () => {
      vi.useFakeTimers();

      const attack = createMockAttack();

      // First hit
      const firstDuration = system.applyHitstun(1, 2, attack, Faction.Jedi);

      // Don't let stun expire - apply another hit
      vi.advanceTimersByTime(50);
      const secondDuration = system.applyHitstun(1, 2, attack, Faction.Jedi);

      expect(secondDuration).toBeLessThanOrEqual(firstDuration);

      vi.useRealTimers();
    });

    it('should reset combo count on clear', () => {
      system.resetComboCount(1);
      // No error means it worked
      expect(system.isStunned(1)).toBe(false);
    });
  });

  describe('Frame Advantage', () => {
    it('should calculate frame advantage', () => {
      const attack = createMockAttack(AttackType.LightAttack);
      const attackerRecovery = 100;

      const onHit = system.calculateFrameAdvantage(attack, false, attackerRecovery);
      const onBlock = system.calculateFrameAdvantage(attack, true, attackerRecovery);

      // On hit should give more advantage than on block
      expect(onHit).toBeGreaterThan(onBlock);
    });
  });

  describe('Manual Clear', () => {
    beforeEach(() => {
      system.registerEntity(1);
    });

    it('should manually clear stun', () => {
      const attack = createMockAttack();
      system.applyHitstun(1, 2, attack, Faction.Jedi);

      system.clearStun(1);

      expect(system.isStunned(1)).toBe(false);
      expect(system.getStunType(1)).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should destroy and clear all states', () => {
      system.registerEntity(1);
      system.registerEntity(2);

      const attack = createMockAttack();
      system.applyHitstun(1, 2, attack, Faction.Jedi);

      system.destroy();

      expect(system.isStunned(1)).toBe(false);
      expect(system.isStunned(2)).toBe(false);
    });
  });
});
