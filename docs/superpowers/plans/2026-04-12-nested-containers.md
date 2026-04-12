# Nested Containers + Volume System + Graph Grouping — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable containers inside containers with a three-layer volume system (room → container → item) and room-grouped graph visualization.

**Architecture:** Phase A+B generation unchanged. New Phase C consolidation pass moves entities into containers post-generation. Volume enforced via capacity/volume fields on Room, Lock, Item. Graph layout adds room grouping + container sub-groups. Rename `containsItems` → `contents` throughout.

**Tech Stack:** React 19, TypeScript, Vite 6, Tailwind CSS 4, Vitest

---

### Task 1: Data Model — types.ts

**Files:**
- Modify: `src/game/types.ts`

- [ ] **Step 1: Add volume to Item interface**

```typescript
// In Item interface, after `initialRoom: RoomId;` add:
  volume: number;
```

- [ ] **Step 2: Add capacity to Room interface**

```typescript
// In Room interface, after `visibleItems: ItemId[];` add:
  capacity: number;
```

- [ ] **Step 3: Rename containsItems → contents and add volume/capacity to Lock**

Replace:
```typescript
  containsItems: ItemId[];
```
With:
```typescript
  contents: string[];
  capacity: number;
  volume: number;
```

- [ ] **Step 4: Replace maxItems with capacity and volume on LockTemplate**

Replace:
```typescript
  maxItems: number;
```
With:
```typescript
  capacity: number;
  volume: number;
```

- [ ] **Step 5: Add new config fields to GeneratorConfig**

After `maxReusesPerTool?: number;` add:
```typescript
  maxNestingDepth?: number;
  consolidationRate?: number;
```

- [ ] **Step 6: Add RoomTheme capacity**

In `RoomTheme` interface, add:
```typescript
  capacity: number;
```

- [ ] **Step 7: Run type-check to confirm compilation (expect errors in other files — that's expected)**

Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: Errors in generator.ts, engine.ts, etc. (we'll fix them in subsequent tasks)

- [ ] **Step 8: Commit**

```bash
git add src/game/types.ts
git commit -m "feat: data model for volume system — Item.volume, Lock.contents/capacity/volume, Room.capacity"
```

---

### Task 2: Templates — templates.ts + families.ts

**Files:**
- Modify: `src/game/templates.ts`
- Modify: `src/game/families.ts`

- [ ] **Step 1: Update KeyTemplate volumes to L-based scale**

The existing values (1-3) already match the L scale (pocket=1, handheld=2, two-hands=3). Update only the 0.5L items:

```typescript
// Change these from volume: 1 to volume: 0.5:
{ id: 'password_note', ..., volume: 0.5 },
{ id: 'usb_drive', ..., volume: 0.5 },
{ id: 'keycard', ..., volume: 0.5 },
```

Keep all others as-is (they already match L scale).

- [ ] **Step 2: Replace maxItems with capacity and volume on all container LockTemplates**

```typescript
// locked_chest: maxItems: 3 →
capacity: 8, volume: 5,

// dark_corner: maxItems: 2 →
capacity: 4, volume: 3,

// display_case: maxItems: 2 →
capacity: 4, volume: 3,

// password_toolbox: maxItems: 3 →
capacity: 8, volume: 5,

// nailed_box: maxItems: 3 →
capacity: 8, volume: 5,

// hightech_safe: maxItems: 3 →
capacity: 14, volume: 8,

// chemical_mixer: maxItems: 2 →
capacity: 4, volume: 3,

// gear_mechanism: maxItems: 2 →
capacity: 4, volume: 3,
```

- [ ] **Step 3: Replace maxItems with capacity: 0, volume: 0 on all spatial LockTemplates**

```typescript
// All 5 spatial locks: maxItems: 20 →
capacity: 0, volume: 0,
```

- [ ] **Step 4: Add capacity to ROOM_THEMES in families.ts**

```typescript
export const ROOM_THEMES: readonly RoomTheme[] = [
  { name: '廢棄走廊', description: '...', capacity: 30 },
  { name: '守衛室', description: '...', capacity: 50 },
  { name: '儲藏室', description: '...', capacity: 80 },
  { name: '醫務室', description: '...', capacity: 50 },
  { name: '發電機房', description: '...', capacity: 50 },
  { name: '監獄長辦公室', description: '...', capacity: 50 },
  { name: '地下實驗室', description: '...', capacity: 50 },
  { name: '安保武器庫', description: '...', capacity: 80 },
  { name: '鍋爐房', description: '...', capacity: 30 },
  { name: '通風管道夾層', description: '...', capacity: 30 },
];
```

- [ ] **Step 5: Commit**

```bash
git add src/game/templates.ts src/game/families.ts
git commit -m "feat: volume/capacity values for all templates and room themes"
```

---

### Task 3: Generator — createRoom, createItem, createLock

**Files:**
- Modify: `src/game/generator.ts`

- [ ] **Step 1: Update createRoom to accept and store capacity**

Replace:
```typescript
  createRoom(name: string, description: string): Room {
    const room: Room = {
      id: generateId('r'),
      name,
      description,
      lockIds: [],
      visibleItems: [],
    };
```
With:
```typescript
  createRoom(name: string, description: string, capacity: number): Room {
    const room: Room = {
      id: generateId('r'),
      name,
      description,
      lockIds: [],
      visibleItems: [],
      capacity,
    };
```

- [ ] **Step 2: Update createItem to accept and store volume**

Replace:
```typescript
  createItem(name: string, reusable: boolean, description?: string): Item {
    const item: Item = {
      id: generateId('item'),
      name,
      description: description ?? `散發著微光的物品，可以用來處理特定的機關。`,
      type: reusable ? 'tool' : 'key',
      reusable,
      initialRoom: '',
    };
```
With:
```typescript
  createItem(name: string, reusable: boolean, volume: number, description?: string): Item {
    const item: Item = {
      id: generateId('item'),
      name,
      description: description ?? `散發著微光的物品，可以用來處理特定的機關。`,
      type: reusable ? 'tool' : 'key',
      reusable,
      volume,
      initialRoom: '',
    };
```

- [ ] **Step 3: Update createLock to accept capacity/volume, rename containsItems → contents**

Replace:
```typescript
  createLock(
    variation: FamilyVariation,
    isSpatial: boolean,
    roomId: RoomId,
    isExit: boolean = false,
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
      containsItems: [],
      isLocked: true,
      isExit,
    };
```
With:
```typescript
  createLock(
    variation: FamilyVariation,
    isSpatial: boolean,
    roomId: RoomId,
    isExit: boolean = false,
    capacity: number = 0,
    volume: number = 0,
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
      isLocked: true,
      isExit,
    };
```

- [ ] **Step 4: Update createConsumableItem to pass volume**

Replace:
```typescript
  createConsumableItem(name: string): Item {
    this.consumableCount[name] = (this.consumableCount[name] ?? 0) + 1;
    let keyName = name;
    if (this.consumableCount[name]! > 1) {
      keyName = `${name} (${String.fromCharCode(64 + this.consumableCount[name]!)})`;
    }
    return this.createItem(keyName, false);
  }
```
With:
```typescript
  createConsumableItem(name: string, volume: number): Item {
    this.consumableCount[name] = (this.consumableCount[name] ?? 0) + 1;
    let keyName = name;
    if (this.consumableCount[name]! > 1) {
      keyName = `${name} (${String.fromCharCode(64 + this.consumableCount[name]!)})`;
    }
    return this.createItem(keyName, false, volume);
  }
```

- [ ] **Step 5: Update getOrCreateReusableItem to pass volume**

Replace:
```typescript
  getOrCreateReusableItem(name: string): ItemId {
    const cached = this.reusableItemCache[name];
    if (cached) return cached;
    const item = this.createItem(name, true);
    this.reusableItemCache[name] = item.id;
    return item.id;
  }
```
With:
```typescript
  getOrCreateReusableItem(name: string, volume: number): ItemId {
    const cached = this.reusableItemCache[name];
    if (cached) return cached;
    const item = this.createItem(name, true, volume);
    this.reusableItemCache[name] = item.id;
    return item.id;
  }
```

- [ ] **Step 6: Commit**

```bash
git add src/game/generator.ts
git commit -m "feat: generator factory methods accept volume/capacity params"
```

---

### Task 4: Generator — Update all call sites (Phase A + B)

**Files:**
- Modify: `src/game/generator.ts`

- [ ] **Step 1: Update createRoom call in generateRoomSkeleton**

Replace:
```typescript
    const room = ctx.createRoom(theme.name, theme.description);
```
With:
```typescript
    const room = ctx.createRoom(theme.name, theme.description, theme.capacity);
```

- [ ] **Step 2: Update Phase A key creation (doors) — pass volume to createItem/createConsumableItem/getOrCreateReusableItem**

In the door key creation loop, replace:
```typescript
    if (keyTpl.reusable) {
      keyId = ctx.getOrCreateReusableItem(keyTpl.name);
    } else {
      keyId = ctx.createConsumableItem(keyTpl.name).id;
    }
```
With:
```typescript
    if (keyTpl.reusable) {
      keyId = ctx.getOrCreateReusableItem(keyTpl.name, keyTpl.volume);
    } else {
      keyId = ctx.createConsumableItem(keyTpl.name, keyTpl.volume).id;
    }
```

- [ ] **Step 3: Update exit key creation**

Replace:
```typescript
  const exitKey = ctx.createItem('終極逃生卡', false, '帶有最高權限的特殊磁卡。');
```
With:
```typescript
  const exitKey = ctx.createItem('終極逃生卡', false, 0.5, '帶有最高權限的特殊磁卡。');
```

- [ ] **Step 4: Update Phase A door lock creation — pass capacity/volume from lockTemplate**

In the door creation loop, replace:
```typescript
    const doorLock = ctx.createLock(variation, true, fromRoomId);
```
With:
```typescript
    const doorLock = ctx.createLock(variation, true, fromRoomId, false, 0, 0);
```

- [ ] **Step 5: Update Phase B container lock creation — pass capacity/volume from lockTemplate**

In `generatePuzzleContent`, where container locks are created, replace:
```typescript
        const variation = lockTemplate.variations[ctx.rng.nextInt(lockTemplate.variations.length)]!;
        const containerLock = ctx.createLock(variation, false, target.currentRoom);
```
With:
```typescript
        const variation = lockTemplate.variations[ctx.rng.nextInt(lockTemplate.variations.length)]!;
        const containerLock = ctx.createLock(variation, false, target.currentRoom, false, lockTemplate.capacity, lockTemplate.volume);
```

- [ ] **Step 6: Update containsItems → contents in Phase B**

Replace:
```typescript
        containerLock.containsItems.push(target.itemId);
```
With:
```typescript
        containerLock.contents.push(target.itemId);
```

- [ ] **Step 7: Update enqueueKeysForLock — pass volume to createConsumableItem and getOrCreateReusableItem**

In `enqueueKeysForLock`, replace:
```typescript
    if (keyTpl.reusable) {
      keyId = ctx.getOrCreateReusableItem(keyTpl.name);
    } else {
      const item = ctx.createConsumableItem(keyTpl.name);
      keyId = item.id;
```
With:
```typescript
    if (keyTpl.reusable) {
      keyId = ctx.getOrCreateReusableItem(keyTpl.name, keyTpl.volume);
    } else {
      const item = ctx.createConsumableItem(keyTpl.name, keyTpl.volume);
      keyId = item.id;
```

- [ ] **Step 8: Run type-check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Errors may remain in engine.ts, solver.ts, dump.ts, graph-layout.ts, tests (we fix those next)

- [ ] **Step 9: Commit**

```bash
git add src/game/generator.ts
git commit -m "feat: wire volume/capacity through Phase A+B call sites, rename containsItems→contents"
```

---

### Task 5: Engine + Solver + Dump — containsItems → contents

**Files:**
- Modify: `src/game/engine.ts`
- Modify: `src/game/solver.ts`
- Modify: `src/game/dump.ts`
- Modify: `src/game/graph-layout.ts`

- [ ] **Step 1: Update engine performUnlock**

Replace:
```typescript
  if (lock.category === 'container' && lock.containsItems.length > 0) {
    const room = state.puzzle.rooms[state.currentRoomId]!;
    const names = lock.containsItems.map(id => state.puzzle.items[id]!.name).join('、');
    addLog(state, 'success', `你從 ${lock.name} 中發現了：${names}！`);
    room.visibleItems.push(...lock.containsItems);
    lock.containsItems = [];
  }
```
With:
```typescript
  if (lock.category === 'container' && lock.contents.length > 0) {
    const room = state.puzzle.rooms[state.currentRoomId]!;
    const contentNames: string[] = [];
    for (const id of lock.contents) {
      if (id in state.puzzle.items) {
        room.visibleItems.push(id);
        contentNames.push(state.puzzle.items[id]!.name);
      } else if (id in state.puzzle.locks) {
        room.lockIds.push(id);
        contentNames.push(state.puzzle.locks[id]!.name);
      }
    }
    addLog(state, 'success', `你從 ${lock.name} 中發現了：${contentNames.join('、')}！`);
    lock.contents = [];
  }
```

- [ ] **Step 2: Update engine cloneState**

Replace:
```typescript
      locks: Object.fromEntries(
        Object.entries(state.puzzle.locks).map(([k, v]) => [k, { ...v, requiredItems: [...v.requiredItems], insertedItems: [...v.insertedItems], containsItems: [...v.containsItems] }]),
      ),
```
With:
```typescript
      locks: Object.fromEntries(
        Object.entries(state.puzzle.locks).map(([k, v]) => [k, { ...v, requiredItems: [...v.requiredItems], insertedItems: [...v.insertedItems], contents: [...v.contents] }]),
      ),
```

- [ ] **Step 3: Update solver — handle contents with items and locks**

Replace:
```typescript
      // 釋放鎖內物品
      for (const itemId of lock.containsItems) {
        inventory.add(itemId);
        steps.push(`  got: ${items[itemId]?.name ?? itemId}`);
      }
```
With:
```typescript
      // 釋放鎖內內容（物品加入背包，子鎖標記為可用）
      for (const id of lock.contents) {
        if (id in items) {
          inventory.add(id);
          steps.push(`  got: ${items[id]?.name ?? id}`);
        } else if (id in locks) {
          // 子容器鎖現在可見，下一輪迴圈會嘗試開啟
          steps.push(`  revealed: ${locks[id]?.name ?? id}`);
          progress = true;
        }
      }
```

- [ ] **Step 4: Update dump.ts — containsItems → contents, handle nested locks**

Replace:
```typescript
      const hidesLabels = lock.containsItems.map(id => {
        const item = items[id]!;
        return `(${itemLabel.get(id)}${item.reusable ? '[TOOL]' : ''})`;
      }).join(', ');
```
With:
```typescript
      const hidesLabels = lock.contents.map(id => {
        const item = items[id];
        if (item) {
          return `(${itemLabel.get(id)}${item.reusable ? '[TOOL]' : ''})`;
        }
        const childLock = locks[id];
        if (childLock) {
          return `[Lock: ${lockLabel.get(id) ?? id}]`;
        }
        return `(${id})`;
      }).join(', ');
```

- [ ] **Step 5: Update graph-layout.ts — containsItems → contents**

Replace:
```typescript
    // lock → item（容器鎖隱藏物品）
    for (const hiddenId of lock.containsItems) {
      if (inDegree.hasOwnProperty(hiddenId)) {
        edges.push({ source: lock.id, target: hiddenId, type: 'contains' });
        inDegree[hiddenId]!++;
      }
    }
```
With:
```typescript
    // lock → contents（容器鎖隱藏的物品或子鎖）
    for (const hiddenId of lock.contents) {
      if (inDegree.hasOwnProperty(hiddenId)) {
        edges.push({ source: lock.id, target: hiddenId, type: 'contains' });
        inDegree[hiddenId]!++;
      }
    }
```

- [ ] **Step 6: Run type-check — expect clean (test files may still error)**

Run: `npx tsc --noEmit 2>&1 | grep -v __tests__ | head -10`

- [ ] **Step 7: Commit**

```bash
git add src/game/engine.ts src/game/solver.ts src/game/dump.ts src/game/graph-layout.ts
git commit -m "feat: rename containsItems→contents in engine, solver, dump, graph-layout"
```

---

### Task 6: Update all tests — containsItems → contents

**Files:**
- Modify: `src/game/__tests__/puzzle-quality.test.ts`
- Modify: `src/game/__tests__/dump.test.ts`
- Modify: `src/game/__tests__/phase3-content.test.ts`
- Modify: all other test files that reference `containsItems`

- [ ] **Step 1: Find all test references**

Run: `grep -rn 'containsItems\|maxItems' src/game/__tests__/`

- [ ] **Step 2: Replace containsItems → contents in all test files**

Use find-and-replace across all test files:
- `lock.containsItems` → `lock.contents`
- `containsItems` → `contents` (in helper functions like `getContainedItemIds`)

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: All 77 tests pass

- [ ] **Step 4: Commit**

```bash
git add src/game/__tests__/
git commit -m "test: update all tests for containsItems→contents rename"
```

---

### Task 7: Phase C — Consolidation Pass

**Files:**
- Modify: `src/game/generator.ts`

- [ ] **Step 1: Write the consolidate test**

Create test file `src/game/__tests__/consolidation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generatePuzzle } from '../generator';
import type { GeneratorConfig } from '../types';

const BASE: GeneratorConfig = {
  targetDepth: 4,
  maxRooms: 3,
  compositeRate: 0.3,
  depthStaggerVariance: 1.0,
  seed: 42,
};

describe('Phase C: consolidation', () => {
  it('consolidationRate=0 produces no nesting (all contents have single item)', () => {
    const puzzle = generatePuzzle({ ...BASE, consolidationRate: 0, maxNestingDepth: 2 });
    for (const lock of Object.values(puzzle.locks)) {
      if (lock.category !== 'container') continue;
      // No lock IDs in contents — only item IDs
      for (const id of lock.contents) {
        expect(id in puzzle.items).toBe(true);
      }
      // Each container has at most 1 item (Phase B behavior unchanged)
      expect(lock.contents.length).toBeLessThanOrEqual(1);
    }
  });

  it('consolidationRate=1 may produce nested containers', () => {
    let foundNesting = false;
    for (let seed = 0; seed < 50; seed++) {
      const puzzle = generatePuzzle({ ...BASE, seed, consolidationRate: 1, maxNestingDepth: 3 });
      for (const lock of Object.values(puzzle.locks)) {
        if (lock.contents.some(id => id in puzzle.locks)) {
          foundNesting = true;
          break;
        }
      }
      if (foundNesting) break;
    }
    expect(foundNesting).toBe(true);
  });

  it('consolidationRate=1 may produce multi-item containers', () => {
    let foundMulti = false;
    for (let seed = 0; seed < 50; seed++) {
      const puzzle = generatePuzzle({ ...BASE, seed, consolidationRate: 1, maxNestingDepth: 2 });
      for (const lock of Object.values(puzzle.locks)) {
        if (lock.contents.length > 1) {
          foundMulti = true;
          break;
        }
      }
      if (foundMulti) break;
    }
    expect(foundMulti).toBe(true);
  });

  it('maxNestingDepth=0 prevents any nesting', () => {
    for (let seed = 0; seed < 20; seed++) {
      const puzzle = generatePuzzle({ ...BASE, seed, consolidationRate: 1, maxNestingDepth: 0 });
      for (const lock of Object.values(puzzle.locks)) {
        for (const id of lock.contents) {
          expect(id in puzzle.locks, `Lock ${lock.name} contains a nested lock`).toBe(false);
        }
      }
    }
  });

  it('nested containers respect volume capacity', () => {
    for (let seed = 0; seed < 30; seed++) {
      const puzzle = generatePuzzle({ ...BASE, seed, consolidationRate: 1, maxNestingDepth: 3 });
      for (const lock of Object.values(puzzle.locks)) {
        if (lock.category !== 'container') continue;
        let usedVolume = 0;
        for (const id of lock.contents) {
          const item = puzzle.items[id];
          const childLock = puzzle.locks[id];
          usedVolume += item?.volume ?? childLock?.volume ?? 0;
        }
        expect(usedVolume, `Lock ${lock.name} exceeds capacity ${lock.capacity}`).toBeLessThanOrEqual(lock.capacity);
      }
    }
  });

  it('puzzles remain solvable after consolidation', () => {
    // Import solver in actual test
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/game/__tests__/consolidation.test.ts`
Expected: FAIL (consolidationRate not yet wired)

- [ ] **Step 3: Implement urgency computation helper**

Add to `src/game/generator.ts` before `generatePuzzle`:

```typescript
/** 計算每個實體的急迫度（越小越急） */
function computeUrgency(
  puzzle: { rooms: Record<RoomId, Room>; items: Record<ItemId, Item>; locks: Record<LockId, Lock> },
  roomIds: RoomId[],
): Map<string, number> {
  const urgency = new Map<string, number>();

  // 物品的 urgency = 需要它的鎖所在房間的最小 index
  for (const item of Object.values(puzzle.items)) {
    let minIdx = roomIds.length; // 預設最不急
    for (const lock of Object.values(puzzle.locks)) {
      if (lock.requiredItems.includes(item.id)) {
        const idx = roomIds.indexOf(lock.roomId);
        if (idx >= 0 && idx < minIdx) minIdx = idx;
      }
    }
    urgency.set(item.id, minIdx);
  }

  // 容器鎖的 urgency = contents 中最急的實體的 urgency
  // 如果 contents 為空（Phase B 後每個容器只有一個物品），用自身 roomIndex
  for (const lock of Object.values(puzzle.locks)) {
    if (lock.category !== 'container') continue;
    if (lock.contents.length === 0) {
      urgency.set(lock.id, roomIds.indexOf(lock.roomId));
      continue;
    }
    let minU = roomIds.length;
    for (const id of lock.contents) {
      const u = urgency.get(id) ?? roomIds.length;
      if (u < minU) minU = u;
    }
    urgency.set(lock.id, minU);
  }

  return urgency;
}
```

- [ ] **Step 4: Implement nestingDepth helper**

```typescript
/** 計算如果把 candidate 放入 container 後的最大嵌套深度 */
function currentNestingDepth(lockId: string, locks: Record<LockId, Lock>): number {
  const lock = locks[lockId];
  if (!lock) return 0;
  let maxChild = 0;
  for (const id of lock.contents) {
    if (id in locks) {
      maxChild = Math.max(maxChild, 1 + currentNestingDepth(id, locks));
    }
  }
  return maxChild;
}
```

- [ ] **Step 5: Implement consolidate function**

```typescript
/** Phase C：收納 pass — 把不急的實體塞進急的容器 */
function consolidate(
  ctx: GeneratorContext,
  roomIds: RoomId[],
  config: GeneratorConfig,
): void {
  const maxNesting = config.maxNestingDepth ?? 2;
  const rate = config.consolidationRate ?? 0;
  if (rate <= 0 || maxNesting <= 0) return;

  const urgency = computeUrgency(
    { rooms: ctx.rooms, items: ctx.items, locks: ctx.locks },
    roomIds,
  );

  /** 計算容器已用容積 */
  const usedVolume = (lock: Lock): number => {
    let sum = 0;
    for (const id of lock.contents) {
      const item = ctx.items[id];
      const childLock = ctx.locks[id];
      sum += item?.volume ?? childLock?.volume ?? 0;
    }
    return sum;
  };

  for (const roomId of roomIds) {
    const room = ctx.rooms[roomId]!;

    // 收集地板上的所有實體 ID（物品 + 容器鎖）
    const floorItems = [...room.visibleItems];
    const floorContainers = room.lockIds.filter(id => {
      const lock = ctx.locks[id];
      return lock && lock.category === 'container';
    });
    const allFloor = [...floorItems, ...floorContainers];

    // 按 urgency 降序（最不急的先處理）
    allFloor.sort((a, b) => (urgency.get(b) ?? 0) - (urgency.get(a) ?? 0));

    for (const candidateId of allFloor) {
      if (ctx.rng.next() > rate) continue;

      const candidateUrgency = urgency.get(candidateId) ?? 0;
      const candidateVolume = ctx.items[candidateId]?.volume ?? ctx.locks[candidateId]?.volume ?? 0;
      const isLock = candidateId in ctx.locks;
      const candidateLock = isLock ? ctx.locks[candidateId] : undefined;

      // 空間鎖不能被收納
      if (candidateLock?.category === 'spatial') continue;

      // 尋找合適的容器（urgency 升序 = 最急的優先）
      const sortedContainers = [...floorContainers]
        .filter(id => id !== candidateId && room.lockIds.includes(id))
        .sort((a, b) => (urgency.get(a) ?? 0) - (urgency.get(b) ?? 0));

      for (const containerId of sortedContainers) {
        const container = ctx.locks[containerId]!;
        const containerUrgency = urgency.get(containerId) ?? 0;

        // 容器必須比候選者更急（或同樣急）
        if (containerUrgency > candidateUrgency) break;

        // 容積檢查
        if (usedVolume(container) + candidateVolume > container.capacity) continue;

        // 嵌套深度檢查
        if (isLock) {
          const candidateDepth = currentNestingDepth(candidateId, ctx.locks);
          if (candidateDepth + 1 > maxNesting) continue;
        }

        // 執行收納
        container.contents.push(candidateId);

        // 從地板移除
        if (isLock) {
          const idx = room.lockIds.indexOf(candidateId);
          if (idx !== -1) room.lockIds.splice(idx, 1);
        } else {
          const idx = room.visibleItems.indexOf(candidateId);
          if (idx !== -1) room.visibleItems.splice(idx, 1);
        }

        // 更新容器的 urgency（可能因為吸收了更急的東西而變化）
        if (candidateUrgency < containerUrgency) {
          urgency.set(containerId, candidateUrgency);
        }

        break;
      }
    }
  }
}
```

- [ ] **Step 6: Wire consolidate into generatePuzzle**

Replace:
```typescript
export function generatePuzzle(config: GeneratorConfig): PuzzleDefinition {
  resetIdCounter();

  const rng = new SeededRandom(config.seed);
  const { ctx, roomIds, startRoomId, exitLockId, floorItems } = generateRoomSkeleton(config, rng);
  generatePuzzleContent(config, ctx, roomIds, floorItems);

  return {
```
With:
```typescript
export function generatePuzzle(config: GeneratorConfig): PuzzleDefinition {
  resetIdCounter();

  const rng = new SeededRandom(config.seed);
  const { ctx, roomIds, startRoomId, exitLockId, floorItems } = generateRoomSkeleton(config, rng);
  generatePuzzleContent(config, ctx, roomIds, floorItems);
  consolidate(ctx, roomIds, config);

  return {
```

- [ ] **Step 7: Run consolidation tests**

Run: `npx vitest run src/game/__tests__/consolidation.test.ts`
Expected: Most tests pass

- [ ] **Step 8: Run all tests including solvability**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 9: Commit**

```bash
git add src/game/generator.ts src/game/__tests__/consolidation.test.ts
git commit -m "feat: Phase C consolidation pass — nesting + multi-item containers"
```

---

### Task 8: Bugfix — reuseRate + DEFAULT_CONFIG

**Files:**
- Modify: `src/hooks/useGameState.ts`

- [ ] **Step 1: Add missing config defaults**

Replace:
```typescript
export const DEFAULT_CONFIG: GeneratorConfig = {
  targetDepth: 4,
  maxRooms: 3,
  compositeRate: 0.3,
  depthStaggerVariance: 1.0,
  keySpreadRate: 0.5,
  crossRoomRate: 0.3,
};
```
With:
```typescript
export const DEFAULT_CONFIG: GeneratorConfig = {
  targetDepth: 4,
  maxRooms: 3,
  compositeRate: 0.3,
  depthStaggerVariance: 1.0,
  keySpreadRate: 0.5,
  crossRoomRate: 0.3,
  reuseRate: 0.3,
  maxNestingDepth: 2,
  consolidationRate: 0.5,
};
```

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useGameState.ts
git commit -m "fix: add reuseRate, maxNestingDepth, consolidationRate to DEFAULT_CONFIG"
```

---

### Task 9: UI Settings — new sliders

**Files:**
- Modify: `src/components/SettingsModal.tsx`

- [ ] **Step 1: Add new sliders to SLIDERS array**

After the existing `crossRoomRate` entry, add:

```typescript
  { key: 'reuseRate', label: '工具復用率', desc: '已有工具被其他鎖重複使用的機率', min: 0, max: 1, step: 0.1, color: 'accent-orange-500' },
  { key: 'maxNestingDepth', label: '容器嵌套層數', desc: '容器最大嵌套深度（0=不嵌套）', min: 0, max: 5, step: 1, color: 'accent-violet-500' },
  { key: 'consolidationRate', label: '收納密度', desc: '越高越多東西藏在容器裡', min: 0, max: 1, step: 0.1, color: 'accent-teal-500' },
```

- [ ] **Step 2: Update NumericConfigKey type**

Replace:
```typescript
type NumericConfigKey = 'targetDepth' | 'maxRooms' | 'compositeRate' | 'depthStaggerVariance' | 'keySpreadRate' | 'crossRoomRate';
```
With:
```typescript
type NumericConfigKey = 'targetDepth' | 'maxRooms' | 'compositeRate' | 'depthStaggerVariance' | 'keySpreadRate' | 'crossRoomRate' | 'reuseRate' | 'maxNestingDepth' | 'consolidationRate';
```

- [ ] **Step 3: Run type-check and dev server**

Run: `npx tsc --noEmit`
Expected: Clean

- [ ] **Step 4: Commit**

```bash
git add src/components/SettingsModal.tsx
git commit -m "feat: add reuseRate, maxNestingDepth, consolidationRate sliders to settings"
```

---

### Task 10: Graph Layout — Room Grouping + Container Sub-groups

**Files:**
- Modify: `src/game/graph-layout.ts`
- Modify: `src/components/CanvasGraph.tsx`

- [ ] **Step 1: Add roomId and containerId to LayoutNode**

In `LayoutNode` interface, add:
```typescript
  roomId: string;
  containerId?: string;  // parent container lock ID, if nested
```

- [ ] **Step 2: Add RoomGroup and ContainerGroup to GraphLayout**

```typescript
export interface RoomGroup {
  roomId: string;
  roomName: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ContainerGroup {
  lockId: string;
  lockName: string;
  roomId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GraphLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  bounds: { maxX: number; maxY: number };
  roomGroups: RoomGroup[];
  containerGroups: ContainerGroup[];
}
```

- [ ] **Step 3: Populate roomId on all nodes in buildGraphLayout**

When building nodes, set:
```typescript
// For items:
roomId: item.initialRoom,

// For locks:
roomId: lock.roomId,
```

- [ ] **Step 4: Build containerId mapping**

After building nodes, compute which nodes are inside containers:
```typescript
  const containerMap = new Map<string, string>(); // entityId → containerId
  for (const lock of allLocks) {
    for (const id of lock.contents) {
      containerMap.set(id, lock.id);
    }
  }
```

Set `containerId` on each node:
```typescript
  containerId: containerMap.get(id),
```

- [ ] **Step 5: Compute room groups after positioning**

After all nodes are positioned, compute bounding boxes:
```typescript
  const roomGroups: RoomGroup[] = [];
  const PAD = 20;
  for (const roomId of Object.keys(puzzle.rooms)) {
    const roomNodes = layoutNodes.filter(n => n.roomId === roomId);
    if (roomNodes.length === 0) continue;
    const minX = Math.min(...roomNodes.map(n => n.x)) - PAD;
    const minY = Math.min(...roomNodes.map(n => n.y)) - PAD;
    const mX = Math.max(...roomNodes.map(n => n.x + NODE_W)) + PAD;
    const mY = Math.max(...roomNodes.map(n => n.y + NODE_H)) + PAD;
    roomGroups.push({
      roomId,
      roomName: puzzle.rooms[roomId]!.name,
      x: minX, y: minY,
      width: mX - minX, height: mY - minY,
    });
  }
```

(Where `NODE_W = 160` and `NODE_H = 60` are defined as constants in the layout file.)

- [ ] **Step 6: Compute container groups similarly**

```typescript
  const containerGroups: ContainerGroup[] = [];
  for (const lock of allLocks) {
    if (lock.category !== 'container' || lock.contents.length === 0) continue;
    const childNodes = layoutNodes.filter(n => containerMap.get(n.id) === lock.id);
    const lockNode = layoutNodes.find(n => n.id === lock.id);
    const allGroupNodes = lockNode ? [lockNode, ...childNodes] : childNodes;
    if (allGroupNodes.length === 0) continue;
    const minX = Math.min(...allGroupNodes.map(n => n.x)) - PAD / 2;
    const minY = Math.min(...allGroupNodes.map(n => n.y)) - PAD / 2;
    const mX = Math.max(...allGroupNodes.map(n => n.x + NODE_W)) + PAD / 2;
    const mY = Math.max(...allGroupNodes.map(n => n.y + NODE_H)) + PAD / 2;
    containerGroups.push({
      lockId: lock.id,
      lockName: lock.name,
      roomId: lock.roomId,
      x: minX, y: minY,
      width: mX - minX, height: mY - minY,
    });
  }
```

- [ ] **Step 7: Return groups in GraphLayout**

```typescript
  return { nodes: layoutNodes, edges, bounds: { maxX, maxY }, roomGroups, containerGroups };
```

- [ ] **Step 8: Render room groups in CanvasGraph.tsx**

Add before the `{/* Nodes */}` section in the transform layer:

```tsx
        {/* Room groups */}
        {layout.roomGroups.map(group => (
          <div
            key={`room-${group.roomId}`}
            style={{ left: group.x, top: group.y, width: group.width, height: group.height }}
            className="absolute border-2 border-blue-800/40 rounded-xl bg-blue-950/10 z-0 pointer-events-none"
          >
            <div className="absolute -top-5 left-2 text-[10px] text-blue-400/60 font-bold">
              {group.roomName}
            </div>
          </div>
        ))}

        {/* Container groups */}
        {layout.containerGroups.map(group => (
          <div
            key={`container-${group.lockId}`}
            style={{ left: group.x, top: group.y, width: group.width, height: group.height }}
            className="absolute border-2 border-dashed border-rose-800/30 rounded-lg bg-rose-950/5 z-[5] pointer-events-none"
          />
        ))}
```

- [ ] **Step 9: Run type-check and visual test**

Run: `npx tsc --noEmit`
Expected: Clean

- [ ] **Step 10: Commit**

```bash
git add src/game/graph-layout.ts src/components/CanvasGraph.tsx
git commit -m "feat: graph layout room grouping + container sub-groups"
```

---

### Task 11: Solvability verification + final tests

**Files:**
- Modify: `src/game/__tests__/consolidation.test.ts`
- Modify: `src/game/__tests__/solvability.test.ts`

- [ ] **Step 1: Add solvability test for consolidated puzzles**

In `consolidation.test.ts`, complete the solvability test:

```typescript
import { solvePuzzle } from '../solver';

// ... inside describe block:
  it('puzzles remain solvable after consolidation', () => {
    for (let seed = 0; seed < 100; seed++) {
      const puzzle = generatePuzzle({ ...BASE, seed, consolidationRate: 1, maxNestingDepth: 3 });
      const result = solvePuzzle(puzzle);
      expect(result.solvable, `seed=${seed} not solvable: ${result.steps.join(', ')}`).toBe(true);
    }
  });
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/game/__tests__/
git commit -m "test: solvability verification for consolidated puzzles"
```

---

### Task 12: Final integration test + push

- [ ] **Step 1: Run full type-check**

Run: `npx tsc --noEmit`
Expected: Clean

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Manual smoke test**

Run dev server and verify:
- Puzzle generates without errors
- Settings sliders work (consolidationRate, maxNestingDepth, reuseRate)
- Graph shows room groups and container sub-groups
- Opening a nested container reveals child locks in interaction panel
- Dump output shows nested locks

- [ ] **Step 4: Push**

```bash
git push
```
