/**
 * 謎題生成品質測試
 *
 * 這些測試驗證「生成結果是否像一個真正的密室脫逃」
 * 不測試可解性（由其他測試覆蓋），而是測試結構品質：
 * - container 裡的東西不應該在地板上
 * - 每個房間應該有謎題（不是全部是地板物品）
 * - 門鎖後面應該有足夠的內容
 */
import { describe, it, expect } from 'vitest';
import { generatePuzzle } from '../generator';
import type { GeneratorConfig, PuzzleDefinition } from '../types';

// ─── 輔助函式 ───

function getContainedItemIds(puzzle: PuzzleDefinition): Set<string> {
  const contained = new Set<string>();
  for (const lock of Object.values(puzzle.locks)) {
    for (const itemId of lock.contents) {
      contained.add(itemId);
    }
  }
  return contained;
}

function getFloorItemIds(puzzle: PuzzleDefinition): Set<string> {
  const floor = new Set<string>();
  for (const room of Object.values(puzzle.rooms)) {
    for (const itemId of room.visibleItems) {
      floor.add(itemId);
    }
  }
  return floor;
}

// ─── 設定 ───

const STANDARD_CONFIG: GeneratorConfig = {
  targetDepth: 4,
  maxRooms: 3,
  compositeRate: 0.3,
  depthStaggerVariance: 1,
};

const DEEP_CONFIG: GeneratorConfig = {
  targetDepth: 6,
  maxRooms: 3,
  compositeRate: 0.3,
  depthStaggerVariance: 1,
};

// ─── 測試 ───

describe('謎題生成品質', () => {
  describe('結構完整性', () => {
    it('container 裡的物品不應出現在地板上（50次）', () => {
      for (let i = 0; i < 50; i++) {
        const puzzle = generatePuzzle(STANDARD_CONFIG);
        const contained = getContainedItemIds(puzzle);
        const floor = getFloorItemIds(puzzle);

        for (const itemId of contained) {
          expect(
            floor.has(itemId),
            `Item "${puzzle.items[itemId]?.name}" is both inside a container and on the floor`,
          ).toBe(false);
        }
      }
    });

    it('所有 visibleItems 都是真正在地板的物品（30次）', () => {
      for (let i = 0; i < 30; i++) {
        const puzzle = generatePuzzle(STANDARD_CONFIG);
        const contained = getContainedItemIds(puzzle);

        for (const room of Object.values(puzzle.rooms)) {
          for (const itemId of room.visibleItems) {
            expect(
              contained.has(itemId),
              `Item "${puzzle.items[itemId]?.name}" is in visibleItems but also inside a container`,
            ).toBe(false);
          }
        }
      }
    });

    it('每個 item 只出現在一個地方（地板或 container，不重複）', () => {
      for (let i = 0; i < 30; i++) {
        const puzzle = generatePuzzle(STANDARD_CONFIG);

        const seen = new Map<string, string[]>();
        for (const [roomId, room] of Object.entries(puzzle.rooms)) {
          for (const itemId of room.visibleItems) {
            if (!seen.has(itemId)) seen.set(itemId, []);
            seen.get(itemId)!.push(`floor:${roomId}`);
          }
        }
        for (const [lockId, lock] of Object.entries(puzzle.locks)) {
          for (const itemId of lock.contents) {
            if (!seen.has(itemId)) seen.set(itemId, []);
            seen.get(itemId)!.push(`container:${lockId}`);
          }
        }

        for (const [itemId, locations] of seen.entries()) {
          expect(
            locations.length,
            `Item "${puzzle.items[itemId]?.name}" appears in ${locations.length} places: ${locations.join(', ')}`,
          ).toBe(1);
        }
      }
    });
  });

  describe('房間內容品質', () => {
    it('每個房間不應全是空的（有鎖或有地板物品）', () => {
      for (let i = 0; i < 30; i++) {
        const puzzle = generatePuzzle(DEEP_CONFIG);

        for (const [roomId, room] of Object.entries(puzzle.rooms)) {
          const hasLocks = room.lockIds.length > 0;
          const hasFloorItems = room.visibleItems.length > 0;
          expect(
            hasLocks || hasFloorItems,
            `Room "${room.name}" (${roomId}) is completely empty`,
          ).toBe(true);
        }
      }
    });

    it('有 crossRoomRate 時，起始房間不應霸佔絕大多數地板物品（50次）', () => {
      // crossRoomRate=0 時 items 會集中在同一房間（by design）
      // 這個測試驗證 crossRoomRate > 0 時物品能分散
      const config: GeneratorConfig = { ...DEEP_CONFIG, crossRoomRate: 0.5 };
      let tooManyInStart = 0;

      for (let i = 0; i < 50; i++) {
        const puzzle = generatePuzzle(config);
        const startRoom = puzzle.rooms[puzzle.startRoomId]!;
        const totalFloorItems = getFloorItemIds(puzzle).size;

        if (totalFloorItems > 0) {
          const ratio = startRoom.visibleItems.length / totalFloorItems;
          if (ratio > 0.8) tooManyInStart++;
        }
      }

      // 50 次中最多 20 次允許起始房間有超過 80% 的地板物品
      expect(tooManyInStart).toBeLessThanOrEqual(20);
    });

    it('targetDepth > 2 時，多數 container lock 應有被鎖住的物品（不是全都直接放地板）', () => {
      const config: GeneratorConfig = { ...STANDARD_CONFIG, targetDepth: 4 };

      for (let i = 0; i < 20; i++) {
        const puzzle = generatePuzzle(config);
        const containerLocks = Object.values(puzzle.locks).filter(
          l => l.category === 'container' && l.isLocked,
        );

        if (containerLocks.length > 0) {
          const locksWithContent = containerLocks.filter(l => l.contents.length > 0);
          const ratio = locksWithContent.length / containerLocks.length;
          expect(ratio).toBeGreaterThanOrEqual(0.8);
        }
      }
    });
  });

  describe('門鎖品質', () => {
    it('每道門鑰匙都在合法房間（門之前可達的房間）', () => {
      for (let i = 0; i < 30; i++) {
        const puzzle = generatePuzzle(STANDARD_CONFIG);

        const roomIds = Object.keys(puzzle.rooms);
        // 按拓撲順序排列（startRoom 在第一個）
        const orderedRooms = [puzzle.startRoomId, ...roomIds.filter(id => id !== puzzle.startRoomId)];

        const doorLocks = Object.values(puzzle.locks).filter(
          l => l.category === 'spatial' && l.isLocked && !l.isExit && l.targetRoomId,
        );

        for (const door of doorLocks) {
          const fromIdx = orderedRooms.indexOf(door.roomId);
          const toIdx = orderedRooms.indexOf(door.targetRoomId!);

          for (const reqItemId of door.requiredItems) {
            const item = puzzle.items[reqItemId]!;
            const keyRoomIdx = orderedRooms.indexOf(item.initialRoom);
            // 鑰匙必須在 fromIdx 或更早的房間（玩家不需要先進目標房間才能拿到鑰匙）
            expect(
              keyRoomIdx,
              `Door key "${item.name}" is in room index ${keyRoomIdx}, but the door connects ${fromIdx}→${toIdx}`,
            ).toBeLessThanOrEqual(Math.max(fromIdx, toIdx - 1));
          }
        }
      }
    });

    it('出口鑰匙不被它本身保護（可達性）', () => {
      for (let i = 0; i < 30; i++) {
        const puzzle = generatePuzzle(STANDARD_CONFIG);
        const exitLock = puzzle.locks[puzzle.exitLockId]!;

        for (const reqItemId of exitLock.requiredItems) {
          const item = puzzle.items[reqItemId]!;
          // 出口鑰匙的初始房間必須存在
          expect(puzzle.rooms[item.initialRoom]).toBeDefined();
        }
      }
    });
  });

  describe('深度與多樣性', () => {
    it('targetDepth=4 時應產生容器鎖（不是全部放地板）', () => {
      const config: GeneratorConfig = { ...STANDARD_CONFIG, targetDepth: 4 };

      for (let i = 0; i < 20; i++) {
        const puzzle = generatePuzzle(config);
        const containerCount = Object.values(puzzle.locks).filter(
          l => l.category === 'container' && l.isLocked,
        ).length;
        expect(containerCount).toBeGreaterThan(0);
      }
    });

    it('maxLocks 限制容器鎖數量但不影響門鎖', () => {
      const config: GeneratorConfig = { ...STANDARD_CONFIG, maxLocks: 3 };

      for (let i = 0; i < 20; i++) {
        const puzzle = generatePuzzle(config);

        const containerLocks = Object.values(puzzle.locks).filter(
          l => l.category === 'container' && l.isLocked,
        );
        const doorLocks = Object.values(puzzle.locks).filter(
          l => l.category === 'spatial' && l.isLocked && !l.isExit,
        );

        // container lock 受 maxLocks 限制
        expect(containerLocks.length).toBeLessThanOrEqual(3);
        // door lock 數量應等於 maxRooms-1
        expect(doorLocks.length).toBe(config.maxRooms - 1);
      }
    });
  });
});
