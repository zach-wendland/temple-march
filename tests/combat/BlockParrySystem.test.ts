import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BlockParrySystem, BlockResult } from '../../src/combat/BlockParrySystem';
import { EventBus } from '../../src/core/events/EventBus';
import { AttackData, AttackType } from '../../src/combat/AttackData';
import { Faction, DefenseType } from '../../src/combat/DamageCalculator';

// Mock EventBus
const createMockEventBus = () => ({
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
});

// Mock Attack
const createMockAttack = (type: AttackType = AttackType.LightAttack): AttackData => ({
  id: 'test_attack',
  name: 'Test Attack',
  type,
  damage: 25,
  startupMs: 100,
  activeMs: 100,
  recoveryMs: 100,
  knockback: 100,
  hitstun: 150,
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

describe('BlockParrySystem', () => {
  let system: BlockParrySystem;
  let eventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    eventBus = createMockEventBus();
    system = new BlockParrySystem(eventBus as any);
  });

  describe('Entity Registration', () => {
    it('should register entities', () => {
      system.registerEntity(1, 100, Faction.Jedi);
      expect(system.getBlockStamina(1)).toBe(100);
      expect(system.getMaxBlockStamina(1)).toBe(100);
    });

    it('should unregister entities', () => {
      system.registerEntity(1, 100, Faction.Jedi);
      system.unregisterEntity(1);
      expect(system.getBlockStamina(1)).toBe(0);
    });
  });

  describe('Block Mechanics', () => {
    beforeEach(() => {
      system.registerEntity(1, 100, Faction.Jedi);
    });

    it('should start blocking', () => {
      const result = system.startBlock(1);
      expect(result).toBe(true);
      expect(system.isBlocking(1)).toBe(true);
    });

    it('should stop blocking', () => {
      system.startBlock(1);
      system.stopBlock(1);
      expect(system.isBlocking(1)).toBe(false);
    });

    it('should emit block start event', () => {
      system.startBlock(1);
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'combat:block_start',
          data: { entityId: 1 },
        })
      );
    });

    it('should emit block end event', () => {
      system.startBlock(1);
      system.stopBlock(1);
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'combat:block_end',
          data: { entityId: 1 },
        })
      );
    });

    it('should not start block without stamina', () => {
      // Exhaust stamina by blocking heavy attacks
      system.startBlock(1);
      const heavyAttack = createMockAttack(AttackType.HeavyAttack);

      // Block multiple heavy attacks to drain stamina
      for (let i = 0; i < 5; i++) {
        system.processBlock(1, 2, heavyAttack, Faction.Jedi, Faction.Jedi);
      }

      system.stopBlock(1);

      // Try to block again with no stamina
      const result = system.startBlock(1);
      expect(result).toBe(false);
    });
  });

  describe('Block Processing', () => {
    beforeEach(() => {
      system.registerEntity(1, 100, Faction.Jedi);
      system.registerEntity(2, 100, Faction.Jedi);
    });

    it('should return None when not blocking', () => {
      const attack = createMockAttack();
      const result = system.processBlock(1, 2, attack, Faction.Jedi, Faction.Jedi);
      expect(result.result).toBe(BlockResult.None);
    });

    it('should return Block on standard block', () => {
      vi.useFakeTimers();
      system.startBlock(1);

      // Advance past parry window
      vi.advanceTimersByTime(200);

      const attack = createMockAttack();
      const result = system.processBlock(1, 2, attack, Faction.Jedi, Faction.Jedi);

      expect(result.result).toBe(BlockResult.Block);
      expect(result.damageBlocked).toBeGreaterThan(0);
      expect(result.staminaCost).toBeGreaterThan(0);
      vi.useRealTimers();
    });

    it('should consume stamina on block', () => {
      vi.useFakeTimers();
      system.startBlock(1);
      vi.advanceTimersByTime(200);

      const initialStamina = system.getBlockStamina(1);
      const attack = createMockAttack();
      system.processBlock(1, 2, attack, Faction.Jedi, Faction.Jedi);

      expect(system.getBlockStamina(1)).toBeLessThan(initialStamina);
      vi.useRealTimers();
    });

    it('should cause guard break when stamina depleted', () => {
      vi.useFakeTimers();
      system.startBlock(1);
      vi.advanceTimersByTime(200);

      // Block heavy attacks until guard breaks
      const heavyAttack = createMockAttack(AttackType.HeavyAttack);
      let guardBroken = false;

      for (let i = 0; i < 10 && !guardBroken; i++) {
        const result = system.processBlock(1, 2, heavyAttack, Faction.Jedi, Faction.Jedi);
        if (result.result === BlockResult.GuardBreak) {
          guardBroken = true;
        }
        system.startBlock(1);
        vi.advanceTimersByTime(200);
      }

      expect(guardBroken).toBe(true);
      vi.useRealTimers();
    });
  });

  describe('Parry Mechanics', () => {
    beforeEach(() => {
      system.registerEntity(1, 100, Faction.Jedi);
    });

    it('should parry within window', () => {
      vi.useFakeTimers();
      system.startBlock(1);

      // Process immediately (within parry window)
      const attack = createMockAttack();
      const result = system.processBlock(1, 2, attack, Faction.Jedi, Faction.Jedi);

      expect(result.result).toBe(BlockResult.Parry);
      expect(result.damageBlocked).toBe(attack.damage);
      expect(result.staggerDealt).toBeGreaterThan(0);
      expect(result.counterWindowActive).toBe(true);
      vi.useRealTimers();
    });

    it('should not parry after window expires', () => {
      vi.useFakeTimers();
      system.startBlock(1);

      // Advance past parry window
      vi.advanceTimersByTime(300);

      const attack = createMockAttack();
      const result = system.processBlock(1, 2, attack, Faction.Jedi, Faction.Jedi);

      expect(result.result).toBe(BlockResult.Block);
      vi.useRealTimers();
    });

    it('should enable counter window after parry', () => {
      vi.useFakeTimers();
      system.startBlock(1);

      const attack = createMockAttack();
      system.processBlock(1, 2, attack, Faction.Jedi, Faction.Jedi);

      expect(system.isInCounterWindow(1)).toBe(true);
      vi.useRealTimers();
    });

    it('should expire counter window', () => {
      vi.useFakeTimers();
      system.startBlock(1);

      const attack = createMockAttack();
      system.processBlock(1, 2, attack, Faction.Jedi, Faction.Jedi);

      // Advance past counter window
      vi.advanceTimersByTime(500);

      expect(system.isInCounterWindow(1)).toBe(false);
      vi.useRealTimers();
    });
  });

  describe('Counter Multiplier', () => {
    beforeEach(() => {
      system.registerEntity(1, 100, Faction.Sith);
    });

    it('should return base multiplier when not in counter window', () => {
      const multiplier = system.getCounterMultiplier(1, Faction.Sith);
      expect(multiplier).toBe(1.0);
    });

    it('should return faction counter multiplier when in window', () => {
      vi.useFakeTimers();
      system.startBlock(1);

      const attack = createMockAttack();
      system.processBlock(1, 2, attack, Faction.Jedi, Faction.Sith);

      const multiplier = system.getCounterMultiplier(1, Faction.Sith);
      expect(multiplier).toBeGreaterThan(1.0);
      vi.useRealTimers();
    });
  });

  describe('Stamina Regeneration', () => {
    beforeEach(() => {
      system.registerEntity(1, 100, Faction.Jedi);
    });

    it('should regenerate stamina when not blocking', () => {
      vi.useFakeTimers();
      system.startBlock(1);
      vi.advanceTimersByTime(200);

      // Drain some stamina
      const attack = createMockAttack(AttackType.HeavyAttack);
      system.processBlock(1, 2, attack, Faction.Jedi, Faction.Jedi);
      system.stopBlock(1);

      const staminaAfterBlock = system.getBlockStamina(1);

      // Wait and update
      vi.advanceTimersByTime(1000);
      system.update(1000);

      expect(system.getBlockStamina(1)).toBeGreaterThan(staminaAfterBlock);
      vi.useRealTimers();
    });

    it('should not regenerate while blocking', () => {
      vi.useFakeTimers();
      system.startBlock(1);
      vi.advanceTimersByTime(200);

      // Drain some stamina
      const attack = createMockAttack(AttackType.HeavyAttack);
      system.processBlock(1, 2, attack, Faction.Jedi, Faction.Jedi);

      const staminaAfterBlock = system.getBlockStamina(1);

      // Update while still blocking
      vi.advanceTimersByTime(1000);
      system.update(1000);

      expect(system.getBlockStamina(1)).toBe(staminaAfterBlock);
      vi.useRealTimers();
    });
  });

  describe('Deflection', () => {
    beforeEach(() => {
      system.registerEntity(1, 100, Faction.Jedi);
    });

    it('should deflect Force attacks', () => {
      vi.useFakeTimers();
      system.startBlock(1);
      vi.advanceTimersByTime(200);

      const forceAttack = createMockAttack(AttackType.ForcePower);
      forceAttack.id = 'force_push';
      const result = system.processBlock(1, 2, forceAttack, Faction.Sith, Faction.Jedi);

      expect(result.result).toBe(BlockResult.Deflect);
      expect(result.deflectedProjectile).toBe(true);
      vi.useRealTimers();
    });
  });

  describe('Defense Type', () => {
    beforeEach(() => {
      system.registerEntity(1, 100, Faction.Jedi);
    });

    it('should return None when not blocking', () => {
      expect(system.getDefenseType(1)).toBe(DefenseType.None);
    });

    it('should return Block when blocking', () => {
      vi.useFakeTimers();
      system.startBlock(1);
      vi.advanceTimersByTime(200);
      expect(system.getDefenseType(1)).toBe(DefenseType.Block);
      vi.useRealTimers();
    });

    it('should return Parry during parry', () => {
      vi.useFakeTimers();
      system.startBlock(1);

      const attack = createMockAttack();
      system.processBlock(1, 2, attack, Faction.Jedi, Faction.Jedi);

      expect(system.getDefenseType(1)).toBe(DefenseType.Parry);
      vi.useRealTimers();
    });
  });

  describe('Cleanup', () => {
    it('should destroy and clear all states', () => {
      system.registerEntity(1, 100, Faction.Jedi);
      system.registerEntity(2, 100, Faction.Jedi);

      system.destroy();

      expect(system.getBlockStamina(1)).toBe(0);
      expect(system.getBlockStamina(2)).toBe(0);
    });
  });
});
