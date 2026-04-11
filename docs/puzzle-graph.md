# Puzzle Graph 演算法設計

Puzzle Graph 是一種程序化生成解謎遊戲的理論框架。核心概念是將解謎遊戲建模為一個**有向無環圖 (DAG)**，其中每個謎題的可解性在生成階段就被數學性地保證。

---

## 核心概念

### 實體類型

| 實體 | 說明 |
|---|---|
| **Room** | 空間容器，包含地板物品 (`visibleItems`) 和鎖 (`lockIds`) |
| **Item** | 物品。`key`（消耗型鑰匙）、`clue`（線索）、`tool`（可重複使用工具） |
| **Lock** | 機關。`container`（容器鎖，保護物品）或 `spatial`（空間鎖，連接房間） |

### 鎖機制

| 機制 | 說明 |
|---|---|
| `physical` | 需要特定鑰匙插入 |
| `password` | 需要輸入密碼（配合 clue 物品） |
| `hidden` | 需要工具突破環境障礙（如手電筒照亮暗角落） |
| `combination` | 需要多個物品同時滿足 |

### 模板系統

鎖和鑰匙從預定義的模板目錄中選取：

- **KeyTemplate**：定義鑰匙的名稱、類型、是否可重複使用
- **LockTemplate**：定義鎖的名稱、機制、所需鑰匙 ID 列表、分類 tag

每個 LockTemplate 指定它需要哪些 KeyTemplate（`requiredKeys: string[]`），並帶有 `tags` 用於多樣性控制。

---

## 兩階段生成演算法

生成分為 **Phase A（房間骨架）** 和 **Phase B（謎題內容填充）**。

### Phase A：房間骨架 (`generateRoomSkeleton`)

建立所有房間、門鎖、出口鎖。房間數量固定為 `maxRooms`。

```
輸入：config

1. 建立 maxRooms 個房間（從主題池隨機取名）
   roomIds = [R0, R1, R2, ...]
   startRoomId = R0（玩家起點）

2. 建立 N-1 道門鎖（相鄰房間之間）
   for i = 0 to maxRooms-2:
     selectLock(spatial) → 取得鎖模板
     建立空間鎖 door (R[i] → R[i+1])
     建立鑰匙 key（消耗型或可重複工具，依模板決定）
     eligible = roomIds[0..i]     // 鑰匙只能放在門之前可達的房間
     key.initialRoom = pickRoom(eligible, keySpreadRate)
     floorItems.push(key)

3. 建立出口鎖（最後一個房間，isExit=true）
   建立出口鑰匙 → pickRoom(roomIds, keySpreadRate) → floorItems.push

輸出：ctx, roomIds, startRoomId, exitLockId, floorItems
```

**關鍵約束 — `criticalRoomIndex`**：每個 floorItem 記錄它的 `criticalRoomIndex`，代表「這個物品必須放在 `roomIds[0..criticalRoomIndex-1]` 範圍內」。門鑰匙的 criticalRoomIndex = 門的來源房間索引 + 1。

### Phase B：謎題內容填充 (`generatePuzzleContent`)

BFS 處理 Phase A 的 floorItems，將它們包裹在容器鎖中，產生新的鑰匙，直到預算用完。

```
輸入：config, ctx, roomIds, floorItems（Phase A 的輸出）

queue = [...floorItems]
itemsInContainers = Set()

// 先從 visibleItems 移除（Phase B 決定最終歸宿）
for each target in floorItems:
  room.visibleItems.remove(target.itemId)

while queue 非空:
  target = queue.shift()
  depthBudgetReached = ctx.lockCount >= config.targetDepth
  lockLimitReached = config.maxLocks != null && ctx.lockCount >= config.maxLocks

  if !depthBudgetReached && !lockLimitReached:
    lockTemplate = selectLock(container, itemsInContainers)

    // === 合法性驗證（單次遍歷 requiredKeys）===
    canWrap = lockTemplate.requiredKeys.every(keyTplId =>
      keyTpl = findKeyTemplate(keyTplId)
      if !keyTpl.reusable: return true           // 消耗型鑰匙總是合法
      if reusableCache[keyTpl.name] === target.itemId: return false  // 直接循環
      existingId = reusableCache[keyTpl.name]
      if !existingId || !items[existingId].initialRoom: return true  // 尚未建立
      return eligibleRooms.has(items[existingId].initialRoom)        // 空間合法性
    )

    if canWrap:
      建立容器鎖 containerLock（在 target.currentRoom）
      containerLock.containsItems = [target.itemId]
      itemsInContainers.add(target.itemId)
      enqueueKeysForLock(lockTemplate, target, queue)
      continue

  // base case：物品直接留在地板
  target.itemId → room.visibleItems
```

### `enqueueKeysForLock`：鑰匙建立與佇列管理

```
for each keyTemplateId in lockTemplate.requiredKeys:
  keyTpl = findKeyTemplate(keyTemplateId)

  if keyTpl.reusable:
    keyId = getOrCreateReusableItem(keyTpl.name)  // 快取
  else:
    keyId = createConsumableItem(keyTpl.name)      // 新建

  lock.requiredItems.push(keyId)

  // === 已存在工具的 criticalRoomIndex 收緊 ===
  if reusable && 已放置 (initialRoom ≠ ''):
    找到工具在 queue 中的 entry
    if entry.criticalRoomIndex > target.criticalRoomIndex:
      收緊 criticalRoomIndex → min(兩者)
      若工具目前位置超出新限制，移動到最後一個合法房間
    return  // 不重新入列

  // 放置新鑰匙
  eligible = roomIds[0..criticalRoomIndex-1]
  keyRoom = pickRoom(eligible, crossRoomRate)
  room.visibleItems.push(keyId)
  queue.push({ itemId: keyId, currentRoom: keyRoom, criticalRoomIndex, depth+1 })
```

---

## 循環依賴防護（三層機制）

可重複使用的工具（tool）可以被多個鎖共用，這帶來循環依賴風險。

### 第一層：直接循環防護 (`canWrap`)

若鎖模板需要的工具**就是正在被包裹的物品本身**，放棄包裹。

例：手電筒要被放進「黑暗角落」容器，但「黑暗角落」需要手電筒才能打開 → 直接循環。

### 第二層：空間合法性 (`canWrap`)

若鎖模板需要的工具**已被放在 `criticalRoomIndex` 範圍外的房間**，放棄包裹。

例：工具在 R1（需要先過門才能到），但當前物品的 `criticalRoomIndex=1`（鑰匙只能放 R0）→ 玩家無法在需要前取得工具。

### 第三層：間接循環防護 (`lockedItems`)

`selectLock` 的復用路徑（`tryReusePath`）在選擇可復用工具時，**跳過目前被鎖在容器內的工具**（`itemsInContainers`）。

例：工具 T 在容器 C1 內 → 若新容器 C2 也需要 T → 若 C2 的鑰匙又在 C1 內 → 間接循環。

### 第四層：佇列收緊 (`enqueueKeysForLock`)

當一個工具被**更嚴格的容器**重新引用時，在 BFS 佇列中收緊它的 `criticalRoomIndex`，並視需要將工具移動到合法房間。

例：工具 T 因 `criticalRoomIndex=2` 被放在 R1，但新容器只有 `criticalRoomIndex=1` → 收緊為 1，移動 T 到 R0。

---

## 鎖模板選擇演算法

### 復用路徑 (`tryReusePath`)

當 `reuseRate > 0` 且擲骰成功時：
1. 收集已建立的可重複工具（未達 `maxReusesPerTool` 上限、不在 `itemsInContainers` 中）
2. 隨機選一個工具 → 找到需要該工具的 LockTemplate
3. 若找到相容模板 → 使用它（工具不需重新建立）

### 正常路徑

從 `availableLocks` 池中篩選：
1. 匹配 `category`（container 或 spatial）
2. 匹配 `compositeRate`（單鑰匙或多鑰匙）
3. 加權抽選（依 `tagDiversityMode` 調整權重）

### Tag 多樣性模式

| 模式 | 行為 |
|---|---|
| `balanced` | 使用次數少的 tag 權重更高（自動平衡各類謎題） |
| `weighted` | 按 `tagWeights` 設定的權重抽選 |
| `no-repeat` | 降低與上一次相同 tag 的權重（避免連續重複） |

---

## 可調參數

| 參數 | 範圍 | 說明 |
|---|---|---|
| `targetDepth` | 1-10 | 全域容器鎖預算（控制整體解謎長度） |
| `maxRooms` | 1-10 | 房間數量（固定值，非上限） |
| `compositeRate` | 0-1 | 選擇多鑰匙組合鎖的機率 |
| `depthStaggerVariance` | 0-2 | 組合鎖次要鑰匙的深度隨機偏差 |
| `keySpreadRate` | 0-1 | Phase A 門鑰匙分散程度（0=緊鄰門，1=任意合法房間） |
| `crossRoomRate` | 0-1 | Phase B 容器鎖鑰匙跨房間機率（0=同房間，1=任意合法房間） |
| `reuseRate` | 0-1 | 已有可重複工具時走復用路徑的機率 |
| `maxReusesPerTool` | 1-∞ | 每個工具最多被幾把鎖共用 |
| `maxLocks` | 1-∞ | 容器鎖總量硬上限（與 targetDepth 互補，先到先停） |
| `tagDiversityMode` | string | 鎖模板 tag 多樣性策略 |
| `tagWeights` | Record | tag 加權（僅 weighted 模式使用） |

---

## 可解性保證

### 結構保證（生成階段）

1. **反向依賴生成**：鑰匙總是放在鎖之前可達的房間（由 `criticalRoomIndex` 約束）
2. **循環防護**：四層機制確保無循環依賴（見上方）
3. **房間線性拓撲**：Phase A 建立 R0→R1→R2→... 的線性門鎖鏈，鑰匙只能放在門的來源側或更早的房間

### 驗證（測試階段）

`solvePuzzle` 模擬玩家行為驗證可解性：
1. 拾取所有可到達房間的地板物品
2. 嘗試用背包物品開啟所有可到達的鎖
3. 重複直到無法繼續
4. 若最終能打開出口 → 可解

自動化測試以多種配置各跑 50-100 次，確保 100% 可解率。

---

## 遊戲引擎

### 雙向房間通行

空間鎖解鎖後，玩家可從門的**任一端**穿過。引擎判斷玩家在門的哪一端，自動計算目的地。UI 區分：
- **本房間的門**（amber 底色 + emerald「進入」按鈕）
- **從其他房間連過來的通道**（sky 藍底色 + sky「前往」按鈕）

### MUD 指令系統

| 指令 | 縮寫 | 功能 |
|---|---|---|
| `look` | `l` | 觀察四周（含回程門） |
| `inventory` | `i` | 查看背包 |
| `examine [目標]` | `x` | 檢查物品或鎖的狀態 |
| `take [物品]` | `t` | 拾取地板物品 |
| `use [物品] on [鎖]` | - | 使用物品解鎖 |
| `enter [密碼] on [鎖]` | - | 輸入密碼 |
| `go [門/房間名]` | - | 穿過門到另一房間（支援雙向） |

### 物品自動回收

解鎖後掃描背包，不再被任何未解鎖需要的消耗型物品自動移除。

---

## 圖譜視覺化

使用 Kahn 拓撲排序演算法計算 DAG 佈局，以鄰接表實作（O(V+E)）。

### 邊的語義

| 邊 | 方向 | 意義 |
|---|---|---|
| 實線箭頭 | item → lock | 物品被鎖需要（`requires`） |
| 虛線箭頭（青色） | lock → item | 開鎖後取得物品（`contains`） |
| 虛線箭頭（青色） | spatial lock → 目標房間的鎖/物品 | 過門後可存取的內容 |

### 節點顏色

| 顏色 | 意義 |
|---|---|
| Emerald（綠） | 物品 |
| Rose（玫瑰） | 容器鎖 |
| Purple（紫） | 空間鎖（門） |
| Amber（琥珀） | 出口鎖 |

圖譜始終顯示**原始 puzzle**（不受遊玩過程中的狀態修改影響）。
