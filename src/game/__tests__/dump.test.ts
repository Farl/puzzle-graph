import { describe, it, expect } from 'vitest';
import { generatePuzzle } from '../generator';
import { dumpPuzzle } from '../dump';
import type { GeneratorConfig } from '../types';

const BASE: GeneratorConfig = {
  targetDepth: 3,
  maxRooms: 3,
  compositeRate: 0.3,
  depthStaggerVariance: 0,
};

describe('dumpPuzzle', () => {
  it('產生非空字串', () => {
    const puzzle = generatePuzzle(BASE);
    const dump = dumpPuzzle(puzzle);
    expect(dump.length).toBeGreaterThan(0);
  });

  it('包含所有房間', () => {
    const puzzle = generatePuzzle(BASE);
    const dump = dumpPuzzle(puzzle);
    expect(dump).toContain('R0');
    expect(dump).toContain('R1');
    expect(dump).toContain('R2');
  });

  it('包含 START 標記', () => {
    const puzzle = generatePuzzle(BASE);
    const dump = dumpPuzzle(puzzle);
    expect(dump).toContain('[START]');
  });

  it('包含 EXIT 標記', () => {
    const puzzle = generatePuzzle(BASE);
    const dump = dumpPuzzle(puzzle);
    expect(dump).toContain('EXIT');
  });

  it('有 cross-room dep 時標示 ★', () => {
    let foundCross = false;
    for (let i = 0; i < 50 && !foundCross; i++) {
      const puzzle = generatePuzzle({ ...BASE, targetDepth: 4, crossRoomRate: 1 });
      const dump = dumpPuzzle(puzzle);
      if (dump.includes('★')) foundCross = true;
    }
    expect(foundCross).toBe(true);
  });
});
