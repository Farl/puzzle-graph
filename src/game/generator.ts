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
  KeyTemplate,
} from './types';
import { ROOM_THEMES, ADJECTIVES } from './families';
import { KEY_TEMPLATES, LOCK_TEMPLATES, findKeyTemplate } from './templates';
import { filterTemplatesByTags } from './template-filter';
import { SeededRandom, shuffle, getUniqueName, PasswordFormatPool, generateId, resetIdCounter, buildRoomGateLocks, isEntityPickupable } from './utils';
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
  /** Lock templates after tag filter — used for deck reshuffle and reuse path lookup. */
  filteredLockPool: readonly LockTemplate[];
  /** Key templates after tag filter — used for reuse path lookup. */
  filteredKeyPool: readonly KeyTemplate[];
  reusableItemCache: Record<string, ItemId> = {};
  consumableCount: Record<string, number> = {};
  usedItemNames = new Set<string>();
  usedLockNames = new Set<string>();
  passwordPool: PasswordFormatPool;
  lockCount = 0;
  toolReuseCount: Record<ItemId, number> = {};

  constructor(maxRooms: number, rng: SeededRandom, config: GeneratorConfig) {
    this.rng = rng;
    this.passwordPool = new PasswordFormatPool(rng);
    this.availableThemes = shuffle(ROOM_THEMES, rng).slice(0, maxRooms);
    const filtered = filterTemplatesByTags(
      LOCK_TEMPLATES,
      config.includeTemplateTags,
      config.excludeTemplateTags,
    );
    // Door skeleton (Phase A) needs spatial locks. When an include filter
    // selects a theme whose templates are all container (e.g. pure
    // investigation mode), the filtered pool has zero spatial candidates.
    // Fall back to exclude-only filtered spatial locks so door generation
    // never starves. Include filter still constrains container slots.
    if (!filtered.some(t => t.category === 'spatial')) {
      const spatialFallback = filterTemplatesByTags(
        LOCK_TEMPLATES,
        undefined,
        config.excludeTemplateTags,
      ).filter(t => t.category === 'spatial');
      this.filteredLockPool = [...filtered, ...spatialFallback];
    } else {
      this.filteredLockPool = filtered;
    }
    this.filteredKeyPool = filterTemplatesByTags(
      KEY_TEMPLATES,
      config.includeTemplateTags,
      config.excludeTemplateTags,
    );
    this.availableLocks = shuffle([...this.filteredLockPool], rng);
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
    stateTags?: string[],
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
      stateTags,
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

  /** 統一建立或取得鑰匙（消耗型或可重複使用） */
  resolveOrCreateKey(keyTpl: { name: string; volume: number; reusable?: boolean; pickupable?: boolean }): ItemId {
    const pickupable = keyTpl.pickupable !== false;
    return keyTpl.reusable
      ? this.getOrCreateReusableItem(keyTpl.name, keyTpl.volume, pickupable)
      : this.createConsumableItem(keyTpl.name, keyTpl.volume, pickupable).id;
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

  /**
   * 從 shuffle 牌堆抽一個合法的鎖模板。
   * 統一處理狀態鎖、組合鎖、單鑰匙鎖：
   *   1. 過濾所有合法候選
   *   2. 有狀態鎖候選 → 按 stateLockRate 決定
   *   3. 不用狀態鎖 → 按 compositeRate 在組合鎖和單鑰匙鎖之間選
   *   4. 從選中的類別裡隨機抽一個，從牌堆移除
   */
  drawLock(
    trySpatial: boolean,
    config: GeneratorConfig,
    lockedItems?: Set<ItemId>,
    isValid?: (tpl: LockTemplate) => boolean,
    stateLockCandidates?: LockTemplate[],
  ): LockTemplate | null {
    // 復用路徑
    if (config.reuseRate != null && config.reuseRate > 0 && this.rng.next() < config.reuseRate) {
      const reuseLock = this.tryReusePath(trySpatial, config, lockedItems);
      if (reuseLock && (!isValid || isValid(reuseLock))) return reuseLock;
    }

    const targetCategory = trySpatial ? 'spatial' : 'container';

    const drawFrom = (deck: LockTemplate[]): LockTemplate | null => {
      const valid = deck
        .map((tpl, i) => ({ tpl, i }))
        .filter(({ tpl }) => tpl.category === targetCategory && !tpl.pickupable && (!isValid || isValid(tpl)));

      // Split stateTag candidates: pickupable = state transform, non-pickupable = NPC
      const stateTagValid = stateLockCandidates?.filter(tpl => !isValid || isValid(tpl)) ?? [];
      const validStateLocks = stateTagValid.filter(tpl => tpl.pickupable === true);
      const validNpcLocks = stateTagValid.filter(tpl => tpl.pickupable !== true);

      if (valid.length === 0 && validStateLocks.length === 0 && validNpcLocks.length === 0) return null;

      // Priority 1: state transform lock (pickupable)
      if (validStateLocks.length > 0 &&
          (valid.length === 0 || this.rng.next() < (config.stateLockRate ?? 0))) {
        return validStateLocks[this.rng.nextInt(validStateLocks.length)]!;
      }

      // Priority 2: NPC lock (non-pickupable with matching stateTag)
      if (validNpcLocks.length > 0 &&
          (valid.length === 0 || this.rng.next() < (config.npcRate ?? 0))) {
        // NPC lock is ALSO in the main deck; find and splice so it isn't redrawn.
        const npc = validNpcLocks[this.rng.nextInt(validNpcLocks.length)]!;
        const idxInDeck = deck.indexOf(npc);
        if (idxInDeck !== -1) deck.splice(idxInDeck, 1);
        return npc;
      }

      if (valid.length === 0) return null;

      // Priority 3: composite or single
      const composites = valid.filter(v => v.tpl.requiredKeys.length > 1);
      const singles = valid.filter(v => v.tpl.requiredKeys.length <= 1);
      const useComposite = composites.length > 0 && (singles.length === 0 || this.rng.next() < (config.compositeRate ?? 0));
      const pool = useComposite ? composites : (singles.length > 0 ? singles : valid);
      const pick = pool[this.rng.nextInt(pool.length)]!;

      deck.splice(pick.i, 1);
      return pick.tpl;
    };

    let result = drawFrom(this.availableLocks);
    if (!result) {
      this.availableLocks = shuffle([...this.filteredLockPool], this.rng);
      result = drawFrom(this.availableLocks);
    }
    return result;
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
    const keyTpl = this.filteredKeyPool.find(k => k.name === toolName && k.reusable);
    if (!keyTpl) return null;

    const compatibleLocks = this.filteredLockPool.filter(
      l => l.category === targetCategory && l.requiredKeys.includes(keyTpl.id)
        && !l.pickupable,
    );
    if (compatibleLocks.length === 0) return null;

    return compatibleLocks[this.rng.nextInt(compatibleLocks.length)]!;
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

  if (lockTemplate.keyHints) {
    lock.keyHints = {};
  }

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
    const keyId = ctx.resolveOrCreateKey(keyTpl);
    const item = ctx.items[keyId];
    if (item && !keyTpl.reusable && isPasswordLock && lock.password) {
      item.type = 'clue';
      item.description = `上面寫著：「${lock.password}」（${lock.passwordHint ?? '密碼'}）── 對應 ${lock.name}`;
    }

    lock.requiredItems.push(keyId);

    if (lockTemplate.keyHints?.[keyTemplateId]) {
      lock.keyHints![keyId] = lockTemplate.keyHints[keyTemplateId]!;
    }

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

    // key 不能比容器鎖所在房間更遠（玩家到容器時一定能到 key）
    const lockRoomIndex = roomIds.indexOf(lock.roomId);
    const maxIdx = Math.min(target.criticalRoomIndex - 1, lockRoomIndex, roomIds.length - 1);
    const eligible = roomIds.slice(0, maxIdx + 1);
    const preferredIdx = eligible.indexOf(target.currentRoom);

    let keyRoomId: RoomId;
    if (keyTpl.pickupable === false) {
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
  const ctx = new GeneratorContext(config.maxRooms, rng, config);
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

    const lockTemplate = ctx.drawLock(true, config)!;
    const variation = lockTemplate.variations[ctx.rng.nextInt(lockTemplate.variations.length)]!;

    const doorLock = ctx.createLock(variation, true, fromRoomId, false, 0, 0);
    doorLock.targetRoomId = toRoomId;
    ctx.rooms[fromRoomId]!.lockIds.push(doorLock.id);

    // 建立此門的所有鑰匙
    const eligible = roomIds.slice(0, i + 1);
    for (const keyTemplateId of lockTemplate.requiredKeys) {
      const keyTpl = findKeyTemplate(keyTemplateId)!;
      const keyId = ctx.resolveOrCreateKey(keyTpl);
      doorLock.requiredItems.push(keyId);

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
  const itemsInContainers = new Set<ItemId>();

  // 狀態鎖配對用的查詢表
  const keyTplByName = new Map(ctx.filteredKeyPool.map(k => [k.name, k]));
  // Candidate pool for stateTag pairing:
  //  - pickupable=true  → state lock (pickupable, inventory transform)
  //  - pickupable=false → NPC lock (stationary container bound to room)
  const stateLockTemplates = ctx.filteredLockPool.filter(
    l => l.category === 'container' && l.stateTags && l.stateTags.length > 0,
  );

  // Phase A 已把 item 放進 visibleItems，Phase B 會重新決定最終歸宿
  for (const target of initialTargets) {
    const room = ctx.rooms[target.currentRoom]!;
    const idx = room.visibleItems.indexOf(target.itemId);
    if (idx !== -1) room.visibleItems.splice(idx, 1);
  }

  while (queue.length > 0) {
    const target = queue.shift()!;

    const eligibleRooms = new Set(roomIds.slice(0, target.criticalRoomIndex));
    const maxReuses = config.maxReusesPerTool ?? Infinity;

    const depthBudgetReached = ctx.lockCount >= config.targetDepth;
    const lockLimitReached = config.maxLocks != null && ctx.lockCount >= config.maxLocks;
    const canWrapMore = !depthBudgetReached && !lockLimitReached;

    if (canWrapMore && !itemsInContainers.has(target.itemId)) {
      // reusable tool 依賴合法性檢查
      const isTemplateValid = (tpl: LockTemplate): boolean =>
        tpl.requiredKeys.every(keyTplId => {
          const keyTpl = findKeyTemplate(keyTplId)!;
          if (!keyTpl.reusable) return true;
          if (ctx.reusableItemCache[keyTpl.name] === target.itemId) return false;
          const existingId = ctx.reusableItemCache[keyTpl.name];
          if (!existingId) return true;
          if ((ctx.toolReuseCount[existingId] ?? 0) >= maxReuses) return false;
          if (itemsInContainers.has(existingId)) return false;
          const placedRoom = ctx.items[existingId]!.initialRoom;
          if (!placedRoom) return true;
          if (keyTpl.pickupable === false && placedRoom !== target.currentRoom) return false;
          return eligibleRooms.has(placedRoom);
        });

      // 找配對的狀態鎖候選（tag 匹配）
      let stateLockCandidates: LockTemplate[] = [];
      const item = ctx.items[target.itemId];
      if (item) {
        const keyTpl = keyTplByName.get(item.name);
        if (keyTpl?.stateTags && keyTpl.stateTags.length > 0) {
          stateLockCandidates = stateLockTemplates.filter(lt =>
            lt.stateTags!.some(tag => keyTpl.stateTags!.includes(tag)),
          );
        }
      }

      // 統一抽選：狀態鎖 / 組合鎖 / 單鑰匙鎖
      const lockTemplate = ctx.drawLock(false, config, itemsInContainers, isTemplateValid, stateLockCandidates);

      if (lockTemplate) {
        // 容器鎖放在物品所在的房間（鑰匙才跨房間）
        const lockRoomId = target.currentRoom;

        const variation = lockTemplate.variations[ctx.rng.nextInt(lockTemplate.variations.length)]!;
        const lockPickupable = lockTemplate.pickupable === true;
        const containerLock = ctx.createLock(variation, false, lockRoomId, false, lockTemplate.capacity, lockTemplate.volume, lockPickupable, lockTemplate.stateTags);
        ctx.lockCount++;
        containerLock.contents.push(target.itemId);
        itemsInContainers.add(target.itemId);
        ctx.items[target.itemId]!.initialRoom = lockRoomId;

        const origRoom = ctx.rooms[target.currentRoom]!;
        const vIdx = origRoom.visibleItems.indexOf(target.itemId);
        if (vIdx !== -1) origRoom.visibleItems.splice(vIdx, 1);

        ctx.rooms[lockRoomId]!.lockIds.push(containerLock.id);

        target.currentRoom = lockRoomId;
        target.currentRoomIndex = roomIds.indexOf(lockRoomId);

        enqueueKeysForLock(ctx, containerLock.id, lockTemplate, target, config, roomIds, queue);
        continue;
      }
    }

    // base case：物品直接留在地板（但已在容器內的物品不動）
    if (!itemsInContainers.has(target.itemId)) {
      ctx.items[target.itemId]!.initialRoom = target.currentRoom;
      const room = ctx.rooms[target.currentRoom]!;
      if (!room.visibleItems.includes(target.itemId)) {
        room.visibleItems.push(target.itemId);
      }
    }
  }
}

// ─── Phase C：整合搬移（Consolidation Pass） ───

/** 查詢實體（物品或鎖）的體積 */
function entityVolume(id: string, ctx: GeneratorContext): number {
  return ctx.items[id]?.volume ?? ctx.locks[id]?.volume ?? 0;
}

/**
 * 計算每個實體的拓撲深度（Kahn rank）。
 * 深度越小 = 越早被需要 = 越不應該被塞進深層容器。
 */
function computeDepth(ctx: GeneratorContext): Map<string, number> {
  const allIds = new Set<string>([...Object.keys(ctx.items), ...Object.keys(ctx.locks)]);
  const inDegree: Record<string, number> = {};
  const adj: Record<string, string[]> = {};
  for (const id of allIds) { inDegree[id] = 0; adj[id] = []; }

  for (const lock of Object.values(ctx.locks)) {
    for (const reqId of lock.requiredItems) {
      if (allIds.has(reqId)) { adj[reqId]!.push(lock.id); inDegree[lock.id] = (inDegree[lock.id] ?? 0) + 1; }
    }
    if (lock.category === 'container') {
      for (const cid of lock.contents) {
        if (allIds.has(cid)) { adj[lock.id]!.push(cid); inDegree[cid] = (inDegree[cid] ?? 0) + 1; }
      }
    }
  }

  const depth = new Map<string, number>();
  for (const id of allIds) depth.set(id, 0);
  const queue = [...allIds].filter(id => inDegree[id] === 0);
  while (queue.length > 0) {
    const u = queue.shift()!;
    for (const v of adj[u]!) {
      depth.set(v, Math.max(depth.get(v)!, (depth.get(u) ?? 0) + 1));
      inDegree[v]!--;
      if (inDegree[v] === 0) queue.push(v);
    }
  }
  return depth;
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
 * 收集解鎖某個 lock 所需的所有前置物品（遞迴展開容器鏈 + 空間鎖鏈）。
 */
function collectPrerequisites(
  lockId: LockId,
  locks: Record<LockId, Lock>,
  contentToContainer: Map<string, LockId>,
  items: Record<string, { initialRoom: string }>,
  roomGateLocks: Map<string, string[]>,
): Set<string> {
  const result = new Set<string>();
  const visited = new Set<LockId>();

  function walk(lid: LockId): void {
    if (visited.has(lid)) return;
    visited.add(lid);
    const lock = locks[lid];
    if (!lock) return;

    // 這個鎖本身如果在另一個容器裡，那個容器也是前置
    const parentOfLock = contentToContainer.get(lid);
    if (parentOfLock) walk(parentOfLock);

    for (const itemId of lock.requiredItems) {
      result.add(itemId);
      const parentLock = contentToContainer.get(itemId);
      if (parentLock) walk(parentLock);
      // 物品在其他房間 → 到達那個房間需要的空間鎖也是前置
      const itemRoom = items[itemId]?.initialRoom;
      if (itemRoom) {
        for (const gateLockId of roomGateLocks.get(itemRoom) ?? []) walk(gateLockId);
      }
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
  roomGateLocks: Map<string, string[]>,
): boolean {
  const prereqs = collectPrerequisites(containerId, ctx.locks, contentToContainer, ctx.items, roomGateLocks);

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

  const depth = computeDepth(ctx);
  const contentToContainer = buildContentToContainerMap(ctx.locks);
  const roomGateLocks = buildRoomGateLocks(roomIds[0]!, ctx.locks);

  for (const roomId of roomIds) {
    const room = ctx.rooms[roomId]!;

    const floorEntities: string[] = [
      ...room.visibleItems,
      ...room.lockIds.filter(lid => ctx.locks[lid]!.category === 'container'),
    ];

    // 深度大的先搬（越深 = 越晚需要 = 越適合塞進容器）
    floorEntities.sort((a, b) => (depth.get(b) ?? 0) - (depth.get(a) ?? 0));

    // 排除狀態鎖（內容物語意固定），按深度升序（淺的容器優先收納）
    const getContainers = () =>
      room.lockIds
        .filter(lid => {
          const l = ctx.locks[lid]!;
          return l.category === 'container' && !l.stateTags?.length;
        })
        .sort((a, b) => (depth.get(a) ?? 0) - (depth.get(b) ?? 0));

    for (const candidate of [...floorEntities]) {
      if (ctx.rng.next() > consolidationRate) continue;

      // Skip spatial locks (they are doors, not movable)
      if (candidate in ctx.locks && ctx.locks[candidate]!.category === 'spatial') continue;

      const candidateDepth = depth.get(candidate) ?? 0;
      const candidateVolume = entityVolume(candidate, ctx);

      const containers = getContainers();

      for (const containerId of containers) {
        if (containerId === candidate) continue;

        const container = ctx.locks[containerId]!;
        const containerDepth = depth.get(containerId) ?? 0;

        // 容器深度必須 ≤ 候選深度（淺的容器不能裝更淺的物品）
        if (containerDepth > candidateDepth) break;

        // Dependency check: candidate must not be a prerequisite for this container
        if (wouldCreateCycle(candidate, containerId, ctx, contentToContainer, roomGateLocks)) continue;

        // Check volume
        let usedVolume = 0;
        for (const id of container.contents) {
          usedVolume += entityVolume(id, ctx);
        }
        if (usedVolume + candidateVolume > container.capacity) continue;

        // 不可攜帶的物件不能塞進可攜帶的容器
        if (container.pickupable && !isEntityPickupable(candidate, ctx.items, ctx.locks)) continue;

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

        // 容器深度取較小值（收納後容器變得更早被需要）
        depth.set(containerId, Math.min(containerDepth, candidateDepth));

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
