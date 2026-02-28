import type { PuzzleFamily, RoomTheme } from './types';

// ─── 房間主題庫 ───

export const ROOM_THEMES: readonly RoomTheme[] = [
  { name: '廢棄走廊', description: '走廊上散落著雜物，空氣中瀰漫著霉味。' },
  { name: '守衛室', description: '牆上滿是監視螢幕，這裡是監控整個設施的樞紐。' },
  { name: '儲藏室', description: '堆滿了陳舊的雜物與貨箱，佈滿蜘蛛網，光線昏暗。' },
  { name: '醫務室', description: '空氣中殘留著刺鼻的消毒水味，有些醫療器材散落在地。' },
  { name: '發電機房', description: '巨大的金屬機器佔據了大部分空間，有股重油與鐵鏽味。' },
  { name: '監獄長辦公室', description: '裝潢相對豪華，有一張大辦公桌，似乎是最高負責人的房間。' },
  { name: '地下實驗室', description: '擺滿了奇怪的化學儀器與試管，有些還冒著不明的氣泡。' },
  { name: '安保武器庫', description: '牆上的架子空空如也，但空氣中仍散發著淡淡的火藥味。' },
  { name: '鍋爐房', description: '悶熱且充滿蒸氣，巨大的鍋爐發出低沉的轟鳴聲。' },
  { name: '通風管道夾層', description: '狹窄且佈滿灰塵的空間，只能彎腰行走。' },
];

// ─── 形容詞庫（用於名稱唯一化）───

export const ADJECTIVES: readonly string[] = [
  '生鏽的', '閃亮的', '古老的', '神秘的', '沉重的',
  '精緻的', '破舊的', '奇特的', '冰冷的', '溫暖的',
  '血跡斑斑的', '佈滿灰塵的', '金色的', '銀色的', '銅製的',
  '鐵製的', '木製的', '石製的', '水晶的', '玻璃的',
  '奇異的', '發光的', '黯淡的', '巨大的', '微小的',
];

// ─── 容器家族（保護物品的鎖機關）───

export const CONTAINER_FAMILIES: readonly PuzzleFamily[] = [
  {
    isSpatial: false,
    keys: [{ name: '生鏽的鑰匙', reusable: false }],
    variations: [
      { name: '上鎖的寶箱', lockMsg: '一個沉重的鐵寶箱，上面有一個十字鎖孔。', unlockMsg: '喀啦一聲，你轉動鑰匙，寶箱打開了。' },
      { name: '舊置物櫃', lockMsg: '員工置物櫃，用簡單的傳統鎖頭鎖著。', unlockMsg: '你打開了置物櫃的門。' },
    ],
  },
  {
    isSpatial: false,
    keys: [{ name: '手電筒', reusable: true }],
    variations: [
      { name: '黑暗的角落', lockMsg: '角落非常暗，伸手不見五指。', unlockMsg: '手電筒的強光照亮了角落，露出了隱藏的東西。' },
      { name: '床底下的陰影', lockMsg: '床底下的空間佈滿灰塵，光線完全照不到。', unlockMsg: '你拿手電筒一照，發現裡面藏了東西。' },
    ],
  },
  {
    isSpatial: false,
    keys: [{ name: '鐵鎚', reusable: true }],
    variations: [
      { name: '堅固的展示櫃', lockMsg: '玻璃展示櫃被強化玻璃保護著。', unlockMsg: '你用鐵鎚用力砸碎了玻璃。' },
      { name: '脆弱的磚牆', lockMsg: '這面牆有幾塊磚看起來特別鬆動。', unlockMsg: '你用鐵鎚暴力敲下磚塊，露出裡面的空間。' },
    ],
  },
  {
    isSpatial: false,
    keys: [{ name: '寫著密碼的紙條', reusable: false }],
    variations: [
      { name: '密碼工具箱', lockMsg: '工具箱上有一個四位數密碼鎖。', unlockMsg: '輸入紙條上的密碼後，工具箱彈開了。', partialMsg: '密碼鎖需要正確的密碼。' },
      { name: '壁掛電子保險櫃', lockMsg: '牆上嵌著一個小巧的九宮格電子密碼箱。', unlockMsg: '嗶嗶幾聲後，保險櫃的綠燈亮起並開啟。', partialMsg: '保險櫃需要正確的密碼。' },
    ],
  },
  {
    isSpatial: false,
    keys: [{ name: '撬棍', reusable: true }],
    variations: [
      { name: '被釘住的木箱', lockMsg: '木箱被粗大的鐵釘釘死。', unlockMsg: '你用撬棍拔出了鐵釘，撬開了木板。' },
      { name: '鬆動的地板', lockMsg: '這塊木地板走起來會發出不尋常的空洞聲。', unlockMsg: '你用撬棍掀開了木地板，發現了下方的暗格。' },
    ],
  },
  {
    isSpatial: false,
    keys: [{ name: '備用電源線', reusable: false }, { name: '解密隨身碟', reusable: false }],
    variations: [
      { name: '高級電子保險箱', lockMsg: '一個高科技保險箱，沒有通電，且需要數位密鑰。', unlockMsg: '接通電源並讀取密鑰成功，保險箱彈開了。' },
    ],
  },
  {
    isSpatial: false,
    keys: [{ name: '紅色酸性試劑', reusable: false }, { name: '藍色鹼性試劑', reusable: false }],
    variations: [
      { name: '化學混合裝置', lockMsg: '一個特殊的玻璃罩，旁邊連接了兩個空的試劑瓶插槽。', unlockMsg: '紅藍試劑混合產生劇烈氣體，腐蝕了玻璃罩的卡榫。' },
    ],
  },
  {
    isSpatial: false,
    keys: [{ name: '黃銅大齒輪', reusable: false }, { name: '生鏽的小齒輪', reusable: false }],
    variations: [
      { name: '大型齒輪機關', lockMsg: '牆上的一個大型機械裝置卡死了，少了幾個齒輪。', unlockMsg: '齒輪咬合，機關開始順暢運轉，打開了暗格。' },
    ],
  },
];

// ─── 空間家族（連接房間的通道鎖）───

export const SPATIAL_FAMILIES: readonly PuzzleFamily[] = [
  {
    isSpatial: true,
    keys: [{ name: '黃銅大鑰匙', reusable: false }],
    variations: [
      { name: '厚重的鐵門', lockMsg: '一扇佈滿鐵鏽的重門，鎖孔非常大。', unlockMsg: '你費力地轉動鑰匙，鐵門發出沉重的摩擦聲開啟了。' },
    ],
  },
  {
    isSpatial: true,
    keys: [{ name: '門禁磁卡', reusable: true }],
    variations: [
      { name: '電子感應門', lockMsg: '門旁有一個紅色的刷卡機。', unlockMsg: '嗶一聲，刷卡機亮起綠燈，自動門滑開了。' },
    ],
  },
  {
    isSpatial: true,
    keys: [{ name: '破壞剪', reusable: true }],
    variations: [
      { name: '被鐵鍊鎖住的門', lockMsg: '這扇門被粗大的鐵鍊死死纏住。', unlockMsg: '你用破壞剪剪斷了鐵鍊，門終於可以推開。' },
    ],
  },
  {
    isSpatial: true,
    keys: [{ name: '金屬把手', reusable: false }],
    variations: [
      { name: '無把手的滑門', lockMsg: '滑門的把手被拔掉了，只剩下一個孔洞。', unlockMsg: '你裝上把手並用力拉動，滑門被打開了。' },
    ],
  },
  {
    isSpatial: true,
    keys: [{ name: '左半閥門', reusable: false }, { name: '右半閥門', reusable: false }],
    variations: [
      { name: '氣密隔離門', lockMsg: '隔離門上需要同時轉動兩個閥門才能解除氣壓鎖定。', unlockMsg: '兩個閥門同時轉動，洩壓聲響起，隔離門緩緩升起。' },
    ],
  },
];

/** 所有謎題家族合併 */
export const ALL_FAMILIES: readonly PuzzleFamily[] = [...CONTAINER_FAMILIES, ...SPATIAL_FAMILIES];
