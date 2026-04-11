// src/game/__tests__/phase3-content.test.ts
import { describe, it, expect } from 'vitest';
import { generatePuzzle } from '../generator';
import type { GeneratorConfig } from '../types';

const BASE: GeneratorConfig = {
  targetDepth: 3,
  maxRooms: 3,
  compositeRate: 0,
  depthStaggerVariance: 0,
};

describe('Phase 3 兩階段生成整合', () => {
  it('房間數量精確等於 maxRooms', () => {
    for (let i = 0; i < 20; i++) {
      const puzzle = generatePuzzle(BASE);
      expect(Object.keys(puzzle.rooms).length).toBe(BASE.maxRooms);
    }
  });

  it('所有物品的 initialRoom 都存在於 puzzle.rooms', () => {
    for (let i = 0; i < 30; i++) {
      const puzzle = generatePuzzle(BASE);
      for (const item of Object.values(puzzle.items)) {
        expect(puzzle.rooms[item.initialRoom], `item "${item.name}" room "${item.initialRoom}"`).toBeDefined();
      }
    }
  });

  it('所有鎖的 requiredItems 都存在於 puzzle.items', () => {
    for (let i = 0; i < 30; i++) {
      const puzzle = generatePuzzle(BASE);
      for (const lock of Object.values(puzzle.locks)) {
        for (const itemId of lock.requiredItems) {
          expect(puzzle.items[itemId], `lock "${lock.name}" refs "${itemId}"`).toBeDefined();
        }
      }
    }
  });

  it('exitLock 存在且 isExit=true', () => {
    for (let i = 0; i < 20; i++) {
      const puzzle = generatePuzzle(BASE);
      expect(puzzle.locks[puzzle.exitLockId]).toBeDefined();
      expect(puzzle.locks[puzzle.exitLockId]!.isExit).toBe(true);
    }
  });

  it('startRoomId 存在於 rooms', () => {
    for (let i = 0; i < 20; i++) {
      const puzzle = generatePuzzle(BASE);
      expect(puzzle.rooms[puzzle.startRoomId]).toBeDefined();
    }
  });

  it('crossRoomRate=0：容器鎖的鑰匙都在與容器相同的房間', () => {
    const config: GeneratorConfig = {
      ...BASE,
      targetDepth: 3,
      crossRoomRate: 0,
    };
    for (let i = 0; i < 20; i++) {
      const puzzle = generatePuzzle(config);
      const containerLocks = Object.values(puzzle.locks).filter(
        l => l.category === 'container' && l.isLocked,
      );
      for (const lock of containerLocks) {
        for (const reqItemId of lock.requiredItems) {
          const reqItem = puzzle.items[reqItemId]!;
          expect(reqItem.initialRoom).toBe(lock.roomId);
        }
      }
    }
  });

  it('maxLocks 約束：容器鎖數量不超過 maxLocks', () => {
    const config: GeneratorConfig = { ...BASE, maxLocks: 4 };
    for (let i = 0; i < 30; i++) {
      const puzzle = generatePuzzle(config);
      const containerLocks = Object.values(puzzle.locks).filter(
        l => l.category === 'container' && l.isLocked,
      );
      expect(containerLocks.length).toBeLessThanOrEqual(4);
    }
  });

  it('maxLocks=0：沒有容器鎖', () => {
    const puzzle = generatePuzzle({ ...BASE, maxLocks: 0 });
    const containerLocks = Object.values(puzzle.locks).filter(
      l => l.category === 'container' && l.isLocked,
    );
    expect(containerLocks.length).toBe(0);
  });

  it('crossRoomRate=1：50次執行中，至少部分容器鎖的鑰匙在不同房間', () => {
    const config: GeneratorConfig = {
      ...BASE,
      maxRooms: 3,
      targetDepth: 4,
      crossRoomRate: 1,
    };
    let crossRoomFound = false;
    for (let i = 0; i < 50 && !crossRoomFound; i++) {
      const puzzle = generatePuzzle(config);
      const containerLocks = Object.values(puzzle.locks).filter(
        l => l.category === 'container' && l.isLocked,
      );
      for (const lock of containerLocks) {
        for (const reqItemId of lock.requiredItems) {
          const reqItem = puzzle.items[reqItemId]!;
          if (reqItem.initialRoom !== lock.roomId) {
            crossRoomFound = true;
            break;
          }
        }
        if (crossRoomFound) break;
      }
    }
    expect(crossRoomFound).toBe(true);
  });
});
