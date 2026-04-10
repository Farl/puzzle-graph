# Phase 3：兩階段生成實作計劃

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將謎題生成拆成 Phase A（建立房間骨架 + 放置鑰匙到地板）和 Phase B（用容器鎖把地板物品一層層鎖起來），讓房間數量由設定決定，鑰匙放置有意義的空間邏輯，跨房間謎題靠機率自然產生。

**Architecture:** Phase A 建立 N 個房間和 N-1 道門（加出口門），並將各鑰匙依 `keySpreadRate` 放到合法房間的地板上。Phase B 的 BFS 從這些地板物品出發，以容器鎖逐層包裹，鑰匙依 `crossRoomRate` 放到合法房間（保證可解性）。

**Tech Stack:** TypeScript, Vitest

---

## 檔案結構

| 檔案 | 動作 | 說明 |
|------|------|------|
| `src/game/types.ts` | 修改 | 更新 `GeneratorConfig`：移除 `roomGrowthRate`、`keySpatialSplitRate`；新增 `keySpreadRate`、`crossRoomRate` |
| `src/game/generator.ts` | 重構 | 拆成 `generateRoomSkeleton()` (Phase A) + `generatePuzzleContent()` (Phase B)，`generatePuzzle()` 維持公開 API |
| `src/hooks/useGameState.ts` | 修改 | 更新 `DEFAULT_CONFIG` |
| `src/game/__tests__/phase3-skeleton.test.ts` | 新增 | Phase A 的單元測試 |
| `src/game/__tests__/phase3-content.test.ts` | 新增 | Phase B 的整合測試 |
| `src/game/__tests__/generator.test.ts` | 修改 | 移除 `roomGrowthRate`、`keySpatialSplitRate` |
| `src/game/__tests__/max-locks.test.ts` | 修改 | 同上 |
| `src/game/__tests__/phase2-integration.test.ts` | 修改 | 同上，更新測試條件 |
| `src/game/__tests__/reuse-path.test.ts` | 修改 | 同上 |
| `src/game/__tests__/tag-diversity.test.ts` | 修改 | 同上 |

---

## Task 1：更新 GeneratorConfig 型別

**Files:**
- Modify: `src/game/types.ts:90-104`

- [ ] **Step 1：修改 GeneratorConfig**

```typescript
// src/game/types.ts 的 GeneratorConfig 區段完整替換為：

export interface GeneratorConfig {
  targetDepth: number;
  maxRooms: number;
  compositeRate: number;
  depthStaggerVariance: number;

  // ── Phase 3：兩階段生成 ──
  keySpreadRate?: number;   // 0-1，Phase A 鑰匙放置的分散程度（0=緊鄰門，1=任意合法房間）
  crossRoomRate?: number;   // 0-1，Phase B 容器鎖鑰匙跨房間放置的機率（0=同房間，1=任意合法房間）

  // ── Phase 2：選擇演算法 ──
  maxLocks?: number;
  tagWeights?: Record<string, number>;
  tagDiversityMode?: TagDiversityMode;
  reuseRate?: number;
  maxReusesPerTool?: number;
}
```

- [ ] **Step 2：確認 TypeScript 編譯沒有新錯誤（允許現有測試失敗）**

```bash
npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 3：更新 useGameState DEFAULT\_CONFIG**

```typescript
// src/hooks/useGameState.ts 中的 DEFAULT_CONFIG 替換為：
export const DEFAULT_CONFIG: GeneratorConfig = {
  targetDepth: 4,
  maxRooms: 3,
  compositeRate: 0.3,
  depthStaggerVariance: 1.0,
  keySpreadRate: 0.5,
  crossRoomRate: 0.3,
};
```

- [ ] **Step 4：Commit**

```bash
git add src/game/types.ts src/hooks/useGameState.ts
git commit -m "refactor: update GeneratorConfig for Phase 3 (remove roomGrowthRate, add keySpreadRate/crossRoomRate)"
```

---

## Task 2：修復現有測試（移除已廢棄參數）

**Files:**
- Modify: `src/game/__tests__/generator.test.ts`
- Modify: `src/game/__tests__/max-locks.test.ts`
- Modify: `src/game/__tests__/phase2-integration.test.ts`
- Modify: `src/game/__tests__/reuse-path.test.ts`
- Modify: `src/game/__tests__/tag-diversity.test.ts`

- [ ] **Step 1：在所有測試檔中，從 config 物件移除 `roomGrowthRate` 和 `keySpatialSplitRate`**

對每個測試檔，把類似這樣的 config：
```typescript
const config: GeneratorConfig = {
  targetDepth: 4,
  maxRooms: 6,
  roomGrowthRate: 0.3,      // ← 刪除
  compositeRate: 0.3,
  keySpatialSplitRate: 0.2, // ← 刪除
  depthStaggerVariance: 1,
  ...
};
```
改成：
```typescript
const config: GeneratorConfig = {
  targetDepth: 4,
  maxRooms: 3,
  compositeRate: 0.3,
  depthStaggerVariance: 1,
  ...
};
```

在 `phase2-integration.test.ts` 中，`FULL_CONFIG` 改為：
```typescript
const FULL_CONFIG: GeneratorConfig = {
  targetDepth: 4,
  maxRooms: 3,
  compositeRate: 0.3,
  depthStaggerVariance: 1,
  maxLocks: 5,
  tagDiversityMode: 'balanced',
  reuseRate: 0.5,
  maxReusesPerTool: 2,
};
```

`OLD_CONFIG`（backward compatible 測試）改為：
```typescript
const OLD_CONFIG: GeneratorConfig = {
  targetDepth: 3,
  maxRooms: 3,
  compositeRate: 0.3,
  depthStaggerVariance: 1,
};
```

- [ ] **Step 2：跑所有測試，確認只剩 Phase 3 相關失敗（不應有其他失敗）**

```bash
npx vitest run 2>&1 | tail -30
```

- [ ] **Step 3：Commit**

```bash
git add src/game/__tests__/
git commit -m "test: update existing tests to remove deprecated roomGrowthRate and keySpatialSplitRate"
```

---

## Task 3：Phase A 測試（先寫測試）

**Files:**
- Create: `src/game/__tests__/phase3-skeleton.test.ts`

- [ ] **Step 1：寫 Phase A 測試**

```typescript
// src/game/__tests__/phase3-skeleton.test.ts
import { describe, it, expect } from 'vitest';
import { generateRoomSkeleton } from '../generator';
import type { GeneratorConfig } from '../types';

const BASE_CONFIG: GeneratorConfig = {
  targetDepth: 3,
  maxRooms: 3,
  compositeRate: 0,
  depthStaggerVariance: 0,
};

describe('generateRoomSkeleton (Phase A)', () => {
  it('建立精確的 maxRooms 個房間', () => {
    const result = generateRoomSkeleton(BASE_CONFIG);
    expect(result.roomIds.length).toBe(3);
    expect(Object.keys(result.ctx.rooms).length).toBe(3);
  });

  it('建立 maxRooms-1 道房間門鎖 + 1 道出口鎖', () => {
    const result = generateRoomSkeleton(BASE_CONFIG);
    const spatialLocks = Object.values(result.ctx.locks).filter(l => l.category === 'spatial');
    const exitLocks = Object.values(result.ctx.locks).filter(l => l.isExit);
    // N-1 道門 + 1 道出口，但出口也是 spatial
    expect(exitLocks.length).toBe(1);
    expect(spatialLocks.length).toBe(BASE_CONFIG.maxRooms); // N-1 door + 1 exit
  });

  it('出口鎖在最後一個房間', () => {
    const result = generateRoomSkeleton(BASE_CONFIG);
    const exitLock = Object.values(result.ctx.locks).find(l => l.isExit)!;
    const lastRoomId = result.roomIds[result.roomIds.length - 1]!;
    expect(exitLock.roomId).toBe(lastRoomId);
  });

  it('第一個房間是 startRoomId', () => {
    const result = generateRoomSkeleton(BASE_CONFIG);
    expect(result.startRoomId).toBe(result.roomIds[0]);
  });

  it('每道門鎖的鑰匙在合法範圍內（門之前可達的房間）', () => {
    for (let run = 0; run < 30; run++) {
      const result = generateRoomSkeleton({ ...BASE_CONFIG, keySpreadRate: 1 });
      const { ctx, roomIds } = result;

      for (const target of result.floorItems) {
        const itemRoom = ctx.items[target.itemId]!.initialRoom;
        const itemRoomIndex = roomIds.indexOf(itemRoom);
        // 鑰匙必須在 criticalRoomIndex 之前的房間
        expect(itemRoomIndex).toBeLessThan(target.criticalRoomIndex);
      }
    }
  });

  it('keySpreadRate=0：每個門鑰匙都在緊鄰門的前一個房間', () => {
    for (let run = 0; run < 20; run++) {
      const result = generateRoomSkeleton({ ...BASE_CONFIG, keySpreadRate: 0 });
      const { ctx, roomIds } = result;

      // 找非出口的門鑰匙（criticalRoomIndex < N）
      const doorKeys = result.floorItems.filter(t => t.criticalRoomIndex < roomIds.length);
      for (const target of doorKeys) {
        const itemRoom = ctx.items[target.itemId]!.initialRoom;
        const itemRoomIndex = roomIds.indexOf(itemRoom);
        // keySpreadRate=0 → 永遠在 criticalRoomIndex-1 這個房間
        expect(itemRoomIndex).toBe(target.criticalRoomIndex - 1);
      }
    }
  });

  it('keySpreadRate=1：門鑰匙分散到各合法房間（20次應出現不只一種房間）', () => {
    const config = { ...BASE_CONFIG, maxRooms: 4, keySpreadRate: 1 };
    const roomSets = new Set<string>();

    for (let run = 0; run < 30; run++) {
      const result = generateRoomSkeleton(config);
      // 找最後一道門（eligibleUpToIndex 最大，分散效果最明顯）
      const lastDoorKey = result.floorItems
        .filter(t => t.criticalRoomIndex === config.maxRooms - 1)
        .at(0);
      if (lastDoorKey) {
        const itemRoom = result.ctx.items[lastDoorKey.itemId]!.initialRoom;
        roomSets.add(itemRoom);
      }
    }
    // 30 次應該出現不只一個房間
    expect(roomSets.size).toBeGreaterThan(1);
  });

  it('每道門鎖有且只有一把鑰匙', () => {
    const result = generateRoomSkeleton(BASE_CONFIG);
    const doorLocks = Object.values(result.ctx.locks).filter(l => l.category === 'spatial' && !l.isExit);
    for (const lock of doorLocks) {
      expect(lock.requiredItems.length).toBe(1);
    }
  });

  it('floorItems 數量等於門鎖數 + 出口鑰匙', () => {
    const result = generateRoomSkeleton(BASE_CONFIG);
    // maxRooms-1 道門各一把鑰匙 + 1 把出口鑰匙
    expect(result.floorItems.length).toBe(BASE_CONFIG.maxRooms);
  });
});
```

- [ ] **Step 2：確認測試目前失敗（generateRoomSkeleton 尚未存在）**

```bash
npx vitest run src/game/__tests__/phase3-skeleton.test.ts 2>&1 | tail -20
```

Expected: FAIL with "generateRoomSkeleton is not a function" or similar.

- [ ] **Step 3：Commit 測試**

```bash
git add src/game/__tests__/phase3-skeleton.test.ts
git commit -m "test: add failing Phase A skeleton tests"
```

---

## Task 4：實作 Phase A（generateRoomSkeleton）

**Files:**
- Modify: `src/game/generator.ts`

- [ ] **Step 1：新增 Phase A 內部型別和輸出型別**

在 `generator.ts` 頂部的 interface 區段，替換 `GenerationTarget` 為：

```typescript
// Phase B BFS 佇列項目
interface PhaseBTarget {
  itemId: ItemId;
  currentRoom: RoomId;
  currentRoomIndex: number;   // 在 roomIds 陣列中的索引
  depth: number;
  criticalRoomIndex: number;  // 合法放置鑰匙的房間上限（exclusive）：rooms[0..criticalRoomIndex-1]
}

// Phase A 輸出
interface SkeletonResult {
  ctx: GeneratorContext;
  roomIds: RoomId[];          // 有序：[start, ..., exit]
  startRoomId: RoomId;
  exitLockId: LockId;
  floorItems: PhaseBTarget[]; // Phase A 放到地板的鑰匙，成為 Phase B 的輸入
}
```

- [ ] **Step 2：新增 pickRoom 輔助函式**

在 `GeneratorContext` class 之後、`enqueueKeysForLock` 之前加入：

```typescript
/**
 * 從 eligible rooms 中選一個房間。
 * preferredIdx：偏好的索引（spreadRate=0 時永遠選這個）
 * spreadRate：0 = 永遠選 preferred，1 = 隨機從 eligible 選
 */
function pickRoom(eligible: RoomId[], preferredIdx: number, spreadRate: number): RoomId {
  if (eligible.length === 0) return '';
  if (eligible.length === 1) return eligible[0]!;
  const clampedIdx = Math.min(Math.max(preferredIdx, 0), eligible.length - 1);
  if (spreadRate <= 0 || Math.random() > spreadRate) {
    return eligible[clampedIdx]!;
  }
  return eligible[Math.floor(Math.random() * eligible.length)]!;
}
```

- [ ] **Step 3：實作 generateRoomSkeleton 並 export**

在 `enqueueKeysForLock` 函式之後、`generatePuzzle` 之前加入：

```typescript
export function generateRoomSkeleton(config: GeneratorConfig): SkeletonResult {
  const ctx = new GeneratorContext(config.maxRooms);
  const floorItems: PhaseBTarget[] = [];
  const roomIds: RoomId[] = [];

  const keySpreadRate = config.keySpreadRate ?? 0.5;

  // ── 建立所有房間（有序：R0=起點, R(N-1)=出口） ──
  for (let i = 0; i < config.maxRooms; i++) {
    const theme = ctx.availableThemes.pop() ?? { name: `房間 ${i + 1}`, description: '一個房間。' };
    const room = ctx.createRoom(theme.name, theme.description);
    roomIds.push(room.id);
  }

  const startRoomId = roomIds[0]!;
  const exitRoomId = roomIds[roomIds.length - 1]!;

  // ── 建立 maxRooms-1 道房間門鎖（Ri → R(i+1)） ──
  for (let i = 0; i < config.maxRooms - 1; i++) {
    const fromRoomId = roomIds[i]!;
    const toRoomId = roomIds[i + 1]!;

    // 選一個空間鎖模板（單鑰匙）
    const lockTemplate = ctx.selectLock(true, false, config);
    const variation = lockTemplate.variations[Math.floor(Math.random() * lockTemplate.variations.length)]!;

    const doorLock = ctx.createLock(variation, true, fromRoomId);
    doorLock.targetRoomId = toRoomId;
    ctx.rooms[fromRoomId]!.lockIds.push(doorLock.id);

    // 建立返回門（已解鎖）
    const backLock = ctx.createLock(
      { name: `返回：${ctx.rooms[fromRoomId]!.name}`, lockMsg: '一扇已開啟的門。', unlockMsg: '' },
      true,
      toRoomId,
    );
    backLock.targetRoomId = fromRoomId;
    backLock.isLocked = false;
    ctx.rooms[toRoomId]!.lockIds.push(backLock.id);

    // 建立門鑰匙
    const keyTemplateId = lockTemplate.requiredKeys[0]!;
    const keyTpl = findKeyTemplate(keyTemplateId)!;
    let keyId: ItemId;
    if (keyTpl.reusable) {
      keyId = ctx.getOrCreateReusableItem(keyTpl.name);
    } else {
      keyId = ctx.createConsumableItem(keyTpl.name).id;
    }
    doorLock.requiredItems.push(keyId);

    // 決定鑰匙放在哪個房間（eligible: rooms[0..i]，i = door 前一個房間）
    const eligible = roomIds.slice(0, i + 1);
    const keyRoomId = pickRoom(eligible, eligible.length - 1, keySpreadRate);
    ctx.items[keyId]!.initialRoom = keyRoomId;
    ctx.rooms[keyRoomId]!.visibleItems.push(keyId);

    // criticalRoomIndex = i+1（rooms[0..i] 在沒有此鑰匙時可達）
    floorItems.push({
      itemId: keyId,
      currentRoom: keyRoomId,
      currentRoomIndex: roomIds.indexOf(keyRoomId),
      depth: 0,
      criticalRoomIndex: i + 1,
    });
  }

  // ── 建立出口鎖（在 exitRoom） ──
  const exitLock = ctx.createLock(
    {
      name: '逃生大門',
      lockMsg: '鎖著厚重鐵鍊與精密電子鎖的裝甲門，是逃離這裡的唯一出口。',
      unlockMsg: '大門發出洩壓的巨大聲響，刺眼的陽光灑落，你重獲自由了！',
    },
    false,
    exitRoomId,
    true,
  );
  ctx.rooms[exitRoomId]!.lockIds.push(exitLock.id);

  // 建立出口鑰匙
  const exitKey = ctx.createItem('終極逃生卡', false, '帶有最高權限的特殊磁卡。');
  exitLock.requiredItems.push(exitKey.id);

  // 出口鑰匙可放在任何房間（criticalRoomIndex = N = all rooms safe）
  const exitKeyRoom = pickRoom(roomIds, roomIds.length - 1, keySpreadRate);
  exitKey.initialRoom = exitKeyRoom;
  ctx.rooms[exitKeyRoom]!.visibleItems.push(exitKey.id);

  floorItems.push({
    itemId: exitKey.id,
    currentRoom: exitKeyRoom,
    currentRoomIndex: roomIds.indexOf(exitKeyRoom),
    depth: 0,
    criticalRoomIndex: roomIds.length, // 出口鑰匙不阻塞任何房間
  });

  return { ctx, roomIds, startRoomId, exitLockId: exitLock.id, floorItems };
}
```

- [ ] **Step 4：跑 Phase A 測試，確認全部通過**

```bash
npx vitest run src/game/__tests__/phase3-skeleton.test.ts 2>&1 | tail -20
```

Expected: all PASS.

- [ ] **Step 5：Commit**

```bash
git add src/game/generator.ts
git commit -m "feat: implement Phase A generateRoomSkeleton with keySpreadRate"
```

---

## Task 5：Phase B 測試（先寫測試）

**Files:**
- Create: `src/game/__tests__/phase3-content.test.ts`

- [ ] **Step 1：寫 Phase B 整合測試**

```typescript
// src/game/__tests__/phase3-content.test.ts
import { describe, it, expect } from 'vitest';
import { generatePuzzle } from '../generator';
import type { GeneratorConfig } from '../types';

const BASE: GeneratorConfig = {
  targetDepth: 3,
  maxRooms: 3,
  compositeRate: 0,
  depthStaggerVariance: 0,
};

describe('Phase 3 兩階段生成整合', () => {
  it('房間數量精確等於 maxRooms', () => {
    for (let i = 0; i < 20; i++) {
      const puzzle = generatePuzzle(BASE);
      expect(Object.keys(puzzle.rooms).length).toBe(BASE.maxRooms);
    }
  });

  it('所有物品的 initialRoom 都存在於 puzzle.rooms', () => {
    for (let i = 0; i < 30; i++) {
      const puzzle = generatePuzzle(BASE);
      for (const item of Object.values(puzzle.items)) {
        expect(puzzle.rooms[item.initialRoom], `item "${item.name}" room "${item.initialRoom}"`).toBeDefined();
      }
    }
  });

  it('所有鎖的 requiredItems 都存在於 puzzle.items', () => {
    for (let i = 0; i < 30; i++) {
      const puzzle = generatePuzzle(BASE);
      for (const lock of Object.values(puzzle.locks)) {
        for (const itemId of lock.requiredItems) {
          expect(puzzle.items[itemId], `lock "${lock.name}" refs "${itemId}"`).toBeDefined();
        }
      }
    }
  });

  it('exitLock 存在且 isExit=true', () => {
    for (let i = 0; i < 20; i++) {
      const puzzle = generatePuzzle(BASE);
      expect(puzzle.locks[puzzle.exitLockId]).toBeDefined();
      expect(puzzle.locks[puzzle.exitLockId]!.isExit).toBe(true);
    }
  });

  it('startRoomId 存在於 rooms', () => {
    for (let i = 0; i < 20; i++) {
      const puzzle = generatePuzzle(BASE);
      expect(puzzle.rooms[puzzle.startRoomId]).toBeDefined();
    }
  });

  it('crossRoomRate=0：容器鎖的鑰匙都在與容器相同的房間', () => {
    const config: GeneratorConfig = {
      ...BASE,
      targetDepth: 3,
      crossRoomRate: 0,
    };
    for (let i = 0; i < 20; i++) {
      const puzzle = generatePuzzle(config);
      const containerLocks = Object.values(puzzle.locks).filter(
        l => l.category === 'container' && l.isLocked,
      );
      for (const lock of containerLocks) {
        for (const reqItemId of lock.requiredItems) {
          const reqItem = puzzle.items[reqItemId]!;
          // 容器鎖鑰匙應在同一房間（crossRoomRate=0）
          expect(reqItem.initialRoom).toBe(lock.roomId);
        }
      }
    }
  });

  it('maxLocks 約束：容器鎖數量不超過 maxLocks', () => {
    const config: GeneratorConfig = { ...BASE, maxLocks: 4 };
    for (let i = 0; i < 30; i++) {
      const puzzle = generatePuzzle(config);
      const containerLocks = Object.values(puzzle.locks).filter(
        l => l.category === 'container' && l.isLocked,
      );
      expect(containerLocks.length).toBeLessThanOrEqual(4);
    }
  });

  it('maxLocks=0：沒有容器鎖', () => {
    const puzzle = generatePuzzle({ ...BASE, maxLocks: 0 });
    const containerLocks = Object.values(puzzle.locks).filter(
      l => l.category === 'container' && l.isLocked,
    );
    expect(containerLocks.length).toBe(0);
  });

  it('crossRoomRate=1：50次執行中，至少部分容器鎖的鑰匙在不同房間', () => {
    // maxRooms>=3 才能出現跨房間效果
    const config: GeneratorConfig = {
      ...BASE,
      maxRooms: 3,
      targetDepth: 4,
      crossRoomRate: 1,
    };
    let crossRoomFound = false;
    for (let i = 0; i < 50 && !crossRoomFound; i++) {
      const puzzle = generatePuzzle(config);
      const containerLocks = Object.values(puzzle.locks).filter(
        l => l.category === 'container' && l.isLocked,
      );
      for (const lock of containerLocks) {
        for (const reqItemId of lock.requiredItems) {
          const reqItem = puzzle.items[reqItemId]!;
          if (reqItem.initialRoom !== lock.roomId) {
            crossRoomFound = true;
            break;
          }
        }
        if (crossRoomFound) break;
      }
    }
    expect(crossRoomFound).toBe(true);
  });
});
```

- [ ] **Step 2：確認測試目前失敗（generatePuzzle 尚未使用 Phase B）**

```bash
npx vitest run src/game/__tests__/phase3-content.test.ts 2>&1 | tail -20
```

Expected: 大多數失敗（房間數量等測試應失敗，因為目前仍是舊邏輯）。

- [ ] **Step 3：Commit 測試**

```bash
git add src/game/__tests__/phase3-content.test.ts
git commit -m "test: add failing Phase B integration tests"
```

---

## Task 6：實作 Phase B + 更新 generatePuzzle

**Files:**
- Modify: `src/game/generator.ts`

- [ ] **Step 1：替換 enqueueKeysForLock 為 Phase B 版本**

刪除現有的 `enqueueKeysForLock` 函式，改為以下版本：

```typescript
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

    // 已快取的 reusable tool 且已分配房間，不再重複入列
    if (keyTpl.reusable && ctx.reusableItemCache[keyTpl.name] === keyId && ctx.items[keyId]!.initialRoom !== '') {
      return;
    }

    // 計算 eligible rooms：rooms[0..criticalRoomIndex-1]
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
      criticalRoomIndex: target.criticalRoomIndex, // 繼承
    });
  });
}
```

- [ ] **Step 2：實作 generatePuzzleContent 並 export**

在 `generateRoomSkeleton` 之後加入：

```typescript
export function generatePuzzleContent(
  config: GeneratorConfig,
  ctx: GeneratorContext,
  roomIds: RoomId[],
  initialTargets: PhaseBTarget[],
): void {
  const queue: PhaseBTarget[] = [...initialTargets];

  // 先把 Phase A 的地板物品從 visibleItems 移除（Phase B 會決定最終歸宿）
  // 注意：Phase A 已把 item.initialRoom 設好，這裡只是在 BFS 過程中重新分配
  for (const target of initialTargets) {
    const room = ctx.rooms[target.currentRoom]!;
    const idx = room.visibleItems.indexOf(target.itemId);
    if (idx !== -1) room.visibleItems.splice(idx, 1);
  }

  while (queue.length > 0) {
    const target = queue.shift()!;

    const lockLimitReached = config.maxLocks != null && ctx.lockCount >= config.maxLocks;

    if (target.depth < config.targetDepth && !lockLimitReached) {
      const tryComposite = Math.random() < config.compositeRate;
      const lockTemplate = ctx.selectLock(false, tryComposite, config);
      const variation = lockTemplate.variations[Math.floor(Math.random() * lockTemplate.variations.length)]!;

      const containerLock = ctx.createLock(variation, false, target.currentRoom);
      ctx.lockCount++;
      containerLock.containsItems.push(target.itemId);
      ctx.items[target.itemId]!.initialRoom = target.currentRoom;
      ctx.rooms[target.currentRoom]!.lockIds.push(containerLock.id);

      enqueueKeysForLock(ctx, containerLock.id, lockTemplate, target, config, roomIds, queue);
    } else {
      // base case：物品直接留在地板
      ctx.items[target.itemId]!.initialRoom = target.currentRoom;
      const room = ctx.rooms[target.currentRoom]!;
      if (!room.visibleItems.includes(target.itemId)) {
        room.visibleItems.push(target.itemId);
      }
    }
  }
}
```

- [ ] **Step 3：重寫 generatePuzzle 為兩階段串接**

替換現有的 `generatePuzzle` 函式：

```typescript
export function generatePuzzle(config: GeneratorConfig): PuzzleDefinition {
  resetIdCounter();

  const { ctx, roomIds, startRoomId, exitLockId, floorItems } = generateRoomSkeleton(config);
  generatePuzzleContent(config, ctx, roomIds, floorItems);

  return {
    rooms: ctx.rooms,
    items: ctx.items,
    locks: ctx.locks,
    startRoomId,
    exitLockId,
  };
}
```

- [ ] **Step 4：跑所有測試**

```bash
npx vitest run 2>&1 | tail -30
```

Expected: 全部 PASS。如果有失敗，根據錯誤訊息調整。

- [ ] **Step 5：Commit**

```bash
git add src/game/generator.ts
git commit -m "feat: implement Phase B generatePuzzleContent with crossRoomRate, wire into generatePuzzle"
```

---

## Task 7：完整回歸測試

- [ ] **Step 1：跑完整測試套件**

```bash
npx vitest run 2>&1
```

Expected: 所有測試通過，沒有 TypeScript 錯誤。

- [ ] **Step 2：確認 TypeScript 編譯乾淨**

```bash
npx tsc --noEmit
```

Expected: 無輸出（無錯誤）。

- [ ] **Step 3：手動試玩驗證生成結果**

```bash
npm run dev
```

開啟瀏覽器，產生幾個謎題，確認：
- 房間數量符合設定
- 每個房間都有內容（鎖或地板物品）
- 謎題可以正常進行（可以拾取物品、開鎖、移動）

- [ ] **Step 4：最終 Commit**

```bash
git add -A
git commit -m "feat: Phase 3 two-phase generation complete"
```

---

## 自我審查

**Spec coverage check:**
- ✓ maxRooms 固定（Task 1）
- ✓ keySpreadRate 控制 Phase A 鑰匙分散（Task 4）
- ✓ crossRoomRate 控制 Phase B 跨房間（Task 6）
- ✓ roomGrowthRate 移除（Task 1）
- ✓ 可解性保證（criticalRoomIndex 機制，Task 4/6）
- ✓ 出口也是一道門（Task 4，exitLock 用 createLock）

**潛在問題：**
- Task 4 中，`generateRoomSkeleton` 的 `selectLock(true, false, config)` 只選空間鎖模板。需確認 `LOCK_TEMPLATES` 中有足夠的 spatial 模板（最多需 maxRooms-1 個不重複）。若不夠，`availableLocks` 會重新洗牌補充，行為正確但可能出現重複模板。這是可接受的已知限制。
- Task 6 Phase B 開頭先從 `visibleItems` 移除 initialTargets，然後 BFS 重新決定歸宿。如果 base case 物品最終在同一房間，會重新 push 回 `visibleItems`。邏輯正確。
