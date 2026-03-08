import type {
  GeneratorConfig,
  PuzzleDefinition,
  Room,
  Item,
  Lock,
  RoomId,
  ItemId,
  LockId,
  FamilyVariation,
  LockTemplate,
} from './types';
import { ROOM_THEMES, ADJECTIVES } from './families';
import { LOCK_TEMPLATES, findKeyTemplate } from './templates';
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
  availableLocks: LockTemplate[];
  reusableItemCache: Record<string, ItemId> = {};
  consumableCount: Record<string, number> = {};
  usedItemNames = new Set<string>();
  usedLockNames = new Set<string>();
  passwordPool = new PasswordFormatPool();
  lockCount = 0;

  constructor(maxRooms: number) {
    this.availableThemes = shuffle(ROOM_THEMES).slice(0, maxRooms);
    this.availableLocks = shuffle([...LOCK_TEMPLATES]);
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
  getOrCreateReusableItem(name: string): ItemId {
    const cached = this.reusableItemCache[name];
    if (cached) return cached;
    const item = this.createItem(name, true);
    this.reusableItemCache[name] = item.id;
    return item.id;
  }

  /** 建立消耗型道具（自動處理名稱衝突） */
  createConsumableItem(name: string): Item {
    this.consumableCount[name] = (this.consumableCount[name] ?? 0) + 1;
    let keyName = name;
    if (this.consumableCount[name]! > 1) {
      keyName = `${name} (${String.fromCharCode(64 + this.consumableCount[name]!)})`;
    }
    return this.createItem(keyName, false);
  }

  /** 從模板池中選擇匹配的鎖模板 */
  selectLock(trySpatial: boolean, tryComposite: boolean): LockTemplate {
    if (this.availableLocks.length === 0) {
      this.availableLocks = shuffle([...LOCK_TEMPLATES]);
    }

    const targetCategory = trySpatial ? 'spatial' : 'container';

    // 優先匹配：類別 + 組合性
    let index = this.availableLocks.findIndex(
      l => l.category === targetCategory
        && (tryComposite ? l.requiredKeys.length > 1 : l.requiredKeys.length === 1),
    );

    // 退而求其次：只匹配類別
    if (index === -1) {
      index = this.availableLocks.findIndex(l => l.category === targetCategory);
    }

    // 最終回退
    if (index === -1) index = 0;

    const template = this.availableLocks[index]!;
    this.availableLocks.splice(index, 1);
    return template;
  }
}

// ─── 建立鑰匙並推入佇列的共用邏輯 ───

function enqueueKeysForLock(
  ctx: GeneratorContext,
  lockId: LockId,
  lockTemplate: LockTemplate,
  target: GenerationTarget,
  config: GeneratorConfig,
  queue: GenerationTarget[],
): void {
  const lock = ctx.locks[lockId]!;
  lock.mechanism = lockTemplate.mechanism;

  const isPasswordLock = lockTemplate.mechanism === 'password';
  if (isPasswordLock) {
    const fmt = ctx.passwordPool.next();
    lock.password = fmt.password;
    lock.passwordHint = fmt.hint;
    lock.lockedDescription += `\n（${fmt.formatDesc}）`;
  }

  lockTemplate.requiredKeys.forEach((keyTemplateId, index) => {
    const keyTpl = findKeyTemplate(keyTemplateId)!;
    let keyId: ItemId;

    if (keyTpl.reusable) {
      keyId = ctx.getOrCreateReusableItem(keyTpl.name);
    } else {
      const item = ctx.createConsumableItem(keyTpl.name);
      keyId = item.id;

      // 密碼鎖：將密碼寫入線索物品描述（含格式提示）
      if (isPasswordLock && lock.password) {
        item.type = 'clue';
        item.description = `上面寫著：「${lock.password}」（${lock.passwordHint ?? '密碼'}）── 對應 ${lock.name}`;
      }
    }

    lock.requiredItems.push(keyId);

    // 已快取的可重複道具不需要再次生成
    if (keyTpl.reusable && ctx.reusableItemCache[keyTpl.name] === keyId && ctx.items[keyId]!.initialRoom !== '') {
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
  const startRoomId = exitRoom.id;

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

    const lockLimitReached = config.maxLocks != null && ctx.lockCount >= config.maxLocks;
    if (target.depth < config.targetDepth && !lockLimitReached) {
      const trySpatial = ctx.availableThemes.length > 0
        && (target.forceSpatial || Math.random() < config.roomGrowthRate);
      const tryComposite = Math.random() < config.compositeRate;

      const lockTemplate = ctx.selectLock(trySpatial, tryComposite);
      const variation = lockTemplate.variations[Math.floor(Math.random() * lockTemplate.variations.length)]!;

      if (lockTemplate.category === 'spatial' && ctx.availableThemes.length > 0) {
        // ═══ 空間鎖：生長新房間 ═══
        const theme = ctx.availableThemes.pop()!;
        const newRoom = ctx.createRoom(theme.name, theme.description);

        const pathLock = ctx.createLock(variation, true, target.currentRoom);
        ctx.lockCount++;
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

        enqueueKeysForLock(ctx, pathLock.id, lockTemplate, target, config, queue);

        // 空間鎖的目標物品直接結算
        finalBaseItems.push({ itemId: target.itemId, roomId: newRoom.id });

      } else {
        // ═══ 容器鎖：在當前房間建立鎖 ═══
        const containerLock = ctx.createLock(variation, false, target.currentRoom);
        ctx.lockCount++;
        containerLock.containsItems.push(target.itemId);

        ctx.items[target.itemId]!.initialRoom = target.currentRoom;

        ctx.rooms[target.currentRoom]!.lockIds.push(containerLock.id);

        enqueueKeysForLock(ctx, containerLock.id, lockTemplate, target, config, queue);
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
