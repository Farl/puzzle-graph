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
import { SeededRandom, shuffle, getUniqueName, PasswordFormatPool, generateId, resetIdCounter } from './utils';
import { generateMinigameConfig } from './minigames';

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

  rng: SeededRandom;
  availableThemes: { name: string; description: string; capacity: number }[];
  availableLocks: LockTemplate[];
  reusableItemCache: Record<string, ItemId> = {};
  consumableCount: Record<string, number> = {};
  usedItemNames = new Set<string>();
  usedLockNames = new Set<string>();
  passwordPool: PasswordFormatPool;
  lockCount = 0;
  tagUsageCount: Record<string, number> = {};
  lastSelectedTags: string[] = [];
  toolReuseCount: Record<ItemId, number> = {};

  constructor(maxRooms: number, rng: SeededRandom) {
    this.rng = rng;
    this.passwordPool = new PasswordFormatPool(rng);
    this.availableThemes = shuffle(ROOM_THEMES, rng).slice(0, maxRooms);
    this.availableLocks = shuffle([...LOCK_TEMPLATES], rng);
  }

  createRoom(name: string, description: string, capacity: number): Room {
    const room: Room = {
      id: generateId('r'),
      name,
      description,
      lockIds: [],
      visibleItems: [],
      capacity,
    };
    this.rooms[room.id] = room;
    return room;
  }

  createItem(name: string, reusable: boolean, volume: number, description?: string, pickupable: boolean = true): Item {
    const item: Item = {
      id: generateId('item'),
      name,
      description: description ?? `散發著微光的物品，可以用來處理特定的機關。`,
      type: reusable ? 'tool' : 'key',
      reusable,
      initialRoom: '',
      volume,
      pickupable,
    };
    this.items[item.id] = item;
    return item;
  }

  createLock(
    variation: FamilyVariation,
    isSpatial: boolean,
    roomId: RoomId,
    isExit: boolean = false,
    capacity: number = 0,
    volume: number = 0,
    pickupable: boolean = false,
  ): Lock {
    const lockName = getUniqueName(variation.name, this.usedLockNames, ADJECTIVES, this.rng);
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
      contents: [],
      capacity,
      volume,
      pickupable,
      isLocked: true,
      isExit,
    };
    this.locks[lock.id] = lock;
    return lock;
  }

  /** 取得或建立可重複使用的道具 */
  getOrCreateReusableItem(name: string, volume: number, pickupable: boolean = true): ItemId {
    const cached = this.reusableItemCache[name];
    if (cached) return cached;
    const item = this.createItem(name, true, volume, undefined, pickupable);
    this.reusableItemCache[name] = item.id;
    return item.id;
  }

  /** 建立消耗型道具（自動處理名稱衝突） */
  createConsumableItem(name: string, volume: number, pickupable: boolean = true): Item {
    this.consumableCount[name] = (this.consumableCount[name] ?? 0) + 1;
    let keyName = name;
    if (this.consumableCount[name]! > 1) {
      keyName = `${name} (${String.fromCharCode(64 + this.consumableCount[name]!)})`;
    }
    return this.createItem(keyName, false, volume, undefined, pickupable);
  }

  /** 確認選取：從池中移除模板並更新 tag 追蹤 */
  private commitSelection(selected: LockTemplate): void {
    const idx = this.availableLocks.indexOf(selected);
    if (idx !== -1) this.availableLocks.splice(idx, 1);
    for (const tag of selected.tags) {
      this.tagUsageCount[tag] = (this.tagUsageCount[tag] ?? 0) + 1;
    }
    this.lastSelectedTags = selected.tags;
  }

  /** 從模板池中選擇匹配的鎖模板 */
  selectLock(trySpatial: boolean, tryComposite: boolean, config: GeneratorConfig, lockedItems?: Set<ItemId>): LockTemplate {
    // ── 復用路徑：嘗試用已有的 reusable tool 開新鎖 ──
    if (config.reuseRate != null && config.reuseRate > 0 && this.rng.next() < config.reuseRate) {
      const reuseLock = this.tryReusePath(trySpatial, config, lockedItems);
      if (reuseLock) return reuseLock;
    }

    if (this.availableLocks.length === 0) {
      this.availableLocks = shuffle([...LOCK_TEMPLATES], this.rng);
    }

    const targetCategory = trySpatial ? 'spatial' : 'container';

    // pickupable lock 有特殊用途（轉換/合成），不參與通用容器選擇
    let candidates = this.availableLocks.filter(
      l => l.category === targetCategory && !l.pickupable
        && (tryComposite ? l.requiredKeys.length > 1 : l.requiredKeys.length === 1),
    );
    if (candidates.length === 0) {
      candidates = this.availableLocks.filter(
        l => l.category === targetCategory && !l.pickupable,
      );
    }
    if (candidates.length === 0) {
      candidates = [...this.availableLocks];
    }

    const selected = this.weightedSelect(candidates, config);
    this.commitSelection(selected);
    return selected;
  }

  /** 嘗試復用已有的 reusable tool 來選擇相容的鎖 */
  private tryReusePath(trySpatial: boolean, config: GeneratorConfig, lockedItems?: Set<ItemId>): LockTemplate | null {
    const maxReuses = config.maxReusesPerTool ?? Infinity;
    const targetCategory = trySpatial ? 'spatial' : 'container';

    const reusableToolNames = Object.entries(this.reusableItemCache)
      .filter(([_, itemId]) => {
        if ((this.toolReuseCount[itemId] ?? 0) >= maxReuses) return false;
        if (lockedItems?.has(itemId)) return false;
        return true;
      })
      .map(([name, _]) => name);

    if (reusableToolNames.length === 0) return null;

    const toolName = reusableToolNames[this.rng.nextInt(reusableToolNames.length)]!;
    const keyTpl = KEY_TEMPLATES.find(k => k.name === toolName && k.reusable);
    if (!keyTpl) return null;

    const compatibleLocks = LOCK_TEMPLATES.filter(
      l => l.category === targetCategory && l.requiredKeys.includes(keyTpl.id)
        && !l.pickupable,
    );
    if (compatibleLocks.length === 0) return null;

    const selected = compatibleLocks[this.rng.nextInt(compatibleLocks.length)]!;
    this.commitSelection(selected);
    return selected;
  }

  /** 根據 tagDiversityMode 加權抽選候選鎖 */
  private weightedSelect(candidates: LockTemplate[], config: GeneratorConfig): LockTemplate {
    const mode = config.tagDiversityMode;

    if (!mode || candidates.length <= 1) {
      return candidates[this.rng.nextInt(candidates.length)]!;
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
    let r = this.rng.next() * totalWeight;
    for (let i = 0; i < candidates.length; i++) {
      r -= weights[i]!;
      if (r <= 0) return candidates[i]!;
    }
    return candidates[candidates.length - 1]!;
  }
}

// ─── 工具函式 ───

function pickRoom(eligible: RoomId[], preferredIdx: number, spreadRate: number, ctx: GeneratorContext): RoomId {
  if (eligible.length === 0) return '';
  if (eligible.length === 1) return eligible[0]!;
  const clampedIdx = Math.min(Math.max(preferredIdx, 0), eligible.length - 1);
  if (spreadRate <= 0 || ctx.rng.next() > spreadRate) {
    return eligible[clampedIdx]!;
  }
  return eligible[ctx.rng.nextInt(eligible.length)]!;
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

  if (lockTemplate.mechanism === 'minigame' && lockTemplate.minigameType) {
    lock.minigameConfig = generateMinigameConfig(lockTemplate.minigameType, ctx.rng);
  }

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
    const keyPickupable = keyTpl.pickupable !== false;
    let keyId: ItemId;

    if (keyTpl.reusable) {
      keyId = ctx.getOrCreateReusableItem(keyTpl.name, keyTpl.volume, keyPickupable);
    } else {
      const item = ctx.createConsumableItem(keyTpl.name, keyTpl.volume, keyPickupable);
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
      // 工具已被放置（在地板或佇列中）。若當前限制比工具的已知限制更嚴格，
      // 就更新工具在佇列中的 criticalRoomIndex（並視需要移動工具到合法房間）。
      // 這防止工具後來被包裹在容器鎖時，把它的鑰匙放在玩家無法在需要前取得的房間。
      const newCritical = target.criticalRoomIndex;
      for (const entry of queue) {
        if (entry.itemId === keyId && entry.criticalRoomIndex > newCritical) {
          entry.criticalRoomIndex = newCritical;
          const currentIdx = roomIds.indexOf(entry.currentRoom);
          if (currentIdx >= newCritical) {
            const newRoomIdx = Math.min(newCritical - 1, roomIds.length - 1);
            const newRoomId = roomIds[newRoomIdx]!;
            const oldRoom = ctx.rooms[entry.currentRoom];
            if (oldRoom) {
              const vIdx = oldRoom.visibleItems.indexOf(keyId);
              if (vIdx !== -1) oldRoom.visibleItems.splice(vIdx, 1);
            }
            ctx.items[keyId]!.initialRoom = newRoomId;
            ctx.rooms[newRoomId]!.visibleItems.push(keyId);
            entry.currentRoom = newRoomId;
            entry.currentRoomIndex = newRoomIdx;
          }
          break;
        }
      }
      return;
    }

    const maxIdx = Math.min(target.criticalRoomIndex - 1, roomIds.length - 1);
    const eligible = roomIds.slice(0, maxIdx + 1);
    const preferredIdx = eligible.indexOf(target.currentRoom);

    let keyRoomId: RoomId;
    if (!keyPickupable) {
      keyRoomId = target.currentRoom;
    } else {
      keyRoomId = pickRoom(eligible, preferredIdx >= 0 ? preferredIdx : eligible.length - 1, crossRoomRate, ctx);
    }
    const keyRoomIndex = roomIds.indexOf(keyRoomId);

    ctx.items[keyId]!.initialRoom = keyRoomId;
    ctx.rooms[keyRoomId]!.visibleItems.push(keyId);

    const staggerAmount = index > 0 ? ctx.rng.next() * config.depthStaggerVariance : 0;
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

export function generateRoomSkeleton(config: GeneratorConfig, rng: SeededRandom): SkeletonResult {
  const ctx = new GeneratorContext(config.maxRooms, rng);
  const floorItems: PhaseBTarget[] = [];
  const roomIds: RoomId[] = [];

  const keySpreadRate = config.keySpreadRate ?? 0.5;

  // 建立所有房間
  for (let i = 0; i < config.maxRooms; i++) {
    const theme = ctx.availableThemes.pop() ?? { name: `房間 ${i + 1}`, description: '一個房間。', capacity: 50 };
    const room = ctx.createRoom(theme.name, theme.description, theme.capacity);
    roomIds.push(room.id);
  }

  const startRoomId = roomIds[0]!;
  const exitRoomId = roomIds[roomIds.length - 1]!;

  // 建立 N-1 道門鎖（連接相鄰房間）
  for (let i = 0; i < config.maxRooms - 1; i++) {
    const fromRoomId = roomIds[i]!;
    const toRoomId = roomIds[i + 1]!;

    const lockTemplate = ctx.selectLock(true, false, config);
    const variation = lockTemplate.variations[ctx.rng.nextInt(lockTemplate.variations.length)]!;

    const doorLock = ctx.createLock(variation, true, fromRoomId, false, 0, 0);
    doorLock.targetRoomId = toRoomId;
    ctx.rooms[fromRoomId]!.lockIds.push(doorLock.id);

    // 選擇此門的鑰匙模板並建立鑰匙
    const keyTemplateId = lockTemplate.requiredKeys[0]!;
    const keyTpl = findKeyTemplate(keyTemplateId)!;
    const keyPickupable = keyTpl.pickupable !== false;
    let keyId: ItemId;
    if (keyTpl.reusable) {
      keyId = ctx.getOrCreateReusableItem(keyTpl.name, keyTpl.volume, keyPickupable);
    } else {
      keyId = ctx.createConsumableItem(keyTpl.name, keyTpl.volume, keyPickupable).id;
    }
    doorLock.requiredItems.push(keyId);

    // 根據 keySpreadRate 決定鑰匙放置的房間
    const eligible = roomIds.slice(0, i + 1);
    const keyRoomId = pickRoom(eligible, eligible.length - 1, keySpreadRate, ctx);
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
    0, 0,
  );
  ctx.rooms[exitRoomId]!.lockIds.push(exitLock.id);

  // 建立出口鑰匙
  const exitKey = ctx.createItem('終極逃生卡', false, 0.5, '帶有最高權限的特殊磁卡。', true);
  exitLock.requiredItems.push(exitKey.id);

  const exitKeyRoom = pickRoom(roomIds, roomIds.length - 1, keySpreadRate, ctx);
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

// ─── Phase B：謎題內容填充 ───

export function generatePuzzleContent(
  config: GeneratorConfig,
  ctx: GeneratorContext,
  roomIds: RoomId[],
  initialTargets: PhaseBTarget[],
): void {
  const queue: PhaseBTarget[] = [...initialTargets];
  // 追蹤目前被鎖在 container 內的物品，防止間接循環依賴
  const itemsInContainers = new Set<ItemId>();

  // Phase A 已把 item 放進 visibleItems，Phase B 會重新決定最終歸宿
  for (const target of initialTargets) {
    const room = ctx.rooms[target.currentRoom]!;
    const idx = room.visibleItems.indexOf(target.itemId);
    if (idx !== -1) room.visibleItems.splice(idx, 1);
  }

  while (queue.length > 0) {
    const target = queue.shift()!;

    // targetDepth 作為全域 container 鎖預算（控制整體解謎長度，而非單條鏈深度）
    const depthBudgetReached = ctx.lockCount >= config.targetDepth;
    const lockLimitReached = config.maxLocks != null && ctx.lockCount >= config.maxLocks;

    if (!depthBudgetReached && !lockLimitReached) {
      const eligibleRooms = new Set(roomIds.slice(0, target.criticalRoomIndex));

      // 嘗試多次選取合法模板（避免單次 canWrap 失敗就放棄）
      const MAX_WRAP_ATTEMPTS = 5;
      let wrapped = false;

      for (let attempt = 0; attempt < MAX_WRAP_ATTEMPTS; attempt++) {
        const tryComposite = ctx.rng.next() < config.compositeRate;
        const lockTemplate = ctx.selectLock(false, tryComposite, config, itemsInContainers);

        // 驗證鎖模板的 reusable tool 依賴是否合法
        // - 直接循環：模板需要的工具就是正在被包裹的物品本身
        // - 空間錯誤：工具已放在 criticalRoomIndex 範圍外
        // - 間接循環：stationary tool 被鎖在容器內
        const canWrap = lockTemplate.requiredKeys.every(keyTplId => {
          const keyTpl = findKeyTemplate(keyTplId)!;
          if (!keyTpl.reusable) return true;
          if (ctx.reusableItemCache[keyTpl.name] === target.itemId) return false;
          const existingId = ctx.reusableItemCache[keyTpl.name];
          if (!existingId) return true;
          // 已鎖住的 reusable tool 不能作為鑰匙（防間接循環）
          if (itemsInContainers.has(existingId)) return false;
          const placedRoom = ctx.items[existingId]!.initialRoom;
          if (!placedRoom) return true;
          if (keyTpl.pickupable === false && placedRoom !== target.currentRoom) return false;
          return eligibleRooms.has(placedRoom);
        });

        if (canWrap) {
          const variation = lockTemplate.variations[ctx.rng.nextInt(lockTemplate.variations.length)]!;
          const lockPickupable = lockTemplate.pickupable === true;
          const containerLock = ctx.createLock(variation, false, target.currentRoom, false, lockTemplate.capacity, lockTemplate.volume, lockPickupable);
          ctx.lockCount++;
          containerLock.contents.push(target.itemId);
          itemsInContainers.add(target.itemId);
          ctx.items[target.itemId]!.initialRoom = target.currentRoom;

          const targetRoom = ctx.rooms[target.currentRoom]!;
          const vIdx = targetRoom.visibleItems.indexOf(target.itemId);
          if (vIdx !== -1) targetRoom.visibleItems.splice(vIdx, 1);

          targetRoom.lockIds.push(containerLock.id);
          enqueueKeysForLock(ctx, containerLock.id, lockTemplate, target, config, roomIds, queue);
          wrapped = true;
          break;
        }
      }

      if (wrapped) continue;
    }

    // base case：物品直接留在地板
    ctx.items[target.itemId]!.initialRoom = target.currentRoom;
    const room = ctx.rooms[target.currentRoom]!;
    if (!room.visibleItems.includes(target.itemId)) {
      room.visibleItems.push(target.itemId);
    }
  }
}

// ─── Phase C：整合搬移（Consolidation Pass） ───

/** 查詢實體（物品或鎖）的體積 */
function entityVolume(id: string, ctx: GeneratorContext): number {
  return ctx.items[id]?.volume ?? ctx.locks[id]?.volume ?? 0;
}

/**
 * 計算每個實體的緊急度（urgency）。
 * urgency(item) = 所有需要此 item 的鎖中，最小的 roomIndex。
 * urgency(containerLock) = 其 contents 中所有實體的最小 urgency；若為空則用鎖自身的 roomIndex。
 */
function computeUrgency(ctx: GeneratorContext, roomIds: RoomId[]): Map<string, number> {
  const urgency = new Map<string, number>();
  const roomIndex = new Map<RoomId, number>();
  for (let i = 0; i < roomIds.length; i++) {
    roomIndex.set(roomIds[i]!, i);
  }

  // Item urgency: min roomIndex among all locks that require this item
  for (const lock of Object.values(ctx.locks)) {
    const lockRoomIdx = roomIndex.get(lock.roomId) ?? roomIds.length;
    for (const itemId of lock.requiredItems) {
      const prev = urgency.get(itemId) ?? Infinity;
      urgency.set(itemId, Math.min(prev, lockRoomIdx));
    }
  }

  // Items not required by any lock get urgency = their own room index
  for (const item of Object.values(ctx.items)) {
    if (!urgency.has(item.id)) {
      urgency.set(item.id, roomIndex.get(item.initialRoom) ?? roomIds.length);
    }
  }

  // Lock urgency (recursive): min urgency of contents, or own roomIndex if empty
  function lockUrgency(lockId: LockId): number {
    if (urgency.has(lockId)) return urgency.get(lockId)!;
    const lock = ctx.locks[lockId]!;
    if (lock.contents.length === 0) {
      const val = roomIndex.get(lock.roomId) ?? roomIds.length;
      urgency.set(lockId, val);
      return val;
    }
    let minU = Infinity;
    for (const id of lock.contents) {
      if (id in ctx.locks) {
        minU = Math.min(minU, lockUrgency(id as LockId));
      } else {
        minU = Math.min(minU, urgency.get(id) ?? Infinity);
      }
    }
    urgency.set(lockId, minU);
    return minU;
  }

  for (const lockId of Object.keys(ctx.locks)) {
    lockUrgency(lockId as LockId);
  }

  return urgency;
}

/**
 * 計算容器鎖的目前嵌套深度（遞迴）。
 * item 貢獻 0 深度，lock 貢獻 1 + 其自身嵌套深度。
 */
function currentNestingDepth(lockId: LockId, locks: Record<LockId, Lock>): number {
  const lock = locks[lockId];
  if (!lock) return 0;
  let maxChild = 0;
  for (const id of lock.contents) {
    if (id in locks) {
      maxChild = Math.max(maxChild, 1 + currentNestingDepth(id as LockId, locks));
    }
  }
  return maxChild;
}

/**
 * 建立反向映射：entityId → 包含它的容器鎖 ID（O(1) 查找）
 */
function buildContentToContainerMap(locks: Record<LockId, Lock>): Map<string, LockId> {
  const map = new Map<string, LockId>();
  for (const lock of Object.values(locks)) {
    for (const id of lock.contents) {
      map.set(id, lock.id);
    }
  }
  return map;
}

/**
 * 收集解鎖某個 lock 所需的所有前置物品（遞迴展開容器鏈）。
 */
function collectPrerequisites(
  lockId: LockId,
  locks: Record<LockId, Lock>,
  contentToContainer: Map<string, LockId>,
): Set<string> {
  const result = new Set<string>();
  const visited = new Set<LockId>();

  function walk(lid: LockId): void {
    if (visited.has(lid)) return;
    visited.add(lid);
    const lock = locks[lid];
    if (!lock) return;
    for (const itemId of lock.requiredItems) {
      result.add(itemId);
      // 如果這個物品被鎖在某個容器裡，那個容器的前置也是間接前置
      const parentLock = contentToContainer.get(itemId);
      if (parentLock) walk(parentLock);
    }
  }

  walk(lockId);
  return result;
}

/**
 * 檢查 candidate 是否為 container 的（直接或間接）前置條件。
 * 若 candidate 是 item：檢查是否在 container 的 prerequisite 鏈中。
 * 若 candidate 是 lock：檢查其 contents 中的任何 item 是否被 container 需要。
 */
function wouldCreateCycle(
  candidateId: string,
  containerId: LockId,
  ctx: GeneratorContext,
  contentToContainer: Map<string, LockId>,
): boolean {
  const prereqs = collectPrerequisites(containerId, ctx.locks, contentToContainer);

  // If candidate is an item directly needed
  if (candidateId in ctx.items) {
    return prereqs.has(candidateId);
  }

  // If candidate is a lock, check if any entity inside it (recursively) is a prerequisite
  if (candidateId in ctx.locks) {
    const stack: string[] = [candidateId];
    const seen = new Set<string>();
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      if (prereqs.has(id)) return true;
      const lock = ctx.locks[id];
      if (lock) {
        for (const childId of lock.contents) {
          stack.push(childId);
        }
      }
    }
  }

  return false;
}

/**
 * Phase C 整合搬移：將地板上的物品和容器搬入現有容器中，
 * 產生多物品容器和嵌套容器，但不建立新鎖或鑰匙。
 */
function consolidate(
  ctx: GeneratorContext,
  roomIds: RoomId[],
  config: GeneratorConfig,
): void {
  const consolidationRate = config.consolidationRate ?? 0;
  const maxNesting = config.maxNestingDepth ?? 0;

  if (consolidationRate <= 0) return;

  const urgency = computeUrgency(ctx, roomIds);
  const contentToContainer = buildContentToContainerMap(ctx.locks);

  for (const roomId of roomIds) {
    const room = ctx.rooms[roomId]!;

    // Collect floor entities: visibleItems + container lockIds
    const floorEntities: string[] = [
      ...room.visibleItems,
      ...room.lockIds.filter(lid => ctx.locks[lid]!.category === 'container'),
    ];

    // Sort by urgency DESCENDING (least urgent first)
    floorEntities.sort((a, b) => (urgency.get(b) ?? 0) - (urgency.get(a) ?? 0));

    // Get container locks in this room sorted by urgency ASCENDING (most urgent first)
    const getContainers = () =>
      room.lockIds
        .filter(lid => ctx.locks[lid]!.category === 'container')
        .sort((a, b) => (urgency.get(a) ?? 0) - (urgency.get(b) ?? 0));

    for (const candidate of [...floorEntities]) {
      if (ctx.rng.next() > consolidationRate) continue;

      // Skip spatial locks (they are doors, not movable)
      if (candidate in ctx.locks && ctx.locks[candidate]!.category === 'spatial') continue;

      const candidateUrgency = urgency.get(candidate) ?? 0;
      const candidateVolume = entityVolume(candidate, ctx);

      const containers = getContainers();

      for (const containerId of containers) {
        if (containerId === candidate) continue;

        const container = ctx.locks[containerId]!;
        const containerUrgency = urgency.get(containerId) ?? 0;

        // Container must be at least as urgent as candidate
        if (containerUrgency > candidateUrgency) break;

        // Dependency check: candidate must not be a prerequisite for this container
        if (wouldCreateCycle(candidate, containerId, ctx, contentToContainer)) continue;

        // Check volume
        let usedVolume = 0;
        for (const id of container.contents) {
          usedVolume += entityVolume(id, ctx);
        }
        if (usedVolume + candidateVolume > container.capacity) continue;

        // Check nesting depth
        if (candidate in ctx.locks) {
          const candidateDepth = 1 + currentNestingDepth(candidate as LockId, ctx.locks);
          const containerCurrentDepth = currentNestingDepth(containerId, ctx.locks);
          if (containerCurrentDepth + candidateDepth > maxNesting) continue;
        }

        // Move candidate into container
        container.contents.push(candidate);
        contentToContainer.set(candidate, containerId);

        // Remove candidate from room floor
        if (candidate in ctx.items) {
          const idx = room.visibleItems.indexOf(candidate);
          if (idx !== -1) room.visibleItems.splice(idx, 1);
        } else if (candidate in ctx.locks) {
          const idx = room.lockIds.indexOf(candidate);
          if (idx !== -1) room.lockIds.splice(idx, 1);
        }

        // Update container's urgency
        const newUrgency = Math.min(urgency.get(containerId) ?? Infinity, candidateUrgency);
        urgency.set(containerId, newUrgency);

        break;
      }
    }
  }
}

// ─── 主生成函式 ───

export function generatePuzzle(config: GeneratorConfig): PuzzleDefinition {
  resetIdCounter();

  const rng = new SeededRandom(config.seed);
  const { ctx, roomIds, startRoomId, exitLockId, floorItems } = generateRoomSkeleton(config, rng);
  generatePuzzleContent(config, ctx, roomIds, floorItems);
  consolidate(ctx, roomIds, config);

  return {
    rooms: ctx.rooms,
    items: ctx.items,
    locks: ctx.locks,
    startRoomId,
    exitLockId,
    seed: rng.seed,
  };
}
