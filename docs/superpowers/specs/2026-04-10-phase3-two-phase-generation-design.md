# Phase 3：兩階段生成設計

日期：2026-04-10

## 背景

Phase 1（型別重構）和 Phase 2（選鎖演算法）已完成。  
Phase 3 的目標是讓生成出來的謎題「感覺像真正的密室脫逃」。

目前的問題是系統性的，不是邊界情況：

- 空間鎖後面可能只有一把鑰匙（開門不值得）
- 房間地板可能堆著一堆沒有謎題的 item（沒有解謎感）

根本原因：現有 BFS 在生成容器鎖的同時也「觸發」空間鎖，兩件事混在一起，沒有辦法各自控制品質。

---

## 核心設計：兩階段分離

### 階段 A：房間骨架

決定空間結構，生成完整的房間圖。

**步驟：**

1. 建立 `maxRooms` 個房間（固定，不動態增減）
2. 建立 `maxRooms - 1` 道房間鎖（連接相鄰房間）
3. 建立 1 道出口鎖（出口也是一道門，門後不需要真實房間）
4. 對每一道鎖，決定其鑰匙放在哪個房間

**鑰匙放置規則（可解性保證）：**

- 合法範圍：玩家在解開這道鎖之前能夠到達的所有房間
- 出口鑰匙：可放在任何房間
- 連接 R_i 和 R_{i+1} 的門鑰匙：可放在 R_0 到 R_i 的任何房間

**鑰匙放置機率（`keySpreadRate`）：**

- 控制鑰匙傾向放在「離鎖近的房間」還是「離鎖遠的房間」
- 低值 → 鑰匙通常在鎖的前一個房間（線性、簡單）
- 高值 → 鑰匙可能出現在很早的房間（跨房間依賴、複雜）

這個機率使得 Phase A 能夠自然生成有趣的空間依賴：
- 「在 A 拿到 B 的門鑰匙，去 B 找出口鑰匙」
- 「出口鑰匙在 B，但 B 的門鑰匙在 A」

---

### 階段 B：謎題填充

拿到 Phase A 的骨架後，用 BFS 把地板上的 item 逐層鎖起來。

**輸入：** Phase A 產出的房間結構（含各房間地板上的 item）  
**輸出：** 完整可玩的謎題（加上容器鎖）

**BFS 流程：**

```
佇列初始 = 所有地板上的 item（Phase A 放置的鑰匙）

處理每個 item：
  if 深度 < targetDepth AND lockCount < maxLocks:
    從 LockTemplate 選一個容器鎖（Phase 2 的 selectLock 邏輯）
    建立容器鎖，把 item 鎖進去
    對容器鎖的每把新鑰匙：
      決定放在哪個房間（見下方）
      enqueue(新鑰匙, 選定房間, 深度+1)
  else:
    item 直接留在地板（base case）
```

**容器鎖鑰匙的房間選擇（跨房間機率）：**

- 合法範圍：玩家在拿到這把新鑰匙之前能夠到達的所有房間
  （即：容器鎖所在房間及其之前的所有房間）
- `crossRoomRate`：控制鑰匙傾向放在「同一個房間」還是「更早的房間」
- 低值 → 鑰匙通常在容器鎖同一個房間
- 高值 → 鑰匙傾向放在更早的房間，製造來回

這個機率使得 Phase B 能夠生成：
- 「在 B 開容器，容器鑰匙卻在 A，需要回 A 才能拿到」

---

## 參數總覽

| 參數 | 狀態 | 說明 |
|---|---|---|
| `maxRooms` | 已有，語義調整 | 從「上限」變成「固定目標」，Phase A 直接用這個建房間 |
| `roomGrowthRate` | **移除** | 不再動態觸發空間鎖，Phase A 一次建好所有房間 |
| `keySpreadRate` | **新增** | Phase A：房間鑰匙放置的分散程度（0=近，1=遠） |
| `crossRoomRate` | **新增** | Phase B：容器鎖鑰匙跨房間放置的機率（0=同房間，1=盡量跨房間） |
| `targetDepth` | 已有 | Phase B 容器鎖的最大嵌套深度，超過就放地板 |
| `maxLocks` | 已有（Phase 2） | 總鎖數上限，Phase B 的另一個停止條件 |
| `compositeRate` | 已有 | Phase B 選容器鎖時，選多鑰匙組合鎖的機率 |
| `reuseRate` | 已有（Phase 2） | Phase B 優先復用已有工具的機率 |
| `tagWeights` / `tagDiversityMode` | 已有（Phase 2） | Phase B 選鎖時的標籤偏好控制 |

---

## 可解性保證

兩個階段各自保證：

**Phase A：**
- 每道鎖的鑰匙放在玩家能在解鎖前到達的房間
- 由 `keySpreadRate` 控制分散程度，但不會超出合法範圍

**Phase B：**
- 每個容器鎖的鑰匙放在玩家能在拿到它之前到達的房間
- 由 `crossRoomRate` 控制，但不會超出合法範圍
- BFS 反向生成本身已保證鑰匙比鎖先可達

---

## 玩家體驗效果

| 參數組合 | 玩家感受 |
|---|---|
| `keySpreadRate` 低 + `crossRoomRate` 低 | 線性推進，每個房間解完再走下一個 |
| `keySpreadRate` 高 + `crossRoomRate` 低 | 空間依賴複雜（需要先去某房間拿鑰匙才能回來開門），但容器謎題在本地 |
| `keySpreadRate` 低 + `crossRoomRate` 高 | 房間間走動簡單，但容器謎題需要來回跑 |
| `keySpreadRate` 高 + `crossRoomRate` 高 | 高複雜度，所有東西都有可能跨房間 |

---

## 與現有程式碼的關係

- **types.ts**：`GeneratorConfig` 新增 `keySpreadRate`、`crossRoomRate`，移除 `roomGrowthRate`
- **generator.ts**：拆成 `generateRoomSkeleton()` (Phase A) + `generatePuzzleContent()` (Phase B)
- **Phase 2 的 selectLock() / resolveKeys()**：在 Phase B 的 BFS 中繼續使用，不變
- **engine.ts / UI**：不受影響

---

## 不做

- 不做非線性房間拓撲（tree / grid），維持線性
- 不做動態房間數量（如容量不夠時自動加房間）
- 不做容量/體積系統（Phase 4 的事）
