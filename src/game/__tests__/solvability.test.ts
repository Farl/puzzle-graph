/**
 * 可解性測試
 *
 * 用模擬玩家跑完謎題，驗證生成的謎題確實可以解開。
 * 這個測試能捕捉循環依賴（工具被鎖在需要它的鎖後面等）。
 */
import { describe, it, expect } from 'vitest';
import { generatePuzzle } from '../generator';
import { solvePuzzle } from '../solver';
import type { GeneratorConfig } from '../types';

const BASE: GeneratorConfig = {
  targetDepth: 4,
  maxRooms: 3,
  compositeRate: 0.3,
  depthStaggerVariance: 1,
};

describe('謎題可解性', () => {
  it('基本設定：100次生成全部可解', () => {
    for (let i = 0; i < 100; i++) {
      const puzzle = generatePuzzle(BASE);
      const result = solvePuzzle(puzzle);
      expect(
        result.solvable,
        `Puzzle #${i} not solvable. Blocked items: ${result.blockedItems.join(', ')}\nLast steps:\n${result.steps.slice(-10).join('\n')}`,
      ).toBe(true);
    }
  });

  it('深度設定：targetDepth=6（50次）', () => {
    const config: GeneratorConfig = { ...BASE, targetDepth: 6 };
    for (let i = 0; i < 50; i++) {
      const puzzle = generatePuzzle(config);
      const result = solvePuzzle(puzzle);
      expect(result.solvable, `Puzzle #${i} not solvable. Blocked: ${result.blockedItems.join(', ')}`).toBe(true);
    }
  });

  it('compositeRate=0.8（大量組合鎖）：50次全部可解', () => {
    const config: GeneratorConfig = { ...BASE, compositeRate: 0.8 };
    for (let i = 0; i < 50; i++) {
      const puzzle = generatePuzzle(config);
      const result = solvePuzzle(puzzle);
      expect(result.solvable, `Puzzle #${i} not solvable. Blocked: ${result.blockedItems.join(', ')}`).toBe(true);
    }
  });

  it('crossRoomRate=1（全部跨房間）：50次全部可解', () => {
    const config: GeneratorConfig = { ...BASE, crossRoomRate: 1 };
    for (let i = 0; i < 50; i++) {
      const puzzle = generatePuzzle(config);
      const result = solvePuzzle(puzzle);
      expect(result.solvable, `Puzzle #${i} not solvable. Blocked: ${result.blockedItems.join(', ')}`).toBe(true);
    }
  });

  it('keySpreadRate=1（門鑰匙分散）：50次全部可解', () => {
    const config: GeneratorConfig = { ...BASE, keySpreadRate: 1 };
    for (let i = 0; i < 50; i++) {
      const puzzle = generatePuzzle(config);
      const result = solvePuzzle(puzzle);
      expect(result.solvable, `Puzzle #${i} not solvable. Blocked: ${result.blockedItems.join(', ')}`).toBe(true);
    }
  });

  it('reuseRate=1（大量工具復用）：50次全部可解', () => {
    const config: GeneratorConfig = { ...BASE, reuseRate: 1, maxReusesPerTool: 5 };
    for (let i = 0; i < 50; i++) {
      const puzzle = generatePuzzle(config);
      const result = solvePuzzle(puzzle);
      expect(result.solvable, `Puzzle #${i} not solvable. Blocked: ${result.blockedItems.join(', ')}`).toBe(true);
    }
  });

  it('所有參數同時啟用：50次全部可解', () => {
    const config: GeneratorConfig = {
      targetDepth: 5,
      maxRooms: 3,
      compositeRate: 0.5,
      depthStaggerVariance: 1,
      crossRoomRate: 0.5,
      keySpreadRate: 0.7,
      reuseRate: 0.5,
      maxReusesPerTool: 3,
      tagDiversityMode: 'balanced',
      maxLocks: 10,
    };
    for (let i = 0; i < 50; i++) {
      const puzzle = generatePuzzle(config);
      const result = solvePuzzle(puzzle);
      expect(result.solvable, `Puzzle #${i} not solvable. Blocked: ${result.blockedItems.join(', ')}`).toBe(true);
    }
  });
});
