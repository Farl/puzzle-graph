import { describe, it, expect } from 'vitest';
import { generatePuzzle } from '../generator';
import type { GeneratorConfig } from '../types';

const DEFAULT_CONFIG: GeneratorConfig = {
  targetDepth: 3,
  maxRooms: 5,
  roomGrowthRate: 0.3,
  compositeRate: 0.3,
  keySpatialSplitRate: 0.2,
  depthStaggerVariance: 1,
};

describe('generatePuzzle (post-refactor)', () => {
  it('generates a valid puzzle with rooms, items, locks', () => {
    const puzzle = generatePuzzle(DEFAULT_CONFIG);
    expect(Object.keys(puzzle.rooms).length).toBeGreaterThan(0);
    expect(Object.keys(puzzle.items).length).toBeGreaterThan(0);
    expect(Object.keys(puzzle.locks).length).toBeGreaterThan(0);
    expect(puzzle.startRoomId).toBeDefined();
    expect(puzzle.exitLockId).toBeDefined();
  });

  it('exit lock exists and is marked as exit', () => {
    const puzzle = generatePuzzle(DEFAULT_CONFIG);
    const exitLock = puzzle.locks[puzzle.exitLockId];
    expect(exitLock).toBeDefined();
    expect(exitLock!.isExit).toBe(true);
  });

  it('every lock has at least one requiredItem', () => {
    const puzzle = generatePuzzle(DEFAULT_CONFIG);
    for (const lock of Object.values(puzzle.locks)) {
      if (lock.isLocked && !lock.isExit) {
        continue;
      }
      if (lock.isExit || lock.isLocked) {
        expect(lock.requiredItems.length, `Lock "${lock.name}" has no requiredItems`).toBeGreaterThan(0);
      }
    }
  });

  it('every requiredItem references an existing item', () => {
    const puzzle = generatePuzzle(DEFAULT_CONFIG);
    for (const lock of Object.values(puzzle.locks)) {
      for (const itemId of lock.requiredItems) {
        expect(puzzle.items[itemId], `Lock "${lock.name}" references missing item "${itemId}"`).toBeDefined();
      }
    }
  });

  it('every item has an initialRoom that exists', () => {
    const puzzle = generatePuzzle(DEFAULT_CONFIG);
    for (const item of Object.values(puzzle.items)) {
      expect(puzzle.rooms[item.initialRoom], `Item "${item.name}" has invalid initialRoom "${item.initialRoom}"`).toBeDefined();
    }
  });

  it('runs 20 times without crashing (stability check)', () => {
    for (let i = 0; i < 20; i++) {
      const puzzle = generatePuzzle(DEFAULT_CONFIG);
      expect(Object.keys(puzzle.rooms).length).toBeGreaterThan(0);
    }
  });
});
