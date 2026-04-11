import { describe, it, expect } from 'vitest';
import { generatePuzzle } from '../generator';
import type { GeneratorConfig } from '../types';

const BASE_CONFIG: GeneratorConfig = {
  targetDepth: 5,
  maxRooms: 3,
  compositeRate: 0.2,
  depthStaggerVariance: 1,
};

function countContentLocks(puzzle: ReturnType<typeof generatePuzzle>): number {
  return Object.values(puzzle.locks).filter(
    l => l.category === 'container' && l.isLocked && !l.isExit,
  ).length;
}

describe('maxLocks stop condition', () => {
  it('without maxLocks, deep puzzles generate many locks', () => {
    const puzzle = generatePuzzle(BASE_CONFIG);
    expect(countContentLocks(puzzle)).toBeGreaterThan(3);
  });

  it('maxLocks=3 limits content locks to at most 3', () => {
    for (let i = 0; i < 20; i++) {
      const puzzle = generatePuzzle({ ...BASE_CONFIG, maxLocks: 3 });
      const count = countContentLocks(puzzle);
      expect(count, `run ${i}: got ${count} content locks`).toBeLessThanOrEqual(3);
    }
  });

  it('maxLocks=1 produces minimal puzzle', () => {
    for (let i = 0; i < 20; i++) {
      const puzzle = generatePuzzle({ ...BASE_CONFIG, maxLocks: 1 });
      expect(countContentLocks(puzzle)).toBeLessThanOrEqual(1);
    }
  });

  it('maxLocks does not break puzzle validity', () => {
    for (let i = 0; i < 20; i++) {
      const puzzle = generatePuzzle({ ...BASE_CONFIG, maxLocks: 2 });
      // exit lock still exists
      expect(puzzle.locks[puzzle.exitLockId]).toBeDefined();
      expect(puzzle.locks[puzzle.exitLockId]!.isExit).toBe(true);
      // every item has valid room
      for (const item of Object.values(puzzle.items)) {
        expect(puzzle.rooms[item.initialRoom], `Item "${item.name}" has invalid room`).toBeDefined();
      }
    }
  });
});
