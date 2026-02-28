import type {
  GeneratorConfig,
  PuzzleDefinition,
  Room,
  Item,
  Lock,
  RoomId,
  ItemId,
  LockId,
  PuzzleFamily,
  FamilyVariation,
  KeyDefinition,
} from './types';
import { ROOM_THEMES, ADJECTIVES, ALL_FAMILIES } from './families';
import { shuffle, getUniqueName, PasswordFormatPool, generateId, resetIdCounter } from './utils';

// ─── BFS 佇列項目 ───

interface GenerationTarget {
  itemId: ItemId;
  itemName: string;
  currentRoom: RoomId;
  depth: number;
  forceSpatial: boolean;
}

// ─── 生成器內部狀態 ───

class GeneratorContext {
  rooms: Record<RoomId, Room> = {};
  items: Record<ItemId, Item> = {};
  locks: Record<LockId, Lock> = {};

  availableThemes: { name: string; description: string }[];
  availableFamilies: PuzzleFamily[];
  reusableItemCache: Record<string, ItemId> = {};
  consumableCount: Record<string, number> = {};
  usedItemNames = new Set<string>();
  usedLockNames = new Set<string>();
  passwordPool = new PasswordFormatPool();

  constructor(maxRooms: number) {
    this.availableThemes = shuffle(ROOM_THEMES).slice(0, maxRooms);
    this.availableFamilies = shuffle(ALL_FAMILIES);
  }

  createRoom(name: string, description: string): Room {
    const room: Room = {
      id: generateId('r'),
      name,
      description,
      lockIds: [],
      visibleItems: [],
    };
    this.rooms[room.id] = room;
    return room;
  }

  createItem(name: string, reusable: boolean, description?: string): Item {
    const item: Item = {
      id: generateId('item'),
      name,
      description: description ?? `散發著微光的物品，可以用來處理特定的機關。`,
      type: reusable ? 'tool' : 'key',
      reusable,
      initialRoom: '',
    };
    this.items[item.id] = item;
    return item;
  }

  createLock(
    variation: FamilyVariation,
    isSpatial: boolean,
    roomId: RoomId,
    isExit: boolean = false,
  ): Lock {
    const lockName = getUniqueName(variation.name, this.usedLockNames, ADJECTIVES);
    const lock: Lock = {
      id: generateId('lock'),
      name: lockName,
      description: variation.lockMsg,
      lockedDescription: variation.lockMsg,
      unlockDescription: variation.unlockMsg,
      partialDescription: variation.partialMsg ?? '這似乎是對的，但機關還沒有完全解開。',
      category: isSpatial ? 'spatial' : 'container',
      mechanism: 'physical',
      roomId,
      requiredItems: [],
      insertedItems: [],
      containsItems: [],
      isLocked: true,
      isExit,
    };
    this.locks[lock.id] = lock;
    return lock;
  }

  /** 取得或建立可重複使用的道具 */
  getOrCreateReusableItem(keyDef: KeyDefinition): ItemId {
    const cached = this.reusableItemCache[keyDef.name];
    if (cached) return cached;
    const item = this.createItem(keyDef.name, true);
    this.reusableItemCache[keyDef.name] = item.id;
    return item.id;
  }

  /** 建立消耗型道具（自動處理名稱衝突） */
  createConsumableItem(keyDef: KeyDefinition): Item {
    this.consumableCount[keyDef.name] = (this.consumableCount[keyDef.name] ?? 0) + 1;
    let keyName = keyDef.name;
    if (this.consumableCount[keyDef.name]! > 1) {
      keyName = `${keyDef.name} (${String.fromCharCode(64 + this.consumableCount[keyDef.name]!)})`;
    }
    return this.createItem(keyName, false);
  }

  /** 從家族池中選擇匹配的家族 */
  selectFamily(trySpatial: boolean, tryComposite: boolean): PuzzleFamily {
    if (this.availableFamilies.length === 0) {
      this.availableFamilies = shuffle(ALL_FAMILIES);
    }

    // 優先匹配：空間性 + 組合性
    let index = this.availableFamilies.findIndex(
      f => f.isSpatial === trySpatial && (tryComposite ? f.keys.length > 1 : f.keys.length === 1),
    );

    // 退而求其次：只匹配空間性
    if (index === -1) {
      index = this.availableFamilies.findIndex(f => f.isSpatial === trySpatial);
    }

    // 最終回退
    if (index === -1) index = 0;

    const family = this.availableFamilies[index]!;
    this.availableFamilies.splice(index, 1);
    return family;
  }
}

// ─── 建立鑰匙並推入佇列的共用邏輯 ───

function enqueueKeysForLock(
  ctx: GeneratorContext,
  lockId: LockId,
  family: PuzzleFamily,
  target: GenerationTarget,
  config: GeneratorConfig,
  queue: GenerationTarget[],
): void {
  const lock = ctx.locks[lockId]!;

  // 判斷鎖機制：含有密碼紙條的家族視為 password 機制
  const isPasswordFamily = family.keys.some(k => k.name.includes('密碼'));
  if (isPasswordFamily) {
    lock.mechanism = 'password';
    const fmt = ctx.passwordPool.next();
    lock.password = fmt.password;
    lock.passwordHint = fmt.hint;
    lock.lockedDescription += `\n（${fmt.formatDesc}）`;
  }

  if (family.keys.length > 1) {
    lock.mechanism = 'combination';
  }

  // 含有可重複使用工具的單鑰匙家族視為 hidden 機制
  if (family.keys.length === 1 && family.keys[0]!.reusable) {
    lock.mechanism = 'hidden';
  }

  family.keys.forEach((keyDef, index) => {
    let keyId: ItemId;

    if (keyDef.reusable) {
      keyId = ctx.getOrCreateReusableItem(keyDef);
    } else {
      const item = ctx.createConsumableItem(keyDef);
      keyId = item.id;

      // 密碼家族：將密碼寫入線索物品描述（含格式提示）
      if (isPasswordFamily && lock.password) {
        item.type = 'clue';
        item.description = `上面寫著：「${lock.password}」（${lock.passwordHint ?? '密碼'}）── 對應 ${lock.name}`;
      }
    }

    lock.requiredItems.push(keyId);

    // 已快取的可重複道具不需要再次生成
    if (keyDef.reusable && ctx.reusableItemCache[keyDef.name] === keyId && ctx.items[keyId]!.initialRoom !== '') {
      return;
    }

    const staggerAmount = index > 0 ? Math.random() * config.depthStaggerVariance : 0;
    const nextDepth = target.depth + 1 - staggerAmount;

    queue.push({
      itemId: keyId,
      itemName: ctx.items[keyId]!.name,
      currentRoom: target.currentRoom,
      depth: nextDepth,
      forceSpatial: index > 0 && Math.random() < config.keySpatialSplitRate,
    });
  });
}

// ─── 主生成函式 ───

export function generatePuzzle(config: GeneratorConfig): PuzzleDefinition {
  resetIdCounter();
  const ctx = new GeneratorContext(config.maxRooms);

  // 建立出口房間
  const exitTheme = ctx.availableThemes.pop() ?? { name: '最終出口', description: '這裡連接了外面的世界。' };
  const exitRoom = ctx.createRoom(exitTheme.name, exitTheme.description);
  let startRoomId = exitRoom.id;

  // 建立出口鎖
  const exitLock = ctx.createLock(
    {
      name: '逃生大門',
      lockMsg: '鎖著厚重鐵鍊與精密電子鎖的裝甲門，是逃離這裡的唯一出口。',
      unlockMsg: '大門發出洩壓的巨大聲響，刺眼的陽光灑落，你重獲自由了！',
    },
    false,
    exitRoom.id,
    true,
  );
  exitRoom.lockIds.push(exitLock.id);

  // 建立出口鑰匙
  const exitKey = ctx.createItem('終極逃生卡', false, '帶有最高權限的特殊磁卡。');
  exitLock.requiredItems.push(exitKey.id);

  // BFS 佇列
  const queue: GenerationTarget[] = [{
    itemId: exitKey.id,
    itemName: exitKey.name,
    currentRoom: exitRoom.id,
    depth: 0,
    forceSpatial: false,
  }];

  const finalBaseItems: { itemId: ItemId; roomId: RoomId }[] = [];

  while (queue.length > 0) {
    const target = queue.shift()!;

    if (target.depth < config.targetDepth) {
      const trySpatial = ctx.availableThemes.length > 0
        && (target.forceSpatial || Math.random() < config.roomGrowthRate);
      const tryComposite = Math.random() < config.compositeRate;

      const family = ctx.selectFamily(trySpatial, tryComposite);
      const variation = family.variations[Math.floor(Math.random() * family.variations.length)]!;

      if (family.isSpatial && ctx.availableThemes.length > 0) {
        // ═══ 空間鎖：生長新房間 ═══
        const theme = ctx.availableThemes.pop()!;
        const newRoom = ctx.createRoom(theme.name, theme.description);

        const pathLock = ctx.createLock(variation, true, target.currentRoom);
        pathLock.targetRoomId = newRoom.id;
        pathLock.containsItems.push(target.itemId);

        // 空間鎖隱藏的道具在生成時直接放入目標房間
        ctx.items[target.itemId]!.initialRoom = newRoom.id;

        // 建立返回門
        const backLock = ctx.createLock(
          { name: `返回：${ctx.rooms[target.currentRoom]!.name}`, lockMsg: '一扇已開啟的門。', unlockMsg: '' },
          true,
          newRoom.id,
        );
        backLock.targetRoomId = target.currentRoom;
        backLock.isLocked = false;

        // 註冊到房間
        ctx.rooms[target.currentRoom]!.lockIds.push(pathLock.id);
        newRoom.lockIds.push(backLock.id);

        // 起始房間始終是出口房間（玩家從出口開始，往回探索）
        // 不可將 startRoomId 設為空間鎖的目標房間，否則玩家會繞過空間鎖

        enqueueKeysForLock(ctx, pathLock.id, family, target, config, queue);

        // 空間鎖的目標物品直接結算
        finalBaseItems.push({ itemId: target.itemId, roomId: newRoom.id });

      } else {
        // ═══ 容器鎖：在當前房間建立鎖 ═══
        const containerLock = ctx.createLock(variation, false, target.currentRoom);
        containerLock.containsItems.push(target.itemId);

        ctx.items[target.itemId]!.initialRoom = target.currentRoom;

        ctx.rooms[target.currentRoom]!.lockIds.push(containerLock.id);

        enqueueKeysForLock(ctx, containerLock.id, family, target, config, queue);
      }
    } else {
      // ═══ 基底情況：物品直接放在地板上 ═══
      ctx.items[target.itemId]!.initialRoom = target.currentRoom;
      finalBaseItems.push({ itemId: target.itemId, roomId: target.currentRoom });
    }
  }

  // 將所有基底物品放入房間的 visibleItems
  for (const { itemId, roomId } of finalBaseItems) {
    const room = ctx.rooms[roomId];
    if (room && !room.visibleItems.includes(itemId)) {
      room.visibleItems.push(itemId);
    }
  }

  return {
    rooms: ctx.rooms,
    items: ctx.items,
    locks: ctx.locks,
    startRoomId,
    exitLockId: exitLock.id,
  };
}
