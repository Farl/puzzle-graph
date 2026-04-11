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
import { KEY_TEMPLATES, LOCK_TEMPLATES, findKeyTemplate } from './templates';
import { shuffle, getUniqueName, PasswordFormatPool, generateId, resetIdCounter } from './utils';

// ─── Phase B BFS 佇列項目 ───

interface PhaseBTarget {
  itemId: ItemId;
  currentRoom: RoomId;
  currentRoomIndex: number;
  depth: number;
  criticalRoomIndex: number;
}

// ─── Phase A 輸出 ───

interface SkeletonResult {
  ctx: GeneratorContext;
  roomIds: RoomId[];
  startRoomId: RoomId;
  exitLockId: LockId;
  floorItems: PhaseBTarget[];
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
  tagUsageCount: Record<string, number> = {};
  lastSelectedTags: string[] = [];
  toolReuseCount: Record<ItemId, number> = {};

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
  selectLock(trySpatial: boolean, tryComposite: boolean, config: GeneratorConfig): LockTemplate {
    // ── 復用路徑：嘗試用已有的 reusable tool 開新鎖 ──
    if (config.reuseRate != null && config.reuseRate > 0 && Math.random() < config.reuseRate) {
      const reuseLock = this.tryReusePath(trySpatial, config);
      if (reuseLock) return reuseLock;
    }

    if (this.availableLocks.length === 0) {
      this.availableLocks = shuffle([...LOCK_TEMPLATES]);
    }

    const targetCategory = trySpatial ? 'spatial' : 'container';

    // 收集候選（匹配 category + composite 條件）
    let candidates = this.availableLocks.filter(
      l => l.category === targetCategory
        && (tryComposite ? l.requiredKeys.length > 1 : l.requiredKeys.length === 1),
    );
    if (candidates.length === 0) {
      candidates = this.availableLocks.filter(l => l.category === targetCategory);
    }
    if (candidates.length === 0) {
      candidates = [...this.availableLocks];
    }

    // 加權抽選
    const selected = this.weightedSelect(candidates, config);

    // 從池中移除
    const idx = this.availableLocks.indexOf(selected);
    if (idx !== -1) this.availableLocks.splice(idx, 1);

    // 更新 tag 追蹤
    for (const tag of selected.tags) {
      this.tagUsageCount[tag] = (this.tagUsageCount[tag] ?? 0) + 1;
    }
    this.lastSelectedTags = selected.tags;

    return selected;
  }

  /** 嘗試復用已有的 reusable tool 來選擇相容的鎖 */
  private tryReusePath(trySpatial: boolean, config: GeneratorConfig): LockTemplate | null {
    const maxReuses = config.maxReusesPerTool ?? Infinity;
    const targetCategory = trySpatial ? 'spatial' : 'container';

    // 收集可復用的 tool（已建立、未達上限）
    const reusableToolNames = Object.entries(this.reusableItemCache)
      .filter(([_, itemId]) => (this.toolReuseCount[itemId] ?? 0) < maxReuses)
      .map(([name, _]) => name);

    if (reusableToolNames.length === 0) return null;

    // 隨機選一個 tool
    const toolName = reusableToolNames[Math.floor(Math.random() * reusableToolNames.length)]!;

    // 找到對應的 KeyTemplate id
    const keyTpl = KEY_TEMPLATES.find(k => k.name === toolName && k.reusable);
    if (!keyTpl) return null;

    // 找到相容且符合 category 的 LockTemplate
    const compatibleLocks = LOCK_TEMPLATES.filter(
      l => l.category === targetCategory && l.requiredKeys.includes(keyTpl.id),
    );

    if (compatibleLocks.length === 0) return null;

    const selected = compatibleLocks[Math.floor(Math.random() * compatibleLocks.length)]!;

    // 從 availableLocks 移除（如果還在裡面）
    const idx = this.availableLocks.indexOf(selected);
    if (idx !== -1) this.availableLocks.splice(idx, 1);

    // 更新 tag 追蹤
    for (const tag of selected.tags) {
      this.tagUsageCount[tag] = (this.tagUsageCount[tag] ?? 0) + 1;
    }
    this.lastSelectedTags = selected.tags;

    return selected;
  }

  /** 根據 tagDiversityMode 加權抽選候選鎖 */
  private weightedSelect(candidates: LockTemplate[], config: GeneratorConfig): LockTemplate {
    const mode = config.tagDiversityMode;

    if (!mode || candidates.length <= 1) {
      return candidates[Math.floor(Math.random() * candidates.length)]!;
    }

    const weights = candidates.map(c => {
      let w = 1.0;

      if (mode === 'balanced') {
        const minUsage = Math.min(...c.tags.map(t => this.tagUsageCount[t] ?? 0));
        w = 1.0 / (1 + minUsage);
      } else if (mode === 'weighted' && config.tagWeights) {
        const tagW = c.tags.reduce((sum, t) => sum + (config.tagWeights![t] ?? 1.0), 0);
        w = tagW / c.tags.length;
      } else if (mode === 'no-repeat') {
        const overlap = c.tags.filter(t => this.lastSelectedTags.includes(t)).length;
        w = 1.0 / (1 + overlap * 2);
      }

      return Math.max(w, 0.01);
    });

    // 加權隨機抽選
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalWeight;
    for (let i = 0; i < candidates.length; i++) {
      r -= weights[i]!;
      if (r <= 0) return candidates[i]!;
    }
    return candidates[candidates.length - 1]!;
  }
}

// ─── 工具函式 ───

function pickRoom(eligible: RoomId[], preferredIdx: number, spreadRate: number): RoomId {
  if (eligible.length === 0) return '';
  if (eligible.length === 1) return eligible[0]!;
  const clampedIdx = Math.min(Math.max(preferredIdx, 0), eligible.length - 1);
  if (spreadRate <= 0 || Math.random() > spreadRate) {
    return eligible[clampedIdx]!;
  }
  return eligible[Math.floor(Math.random() * eligible.length)]!;
}

// ─── 建立鑰匙並推入佇列的共用邏輯（Phase B 用） ───

function enqueueKeysForLock(
  ctx: GeneratorContext,
  lockId: LockId,
  lockTemplate: LockTemplate,
  target: PhaseBTarget,
  config: GeneratorConfig,
  roomIds: RoomId[],
  queue: PhaseBTarget[],
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

  const crossRoomRate = config.crossRoomRate ?? 0;

  lockTemplate.requiredKeys.forEach((keyTemplateId, index) => {
    const keyTpl = findKeyTemplate(keyTemplateId)!;
    let keyId: ItemId;

    if (keyTpl.reusable) {
      keyId = ctx.getOrCreateReusableItem(keyTpl.name);
    } else {
      const item = ctx.createConsumableItem(keyTpl.name);
      keyId = item.id;

      if (isPasswordLock && lock.password) {
        item.type = 'clue';
        item.description = `上面寫著：「${lock.password}」（${lock.passwordHint ?? '密碼'}）── 對應 ${lock.name}`;
      }
    }

    lock.requiredItems.push(keyId);

    if (keyTpl.reusable) {
      ctx.toolReuseCount[keyId] = (ctx.toolReuseCount[keyId] ?? 0) + 1;
    }

    if (keyTpl.reusable && ctx.reusableItemCache[keyTpl.name] === keyId && ctx.items[keyId]!.initialRoom !== '') {
      return;
    }

    const maxIdx = Math.min(target.criticalRoomIndex - 1, roomIds.length - 1);
    const eligible = roomIds.slice(0, maxIdx + 1);
    const preferredIdx = eligible.indexOf(target.currentRoom);

    const keyRoomId = pickRoom(eligible, preferredIdx >= 0 ? preferredIdx : eligible.length - 1, crossRoomRate);
    const keyRoomIndex = roomIds.indexOf(keyRoomId);

    ctx.items[keyId]!.initialRoom = keyRoomId;
    ctx.rooms[keyRoomId]!.visibleItems.push(keyId);

    const staggerAmount = index > 0 ? Math.random() * config.depthStaggerVariance : 0;
    const nextDepth = target.depth + 1 - staggerAmount;

    queue.push({
      itemId: keyId,
      currentRoom: keyRoomId,
      currentRoomIndex: keyRoomIndex,
      depth: nextDepth,
      criticalRoomIndex: target.criticalRoomIndex,
    });
  });
}

// ─── Phase A：建立房間骨架 ───

export function generateRoomSkeleton(config: GeneratorConfig): SkeletonResult {
  const ctx = new GeneratorContext(config.maxRooms);
  const floorItems: PhaseBTarget[] = [];
  const roomIds: RoomId[] = [];

  const keySpreadRate = config.keySpreadRate ?? 0.5;

  // 建立所有房間
  for (let i = 0; i < config.maxRooms; i++) {
    const theme = ctx.availableThemes.pop() ?? { name: `房間 ${i + 1}`, description: '一個房間。' };
    const room = ctx.createRoom(theme.name, theme.description);
    roomIds.push(room.id);
  }

  const startRoomId = roomIds[0]!;
  const exitRoomId = roomIds[roomIds.length - 1]!;

  // 建立 N-1 道門鎖（連接相鄰房間）
  for (let i = 0; i < config.maxRooms - 1; i++) {
    const fromRoomId = roomIds[i]!;
    const toRoomId = roomIds[i + 1]!;

    const lockTemplate = ctx.selectLock(true, false, config);
    const variation = lockTemplate.variations[Math.floor(Math.random() * lockTemplate.variations.length)]!;

    const doorLock = ctx.createLock(variation, true, fromRoomId);
    doorLock.targetRoomId = toRoomId;
    ctx.rooms[fromRoomId]!.lockIds.push(doorLock.id);

    // 選擇此門的鑰匙模板並建立鑰匙
    const keyTemplateId = lockTemplate.requiredKeys[0]!;
    const keyTpl = findKeyTemplate(keyTemplateId)!;
    let keyId: ItemId;
    if (keyTpl.reusable) {
      keyId = ctx.getOrCreateReusableItem(keyTpl.name);
    } else {
      keyId = ctx.createConsumableItem(keyTpl.name).id;
    }
    doorLock.requiredItems.push(keyId);

    // 根據 keySpreadRate 決定鑰匙放置的房間
    const eligible = roomIds.slice(0, i + 1);
    const keyRoomId = pickRoom(eligible, eligible.length - 1, keySpreadRate);
    ctx.items[keyId]!.initialRoom = keyRoomId;
    ctx.rooms[keyRoomId]!.visibleItems.push(keyId);

    floorItems.push({
      itemId: keyId,
      currentRoom: keyRoomId,
      currentRoomIndex: roomIds.indexOf(keyRoomId),
      depth: 0,
      criticalRoomIndex: i + 1,
    });
  }

  // 建立出口鎖（spatial，在最後一個房間）
  const exitLock = ctx.createLock(
    {
      name: '逃生大門',
      lockMsg: '鎖著厚重鐵鍊與精密電子鎖的裝甲門，是逃離這裡的唯一出口。',
      unlockMsg: '大門發出洩壓的巨大聲響，刺眼的陽光灑落，你重獲自由了！',
    },
    true,   // isSpatial=true，讓出口鎖計入 spatial 類別（N-1 門 + 1 出口 = N 個 spatial 鎖）
    exitRoomId,
    true,   // isExit=true
  );
  ctx.rooms[exitRoomId]!.lockIds.push(exitLock.id);

  // 建立出口鑰匙
  const exitKey = ctx.createItem('終極逃生卡', false, '帶有最高權限的特殊磁卡。');
  exitLock.requiredItems.push(exitKey.id);

  const exitKeyRoom = pickRoom(roomIds, roomIds.length - 1, keySpreadRate);
  exitKey.initialRoom = exitKeyRoom;
  ctx.rooms[exitKeyRoom]!.visibleItems.push(exitKey.id);

  floorItems.push({
    itemId: exitKey.id,
    currentRoom: exitKeyRoom,
    currentRoomIndex: roomIds.indexOf(exitKeyRoom),
    depth: 0,
    criticalRoomIndex: roomIds.length,
  });

  return { ctx, roomIds, startRoomId, exitLockId: exitLock.id, floorItems };
}

// ─── 主生成函式（Phase B stub） ───

export function generatePuzzle(config: GeneratorConfig): PuzzleDefinition {
  resetIdCounter();

  const { ctx, roomIds: _roomIds, startRoomId, exitLockId, floorItems: _floorItems } = generateRoomSkeleton(config);

  // Phase B stub: items stay on floor (Phase B implemented in next task)
  // floorItems are already placed in visibleItems by generateRoomSkeleton

  return {
    rooms: ctx.rooms,
    items: ctx.items,
    locks: ctx.locks,
    startRoomId,
    exitLockId,
  };
}
