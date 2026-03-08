import { describe, it, expect } from 'vitest';
import { generatePuzzle } from '../generator';
import type { GeneratorConfig } from '../types';

describe('Phase 2 integration: all features combined', () => {
  const FULL_CONFIG: GeneratorConfig = {
    targetDepth: 4,
    maxRooms: 6,
    roomGrowthRate: 0.3,
    compositeRate: 0.3,
    keySpatialSplitRate: 0.2,
    depthStaggerVariance: 1,
    maxLocks: 5,
    tagDiversityMode: 'balanced',
    reuseRate: 0.5,
    maxReusesPerTool: 2,
  };

  it('50 runs with all Phase 2 features enabled', () => {
    for (let i = 0; i < 50; i++) {
      const puzzle = generatePuzzle(FULL_CONFIG);

      // 基本結構
      expect(Object.keys(puzzle.rooms).length).toBeGreaterThan(0);
      expect(Object.keys(puzzle.items).length).toBeGreaterThan(0);
      expect(puzzle.locks[puzzle.exitLockId]).toBeDefined();
      expect(puzzle.locks[puzzle.exitLockId]!.isExit).toBe(true);

      // maxLocks 約束
      const contentLocks = Object.values(puzzle.locks).filter(l => l.isLocked && !l.isExit);
      expect(contentLocks.length).toBeLessThanOrEqual(5);

      // 引用完整性
      for (const lock of Object.values(puzzle.locks)) {
        for (const itemId of lock.requiredItems) {
          expect(puzzle.items[itemId], `Lock "${lock.name}" refs "${itemId}"`).toBeDefined();
        }
      }
      for (const item of Object.values(puzzle.items)) {
        expect(puzzle.rooms[item.initialRoom], `Item "${item.name}" room "${item.initialRoom}"`).toBeDefined();
      }

      // maxReusesPerTool 約束
      const reuseCount: Record<string, number> = {};
      for (const lock of Object.values(puzzle.locks)) {
        for (const itemId of lock.requiredItems) {
          if (puzzle.items[itemId]?.reusable) {
            reuseCount[itemId] = (reuseCount[itemId] ?? 0) + 1;
          }
        }
      }
      for (const [, count] of Object.entries(reuseCount)) {
        expect(count).toBeLessThanOrEqual(2);
      }
    }
  });

  it('backward compatible: no Phase 2 params = same as before', () => {
    const OLD_CONFIG: GeneratorConfig = {
      targetDepth: 3,
      maxRooms: 5,
      roomGrowthRate: 0.3,
      compositeRate: 0.3,
      keySpatialSplitRate: 0.2,
      depthStaggerVariance: 1,
    };
    for (let i = 0; i < 20; i++) {
      const puzzle = generatePuzzle(OLD_CONFIG);
      expect(Object.keys(puzzle.rooms).length).toBeGreaterThan(0);
      expect(puzzle.locks[puzzle.exitLockId]!.isExit).toBe(true);
    }
  });

  it('extreme: maxLocks=0 produces puzzle with only exit lock', () => {
    const puzzle = generatePuzzle({ ...FULL_CONFIG, maxLocks: 0 });
    const contentLocks = Object.values(puzzle.locks).filter(l => l.isLocked && !l.isExit);
    expect(contentLocks.length).toBe(0);
    expect(puzzle.locks[puzzle.exitLockId]!.isExit).toBe(true);
  });
});
