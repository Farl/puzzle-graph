# 偵訊模式：NPC 鎖 + 證據鑰匙模板系統

## 概述

在現有 Puzzle Graph 架構上以**純模板擴展 + tag 過濾**的方式，新增一套逆轉裁判式「查案偵訊」玩法。核心玩法是：NPC 是固定在房間裡的容器鎖，玩家找到證據、權限、關鍵字後向 NPC 出示，逼他「敞開心房」吐出新的證詞、文件、或對下一個 NPC 的指認。

核心原則：**不加新實體類型、演算法僅做表面擴展**。所有新機制映射到既有 Item + Lock + stateTag 體系。Phase A/B/C 主幹、solver、循環防護全部沿用；唯一演算法改動是 Phase B 的 stateTag 配對候選池放寬，由「僅可拾取」擴為「所有 container lock」。

---

## 1. 設計決策摘要

| 決策 | 取向 |
|---|---|
| 擴展範圍 | 模板新增 + 輕量機制擴展（不動生成演算法） |
| 物理模板去留 | 保留，與新模板共存；以 tag 過濾切換 |
| 世界觀 | 固定「偵探現代」主題（旅館命案／公寓失蹤／公司內鬥風格） |
| 證據可重用 | reusable tool，靠 `maxReusesPerTool` 控制出示次數 |
| NPC 連鎖 | 用既有 stateTag 機制（A 給的口信 → 打開 B 的心房） |
| branch 名稱 | `investigation` |

---

## 2. 架構：tag-based 過濾（取代換池子）

### 2.1 模板標籤約定

所有模板（KeyTemplate + LockTemplate）都帶 `tags`。新增兩大主題標籤：

| Tag | 語義 |
|---|---|
| `classic` | 傳統物理解謎模板（既有的寶箱、黑暗角落、水盆等） |
| `investigation` | 本次新增的 NPC／證據／權限／口信 |

以及偵訊模式內部的細分 tag（下節詳述）：
`npc`, `evidence`, `credential`, `testimony`, `evidence-state`, `personal-item`

同一個模板可同時帶多個 tag，例如一個 NPC 鎖：`['investigation', 'npc', 'combination', 'interrogation']`。

### 2.2 `GeneratorConfig` 新增參數

```ts
interface GeneratorConfig {
  // ...existing fields...

  /** 只保留至少含一個標籤的模板（空陣列或 undefined = 不過濾） */
  includeTemplateTags?: string[];

  /** 排除含任何一個標籤的模板 */
  excludeTemplateTags?: string[];

  /** 當候選中同時有 NPC 鎖和非 NPC 鎖時，選 NPC 鎖的機率（0-1） */
  npcRate?: number;
}
```

### 2.3 Filter 套用位置

在**建立 shuffle 牌堆時**套用 filter，不污染生成主流程：

```ts
// templates.ts 或 generator 初始化階段
function filterTemplates<T extends { tags: readonly string[] }>(
  templates: readonly T[],
  config: GeneratorConfig
): T[] {
  return templates.filter(t => {
    if (config.includeTemplateTags?.length &&
        !config.includeTemplateTags.some(tag => t.tags.includes(tag))) return false;
    if (config.excludeTemplateTags?.length &&
        config.excludeTemplateTags.some(tag => t.tags.includes(tag))) return false;
    return true;
  });
}
```

KeyTemplate 目前沒有 `tags` 欄位，需要加上。過濾同一套邏輯作用於鑰匙與鎖兩個牌堆。

### 2.4 `npcRate` 的整合方式

類似現有 `stateLockRate`、`compositeRate`。在 Phase B 的「模板選擇」階段，過濾出合法模板後：

```
候選分類：npc 鎖 / 狀態鎖 / 組合鎖 / 單鑰匙鎖
優先順序：狀態鎖 → npc 鎖 → 組合/單鑰匙
若有 npc 候選 → 擲 npcRate 決定選 npc 或退回一般邏輯
```

NPC 判定 = 模板帶 `'npc'` tag。

---

## 3. 模板目錄（新增 ~63 個，全數帶 `investigation` tag）

### 3.1 NPC 鎖（~20 個，`category: 'container'`, `pickupable: false`）

所有 NPC 模板特徵：
- `tags: ['investigation', 'npc', <mechanism>, ...subtags]`
- `capacity`: 4L（輕型文件）/ 6L（文件+小物）/ 8L（複雜案情）
- `volume`: 0（場景固定，不佔容器空間）
- 大多 1-3 把 `requiredKeys`，機制混合：
  - `physical` 單證據（出示一份關鍵物證）
  - `combination` 多證據（證據 + 關鍵字、證據 + 權限）
  - `password` 說出關鍵字
  - `hidden` 用權限/身份 tool

範例名稱池（按角色類型分佈）：

| 類型 | 範例 |
|---|---|
| 目擊者 | 夜班門房、清潔阿姨、便利商店店員、計程車司機、遛狗的老人 |
| 關係人 | 死者前妻、失蹤者室友、死者同事、受害者母親 |
| 專業人士 | 法醫、資深記者、私家偵探、律師事務所職員、房屋仲介 |
| 嫌疑人 | 旅館經理、黑市掮客、保全隊長、公寓大樓管理員 |
| 邊緣角色 | 實習生、送貨員、酒保、常客 |

每個 NPC 模板 `variations` 2 個（讓同類型有姓名/場景變化）。

### 3.2 證據鑰匙（~15 個，`type: 'tool'`, `reusable: true`, `tags: ['investigation', 'evidence']`）

範例：現場照片、血衣、遺書副本、監視器截圖、帳戶交易紀錄、電話通聯紀錄、刀具特寫照、DNA 比對報告、時間戳記錄影、指紋鑑定、車牌照片、現場鞋印、死者手機、藥瓶、借據。

### 3.3 權限鑰匙（~5 個，`type: 'tool'`, `reusable: true`, `tags: ['investigation', 'credential']`）

範例：警徽、搜查令、記者證、家屬同意書、律師委任狀。

用於 `hidden` mechanism 的 NPC 鎖——「出示警徽才肯配合」。

### 3.4 口信 / 關鍵字（~8 個，`type: 'clue'`, `reusable: false`, `tags: ['investigation', 'testimony']`）

**這是 NPC 連鎖的核心**：帶 `stateTags`，用於 NPC 鎖之間的指認配對。

範例（`stateTags` 對應某個 NPC 鎖的 `stateTags`）：
- 「死者的暱稱」→ `tip-nickname`
- 「失蹤當晚的爭執」→ `tip-quarrel`
- 「神秘的資金來源」→ `tip-money`
- 「藏匿地點的線索」→ `tip-hideout`
- 「某個未公開的關係」→ `tip-affair`
- 「兇器來源」→ `tip-weapon`
- 「案發時間的修正」→ `tip-timing`
- 「目擊者的動機」→ `tip-motive`

機制：Phase B 在處理一個口信 clue 時，若它帶 stateTag，演算法會優先把它包進某個帶同樣 stateTag 的 container lock 裡（見 §7.2 演算法擴展）。由於多個 NPC 模板會共用同一個 stateTag（例如三個不同 NPC 都可能因「死者的暱稱」被觸動），哪個 NPC 最終收到這條口信是隨機的，產出多樣的偵訊鏈。

### 3.5 證據狀態鎖（~5 個，pickupable container，`tags: ['investigation', 'evidence-state']`）

玩家在背包裡對證據「加工」產出可用證據：

| 狀態鎖 | 所需鑰匙 | 產出（stateTag） |
|---|---|---|
| 模糊的監視器截圖 | 影像增強器 | 清晰截圖（`enhanced-photo`） |
| 撕碎的遺書 | 透明膠帶 | 拼好的遺書（`restored-document`） |
| 加密的錄音檔 | 解密軟體 | 還原的錄音（`decoded-audio`） |
| 燒焦的筆記本 | 紫外線燈 | 可讀的筆記（`revealed-notes`） |
| 沾血的衣物 | 鑑識採樣工具 | DNA 比對報告（`dna-sample`） |

這些「加工完成」的證據會是部分 NPC 鎖指定的 `requiredKeys`。

### 3.6 輕型物件鑰匙（~10 個，消耗型 `type: 'key'`, `tags: ['investigation', 'personal-item']`）

NPC 可以「吐出」或需要收取的輕型實體物：日記本、私章、鑰匙圈、藥罐、存摺、火柴盒、名片盒、懷錶、戒指、手寫地址條。

用於：
- 作為某些 NPC 解鎖後的 `contents`（他交出隨身物）
- 作為其他 NPC 的 `requiredKeys`（拿 A 的遺物去讓 B 情緒潰堤）

---

## 4. 類型系統變更

### 4.1 `KeyTemplate` 新增 `tags` 欄位（必填）

```ts
interface KeyTemplate {
  // ...existing fields...
  tags: readonly string[];  // 既有的 KEY_TEMPLATES 全數補上 ['classic'] 或相關主題 tag
}
```

補標工作：既有 ~55 個 KEY_TEMPLATES 分類加標：
- 一般鑰匙/工具 → `['classic']`
- 既有狀態鎖用的合成零件（battery、metal_rod 等）→ `['classic', 'crafting']`
- 既有固定裝置（water_basin、workbench）→ `['classic', 'station']`

### 4.2 `LockTemplate.tags` 已存在，只需補 `'classic'` 到既有全部模板

### 4.3 新增 `LockCategory` 不變

NPC **不是新 category**。它就是 `category: 'container'` + `pickupable: false` + tag `'npc'`。

這樣生成演算法完全不需要判斷「NPC or not」，只有 UI 層會依 tag 做區別顯示。

---

## 5. UI 最小改動

### 5.1 節點視覺（CanvasGraph）

- NPC 鎖（含 `'npc'` tag 的容器鎖）：indigo 色，icon 改為 👤
- 證據鑰匙：保留 emerald（可拾取物品）但可在 tooltip 附加 `[證據]` 標籤
- 其他節點色彩不變

### 5.2 互動面板（InteractionPanel）

- NPC 鎖獨立區塊，標題「**對話**」，在「機關」區之上
- 解鎖按鈕從「使用 X」改為「**出示 X**」（當目標帶 `'npc'` tag 時）
- 已解鎖的 NPC 顯示「已敞開心房」而非「已打開」

### 5.3 dump.ts 輸出

- NPC 鎖在符號 dump 中以 `[NPC]` 前綴標註，方便 debug 時辨識

---

## 6. 生成設定 preset

新增一組 default preset `investigation-mode`：

```ts
{
  maxRooms: 5,
  targetDepth: 10,
  includeTemplateTags: ['investigation'],  // 純偵訊模式
  npcRate: 0.7,
  stateLockRate: 0.3,   // 證據加工
  compositeRate: 0.5,
  reuseRate: 0.6,       // 證據多次出示
  maxReusesPerTool: 3,  // 一份證據最多用 3 個地方
  crossRoomRate: 0.5,
}
```

另外提供 `mixed-mode`（同時含 classic + investigation）與 `classic-mode`（`excludeTemplateTags: ['investigation']`），可在 UI 下拉選單切換。

---

## 7. 演算法擴展與可解性保證

### 7.1 不變的部分

- Phase A（房間骨架）、Phase C（整合搬移）、solver 完全不改
- 四層循環防護、criticalRoomIndex、reuse 上限、合法性驗證皆沿用
- 新模板走同一套合法性驗證（不可拾取必須同房間、criticalRoomIndex 範圍等）

### 7.2 Phase B 的一處放寬

現行 stateTag 配對邏輯：
> 「處理物品時，找出**可拾取的** container lock 模板中，stateTags 與物品有交集的作為狀態鎖候選」

擴展後：
> 「處理物品時，找出 container lock 模板中，stateTags 與物品有交集的作為**配對候選**；配對候選若為可拾取 → 視為狀態鎖（走 `stateLockRate`）；若為不可拾取 → 視為 NPC 鎖（走 `npcRate`）」

配對優先順序（從高到低）：狀態鎖 → NPC 鎖 → 組合鎖 → 單鑰匙鎖。每層各自擲骰，未命中則退到下一層。

這個擴展不影響既有狀態鎖行為（因為既有的 stateTag 都配到 pickupable lock），純粹新增一條「非可拾取 + stateTag 交集」的路徑給 NPC 使用。

### 7.3 驗證

在 `investigation-mode` preset 下跑 solvability 批測（~5000 seeds），確保 100% 可解率。若失敗，通常是某個 NPC 模板的 `requiredKeys` 組合過苛或 stateTag 配對造成鎖死；模板層調整或 npcRate 微調即可，不動演算法。

---

## 8. 開發順序建議

1. 類型系統：`KeyTemplate.tags` 欄位 + filter 函式 + `GeneratorConfig` 新參數
2. 既有模板補 `'classic'` tag（批次工作）
3. 新增 `investigation` 模板（本文件第 3 節列表）
4. 生成器整合 `npcRate`（Phase B 模板選擇處）
5. UI 改動（顏色、icon、文案、互動面板區塊）
6. 新增 preset 下拉選單
7. 跑 solvability 批測驗證
8. 玩測調參數

---

## 9. 範圍外（不做）

- 對話樹／多輪問答（本次全用 lock/unlock 二態）
- 矛盾指證／錯選懲罰（逆轉裁判的法庭段落，需要全新機制）
- NPC 情緒狀態（多階段解鎖；若需要，用「同一 NPC 在房間裡放 2-3 個獨立 lock + stateTag 串聯」模擬）
- NPC 立繪／音效
- 跨案件敘事（單次生成 = 單一案件）

這些若之後要做，各自是獨立子專案。
