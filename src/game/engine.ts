import type { GameState, PuzzleDefinition, HistoryEntry, ItemId, LockId, RoomId, Lock, Room } from './types';

// ─── 實體名稱查找工具 ───

function getEntityName(id: string, puzzle: PuzzleDefinition): string {
  return puzzle.items[id]?.name ?? puzzle.locks[id]?.name ?? id;
}

// ─── 歷史訊息工具 ───

let msgCounter = 0;

function createEntry(type: HistoryEntry['type'], text: string): HistoryEntry {
  return { id: `msg_${Date.now()}_${msgCounter++}`, type, text };
}

function addLog(state: GameState, type: HistoryEntry['type'], text: string): void {
  state.history.push(createEntry(type, text));
}

// ─── 查找工具（模糊匹配）───

function findInRoom(name: string, state: GameState): Lock | undefined {
  const room = state.puzzle.rooms[state.currentRoomId]!;
  return room.lockIds
    .map(id => state.puzzle.locks[id]!)
    .find(l => l.name.includes(name));
}

function findVisibleItem(name: string, state: GameState) {
  const room = state.puzzle.rooms[state.currentRoomId]!;
  return room.visibleItems
    .map(id => state.puzzle.items[id]!)
    .find(i => i.name.includes(name));
}

function findInventoryItem(name: string, state: GameState) {
  for (const id of state.inventory) {
    const item = state.puzzle.items[id];
    if (item && item.name.includes(name)) return item;
    const lock = state.puzzle.locks[id];
    if (lock && lock.name.includes(name)) return lock;
  }
  return undefined;
}

// ─── 房間描述 ───

/** 找出從指定房間可通行的回程門（已解鎖、從其他房間連過來的空間鎖） */
export function getReturnDoors(puzzle: PuzzleDefinition, roomId: RoomId): Lock[] {
  return Object.values(puzzle.locks).filter(
    l => l.category === 'spatial' && !l.isExit && !l.isLocked
      && l.targetRoomId === roomId && l.roomId !== roomId,
  );
}

/** 找出從當前房間可使用的所有空間鎖（本房間的門 + 回程門） */
function findReachableDoors(state: GameState): Lock[] {
  const roomId = state.currentRoomId;
  const doors: Lock[] = [];
  for (const lock of Object.values(state.puzzle.locks)) {
    if (lock.category !== 'spatial' || !lock.targetRoomId || lock.isExit) continue;
    if (lock.roomId === roomId || lock.targetRoomId === roomId) {
      doors.push(lock);
    }
  }
  return doors;
}

function getRoomLookText(room: Room, puzzle: PuzzleDefinition): string {
  let text = '';
  const lockedLocks = room.lockIds
    .map(id => puzzle.locks[id]!)
    .filter(l => l.isLocked || l.category === 'spatial');

  const returnDoors = getReturnDoors(puzzle, room.id);

  if (lockedLocks.length > 0 || returnDoors.length > 0) {
    text += '你看到了以下機關：\n';
    for (const lock of lockedLocks) {
      const status = lock.isLocked ? '已上鎖' : '已解開';
      const suffix = lock.category === 'spatial' && lock.targetRoomId
        ? ` (通往 ${puzzle.rooms[lock.targetRoomId]?.name ?? '未知'})`
        : '';
      text += `- [機關] ${lock.name} (${status})${suffix}\n`;
    }
    for (const lock of returnDoors) {
      text += `- [通道] ${lock.name} (已解開) (通往 ${puzzle.rooms[lock.roomId]?.name ?? '未知'})\n`;
    }
  }

  if (room.visibleItems.length > 0) {
    text += '地上有以下物品：\n';
    for (const itemId of room.visibleItems) {
      text += `- [物品] ${puzzle.items[itemId]!.name}\n`;
    }
  }

  return text || '這裡什麼都沒有特別的。';
}

// ─── 檢查物品是否仍被需要 ───

export function isItemStillNeeded(itemId: ItemId, puzzle: PuzzleDefinition): boolean {
  for (const lock of Object.values(puzzle.locks)) {
    if (!lock.isLocked) continue;
    if (lock.requiredItems.includes(itemId) && !lock.insertedItems.includes(itemId)) {
      return true;
    }
  }
  return false;
}

// ─── 解鎖副作用 ───

/** 所有必需物品插入後，根據機關機制決定解鎖或觸發小遊戲 */
function tryUnlockAfterInsert(lock: Lock, state: GameState): void {
  if (lock.mechanism === 'minigame') {
    addLog(state, 'info', '所有零件就位！小遊戲已啟動，請完成挑戰來解鎖。');
  } else {
    performUnlock(lock, state);
  }
}

function performUnlock(lock: Lock, state: GameState): void {
  lock.isLocked = false;
  addLog(state, 'success', lock.unlockDescription);

  const isInInventory = state.inventory.includes(lock.id);

  if (lock.category === 'container' && lock.contents.length > 0) {
    const room = state.puzzle.rooms[state.currentRoomId]!;
    const contentNames: string[] = [];
    for (const id of lock.contents) {
      if (isInInventory) {
        // 背包中的狀態鎖：內容物直接進背包
        state.inventory.push(id);
      } else if (id in state.puzzle.items) {
        room.visibleItems.push(id);
      } else if (id in state.puzzle.locks) {
        room.lockIds.push(id);
      }
      contentNames.push(getEntityName(id, state.puzzle));
    }
    if (isInInventory) {
      addLog(state, 'success', `你獲得了：${contentNames.join('、')}！`);
      // 消耗狀態鎖本身（從背包移除）
      state.inventory = state.inventory.filter(id => id !== lock.id);
    } else {
      addLog(state, 'success', `你從 ${lock.name} 中發現了：${contentNames.join('、')}！`);
    }
    lock.contents = [];
  }

  if (lock.category === 'spatial' && lock.targetRoomId) {
    const targetRoom = state.puzzle.rooms[lock.targetRoomId];
    if (targetRoom && targetRoom.visibleItems.length > 0) {
      const names = targetRoom.visibleItems.map(id => state.puzzle.items[id]!.name).join('、');
      addLog(state, 'info', `透過開啟的通道，你似乎可以看到那邊有：${names}`);
    }
  }

  if (lock.isExit) {
    state.isGameOver = true;
    addLog(state, 'success', '恭喜你成功逃出密室！');
  }

  // 每次解鎖後掃描背包，清除不再需要的物品
  sweepInventory(state);
}

// ─── 背包掃描：清除不再需要的物品 ───

function sweepInventory(state: GameState): void {
  const toRemove = new Set<string>();
  for (const id of state.inventory) {
    const item = state.puzzle.items[id];
    if (!item) continue; // locks in inventory are never swept
    if (!isItemStillNeeded(id as ItemId, state.puzzle)) toRemove.add(id);
  }
  if (toRemove.size === 0) return;
  state.inventory = state.inventory.filter(id => !toRemove.has(id));
  for (const id of toRemove) {
    addLog(state, 'system', `${getEntityName(id, state.puzzle)} 已經沒有其他用途，從背包中移除。`);
  }
}

// ─── 單一物品消耗檢查（用於 useItemOnLock 部分插入情境）───

function consumeItemIfNeeded(itemId: ItemId, state: GameState): void {
  if (!state.puzzle.items[itemId]) return; // locks in inventory are never consumed
  if (!isItemStillNeeded(itemId, state.puzzle)) {
    state.inventory = state.inventory.filter(id => id !== itemId);
    addLog(state, 'system', `${getEntityName(itemId, state.puzzle)} 已經沒有其他用途，從背包中移除。`);
  }
}

// ═══════════════════════════════════════════
//  原子動作函式（Click UI 和指令系統共用）
// ═══════════════════════════════════════════

export function lookAround(state: GameState): GameState {
  const newState = cloneState(state);
  const room = newState.puzzle.rooms[newState.currentRoomId]!;
  addLog(newState, 'room', `[${room.name}] ${room.description}`);
  addLog(newState, 'system', getRoomLookText(room, newState.puzzle));
  return newState;
}

export function showInventory(state: GameState): GameState {
  const newState = cloneState(state);
  if (newState.inventory.length === 0) {
    addLog(newState, 'system', '你的背包是空的。');
  } else {
    const list = newState.inventory.map(id => `- ${getEntityName(id, newState.puzzle)}`).join('\n');
    addLog(newState, 'system', `你身上有：\n${list}`);
  }
  return newState;
}

export function inspectEntity(state: GameState, entityId: string): GameState {
  const newState = cloneState(state);
  const item = newState.puzzle.items[entityId];
  const lock = newState.puzzle.locks[entityId];

  if (item) {
    addLog(newState, 'system', item.description);
  } else if (lock) {
    addLog(newState, 'system', lock.isLocked ? lock.lockedDescription : lock.unlockDescription);
    if (lock.isLocked && lock.insertedItems.length > 0 && lock.requiredItems.length > 1) {
      addLog(newState, 'info', `已插入 ${lock.insertedItems.length}/${lock.requiredItems.length} 個所需物品。`);
    }
    if (lock.isLocked && lock.keyHints) {
      const hintLines = lock.requiredItems
        .map(itemId => {
          const hint = lock.keyHints?.[itemId];
          if (!hint) return null;
          const done = lock.insertedItems.includes(itemId);
          return `${done ? '✓' : '•'} ${hint}`;
        })
        .filter((line): line is string => line !== null);
      if (hintLines.length > 0) {
        addLog(newState, 'info', `你觀察到：\n${hintLines.join('\n')}`);
      }
    }
  } else {
    addLog(newState, 'error', '找不到該物品或機關。');
  }
  return newState;
}

/** Mutates state to pick up an item or pickupable lock by id from the current room. */
function pickupEntity(entityId: string, state: GameState): void {
  const room = state.puzzle.rooms[state.currentRoomId]!;
  const item = state.puzzle.items[entityId];
  if (item) {
    if (!room.visibleItems.includes(entityId)) { addLog(state, 'error', '這裡沒有這個物品。'); return; }
    if (!item.pickupable) { addLog(state, 'error', `${item.name} 固定在這裡，無法拿起。`); return; }
    room.visibleItems = room.visibleItems.filter(id => id !== entityId);
    state.inventory.push(entityId);
    addLog(state, 'success', `你拿起了 ${item.name}。`);
    return;
  }
  const lock = state.puzzle.locks[entityId];
  if (lock) {
    if (!room.lockIds.includes(entityId)) { addLog(state, 'error', '這裡沒有這個物品。'); return; }
    if (!lock.pickupable) { addLog(state, 'error', `${lock.name} 固定在這裡，無法拿起。`); return; }
    room.lockIds = room.lockIds.filter(id => id !== entityId);
    state.inventory.push(entityId);
    addLog(state, 'success', `你拿起了 ${lock.name}。`);
    return;
  }
  addLog(state, 'error', '這裡沒有這個物品。');
}

export function takeItem(state: GameState, itemId: ItemId): GameState {
  const newState = cloneState(state);
  pickupEntity(itemId, newState);
  return newState;
}

export function useItemOnLock(state: GameState, itemId: ItemId, lockId: LockId): GameState {
  const newState = cloneState(state);
  const lock = newState.puzzle.locks[lockId];
  const item = newState.puzzle.items[itemId];

  if (!lock || !item) {
    addLog(newState, 'error', '找不到物品或機關。');
    return newState;
  }

  if (!lock.isLocked) {
    addLog(newState, 'error', `${lock.name} 已經是解開的狀態了。`);
    return newState;
  }

  if (!lock.requiredItems.includes(itemId)) {
    addLog(newState, 'error', `${item.name} 對 ${lock.name} 沒有任何作用。`);
    return newState;
  }

  const room = newState.puzzle.rooms[newState.currentRoomId]!;
  const hasItem = newState.inventory.includes(itemId)
    || (!item.pickupable && room.visibleItems.includes(itemId));
  if (!hasItem) {
    addLog(newState, 'error', `你沒有 ${item.name}。`);
    return newState;
  }

  if (lock.insertedItems.includes(itemId)) {
    addLog(newState, 'error', `你已經對 ${lock.name} 使用過 ${item.name} 了。`);
    return newState;
  }

  lock.insertedItems.push(itemId);
  addLog(newState, 'system', `你使用了 ${item.name}。`);

  const allInserted = lock.requiredItems.every(reqId => lock.insertedItems.includes(reqId));
  if (allInserted) {
    tryUnlockAfterInsert(lock, newState);
  } else if (lock.requiredItems.length > 1) {
    addLog(newState, 'info', lock.partialDescription ?? `${lock.name} 似乎還需要其他東西...`);
    addLog(newState, 'info', `(${lock.insertedItems.length}/${lock.requiredItems.length})`);
  }

  consumeItemIfNeeded(itemId, newState);
  return newState;
}

export function enterPassword(state: GameState, password: string, lockId: LockId): GameState {
  const newState = cloneState(state);
  const lock = newState.puzzle.locks[lockId];

  if (!lock) {
    addLog(newState, 'error', '找不到該機關。');
    return newState;
  }

  if (!lock.isLocked) {
    addLog(newState, 'error', `${lock.name} 已經是解開的狀態了。`);
    return newState;
  }

  if (lock.mechanism !== 'password' || !lock.password) {
    addLog(newState, 'error', `${lock.name} 不是密碼鎖。`);
    return newState;
  }

  if (lock.password.toLowerCase() === password.trim().toLowerCase()) {
    performUnlock(lock, newState);
  } else {
    addLog(newState, 'error', `密碼錯誤，${lock.name} 發出警告聲。`);
  }

  return newState;
}

export function moveToRoom(state: GameState, lockId: LockId): GameState {
  const newState = cloneState(state);
  const lock = newState.puzzle.locks[lockId];

  if (!lock) {
    addLog(newState, 'error', '找不到該通道。');
    return newState;
  }

  if (lock.category !== 'spatial' || !lock.targetRoomId) {
    addLog(newState, 'error', `${lock.name} 不是一個通道。`);
    return newState;
  }

  if (lock.isLocked) {
    addLog(newState, 'error', `${lock.name} 是鎖著的，你必須先解開它。`);
    return newState;
  }

  // 雙向通行：玩家可從門的任一端穿過
  let destRoomId: string;
  if (newState.currentRoomId === lock.roomId) {
    destRoomId = lock.targetRoomId;
  } else if (newState.currentRoomId === lock.targetRoomId) {
    destRoomId = lock.roomId;
  } else {
    addLog(newState, 'error', '你無法從這裡使用該通道。');
    return newState;
  }

  newState.currentRoomId = destRoomId;
  const targetRoom = newState.puzzle.rooms[destRoomId]!;
  addLog(newState, 'success', `你穿過了 ${lock.name}，來到了 ${targetRoom.name}。`);
  addLog(newState, 'room', `[${targetRoom.name}] ${targetRoom.description}`);
  addLog(newState, 'system', getRoomLookText(targetRoom, newState.puzzle));
  return newState;
}

export function completeMinigame(state: GameState, lockId: LockId): GameState {
  const lock = state.puzzle.locks[lockId];
  if (!lock || !lock.isLocked || lock.mechanism !== 'minigame') return state;
  const newState = cloneState(state);
  const clonedLock = newState.puzzle.locks[lockId]!;
  const allInserted = clonedLock.requiredItems.every(reqId => clonedLock.insertedItems.includes(reqId));
  if (!allInserted) {
    addLog(newState, 'error', '還沒有收齊所有零件。');
    return newState;
  }
  addLog(newState, 'success', '小遊戲完成！');
  performUnlock(clonedLock, newState);
  return newState;
}

// ═══════════════════════════════════════════
//  MUD 文字指令系統
// ═══════════════════════════════════════════

export function executeCommand(cmd: string, state: GameState): GameState {
  const newState = cloneState(state);
  addLog(newState, 'user', `> ${cmd}`);

  if (newState.isGameOver) {
    addLog(newState, 'error', '遊戲已經結束。請重新產生謎題。');
    return newState;
  }

  const trimmed = cmd.trim();
  const spaceIdx = trimmed.indexOf(' ');
  const verb = (spaceIdx === -1 ? trimmed : trimmed.substring(0, spaceIdx)).toLowerCase();
  const rest = spaceIdx === -1 ? '' : trimmed.substring(spaceIdx + 1);

  switch (verb) {
    case 'look':
    case 'l': {
      const room = newState.puzzle.rooms[newState.currentRoomId]!;
      addLog(newState, 'room', `[${room.name}] ${room.description}`);
      addLog(newState, 'system', getRoomLookText(room, newState.puzzle));
      break;
    }

    case 'inventory':
    case 'i': {
      if (newState.inventory.length === 0) {
        addLog(newState, 'system', '你的背包是空的。');
      } else {
        const list = newState.inventory.map(id => `- ${getEntityName(id, newState.puzzle)}`).join('\n');
        addLog(newState, 'system', `你身上有：\n${list}`);
      }
      break;
    }

    case 'examine':
    case 'x': {
      if (!rest) { addLog(newState, 'error', '你要檢查什麼？'); break; }
      const item = findInventoryItem(rest, newState) ?? findVisibleItem(rest, newState);
      const lock = findInRoom(rest, newState);
      if (item) {
        addLog(newState, 'system', item.description);
      } else if (lock) {
        addLog(newState, 'system', lock.isLocked ? lock.lockedDescription : lock.unlockDescription);
      } else {
        addLog(newState, 'error', `找不到名為「${rest}」的物品或機關。`);
      }
      break;
    }

    case 'take':
    case 't': {
      if (!rest) { addLog(newState, 'error', '你要拿什麼？'); break; }
      const foundItem = findVisibleItem(rest, newState);
      const foundLock = foundItem ? undefined : findInRoom(rest, newState);
      if (!foundItem && !foundLock) { addLog(newState, 'error', `這裡沒有「${rest}」。`); break; }
      pickupEntity(foundItem?.id ?? foundLock!.id, newState);
      break;
    }

    case 'use': {
      const match = rest.match(/(.*?)\s+on\s+(.*)/i);
      if (!match) { addLog(newState, 'error', '指令格式：use [物品] on [機關]'); break; }
      let item = findInventoryItem(match[1]!, newState);
      if (!item) {
        const roomItem = findVisibleItem(match[1]!, newState);
        if (roomItem && !roomItem.pickupable) item = roomItem;
      }
      if (!item) { addLog(newState, 'error', `你身上沒有「${match[1]}」。`); break; }
      const lock = findInRoom(match[2]!, newState);
      if (!lock) { addLog(newState, 'error', `找不到機關「${match[2]}」。`); break; }

      if (!lock.isLocked) { addLog(newState, 'error', `${lock.name} 已經是解開的狀態了。`); break; }
      if (lock.mechanism === 'password') {
        addLog(newState, 'error', `${lock.name} 需要輸入密碼，請使用 enter [密碼] on [機關] 指令。`);
        break;
      }

      if (!lock.requiredItems.includes(item.id)) {
        addLog(newState, 'error', `${item.name} 對 ${lock.name} 沒有任何作用。`);
        break;
      }

      if (lock.insertedItems.includes(item.id)) {
        addLog(newState, 'error', `你已經對 ${lock.name} 使用過 ${item.name} 了。`);
        break;
      }

      lock.insertedItems.push(item.id);
      addLog(newState, 'system', `你使用了 ${item.name}。`);

      if (lock.requiredItems.every(reqId => lock.insertedItems.includes(reqId))) {
        tryUnlockAfterInsert(lock, newState);
      } else if (lock.requiredItems.length > 1) {
        addLog(newState, 'info', lock.partialDescription ?? `${lock.name} 似乎還需要其他東西...`);
      }

      consumeItemIfNeeded(item.id, newState);
      break;
    }

    case 'enter': {
      const match = rest.match(/(.*?)\s+on\s+(.*)/i);
      if (!match) { addLog(newState, 'error', '指令格式：enter [密碼] on [機關]'); break; }
      const pwd = match[1]!.trim();
      const lock = findInRoom(match[2]!, newState);
      if (!lock) { addLog(newState, 'error', `找不到機關「${match[2]}」。`); break; }
      if (!lock.isLocked) { addLog(newState, 'error', `${lock.name} 已經是解開的狀態了。`); break; }
      if (lock.mechanism !== 'password' || !lock.password) {
        addLog(newState, 'error', `${lock.name} 不是密碼鎖。`);
        break;
      }
      if (lock.password.toLowerCase() === pwd.toLowerCase()) {
        performUnlock(lock, newState);
      } else {
        addLog(newState, 'error', `密碼錯誤，${lock.name} 發出警告聲。`);
      }
      break;
    }

    case 'go': {
      if (!rest) { addLog(newState, 'error', '你要去哪裡？'); break; }
      // 搜尋當前房間的門 + 從其他房間通往當前房間的回程門
      const reachableDoors = findReachableDoors(newState);
      let lock = reachableDoors.find(l => l.name.includes(rest));

      // 嘗試用房間名稱查找通道
      if (!lock) {
        for (const l of reachableDoors) {
          const destId = l.roomId === newState.currentRoomId ? l.targetRoomId! : l.roomId;
          const dest = newState.puzzle.rooms[destId];
          if (dest && dest.name.includes(rest)) { lock = l; break; }
        }
      }

      if (!lock) { addLog(newState, 'error', `找不到名為「${rest}」的通道。`); break; }
      if (lock.isLocked) {
        addLog(newState, 'error', `${lock.name} 是鎖著的，你必須先解開它。`);
        break;
      }

      const destRoomId = lock.roomId === newState.currentRoomId ? lock.targetRoomId! : lock.roomId;
      newState.currentRoomId = destRoomId;
      const targetRoom = newState.puzzle.rooms[destRoomId]!;
      addLog(newState, 'success', `你穿過了 ${lock.name}，來到了 ${targetRoom.name}。`);
      addLog(newState, 'room', `[${targetRoom.name}] ${targetRoom.description}`);
      addLog(newState, 'system', getRoomLookText(targetRoom, newState.puzzle));
      break;
    }

    case 'help':
      addLog(newState, 'system',
        '可用指令：\n' +
        '- look (l): 觀察四周\n' +
        '- inventory (i): 查看背包\n' +
        '- examine [物品/機關] (x): 仔細檢查\n' +
        '- take [物品] (t): 拾取物品\n' +
        '- use [物品] on [機關]: 使用物品解鎖\n' +
        '- enter [密碼] on [機關]: 輸入密碼解鎖\n' +
        '- go [通道名稱]: 移動到其他房間',
      );
      break;

    default:
      addLog(newState, 'error', `未知的指令：「${verb}」。輸入 help 查看可用指令。`);
  }

  return newState;
}

// ═══════════════════════════════════════════
//  初始化
// ═══════════════════════════════════════════

export function initGame(puzzle: PuzzleDefinition): GameState {
  const startRoom = puzzle.rooms[puzzle.startRoomId]!;
  return {
    puzzle,
    currentRoomId: puzzle.startRoomId,
    inventory: [],
    history: [
      createEntry('system', '歡迎來到密室脫逃！輸入 help 查看可用指令。'),
      createEntry('room', `[${startRoom.name}] ${startRoom.description}`),
      createEntry('system', getRoomLookText(startRoom, puzzle)),
    ],
    isGameOver: false,
  };
}

// ─── 狀態深拷貝（確保不可變性）───

function cloneState(state: GameState): GameState {
  return {
    ...state,
    puzzle: {
      ...state.puzzle,
      rooms: Object.fromEntries(
        Object.entries(state.puzzle.rooms).map(([k, v]) => [k, { ...v, lockIds: [...v.lockIds], visibleItems: [...v.visibleItems] }]),
      ),
      items: Object.fromEntries(
        Object.entries(state.puzzle.items).map(([k, v]) => [k, { ...v }]),
      ),
      locks: Object.fromEntries(
        Object.entries(state.puzzle.locks).map(([k, v]) => [k, { ...v, requiredItems: [...v.requiredItems], insertedItems: [...v.insertedItems], contents: [...v.contents] }]),
      ),
    },
    inventory: [...state.inventory],
    history: [...state.history],
  };
}
