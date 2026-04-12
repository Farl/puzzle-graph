# 小遊戲 + 合成/狀態轉換系統設計

## 概述

在現有 Puzzle Graph 的 Lock + Item DAG 架構上，以最小修改擴展三個新機制：

1. **小遊戲鎖 (Minigame Lock)** — 收齊零件後觸發互動式小遊戲，通過才解鎖
2. **合成 (Crafting)** — 收集零件組裝成新物品（本質上是 combination lock）
3. **狀態轉換 (State Conversion)** — 透過不可拾取的固定工具轉換物品（乾布→濕布）

核心原則：**不引入新實體類型**。所有新機制都映射到現有的 Item + Lock 體系，DAG 結構、四層循環防護、solver BFS 全部沿用。

---

## 1. 類型擴展

### 1.1 Item 新增 `pickupable` 欄位

```ts
interface Item {
  // ...existing fields...
  pickupable: boolean;  // 預設 true；stationary tool（水盆、工作台）設為 false
}
```

- 不可拾取物品放在房間地板（`visibleItems`），不能被 `take` 進入背包
- 可以被收在容器鎖內（有正常的 volume），容器開啟後出現在地板上
- `useItemOnLock` 判斷可用性時，除了背包，也檢查同房間地板上的不可拾取物品

### 1.2 LockMechanism 新增 `'minigame'`

```ts
type LockMechanism = 'physical' | 'password' | 'hidden' | 'combination' | 'minigame';
```

### 1.3 Lock 新增 `minigameConfig` 欄位

```ts
interface MinigameConfig {
  type: string;                     // e.g. 'pipe_puzzle', 'wiring'
  seed: number;                     // 隨機種子
  params: Record<string, unknown>;  // 各小遊戲特定參數（網格大小等）
}

interface Lock {
  // ...existing fields...
  minigameConfig?: MinigameConfig;  // 僅 mechanism='minigame' 時存在
}
```

### 1.4 LockTemplate 新增 `minigameType` 欄位

```ts
interface LockTemplate {
  // ...existing fields...
  minigameType?: string;  // 僅 mechanism='minigame' 的模板需要，對應 MinigameRegistry 的 key
}
```

### 1.5 KeyTemplate 新增 `pickupable` 欄位

```ts
interface KeyTemplate {
  // ...existing fields...
  pickupable?: boolean;  // 預設 true（省略即 true），stationary tool 設 false
}
```

---

## 2. 模板擴展

### 2.1 新增 Stationary Tool（不可拾取工具）

```ts
// KeyTemplate
{ id: 'water_basin', name: '水盆', description: '一個裝滿清水的石盆。', type: 'tool', reusable: true, pickupable: false, volume: 3 }
{ id: 'workbench', name: '工作台', description: '一張堅固的金屬工作台，上面有各種夾具。', type: 'tool', reusable: true, pickupable: false, volume: 5 }
```

volume > 0 是因為它可以被收在容器內。

### 2.2 新增 Conversion Lock（狀態轉換鎖）

```ts
// LockTemplate — 水盆轉換
{
  id: 'damp_cloth_conversion', name: '乾布',
  lockedDescription: '一塊乾燥的布。看起來可以浸濕後使用。',
  unlockDescription: '你把布浸入水中，現在它濕潤了。',
  category: 'container', mechanism: 'physical',
  capacity: 4, volume: 2,
  tags: ['conversion', 'water'],
  requiredKeys: ['water_basin'],
  variations: [
    { name: '乾布', lockMsg: '一塊乾燥的布。看起來可以浸濕後使用。', unlockMsg: '你把布浸入水中，現在它濕潤了。' },
  ],
}
```

這個 conversion lock 的 contents 由生成器填入（例如「濕布」）。

### 2.3 新增 Crafting Lock（合成鎖）

合成鎖本質上就是 combination lock，不需要新機制：

```ts
{
  id: 'dead_flashlight', name: '沒電的手電筒',
  lockedDescription: '一把手電筒，但是沒有電池，無法發光。',
  unlockDescription: '你裝入電池，手電筒亮了起來！',
  category: 'container', mechanism: 'combination',
  capacity: 4, volume: 3,
  tags: ['crafting', 'assembly'],
  requiredKeys: ['battery', 'battery'],
  variations: [
    { name: '沒電的手電筒', lockMsg: '手電筒沒有電池。', unlockMsg: '你裝入電池，手電筒亮了起來！' },
  ],
}
```

### 2.4 新增 Minigame Lock（小遊戲鎖）

```ts
{
  id: 'pipe_control', name: '管線控制台',
  lockedDescription: '複雜的管線系統已損壞，需要收集零件並正確連接。',
  unlockDescription: '水流順利通過管線，系統啟動了！',
  category: 'container', mechanism: 'minigame',
  capacity: 8, volume: 5,
  tags: ['minigame', 'mechanical'],
  requiredKeys: ['pipe_part'],
  minigameType: 'pipe_puzzle',
  variations: [
    { name: '管線控制台', lockMsg: '管線系統損壞，需要零件並正確連接。', unlockMsg: '水流通過，系統啟動！' },
  ],
}
```

---

## 3. Generator 改動

### 3.1 MinigameRegistry（類似 PasswordFormatPool）

```ts
interface MinigameGenerator {
  type: string;
  generate(rng: SeededRandom): MinigameConfig;
}

// 全域註冊表
const MINIGAME_GENERATORS: Record<string, MinigameGenerator> = {
  pipe_puzzle: { type: 'pipe_puzzle', generate: (rng) => ({ type: 'pipe_puzzle', seed: rng.nextInt(1000000), params: { gridSize: 4 } }) },
  wiring: { type: 'wiring', generate: (rng) => ({ type: 'wiring', seed: rng.nextInt(1000000), params: { pairCount: 4 } }) },
};
```

### 3.2 生成 minigame lock 時的流程

在 `enqueueKeysForLock` 中（或建立 lock 後），偵測 `lockTemplate.mechanism === 'minigame'`：

```
if lockTemplate.minigameType:
  generator = MINIGAME_GENERATORS[lockTemplate.minigameType]
  lock.minigameConfig = generator.generate(rng)
```

### 3.3 Stationary tool 放置約束

在 `createItem` 時讀取 KeyTemplate 的 `pickupable` 欄位：
- 若 `pickupable === false`，設 `item.pickupable = false`

在 Phase B 包裹 conversion lock 時，增加額外約束：
- conversion lock 的 `currentRoom` 必須 = stationary tool 所在的房間
- 若 stationary tool 尚未放置，先放置 tool，再確保 conversion lock 在同一房間
- 若 stationary tool 已在其他房間，此 conversion lock 不能包裹（fallback 到 base case）

這在現有 `canWrap` 檢查中增加一條規則：

```
// 額外檢查：若 lock 需要 stationary tool，該 tool 必須在 target 的同房間
for each requiredKey in lockTemplate.requiredKeys:
  keyTpl = findKeyTemplate(requiredKey)
  if keyTpl.pickupable === false:
    existingId = reusableItemCache[keyTpl.name]
    if existingId && items[existingId].initialRoom !== '' && items[existingId].initialRoom !== target.currentRoom:
      canWrap = false
```

### 3.4 pickupable 欄位傳播

- `GeneratorContext.createItem` 接受 `pickupable` 參數
- `getOrCreateReusableItem` 和 `createConsumableItem` 從 KeyTemplate 讀取並傳入

---

## 4. Solver 改動

現有：
```ts
const canUnlock = lock.requiredItems.every(id => inventory.has(id));
```

改為：
```ts
const canUnlock = lock.requiredItems.every(id => {
  if (inventory.has(id)) return true;
  const item = items[id];
  // stationary item：玩家在同房間即可使用
  return item != null && !item.pickupable && reachableRooms.has(item.initialRoom);
});
```

注意：stationary item 不會被 pickup 步驟收集（因為 pickupable=false），所以它們不會出現在 inventory 中。Solver 的 pickup 迴圈也需要跳過不可拾取物品：

```ts
// Step 1：拾取可拾取的地板物品
for (const itemId of room.visibleItems) {
  const item = items[itemId];
  if (!item || !item.pickupable) continue;  // 新增 pickupable 檢查
  if (!inventory.has(itemId)) {
    inventory.add(itemId);
    // ...
  }
}
```

---

## 5. Engine 改動

### 5.1 takeItem — 不可拾取物品阻擋

```ts
export function takeItem(state, itemId): GameState {
  const item = state.puzzle.items[itemId];
  if (item && !item.pickupable) {
    addLog(state, 'error', `${item.name} 太重了，無法拿起。`);
    return state;
  }
  // ...existing logic...
}
```

### 5.2 useItemOnLock — 支援房間內 stationary item

現有邏輯只檢查 `inventory` 中是否有物品。新增：同房間地板上的不可拾取物品也算可用。

在 `useItemOnLock` 中，判斷「玩家是否持有 itemId」改為：

```ts
const hasItem = state.inventory.includes(itemId)
  || (!item.pickupable && room.visibleItems.includes(itemId));
```

### 5.3 minigame lock — 兩階段解鎖

收齊 requiredItems 後，不直接呼叫 `performUnlock`：

```ts
if (allInserted && lock.mechanism === 'minigame') {
  addLog(state, 'info', '零件就位，小遊戲已啟動！');
  // 不呼叫 performUnlock — 等待 UI 小遊戲完成
} else if (allInserted) {
  performUnlock(lock, state);
}
```

新增 `completeMinigame` 函式供 UI 回調：

```ts
export function completeMinigame(state: GameState, lockId: LockId): GameState {
  const newState = cloneState(state);
  const lock = newState.puzzle.locks[lockId];
  if (!lock || !lock.isLocked || lock.mechanism !== 'minigame') return newState;
  
  const allInserted = lock.requiredItems.every(reqId => lock.insertedItems.includes(reqId));
  if (!allInserted) return newState;
  
  performUnlock(lock, newState);
  return newState;
}
```

### 5.4 MUD 指令 — minigame lock 提示

在 `use` 指令的解鎖判斷中，加入 minigame 的分支處理（同 5.3 邏輯）。

### 5.5 sweepInventory — 不可拾取物品不在背包中

不需要改動，因為 stationary item 不會進入 inventory。

---

## 6. UI 小遊戲元件

### 6.1 架構

```
src/components/minigames/
  MinigameModal.tsx        — 通用 modal 容器，根據 type 渲染對應元件
  PipePuzzle.tsx           — 水管拼圖（第一版）
  WiringPuzzle.tsx         — 接線配對（第一版）
  types.ts                 — 共用介面
```

### 6.2 共用介面

```ts
interface MinigameProps {
  config: MinigameConfig;
  onComplete: () => void;   // 成功回調
  onClose: () => void;      // 關閉/取消
}
```

### 6.3 水管拼圖 (PipePuzzle)

- NxN 網格（params.gridSize，預設 4x4）
- 每格是一段管道（直線、彎管、T 型、十字）
- 點擊旋轉 90 度
- 目標：從入口連通到出口
- 用 seed 程序化生成可解的初始佈局（先生成解，再隨機旋轉每格）

### 6.4 接線配對 (WiringPuzzle)

- 左右各 N 個端子（params.pairCount，預設 4 對）
- 每個端子有顏色/符號
- 拖曳連線配對
- 線不能交叉（或交叉判定為失敗）
- 用 seed 程序化生成端子排列

### 6.5 InteractionPanel 整合

當玩家點擊 minigame lock 且零件已就位時，顯示 `<MinigameModal>`。完成後呼叫 `completeMinigame`。

---

## 7. Graph 視覺化

- minigame lock 節點顏色：新增 **Orange（橙色）** 表示小遊戲鎖
- conversion lock 沿用 Rose（容器鎖顏色），但可加上虛線邊框區分
- stationary item 沿用 Emerald（物品顏色），但加上實心圓點標記（表示不可拾取）

---

## 8. 向後相容

- `pickupable` 欄位預設 `true`，現有物品不受影響
- `minigameConfig` 為 optional，現有鎖不受影響
- 現有模板不修改，新模板以新增方式加入
- Solver 的 stationary item 邏輯對 `pickupable=true` 的物品不生效（走原有 inventory 路徑）
