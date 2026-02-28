import { GameState, Item, Lock, Room } from './types';
import { PuzzleGenerator } from './generator';

export function initGame(depth: number, maxRooms: number = 3): GameState {
  const generator = new PuzzleGenerator();
  const { rooms, items, locks, startRoomId } = generator.generate(depth, maxRooms);
  
  const startRoom = rooms[startRoomId];
  
  return {
    rooms,
    currentRoomId: startRoomId,
    locks,
    items,
    inventory: [],
    history: [
      { id: 'sys_0', type: 'system', text: '歡迎來到密室脫逃！' },
      { id: 'sys_1', type: 'system', text: `[${startRoom.name}] ${startRoom.description}` },
      { id: 'sys_2', type: 'system', text: getRoomLookText(startRoom, locks, items) }
    ],
    isGameOver: false
  };
}

export function getRoomLookText(room: Room, locks: Record<string, Lock>, items: Record<string, Item>) {
  let text = '';
  if (room.locks.length > 0) {
    text += '你看到了以下物品/機關：\n';
    room.locks.forEach(lockId => {
      const lock = locks[lockId];
      text += `- [機關] ${lock.name} (${lock.isLocked ? '已上鎖' : '已解開'})\n`;
    });
  }
  if (room.visibleItems.length > 0) {
    text += '地上有以下物品：\n';
    room.visibleItems.forEach(itemId => {
      text += `- [物品] ${items[itemId].name}\n`;
    });
  }
  return text || '這裡什麼都沒有。';
}

export function executeCommand(cmd: string, state: GameState): GameState {
  const newState = { ...state, history: [...state.history, { id: Date.now().toString(), type: 'user' as const, text: `> ${cmd}` }] };
  
  if (newState.isGameOver) {
    newState.history.push({ id: Date.now() + '_err', type: 'error', text: '遊戲已經結束。請重新產生謎題。' });
    return newState;
  }

  const args = cmd.trim().split(/\s+/);
  const verb = args[0].toLowerCase();
  const rest = args.slice(1).join(' ');

  const addSysMsg = (text: string, type: 'system'|'error'|'success' = 'system') => {
    newState.history.push({ id: Date.now() + '_' + Math.random(), type, text });
  };

  const currentRoom = newState.rooms[newState.currentRoomId];

  switch (verb) {
    case 'look':
    case 'l':
      addSysMsg(`[${currentRoom.name}] ${currentRoom.description}`);
      addSysMsg(getRoomLookText(currentRoom, newState.locks, newState.items));
      break;
    case 'inventory':
    case 'i':
      if (newState.inventory.length === 0) {
        addSysMsg('你的背包是空的。');
      } else {
        addSysMsg('你身上有：\n' + newState.inventory.map(id => `- ${newState.items[id].name}`).join('\n'));
      }
      break;
    case 'examine':
    case 'x': {
      if (!rest) { addSysMsg('你要檢查什麼？', 'error'); break; }
      const target = findTarget(rest, newState);
      if (!target) { addSysMsg(`找不到名為「${rest}」的物品或機關。`, 'error'); break; }
      if (target.type === 'lock') {
        const lock = target.obj as Lock;
        addSysMsg(lock.isLocked ? lock.lockedDescription : lock.unlockedDescription);
      } else {
        const item = target.obj as Item;
        addSysMsg(item.description);
      }
      break;
    }
    case 'take':
    case 't': {
      if (!rest) { addSysMsg('你要拿什麼？', 'error'); break; }
      const item = findVisibleItem(rest, newState);
      if (!item) { addSysMsg(`地上沒有「${rest}」。`, 'error'); break; }
      currentRoom.visibleItems = currentRoom.visibleItems.filter(id => id !== item.id);
      newState.inventory.push(item.id);
      addSysMsg(`你拿起了 ${item.name}。`, 'success');
      break;
    }
    case 'use': {
      const match = rest.match(/(.*) on (.*)/);
      if (!match) { addSysMsg('指令格式錯誤。請使用: use [物品] on [機關]', 'error'); break; }
      const itemName = match[1];
      const lockName = match[2];
      
      const item = findInventoryItem(itemName, newState);
      if (!item) { addSysMsg(`你身上沒有「${itemName}」。`, 'error'); break; }
      
      const lock = findLock(lockName, newState);
      if (!lock) { addSysMsg(`找不到機關「${lockName}」。`, 'error'); break; }
      
      if (!lock.isLocked) { addSysMsg(`${lock.name} 已經是解開的狀態了。`, 'error'); break; }
      
      if (lock.type === 'password' || (lock.type === 'door' && lock.password)) {
        addSysMsg(`${lock.name} 需要輸入密碼，請使用 enter [密碼] on [機關] 指令。`, 'error');
        break;
      }
      
      if (lock.requiredItems.includes(item.id)) {
        if (!lock.insertedItems) lock.insertedItems = [];
        if (lock.insertedItems.includes(item.id)) {
          addSysMsg(`你已經對 ${lock.name} 使用過 ${item.name} 了。`, 'error');
          break;
        }
        
        lock.insertedItems.push(item.id);
        
        if (item.type !== 'tool') {
          newState.inventory = newState.inventory.filter(id => id !== item.id);
          addSysMsg(`你使用了 ${item.name}。`);
        } else {
          addSysMsg(`你使用了 ${item.name}。`);
        }
        
        const allInserted = lock.requiredItems.every(reqId => lock.insertedItems!.includes(reqId));
        if (allInserted) {
          unlockLock(lock, newState, addSysMsg);
        } else {
          addSysMsg(`${lock.name} 似乎還需要其他東西...`, 'system');
        }
      } else {
        addSysMsg(`${item.name} 對 ${lock.name} 沒有任何作用。`, 'error');
      }
      break;
    }
    case 'enter': {
      const match = rest.match(/(.*) on (.*)/);
      if (!match) { addSysMsg('指令格式錯誤。請使用: enter [密碼] on [機關]', 'error'); break; }
      const pwd = match[1];
      const lockName = match[2];
      
      const lock = findLock(lockName, newState);
      if (!lock) { addSysMsg(`找不到機關「${lockName}」。`, 'error'); break; }
      
      if (!lock.isLocked) { addSysMsg(`${lock.name} 已經是解開的狀態了。`, 'error'); break; }
      
      if (lock.type !== 'password' && !(lock.type === 'door' && lock.password)) {
        addSysMsg(`${lock.name} 不是密碼鎖。`, 'error');
        break;
      }
      
      if (lock.password === pwd) {
        unlockLock(lock, newState, addSysMsg);
      } else {
        addSysMsg(`密碼錯誤，${lock.name} 發出警告聲。`, 'error');
      }
      break;
    }
    case 'go': {
      if (!rest) { addSysMsg('你要去哪裡？', 'error'); break; }
      const lock = findLock(rest, newState);
      if (!lock) {
        const targetRoom = Object.values(newState.rooms).find(r => r.name.includes(rest));
        if (targetRoom) {
           const doorToRoom = currentRoom.locks.map(id => newState.locks[id]).find(l => l.targetRoomId === targetRoom.id);
           if (doorToRoom && !doorToRoom.isLocked) {
             newState.currentRoomId = targetRoom.id;
             addSysMsg(`你走進了 ${targetRoom.name}。`, 'success');
             addSysMsg(`[${targetRoom.name}] ${targetRoom.description}`);
             addSysMsg(getRoomLookText(targetRoom, newState.locks, newState.items));
             break;
           }
        }
        addSysMsg(`找不到名為「${rest}」的通道。`, 'error'); 
        break; 
      }
      
      if (lock.type !== 'door' && !lock.targetRoomId) {
        addSysMsg(`${lock.name} 不是一個通道。`, 'error');
        break;
      }
      
      if (lock.isLocked) {
        addSysMsg(`${lock.name} 是鎖著的，你必須先解開它。`, 'error');
        break;
      }
      
      if (lock.targetRoomId) {
        newState.currentRoomId = lock.targetRoomId;
        const targetRoom = newState.rooms[lock.targetRoomId];
        addSysMsg(`你穿過了 ${lock.name}，來到了 ${targetRoom.name}。`, 'success');
        addSysMsg(`[${targetRoom.name}] ${targetRoom.description}`);
        addSysMsg(getRoomLookText(targetRoom, newState.locks, newState.items));
      }
      break;
    }
    case 'help':
      addSysMsg('可用指令：\n- look (l): 觀察四周\n- inventory (i): 查看背包\n- examine [物品/機關] (x): 仔細檢查\n- take [物品] (t): 拾取物品\n- use [物品] on [機關]: 使用物品解鎖\n- enter [密碼] on [機關]: 輸入密碼解鎖\n- go [通道名稱]: 移動到其他房間');
      break;
    default:
      addSysMsg(`未知的指令：「${verb}」。輸入 help 查看可用指令。`, 'error');
  }

  return newState;
}

function unlockLock(lock: Lock, state: GameState, addSysMsg: Function) {
  lock.isLocked = false;
  addSysMsg(lock.unlockedDescription, 'success');
  
  if (lock.containsItems && lock.containsItems.length > 0) {
    const itemNames = lock.containsItems.map(id => state.items[id].name).join('、');
    addSysMsg(`你從 ${lock.name} 中發現了：${itemNames}！`, 'success');
    const currentRoom = state.rooms[state.currentRoomId];
    currentRoom.visibleItems.push(...lock.containsItems);
    lock.containsItems = []; 
  }
  
  if (lock.isExit) {
    state.isGameOver = true;
    addSysMsg('🎉 恭喜你成功逃出密室！', 'success');
  }
}

function findTarget(name: string, state: GameState) {
  const item = findInventoryItem(name, state) || findVisibleItem(name, state);
  if (item) return { type: 'item', obj: item };
  const lock = findLock(name, state);
  if (lock) return { type: 'lock', obj: lock };
  return null;
}

function findInventoryItem(name: string, state: GameState) {
  return state.inventory.map(id => state.items[id]).find(i => i.name.includes(name));
}

function findVisibleItem(name: string, state: GameState) {
  const currentRoom = state.rooms[state.currentRoomId];
  return currentRoom.visibleItems.map(id => state.items[id]).find(i => i.name.includes(name));
}

function findLock(name: string, state: GameState) {
  const currentRoom = state.rooms[state.currentRoomId];
  return currentRoom.locks.map(id => state.locks[id]).find(l => l.name.includes(name));
}
