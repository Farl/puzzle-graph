# Pickupable 統一模型設計

## 核心原則

Graph 只有 key 和 lock。UI 的分類依據是 `pickupable`，不是 graph 角色。

| pickupable | UI 位置 | 行為 |
|---|---|---|
| true | 可見物品 → 拾取 → 背包 | 可選取、可使用 |
| false | 機關與通道 | 場景固定裝置，作為「使用」的目標 |

不論是 key 還是 lock，都依此規則顯示。

## 類型改動

### Lock 新增 `pickupable`

```ts
interface Lock {
  // ...existing...
  pickupable: boolean;  // true = 可拾取進背包（如：乾布、沒電手電筒）
}
```

- 預設 false（向後相容，現有 lock 都是房間固定物）
- 轉換鎖、合成鎖設為 true

### LockTemplate 新增 `pickupable`

```ts
interface LockTemplate {
  // ...existing...
  pickupable?: boolean;  // 預設 false
}
```

### GameState.inventory 接受 LockId

```ts
interface GameState {
  inventory: string[];  // ItemId | LockId，pickupable 的都能放
}
```

實作上 ItemId 和 LockId 都是 string，型別不變，但語義上 inventory 現在可含 Lock。

## UI 改動

### 可見物品區（地板）

顯示：
- pickupable Items（現有行為）
- **pickupable Locks**（新：轉換鎖、合成鎖在地板上可拾取）

不顯示：
- non-pickupable Items（移到機關區）

### 機關與通道區

顯示：
- 所有 Lock（non-pickupable，現有行為）
- **non-pickupable Items**（新：水盆等固定裝置）

### 背包

顯示所有 inventory 中的 entity（Item 或 Lock）。玩家可選取任何一個並「使用」。

### 「使用」互動

玩家從背包選一個 entity（selected），然後點房間中的目標：

| selected (背包) | target (房間) | 動作 |
|---|---|---|
| Item (key) | Lock (mechanism) | `useItemOnLock(selectedKey, targetLock)` — 現有流程 |
| Lock (pickupable) | Item (stationary key) | `useItemOnLock(targetKey, selectedLock)` — 反向：把目標當 key |
| Lock (pickupable) | Lock (mechanism) | 不合法，提示錯誤 |
| Item (key) | Item (stationary key) | 不合法，提示錯誤 |

## Engine 改動

### takeEntity — 統一拾取

新增或修改 `takeItem` 支援拾取 pickupable Lock：

```ts
// 從 room.visibleItems 拾取 Item（現有）
// 從 room.lockIds 拾取 pickupable Lock（新）
```

Lock 從 room.lockIds 移除 → 加入 inventory。
Lock 的 contents 跟著走（玩家攜帶未解鎖的容器）。

### useItemOnLock — 不變

`useItemOnLock(itemId, lockId)` 邏輯不變。UI 層負責判斷 selected 和 target 的角色，正確呼叫。

### Solver

Solver 需要處理：
- pickupable Lock 可被「拾取」（從 lockIds 移到 inventory）
- 背包中的 Lock 仍需要 key 來解鎖
- non-pickupable Item 通過 room presence 判定（已實作）

## Generator 改動

### 轉換鎖模板

```ts
// 水盆 = Lock（固定裝置）
// 乾布 = Item/Key（可拾取，帶到水盆使用）
// 但水盆是 key (reusable)，乾布是 lock (pickupable)
```

不變：水盆是 key（Item, pickupable=false），乾布是 lock（Lock, pickupable=true）。
Generator 把 pickupable lock 放到 room.visibleItems（而非 lockIds），讓玩家能撿起。

或者：pickupable lock 仍在 lockIds，但 UI 把它顯示在物品區。

### LockTemplate.pickupable 傳播

createLock 時讀取 template 的 pickupable 設定。

## 範例：水盆轉換

```
Graph:
  水盆 (Item, key, reusable, pickupable=false) ──requires──► 乾布 (Lock, pickupable=true)
  乾布 contains 濕布 (Item, key)

UI 體驗：
  R0: 地板有「乾布」(lock) → 玩家拾取 → 背包
  R1: 機關區有「水盆」(stationary key)
  玩家選背包中的「乾布」→ 對「水盆」使用
  → engine: useItemOnLock(水盆, 乾布) → 解鎖 → 濕布出現在 R1 地板
```

## 向後相容

- Lock.pickupable 預設 false → 現有 lock 不受影響
- inventory 型別不變（string[]）→ 現有 code 不報錯
- 現有 UI 的 key→lock 互動不變
