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
| `minigame` | 收齊零件後觸發互動式小遊戲，通過才解鎖 |

### Pickupable 屬性

Graph 中的實體（Item 和 Lock）都有 `pickupable` 屬性，決定 UI 呈現方式：

| pickupable | UI 位置 | 行為 |
|---|---|---|
| `true` | 可見物品區 → 拾取 → 背包 | 可選取、可使用 |
| `false` | 機關與通道區 | 場景固定裝置，作為「使用」的目標 |

背包中的物品不區分 key/lock — 玩家可選取任何背包物品並對目標使用。系統自動判斷 key/lock 角色。

### 模板系統

鎖和鑰匙從預定義的模板目錄中選取：

- **KeyTemplate**：名稱、類型、是否可重複使用、`pickupable`（預設 true）、`stateTags`（狀態鎖配對）
- **LockTemplate**：名稱、機制、所需鑰匙 ID 列表、分類 tag、`pickupable`（狀態鎖用）、`stateTags`、`minigameType`

每個 LockTemplate 指定它需要哪些 KeyTemplate（`requiredKeys: string[]`），並帶有 `tags` 用於多樣性控制。

---

## 兩階段生成演算法

生成分為 **Phase A（房間骨架）** 和 **Phase B（謎題內容填充）**。

### Phase A：房間骨架 (`generateRoomSkeleton`)

建立所有房間、門鎖、出口鎖。房間數量固定為 `maxRooms`。

```
輸入：設定檔

1. 建立 maxRooms 個房間（從主題池隨機取名）

2. 建立 N-1 道門鎖（相鄰房間之間）
   對每道門：
     選取空間鎖模板
     建立空間鎖（從 R[i] 通往 R[i+1]）
     建立對應鑰匙（消耗型或可重複工具，依模板決定）
     鑰匙只能放在門之前可達的房間（依 keySpreadRate 分散）
     加入地板物品佇列

3. 建立出口鎖（最後一個房間）
   建立出口鑰匙，放入任意合法房間

輸出：生成器上下文、房間列表、起點、出口鎖、地板物品佇列
```

**關鍵約束 — `criticalRoomIndex`**：每個 floorItem 記錄它的 `criticalRoomIndex`，代表「這個物品必須放在 `roomIds[0..criticalRoomIndex-1]` 範圍內」。門鑰匙的 criticalRoomIndex = 門的來源房間索引 + 1。

### Phase B：謎題內容填充 (`generatePuzzleContent`)

BFS 處理 Phase A 的 floorItems，將它們包裹在容器鎖中，產生新的鑰匙，直到預算用完。

```
輸入：設定檔、生成器上下文、房間列表、地板物品佇列

建立 BFS 佇列（從地板物品佇列複製）
建立已鎖物品追蹤集合
先將地板物品從房間可見清單移除（Phase B 決定最終歸宿）

當佇列非空時：
  取出佇列首項
  depthBudgetReached = ctx.lockCount >= config.targetDepth
  lockLimitReached = config.maxLocks != null && ctx.lockCount >= config.maxLocks

  ── 狀態鎖優先（不受深度預算限制）──
  若 stateLockRate > 0 且擲骰成功：
    查詢物品對應的 KeyTemplate 的 stateTags
    從可拾取的 LockTemplate 中找 stateTags 有交集者 → 狀態鎖候選

  判斷深度預算是否用完

  若有狀態鎖候選 或 深度預算未用完：
    最多嘗試 5 次選取合法模板：
      首次嘗試用狀態鎖候選，之後用通用 selectLock

      ── 合法性驗證（五層防護）──
      逐一檢查鎖模板所需的可重複工具：
        消耗型鑰匙 → 總是合法
        工具就是被包裹物品本身 → 直接循環，不合法
        工具已達復用上限 → 不合法
        工具被鎖在容器內 → 間接循環，不合法
        工具不可拾取且不在同房間 → 不合法
        工具不在可達房間範圍內 → 不合法

      若驗證通過：
        依 crossRoomRate 決定容器鎖的房間（可跨房間分散）
        建立容器鎖（pickupable 由模板決定）
        若非狀態鎖 → 消耗深度預算
        將物品放入容器，建立子鑰匙並加入佇列
        結束本次嘗試

  ── 無法包裹時 ──
  物品直接留在房間地板
```

### 鑰匙建立與佇列管理

```
對鎖模板的每個所需鑰匙：
  查詢鑰匙模板
  可重複工具 → 從快取取得或建立
  消耗型鑰匙 → 新建（自動處理名稱衝突）
  不可拾取鑰匙 → 強制放在鎖的同房間

  將鑰匙加入鎖的需求清單

  若工具已放置且被更嚴格的容器引用：
    收緊佇列中的 criticalRoomIndex
    必要時將工具移動到合法房間
    不重新入列

  否則放置新鑰匙：
    依 crossRoomRate 選擇合法房間
    加入佇列繼續處理
```

### Phase C：整合搬移 (`consolidate`)

Phase B 結束後，將地板上的物品和小容器搬入現有的大容器中，產生多物品容器和嵌套容器。不建立新鎖或鑰匙。

```
輸入：生成器上下文、房間列表、設定檔

計算每個實體的緊急度（urgency = 所有需要此物品的鎖中最小的 roomIndex）
建立 entityId → 容器鎖 反向映射
建立房間門鎖鏈映射（用於循環檢測）

逐房間處理：
  收集地板實體（visibleItems + 容器鎖）
  按 urgency 降序排列（最不緊急的先嘗試搬移）

  取得同房間的可用容器（排除狀態鎖）

  對每個候選：
    擲骰 consolidationRate → 跳過或繼續
    跳過空間鎖（門不可移動）

    嘗試塞入每個容器：
      urgency 檢查：容器至少要跟候選一樣緊急
      循環檢查：wouldCreateCycle（含容器鏈 + 門鏈 + 父容器鏈）
      容量檢查：已用體積 + 候選體積 ≤ 容器容量
      pickupable 相容：不可攜帶物件不能進可攜帶容器
      嵌套深度檢查：不超過 maxNestingDepth

      通過所有檢查 → 搬入容器、從地板移除
```

---

## 循環依賴防護

可重複使用的工具（tool）可以被多個鎖共用，這帶來循環依賴風險。防護分佈在 Phase B 和 Phase C 兩個階段。

### Phase B 防護（canWrap + enqueueKeysForLock）

Phase B 最多嘗試 5 次不同模板，避免單次 canWrap 失敗就放棄包裹。

| 層 | 位置 | 防護內容 |
|---|---|---|
| 直接循環 | `canWrap` | 工具就是被包裹物品本身 → 跳過 |
| 復用上限 | `canWrap` | 工具已達 `maxReusesPerTool` → 跳過 |
| 容器內鎖定 | `canWrap` | 工具被鎖在容器內 → 跳過（取不出來） |
| 空間合法性 | `canWrap` | 工具在 `criticalRoomIndex` 範圍外 → 跳過 |
| 重複包裝 | `itemsInContainers` | 已在容器內的物品不再包裝（BFS 佇列可能重複處理同一 item） |
| 佇列收緊 | `enqueueKeysForLock` | 工具被更嚴格的容器引用時，收緊佇列中的 criticalRoomIndex |
| Key 房間限制 | `enqueueKeysForLock` | Key 不能比容器鎖所在房間更遠（玩家到容器時一定能到 key） |

### Phase C 防護（consolidation）

| 層 | 防護內容 |
|---|---|
| 全鏈循環檢測 | `wouldCreateCycle` + `collectPrerequisites`：遞迴展開容器鏈 + 容器的父容器鏈 + 空間鎖門鏈，確保 candidate 不是 container 的直接或間接前置 |
| 狀態鎖排除 | 有 `stateTags` 的鎖（合成/轉換鎖）不作為 consolidation 目標，內容物語意固定 |
| Pickupable 相容 | 不可攜帶的物件不能塞進可攜帶的容器 |

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

## 狀態鎖（State Lock）

狀態鎖是**可拾取的容器鎖**，代表物品的狀態轉換或合成。整合在 Phase B 中，不消耗 `targetDepth` 預算。

### 配對邏輯

透過 `stateTags` 配對：
- **KeyTemplate.stateTags**：工具的狀態標籤（如手電筒: `['light-tool']`）
- **LockTemplate.stateTags**：狀態鎖的配對標籤（如沒電的手電筒: `['light-tool']`）

Phase B 處理一個工具時，若 `stateLockRate` 命中且 stateTags 有交集 → 用狀態鎖包裹該工具。

### 範例

| 工具（產品） | 狀態鎖 | 所需鑰匙 | 場景 |
|---|---|---|---|
| 手電筒 `['light-tool']` | 沒電的手電筒 `['light-tool']` | 電池 ×2 | 裝電池 |
| 撬棍 `['lever-tool']` | 斷裂的撬棍 `['lever-tool']` | 金屬桿 | 修復 |
| 門禁磁卡 `['electronic-key']` | 空白磁卡 `['electronic-key']` | IC 晶片 | 寫入權限 |
| 破壞剪 `['cutting-tool']` | 鈍掉的破壞剪 `['cutting-tool']` | 磨刀石 | 磨利 |
| 濕布 `['water-station']` | 乾布 `['water-station']` | 水盆（固定） | 浸水 |

### 玩家體驗

1. 撿到狀態鎖（如沒電的手電筒）→ 放進背包
2. 找到所需鑰匙（如電池）→ 背包裡選電池 → 對手電筒使用
3. 裝滿後自動解鎖 → 有電的手電筒進背包，沒電的消失
4. 或：帶乾布到有水盆（固定裝置）的房間 → 對水盆使用 → 獲得濕布

---

## 小遊戲系統

`mechanism: 'minigame'` 的容器鎖收齊零件後**不自動解鎖**，改為觸發互動式小遊戲。

### 流程

1. 玩家收齊所有 `requiredItems`（背包選取 → 對鎖使用）
2. 鎖顯示「挑戰」按鈕
3. 點擊觸發 `MinigameModal`，根據 `minigameConfig.type` 渲染對應元件
4. 玩家完成小遊戲 → `completeMinigame(lockId)` → 解鎖

### MinigameConfig

```ts
{ type: 'pipe_puzzle', seed: 12345, params: { gridSize: 4 } }
{ type: 'wiring', seed: 67890, params: { pairCount: 4 } }
```

由 `MinigameRegistry` 的 generator 程序化產生，seed 確保可重現。

### 已實作小遊戲

| 類型 | 說明 |
|---|---|
| `pipe_puzzle` | NxN 網格管道旋轉拼圖，連通入口到出口 |
| `wiring` | 左右端子配色接線 |

---

## 可調參數

| 參數 | 範圍 | 說明 |
|---|---|---|
| `targetDepth` | 1-20 | 全域鎖預算（含容器鎖、狀態鎖、小遊戲鎖） |
| `maxRooms` | 1-10 | 房間數量（固定值，非上限） |
| `compositeRate` | 0-1 | 選擇多鑰匙組合鎖的機率 |
| `depthStaggerVariance` | 0-2 | 組合鎖次要鑰匙的深度隨機偏差 |
| `keySpreadRate` | 0-1 | Phase A 門鑰匙分散程度（0=緊鄰門，1=任意合法房間） |
| `crossRoomRate` | 0-1 | Phase B 容器鎖和鑰匙跨房間機率（0=同房間，1=任意合法房間） |
| `reuseRate` | 0-1 | 已有可重複工具時走復用路徑的機率 |
| `maxReusesPerTool` | 1-∞ | 每個工具最多被幾把鎖共用 |
| `maxLocks` | 1-∞ | 容器鎖總量硬上限（與 targetDepth 互補，先到先停） |
| `tagDiversityMode` | string | 鎖模板 tag 多樣性策略 |
| `tagWeights` | Record | tag 加權（僅 weighted 模式使用） |
| `stateLockRate` | 0-1 | 工具被狀態鎖包裹的機率（不消耗 targetDepth） |

---

## 可解性保證

### 結構保證（生成階段）

1. **反向依賴生成**：鑰匙總是放在鎖之前可達的房間（由 `criticalRoomIndex` 約束）
2. **循環防護**：四層機制確保無循環依賴（見上方）
3. **房間線性拓撲**：Phase A 建立 R0→R1→R2→... 的線性門鎖鏈，鑰匙只能放在門的來源側或更早的房間

### 驗證（測試階段）

`solvePuzzle` 模擬玩家行為驗證可解性：
1. 拾取所有可到達房間的 pickupable 物品和 pickupable 鎖
2. 嘗試用背包物品開啟所有可到達的鎖（含背包中的 pickupable 鎖）
3. 不可拾取的物品（stationary key）通過房間在場判定
4. 重複直到無法繼續
5. 若最終能打開出口 → 可解

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

### DAG 邊的定義

| 邊類型 | 方向 | 語義 | 視覺 |
|---|---|---|---|
| `requires` | item → lock | 物品被鎖需要 | 實線灰色箭頭 |
| `contains` | lock → item | 開鎖後取得物品 | 虛線青色箭頭 |
| gate | spatial lock → 目標房間所有實體 | 過門後才能存取 | 虛線紫色箭頭（指向房間框） |

**gate 邊**參與 Kahn 排序但不顯示為節點間連線。可解的 puzzle 保證 gate 邊不會造成循環（若有循環 = 生成器 bug）。空間鎖到目標房間 group 的連線獨立繪製。

### 佈局規則

- **Y 軸**：Kahn 拓撲 rank（深度向下），絕對值，不做後處理
- **X 軸**：同 rank 水平展開，按房間順序 → 容器歸屬排序
- **房間分離**：計算每房間 X 範圍後，依序推開確保 bounding box 不交疊
- **所有連線**：從節點底部中央出發 → 目標節點頂部中央。反向邊從底部往下繞弧

### 群組

| 群組 | 視覺 | 內容 |
|---|---|---|
| 房間 | 藍色邊框 | 同 roomId 的所有節點 |
| 容器 | 紅色虛線邊框 | 容器鎖 + 遞迴 contents |

### 節點顏色

| 顏色 | 意義 |
|---|---|
| Emerald（綠） | 可拾取物品 |
| Orange（橙） | 小遊戲鎖 / 不可拾取物品（固定裝置） |
| Rose（玫瑰） | 容器鎖 |
| Purple（紫） | 空間鎖（門） |
| Amber（琥珀） | 出口鎖 |

圖譜始終顯示**原始 puzzle**（不受遊玩過程中的狀態修改影響）。

---

## 已知限制

### 房間內容分配不均

Phase B 的 BFS（FIFO）處理 Phase A 產出的地板物品，大部分起源於 R0。每次包裝消耗一個 `targetDepth` 預算，等到處理 R1/R2 的物品時預算通常已耗盡。結果：起始房間堆滿容器鎖，後面房間幾乎空的。

`criticalRoomIndex` 是靜態近似值（基於房間線性順序），不追蹤動態依賴鏈。Random BFS（隨機抽選房間處理）曾嘗試但失敗 — 改變 RNG 流後產出完全不同的 puzzle，`criticalRoomIndex` 無法保證可解性（門鑰匙被搬到門後面、起點沒有任何可用資源等）。

**需要重新設計**：可能方向包括 Phase B 後處理重分配、per-room 預算保留、或改進 `criticalRoomIndex` 為動態依賴追蹤。
