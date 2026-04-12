import type { KeyTemplate, LockTemplate } from './types';

// ─── 鑰匙目錄 ───

export const KEY_TEMPLATES: readonly KeyTemplate[] = [
  // 消耗型鑰匙
  { id: 'rusty_key', name: '生鏽的鑰匙', description: '一把佈滿鐵鏽的老舊鑰匙。', type: 'key', reusable: false, volume: 1 },
  { id: 'password_note', name: '寫著密碼的紙條', description: '一張皺巴巴的紙條。', type: 'clue', reusable: false, volume: 0.5 },
  { id: 'power_cable', name: '備用電源線', description: '一條粗重的電源線。', type: 'key', reusable: false, volume: 2 },
  { id: 'usb_drive', name: '解密隨身碟', description: '一個不起眼的隨身碟。', type: 'key', reusable: false, volume: 0.5 },
  { id: 'red_reagent', name: '紅色酸性試劑', description: '裝著紅色液體的瓶子。', type: 'key', reusable: false, volume: 2 },
  { id: 'blue_reagent', name: '藍色鹼性試劑', description: '裝著藍色液體的瓶子。', type: 'key', reusable: false, volume: 2 },
  { id: 'large_gear', name: '黃銅大齒輪', description: '一個沉重的黃銅齒輪。', type: 'key', reusable: false, volume: 3 },
  { id: 'small_gear', name: '生鏽的小齒輪', description: '一個小型生鏽齒輪。', type: 'key', reusable: false, volume: 1 },
  { id: 'brass_key', name: '黃銅大鑰匙', description: '一把巨大的黃銅鑰匙。', type: 'key', reusable: false, volume: 2 },
  { id: 'door_handle', name: '金屬把手', description: '一個沉重的金屬門把手。', type: 'key', reusable: false, volume: 2 },
  { id: 'left_valve', name: '左半閥門', description: '半圓形的閥門零件。', type: 'key', reusable: false, volume: 2 },
  { id: 'right_valve', name: '右半閥門', description: '半圓形的閥門零件。', type: 'key', reusable: false, volume: 2 },

  // 可重複使用工具
  { id: 'flashlight', name: '手電筒', description: '一把堅固的金屬手電筒。', type: 'tool', reusable: true, volume: 2 },
  { id: 'hammer', name: '鐵鎚', description: '一把沉重的鐵鎚。', type: 'tool', reusable: true, volume: 3 },
  { id: 'crowbar', name: '撬棍', description: '一根堅固的金屬撬棍。', type: 'tool', reusable: true, volume: 3 },
  { id: 'keycard', name: '門禁磁卡', description: '一張帶有磁條的門禁卡。', type: 'tool', reusable: true, volume: 0.5 },
  { id: 'bolt_cutter', name: '破壞剪', description: '一把大型的金屬剪。', type: 'tool', reusable: true, volume: 3 },
];

// ─── 鎖目錄 ───

export const LOCK_TEMPLATES: readonly LockTemplate[] = [
  // ── 容器鎖 ──
  {
    id: 'locked_chest', name: '上鎖的寶箱',
    lockedDescription: '一個沉重的鐵寶箱，上面有一個十字鎖孔。',
    unlockDescription: '喀啦一聲，你轉動鑰匙，寶箱打開了。',
    category: 'container', mechanism: 'physical', capacity: 8, volume: 5,
    tags: ['physical', 'key-lock'],
    requiredKeys: ['rusty_key'],
    variations: [
      { name: '上鎖的寶箱', lockMsg: '一個沉重的鐵寶箱，上面有一個十字鎖孔。', unlockMsg: '喀啦一聲，你轉動鑰匙，寶箱打開了。' },
      { name: '舊置物櫃', lockMsg: '員工置物櫃，用簡單的傳統鎖頭鎖著。', unlockMsg: '你打開了置物櫃的門。' },
    ],
  },
  {
    id: 'dark_corner', name: '黑暗的角落',
    lockedDescription: '角落非常暗，伸手不見五指。',
    unlockDescription: '手電筒的強光照亮了角落，露出了隱藏的東西。',
    category: 'container', mechanism: 'hidden', capacity: 4, volume: 3,
    tags: ['hidden', 'light'],
    requiredKeys: ['flashlight'],
    variations: [
      { name: '黑暗的角落', lockMsg: '角落非常暗，伸手不見五指。', unlockMsg: '手電筒的強光照亮了角落，露出了隱藏的東西。' },
      { name: '床底下的陰影', lockMsg: '床底下的空間佈滿灰塵，光線完全照不到。', unlockMsg: '你拿手電筒一照，發現裡面藏了東西。' },
    ],
  },
  {
    id: 'display_case', name: '堅固的展示櫃',
    lockedDescription: '玻璃展示櫃被強化玻璃保護著。',
    unlockDescription: '你用鐵鎚用力砸碎了玻璃。',
    category: 'container', mechanism: 'hidden', capacity: 4, volume: 3,
    tags: ['hidden', 'brute-force'],
    requiredKeys: ['hammer'],
    variations: [
      { name: '堅固的展示櫃', lockMsg: '玻璃展示櫃被強化玻璃保護著。', unlockMsg: '你用鐵鎚用力砸碎了玻璃。' },
      { name: '脆弱的磚牆', lockMsg: '這面牆有幾塊磚看起來特別鬆動。', unlockMsg: '你用鐵鎚暴力敲下磚塊，露出裡面的空間。' },
    ],
  },
  {
    id: 'password_toolbox', name: '密碼工具箱',
    lockedDescription: '工具箱上有一個四位數密碼鎖。',
    unlockDescription: '輸入紙條上的密碼後，工具箱彈開了。',
    partialDescription: '密碼鎖需要正確的密碼。',
    category: 'container', mechanism: 'password', capacity: 8, volume: 5,
    tags: ['password', 'code'],
    requiredKeys: ['password_note'],
    variations: [
      { name: '密碼工具箱', lockMsg: '工具箱上有一個四位數密碼鎖。', unlockMsg: '輸入紙條上的密碼後，工具箱彈開了。', partialMsg: '密碼鎖需要正確的密碼。' },
      { name: '壁掛電子保險櫃', lockMsg: '牆上嵌著一個小巧的九宮格電子密碼箱。', unlockMsg: '嗶嗶幾聲後，保險櫃的綠燈亮起並開啟。', partialMsg: '保險櫃需要正確的密碼。' },
    ],
  },
  {
    id: 'nailed_box', name: '被釘住的木箱',
    lockedDescription: '木箱被粗大的鐵釘釘死。',
    unlockDescription: '你用撬棍拔出了鐵釘，撬開了木板。',
    category: 'container', mechanism: 'hidden', capacity: 8, volume: 5,
    tags: ['hidden', 'brute-force'],
    requiredKeys: ['crowbar'],
    variations: [
      { name: '被釘住的木箱', lockMsg: '木箱被粗大的鐵釘釘死。', unlockMsg: '你用撬棍拔出了鐵釘，撬開了木板。' },
      { name: '鬆動的地板', lockMsg: '這塊木地板走起來會發出不尋常的空洞聲。', unlockMsg: '你用撬棍掀開了木地板，發現了下方的暗格。' },
    ],
  },
  {
    id: 'hightech_safe', name: '高級電子保險箱',
    lockedDescription: '一個高科技保險箱，沒有通電，且需要數位密鑰。',
    unlockDescription: '接通電源並讀取密鑰成功，保險箱彈開了。',
    category: 'container', mechanism: 'combination', capacity: 14, volume: 8,
    tags: ['combination', 'electronic'],
    requiredKeys: ['power_cable', 'usb_drive'],
    variations: [
      { name: '高級電子保險箱', lockMsg: '一個高科技保險箱，沒有通電，且需要數位密鑰。', unlockMsg: '接通電源並讀取密鑰成功，保險箱彈開了。' },
    ],
  },
  {
    id: 'chemical_mixer', name: '化學混合裝置',
    lockedDescription: '一個特殊的玻璃罩，旁邊連接了兩個空的試劑瓶插槽。',
    unlockDescription: '紅藍試劑混合產生劇烈氣體，腐蝕了玻璃罩的卡榫。',
    category: 'container', mechanism: 'combination', capacity: 4, volume: 3,
    tags: ['combination', 'chemical'],
    requiredKeys: ['red_reagent', 'blue_reagent'],
    variations: [
      { name: '化學混合裝置', lockMsg: '一個特殊的玻璃罩，旁邊連接了兩個空的試劑瓶插槽。', unlockMsg: '紅藍試劑混合產生劇烈氣體，腐蝕了玻璃罩的卡榫。' },
    ],
  },
  {
    id: 'gear_mechanism', name: '大型齒輪機關',
    lockedDescription: '牆上的一個大型機械裝置卡死了，少了幾個齒輪。',
    unlockDescription: '齒輪咬合，機關開始順暢運轉，打開了暗格。',
    category: 'container', mechanism: 'combination', capacity: 4, volume: 3,
    tags: ['combination', 'mechanical'],
    requiredKeys: ['large_gear', 'small_gear'],
    variations: [
      { name: '大型齒輪機關', lockMsg: '牆上的一個大型機械裝置卡死了，少了幾個齒輪。', unlockMsg: '齒輪咬合，機關開始順暢運轉，打開了暗格。' },
    ],
  },

  // ── 小型容器 (capacity 4L, volume 3L) ──
  {
    id: 'locked_drawer', name: '上鎖的抽屜',
    lockedDescription: '桌面下方有一個小抽屜，鎖孔很精緻。',
    unlockDescription: '你轉動鑰匙，抽屜滑出，裡面塞了一些東西。',
    category: 'container', mechanism: 'physical', capacity: 4, volume: 3,
    tags: ['physical', 'key-lock'],
    requiredKeys: ['rusty_key'],
    variations: [
      { name: '上鎖的抽屜', lockMsg: '桌面下方有一個小抽屜，鎖孔很精緻。', unlockMsg: '你轉動鑰匙，抽屜滑出，裡面塞了一些東西。' },
      { name: '迷你保險盒', lockMsg: '一個巴掌大的金屬保險盒，上面有個小鎖。', unlockMsg: '小鎖彈開，盒蓋掀起。' },
    ],
  },
  {
    id: 'password_lockbox', name: '密碼小鐵盒',
    lockedDescription: '一個不起眼的鐵盒，上面有三位數轉盤鎖。',
    unlockDescription: '轉盤對準正確數字，鐵盒咔噠一聲打開。',
    partialDescription: '轉盤鎖需要正確的密碼。',
    category: 'container', mechanism: 'password', capacity: 4, volume: 3,
    tags: ['password', 'code'],
    requiredKeys: ['password_note'],
    variations: [
      { name: '密碼小鐵盒', lockMsg: '一個不起眼的鐵盒，上面有三位數轉盤鎖。', unlockMsg: '轉盤對準正確數字，鐵盒咔噠一聲打開。', partialMsg: '轉盤鎖需要正確的密碼。' },
      { name: '密封藥盒', lockMsg: '一個醫療用的密封藥盒，面板上有數字按鍵。', unlockMsg: '嗶嗶兩聲，藥盒的氣密蓋彈開了。', partialMsg: '藥盒需要正確的密碼。' },
    ],
  },

  // ── 中型容器 (capacity 8L, volume 5L) ──
  {
    id: 'filing_cabinet', name: '檔案鐵櫃',
    lockedDescription: '一個辦公用的鐵櫃，抽屜上有簡易鎖頭。',
    unlockDescription: '鎖頭應聲而開，你拉開了鐵櫃抽屜。',
    category: 'container', mechanism: 'physical', capacity: 8, volume: 5,
    tags: ['physical', 'key-lock'],
    requiredKeys: ['rusty_key'],
    variations: [
      { name: '檔案鐵櫃', lockMsg: '一個辦公用的鐵櫃，抽屜上有簡易鎖頭。', unlockMsg: '鎖頭應聲而開，你拉開了鐵櫃抽屜。' },
      { name: '彈藥箱', lockMsg: '一個軍用綠漆的金屬箱，扣環上掛著一把鎖。', unlockMsg: '你打開了彈藥箱的扣環。' },
    ],
  },
  {
    id: 'supply_crate', name: '封裝的補給箱',
    lockedDescription: '一個用塑膠膜密封的補給箱，邊緣釘死了。',
    unlockDescription: '你用撬棍撬開箱蓋，裡面整齊地裝著物資。',
    category: 'container', mechanism: 'hidden', capacity: 8, volume: 5,
    tags: ['hidden', 'brute-force'],
    requiredKeys: ['crowbar'],
    variations: [
      { name: '封裝的補給箱', lockMsg: '一個用塑膠膜密封的補給箱，邊緣釘死了。', unlockMsg: '你用撬棍撬開箱蓋，裡面整齊地裝著物資。' },
      { name: '封死的通風口蓋板', lockMsg: '通風口的金屬蓋板被螺栓焊死了。', unlockMsg: '你用撬棍硬生生扳開了蓋板，裡面有個空間。' },
    ],
  },
  {
    id: 'shadow_alcove', name: '陰暗的壁龕',
    lockedDescription: '牆壁上有一個深邃的凹洞，完全看不清裡面。',
    unlockDescription: '手電筒照進壁龕深處，光線在潮濕的石壁上反射。',
    category: 'container', mechanism: 'hidden', capacity: 8, volume: 5,
    tags: ['hidden', 'light'],
    requiredKeys: ['flashlight'],
    variations: [
      { name: '陰暗的壁龕', lockMsg: '牆壁上有一個深邃的凹洞，完全看不清裡面。', unlockMsg: '手電筒照進壁龕深處，光線在潮濕的石壁上反射。' },
      { name: '天花板維修口', lockMsg: '天花板有個黑漆漆的維修口，什麼都看不見。', unlockMsg: '你舉起手電筒往上照，發現裡面藏了東西。' },
    ],
  },

  // ── 大型容器 (capacity 14L, volume 8L) ──
  {
    id: 'reinforced_locker', name: '強化儲物櫃',
    lockedDescription: '一個特別厚實的金屬儲物櫃，面板被釘死了。',
    unlockDescription: '你用撬棍撬開了儲物櫃的面板。',
    category: 'container', mechanism: 'hidden', capacity: 14, volume: 8,
    tags: ['hidden', 'brute-force'],
    requiredKeys: ['crowbar'],
    variations: [
      { name: '強化儲物櫃', lockMsg: '一個特別厚實的金屬儲物櫃，面板被釘死了。', unlockMsg: '你用撬棍撬開了儲物櫃的面板。' },
      { name: '焊死的設備箱', lockMsg: '一個大型設備箱，開口被鐵條焊住了。', unlockMsg: '你用撬棍逐一扳開鐵條，設備箱終於能打開了。' },
    ],
  },
  {
    id: 'combination_wardrobe', name: '密碼衣櫃',
    lockedDescription: '一個老舊的大衣櫃，門上有電子密碼鎖。',
    unlockDescription: '密碼正確，衣櫃門吱呀打開，裡面空間不小。',
    partialDescription: '衣櫃的密碼鎖需要正確的密碼。',
    category: 'container', mechanism: 'password', capacity: 14, volume: 8,
    tags: ['password', 'code'],
    requiredKeys: ['password_note'],
    variations: [
      { name: '密碼衣櫃', lockMsg: '一個老舊的大衣櫃，門上有電子密碼鎖。', unlockMsg: '密碼正確，衣櫃門吱呀打開，裡面空間不小。', partialMsg: '衣櫃的密碼鎖需要正確的密碼。' },
      { name: '落地金庫', lockMsg: '一個半人高的落地金庫，面板上有密碼轉盤。', unlockMsg: '最後一個數字對齊，金庫門沉重地開啟了。', partialMsg: '金庫需要正確的密碼。' },
    ],
  },

  // ── 超大型容器 (capacity 20L, volume 12L) ──
  {
    id: 'industrial_cabinet', name: '工業配電箱',
    lockedDescription: '一個巨大的配電箱，面板上需要電源和數位密鑰才能開啟。',
    unlockDescription: '系統啟動，配電箱面板緩緩滑開，裡面遠比想像的大。',
    category: 'container', mechanism: 'combination', capacity: 20, volume: 12,
    tags: ['combination', 'electronic'],
    requiredKeys: ['power_cable', 'usb_drive'],
    variations: [
      { name: '工業配電箱', lockMsg: '一個巨大的配電箱，面板上需要電源和數位密鑰才能開啟。', unlockMsg: '系統啟動，配電箱面板緩緩滑開，裡面遠比想像的大。' },
      { name: '伺服器機櫃', lockMsg: '一個高大的伺服器機櫃，需要接通電源並插入認證碟。', unlockMsg: '風扇開始運轉，機櫃側板彈開，裡面塞了很多東西。' },
    ],
  },
  {
    id: 'sealed_container', name: '密封貨櫃',
    lockedDescription: '一個大型密封貨櫃，紅藍兩個化學封條鎖住了開關。',
    unlockDescription: '化學反應溶解了封條，貨櫃門轟然打開。',
    category: 'container', mechanism: 'combination', capacity: 20, volume: 12,
    tags: ['combination', 'chemical'],
    requiredKeys: ['red_reagent', 'blue_reagent'],
    variations: [
      { name: '密封貨櫃', lockMsg: '一個大型密封貨櫃，紅藍兩個化學封條鎖住了開關。', unlockMsg: '化學反應溶解了封條，貨櫃門轟然打開。' },
    ],
  },

  // ── 空間鎖 ──
  {
    id: 'iron_door', name: '厚重的鐵門',
    lockedDescription: '一扇佈滿鐵鏽的重門，鎖孔非常大。',
    unlockDescription: '你費力地轉動鑰匙，鐵門發出沉重的摩擦聲開啟了。',
    category: 'spatial', mechanism: 'physical', capacity: 0, volume: 0,
    tags: ['physical', 'key-lock', 'door'],
    requiredKeys: ['brass_key'],
    variations: [
      { name: '厚重的鐵門', lockMsg: '一扇佈滿鐵鏽的重門，鎖孔非常大。', unlockMsg: '你費力地轉動鑰匙，鐵門發出沉重的摩擦聲開啟了。' },
    ],
  },
  {
    id: 'electronic_door', name: '電子感應門',
    lockedDescription: '門旁有一個紅色的刷卡機。',
    unlockDescription: '嗶一聲，刷卡機亮起綠燈，自動門滑開了。',
    category: 'spatial', mechanism: 'hidden', capacity: 0, volume: 0,
    tags: ['hidden', 'electronic', 'door'],
    requiredKeys: ['keycard'],
    variations: [
      { name: '電子感應門', lockMsg: '門旁有一個紅色的刷卡機。', unlockMsg: '嗶一聲，刷卡機亮起綠燈，自動門滑開了。' },
    ],
  },
  {
    id: 'chained_door', name: '被鐵鍊鎖住的門',
    lockedDescription: '這扇門被粗大的鐵鍊死死纏住。',
    unlockDescription: '你用破壞剪剪斷了鐵鍊，門終於可以推開。',
    category: 'spatial', mechanism: 'hidden', capacity: 0, volume: 0,
    tags: ['hidden', 'brute-force', 'door'],
    requiredKeys: ['bolt_cutter'],
    variations: [
      { name: '被鐵鍊鎖住的門', lockMsg: '這扇門被粗大的鐵鍊死死纏住。', unlockMsg: '你用破壞剪剪斷了鐵鍊，門終於可以推開。' },
    ],
  },
  {
    id: 'handleless_door', name: '無把手的滑門',
    lockedDescription: '滑門的把手被拔掉了，只剩下一個孔洞。',
    unlockDescription: '你裝上把手並用力拉動，滑門被打開了。',
    category: 'spatial', mechanism: 'physical', capacity: 0, volume: 0,
    tags: ['physical', 'door'],
    requiredKeys: ['door_handle'],
    variations: [
      { name: '無把手的滑門', lockMsg: '滑門的把手被拔掉了，只剩下一個孔洞。', unlockMsg: '你裝上把手並用力拉動，滑門被打開了。' },
    ],
  },
  {
    id: 'airlock_door', name: '氣密隔離門',
    lockedDescription: '隔離門上需要同時轉動兩個閥門才能解除氣壓鎖定。',
    unlockDescription: '兩個閥門同時轉動，洩壓聲響起，隔離門緩緩升起。',
    category: 'spatial', mechanism: 'combination', capacity: 0, volume: 0,
    tags: ['combination', 'mechanical', 'door'],
    requiredKeys: ['left_valve', 'right_valve'],
    variations: [
      { name: '氣密隔離門', lockMsg: '隔離門上需要同時轉動兩個閥門才能解除氣壓鎖定。', unlockMsg: '兩個閥門同時轉動，洩壓聲響起，隔離門緩緩升起。' },
    ],
  },
];

// ─── 查詢輔助函式 ───

export function findKeyTemplate(keyId: string): KeyTemplate | undefined {
  return KEY_TEMPLATES.find(k => k.id === keyId);
}

export function findLocksForKey(keyId: string): readonly LockTemplate[] {
  return LOCK_TEMPLATES.filter(l => l.requiredKeys.includes(keyId));
}

export function findLocksByTag(tag: string): readonly LockTemplate[] {
  return LOCK_TEMPLATES.filter(l => l.tags.includes(tag));
}

export function findLocksByCategory(category: 'container' | 'spatial'): readonly LockTemplate[] {
  return LOCK_TEMPLATES.filter(l => l.category === category);
}
