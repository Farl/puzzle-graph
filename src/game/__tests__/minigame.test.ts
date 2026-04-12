import { describe, it, expect } from 'vitest';
import { generatePuzzle } from '../generator';
import { solvePuzzle } from '../solver';
import type { GeneratorConfig } from '../types';

const BASE: GeneratorConfig = {
  targetDepth: 4,
  maxRooms: 3,
  compositeRate: 0.3,
  depthStaggerVariance: 1,
  reuseRate: 0.3,
  crossRoomRate: 0.3,
  keySpreadRate: 0.5,
};

describe('minigame + stationary item solvability', () => {
  it('50 puzzles with default config remain solvable (new templates in pool)', () => {
    for (let i = 0; i < 50; i++) {
      const puzzle = generatePuzzle(BASE);
      const result = solvePuzzle(puzzle);
      expect(
        result.solvable,
        `Puzzle #${i} (seed ${puzzle.seed}) not solvable.\nBlocked: ${result.blockedItems.join(', ')}\nSteps:\n${result.steps.slice(-10).join('\n')}`,
      ).toBe(true);
    }
  });

  it('high compositeRate=0.8 with new templates: 50 puzzles solvable', () => {
    const config = { ...BASE, compositeRate: 0.8, targetDepth: 6 };
    for (let i = 0; i < 50; i++) {
      const puzzle = generatePuzzle(config);
      const result = solvePuzzle(puzzle);
      expect(result.solvable, `Puzzle #${i} (seed ${puzzle.seed}) not solvable`).toBe(true);
    }
  });

  it('high reuseRate=0.8 with new templates: 50 puzzles solvable', () => {
    const config = { ...BASE, reuseRate: 0.8, targetDepth: 5 };
    for (let i = 0; i < 50; i++) {
      const puzzle = generatePuzzle(config);
      const result = solvePuzzle(puzzle);
      expect(result.solvable, `Puzzle #${i} (seed ${puzzle.seed}) not solvable`).toBe(true);
    }
  });

  it('new template types appear in 200 puzzles (statistical check)', () => {
    let minigameLocks = 0;
    let stationaryItems = 0;
    const config = { ...BASE, targetDepth: 6, compositeRate: 0.5 };
    for (let i = 0; i < 200; i++) {
      const puzzle = generatePuzzle(config);
      for (const lock of Object.values(puzzle.locks)) {
        if (lock.mechanism === 'minigame') minigameLocks++;
      }
      for (const item of Object.values(puzzle.items)) {
        if (!item.pickupable) stationaryItems++;
      }
    }
    // With 200 puzzles at targetDepth=6, we should see at least some minigame locks
    // and stationary items if the templates are being selected
    console.log(`  [stats] minigame locks: ${minigameLocks}, stationary items: ${stationaryItems}`);
    expect(minigameLocks + stationaryItems).toBeGreaterThan(0);
  });
});
