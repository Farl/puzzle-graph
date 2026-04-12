import { describe, it, expect } from 'vitest';
import { generatePuzzle } from '../generator';
import { solvePuzzle } from '../solver';
import type { GeneratorConfig } from '../types';

const BASE: GeneratorConfig = {
  targetDepth: 4,
  maxRooms: 3,
  compositeRate: 0.3,
  depthStaggerVariance: 1.0,
  seed: 42,
};

describe('Phase C: consolidation', () => {
  it('consolidationRate=0 produces no nesting', () => {
    const puzzle = generatePuzzle({ ...BASE, consolidationRate: 0, maxNestingDepth: 2 });
    for (const lock of Object.values(puzzle.locks)) {
      if (lock.category !== 'container') continue;
      for (const id of lock.contents) {
        expect(id in puzzle.items, `Lock "${lock.name}" contains a non-item`).toBe(true);
      }
      expect(lock.contents.length).toBeLessThanOrEqual(1);
    }
  });

  it('consolidationRate=1 may produce nested containers (lock inside lock)', () => {
    let foundNesting = false;
    for (let seed = 0; seed < 50; seed++) {
      const puzzle = generatePuzzle({ ...BASE, seed, consolidationRate: 1, maxNestingDepth: 3 });
      for (const lock of Object.values(puzzle.locks)) {
        if (lock.contents.some(id => id in puzzle.locks)) {
          foundNesting = true;
          break;
        }
      }
      if (foundNesting) break;
    }
    expect(foundNesting).toBe(true);
  });

  it('consolidationRate=1 may produce multi-item containers', () => {
    let foundMulti = false;
    for (let seed = 0; seed < 50; seed++) {
      const puzzle = generatePuzzle({ ...BASE, seed, consolidationRate: 1, maxNestingDepth: 2 });
      for (const lock of Object.values(puzzle.locks)) {
        if (lock.contents.length > 1) {
          foundMulti = true;
          break;
        }
      }
      if (foundMulti) break;
    }
    expect(foundMulti).toBe(true);
  });

  it('maxNestingDepth=0 prevents any nesting', () => {
    for (let seed = 0; seed < 20; seed++) {
      const puzzle = generatePuzzle({ ...BASE, seed, consolidationRate: 1, maxNestingDepth: 0 });
      for (const lock of Object.values(puzzle.locks)) {
        for (const id of lock.contents) {
          expect(id in puzzle.locks, `Lock "${lock.name}" contains nested lock`).toBe(false);
        }
      }
    }
  });

  it('nested containers respect volume capacity', () => {
    for (let seed = 0; seed < 30; seed++) {
      const puzzle = generatePuzzle({ ...BASE, seed, consolidationRate: 1, maxNestingDepth: 3 });
      for (const lock of Object.values(puzzle.locks)) {
        if (lock.category !== 'container') continue;
        let used = 0;
        for (const id of lock.contents) {
          used += puzzle.items[id]?.volume ?? puzzle.locks[id]?.volume ?? 0;
        }
        expect(used).toBeLessThanOrEqual(lock.capacity);
      }
    }
  });

  it('puzzles remain solvable after consolidation (100 seeds)', () => {
    for (let seed = 0; seed < 100; seed++) {
      const puzzle = generatePuzzle({ ...BASE, seed, consolidationRate: 1, maxNestingDepth: 3 });
      const result = solvePuzzle(puzzle);
      expect(result.solvable, `seed=${seed} not solvable`).toBe(true);
    }
  });
});
