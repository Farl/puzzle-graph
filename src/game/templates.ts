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

  // ─── Investigation: 證據（可重用工具） ───
  { id: 'scene_photo',      name: '現場照片',       description: '案發現場的全景照片，角落隱約有可疑細節。', type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'blood_cloth',      name: '沾血的衣物',     description: '一件沾有血跡的外套，血跡形狀不自然。',       type: 'tool', reusable: true, volume: 1,   tags: ['investigation', 'evidence'] },
  { id: 'suicide_copy',     name: '遺書副本',       description: '一份遺書的影印本，字跡工整得可疑。',         type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'cctv_still',       name: '監視器截圖',     description: '一張從監視器擷取的靜態畫面。',               type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'bank_statement',   name: '帳戶交易紀錄',   description: '一份列印的銀行交易紀錄。',                   type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'phone_records',    name: '電話通聯紀錄',   description: '過去一個月的通話紀錄明細。',                 type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'knife_closeup',    name: '刀具特寫照',     description: '兇案現場刀具的近距離照片。',                 type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'dna_report',       name: 'DNA 比對報告',   description: '一份正式的 DNA 鑑識比對報告。',              type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'timestamp_video',  name: '時間戳記錄影',   description: '一段帶有精確時間戳的短片。',                 type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'fingerprint_scan', name: '指紋鑑定',       description: '一張採證指紋的比對圖。',                     type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'plate_photo',      name: '車牌照片',       description: '一張模糊但能認出號碼的車牌照片。',           type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'shoe_print',       name: '現場鞋印',       description: '一張採模過的鞋印圖，花紋清晰。',             type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'victim_phone',     name: '死者手機',       description: '死者的手機，螢幕鎖已解除。',                 type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'pill_bottle',      name: '藥瓶',           description: '一個處方藥瓶，標籤被刮掉了。',               type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'iou_note',         name: '借據',           description: '一張寫有大額金額的手寫借據。',               type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },

  // ─── Investigation: 權限（可重用工具） ───
  { id: 'police_badge',     name: '警徽',           description: '一枚磨得發亮的警徽。', type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'credential'] },
  { id: 'search_warrant',   name: '搜查令',         description: '一張有法官簽名的搜查令。', type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'credential'] },
  { id: 'press_pass',       name: '記者證',         description: '一張資深記者的採訪證。', type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'credential'] },
  { id: 'family_consent',   name: '家屬同意書',     description: '受害者家屬的書面授權。', type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'credential'] },
  { id: 'attorney_letter',  name: '律師委任狀',     description: '一張律師事務所的正式委任狀。', type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'credential'] },

  // ─── Investigation: 口信／關鍵字（消耗型 clue，帶 stateTag 供 NPC 連鎖） ───
  { id: 'tip_nickname',     name: '死者的暱稱',     description: '只有親近的人才知道的小名。',             type: 'clue', reusable: false, volume: 0.5, tags: ['investigation', 'testimony'], stateTags: ['tip-nickname'] },
  { id: 'tip_quarrel',      name: '失蹤當晚的爭執', description: '關於死者最後一晚的爭吵細節。',           type: 'clue', reusable: false, volume: 0.5, tags: ['investigation', 'testimony'], stateTags: ['tip-quarrel'] },
  { id: 'tip_money',        name: '神秘的資金來源', description: '一筆無法解釋的匯款來源。',               type: 'clue', reusable: false, volume: 0.5, tags: ['investigation', 'testimony'], stateTags: ['tip-money'] },
  { id: 'tip_hideout',      name: '藏匿地點的線索', description: '某個不為人知的地址。',                   type: 'clue', reusable: false, volume: 0.5, tags: ['investigation', 'testimony'], stateTags: ['tip-hideout'] },
  { id: 'tip_affair',       name: '未公開的關係',   description: '一段外界不知的感情糾葛。',               type: 'clue', reusable: false, volume: 0.5, tags: ['investigation', 'testimony'], stateTags: ['tip-affair'] },
  { id: 'tip_weapon',       name: '兇器來源',       description: '兇器從何而來的關鍵訊息。',               type: 'clue', reusable: false, volume: 0.5, tags: ['investigation', 'testimony'], stateTags: ['tip-weapon'] },
  { id: 'tip_timing',       name: '案發時間的修正', description: '推翻官方時間線的新證詞。',               type: 'clue', reusable: false, volume: 0.5, tags: ['investigation', 'testimony'], stateTags: ['tip-timing'] },
  { id: 'tip_motive',       name: '目擊者的動機',   description: '某個證人為何出現的真實原因。',           type: 'clue', reusable: false, volume: 0.5, tags: ['investigation', 'testimony'], stateTags: ['tip-motive'] },

  // ─── Investigation: 輕型實體鑰匙（消耗型） ───
  { id: 'diary_book',       name: '日記本',         description: '死者的私人日記。',                       type: 'key', reusable: false, volume: 1,   tags: ['investigation', 'personal-item'] },
  { id: 'personal_seal',    name: '私章',           description: '一枚雕工精緻的私章。',                   type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'personal-item'] },
  { id: 'keyring',          name: '鑰匙圈',         description: '一串上面掛著多把鑰匙的鑰匙圈。',         type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'personal-item'] },
  { id: 'pill_case',        name: '藥罐',           description: '一個貼有患者標籤的藥罐。',               type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'personal-item'] },
  { id: 'bankbook',         name: '存摺',           description: '一本紀錄歷年存提款的存摺。',             type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'personal-item'] },
  { id: 'matchbox',         name: '火柴盒',         description: '印有某間酒吧 logo 的火柴盒。',           type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'personal-item'] },
  { id: 'business_card',    name: '名片盒',         description: '裝著數張名片的金屬盒。',                 type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'personal-item'] },
  { id: 'pocket_watch',     name: '懷錶',           description: '一隻停在特定時間的懷錶。',               type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'personal-item'] },
  { id: 'ring',             name: '戒指',           description: '一枚刻著縮寫的戒指。',                   type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'personal-item'] },
  { id: 'address_slip',     name: '手寫地址條',     description: '一張撕下的手寫地址紙條。',               type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'personal-item'] },

  // ─── Investigation: 證據加工工具（reusable，用於 evidence-state 鎖）───
  { id: 'image_enhancer',   name: '影像增強器',     description: '可以提升低解析度畫面的工具。', type: 'tool', reusable: true, volume: 1,   tags: ['investigation', 'enhancer'] },
  { id: 'transparent_tape', name: '透明膠帶',       description: '一卷用來重組碎紙的透明膠帶。', type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'enhancer'] },
  { id: 'decrypt_software', name: '解密軟體',       description: '一份可破解常見加密格式的軟體。', type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'enhancer'] },
  { id: 'uv_lamp',          name: '紫外線燈',       description: '可顯現隱形字跡的紫外線燈。', type: 'tool', reusable: true, volume: 1,   tags: ['investigation', 'enhancer'] },
  { id: 'forensic_kit',     name: '鑑識採樣工具',   description: '一套採集 DNA、血跡、指紋的工具組。', type: 'tool', reusable: true, volume: 2,   tags: ['investigation', 'enhancer'] },

  // ─── Investigation: 已加工證據（消耗型 key，帶 stateTag 與 evidence-state 鎖配對）───
  { id: 'enhanced_photo',      name: '清晰截圖',       description: '經過影像增強後可以看清楚的畫面。',     type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'evidence-processed'], stateTags: ['enhanced-photo'] },
  { id: 'restored_document',   name: '拼好的遺書',     description: '用膠帶拼回的完整遺書。',               type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'evidence-processed'], stateTags: ['restored-document'] },
  { id: 'decoded_audio',       name: '還原的錄音',     description: '經過解密的原始錄音檔。',               type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'evidence-processed'], stateTags: ['decoded-audio'] },
  { id: 'revealed_notes',      name: '可讀的筆記',     description: '紫外線下現形的隱藏筆記。',             type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'evidence-processed'], stateTags: ['revealed-notes'] },
  { id: 'dna_sample',          name: '已採樣血跡',     description: '採樣管中的 DNA 樣本。',                type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'evidence-processed'], stateTags: ['dna-sample'] },
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

  // ─── Investigation: 證據加工狀態鎖（pickupable，背包內加工）───
  {
    id: 'blurry_cctv', name: '模糊的監視器截圖',
    lockedDescription: '畫面極度模糊，完全看不清細節。',
    unlockDescription: '影像增強後，關鍵畫面終於清晰。',
    category: 'container', mechanism: 'physical', capacity: 2, volume: 0.5,
    tags: ['investigation', 'evidence-state'],
    requiredKeys: ['image_enhancer'],
    pickupable: true,
    stateTags: ['enhanced-photo'],
    variations: [
      { name: '模糊的監視器截圖', lockMsg: '畫面極度模糊，看不清細節。', unlockMsg: '影像增強後，關鍵畫面終於清晰。' },
    ],
  },
  {
    id: 'torn_letter', name: '撕碎的遺書',
    lockedDescription: '遺書被撕成碎片，內容支離破碎。',
    unlockDescription: '你用透明膠帶一片一片拼回，完整訊息呈現。',
    category: 'container', mechanism: 'physical', capacity: 2, volume: 0.5,
    tags: ['investigation', 'evidence-state'],
    requiredKeys: ['transparent_tape'],
    pickupable: true,
    stateTags: ['restored-document'],
    variations: [
      { name: '撕碎的遺書', lockMsg: '遺書被撕成碎片。', unlockMsg: '你用膠帶拼回了完整遺書。' },
    ],
  },
  {
    id: 'encrypted_audio', name: '加密的錄音檔',
    lockedDescription: '一段加密的錄音檔，聽起來只是雜訊。',
    unlockDescription: '解密軟體執行後，原始對話浮現。',
    category: 'container', mechanism: 'physical', capacity: 2, volume: 0.5,
    tags: ['investigation', 'evidence-state'],
    requiredKeys: ['decrypt_software'],
    pickupable: true,
    stateTags: ['decoded-audio'],
    variations: [
      { name: '加密的錄音檔', lockMsg: '錄音只有雜訊。', unlockMsg: '解密後，對話浮現。' },
    ],
  },
  {
    id: 'burned_notebook', name: '燒焦的筆記本',
    lockedDescription: '筆記本被火燒過，字跡難以辨認。',
    unlockDescription: '紫外線燈下，隱藏的字跡顯現。',
    category: 'container', mechanism: 'physical', capacity: 2, volume: 1,
    tags: ['investigation', 'evidence-state'],
    requiredKeys: ['uv_lamp'],
    pickupable: true,
    stateTags: ['revealed-notes'],
    variations: [
      { name: '燒焦的筆記本', lockMsg: '字跡難以辨認。', unlockMsg: '紫外線下，字跡顯現。' },
    ],
  },
  {
    id: 'stained_cloth', name: '沾血的衣物樣本',
    lockedDescription: '一件沾血的衣物樣本，血跡需要正式採樣才能送驗。',
    unlockDescription: '採樣工具抽取了乾淨的樣本，可用於 DNA 比對。',
    category: 'container', mechanism: 'physical', capacity: 2, volume: 1,
    tags: ['investigation', 'evidence-state'],
    requiredKeys: ['forensic_kit'],
    pickupable: true,
    stateTags: ['dna-sample'],
    variations: [
      { name: '沾血的衣物樣本', lockMsg: '血跡需要正式採樣。', unlockMsg: '樣本採集完畢。' },
    ],
  },

  // ─── Investigation: 通用偵查容器（無 stateTags，可收任意物品，讓非證據物品也能被包裹）───
  {
    id: 'evidence_drawer', name: '證物室抽屜',
    lockedDescription: '證物室的金屬抽屜，上面貼著案件編號封條。',
    unlockDescription: '你撕開封條，拉開抽屜。',
    category: 'container', mechanism: 'physical', capacity: 8, volume: 5,
    tags: ['investigation', 'evidence-storage', 'physical'],
    requiredKeys: ['police_badge'],
    variations: [
      { name: '證物室抽屜', lockMsg: '金屬抽屜貼著案件封條。', unlockMsg: '你撕開封條，拉開抽屜。' },
      { name: '物證保管箱', lockMsg: '一個標示「物證」的金屬箱。', unlockMsg: '你開啟了物證保管箱。' },
    ],
  },
  {
    id: 'case_file_box', name: '案件檔案箱',
    lockedDescription: '一個堆滿卷宗的硬紙箱，用繩子綁著。',
    unlockDescription: '你出示律師委任狀後，解開繩結翻閱起內容。',
    category: 'container', mechanism: 'physical', capacity: 8, volume: 5,
    tags: ['investigation', 'evidence-storage', 'physical'],
    requiredKeys: ['attorney_letter'],
    variations: [
      { name: '案件檔案箱', lockMsg: '硬紙箱用繩子綁著。', unlockMsg: '你解開繩結，翻閱卷宗。' },
      { name: '調查卷宗', lockMsg: '一疊被封條封住的卷宗。', unlockMsg: '你撕開封條，翻開卷宗。' },
    ],
  },
  {
    id: 'lost_and_found', name: '失物招領櫃',
    lockedDescription: '一個落滿灰塵的失物招領玻璃櫃。',
    unlockDescription: '你用家屬同意書換取了櫃中物品。',
    category: 'container', mechanism: 'physical', capacity: 6, volume: 3,
    tags: ['investigation', 'evidence-storage', 'physical'],
    requiredKeys: ['family_consent'],
    variations: [
      { name: '失物招領櫃', lockMsg: '落滿灰塵的玻璃櫃。', unlockMsg: '你換取了櫃中物品。' },
    ],
  },
  {
    id: 'detective_briefcase', name: '偵探的手提箱',
    lockedDescription: '一個皮革手提箱，鎖頭上有刮痕。',
    unlockDescription: '你用監視器截圖說服偵探，他親手打開了手提箱。',
    category: 'container', mechanism: 'physical', capacity: 6, volume: 3,
    tags: ['investigation', 'evidence-storage', 'physical'],
    requiredKeys: ['cctv_still'],
    variations: [
      { name: '偵探的手提箱', lockMsg: '皮革手提箱鎖著。', unlockMsg: '偵探親手打開了手提箱。' },
    ],
  },
  {
    id: 'photo_album', name: '老舊相本',
    lockedDescription: '一本厚厚的相本，邊緣已經泛黃。',
    unlockDescription: '你翻開相本，熟悉的面孔出現。',
    category: 'container', mechanism: 'hidden', capacity: 4, volume: 2,
    tags: ['investigation', 'evidence-storage', 'hidden'],
    requiredKeys: ['flashlight'],
    variations: [
      { name: '老舊相本', lockMsg: '相本邊緣泛黃。', unlockMsg: '你翻開相本。' },
    ],
  },

  // ─── Investigation: NPC 鎖（不可拾取，固定房間內）───
  // 目擊者類
  {
    id: 'npc_concierge', name: '夜班門房',
    lockedDescription: '門房警戒地盯著你：「警官，沒有正式程序，我沒辦法說什麼。」',
    unlockDescription: '警徽和監視器截圖同時擺在他面前，他嘆了一口氣：「⋯⋯好，那晚兩點左右確實有人進來。」',
    partialDescription: '他皺起眉頭，目光在你帶來的東西上打轉：「這個⋯⋯還不夠讓我說什麼。」',
    category: 'container', mechanism: 'combination', capacity: 6, volume: 0,
    tags: ['investigation', 'npc', 'witness'],
    requiredKeys: ['police_badge', 'cctv_still'],
    pickupable: false,
    stateTags: ['tip-timing'],
    variations: [
      { name: '夜班門房', lockMsg: '門房警戒地開口：「沒有正式文件，我什麼都不能說。」', unlockMsg: '他嘆了口氣：「⋯⋯好，那晚確實有人深夜進出。」', partialMsg: '他搖搖頭：「這樣還不夠，你還有別的嗎？」' },
      { name: '值夜保全', lockMsg: '保全握著對講機，眼神警戒：「這裡我負責，外人不能隨便問。」', unlockMsg: '他低頭看了一眼截圖，嘴角抽動：「⋯⋯那個人我認得，但你沒看到我說的。」', partialMsg: '他瞇眼打量：「只帶這個來問我？不太夠。」' },
      { name: '大夜班警衛', lockMsg: '警衛靠在門邊，語氣冷淡：「來查什麼？有沒有帶單據？」', unlockMsg: '看完警徽和畫面，他把守衛台的登記簿往前推：「那晚的簽到你自己翻。」', partialMsg: '他聳聳肩：「不夠具體，我沒什麼可說的。」' },
    ],
  },
  {
    id: 'npc_cleaner', name: '清潔阿姨',
    lockedDescription: '阿姨低著頭擦地板，輕聲說：「我只是打掃的，不關我的事啦。」',
    unlockDescription: '家屬同意書一拿出來，她停下手中的掃把：「哎⋯⋯那晚我聽到他們在走廊吵架，聲音很大。」',
    category: 'container', mechanism: 'physical', capacity: 4, volume: 0,
    tags: ['investigation', 'npc', 'witness'],
    requiredKeys: ['family_consent'],
    pickupable: false,
    stateTags: ['tip-quarrel'],
    variations: [
      { name: '清潔阿姨', lockMsg: '阿姨頭也不抬：「我只是掃地的，不要問我。」', unlockMsg: '看到同意書，她放下掃把嘆氣：「那晚有吵架，很兇。」' },
      { name: '打掃工', lockMsg: '她搖搖頭，用方言嘟噥：「不關我的事，問別人去。」', unlockMsg: '有了家屬授權，她才點頭：「我親眼看到的，但你不要說我說的⋯⋯」' },
      { name: '大樓清潔員', lockMsg: '她靠在走廊牆邊，警覺地四下張望：「這種事我不敢亂說。」', unlockMsg: '同意書給她看之後，她低聲說：「那晚電梯旁邊，有人推他⋯⋯」' },
    ],
  },
  {
    id: 'npc_clerk', name: '便利商店店員',
    lockedDescription: '店員頭也不抬地掃條碼：「不好意思，我都忘了昨天什麼樣子了。」',
    unlockDescription: '截圖一舉起來，他突然停手：「欸！這個人我記得，他那晚來買酒，一直在打電話。」',
    category: 'container', mechanism: 'physical', capacity: 4, volume: 0,
    tags: ['investigation', 'npc', 'witness'],
    requiredKeys: ['cctv_still'],
    pickupable: false,
    stateTags: ['tip-timing'],
    variations: [
      { name: '便利商店店員', lockMsg: '店員掃商品：「我記性不好，真的忘了啦。」', unlockMsg: '截圖一亮出，他馬上認出：「這個人！他那晚買了一瓶威士忌。」' },
      { name: '深夜店員', lockMsg: '她盯著收銀機螢幕：「深夜都是怪人，我不太記了。」', unlockMsg: '她瞇著眼看截圖：「⋯⋯這件外套我記得，他大概兩點半進來的。」' },
      { name: '加油站員工', lockMsg: '他比了比監視器：「我們這裡有錄影，但私人資料不能給。」', unlockMsg: '截圖拿出來，他認出那台車：「這輛！那晚加了滿缸油，付現的。」' },
    ],
  },
  {
    id: 'npc_taxi', name: '計程車司機',
    lockedDescription: '司機盯著前方，平靜地說：「乘客資料這個，我們不能隨便告訴人的。」',
    unlockDescription: '搜查令一攤開，他沉默片刻，把那晚的行程紀錄往你面前一推：「自己看，我不記得路線。」',
    category: 'container', mechanism: 'physical', capacity: 6, volume: 0,
    tags: ['investigation', 'npc', 'witness'],
    requiredKeys: ['search_warrant'],
    pickupable: false,
    stateTags: ['tip-hideout'],
    variations: [
      { name: '計程車司機', lockMsg: '司機盯著方向盤：「乘客隱私，我沒辦法說。」', unlockMsg: '搜查令一看，他把行程紀錄推過來：「自己看吧。」' },
      { name: '代駕司機', lockMsg: '他點開APP說：「所有行程記錄在後台，我無權調閱。」', unlockMsg: '搜查令讓他配合，他把那晚的接單截圖給你看。' },
      { name: '機場接駁員', lockMsg: '他搖搖頭：「接了幾百個客人，哪記得。」', unlockMsg: '搜查令讓他打開排班系統：「那晚這個時段⋯⋯只有這一筆。」' },
    ],
  },
  {
    id: 'npc_dogwalker', name: '遛狗的老人',
    lockedDescription: '老人用遛狗繩纏著手指，自顧自地說：「老了，記性差，你問錯人了。」',
    unlockDescription: '現場照片和時間一對上，他瞇起眼睛：「⋯⋯那晚我家狗狂叫，我看到有人從巷口跑出去。」',
    partialDescription: '他側身望著遠處：「只帶這個？沒辦法幫你確認到底是哪晚。」',
    category: 'container', mechanism: 'combination', capacity: 4, volume: 0,
    tags: ['investigation', 'npc', 'witness'],
    requiredKeys: ['scene_photo', 'tip_timing'],
    pickupable: false,
    stateTags: ['tip-motive'],
    variations: [
      { name: '遛狗的老人', lockMsg: '老人搖搖頭：「記性差，記不清楚了。」', unlockMsg: '照片對上時間，他回想起來：「那晚狗狂叫，我看到一個人跑走。」', partialMsg: '他瞇眼看你：「還不夠具體，我沒辦法確認是哪天。」' },
      { name: '公園常客', lockMsg: '老人慢慢踱步：「我每天都來，怎麼記得哪一晚特別。」', unlockMsg: '照片加上時間讓他停下腳步：「這個位置⋯⋯那晚確實有個陌生人在那等著。」', partialMsg: '他抬頭看天：「你帶的東西不夠讓我想起那一晚。」' },
      { name: '晨運的長者', lockMsg: '長者擺擺手：「我就是繞圈走走，沒注意別人的事。」', unlockMsg: '現場位置加上時間，他想了想：「那個位置？是有個人我沒見過，在那抽菸等人。」', partialMsg: '他皺眉：「只憑這一樣，我說不準是那晚的事。」' },
    ],
  },
  // 關係人類
  {
    id: 'npc_exwife', name: '死者前妻',
    lockedDescription: '她抱著臂膀靠在門邊：「那段關係很久以前就結束了，我沒什麼好說的。」',
    unlockDescription: '日記、外遇的事、那筆錢⋯⋯一件件攤在桌上，她的眼眶紅了：「你知道了這麼多⋯⋯好，他其實從沒離開過那段關係。」',
    partialDescription: '她看著你帶來的東西，冷冷地說：「這些不能說明什麼，我不需要替他解釋。」',
    category: 'container', mechanism: 'combination', capacity: 8, volume: 0,
    tags: ['investigation', 'npc', 'relative'],
    requiredKeys: ['diary_book', 'tip_affair', 'tip_money'],
    pickupable: false,
    stateTags: ['tip-money'],
    variations: [
      { name: '死者前妻', lockMsg: '她抱著臂膀：「那段日子我不想再提了。」', unlockMsg: '三件事全擺上桌，她紅著眼：「好吧⋯⋯他從來沒有真正離開那個人。」', partialMsg: '她搖頭：「你帶的還不夠讓我說，我不想平白捲進去。」' },
      { name: '死者的前任伴侶', lockMsg: '她輕聲說：「我已經不是他生命裡的人了，問我沒意義。」', unlockMsg: '日記翻開在她面前，她抽了一口氣：「這些字是他的筆跡⋯⋯好，我跟你說那筆錢的事。」', partialMsg: '她避開你的目光：「只拿這些來？還不夠讓我開口。」' },
      { name: '分居多年的妻子', lockMsg: '她端起茶杯，靜靜地：「我們分開很久了，我不清楚他最近的事。」', unlockMsg: '錢的來源、外遇的細節、他的日記⋯⋯她緩緩放下杯子：「⋯⋯他一直說那筆錢是為我留的，但根本是謊言。」', partialMsg: '她細細打量你帶來的東西：「還差一些，你要說服我，得再多帶點。」' },
    ],
  },
  {
    id: 'npc_roommate', name: '失蹤者室友',
    lockedDescription: '她把門開了一條縫：「我⋯⋯我其實不太清楚他的事，真的。」',
    unlockDescription: '私章往門縫一遞，她眼神一顫，把門拉開：「這是他的⋯⋯那晚他們吵得很激烈，我有聽到。」',
    category: 'container', mechanism: 'physical', capacity: 6, volume: 0,
    tags: ['investigation', 'npc', 'relative'],
    requiredKeys: ['personal_seal'],
    pickupable: false,
    stateTags: ['tip-quarrel'],
    variations: [
      { name: '失蹤者室友', lockMsg: '她把門開一條縫：「我真的不太知道他的事。」', unlockMsg: '私章出現，她把門推開：「這是他的⋯⋯那晚有人來找他，聲音很大。」' },
      { name: '同寢室友', lockMsg: '她搓著手：「我不想被捲進去，你問別人好嗎？」', unlockMsg: '認出那枚私章，她吸了口氣：「好吧，那晚他接了一個電話，之後就消失了。」' },
      { name: '合租公寓的鄰居', lockMsg: '她靠在門框上，語氣謹慎：「鄰居的事，我不方便說太多。」', unlockMsg: '看到章，她沉默了一下：「他把這個放在我這裡⋯⋯說萬一出事就拿去給警察。」' },
    ],
  },
  {
    id: 'npc_coworker', name: '死者同事',
    lockedDescription: '他頭也不抬地盯著螢幕：「我現在很忙，能不能下班後再說？」',
    unlockDescription: '帳戶紀錄和DNA報告同時出現，他把椅子轉過來：「⋯⋯好，那筆錢其實不是公款，是他私下借我的。」',
    partialDescription: '他抬頭看了一眼，搖搖頭：「只有這個，我不知道你要問什麼。」',
    category: 'container', mechanism: 'physical', capacity: 4, volume: 0,
    tags: ['investigation', 'npc', 'relative'],
    requiredKeys: ['bank_statement', 'dna_sample'],
    pickupable: false,
    stateTags: ['tip-money'],
    variations: [
      { name: '死者同事', lockMsg: '他緊盯螢幕：「很忙，可以之後再說嗎？」', unlockMsg: '帳戶加上DNA，他終於轉過身：「那筆錢⋯⋯是他欠我的，不是公款。」', partialMsg: '他瞟了一眼：「只有這個，我沒什麼好說的。」' },
      { name: '同部門組員', lockMsg: '他用便利貼擋住臉：「我現在沒空，報告要交。」', unlockMsg: '兩份文件擺上桌，他深吸一口氣：「好吧⋯⋯他那段時間行為很奇怪，到處借錢。」', partialMsg: '他聳聳肩：「只帶一份不夠，我沒辦法確認。」' },
      { name: '吸菸區常見的面孔', lockMsg: '他抽著菸，漫不在乎地說：「我跟他只是同事，私下不熟。」', unlockMsg: '他看完帳戶和樣本，把菸按熄：「⋯⋯其實他找過我借過一大筆，說是急用。」', partialMsg: '他彈了彈菸灰：「就這樣？說不了什麼。」' },
    ],
  },
  {
    id: 'npc_mother', name: '受害者母親',
    lockedDescription: '她抱著一張舊照片，眼眶通紅：「我⋯⋯我現在說不了什麼，對不起。」',
    unlockDescription: '拼好的遺書和筆記展開在她面前，她閉上眼睛，緩緩說：「他從小就知道這件事⋯⋯那段感情，家裡一直不讓他說。」',
    partialDescription: '她搖搖頭，眼淚滑下臉頰：「只有這樣⋯⋯我還沒辦法說，太難了。」',
    category: 'container', mechanism: 'physical', capacity: 8, volume: 0,
    tags: ['investigation', 'npc', 'relative'],
    requiredKeys: ['restored_document', 'revealed_notes'],
    pickupable: false,
    stateTags: ['tip-affair'],
    variations: [
      { name: '受害者母親', lockMsg: '她抱著照片，啜泣著：「我現在說不了任何話。」', unlockMsg: '遺書和筆記同時放到她手中，她說：「那段感情⋯⋯家裡一直壓著不讓說。」', partialMsg: '她搖頭：「只有這樣，我還說不了，等我準備好。」' },
      { name: '年邁的父親', lockMsg: '他沉默地坐著，盯著地板：「孩子的事，我說了也沒用。」', unlockMsg: '兩份文件讓他撐起身體，沙啞地說：「⋯⋯那個人，我見過，是個危險的傢伙。」', partialMsg: '他揮揮手：「你帶的東西不夠讓我說，我怕說了有危險。」' },
      { name: '奶奶', lockMsg: '她把手搭在你手背上：「老了，很多事記不住了⋯⋯」', unlockMsg: '遺書和筆記讓她顫抖著手接過：「這是他寫的⋯⋯那個孩子⋯⋯一直愛著那個人啊。」', partialMsg: '她搖頭嘆氣：「只有這樣，我想不起太多了。」' },
    ],
  },
  // 專業人士類
  {
    id: 'npc_coroner', name: '法醫',
    lockedDescription: '他頭戴護目鏡，冷靜地說：「報告還沒定案，我現在沒辦法跟你談。」',
    unlockDescription: '警徽、委任狀、加上兇器線索一起出示，他脫下手套，翻出解剖紀錄：「傷口角度和你說的吻合，這把刀不對勁。」',
    partialDescription: '他放下筆，謹慎地說：「文件不齊，我不能洩露鑑識細節，這是程序。」',
    category: 'container', mechanism: 'combination', capacity: 6, volume: 0,
    tags: ['investigation', 'npc', 'professional'],
    requiredKeys: ['police_badge', 'attorney_letter', 'tip_weapon'],
    pickupable: false,
    stateTags: ['tip-weapon'],
    variations: [
      { name: '法醫', lockMsg: '他頭也不抬：「報告還沒定案，現在不能說。」', unlockMsg: '三件齊備，他脫下手套：「傷口角度跟你說的符合，兇器很特殊。」', partialMsg: '他搖頭：「沒有完整授權，我沒辦法透露鑑識結果。」' },
      { name: '資深鑑識員', lockMsg: '她靠在實驗室門邊：「現在保密期，任何細節我都不能說。」', unlockMsg: '全部文件到位，她嘆口氣打開档案：「這個傷不是一般刀，是特殊刀刃。」', partialMsg: '她指著文件欄位：「少了一份，這裡的資料不能給你。」' },
      { name: '解剖室技師', lockMsg: '他拉開口罩，警戒地看你：「你是誰？沒有授權不能進來問。」', unlockMsg: '三份齊了，他翻出紀錄本低聲說：「其實有一個細節我一直覺得奇怪⋯⋯」', partialMsg: '他搖搖手：「少一份，不行，照規矩來。」' },
    ],
  },
  {
    id: 'npc_reporter', name: '資深記者',
    lockedDescription: '記者懶洋洋地滑著手機：「我有自己的消息來源，現在不需要警察幫忙。」',
    unlockDescription: '記者證、名片盒、加上一個他還不知道的動機，他坐直身體：「⋯⋯你這個線人可以，我把筆記給你看。」',
    partialDescription: '他抬頭瞥了一眼，不以為然地說：「這算什麼籌碼？你拿出更有料的再來找我。」',
    category: 'container', mechanism: 'combination', capacity: 6, volume: 0,
    tags: ['investigation', 'npc', 'professional'],
    requiredKeys: ['press_pass', 'business_card', 'tip_motive'],
    pickupable: false,
    stateTags: ['tip-motive'],
    variations: [
      { name: '資深記者', lockMsg: '記者滑著手機：「我有自己的線，不需要你。」', unlockMsg: '三份籌碼一出，他坐直：「你這消息有料，我把筆記給你看。」', partialMsg: '他抬頭：「就這樣？帶點更有意思的再來。」' },
      { name: '八卦雜誌主筆', lockMsg: '她翻著雜誌稿：「跑這條線很久了，你能給我什麼？」', unlockMsg: '記者證、名片和動機說服了她：「⋯⋯行，這個角度我沒想到，我的舊資料給你看。」', partialMsg: '她搖頭：「不夠料，回去多挖點再來。」' },
      { name: '調查報導記者', lockMsg: '他低著頭打字：「要交稿，沒時間，你說重點。」', unlockMsg: '三件到齊，他闔上筆電：「OK，等值交換，我的線人說的你要聽嗎？」', partialMsg: '他瞟了一眼：「拿更多來，不然沒得談。」' },
    ],
  },
  {
    id: 'npc_pi', name: '私家偵探',
    lockedDescription: '他靠著椅背，慢悠悠地說：「我的客戶資料，不是誰都能問的。」',
    unlockDescription: '懷錶、解密錄音、加上藏匿地點的線索全擺上桌，他頓了一下，嘴角輕輕動了一下：「⋯⋯好吧，你比我想的聰明，我告訴你他現在在哪。」',
    partialDescription: '他交叉雙臂，用眼角看你：「還差一點，你的籌碼還不夠讓我開口。」',
    category: 'container', mechanism: 'combination', capacity: 6, volume: 0,
    tags: ['investigation', 'npc', 'professional'],
    requiredKeys: ['pocket_watch', 'decoded_audio', 'tip_hideout'],
    pickupable: false,
    stateTags: ['tip-hideout'],
    variations: [
      { name: '私家偵探', lockMsg: '偵探靠在椅背：「客戶資料，不是誰都能問的。」', unlockMsg: '三件齊了，他嘆了口氣：「你比我想的有料，地點告訴你。」', partialMsg: '他交叉雙臂：「還差一點，你的籌碼不夠。」' },
      { name: '線人', lockMsg: '他四處張望，壓低聲音：「我說話要收費，你有帶什麼嗎？」', unlockMsg: '籌碼擺出來，他點頭：「OK，他躲的那個地方，我帶你去。」', partialMsg: '他撥弄著硬幣：「還差一樣，不夠讓我開口。」' },
      { name: '老派徵信社老闆', lockMsg: '他透過厚玻璃看你：「沒有委託單，我不接話。」', unlockMsg: '懷錶、錄音、藏處三件到齊，他從抽屜裡拿出一個信封：「這是我早就準備好的，等人來拿。」', partialMsg: '他搖著頭：「差那麼一點，你再去找找。」' },
    ],
  },
  {
    id: 'npc_paralegal', name: '律師事務所職員',
    lockedDescription: '她放下手中的文件夾：「不好意思，沒有正式委任，客戶資料我們不能透露。」',
    unlockDescription: '律師委任狀遞上，她核對印鑑後點頭，打開了下面那個抽屜：「這份卷宗，你有十五分鐘看。」',
    category: 'container', mechanism: 'physical', capacity: 8, volume: 0,
    tags: ['investigation', 'npc', 'professional'],
    requiredKeys: ['attorney_letter'],
    pickupable: false,
    stateTags: ['tip-affair'],
    variations: [
      { name: '律師事務所職員', lockMsg: '她放下文件夾：「沒有委任狀，我們不能透露客戶資料。」', unlockMsg: '委任狀核對後，她打開抽屜：「你有十五分鐘，這裡看完。」' },
      { name: '書記官', lockMsg: '他推了推眼鏡：「程序問題，沒有授權文件我沒辦法幫你。」', unlockMsg: '委任狀到位，他翻出厚重的卷宗：「這一段，這裡有記錄，自己看。」' },
      { name: '法務助理', lockMsg: '她低著頭在打字：「請先聯絡律師預約，我這邊沒辦法直接處理。」', unlockMsg: '委任狀讓她停下來，她從保險箱裡取出一個信封：「這個⋯⋯他交代我保管的。」' },
    ],
  },
  {
    id: 'npc_realtor', name: '房屋仲介',
    lockedDescription: '仲介帶著職業微笑：「產權資料屬於客戶隱私，請問您有具體的物件資訊嗎？」',
    unlockDescription: '手寫地址條一拿出來，他看了看，低聲說：「這棟⋯⋯登記的是一個空殼公司，但真正的屋主我認識。」',
    category: 'container', mechanism: 'physical', capacity: 4, volume: 0,
    tags: ['investigation', 'npc', 'professional'],
    requiredKeys: ['address_slip'],
    pickupable: false,
    stateTags: ['tip-hideout'],
    variations: [
      { name: '房屋仲介', lockMsg: '仲介微笑：「請問有具體的物件資訊嗎？」', unlockMsg: '地址條一出，他低聲：「這棟的真正屋主我認識⋯⋯」' },
      { name: '公寓管委會總幹事', lockMsg: '她整理著開會記錄：「住戶資料不能外流，請問你的目的是？」', unlockMsg: '地址條遞過去，她沉默片刻：「這個單位⋯⋯登記名字跟我知道的房客不一樣。」' },
      { name: '包租公', lockMsg: '他翻著帳本，漫不在乎：「房子不少，你要問哪一間？」', unlockMsg: '地址條出現，他放下帳本，表情變了：「這地方⋯⋯他說他是大公司的人，付了好幾個月押金。」' },
    ],
  },
  // 嫌疑人類
  {
    id: 'npc_hotelmanager', name: '旅館經理',
    lockedDescription: '經理微笑接待，眼神卻不時飄向門口：「警官⋯⋯我對那晚真的沒什麼印象，您有更具體的東西嗎？」',
    unlockDescription: '鞋印、通話紀錄、加上那晚爭執的細節同時攤開，他的微笑終於消失：「⋯⋯好吧，那晚我確實和他在走廊上有過衝突。」',
    partialDescription: '他額頭開始泛汗，勉強維持笑容：「這⋯⋯這只是巧合吧，不能說明什麼。」',
    category: 'container', mechanism: 'combination', capacity: 6, volume: 0,
    tags: ['investigation', 'npc', 'suspect'],
    requiredKeys: ['shoe_print', 'phone_records', 'tip_quarrel'],
    pickupable: false,
    stateTags: ['tip-quarrel'],
    variations: [
      { name: '旅館經理', lockMsg: '經理微笑，眼神躲閃：「您有更具體的東西嗎？」', unlockMsg: '三件全到，他的笑消失：「⋯⋯那晚我確實和他在走廊上起了爭執。」', partialMsg: '他額頭冒汗：「這⋯⋯只是巧合，說明不了什麼。」' },
      { name: '櫃台主任', lockMsg: '她緊抿嘴唇：「客人的隱私我們是有義務保護的。」', unlockMsg: '三件證據擺出，她嘆了口氣，翻開那晚的登記簿：「這個房間⋯⋯他來過兩次。」', partialMsg: '她盯著桌面：「這不一定代表什麼，我需要更確定的東西。」' },
      { name: '民宿老闆', lockMsg: '他搓著手，笑容有點僵：「哎，客人就是客人，我哪記得那麼多。」', unlockMsg: '三件全攤開，他扶著桌子，聲音低了下去：「⋯⋯那晚他跟人吵完就跑了，我看到了。」', partialMsg: '他避開眼神：「這樣⋯⋯還不夠讓我說什麼。」' },
    ],
  },
  {
    id: 'npc_blackmarket', name: '黑市掮客',
    lockedDescription: '他靠在牆邊，慢慢打量你：「我只是個中間人，你找錯人了。」',
    unlockDescription: '刀具特寫往桌上一甩，他沉默片刻，緩緩說：「⋯⋯那把刀是我賣出去的，買家我只見過一次。」',
    category: 'container', mechanism: 'physical', capacity: 6, volume: 0,
    tags: ['investigation', 'npc', 'suspect'],
    requiredKeys: ['knife_closeup'],
    pickupable: false,
    stateTags: ['tip-weapon'],
    variations: [
      { name: '黑市掮客', lockMsg: '掮客靠牆打量你：「我只是中間人，找錯了。」', unlockMsg: '特寫照往桌上一甩，他低聲說：「那把刀是我的貨，但買家我不認識。」' },
      { name: '地下當鋪老闆', lockMsg: '他隔著鐵網看你：「我這裡清清白白，你要找什麼？」', unlockMsg: '刀具照片讓他臉色一變：「⋯⋯那個花紋，我見過，有人拿來典當過。」' },
      { name: '夜市走私商', lockMsg: '他若無其事地整理攤位：「賣的都是合法商品，警官有事說事。」', unlockMsg: '照片一亮出，他偷偷往四周看：「⋯⋯這個⋯⋯是我轉手的，但我不知道要幹什麼用。」' },
    ],
  },
  {
    id: 'npc_guardleader', name: '保全隊長',
    lockedDescription: '隊長立正站好，語氣制式：「那晚我們的巡邏紀錄都有存檔，請透過正式管道申請。」',
    unlockDescription: '警徽加上清晰截圖雙管齊下，他臉色僵了一下，低頭說：「⋯⋯那晚我確實提早離崗了，沒有照規定。」',
    partialDescription: '他維持標準姿勢：「這還不夠讓我說任何非正式的事，請走正式程序。」',
    category: 'container', mechanism: 'combination', capacity: 6, volume: 0,
    tags: ['investigation', 'npc', 'suspect'],
    requiredKeys: ['police_badge', 'enhanced_photo'],
    pickupable: false,
    stateTags: ['tip-timing'],
    variations: [
      { name: '保全隊長', lockMsg: '隊長立正：「請透過正式管道申請，我們有存檔。」', unlockMsg: '警徽和截圖齊出，他低下頭：「那晚我確實提早離崗⋯⋯」', partialMsg: '他繃著臉：「這不夠，請走正式程序。」' },
      { name: '警衛班長', lockMsg: '他把雙手背在身後：「我按規矩做事，沒什麼好說的。」', unlockMsg: '清晰截圖和警徽讓他喉嚨動了一下：「⋯⋯那個班是我排的，但那晚有人換班，我沒批准。」', partialMsg: '他搖頭：「拿齊文件再來，我不說沒根據的話。」' },
      { name: '夜間督察', lockMsg: '她夾著板子走來走去：「例行詢問，請配合正規程序。」', unlockMsg: '兩件齊備，她停下腳步：「⋯⋯那個時段的監控有段空窗，是我沒處理好。」', partialMsg: '她繼續走：「不完整，走程序。」' },
    ],
  },
  {
    id: 'npc_superintendent', name: '公寓大樓管理員',
    lockedDescription: '管理員縮在玻璃後面，假裝在整理表格：「沒有預約，樓上的事我不方便說。」',
    unlockDescription: '鑰匙圈叮噹一聲擺上櫃台，他臉色一白：「這⋯⋯這是哪來的？那個房間⋯⋯我知道裡面有人。」',
    category: 'container', mechanism: 'physical', capacity: 4, volume: 0,
    tags: ['investigation', 'npc', 'suspect'],
    requiredKeys: ['keyring'],
    pickupable: false,
    stateTags: ['tip-hideout'],
    variations: [
      { name: '公寓大樓管理員', lockMsg: '管理員縮在玻璃後：「沒預約，我不方便說。」', unlockMsg: '鑰匙圈一亮出，他臉色一白：「這是哪來的⋯⋯那個房間有人住。」' },
      { name: '社區總幹事', lockMsg: '她抱著公告板：「住戶資料保密，請問您找哪一位？」', unlockMsg: '鑰匙圈放在桌上，她嘴唇抖了一下：「這串鑰匙⋯⋯是七樓那個人的，他說出去一下。」' },
      { name: '大樓主委', lockMsg: '他斜眼打量你：「你是住戶嗎？不是的話，我沒辦法幫你。」', unlockMsg: '鑰匙圈認出來，他放下茶杯：「這個⋯⋯這是備用鑰匙，那個單位已經很久沒人進出了。」' },
    ],
  },
  // 邊緣角色類
  {
    id: 'npc_intern', name: '實習生',
    lockedDescription: '實習生眼神不停飄向主管辦公室：「這⋯⋯這件事我不確定能不能說⋯⋯」',
    unlockDescription: '你說出那個只有熟識的人才知道的小名，他頓了一下，放低聲音：「你認識他？那我告訴你，他那天匯了一筆很大的錢。」',
    category: 'container', mechanism: 'physical', capacity: 4, volume: 0,
    tags: ['investigation', 'npc', 'edge'],
    requiredKeys: ['tip_nickname'],
    pickupable: false,
    stateTags: ['tip-money'],
    variations: [
      { name: '實習生', lockMsg: '他眼神飄忽：「這個⋯⋯我不確定能說⋯⋯」', unlockMsg: '聽到那個小名，他放低聲音：「你認識他？那⋯⋯他那天匯了一大筆錢。」' },
      { name: '工讀生', lockMsg: '她輕聲說：「這不是我能管的事，你問上面的人。」', unlockMsg: '小名一說出，她眼睛睜大了：「你也知道那個？那他跟我說的事⋯⋯我可以告訴你。」' },
      { name: '兼差的學生', lockMsg: '他縮著肩膀：「我只是打工的，不太清楚公司的事。」', unlockMsg: '小名說出，他嘴角微微動了一下：「⋯⋯你是認識他的人，我說給你聽，但別提我。」' },
    ],
  },
  {
    id: 'npc_courier', name: '送貨員',
    lockedDescription: '送貨員低著頭掃條碼：「等一下，我還有單要清，你要問什麼？」',
    unlockDescription: '地址條遞過去，他抬頭，認出了那個地址：「這⋯⋯我送過！就在上週，對方簽名很潦草，但我記得那棟樓。」',
    category: 'container', mechanism: 'physical', capacity: 4, volume: 0,
    tags: ['investigation', 'npc', 'edge'],
    requiredKeys: ['address_slip'],
    pickupable: false,
    stateTags: ['tip-hideout'],
    variations: [
      { name: '送貨員', lockMsg: '送貨員掃條碼：「等一下，我還有單要清。」', unlockMsg: '地址一認出，他抬頭：「這我送過！對方簽名很潦草，但我記得那棟。」' },
      { name: '快遞員', lockMsg: '她把箱子堆好，看了你一眼：「你找我什麼事？我很趕。」', unlockMsg: '地址條讓她停下來：「這地方⋯⋯我送了三次，每次都沒人開門，後來有個男的下來拿。」' },
      { name: '跑腿小弟', lockMsg: '他對著手機看地址：「你要問什麼，我還有單子要跑。」', unlockMsg: '地址條一亮，他認出了：「這邊我去過，那個人叫我把包裹放在門口，不要敲門。」' },
    ],
  },
  {
    id: 'npc_bartender', name: '酒保',
    lockedDescription: '酒保用布慢慢擦杯子，眼神平靜：「客人的事，我向來不多嘴。」',
    unlockDescription: '火柴盒擺上吧台，他認出那個 logo，把聲音壓低：「這是我們家的⋯⋯那晚兩個人在最裡面那桌，吵了很久。」',
    category: 'container', mechanism: 'physical', capacity: 4, volume: 0,
    tags: ['investigation', 'npc', 'edge'],
    requiredKeys: ['matchbox'],
    pickupable: false,
    stateTags: ['tip-affair'],
    variations: [
      { name: '酒保', lockMsg: '酒保擦著杯子：「客人的事，我不多嘴。」', unlockMsg: '火柴盒一認出，他壓低聲音：「那晚那兩個，吵了很久⋯⋯」' },
      { name: '酒吧經理', lockMsg: '她交叉雙臂靠著吧台：「這裡的事，向來進出兩清。」', unlockMsg: '認出火柴盒，她眼睛微微眯起：「這個⋯⋯那晚有個女的一直哭，和那個男人吵架。」' },
      { name: '深夜食堂老闆', lockMsg: '他坐在角落剁菜：「我這裡的客人不喜歡被打聽。」', unlockMsg: '火柴盒放在他面前，他停下來：「你在那邊吃過？那晚的事，我有看到一些⋯⋯」' },
    ],
  },
  {
    id: 'npc_regular', name: '常客',
    lockedDescription: '他端著酒杯，若有所思：「我只是來喝酒的，不太認識其他人。」',
    unlockDescription: '你說出那個小名，他眼神一亮，突然笑了：「你也認識他？好傢伙！那晚他來找那個女的，我都聽到了。」',
    category: 'container', mechanism: 'physical', capacity: 4, volume: 0,
    tags: ['investigation', 'npc', 'edge'],
    requiredKeys: ['tip_nickname'],
    pickupable: false,
    stateTags: ['tip-motive'],
    variations: [
      { name: '常客', lockMsg: '他端著酒杯：「我只是來喝酒的，不認識太多人。」', unlockMsg: '小名一說，他眼神一亮：「你認識他！那晚他來找那個女的，我都聽到了。」' },
      { name: '老主顧', lockMsg: '她搖著杯裡的冰塊，漫不在乎地看著別處。', unlockMsg: '聽到那個名字，她轉過頭：「你說的是他？他跟那個女的鬧得很僵，那晚我在旁邊桌。」' },
      { name: '熟客', lockMsg: '他瞇著眼，用下巴示意：「你找的人不在這，我不認識你說的。」', unlockMsg: '暱稱一說出，他放下杯子：「⋯⋯你真的認識他，那好，他那晚來過，走得很急，臉色很差。」' },
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
