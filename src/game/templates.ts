import type { KeyTemplate, LockTemplate } from './types';

// ─── 鑰匙目錄 ───

export const KEY_TEMPLATES: readonly KeyTemplate[] = [
  // 消耗型鑰匙
  { id: 'rusty_key', name: '生鏽的鑰匙', description: '一把佈滿鐵鏽的老舊鑰匙。', type: 'key', reusable: false, volume: 1, tags: ['classic', 'container-key'] },
  { id: 'password_note', name: '寫著密碼的紙條', description: '一張皺巴巴的紙條。', type: 'clue', reusable: false, volume: 0.5, tags: ['classic', 'code'] },
  { id: 'power_cable', name: '備用電源線', description: '一條粗重的電源線。', type: 'key', reusable: false, volume: 2, tags: ['classic', 'combo-part'] },
  { id: 'usb_drive', name: '解密隨身碟', description: '一個不起眼的隨身碟。', type: 'key', reusable: false, volume: 0.5, tags: ['classic', 'combo-part'] },
  { id: 'red_reagent', name: '紅色酸性試劑', description: '裝著紅色液體的瓶子。', type: 'key', reusable: false, volume: 2, tags: ['classic', 'combo-part'] },
  { id: 'blue_reagent', name: '藍色鹼性試劑', description: '裝著藍色液體的瓶子。', type: 'key', reusable: false, volume: 2, tags: ['classic', 'combo-part'] },
  { id: 'large_gear', name: '黃銅大齒輪', description: '一個沉重的黃銅齒輪。', type: 'key', reusable: false, volume: 3, tags: ['classic', 'combo-part'] },
  { id: 'small_gear', name: '生鏽的小齒輪', description: '一個小型生鏽齒輪。', type: 'key', reusable: false, volume: 1, tags: ['classic', 'combo-part'] },
  { id: 'brass_key', name: '黃銅大鑰匙', description: '一把巨大的黃銅鑰匙。', type: 'key', reusable: false, volume: 2, tags: ['classic', 'door-key'] },
  { id: 'door_handle', name: '金屬把手', description: '一個沉重的金屬門把手。', type: 'key', reusable: false, volume: 2, tags: ['classic', 'door-key'] },
  { id: 'left_valve', name: '左半閥門', description: '半圓形的閥門零件。', type: 'key', reusable: false, volume: 2, tags: ['classic', 'door-key'] },
  { id: 'right_valve', name: '右半閥門', description: '半圓形的閥門零件。', type: 'key', reusable: false, volume: 2, tags: ['classic', 'door-key'] },

  // 可重複使用工具
  { id: 'flashlight', name: '手電筒', description: '一把堅固的金屬手電筒。', type: 'tool', reusable: true, volume: 2, tags: ['classic', 'tool'], stateTags: ['light-tool'] },
  { id: 'hammer', name: '鐵鎚', description: '一把沉重的鐵鎚。', type: 'tool', reusable: true, volume: 3, tags: ['classic', 'tool'] },
  { id: 'crowbar', name: '撬棍', description: '一根堅固的金屬撬棍。', type: 'tool', reusable: true, volume: 3, tags: ['classic', 'tool'], stateTags: ['lever-tool'] },
  { id: 'keycard', name: '門禁磁卡', description: '一張帶有磁條的門禁卡。', type: 'tool', reusable: true, volume: 0.5, tags: ['classic', 'tool'], stateTags: ['electronic-key'] },
  { id: 'bolt_cutter', name: '破壞剪', description: '一把大型的金屬剪。', type: 'tool', reusable: true, volume: 3, tags: ['classic', 'tool'], stateTags: ['cutting-tool'] },
  { id: 'wet_cloth', name: '濕布', description: '一塊浸濕的布，可以用來擦拭髒污。', type: 'tool', reusable: true, volume: 1, tags: ['classic', 'tool'], stateTags: ['water-station'] },

  // 組合鎖零件（消耗型）
  { id: 'soldering_iron', name: '焊槍', description: '一把小型電焊槍。', type: 'key', reusable: false, volume: 2, tags: ['classic', 'combo-part'] },
  { id: 'solder_wire', name: '焊條', description: '一卷銀色焊條。', type: 'key', reusable: false, volume: 1, tags: ['classic', 'combo-part'] },
  { id: 'antenna', name: '天線', description: '一根可伸縮的金屬天線。', type: 'key', reusable: false, volume: 1, tags: ['classic', 'combo-part'] },
  { id: 'battery_pack', name: '電池組', description: '一個沉甸甸的電池組。', type: 'key', reusable: false, volume: 2, tags: ['classic', 'combo-part'] },
  { id: 'lens', name: '透鏡', description: '一片精密研磨的玻璃透鏡。', type: 'key', reusable: false, volume: 1, tags: ['classic', 'combo-part'] },
  { id: 'prism', name: '稜鏡', description: '一個三角形的玻璃稜鏡。', type: 'key', reusable: false, volume: 1, tags: ['classic', 'combo-part'] },
  { id: 'hydraulic_tube', name: '液壓管', description: '一條高壓液壓管。', type: 'key', reusable: false, volume: 2, tags: ['classic', 'combo-part'] },
  { id: 'hydraulic_fluid', name: '液壓油瓶', description: '一瓶紅色的液壓油。', type: 'key', reusable: false, volume: 2, tags: ['classic', 'combo-part'] },
  { id: 'fuse', name: '保險絲', description: '一根玻璃管保險絲。', type: 'key', reusable: false, volume: 0.5, tags: ['classic', 'combo-part'] },
  { id: 'switch_handle', name: '開關把手', description: '一個電閘的拉桿把手。', type: 'key', reusable: false, volume: 1, tags: ['classic', 'combo-part'] },
  { id: 'red_gem', name: '紅寶石', description: '一顆發著微光的紅寶石。', type: 'key', reusable: false, volume: 1, tags: ['classic', 'combo-part'] },
  { id: 'blue_gem', name: '藍寶石', description: '一顆冰冷的藍寶石。', type: 'key', reusable: false, volume: 1, tags: ['classic', 'combo-part'] },
  { id: 'green_gem', name: '綠寶石', description: '一顆翠綠色的寶石。', type: 'key', reusable: false, volume: 1, tags: ['classic', 'combo-part'] },
  { id: 'red_wire', name: '紅色電線', description: '一段紅色絕緣電線。', type: 'key', reusable: false, volume: 0.5, tags: ['classic', 'combo-part'] },
  { id: 'blue_wire', name: '藍色電線', description: '一段藍色絕緣電線。', type: 'key', reusable: false, volume: 0.5, tags: ['classic', 'combo-part'] },
  { id: 'green_wire', name: '綠色電線', description: '一段綠色絕緣電線。', type: 'key', reusable: false, volume: 0.5, tags: ['classic', 'combo-part'] },
  { id: 'filter_core', name: '濾芯', description: '一個圓柱形的過濾芯。', type: 'key', reusable: false, volume: 1, tags: ['classic', 'combo-part'] },
  { id: 'carbon_pack', name: '活性碳包', description: '一袋黑色的活性碳。', type: 'key', reusable: false, volume: 1, tags: ['classic', 'combo-part'] },
  { id: 'pipe_connector', name: '水管接頭', description: '一個金屬水管接頭。', type: 'key', reusable: false, volume: 1, tags: ['classic', 'combo-part'] },
  { id: 'fuel_canister', name: '燃料罐', description: '一個密封的金屬燃料罐。', type: 'key', reusable: false, volume: 2, tags: ['classic', 'combo-part'] },
  { id: 'igniter', name: '點火器', description: '一個電子點火裝置。', type: 'key', reusable: false, volume: 1, tags: ['classic', 'combo-part'] },
  { id: 'nav_chip', name: '導航晶片', description: '一塊軍規導航晶片。', type: 'key', reusable: false, volume: 0.5, tags: ['classic', 'combo-part'] },
  { id: 'hard_drive', name: '硬碟', description: '一顆3.5吋硬碟。', type: 'key', reusable: false, volume: 2, tags: ['classic', 'combo-part'] },
  { id: 'ram_stick', name: '記憶體', description: '一條DDR記憶體模組。', type: 'key', reusable: false, volume: 0.5, tags: ['classic', 'combo-part'] },
  { id: 'cpu_chip', name: 'CPU', description: '一顆處理器晶片。', type: 'key', reusable: false, volume: 0.5, tags: ['classic', 'combo-part'] },
  { id: 'power_module', name: '電源模組', description: '一個方形的電源供應模組。', type: 'key', reusable: false, volume: 2, tags: ['classic', 'combo-part'] },

  // 固定裝置（不可拾取的鑰匙，顯示在機關區）
  { id: 'water_basin', name: '水盆', description: '一個裝滿清水的石盆，嵌在桌面上。', type: 'tool', reusable: true, pickupable: false, volume: 3, tags: ['classic', 'station'], stateTags: ['water-station'] },
  { id: 'workbench', name: '工作台', description: '一張堅固的金屬工作台，上面有各種夾具和工具。', type: 'tool', reusable: true, pickupable: false, volume: 5, tags: ['classic', 'station'] },

  // 合成／轉換零件（可拾取的鑰匙）
  { id: 'battery', name: '電池', description: '一顆標準的AA電池。', type: 'key', reusable: false, volume: 0.5, tags: ['classic', 'crafting'] },
  { id: 'pipe_part', name: '水管零件', description: '一段金屬水管，看起來是某個系統的一部分。', type: 'key', reusable: false, volume: 1, tags: ['classic', 'crafting'] },
  { id: 'wire_spool', name: '電線捲', description: '一捲絕緣電線。', type: 'key', reusable: false, volume: 1, tags: ['classic', 'crafting'] },
  { id: 'metal_rod', name: '金屬桿', description: '一根堅固的金屬桿。', type: 'key', reusable: false, volume: 2, tags: ['classic', 'crafting'] },
  { id: 'ic_chip', name: 'IC 晶片', description: '一塊精密的電路晶片。', type: 'key', reusable: false, volume: 0.5, tags: ['classic', 'crafting'] },
  { id: 'whetstone', name: '磨刀石', description: '一塊粗糙的磨刀石。', type: 'key', reusable: false, volume: 1, tags: ['classic', 'crafting'] },
];

// ─── 鎖目錄 ───

export const LOCK_TEMPLATES: readonly LockTemplate[] = [
  // ── 容器鎖 ──
  {
    id: 'locked_chest', name: '上鎖的寶箱',
    lockedDescription: '一個沉重的鐵寶箱，上面有一個十字鎖孔。',
    unlockDescription: '喀啦一聲，你轉動鑰匙，寶箱打開了。',
    category: 'container', mechanism: 'physical', capacity: 8, volume: 5,
    tags: ['classic', 'physical', 'key-lock'],
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
    tags: ['classic', 'hidden', 'light'],
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
    tags: ['classic', 'hidden', 'brute-force'],
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
    tags: ['classic', 'password', 'code'],
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
    tags: ['classic', 'hidden', 'brute-force'],
    requiredKeys: ['crowbar'],
    variations: [
      { name: '被釘住的木箱', lockMsg: '木箱被粗大的鐵釘釘死。', unlockMsg: '你用撬棍拔出了鐵釘，撬開了木板。' },
      { name: '鬆動的地板', lockMsg: '這塊木地板走起來會發出不尋常的空洞聲。', unlockMsg: '你用撬棍掀開了木地板，發現了下方的暗格。' },
    ],
  },
  {
    id: 'dirty_display', name: '滿是污漬的展示窗',
    lockedDescription: '展示窗的玻璃上覆蓋了一層厚厚的油污，完全看不清裡面。',
    unlockDescription: '你用濕布擦去油污，展示窗內的東西終於現形了。',
    category: 'container', mechanism: 'hidden', capacity: 4, volume: 3,
    tags: ['classic', 'hidden', 'cleaning'],
    requiredKeys: ['wet_cloth'],
    variations: [
      { name: '滿是污漬的展示窗', lockMsg: '展示窗上覆蓋厚厚的油污，看不清裡面。', unlockMsg: '你擦去油污，展示窗內的東西現形了。' },
      { name: '被灰塵蓋住的銘牌', lockMsg: '牆上有一塊銘牌，但被厚厚的灰塵覆蓋。', unlockMsg: '你用濕布擦掉灰塵，露出了重要的訊息。' },
    ],
  },
  {
    id: 'grimy_panel', name: '油膩的控制面板',
    lockedDescription: '控制面板的按鈕被黏稠的油污堵住，完全按不下去。',
    unlockDescription: '你用濕布仔細清理面板，按鈕恢復了功能。',
    category: 'container', mechanism: 'hidden', capacity: 8, volume: 5,
    tags: ['classic', 'hidden', 'cleaning'],
    requiredKeys: ['wet_cloth'],
    variations: [
      { name: '油膩的控制面板', lockMsg: '按鈕被黏稠的油污堵住。', unlockMsg: '你清理了面板，按鈕恢復功能。' },
    ],
  },
  {
    id: 'hightech_safe', name: '高級電子保險箱',
    lockedDescription: '一個高科技保險箱，沒有通電，且需要數位密鑰。',
    unlockDescription: '接通電源並讀取密鑰成功，保險箱彈開了。',
    category: 'container', mechanism: 'combination', capacity: 14, volume: 8,
    tags: ['classic', 'combination', 'electronic'],
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
    tags: ['classic', 'combination', 'chemical'],
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
    tags: ['classic', 'combination', 'mechanical'],
    requiredKeys: ['large_gear', 'small_gear'],
    variations: [
      { name: '大型齒輪機關', lockMsg: '牆上的一個大型機械裝置卡死了，少了幾個齒輪。', unlockMsg: '齒輪咬合，機關開始順暢運轉，打開了暗格。' },
    ],
  },

  // ── 組合鎖 2 鑰匙（新增） ──
  {
    id: 'soldering_station', name: '焊接工作台',
    lockedDescription: '一個金屬面板被焊死了，需要重新焊接打開。',
    unlockDescription: '焊槍和焊條修復了電路，面板彈開了。',
    category: 'container', mechanism: 'combination', capacity: 8, volume: 5,
    tags: ['classic', 'combination', 'mechanical'],
    requiredKeys: ['soldering_iron', 'solder_wire'],
    variations: [
      { name: '焊接工作台', lockMsg: '一個金屬面板被焊死了，需要重新焊接打開。', unlockMsg: '焊槍和焊條修復了電路，面板彈開了。' },
    ],
  },
  {
    id: 'radio_receiver', name: '無線電接收台',
    lockedDescription: '一台老式無線電，天線斷了，也沒有電池。',
    unlockDescription: '裝上天線和電池組，無線電嗶嗶作響，螢幕顯示出密碼。',
    category: 'container', mechanism: 'combination', capacity: 4, volume: 3,
    tags: ['classic', 'combination', 'electronic'],
    requiredKeys: ['antenna', 'battery_pack'],
    variations: [
      { name: '無線電接收台', lockMsg: '一台老式無線電，天線斷了，也沒有電池。', unlockMsg: '裝上天線和電池組，無線電嗶嗶作響，螢幕顯示出密碼。' },
      { name: '對講機基座', lockMsg: '一台壁掛式對講機，天線折斷，電池槽是空的。', unlockMsg: '天線裝回、電池推入，對講機傳來一段錄音訊息。' },
    ],
  },
  {
    id: 'optical_device', name: '光學感應裝置',
    lockedDescription: '牆上一個精密的光學感應器，缺少透鏡和稜鏡。',
    unlockDescription: '光線通過透鏡和稜鏡折射到感應器上，暗門無聲地打開。',
    category: 'container', mechanism: 'combination', capacity: 8, volume: 5,
    tags: ['classic', 'combination', 'mechanical'],
    requiredKeys: ['lens', 'prism'],
    variations: [
      { name: '光學感應裝置', lockMsg: '牆上一個精密的光學感應器，缺少透鏡和稜鏡。', unlockMsg: '光線通過透鏡和稜鏡折射到感應器上，暗門無聲地打開。' },
    ],
  },

  // ── 組合鎖 3 鑰匙 ──
  {
    id: 'gem_altar', name: '寶石祭壇',
    lockedDescription: '一座古老的石祭壇，上面有紅、藍、綠三個凹槽。',
    unlockDescription: '三顆寶石放入凹槽，祭壇發出光芒，石板緩緩移開。',
    category: 'container', mechanism: 'combination', capacity: 14, volume: 8,
    tags: ['classic', 'combination', 'mechanical'],
    requiredKeys: ['red_gem', 'blue_gem', 'green_gem'],
    variations: [
      { name: '寶石祭壇', lockMsg: '一座古老的石祭壇，上面有紅、藍、綠三個凹槽。', unlockMsg: '三顆寶石放入凹槽，祭壇發出光芒，石板緩緩移開。' },
      { name: '符文基座', lockMsg: '一座刻滿符文的基座，三個寶石插槽閃爍微光。', unlockMsg: '寶石歸位，符文亮起，基座底部的暗格打開了。' },
    ],
  },
  {
    id: 'wiring_panel', name: '配電盤',
    lockedDescription: '一個大型配電盤，三個接線柱上空無一物。',
    unlockDescription: '紅藍綠三條電線各歸其位，電力恢復，面板背後的隔間打開。',
    category: 'container', mechanism: 'combination', capacity: 14, volume: 8,
    tags: ['classic', 'combination', 'electronic'],
    requiredKeys: ['red_wire', 'blue_wire', 'green_wire'],
    variations: [
      { name: '配電盤', lockMsg: '一個大型配電盤，三個接線柱上空無一物。', unlockMsg: '紅藍綠三條電線各歸其位，電力恢復，面板背後的隔間打開。' },
      { name: '電路接線箱', lockMsg: '一個壁掛式接線箱，紅藍綠三個端子都斷開了。', unlockMsg: '三條線接好，指示燈全亮，箱門彈開。' },
    ],
  },
  {
    id: 'water_purifier', name: '淨水裝置',
    lockedDescription: '一台大型淨水裝置，缺少濾芯、活性碳和管路接頭。',
    unlockDescription: '零件安裝完畢，清水開始流出，隱藏的置物格浮了上來。',
    category: 'container', mechanism: 'combination', capacity: 8, volume: 5,
    tags: ['classic', 'combination', 'mechanical'],
    requiredKeys: ['filter_core', 'carbon_pack', 'pipe_connector'],
    variations: [
      { name: '淨水裝置', lockMsg: '一台大型淨水裝置，缺少濾芯、活性碳和管路接頭。', unlockMsg: '零件安裝完畢，清水開始流出，隱藏的置物格浮了上來。' },
    ],
  },

  // ── 組合鎖 4 鑰匙 ──
  {
    id: 'rocket_launcher', name: '火箭發射台',
    lockedDescription: '一座小型火箭發射台，控制面板上三個插槽空著，燃料箱也是空的。',
    unlockDescription: '燃料注入、點火器就位、導航設定完成。發射！煙霧散去後露出底座下方的密室。',
    category: 'container', mechanism: 'combination', capacity: 20, volume: 12,
    tags: ['classic', 'combination', 'mechanical'],
    requiredKeys: ['fuel_canister', 'igniter', 'nav_chip'],
    variations: [
      { name: '火箭發射台', lockMsg: '一座小型火箭發射台，控制面板上三個插槽空著，燃料箱也是空的。', unlockMsg: '燃料注入、點火器就位、導航設定完成。發射！煙霧散去後露出底座下方的密室。' },
    ],
  },
  {
    id: 'server_rack', name: '監控主機',
    lockedDescription: '一台大型監控主機，硬碟、記憶體、CPU 和電源模組全被拔走了。',
    unlockDescription: '四個零件歸位，螢幕亮起，主機側板打開露出內部儲物空間。',
    category: 'container', mechanism: 'combination', capacity: 20, volume: 12,
    tags: ['classic', 'combination', 'electronic'],
    requiredKeys: ['hard_drive', 'ram_stick', 'cpu_chip', 'power_module'],
    variations: [
      { name: '監控主機', lockMsg: '一台大型監控主機，硬碟、記憶體、CPU 和電源模組全被拔走了。', unlockMsg: '四個零件歸位，螢幕亮起，主機側板打開露出內部儲物空間。' },
      { name: '伺服器機櫃', lockMsg: '一個伺服器機櫃，四個關鍵元件的插槽都是空的。', unlockMsg: '元件就位，風扇嗡嗡運轉，機櫃門自動彈開。' },
    ],
  },

  // ── 小型容器 (capacity 4L, volume 3L) ──
  {
    id: 'locked_drawer', name: '上鎖的抽屜',
    lockedDescription: '桌面下方有一個小抽屜，鎖孔很精緻。',
    unlockDescription: '你轉動鑰匙，抽屜滑出，裡面塞了一些東西。',
    category: 'container', mechanism: 'physical', capacity: 4, volume: 3,
    tags: ['classic', 'physical', 'key-lock'],
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
    tags: ['classic', 'password', 'code'],
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
    tags: ['classic', 'physical', 'key-lock'],
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
    tags: ['classic', 'hidden', 'brute-force'],
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
    tags: ['classic', 'hidden', 'light'],
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
    tags: ['classic', 'hidden', 'brute-force'],
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
    tags: ['classic', 'password', 'code'],
    requiredKeys: ['password_note'],
    variations: [
      { name: '密碼衣櫃', lockMsg: '一個老舊的大衣櫃，門上有電子密碼鎖。', unlockMsg: '密碼正確，衣櫃門吱呀打開，裡面空間不小。', partialMsg: '衣櫃的密碼鎖需要正確的密碼。' },
      { name: '落地金庫', lockMsg: '一個半人高的落地金庫，面板上有密碼轉盤。', unlockMsg: '最後一個數字對齊，金庫門沉重地開啟了。', partialMsg: '金庫需要正確的密碼。' },
    ],
  },

  // ── 超大型容器 (capacity 20L, volume 12L) ──
  {
    id: 'hydraulic_platform', name: '液壓升降台',
    lockedDescription: '一座工業液壓升降台，液壓系統已經乾涸。',
    unlockDescription: '液壓油注入管路，升降台緩緩升起，底下藏著一個大空間。',
    category: 'container', mechanism: 'combination', capacity: 20, volume: 12,
    tags: ['classic', 'combination', 'mechanical'],
    requiredKeys: ['hydraulic_tube', 'hydraulic_fluid'],
    variations: [
      { name: '液壓升降台', lockMsg: '一座工業液壓升降台，液壓系統已經乾涸。', unlockMsg: '液壓油注入管路，升降台緩緩升起，底下藏著一個大空間。' },
      { name: '液壓貨梯', lockMsg: '一台故障的液壓貨梯，卡在半層樓高的位置。', unlockMsg: '液壓恢復，貨梯降下，露出後方的儲藏區。' },
    ],
  },
  {
    id: 'fuse_box', name: '保險絲盒',
    lockedDescription: '一個大型配電箱，保險絲燒斷了，電閘也缺了把手。',
    unlockDescription: '換上保險絲，拉下電閘，配電箱內部亮起燈光。',
    category: 'container', mechanism: 'combination', capacity: 20, volume: 12,
    tags: ['classic', 'combination', 'electronic'],
    requiredKeys: ['fuse', 'switch_handle'],
    variations: [
      { name: '保險絲盒', lockMsg: '一個大型配電箱，保險絲燒斷了，電閘也缺了把手。', unlockMsg: '換上保險絲，拉下電閘，配電箱內部亮起燈光。' },
      { name: '工業配電箱', lockMsg: '一個巨大的工業配電箱，斷路器跳脫且控制桿不見了。', unlockMsg: '裝回保險絲和控制桿，電力恢復，面板彈開。' },
    ],
  },

  // ── 狀態轉換鎖（可拾取的 lock，帶到固定裝置使用）──
  {
    id: 'dry_cloth_soak', name: '乾布',
    lockedDescription: '一塊乾燥的布，如果能浸濕就好了。',
    unlockDescription: '你把布浸入水中擰乾，現在它變成了實用的濕布。',
    category: 'container', mechanism: 'physical',
    capacity: 4, volume: 2,
    tags: ['classic', 'conversion', 'water'],
    requiredKeys: ['water_basin'],
    pickupable: true,
    stateTags: ['water-station'],
    variations: [
      { name: '乾布', lockMsg: '一塊乾燥的布，如果能浸濕就好了。', unlockMsg: '你把布浸入水中擰乾，現在它變成了實用的濕布。' },
      { name: '空水壺', lockMsg: '一個空的水壺，需要裝水才有用。', unlockMsg: '你把水壺浸入水中，灌滿了清水。' },
    ],
  },

  // ── 合成鎖 ──
  {
    id: 'dead_flashlight_craft', name: '沒電的手電筒',
    lockedDescription: '一把手電筒，電池槽是空的，按下開關毫無反應。',
    unlockDescription: '你裝入電池，手電筒嗡地一聲亮了起來！',
    category: 'container', mechanism: 'combination',
    capacity: 4, volume: 3,
    tags: ['classic', 'crafting', 'assembly'],
    requiredKeys: ['battery', 'battery'],
    pickupable: true,
    stateTags: ['light-tool'],
    variations: [
      { name: '沒電的手電筒', lockMsg: '手電筒電池槽是空的。', unlockMsg: '你裝入電池，手電筒亮了起來！', partialMsg: '還需要更多電池。' },
    ],
  },
  {
    id: 'broken_crowbar', name: '斷裂的撬棍',
    lockedDescription: '撬棍從中間斷裂了，需要焊接一根金屬桿來修復。',
    unlockDescription: '你用金屬桿加固了撬棍，它又變得堅固了！',
    category: 'container', mechanism: 'physical',
    capacity: 4, volume: 3,
    tags: ['classic', 'crafting', 'repair'],
    requiredKeys: ['metal_rod'],
    pickupable: true,
    stateTags: ['lever-tool'],
    variations: [
      { name: '斷裂的撬棍', lockMsg: '撬棍從中間斷裂了。', unlockMsg: '你用金屬桿修復了撬棍！' },
      { name: '鬆脫的鐵鎚柄', lockMsg: '鐵鎚的柄鬆脫了，需要固定。', unlockMsg: '你用金屬桿固定了鐵鎚柄，修好了！' },
    ],
  },
  {
    id: 'blank_keycard', name: '空白磁卡',
    lockedDescription: '一張沒有寫入權限的空白磁卡，需要 IC 晶片才能啟用。',
    unlockDescription: '你將 IC 晶片插入磁卡，權限寫入成功！',
    category: 'container', mechanism: 'physical',
    capacity: 2, volume: 0.5,
    tags: ['classic', 'crafting', 'electronic'],
    requiredKeys: ['ic_chip'],
    pickupable: true,
    stateTags: ['electronic-key'],
    variations: [
      { name: '空白磁卡', lockMsg: '磁卡沒有寫入權限。', unlockMsg: 'IC 晶片插入，權限寫入成功！' },
      { name: '停用的感應器', lockMsg: '感應器的晶片被取走了。', unlockMsg: '你裝回晶片，感應器重新啟動。' },
    ],
  },
  {
    id: 'dull_bolt_cutter', name: '鈍掉的破壞剪',
    lockedDescription: '破壞剪的刀刃已經鈍了，需要磨利才能使用。',
    unlockDescription: '你用磨刀石磨利了刀刃，破壞剪恢復了鋒利！',
    category: 'container', mechanism: 'physical',
    capacity: 4, volume: 3,
    tags: ['classic', 'crafting', 'repair'],
    requiredKeys: ['whetstone'],
    pickupable: true,
    stateTags: ['cutting-tool'],
    variations: [
      { name: '鈍掉的破壞剪', lockMsg: '刀刃已經鈍了。', unlockMsg: '你磨利了刀刃，破壞剪恢復鋒利！' },
    ],
  },

  // ── 小遊戲鎖 ──
  {
    id: 'pipe_control_panel', name: '管線控制台',
    lockedDescription: '一個複雜的管線系統，管道破損脫落，需要零件修復並正確連接。',
    unlockDescription: '水流順利通過管線，系統啟動了！密封艙門隨之打開。',
    category: 'container', mechanism: 'minigame',
    capacity: 8, volume: 5,
    tags: ['classic', 'minigame', 'mechanical'],
    requiredKeys: ['pipe_part', 'pipe_part'],
    minigameType: 'pipe_puzzle',
    variations: [
      { name: '管線控制台', lockMsg: '管線系統損壞，需要零件修復並正確連接。', unlockMsg: '水流通過管線，系統啟動！', partialMsg: '還缺少水管零件。' },
      { name: '液壓管路面板', lockMsg: '液壓管路斷裂，需要修補零件。', unlockMsg: '液壓系統恢復正常，機構開始運作。', partialMsg: '管路還沒修好。' },
    ],
  },
  {
    id: 'wiring_junction', name: '電路接線盒',
    lockedDescription: '一個電路接線盒，電線被剪斷了，需要電線和正確的接線才能恢復電力。',
    unlockDescription: '電流恢復，指示燈全部亮起，電磁鎖解除了！',
    category: 'container', mechanism: 'minigame',
    capacity: 8, volume: 5,
    tags: ['classic', 'minigame', 'electronic'],
    requiredKeys: ['wire_spool', 'wire_spool'],
    minigameType: 'wiring',
    variations: [
      { name: '電路接線盒', lockMsg: '接線盒的電線被剪斷了。', unlockMsg: '電流恢復，電磁鎖解除！', partialMsg: '還需要更多電線。' },
      { name: '配電盤', lockMsg: '配電盤的線路一片混亂。', unlockMsg: '線路接通，電力恢復正常。', partialMsg: '還缺電線。' },
    ],
  },

  // ── 空間鎖 ──
  {
    id: 'iron_door', name: '厚重的鐵門',
    lockedDescription: '一扇佈滿鐵鏽的重門，鎖孔非常大。',
    unlockDescription: '你費力地轉動鑰匙，鐵門發出沉重的摩擦聲開啟了。',
    category: 'spatial', mechanism: 'physical', capacity: 0, volume: 0,
    tags: ['classic', 'physical', 'key-lock', 'door'],
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
    tags: ['classic', 'hidden', 'electronic', 'door'],
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
    tags: ['classic', 'hidden', 'brute-force', 'door'],
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
    tags: ['classic', 'physical', 'door'],
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
    tags: ['classic', 'combination', 'mechanical', 'door'],
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
