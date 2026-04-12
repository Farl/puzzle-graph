import { describe, it, expect } from 'vitest';
import { solvePuzzle } from '../solver';
import type { PuzzleDefinition } from '../types';

describe('stationary item (pickupable=false) solver', () => {
  it('solver can use stationary tool in the same room to unlock a lock', () => {
    const puzzle: PuzzleDefinition = {
      rooms: {
        r0: { id: 'r0', name: 'Start', description: '', lockIds: ['lock1'], visibleItems: ['basin'], capacity: 50 },
      },
      items: {
        basin: { id: 'basin', name: '水盆', description: '', type: 'tool', reusable: true, initialRoom: 'r0', volume: 3, pickupable: false },
      },
      locks: {
        lock1: {
          id: 'lock1', name: '乾布', description: '', lockedDescription: '', unlockDescription: '',
          category: 'container', mechanism: 'physical', roomId: 'r0',
          requiredItems: ['basin'], insertedItems: [], contents: [],
          capacity: 4, volume: 2, pickupable: false, isLocked: true, isExit: true,
        },
      },
      startRoomId: 'r0',
      exitLockId: 'lock1',
      seed: 1,
    };
    const result = solvePuzzle(puzzle);
    expect(result.solvable).toBe(true);
  });

  it('solver cannot use stationary tool from a different unreachable room', () => {
    const puzzle: PuzzleDefinition = {
      rooms: {
        r0: { id: 'r0', name: 'Start', description: '', lockIds: ['lock1'], visibleItems: [], capacity: 50 },
        r1: { id: 'r1', name: 'Other', description: '', lockIds: [], visibleItems: ['basin'], capacity: 50 },
      },
      items: {
        basin: { id: 'basin', name: '水盆', description: '', type: 'tool', reusable: true, initialRoom: 'r1', volume: 3, pickupable: false },
      },
      locks: {
        lock1: {
          id: 'lock1', name: '乾布', description: '', lockedDescription: '', unlockDescription: '',
          category: 'container', mechanism: 'physical', roomId: 'r0',
          requiredItems: ['basin'], insertedItems: [], contents: [],
          capacity: 4, volume: 2, pickupable: false, isLocked: true, isExit: true,
        },
      },
      startRoomId: 'r0',
      exitLockId: 'lock1',
      seed: 1,
    };
    const result = solvePuzzle(puzzle);
    expect(result.solvable).toBe(false);
  });

  it('solver does not pick up non-pickupable items', () => {
    const puzzle: PuzzleDefinition = {
      rooms: {
        r0: { id: 'r0', name: 'Start', description: '', lockIds: ['exit'], visibleItems: ['basin', 'key1'], capacity: 50 },
      },
      items: {
        basin: { id: 'basin', name: '水盆', description: '', type: 'tool', reusable: true, initialRoom: 'r0', volume: 3, pickupable: false },
        key1: { id: 'key1', name: '鑰匙', description: '', type: 'key', reusable: false, initialRoom: 'r0', volume: 1, pickupable: true },
      },
      locks: {
        exit: {
          id: 'exit', name: '出口', description: '', lockedDescription: '', unlockDescription: '',
          category: 'spatial', mechanism: 'physical', roomId: 'r0',
          requiredItems: ['key1'], insertedItems: [], contents: [],
          capacity: 0, volume: 0, pickupable: false, isLocked: true, isExit: true,
        },
      },
      startRoomId: 'r0',
      exitLockId: 'exit',
      seed: 1,
    };
    const result = solvePuzzle(puzzle);
    expect(result.solvable).toBe(true);
    const basinPickup = result.steps.find(s => s.includes('水盆'));
    expect(basinPickup).toBeUndefined();
  });
});
