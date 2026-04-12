# 小遊戲 + 合成/狀態轉換 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Puzzle Graph system with minigame locks, crafting locks, and stationary tools for state conversion — all mapped onto the existing Item + Lock DAG without new entity types.

**Architecture:** Three features share one core change (Item.pickupable) and one new LockMechanism ('minigame'). Stationary tools are non-pickupable reusable items. Conversion locks and crafting locks use existing 'physical'/'combination' mechanisms. Minigame locks defer unlock until a UI minigame is completed. Generator, solver, engine, templates, and UI all receive targeted updates.

**Tech Stack:** TypeScript, React 19, Vitest, Tailwind CSS 4

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/game/types.ts` | Add `pickupable` to Item/KeyTemplate, `minigameConfig` to Lock, `minigameType` to LockTemplate, new LockMechanism |
| Modify | `src/game/templates.ts` | Add stationary tools, conversion locks, crafting locks, minigame locks to catalogs |
| Create | `src/game/minigames.ts` | MinigameRegistry: generate random configs per minigame type (like PasswordFormatPool) |
| Modify | `src/game/generator.ts` | Pass pickupable through item creation; generate minigameConfig; stationary tool room constraint in canWrap |
| Modify | `src/game/solver.ts` | Stationary items checked by room presence, not inventory |
| Modify | `src/game/engine.ts` | Block take for non-pickupable; useItemOnLock checks room floor; minigame two-phase unlock; completeMinigame function |
| Modify | `src/game/dump.ts` | Mark stationary items `[STATION]`, minigame locks `[MINI]` |
| Modify | `src/components/InteractionPanel.tsx` | Stationary items show no "take" button; minigame button; launch MinigameModal |
| Create | `src/components/MinigameModal.tsx` | Dispatch to correct minigame component by type |
| Create | `src/components/minigames/PipePuzzle.tsx` | Pipe rotation puzzle (NxN grid, seeded generation) |
| Create | `src/components/minigames/WiringPuzzle.tsx` | Wire matching puzzle (N pairs, seeded generation) |
| Modify | `src/components/CanvasGraph.tsx` | Orange color for minigame locks, station marker for non-pickupable items |
| Modify | `src/hooks/useGameState.ts` | Expose completeMinigame action |
| Modify | `src/components/App.tsx` | Pass completeMinigame to InteractionPanel |
| Create | `src/game/__tests__/pickupable.test.ts` | Tests for stationary item mechanics |
| Create | `src/game/__tests__/minigame.test.ts` | Tests for minigame lock generation and solver |

---

### Task 1: Type System Extensions

**Files:**
- Modify: `src/game/types.ts`

- [ ] **Step 1: Add `pickupable` to Item interface**

In `src/game/types.ts`, add `pickupable` field to `Item` after `volume`:

```ts
export interface Item {
  id: ItemId;
  name: string;
  description: string;
  type: ItemType;
  reusable: boolean;
  initialRoom: RoomId;
  volume: number;
  pickupable: boolean;  // NEW: false for stationary tools (water basin, workbench)
}
```

- [ ] **Step 2: Add `pickupable` to KeyTemplate interface**

In `src/game/types.ts`, add optional `pickupable` to `KeyTemplate` after `volume`:

```ts
export interface KeyTemplate {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  reusable: boolean;
  volume: number;
  pickupable?: boolean;  // NEW: omit or true = pickupable; false = stationary
}
```

- [ ] **Step 3: Add `'minigame'` to LockMechanism and new types to Lock**

In `src/game/types.ts`:

```ts
export type LockMechanism = 'physical' | 'password' | 'hidden' | 'combination' | 'minigame';

export interface MinigameConfig {
  type: string;                     // e.g. 'pipe_puzzle', 'wiring'
  seed: number;                     // random seed for procedural generation
  params: Record<string, unknown>;  // game-specific params (gridSize, pairCount, etc.)
}
```

Add `minigameConfig` to `Lock` after `passwordHint`:

```ts
export interface Lock {
  // ...existing fields up to passwordHint...
  minigameConfig?: MinigameConfig;  // NEW: only for mechanism='minigame'
  isLocked: boolean;
  isExit: boolean;
}
```

- [ ] **Step 4: Add `minigameType` to LockTemplate**

In `src/game/types.ts`, add to `LockTemplate` after `variations`:

```ts
export interface LockTemplate {
  // ...existing fields...
  variations: FamilyVariation[];
  minigameType?: string;  // NEW: for mechanism='minigame', maps to MinigameRegistry key
}
```

- [ ] **Step 5: Run type check**

Run: `npx tsc --noEmit`
Expected: Compilation errors in files that create Item/Lock objects without `pickupable` — this is expected, we'll fix them in subsequent tasks.

- [ ] **Step 6: Commit**

```bash
git add src/game/types.ts
git commit -m "feat: extend type system with pickupable, minigameConfig, minigame mechanism"
```

---

### Task 2: Update Generator — pickupable propagation

**Files:**
- Modify: `src/game/generator.ts`

- [ ] **Step 1: Update `createItem` to accept and set `pickupable`**

In `GeneratorContext.createItem` (around line 77), add `pickupable` parameter:

```ts
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
```

- [ ] **Step 2: Update `getOrCreateReusableItem` to pass pickupable**

```ts
getOrCreateReusableItem(name: string, volume: number, pickupable: boolean = true): ItemId {
  const cached = this.reusableItemCache[name];
  if (cached) return cached;
  const item = this.createItem(name, true, volume, undefined, pickupable);
  this.reusableItemCache[name] = item.id;
  return item.id;
}
```

- [ ] **Step 3: Update `createConsumableItem` to pass pickupable**

```ts
createConsumableItem(name: string, volume: number, pickupable: boolean = true): Item {
  this.consumableCount[name] = (this.consumableCount[name] ?? 0) + 1;
  let keyName = name;
  if (this.consumableCount[name]! > 1) {
    keyName = `${name} (${String.fromCharCode(64 + this.consumableCount[name]!)})`;
  }
  return this.createItem(keyName, false, volume, undefined, pickupable);
}
```

- [ ] **Step 4: Update `enqueueKeysForLock` to read pickupable from KeyTemplate**

In `enqueueKeysForLock`, where keys are created (around line 282-289), read `pickupable` from keyTpl:

```ts
const keyPickupable = keyTpl.pickupable !== false;  // default true

if (keyTpl.reusable) {
  keyId = ctx.getOrCreateReusableItem(keyTpl.name, keyTpl.volume, keyPickupable);
} else {
  const item = ctx.createConsumableItem(keyTpl.name, keyTpl.volume, keyPickupable);
  keyId = item.id;
  // ...existing password logic...
}
```

- [ ] **Step 5: Update Phase A key creation similarly**

In `generateRoomSkeleton` (around line 388-393), same pattern:

```ts
const keyPickupable = keyTpl.pickupable !== false;
if (keyTpl.reusable) {
  keyId = ctx.getOrCreateReusableItem(keyTpl.name, keyTpl.volume, keyPickupable);
} else {
  keyId = ctx.createConsumableItem(keyTpl.name, keyTpl.volume, keyPickupable).id;
}
```

- [ ] **Step 6: Update exit key creation**

In `generateRoomSkeleton` (around line 427), the exit key already uses `createItem` directly:

```ts
const exitKey = ctx.createItem('終極逃生卡', false, 0.5, '帶有最高權限的特殊磁卡。', true);
```

- [ ] **Step 7: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS (all Item creations now include pickupable)

- [ ] **Step 8: Commit**

```bash
git add src/game/generator.ts
git commit -m "feat: propagate pickupable through generator item creation"
```

---

### Task 3: Stationary Tool Room Constraint in Generator

**Files:**
- Modify: `src/game/generator.ts`

- [ ] **Step 1: Add stationary tool constraint to `canWrap` in Phase B**

In `generatePuzzleContent`, after the existing `canWrap` check (around line 480-489), add an additional check for stationary tools:

```ts
const canWrap = lockTemplate.requiredKeys.every(keyTplId => {
  const keyTpl = findKeyTemplate(keyTplId)!;
  if (!keyTpl.reusable) return true;
  if (ctx.reusableItemCache[keyTpl.name] === target.itemId) return false;
  const existingId = ctx.reusableItemCache[keyTpl.name];
  if (!existingId) return true;
  const placedRoom = ctx.items[existingId]!.initialRoom;
  if (!placedRoom) return true;
  // NEW: stationary tool must be in the same room as the lock
  if (keyTpl.pickupable === false && placedRoom !== target.currentRoom) return false;
  return eligibleRooms.has(placedRoom);
});
```

- [ ] **Step 2: In `enqueueKeysForLock`, place stationary tools in the lock's room**

When a new stationary key is being placed (not reused), override the room selection to force same-room placement. After the existing `pickRoom` call (around line 336), add:

```ts
// Stationary tools must be in the same room as the lock that needs them
let keyRoomId: RoomId;
if (!keyPickupable) {
  keyRoomId = target.currentRoom;
} else {
  keyRoomId = pickRoom(eligible, preferredIdx >= 0 ? preferredIdx : eligible.length - 1, crossRoomRate, ctx);
}
```

Replace the existing `const keyRoomId = pickRoom(...)` line with this block.

- [ ] **Step 3: Run tests**

Run: `npx vitest run --reporter=verbose`
Expected: All existing tests PASS (no stationary templates exist yet, so no behavioral change)

- [ ] **Step 4: Commit**

```bash
git add src/game/generator.ts
git commit -m "feat: add stationary tool room constraint in generator canWrap and placement"
```

---

### Task 4: MinigameRegistry

**Files:**
- Create: `src/game/minigames.ts`

- [ ] **Step 1: Create the minigame registry**

Create `src/game/minigames.ts`:

```ts
import type { MinigameConfig } from './types';
import type { SeededRandom } from './utils';

// ─── Minigame Generator Interface ───

export interface MinigameGenerator {
  generate(rng: SeededRandom): MinigameConfig;
}

// ─── Pipe Puzzle Generator ───

const pipePuzzleGenerator: MinigameGenerator = {
  generate(rng) {
    const gridSize = 4 + rng.nextInt(2);  // 4x4 or 5x5
    return {
      type: 'pipe_puzzle',
      seed: rng.nextInt(1_000_000),
      params: { gridSize },
    };
  },
};

// ─── Wiring Puzzle Generator ───

const wiringPuzzleGenerator: MinigameGenerator = {
  generate(rng) {
    const pairCount = 3 + rng.nextInt(3);  // 3-5 pairs
    return {
      type: 'wiring',
      seed: rng.nextInt(1_000_000),
      params: { pairCount },
    };
  },
};

// ─── Registry ───

const MINIGAME_REGISTRY: Record<string, MinigameGenerator> = {
  pipe_puzzle: pipePuzzleGenerator,
  wiring: wiringPuzzleGenerator,
};

export function generateMinigameConfig(type: string, rng: SeededRandom): MinigameConfig {
  const generator = MINIGAME_REGISTRY[type];
  if (!generator) throw new Error(`Unknown minigame type: ${type}`);
  return generator.generate(rng);
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/game/minigames.ts
git commit -m "feat: add MinigameRegistry with pipe_puzzle and wiring generators"
```

---

### Task 5: Generator — Minigame Lock Support

**Files:**
- Modify: `src/game/generator.ts`

- [ ] **Step 1: Import generateMinigameConfig**

At the top of `generator.ts`, add:

```ts
import { generateMinigameConfig } from './minigames';
```

- [ ] **Step 2: Generate minigameConfig when creating minigame locks**

In `enqueueKeysForLock`, after `lock.mechanism = lockTemplate.mechanism;` (line 270), add:

```ts
lock.mechanism = lockTemplate.mechanism;

// NEW: generate minigame config for minigame locks
if (lockTemplate.mechanism === 'minigame' && lockTemplate.minigameType) {
  lock.minigameConfig = generateMinigameConfig(lockTemplate.minigameType, ctx.rng);
}
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/game/generator.ts
git commit -m "feat: generator creates minigameConfig for minigame mechanism locks"
```

---

### Task 6: New Templates — Stationary Tools, Conversion, Crafting, Minigame

**Files:**
- Modify: `src/game/templates.ts`

- [ ] **Step 1: Add stationary tool KeyTemplates**

In `KEY_TEMPLATES`, add after the existing tool entries (after bolt_cutter):

```ts
// 固定工具（不可拾取）
{ id: 'water_basin', name: '水盆', description: '一個裝滿清水的石盆，嵌在桌面上。', type: 'tool', reusable: true, pickupable: false, volume: 3 },
{ id: 'workbench', name: '工作台', description: '一張堅固的金屬工作台，上面有各種夾具和工具。', type: 'tool', reusable: true, pickupable: false, volume: 5 },
```

- [ ] **Step 2: Add new consumable KeyTemplates for crafting/minigame**

In `KEY_TEMPLATES`, add after the stationary tools:

```ts
// 合成零件
{ id: 'battery', name: '電池', description: '一顆標準的AA電池。', type: 'key', reusable: false, volume: 0.5 },
{ id: 'pipe_part', name: '水管零件', description: '一段金屬水管，看起來是某個系統的一部分。', type: 'key', reusable: false, volume: 1 },
{ id: 'wire_spool', name: '電線捲', description: '一捲絕緣電線。', type: 'key', reusable: false, volume: 1 },
// 轉換產物（作為 conversion lock 的 contents 使用）
{ id: 'wet_cloth', name: '濕布', description: '一塊浸濕的布，可以用來擦拭東西。', type: 'tool', reusable: true, volume: 1 },
```

- [ ] **Step 3: Add conversion LockTemplates**

In `LOCK_TEMPLATES`, add after the existing container locks and before spatial locks:

```ts
// ── 狀態轉換鎖 ──
{
  id: 'dry_cloth_soak', name: '乾布',
  lockedDescription: '一塊乾燥的布，如果能浸濕就好了。',
  unlockDescription: '你把布浸入水中擰乾，現在它變成了實用的濕布。',
  category: 'container', mechanism: 'physical',
  capacity: 4, volume: 2,
  tags: ['conversion', 'water'],
  requiredKeys: ['water_basin'],
  variations: [
    { name: '乾布', lockMsg: '一塊乾燥的布，如果能浸濕就好了。', unlockMsg: '你把布浸入水中擰乾，現在它變成了實用的濕布。' },
    { name: '空水壺', lockMsg: '一個空的水壺，需要裝水才有用。', unlockMsg: '你把水壺浸入水中，灌滿了清水。' },
  ],
},
```

- [ ] **Step 4: Add crafting LockTemplates**

```ts
// ── 合成鎖 ──
{
  id: 'dead_flashlight_craft', name: '沒電的手電筒',
  lockedDescription: '一把手電筒，電池槽是空的，按下開關毫無反應。',
  unlockDescription: '你裝入電池，手電筒嗡地一聲亮了起來！',
  category: 'container', mechanism: 'combination',
  capacity: 4, volume: 3,
  tags: ['crafting', 'assembly'],
  requiredKeys: ['battery', 'battery'],
  variations: [
    { name: '沒電的手電筒', lockMsg: '手電筒電池槽是空的。', unlockMsg: '你裝入電池，手電筒亮了起來！', partialMsg: '還需要更多電池。' },
  ],
},
```

- [ ] **Step 5: Add minigame LockTemplates**

```ts
// ── 小遊戲鎖 ──
{
  id: 'pipe_control_panel', name: '管線控制台',
  lockedDescription: '一個複雜的管線系統，管道破損脫落，需要零件修復並正確連接。',
  unlockDescription: '水流順利通過管線，系統啟動了！密封艙門隨之打開。',
  category: 'container', mechanism: 'minigame',
  capacity: 8, volume: 5,
  tags: ['minigame', 'mechanical'],
  requiredKeys: ['pipe_part', 'pipe_part'],
  minigameType: 'pipe_puzzle',
  variations: [
    { name: '管線控制台', lockMsg: '管線系統損壞，需要零件修復並正確連接。', unlockMsg: '水流通過管線，系統啟動！', partialMsg: '還缺少水管零件。' },
    { name: '液壓管路面板', lockMsg: '液壓管路斷裂，需要修補零件。', unlockMsg: '液壓系統恢復正常，機構開始運作。', partialMsg: '管路還沒修好。' },
  ],
},
{
  id: 'wiring_junction', name: '電路接線盒',
  lockedDescription: '一個電路接線盒，電線被剪斷了，需要電線和正確的接線才能恢復電力。',
  unlockDescription: '電流恢復，指示燈全部亮起，電磁鎖解除了！',
  category: 'container', mechanism: 'minigame',
  capacity: 8, volume: 5,
  tags: ['minigame', 'electronic'],
  requiredKeys: ['wire_spool', 'wire_spool'],
  minigameType: 'wiring',
  variations: [
    { name: '電路接線盒', lockMsg: '接線盒的電線被剪斷了。', unlockMsg: '電流恢復，電磁鎖解除！', partialMsg: '還需要更多電線。' },
    { name: '配電盤', lockMsg: '配電盤的線路一片混亂。', unlockMsg: '線路接通，電力恢復正常。', partialMsg: '還缺電線。' },
  ],
},
```

- [ ] **Step 6: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/game/templates.ts
git commit -m "feat: add stationary tools, conversion, crafting, and minigame lock templates"
```

---

### Task 7: Solver — Stationary Item Support

**Files:**
- Modify: `src/game/solver.ts`
- Create: `src/game/__tests__/pickupable.test.ts`

- [ ] **Step 1: Write failing test for stationary item solver**

Create `src/game/__tests__/pickupable.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { solvePuzzle } from '../solver';
import type { PuzzleDefinition } from '../types';

describe('stationary item (pickupable=false) solver', () => {
  it('solver can use stationary tool in the same room to unlock a lock', () => {
    const puzzle: PuzzleDefinition = {
      rooms: {
        r0: { id: 'r0', name: 'Start', description: '', lockIds: ['lock1'], visibleItems: ['basin'], capacity: 50 },
      },
      items: {
        basin: { id: 'basin', name: '水盆', description: '', type: 'tool', reusable: true, initialRoom: 'r0', volume: 3, pickupable: false },
      },
      locks: {
        lock1: {
          id: 'lock1', name: '乾布', description: '', lockedDescription: '', unlockDescription: '',
          category: 'container', mechanism: 'physical', roomId: 'r0',
          requiredItems: ['basin'], insertedItems: [], contents: [],
          capacity: 4, volume: 2, isLocked: true, isExit: true,
        },
      },
      startRoomId: 'r0',
      exitLockId: 'lock1',
      seed: 1,
    };

    const result = solvePuzzle(puzzle);
    expect(result.solvable).toBe(true);
  });

  it('solver cannot use stationary tool from a different unreachable room', () => {
    const puzzle: PuzzleDefinition = {
      rooms: {
        r0: { id: 'r0', name: 'Start', description: '', lockIds: ['lock1'], visibleItems: [], capacity: 50 },
        r1: { id: 'r1', name: 'Other', description: '', lockIds: [], visibleItems: ['basin'], capacity: 50 },
      },
      items: {
        basin: { id: 'basin', name: '水盆', description: '', type: 'tool', reusable: true, initialRoom: 'r1', volume: 3, pickupable: false },
      },
      locks: {
        lock1: {
          id: 'lock1', name: '乾布', description: '', lockedDescription: '', unlockDescription: '',
          category: 'container', mechanism: 'physical', roomId: 'r0',
          requiredItems: ['basin'], insertedItems: [], contents: [],
          capacity: 4, volume: 2, isLocked: true, isExit: true,
        },
      },
      startRoomId: 'r0',
      exitLockId: 'lock1',
      seed: 1,
    };

    const result = solvePuzzle(puzzle);
    expect(result.solvable).toBe(false);
  });

  it('solver does not pick up non-pickupable items', () => {
    const puzzle: PuzzleDefinition = {
      rooms: {
        r0: { id: 'r0', name: 'Start', description: '', lockIds: ['exit'], visibleItems: ['basin', 'key1'], capacity: 50 },
      },
      items: {
        basin: { id: 'basin', name: '水盆', description: '', type: 'tool', reusable: true, initialRoom: 'r0', volume: 3, pickupable: false },
        key1: { id: 'key1', name: '鑰匙', description: '', type: 'key', reusable: false, initialRoom: 'r0', volume: 1, pickupable: true },
      },
      locks: {
        exit: {
          id: 'exit', name: '出口', description: '', lockedDescription: '', unlockDescription: '',
          category: 'spatial', mechanism: 'physical', roomId: 'r0',
          requiredItems: ['key1'], insertedItems: [], contents: [],
          capacity: 0, volume: 0, isLocked: true, isExit: true,
        },
      },
      startRoomId: 'r0',
      exitLockId: 'exit',
      seed: 1,
    };

    const result = solvePuzzle(puzzle);
    expect(result.solvable).toBe(true);
    // basin should NOT appear in pickup steps
    const basinPickup = result.steps.find(s => s.includes('水盆'));
    expect(basinPickup).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/game/__tests__/pickupable.test.ts --reporter=verbose`
Expected: FAIL — current solver doesn't know about `pickupable`

- [ ] **Step 3: Update solver — skip non-pickupable items in pickup loop**

In `solvePuzzle` in `src/game/solver.ts`, modify the Step 1 pickup loop (around line 60):

```ts
// Step 1：拾取所有可到達房間的地板物品
for (const roomId of reachableRooms) {
  const room = rooms[roomId];
  if (!room) continue;
  for (const itemId of room.visibleItems) {
    if (!inventory.has(itemId)) {
      const item = items[itemId];
      if (item && !item.pickupable) continue;  // NEW: skip stationary items
      inventory.add(itemId);
      steps.push(`pickup: ${items[itemId]?.name ?? itemId} from ${room.name}`);
      progress = true;
    }
  }
}
```

- [ ] **Step 4: Update solver — check stationary items by room presence**

In the canUnlock check (around line 79):

```ts
const canUnlock = lock.requiredItems.every(id => {
  if (inventory.has(id)) return true;
  // NEW: stationary items are usable if player is in the same room
  const item = items[id];
  return item != null && !item.pickupable && reachableRooms.has(item.initialRoom);
});
```

Note: for stationary items, we also need to check that the lock is in a room the player can reach AND the stationary item's room matches. Since we already check `reachableRooms.has(lock.roomId)` before this block, and the generator ensures stationary tools are in the same room as their lock, checking `reachableRooms.has(item.initialRoom)` is sufficient.

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/game/__tests__/pickupable.test.ts --reporter=verbose`
Expected: All 3 tests PASS

- [ ] **Step 6: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/game/solver.ts src/game/__tests__/pickupable.test.ts
git commit -m "feat: solver supports stationary items (pickupable=false) via room presence check"
```

---

### Task 8: Engine — Stationary Items & Minigame Two-Phase Unlock

**Files:**
- Modify: `src/game/engine.ts`

- [ ] **Step 1: Block take for non-pickupable items**

In `takeItem` (around line 208), add pickupable check after the room presence check:

```ts
export function takeItem(state: GameState, itemId: ItemId): GameState {
  const newState = cloneState(state);
  const room = newState.puzzle.rooms[newState.currentRoomId]!;

  if (!room.visibleItems.includes(itemId)) {
    addLog(newState, 'error', '這裡沒有這個物品。');
    return newState;
  }

  // NEW: check pickupable
  const item = newState.puzzle.items[itemId];
  if (item && !item.pickupable) {
    addLog(newState, 'error', `${item.name} 固定在這裡，無法拿起。`);
    return newState;
  }

  room.visibleItems = room.visibleItems.filter(id => id !== itemId);
  newState.inventory.push(itemId);
  addLog(newState, 'success', `你拿起了 ${newState.puzzle.items[itemId]!.name}。`);
  return newState;
}
```

- [ ] **Step 2: Update `useItemOnLock` to check room floor for stationary items**

In `useItemOnLock` (around line 223), after the lock and item null checks, update the inventory check:

Replace the implicit assumption that itemId is in inventory. After the existing `lock.insertedItems.includes(itemId)` check (around line 243), we need to ensure the item is accessible. Add before the `lock.insertedItems.push(itemId)` line:

```ts
// NEW: check if player has access to the item (inventory OR stationary in same room)
const room = newState.puzzle.rooms[newState.currentRoomId]!;
const hasItem = newState.inventory.includes(itemId)
  || (!item.pickupable && room.visibleItems.includes(itemId));

if (!hasItem) {
  addLog(newState, 'error', `你沒有 ${item.name}。`);
  return newState;
}
```

- [ ] **Step 3: Add minigame two-phase unlock logic**

In `useItemOnLock`, where `performUnlock` is called after all items are inserted (around line 251-257):

```ts
const allInserted = lock.requiredItems.every(reqId => lock.insertedItems.includes(reqId));
if (allInserted) {
  // NEW: minigame locks don't auto-unlock — they wait for UI completion
  if (lock.mechanism === 'minigame') {
    addLog(newState, 'info', '所有零件就位！小遊戲已啟動，請完成挑戰來解鎖。');
  } else {
    performUnlock(lock, newState);
  }
} else if (lock.requiredItems.length > 1) {
  addLog(newState, 'info', lock.partialDescription ?? `${lock.name} 似乎還需要其他東西...`);
  addLog(newState, 'info', `(${lock.insertedItems.length}/${lock.requiredItems.length})`);
}
```

- [ ] **Step 4: Add `completeMinigame` function**

At the end of the atomic action functions section (before the MUD command system), add:

```ts
export function completeMinigame(state: GameState, lockId: LockId): GameState {
  const newState = cloneState(state);
  const lock = newState.puzzle.locks[lockId];

  if (!lock || !lock.isLocked || lock.mechanism !== 'minigame') {
    return newState;
  }

  const allInserted = lock.requiredItems.every(reqId => lock.insertedItems.includes(reqId));
  if (!allInserted) {
    addLog(newState, 'error', '還沒有收齊所有零件。');
    return newState;
  }

  addLog(newState, 'success', '小遊戲完成！');
  performUnlock(lock, newState);
  return newState;
}
```

- [ ] **Step 5: Update MUD `use` command for stationary items and minigame**

In the `use` case of `executeCommand` (around line 394-428):

After `const item = findInventoryItem(match[1]!, newState);`, add fallback for stationary items in room:

```ts
let item = findInventoryItem(match[1]!, newState);
// NEW: also check room floor for stationary items
if (!item) {
  const roomItem = findVisibleItem(match[1]!, newState);
  if (roomItem && !roomItem.pickupable) {
    item = roomItem;
  }
}
if (!item) { addLog(newState, 'error', `你身上沒有「${match[1]}」。`); break; }
```

In the same `use` case, update the unlock check to handle minigame (after line 421):

```ts
if (lock.requiredItems.every(reqId => lock.insertedItems.includes(reqId))) {
  if (lock.mechanism === 'minigame') {
    addLog(newState, 'info', '所有零件就位！小遊戲已啟動，請完成挑戰來解鎖。');
  } else {
    performUnlock(lock, newState);
  }
} else if (lock.requiredItems.length > 1) {
  addLog(newState, 'info', lock.partialDescription ?? `${lock.name} 似乎還需要其他東西...`);
}
```

- [ ] **Step 6: Update MUD `take` command for stationary items**

In the `take` case (around line 383-392), add pickupable check:

```ts
case 'take':
case 't': {
  if (!rest) { addLog(newState, 'error', '你要拿什麼？'); break; }
  const item = findVisibleItem(rest, newState);
  if (!item) { addLog(newState, 'error', `地上沒有「${rest}」。`); break; }
  // NEW: check pickupable
  if (!item.pickupable) {
    addLog(newState, 'error', `${item.name} 固定在這裡，無法拿起。`);
    break;
  }
  const room = newState.puzzle.rooms[newState.currentRoomId]!;
  room.visibleItems = room.visibleItems.filter(id => id !== item.id);
  newState.inventory.push(item.id);
  addLog(newState, 'success', `你拿起了 ${item.name}。`);
  break;
}
```

- [ ] **Step 7: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add src/game/engine.ts
git commit -m "feat: engine supports stationary items, minigame two-phase unlock, completeMinigame"
```

---

### Task 9: Dump — Mark Stationary and Minigame

**Files:**
- Modify: `src/game/dump.ts`

- [ ] **Step 1: Update item labels to show stationary marker**

In `dumpPuzzle`, where item labels are rendered (in the CONTAINER LOCKS section, around line 89 and line 98-102, and FLOOR section around line 116-118), update the label function to include `[STATION]` for non-pickupable items:

Find all occurrences of the pattern `item.reusable ? '[TOOL]' : ''` and replace with a helper. Add at the top of `dumpPuzzle`:

```ts
const itemTag = (item: { reusable: boolean; pickupable: boolean }) => {
  if (!item.pickupable) return '[STATION]';
  if (item.reusable) return '[TOOL]';
  return '';
};
```

Then replace all `item.reusable ? '[TOOL]' : ''` with `itemTag(item)` throughout the function. There are 6 occurrences:
- Line 64 (spatial locks)
- Line 89 (container lock contents)
- Line 101 (container lock required items)
- Line 118 (floor items)
- Line 72 (exit lock)
- Line 129 (reusable tools)

- [ ] **Step 2: Mark minigame locks in container locks section**

In the container locks section, update the line that outputs each lock (around line 107). Add `[MINI]` marker for minigame mechanism:

```ts
const miniTag = lock.mechanism === 'minigame' ? '[MINI] ' : '';
lines.push(`  R${roomIdx}: ${miniTag}{${reqStr} → ${hidesLabels}}`);
```

- [ ] **Step 3: Run dump test**

Run: `npx vitest run src/game/__tests__/dump.test.ts --reporter=verbose`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/game/dump.ts
git commit -m "feat: dump marks stationary items [STATION] and minigame locks [MINI]"
```

---

### Task 10: Minigame + Stationary Solvability Tests

**Files:**
- Create: `src/game/__tests__/minigame.test.ts`

- [ ] **Step 1: Write solvability tests with new templates**

Create `src/game/__tests__/minigame.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generatePuzzle } from '../generator';
import { solvePuzzle } from '../solver';
import type { GeneratorConfig } from '../types';

const BASE: GeneratorConfig = {
  targetDepth: 4,
  maxRooms: 3,
  compositeRate: 0.3,
  depthStaggerVariance: 1,
  reuseRate: 0.3,
  crossRoomRate: 0.3,
  keySpreadRate: 0.5,
};

describe('minigame + stationary item solvability', () => {
  it('50 puzzles with default config remain solvable (new templates in pool)', () => {
    for (let i = 0; i < 50; i++) {
      const puzzle = generatePuzzle(BASE);
      const result = solvePuzzle(puzzle);
      expect(
        result.solvable,
        `Puzzle #${i} (seed ${puzzle.seed}) not solvable.\nBlocked: ${result.blockedItems.join(', ')}\nSteps:\n${result.steps.slice(-10).join('\n')}`,
      ).toBe(true);
    }
  });

  it('high compositeRate=0.8 with new templates: 50 puzzles solvable', () => {
    const config = { ...BASE, compositeRate: 0.8, targetDepth: 6 };
    for (let i = 0; i < 50; i++) {
      const puzzle = generatePuzzle(config);
      const result = solvePuzzle(puzzle);
      expect(result.solvable, `Puzzle #${i} (seed ${puzzle.seed}) not solvable`).toBe(true);
    }
  });

  it('high reuseRate=0.8 with new templates: 50 puzzles solvable', () => {
    const config = { ...BASE, reuseRate: 0.8, targetDepth: 5 };
    for (let i = 0; i < 50; i++) {
      const puzzle = generatePuzzle(config);
      const result = solvePuzzle(puzzle);
      expect(result.solvable, `Puzzle #${i} (seed ${puzzle.seed}) not solvable`).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run src/game/__tests__/minigame.test.ts --reporter=verbose`
Expected: All 3 tests PASS (if any fail, investigate and fix the generator/solver)

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/game/__tests__/minigame.test.ts
git commit -m "test: add solvability tests for minigame and stationary item templates"
```

---

### Task 11: useGameState — Expose completeMinigame

**Files:**
- Modify: `src/hooks/useGameState.ts`

- [ ] **Step 1: Import and expose completeMinigame**

In `src/hooks/useGameState.ts`, add import:

```ts
import {
  // ...existing imports...
  completeMinigame as engineCompleteMinigame,
} from '../game/engine';
```

Add the action inside `useGameState`:

```ts
const completeMinigameAction = useCallback((lockId: LockId) => {
  setGameState(prev => prev ? engineCompleteMinigame(prev, lockId) : prev);
}, []);
```

Add to the return object:

```ts
return {
  // ...existing returns...
  completeMinigame: completeMinigameAction,
};
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useGameState.ts
git commit -m "feat: expose completeMinigame in useGameState hook"
```

---

### Task 12: MinigameModal Component

**Files:**
- Create: `src/components/MinigameModal.tsx`

- [ ] **Step 1: Create the modal dispatcher**

Create `src/components/MinigameModal.tsx`:

```tsx
import { X } from 'lucide-react';
import type { MinigameConfig } from '../game/types';
import PipePuzzle from './minigames/PipePuzzle';
import WiringPuzzle from './minigames/WiringPuzzle';

interface Props {
  config: MinigameConfig;
  lockName: string;
  onComplete: () => void;
  onClose: () => void;
}

const MINIGAME_COMPONENTS: Record<string, React.ComponentType<{ config: MinigameConfig; onComplete: () => void }>> = {
  pipe_puzzle: PipePuzzle,
  wiring: WiringPuzzle,
};

export default function MinigameModal({ config, lockName, onComplete, onClose }: Props) {
  const GameComponent = MINIGAME_COMPONENTS[config.type];

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
          <h3 className="text-sm font-bold text-slate-100">
            小遊戲：<span className="text-orange-400">{lockName}</span>
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded">
            <X size={16} className="text-slate-400" />
          </button>
        </div>
        <div className="p-4 flex-1 overflow-auto">
          {GameComponent ? (
            <GameComponent config={config} onComplete={onComplete} />
          ) : (
            <p className="text-slate-400 text-sm">未知的小遊戲類型：{config.type}</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit (components will be created in next tasks)**

```bash
git add src/components/MinigameModal.tsx
git commit -m "feat: add MinigameModal dispatcher component"
```

---

### Task 13: PipePuzzle Minigame Component

**Files:**
- Create: `src/components/minigames/PipePuzzle.tsx`

- [ ] **Step 1: Create the pipe puzzle component**

Create `src/components/minigames/PipePuzzle.tsx`:

```tsx
import { useState, useMemo } from 'react';
import type { MinigameConfig } from '../../game/types';
import { SeededRandom } from '../../game/utils';

interface Props {
  config: MinigameConfig;
  onComplete: () => void;
}

// Pipe directions: each pipe type has connection points (top, right, bottom, left)
// Encoded as [T, R, B, L] booleans
type Connections = [boolean, boolean, boolean, boolean];

const PIPE_TYPES: { name: string; base: Connections }[] = [
  { name: 'straight-v', base: [true, false, true, false] },   // ║
  { name: 'straight-h', base: [false, true, false, true] },   // ═
  { name: 'bend-tr', base: [true, true, false, false] },      // ╗
  { name: 'bend-rb', base: [false, true, true, false] },      // ╝
  { name: 'bend-bl', base: [false, false, true, true] },      // ╚
  { name: 'bend-lt', base: [true, false, false, true] },      // ╔
  { name: 'tee-trb', base: [true, true, true, false] },       // ╠
  { name: 'cross', base: [true, true, true, true] },          // ╬
];

function rotate(conn: Connections, times: number): Connections {
  let c = [...conn] as Connections;
  for (let i = 0; i < (times % 4); i++) {
    c = [c[3], c[0], c[1], c[2]];
  }
  return c;
}

interface Cell {
  typeIdx: number;
  rotation: number;  // 0-3
}

function getConnections(cell: Cell): Connections {
  return rotate(PIPE_TYPES[cell.typeIdx]!.base, cell.rotation);
}

// Direction offsets: [top, right, bottom, left] → [row, col] deltas
const DIR_DELTA = [[-1, 0], [0, 1], [1, 0], [0, -1]] as const;
const OPPOSITE = [2, 3, 0, 1] as const;

function checkSolved(grid: Cell[][], size: number): boolean {
  // BFS from top-left, check if reaches bottom-right
  const visited = new Set<string>();
  const queue: [number, number][] = [];

  // Start from (0,0) if it has a top or left opening connecting in
  queue.push([0, 0]);
  visited.add('0,0');

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    if (r === size - 1 && c === size - 1) return true;

    const conn = getConnections(grid[r]![c]!);
    for (let dir = 0; dir < 4; dir++) {
      if (!conn[dir]) continue;
      const nr = r + DIR_DELTA[dir]![0];
      const nc = c + DIR_DELTA[dir]![1];
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      const key = `${nr},${nc}`;
      if (visited.has(key)) continue;

      // Check neighbor has matching connection
      const neighborConn = getConnections(grid[nr]![nc]!);
      if (!neighborConn[OPPOSITE[dir]!]) continue;

      visited.add(key);
      queue.push([nr, nc]);
    }
  }
  return false;
}

function generateGrid(size: number, seed: number): { solution: Cell[][]; scrambled: Cell[][] } {
  const rng = new SeededRandom(seed);

  // Generate a solved grid using random walk BFS
  const solution: Cell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ typeIdx: 0, rotation: 0 })),
  );

  // Simple approach: create a spanning tree, then assign pipe types based on connections
  const connected = new Set<string>();
  const edges: [number, number, number][] = []; // [r, c, dir]
  connected.add('0,0');
  const frontier: [number, number, number][] = [];

  // Add initial neighbors
  for (let dir = 0; dir < 4; dir++) {
    const nr = 0 + DIR_DELTA[dir]![0];
    const nc = 0 + DIR_DELTA[dir]![1];
    if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
      frontier.push([0, 0, dir]);
    }
  }

  // Prim's algorithm for spanning tree
  while (frontier.length > 0) {
    const idx = rng.nextInt(frontier.length);
    const [r, c, dir] = frontier.splice(idx, 1)[0]!;
    const nr = r + DIR_DELTA[dir]![0];
    const nc = c + DIR_DELTA[dir]![1];
    const key = `${nr},${nc}`;
    if (connected.has(key)) continue;

    connected.add(key);
    edges.push([r, c, dir]);

    for (let d = 0; d < 4; d++) {
      const nnr = nr + DIR_DELTA[d]![0];
      const nnc = nc + DIR_DELTA[d]![1];
      if (nnr >= 0 && nnr < size && nnc >= 0 && nnc < size && !connected.has(`${nnr},${nnc}`)) {
        frontier.push([nr, nc, d]);
      }
    }
  }

  // Build connection map
  const connMap: boolean[][][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => [false, false, false, false]),
  );

  for (const [r, c, dir] of edges) {
    const nr = r + DIR_DELTA[dir]![0];
    const nc = c + DIR_DELTA[dir]![1];
    connMap[r]![c]![dir] = true;
    connMap[nr]![nc]![OPPOSITE[dir]!] = true;
  }

  // Assign pipe types that match the connections
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const needed = connMap[r]![c]! as Connections;
      // Find a pipe type + rotation that matches
      let found = false;
      for (let ti = 0; ti < PIPE_TYPES.length && !found; ti++) {
        for (let rot = 0; rot < 4 && !found; rot++) {
          const conn = rotate(PIPE_TYPES[ti]!.base, rot);
          if (conn[0] === needed[0] && conn[1] === needed[1] && conn[2] === needed[2] && conn[3] === needed[3]) {
            solution[r]![c] = { typeIdx: ti, rotation: rot };
            found = true;
          }
        }
      }
    }
  }

  // Scramble: random rotations
  const scrambled = solution.map(row =>
    row.map(cell => ({
      typeIdx: cell.typeIdx,
      rotation: (cell.rotation + 1 + rng.nextInt(3)) % 4,  // at least 1 rotation off
    })),
  );

  return { solution, scrambled };
}

// ─── Render helpers ───

const PIPE_SVG: Record<string, (rot: number) => React.ReactNode> = {
  'straight-v': () => <line x1="20" y1="0" x2="20" y2="40" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />,
  'straight-h': () => <line x1="0" y1="20" x2="40" y2="20" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />,
  'bend-tr': () => <path d="M20 0 L20 20 L40 20" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />,
  'bend-rb': () => <path d="M40 20 L20 20 L20 40" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />,
  'bend-bl': () => <path d="M20 40 L20 20 L0 20" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />,
  'bend-lt': () => <path d="M0 20 L20 20 L20 0" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />,
  'tee-trb': () => <><line x1="20" y1="0" x2="20" y2="40" stroke="currentColor" strokeWidth="6" strokeLinecap="round" /><line x1="20" y1="20" x2="40" y2="20" stroke="currentColor" strokeWidth="6" strokeLinecap="round" /></>,
  'cross': () => <><line x1="20" y1="0" x2="20" y2="40" stroke="currentColor" strokeWidth="6" strokeLinecap="round" /><line x1="0" y1="20" x2="40" y2="20" stroke="currentColor" strokeWidth="6" strokeLinecap="round" /></>,
};

export default function PipePuzzle({ config, onComplete }: Props) {
  const size = (config.params.gridSize as number) ?? 4;
  const { scrambled } = useMemo(() => generateGrid(size, config.seed), [size, config.seed]);
  const [grid, setGrid] = useState<Cell[][]>(scrambled);
  const [solved, setSolved] = useState(false);

  const handleClick = (r: number, c: number) => {
    if (solved) return;
    setGrid(prev => {
      const next = prev.map(row => row.map(cell => ({ ...cell })));
      next[r]![c]!.rotation = (next[r]![c]!.rotation + 1) % 4;
      if (checkSolved(next, size)) {
        setSolved(true);
        setTimeout(onComplete, 600);
      }
      return next;
    });
  };

  const cellSize = Math.min(64, Math.floor(320 / size));

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs text-slate-400">點擊管道旋轉，將所有管道從左上連通到右下</p>
      <div
        className="grid gap-0.5 bg-slate-800 p-1 rounded-lg border border-slate-700"
        style={{ gridTemplateColumns: `repeat(${size}, ${cellSize}px)` }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const pipeName = PIPE_TYPES[cell.typeIdx]!.name;
            const baseRenderer = PIPE_SVG[pipeName];
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => handleClick(r, c)}
                className={`flex items-center justify-center rounded transition-colors ${
                  solved ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-700 hover:bg-slate-600 text-cyan-400 active:bg-slate-500'
                }`}
                style={{ width: cellSize, height: cellSize }}
              >
                <svg
                  width={cellSize - 4}
                  height={cellSize - 4}
                  viewBox="0 0 40 40"
                  style={{ transform: `rotate(${cell.rotation * 90}deg)`, transition: 'transform 0.15s' }}
                >
                  {baseRenderer?.(cell.rotation)}
                </svg>
              </button>
            );
          }),
        )}
      </div>
      {solved && <p className="text-emerald-400 font-bold text-sm">管線連通成功！</p>}
    </div>
  );
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS (or minor fixes needed)

- [ ] **Step 3: Commit**

```bash
mkdir -p src/components/minigames
git add src/components/minigames/PipePuzzle.tsx
git commit -m "feat: add PipePuzzle minigame component with seeded grid generation"
```

---

### Task 14: WiringPuzzle Minigame Component

**Files:**
- Create: `src/components/minigames/WiringPuzzle.tsx`

- [ ] **Step 1: Create the wiring puzzle component**

Create `src/components/minigames/WiringPuzzle.tsx`:

```tsx
import { useState, useMemo } from 'react';
import type { MinigameConfig } from '../../game/types';
import { SeededRandom, shuffle } from '../../game/utils';

interface Props {
  config: MinigameConfig;
  onComplete: () => void;
}

const COLORS = [
  { name: '紅', bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500' },
  { name: '藍', bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500' },
  { name: '綠', bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-500' },
  { name: '黃', bg: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500' },
  { name: '紫', bg: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500' },
  { name: '橙', bg: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500' },
];

interface WirePair {
  colorIdx: number;
  leftIdx: number;
  rightIdx: number;
}

function generatePairs(pairCount: number, seed: number): { pairs: WirePair[]; leftOrder: number[]; rightOrder: number[] } {
  const rng = new SeededRandom(seed);
  const usedColors = shuffle(COLORS.map((_, i) => i), rng).slice(0, pairCount);

  const pairs: WirePair[] = usedColors.map((colorIdx, i) => ({
    colorIdx,
    leftIdx: i,
    rightIdx: i,
  }));

  // Scramble right side order
  const rightOrder = shuffle(Array.from({ length: pairCount }, (_, i) => i), rng);
  const leftOrder = Array.from({ length: pairCount }, (_, i) => i);

  return { pairs, leftOrder, rightOrder };
}

export default function WiringPuzzle({ config, onComplete }: Props) {
  const pairCount = (config.params.pairCount as number) ?? 4;
  const { pairs, leftOrder, rightOrder } = useMemo(
    () => generatePairs(pairCount, config.seed),
    [pairCount, config.seed],
  );

  // connections[leftIdx] = rightIdx or -1
  const [connections, setConnections] = useState<number[]>(() => Array(pairCount).fill(-1));
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);

  const handleLeftClick = (leftIdx: number) => {
    if (solved) return;
    // If already connected, disconnect
    if (connections[leftIdx] !== -1) {
      setConnections(prev => {
        const next = [...prev];
        next[leftIdx] = -1;
        return next;
      });
    }
    setSelectedLeft(leftIdx);
  };

  const handleRightClick = (rightIdx: number) => {
    if (solved || selectedLeft === null) return;

    // Disconnect anything already connected to this right terminal
    setConnections(prev => {
      const next = [...prev];
      // Remove any existing connection to this right terminal
      for (let i = 0; i < next.length; i++) {
        if (next[i] === rightIdx) next[i] = -1;
      }
      next[selectedLeft] = rightIdx;

      // Check if solved
      const allCorrect = pairs.every(pair => {
        const leftPos = leftOrder.indexOf(pair.leftIdx);
        const rightPos = rightOrder.indexOf(pair.rightIdx);
        return next[leftPos] === rightPos;
      });

      if (allCorrect) {
        setSolved(true);
        setTimeout(onComplete, 600);
      }

      return next;
    });
    setSelectedLeft(null);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs text-slate-400">點擊左側端子，再點擊右側對應顏色的端子來接線</p>
      <div className="flex gap-12 items-center">
        {/* Left terminals */}
        <div className="flex flex-col gap-3">
          {leftOrder.map((pairIdx, pos) => {
            const pair = pairs[pairIdx]!;
            const color = COLORS[pair.colorIdx]!;
            const isSelected = selectedLeft === pos;
            const isConnected = connections[pos] !== -1;
            return (
              <button
                key={`L${pos}`}
                onClick={() => handleLeftClick(pos)}
                className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center font-bold text-sm transition-all ${
                  solved
                    ? `${color.bg} border-white/30 text-white`
                    : isSelected
                      ? `${color.bg} ${color.border} text-white scale-110 ring-2 ring-white/50`
                      : isConnected
                        ? `${color.bg}/80 ${color.border} text-white/80`
                        : `bg-slate-700 ${color.border} ${color.text} hover:bg-slate-600`
                }`}
              >
                {color.name}
              </button>
            );
          })}
        </div>

        {/* Connection lines (text representation) */}
        <div className="flex flex-col gap-3">
          {leftOrder.map((_, pos) => {
            const rightPos = connections[pos]!;
            if (rightPos === -1) return <div key={pos} className="h-12 flex items-center text-slate-600 text-xs">---</div>;
            const rightPairIdx = rightOrder[rightPos]!;
            const rightColor = COLORS[pairs[rightPairIdx]!.colorIdx]!;
            return (
              <div key={pos} className={`h-12 flex items-center ${rightColor.text} text-xs font-bold`}>
                ━━━━━━
              </div>
            );
          })}
        </div>

        {/* Right terminals */}
        <div className="flex flex-col gap-3">
          {rightOrder.map((pairIdx, pos) => {
            const pair = pairs[pairIdx]!;
            const color = COLORS[pair.colorIdx]!;
            const isTarget = connections.some((r, _) => r === pos);
            return (
              <button
                key={`R${pos}`}
                onClick={() => handleRightClick(pos)}
                className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center font-bold text-sm transition-all ${
                  solved
                    ? `${color.bg} border-white/30 text-white`
                    : selectedLeft !== null
                      ? `bg-slate-700 ${color.border} ${color.text} hover:bg-slate-600 hover:scale-105`
                      : isTarget
                        ? `${color.bg}/80 ${color.border} text-white/80`
                        : `bg-slate-700 ${color.border} ${color.text}`
                }`}
              >
                {color.name}
              </button>
            );
          })}
        </div>
      </div>
      {solved && <p className="text-emerald-400 font-bold text-sm">接線完成，電路連通！</p>}
    </div>
  );
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/minigames/WiringPuzzle.tsx
git commit -m "feat: add WiringPuzzle minigame component with seeded pair generation"
```

---

### Task 15: InteractionPanel — Stationary Items & Minigame Integration

**Files:**
- Modify: `src/components/InteractionPanel.tsx`
- Modify: `src/components/App.tsx`

- [ ] **Step 1: Update InteractionPanel props to accept completeMinigame**

In `src/components/InteractionPanel.tsx`, update Props:

```ts
interface Props {
  gameState: GameState;
  selectedItem: ItemId | null;
  onTakeItem: (id: ItemId) => void;
  onUseItemOnLock: (itemId: ItemId, lockId: LockId) => void;
  onEnterPassword: (password: string, lockId: LockId) => void;
  onMoveToRoom: (lockId: LockId) => void;
  onInspect: (entityId: string) => void;
  onCompleteMinigame: (lockId: LockId) => void;  // NEW
}
```

Add `onCompleteMinigame` to the destructured props.

- [ ] **Step 2: Add MinigameModal state and import**

Add imports:

```ts
import MinigameModal from './MinigameModal';
import type { LockId } from '../game/types';
```

Add state for minigame:

```ts
const [minigameLockId, setMinigameLockId] = useState<LockId | null>(null);
const minigameLock = minigameLockId ? puzzle.locks[minigameLockId] : null;
```

- [ ] **Step 3: Update handleUse for minigame locks**

Update the `handleUse` function:

```ts
const handleUse = (lockId: LockId) => {
  const lock = puzzle.locks[lockId]!;
  if (lock.mechanism === 'password') {
    setPasswordLockId(lockId);
  } else if (lock.mechanism === 'minigame') {
    // Check if all items are inserted (ready for minigame)
    const allInserted = lock.requiredItems.every(reqId => lock.insertedItems.includes(reqId));
    if (allInserted) {
      setMinigameLockId(lockId);
    } else if (selectedItem) {
      onUseItemOnLock(selectedItem, lockId);
    }
  } else if (selectedItem) {
    onUseItemOnLock(selectedItem, lockId);
  }
};
```

- [ ] **Step 4: Update visible items section — hide take button for non-pickupable**

In the visible items rendering (around line 72-84), update the take button:

```tsx
{visibleItems.map(item => (
  <div key={item.id} className="flex bg-slate-800 rounded border border-slate-700 overflow-hidden shadow-sm hover:border-slate-600 active:bg-slate-700">
    {item.pickupable ? (
      <button
        onClick={() => onTakeItem(item.id)}
        className="flex-1 text-emerald-400 px-3 py-2 md:py-2.5 text-xs text-left truncate font-bold"
      >
        + 拿取 {item.name}
      </button>
    ) : (
      <span className="flex-1 text-orange-300 px-3 py-2 md:py-2.5 text-xs text-left truncate font-bold">
        ⚓ {item.name}
      </span>
    )}
    <button
      onClick={() => onInspect(item.id)}
      className="text-slate-400 px-3 py-2 md:py-2.5 border-l border-slate-700 shrink-0 active:bg-slate-600"
    >
      <Search size={14} />
    </button>
  </div>
))}
```

- [ ] **Step 5: Update lock button labels for minigame**

In the lock rendering section, update the button text (around line 147-149):

```tsx
{lock.mechanism === 'password' ? '密碼'
  : lock.mechanism === 'minigame' && lock.requiredItems.every(r => lock.insertedItems.includes(r)) ? '挑戰'
  : '使用'}
```

Update the button styling to include minigame:

```tsx
className={`px-3 py-2 rounded text-[11px] md:text-xs border shrink-0 font-bold shadow-sm ${
  lock.mechanism === 'password'
    ? 'bg-amber-900 border-amber-700 text-amber-100 active:bg-amber-800'
    : lock.mechanism === 'minigame' && lock.requiredItems.every(r => lock.insertedItems.includes(r))
      ? 'bg-orange-900 border-orange-600 text-orange-100 active:bg-orange-800'
      : selectedItem
        ? 'bg-blue-900 border-blue-600 text-blue-100 active:bg-blue-800'
        : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
}`}
disabled={lock.mechanism !== 'password'
  && !(lock.mechanism === 'minigame' && lock.requiredItems.every(r => lock.insertedItems.includes(r)))
  && !selectedItem}
```

- [ ] **Step 6: Add MinigameModal render**

After the PasswordModal render block (at the end of the JSX), add:

```tsx
{minigameLock && minigameLockId && minigameLock.minigameConfig && (
  <MinigameModal
    config={minigameLock.minigameConfig}
    lockName={minigameLock.name}
    onComplete={() => {
      onCompleteMinigame(minigameLockId);
      setMinigameLockId(null);
    }}
    onClose={() => setMinigameLockId(null)}
  />
)}
```

- [ ] **Step 7: Update App.tsx to pass completeMinigame**

In `src/components/App.tsx`, find where `InteractionPanel` is rendered and add the new prop:

```tsx
<InteractionPanel
  // ...existing props...
  onCompleteMinigame={completeMinigame}
/>
```

Make sure `completeMinigame` is destructured from `useGameState` in App.tsx.

- [ ] **Step 8: Run type check and dev server**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/components/InteractionPanel.tsx src/components/App.tsx
git commit -m "feat: integrate minigame modal and stationary item display in InteractionPanel"
```

---

### Task 16: CanvasGraph — Visual Markers

**Files:**
- Modify: `src/components/CanvasGraph.tsx`

- [ ] **Step 1: Add orange color for minigame locks**

In `CanvasGraph.tsx`, find the section that determines node colors (around line 284-296). Update the lock color logic:

In the block that checks lock types, add a case for minigame before the container case:

```ts
if (lock) {
  if (lock.isExit) {
    borderColor = 'border-amber-700/60';
    dotColor = 'bg-amber-500 shadow-amber-500/50';
  } else if (lock.category === 'spatial') {
    borderColor = 'border-purple-900/60';
    dotColor = 'bg-purple-500 shadow-purple-500/50';
  } else if (lock.mechanism === 'minigame') {
    borderColor = 'border-orange-900/60';
    dotColor = 'bg-orange-500 shadow-orange-500/50';
  } else {
    borderColor = 'border-rose-900/60';
    dotColor = 'bg-rose-500 shadow-rose-500/50';
  }
}
```

- [ ] **Step 2: Add station marker for non-pickupable items**

For item nodes, check pickupable and add a different marker. In the item rendering section, update the dot/border:

```ts
const item = puzzle.items[nodeId];
if (item && !item.pickupable) {
  borderColor = 'border-orange-900/60';
  dotColor = 'bg-orange-500 shadow-orange-500/50';
}
```

- [ ] **Step 3: Update legend**

Find the legend section (around line 207-210) and add:

```tsx
<div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" /> 小遊戲鎖 / 固定物品</div>
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/CanvasGraph.tsx
git commit -m "feat: add orange color for minigame locks and stationary items in graph"
```

---

### Task 17: Final Solvability Verification & Manual Test

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: ALL PASS

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Start dev server and manually test**

Run: `npm run dev`

Manual test checklist:
1. Generate a new puzzle — verify it loads without errors
2. Check if any minigame locks appear (may need multiple generations or high targetDepth)
3. If a minigame lock appears: insert required items, verify "挑戰" button appears, click it, play the minigame, verify it unlocks
4. Check if any stationary tools appear: verify they show ⚓ marker instead of "拿取" button
5. Check the graph visualization: verify orange nodes appear for minigame locks
6. Check the dump output: verify [STATION] and [MINI] markers appear

- [ ] **Step 4: Commit any fixes found during manual testing**

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete minigame, crafting, and state conversion system"
```
