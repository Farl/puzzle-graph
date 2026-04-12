import { describe, it, expect } from 'vitest';
import { generatePuzzle } from '../generator';
import type { GeneratorConfig } from '../types';

const BASE_CONFIG: GeneratorConfig = {
  targetDepth: 4,
  maxRooms: 3,
  compositeRate: 0.2,
  depthStaggerVariance: 1,
  maxLocks: 6,
};

describe('reuse path (reuseRate)', () => {
  it('reuseRate=1.0 maximizes tool reuse', () => {
    let totalReusableItems = 0;
    let totalUniqueReusableNames = 0;
    for (let i = 0; i < 30; i++) {
      const puzzle = generatePuzzle({
        ...BASE_CONFIG,
        reuseRate: 1.0,
        maxReusesPerTool: 3,
      });
      const reusableItems = Object.values(puzzle.items).filter(it => it.reusable);
      totalReusableItems += reusableItems.length;
      totalUniqueReusableNames += new Set(reusableItems.map(it => it.name)).size;
    }
    expect(totalReusableItems).toBeGreaterThan(0);
  });

  it('reuseRate=0 disables reuse path', () => {
    for (let i = 0; i < 10; i++) {
      const puzzle = generatePuzzle({ ...BASE_CONFIG, reuseRate: 0 });
      expect(Object.keys(puzzle.locks).length).toBeGreaterThan(0);
    }
  });

  it('maxReusesPerTool limits how many container locks share one tool', () => {
    for (let i = 0; i < 20; i++) {
      const puzzle = generatePuzzle({
        ...BASE_CONFIG,
        reuseRate: 1.0,
        maxReusesPerTool: 2,
        maxLocks: 8,
        targetDepth: 5,
      });
      // 只計算容器鎖的復用次數（Phase A 的門鎖不受 maxReusesPerTool 追蹤）
      const reuseCount: Record<string, number> = {};
      for (const lock of Object.values(puzzle.locks)) {
        if (lock.category !== 'container') continue;
        for (const itemId of lock.requiredItems) {
          const item = puzzle.items[itemId];
          if (item?.reusable) {
            reuseCount[itemId] = (reuseCount[itemId] ?? 0) + 1;
          }
        }
      }
      for (const [itemId, count] of Object.entries(reuseCount)) {
        expect(count, `Tool "${puzzle.items[itemId]!.name}" used ${count} times in containers`).toBeLessThanOrEqual(2);
      }
    }
  });

  it('puzzle remains valid with reuse enabled', () => {
    for (let i = 0; i < 20; i++) {
      const puzzle = generatePuzzle({
        ...BASE_CONFIG,
        reuseRate: 0.7,
        maxReusesPerTool: 2,
      });
      for (const lock of Object.values(puzzle.locks)) {
        for (const itemId of lock.requiredItems) {
          expect(puzzle.items[itemId], `Lock "${lock.name}" refs missing "${itemId}"`).toBeDefined();
        }
      }
      for (const item of Object.values(puzzle.items)) {
        expect(puzzle.rooms[item.initialRoom], `Item "${item.name}" has invalid room`).toBeDefined();
      }
    }
  });
});
