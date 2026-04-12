/**
 * 謎題可解性驗證器
 *
 * 模擬玩家從起點開始，按照以下規則：
 * 1. 拾取所有可到達房間地板上的物品
 * 2. 嘗試用背包物品開啟所有可到達的鎖
 * 3. 重複直到無法繼續
 *
 * 如果最終能打開出口，謎題可解；否則不可解。
 */
import type { PuzzleDefinition, ItemId, LockId, RoomId } from './types';

export interface SolveResult {
  solvable: boolean;
  /** 解謎的步驟順序（可用於 debug） */
  steps: string[];
  /** 無法取得但被某個鎖需要的物品（循環依賴的線索） */
  blockedItems: ItemId[];
}

export function solvePuzzle(puzzle: PuzzleDefinition): SolveResult {
  const { rooms, items, locks, startRoomId } = puzzle;

  const inventory = new Set<string>();
  const reachableRooms = new Set<RoomId>([startRoomId]);
  const openedLocks = new Set<LockId>();
  const accessibleLocks = new Set<LockId>();
  const steps: string[] = [];

  // 判斷某個鎖的所需物品是否都可取得
  function canUnlockLock(lockId: LockId): boolean {
    const lock = locks[lockId]!;
    return lock.requiredItems.every(id => {
      if (inventory.has(id)) return true;
      const item = items[id];
      return item != null && !item.pickupable && reachableRooms.has(item.initialRoom);
    });
  }

  // 釋放鎖的內容（物品加入背包，子鎖加入 accessibleLocks）
  function releaseContents(lockId: LockId): void {
    const lock = locks[lockId]!;
    for (const id of lock.contents) {
      if (id in items) {
        inventory.add(id);
        steps.push(`  got: ${items[id]?.name ?? id}`);
      } else if (id in locks) {
        accessibleLocks.add(id as LockId);
        steps.push(`  revealed: ${locks[id]?.name ?? id}`);
        progress = true;
      }
    }
  }

  // 初始化：收集所有直接在房間中的鎖（room.lockIds）
  // 嵌套在其他鎖 contents 中的鎖不在此列，需等父鎖開啟後才加入
  const nestedLockIds = new Set<LockId>();
  for (const lock of Object.values(locks)) {
    for (const id of lock.contents) {
      if (id in locks) nestedLockIds.add(id as LockId);
    }
  }
  for (const lock of Object.values(locks)) {
    if (!nestedLockIds.has(lock.id)) accessibleLocks.add(lock.id);
  }

  // 初始化：未鎖的門直接開通
  for (const lock of Object.values(locks)) {
    if (!lock.isLocked && lock.category === 'spatial' && lock.targetRoomId) {
      openedLocks.add(lock.id);
      reachableRooms.add(lock.targetRoomId);
    }
  }

  let progress = true;
  while (progress) {
    progress = false;

    // Step 1：拾取所有可到達房間的地板物品和可拾取的鎖
    for (const roomId of reachableRooms) {
      const room = rooms[roomId];
      if (!room) continue;
      for (const itemId of room.visibleItems) {
        if (inventory.has(itemId)) continue;
        const item = items[itemId];
        if (item && !item.pickupable) continue;
        inventory.add(itemId);
        steps.push(`pickup: ${items[itemId]?.name ?? itemId} from ${room.name}`);
        progress = true;
      }
      for (const lockId of room.lockIds) {
        if (inventory.has(lockId)) continue;
        const lock = locks[lockId];
        if (!lock || !lock.pickupable) continue;
        inventory.add(lockId);
        steps.push(`pickup lock: ${lock.name} from ${room.name}`);
        progress = true;
      }
    }

    // Step 2：嘗試開啟所有可到達且可存取的鎖
    for (const lockId of accessibleLocks) {
      if (openedLocks.has(lockId)) continue;
      const lock = locks[lockId]!;
      if (!reachableRooms.has(lock.roomId)) continue;
      if (!lock.isLocked) { openedLocks.add(lock.id); continue; }
      if (!canUnlockLock(lockId)) continue;

      openedLocks.add(lock.id);
      steps.push(`unlock: ${lock.name}`);
      progress = true;
      releaseContents(lockId);

      if (lock.category === 'spatial' && lock.targetRoomId) {
        if (!reachableRooms.has(lock.targetRoomId)) {
          reachableRooms.add(lock.targetRoomId);
          steps.push(`  entered: ${rooms[lock.targetRoomId]?.name ?? lock.targetRoomId}`);
        }
      }

      if (lock.isExit) {
        steps.push('EXIT: solved!');
        return { solvable: true, steps, blockedItems: [] };
      }
    }

    // Step 2b：嘗試解鎖背包中的可拾取鎖
    for (const id of inventory) {
      const lockId = id as LockId;
      if (openedLocks.has(lockId)) continue;
      const lock = locks[lockId];
      if (!lock || !lock.isLocked) continue;
      if (!canUnlockLock(lockId)) continue;

      openedLocks.add(lock.id);
      steps.push(`unlock: ${lock.name} (from inventory)`);
      progress = true;
      releaseContents(lockId);

      if (lock.isExit) {
        steps.push('EXIT: solved!');
        return { solvable: true, steps, blockedItems: [] };
      }
    }
  }

  // 找出被卡住的物品（有鎖需要它，但玩家拿不到）
  const blockedSet = new Set<ItemId>();
  for (const lock of Object.values(locks)) {
    if (openedLocks.has(lock.id)) continue;
    for (const itemId of lock.requiredItems) {
      if (!inventory.has(itemId)) blockedSet.add(itemId);
    }
  }

  return { solvable: false, steps, blockedItems: [...blockedSet] };
}
