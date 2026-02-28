# PUZZLE GRAPH

Puzzle Graph 是一種程序化生成解謎遊戲的理論框架。核心概念是將解謎遊戲建模為一個**有向無環圖 (DAG)**，其中每個謎題的可解性在生成階段就被數學性地保證。

## 核心概念

### 實體類型 (Entity Types)

#### Room（房間）
- 空間容器，玩家可在其中探索
- 包含 items（可見物品）、locks（鎖）、paths（通道）
- 房間之間透過 path 連接

#### Item（物品）
三種類型：
- **key**：單次使用的鑰匙類物品，使用後從背包消耗
- **clue**：線索類物品，揭示密碼等資訊（如密碼紙條）
- **tool**：可重複使用的工具（如手電筒、撬棍），使用後留在背包

物品屬性：
- `id`：唯一識別碼
- `name`：顯示名稱
- `reusable`：是否可重複使用
- `initialRoom`：生成時所在房間

#### Lock（鎖 / 容器鎖）
保護物品的機關，解鎖後釋放內部物品到當前房間。
- `req[]`：所需物品 ID 列表
- `hides`：鎖內隱藏的物品 ID
- `room`：所在房間 ID

#### Path（通道鎖 / 空間鎖）
連接兩個房間的通道門鎖，解鎖後可通行。
- `req[]`：所需物品 ID 列表
- `target`：目標房間 ID
- `hides`：目標房間中的物品（生成時就已放置）

### 鎖機制類型 (Lock Mechanisms)

1. **physical**（物理鎖）- 需要特定鑰匙，鑰匙使用後消耗
2. **password**（密碼鎖）- 需要輸入數字密碼，配合 clue 物品揭示密碼
3. **hidden**（隱藏鎖）- 需要可重複使用的工具突破環境障礙
4. **combination**（組合鎖）- 需要多個物品同時滿足，追蹤部分插入進度
5. **door**（門鎖）- 連接房間的通道，可用鑰匙或密碼開啟

### 謎題家族 (Puzzle Families)

#### 容器家族 (Container Families)
用於保護物品的鎖機關：
- 上鎖寶箱（消耗型鑰匙）
- 黑暗角落（可重複使用手電筒）
- 展示櫃（可重複使用鐵鎚）
- 密碼工具箱（消耗型密碼紙條）
- 釘封木箱（可重複使用撬棍）
- 高科技保險箱（2個消耗型物品：電源線 + USB隨身碟）
- 化學裝置（2個消耗型物品：紅色 + 藍色試劑）
- 齒輪機關（2個消耗型物品：大齒輪 + 小齒輪）

#### 空間家族 (Spatial Families)
用於連接房間的通道鎖：
- 厚重鐵門（消耗型黃銅鑰匙）
- 電子感應門（可重複使用門禁卡）
- 鐵鏈鎖門（可重複使用斷線鉗）
- 無把手滑門（消耗型門把）
- 氣密隔離門（2個消耗型閥門：左閥門 + 右閥門）

## 生成演算法

### 核心原理：反向依賴樹生成

從**出口**開始反向建構依賴樹。保證每把鎖的鑰匙都被放置在可達位置。

### BFS 佇列演算法（進階版）

```
currentTargets = [{ item: exitKey, room: exitRoom, depth: 0, forceSpatial: false }]

while targets remain:
  target = dequeue

  if depth < targetDepth:
    // 決定是否建立空間鎖（新房間）或容器鎖
    trySpatial = forceSpatial OR (random < roomGrowthRate AND rooms < maxRooms)
    // 決定是否選擇組合鎖（多鑰匙）
    tryComposite = random < compositeRate

    // 從匹配的家族中選擇
    family = selectFamily(spatial/container, single/multi-key)

    if spatial:
      建立新房間
      建立 path lock（當前房間 → 新房間）
      物品放入新房間（生成時直接放置）
      每個鑰匙 → enqueue(key, currentRoom, depth+1)
    else:
      建立 container lock 於當前房間
      物品放入鎖內（解鎖時釋放）
      每個鑰匙 → enqueue(key, currentRoom, depth+1)
  else:
    // 基底情況：物品直接放在房間地板上（玩家可直接取得）
    item.initialRoom = currentRoom
```

### 遞迴演算法（基礎版）

```
generateDependencies(targetLock, currentDepth, template, roomId, availableRooms):
  根據鎖類型建立所需物品
  設定 targetLock.requiredItems = requiredItemIds

  對每個所需物品:
    隨機選擇房間放置
    if currentDepth <= 1:  // 基底情況
      物品直接放在房間地板（visibleItems）
    else:  // 遞迴情況
      建立新鎖 → 物品放入鎖內（containsItems）
      遞迴呼叫 generateDependencies(newLock, depth-1, ...)
```

### 可調參數

| 參數 | 範圍 | 說明 |
|---|---|---|
| `targetDepth` | 1-10 | 謎題依賴樹深度（幾層嵌套） |
| `maxRooms` | 3-10 | 最大房間數量 |
| `roomGrowthRate` | 0-1 | 每步建立新房間（空間鎖）的機率 |
| `compositeRate` | 0-1 | 選擇多鑰匙組合謎題的機率 |
| `keySpatialSplitRate` | 0-1 | 組合鎖的次要鑰匙被分配到不同房間的機率 |
| `depthStaggerVariance` | 0-2 | 組合鎖次要鑰匙的深度隨機偏差，產生不對稱依賴樹 |

## 關鍵設計原則

1. **保證可解性**：反向生成確保每把鎖的鑰匙都存在於可達位置，數學上保證遊戲一定能通關
2. **可重複使用物品快取**：工具類物品（手電筒、撬棍等）只建立一次，透過快取（reusableTools / reusableItemCache）共享給所有需要它的謎題
3. **名稱唯一性**：當模板名稱衝突時，從形容詞列表中隨機前綴直到唯一
4. **生成與執行分離**：物品在生成階段就分配好 initialRoom，執行引擎只負責在 room.items 和 inventory 之間搬移，不會建立新物品
5. **空間鎖的關鍵區別**：空間鎖（path）的物品在生成時就已放入目標房間的 items[]，解鎖時不可重複添加（防止 bug）；容器鎖（lock）的物品在解鎖時才釋放到房間地板

## 圖論視覺化

### 拓撲排序佈局 (Topological Sort Layout)

使用 Kahn 演算法（BFS 從零入度節點開始）進行拓撲排序：
1. 建立邊列表：item → lock/path（物品被鎖需要）、lock/path → item（鎖隱藏物品）
2. 從零入度節點（葉子物品）開始 BFS 分配 rank
3. 按 rank 分組，每列垂直置中
4. 產生左到右的 DAG 佈局：前置物品在左，依賴它們的鎖在右

### 節點顏色編碼
- 綠色 (Emerald) = 物品 / 工具節點
- 玫瑰色 (Rose) = 容器鎖節點
- 紫色 (Purple) = 空間通道鎖節點

## 遊戲引擎指令系統

| 指令 | 縮寫 | 功能 |
|---|---|---|
| `look` | `l` | 描述當前房間及所有可見物品/鎖 |
| `inventory` | `i` | 列出背包物品 |
| `examine [目標]` | `x` | 查看鎖的狀態描述或物品描述 |
| `take [物品]` | `t` | 拾取地板上的可見物品到背包 |
| `use [物品] on [鎖]` | - | 使用背包物品作用於鎖 |
| `enter [密碼] on [鎖]` | - | 對密碼鎖輸入密碼 |
| `go [門/房間]` | - | 穿過已解鎖的門到另一房間 |

### 解鎖副作用 (Unlock Side Effects)
1. 設定 `lock.isLocked = false`
2. 如果 `containsItems` 非空：將所有物品移至當前房間的 `visibleItems`
3. 如果 `isExit`：觸發遊戲勝利

### 物品自動回收
使用後，掃描所有未滿足的鎖 - 如果該物品不再被任何鎖需要，自動從背包丟棄（僅限非 reusable 物品）。
