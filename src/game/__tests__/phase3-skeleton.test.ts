// src/game/__tests__/phase3-skeleton.test.ts
import { describe, it, expect } from 'vitest';
import { generateRoomSkeleton } from '../generator';
import type { GeneratorConfig } from '../types';

const BASE_CONFIG: GeneratorConfig = {
  targetDepth: 3,
  maxRooms: 3,
  compositeRate: 0,
  depthStaggerVariance: 0,
};

describe('generateRoomSkeleton (Phase A)', () => {
  it('建立精確的 maxRooms 個房間', () => {
    const result = generateRoomSkeleton(BASE_CONFIG);
    expect(result.roomIds.length).toBe(3);
    expect(Object.keys(result.ctx.rooms).length).toBe(3);
  });

  it('建立 maxRooms-1 道房間門鎖 + 1 道出口鎖', () => {
    const result = generateRoomSkeleton(BASE_CONFIG);
    const spatialLocks = Object.values(result.ctx.locks).filter(l => l.category === 'spatial');
    const exitLocks = Object.values(result.ctx.locks).filter(l => l.isExit);
    expect(exitLocks.length).toBe(1);
    expect(spatialLocks.length).toBe(BASE_CONFIG.maxRooms); // N-1 door + 1 exit
  });

  it('出口鎖在最後一個房間', () => {
    const result = generateRoomSkeleton(BASE_CONFIG);
    const exitLock = Object.values(result.ctx.locks).find(l => l.isExit)!;
    const lastRoomId = result.roomIds[result.roomIds.length - 1]!;
    expect(exitLock.roomId).toBe(lastRoomId);
  });

  it('第一個房間是 startRoomId', () => {
    const result = generateRoomSkeleton(BASE_CONFIG);
    expect(result.startRoomId).toBe(result.roomIds[0]);
  });

  it('每道門鎖的鑰匙在合法範圍內（門之前可達的房間）', () => {
    for (let run = 0; run < 30; run++) {
      const result = generateRoomSkeleton({ ...BASE_CONFIG, keySpreadRate: 1 });
      const { ctx, roomIds } = result;

      for (const target of result.floorItems) {
        const itemRoom = ctx.items[target.itemId]!.initialRoom;
        const itemRoomIndex = roomIds.indexOf(itemRoom);
        expect(itemRoomIndex).toBeLessThan(target.criticalRoomIndex);
      }
    }
  });

  it('keySpreadRate=0：每個門鑰匙都在緊鄰門的前一個房間', () => {
    for (let run = 0; run < 20; run++) {
      const result = generateRoomSkeleton({ ...BASE_CONFIG, keySpreadRate: 0 });
      const { ctx, roomIds } = result;

      const doorKeys = result.floorItems.filter(t => t.criticalRoomIndex < roomIds.length);
      for (const target of doorKeys) {
        const itemRoom = ctx.items[target.itemId]!.initialRoom;
        const itemRoomIndex = roomIds.indexOf(itemRoom);
        expect(itemRoomIndex).toBe(target.criticalRoomIndex - 1);
      }
    }
  });

  it('keySpreadRate=1：門鑰匙分散到各合法房間（20次應出現不只一種房間）', () => {
    const config = { ...BASE_CONFIG, maxRooms: 4, keySpreadRate: 1 };
    const roomSets = new Set<string>();

    for (let run = 0; run < 30; run++) {
      const result = generateRoomSkeleton(config);
      const lastDoorKey = result.floorItems
        .filter(t => t.criticalRoomIndex === config.maxRooms - 1)
        .at(0);
      if (lastDoorKey) {
        const itemRoom = result.ctx.items[lastDoorKey.itemId]!.initialRoom;
        roomSets.add(itemRoom);
      }
    }
    expect(roomSets.size).toBeGreaterThan(1);
  });

  it('每道門鎖有且只有一把鑰匙', () => {
    const result = generateRoomSkeleton(BASE_CONFIG);
    const doorLocks = Object.values(result.ctx.locks).filter(l => l.category === 'spatial' && !l.isExit);
    for (const lock of doorLocks) {
      expect(lock.requiredItems.length).toBe(1);
    }
  });

  it('floorItems 數量等於門鎖數 + 出口鑰匙', () => {
    const result = generateRoomSkeleton(BASE_CONFIG);
    expect(result.floorItems.length).toBe(BASE_CONFIG.maxRooms);
  });
});
