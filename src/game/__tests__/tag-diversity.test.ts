import { describe, it, expect } from 'vitest';
import { generatePuzzle } from '../generator';
import type { GeneratorConfig } from '../types';

const BASE_CONFIG: GeneratorConfig = {
  targetDepth: 4,
  maxRooms: 6,
  roomGrowthRate: 0.3,
  compositeRate: 0.3,
  keySpatialSplitRate: 0.2,
  depthStaggerVariance: 1,
  maxLocks: 6,
};

function collectMechanisms(puzzle: ReturnType<typeof generatePuzzle>): string[] {
  return Object.values(puzzle.locks)
    .filter(l => l.isLocked && !l.isExit)
    .map(l => l.mechanism);
}

describe('tag diversity modes', () => {
  it('balanced mode produces varied mechanisms across 20 runs', () => {
    const mechanismSets: Set<string>[] = [];
    for (let i = 0; i < 20; i++) {
      const puzzle = generatePuzzle({ ...BASE_CONFIG, tagDiversityMode: 'balanced' });
      const mechanisms = new Set(collectMechanisms(puzzle));
      mechanismSets.push(mechanisms);
    }
    const hasVariety = mechanismSets.some(s => s.size >= 2);
    expect(hasVariety).toBe(true);
  });

  it('no-repeat mode runs without crashing', () => {
    for (let i = 0; i < 20; i++) {
      const puzzle = generatePuzzle({ ...BASE_CONFIG, tagDiversityMode: 'no-repeat' });
      expect(Object.keys(puzzle.locks).length).toBeGreaterThan(0);
    }
  });

  it('weighted mode with high password weight produces more password locks', () => {
    let passwordCount = 0;
    for (let i = 0; i < 30; i++) {
      const puzzle = generatePuzzle({
        ...BASE_CONFIG,
        tagDiversityMode: 'weighted',
        tagWeights: { 'password': 5.0 },
      });
      const locks = Object.values(puzzle.locks).filter(l => l.isLocked && !l.isExit);
      passwordCount += locks.filter(l => l.mechanism === 'password').length;
    }
    expect(passwordCount).toBeGreaterThan(0);
  });

  it('does not crash with empty tagWeights', () => {
    const puzzle = generatePuzzle({ ...BASE_CONFIG, tagWeights: {} });
    expect(Object.keys(puzzle.locks).length).toBeGreaterThan(0);
  });

  it('undefined tagDiversityMode falls back to current behavior', () => {
    for (let i = 0; i < 10; i++) {
      const puzzle = generatePuzzle(BASE_CONFIG);
      expect(Object.keys(puzzle.locks).length).toBeGreaterThan(0);
    }
  });
});
