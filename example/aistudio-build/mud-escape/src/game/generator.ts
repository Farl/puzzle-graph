import { Item, ItemType, Lock, LockTemplate, LockType, Room } from './types';
import { templates, exitTemplates, doorTemplates } from './templates';

function shuffle<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export class PuzzleGenerator {
  availableTemplates: LockTemplate[];
  availableDoorTemplates: LockTemplate[];
  lockIdCounter = 0;
  itemIdCounter = 0;
  roomIdCounter = 0;
  reusableTools = new Map<string, string>();
  hiddenItems = new Set<string>();
  
  usedItemNames = new Set<string>();
  usedLockNames = new Set<string>();
  adjectives = ["生鏽的", "閃亮的", "古老的", "神秘的", "沉重的", "精緻的", "破舊的", "奇特的", "冰冷的", "溫暖的", "血跡斑斑的", "佈滿灰塵的", "金色的", "銀色的", "銅製的", "鐵製的", "木製的", "石製的", "水晶的", "玻璃的", "奇異的", "發光的", "黯淡的", "巨大的", "微小的"];

  rooms: Record<string, Room> = {};
  locks: Record<string, Lock> = {};
  items: Record<string, Item> = {};

  constructor() {
    this.availableTemplates = shuffle(templates);
    this.availableDoorTemplates = shuffle(doorTemplates);
  }

  getUniqueName(baseName: string, usedSet: Set<string>): string {
    if (!usedSet.has(baseName)) {
      usedSet.add(baseName);
      return baseName;
    }
    
    let coreName = baseName;
    for (const adj of this.adjectives) {
      if (coreName.startsWith(adj)) {
        coreName = coreName.substring(adj.length);
        break;
      }
    }

    const shuffledAdjectives = shuffle(this.adjectives);
    for (const adj of shuffledAdjectives) {
      const newName = `${adj}${coreName}`;
      if (!usedSet.has(newName)) {
        usedSet.add(newName);
        return newName;
      }
    }
    const fallbackName = `${baseName} ${usedSet.size}`;
    usedSet.add(fallbackName);
    return fallbackName;
  }

  getTemplate(type?: LockType): LockTemplate {
    if (type) {
      const idx = this.availableTemplates.findIndex(t => t.type === type);
      if (idx !== -1) {
        return this.availableTemplates.splice(idx, 1)[0];
      }
    }
    if (this.availableTemplates.length === 0) {
      this.availableTemplates = shuffle(templates); 
    }
    return this.availableTemplates.pop()!;
  }

  getDoorTemplate(): LockTemplate {
    if (this.availableDoorTemplates.length === 0) {
      this.availableDoorTemplates = shuffle(doorTemplates);
    }
    return this.availableDoorTemplates.pop()!;
  }

  createRoom(name: string, description: string): Room {
    const room: Room = {
      id: `room_${this.roomIdCounter++}`,
      name,
      description,
      locks: [],
      visibleItems: []
    };
    this.rooms[room.id] = room;
    return room;
  }

  createItem(name: string, type: ItemType, description?: string): Item {
    const item: Item = {
      id: `item_${this.itemIdCounter++}`,
      name,
      description: description || `一個${name}。`,
      type
    };
    this.items[item.id] = item;
    return item;
  }

  createLock(template: LockTemplate, roomId: string, isExit = false): Lock {
    const lockName = this.getUniqueName(template.lockName, this.usedLockNames) + (isExit ? " (出口)" : "");
    const lock: Lock = {
      id: `lock_${this.lockIdCounter++}`,
      name: lockName,
      description: template.lockDesc,
      lockedDescription: template.lockDesc,
      unlockedDescription: template.unlockDesc,
      type: template.type,
      requiredItems: [],
      isLocked: true,
      containsItems: [],
      isExit
    };
    this.locks[lock.id] = lock;
    this.rooms[roomId].locks.push(lock.id);
    return lock;
  }

  generate(depth: number, maxRooms: number = 3) {
    const startRoom = this.createRoom("起始密室", "你醒來在一個陌生的密室中。四周昏暗，只有幾盞微弱的燈光。");
    const exitTemplate = exitTemplates[Math.floor(Math.random() * exitTemplates.length)];
    
    const numRooms = Math.min(maxRooms, Math.max(1, Math.floor(depth / 2)));
    const roomChain = [startRoom];
    for (let i = 1; i < numRooms; i++) {
      const newRoom = this.createRoom(`密室房間 ${i+1}`, `這是另一個房間，看起來同樣詭異。`);
      roomChain.push(newRoom);
    }

    const exitRoom = roomChain[roomChain.length - 1];
    const exitLock = this.createLock(exitTemplate, exitRoom.id, true);
    
    const doors: Lock[] = [];
    for (let i = 0; i < roomChain.length - 1; i++) {
      const fromRoom = roomChain[i];
      const toRoom = roomChain[i+1];
      const doorTemplate = this.getDoorTemplate();
      const doorLock = this.createLock(doorTemplate, fromRoom.id);
      doorLock.targetRoomId = toRoom.id;
      doorLock.name = `${doorLock.name} (通往 ${toRoom.name})`;
      doors.push(doorLock);

      const returnDoorLock = this.createLock({
        type: 'door',
        lockName: `通往 ${fromRoom.name} 的門`,
        lockDesc: `一扇通往 ${fromRoom.name} 的門，已經解開了。`,
        unlockDesc: `你打開了門。`
      }, toRoom.id);
      returnDoorLock.targetRoomId = fromRoom.id;
      returnDoorLock.isLocked = false;
    }

    this.generateDependencies(exitLock, depth, exitTemplate, exitRoom.id, roomChain);

    doors.forEach((door, index) => {
      this.generateDependencies(door, 1, this.availableDoorTemplates.find(t => t.lockName === door.name.split(' (')[0]) || doorTemplates[0], roomChain[index].id, roomChain.slice(0, index + 1));
    });

    return { rooms: this.rooms, items: this.items, locks: this.locks, startRoomId: startRoom.id };
  }

  generateDependencies(targetLock: Lock, currentDepth: number, template: LockTemplate, currentRoomId: string, availableRooms: Room[]) {
    const requiredItemIds: string[] = [];

    if (template.type === 'physical' || (template.type === 'door' && template.keyNames)) {
      const keyName = this.getUniqueName(template.keyNames![0], this.usedItemNames);
      const keyItem = this.createItem(keyName, 'key');
      requiredItemIds.push(keyItem.id);
    } else if (template.type === 'hidden') {
      const toolName = template.keyNames![0];
      let toolId = this.reusableTools.get(toolName);
      if (!toolId) {
        const toolItem = this.createItem(toolName, 'tool');
        toolId = toolItem.id;
        this.reusableTools.set(toolName, toolId);
      }
      requiredItemIds.push(toolId);
    } else if (template.type === 'password' || (template.type === 'door' && template.clueName)) {
      const pwd = Math.floor(1000 + Math.random() * 9000).toString();
      targetLock.password = pwd;
      const clueName = this.getUniqueName(template.clueName!, this.usedItemNames);
      const clueItem = this.createItem(clueName, 'clue', `上面寫著密碼: ${pwd}`);
      requiredItemIds.push(clueItem.id);
    } else if (template.type === 'combination') {
      template.keyNames!.forEach(baseKeyName => {
        const keyName = this.getUniqueName(baseKeyName, this.usedItemNames);
        const keyItem = this.createItem(keyName, 'key');
        requiredItemIds.push(keyItem.id);
      });
    }

    targetLock.requiredItems = requiredItemIds;

    requiredItemIds.forEach(itemId => {
      if (this.hiddenItems.has(itemId)) return;
      this.hiddenItems.add(itemId);

      const hideRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)];

      if (currentDepth <= 1) {
        hideRoom.visibleItems.push(itemId);
      } else {
        const nextTemplate = this.getTemplate();
        const newLock = this.createLock(nextTemplate, hideRoom.id);
        newLock.containsItems.push(itemId);
        this.generateDependencies(newLock, currentDepth - 1, nextTemplate, hideRoom.id, availableRooms);
      }
    });
  }
}
