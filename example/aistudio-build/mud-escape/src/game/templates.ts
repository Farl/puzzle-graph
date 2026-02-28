import { LockTemplate } from './types';

/**
 * 謎題模板 (LockTemplate) 撰寫指南：
 * 
 * 為了讓 AI 或開發者能輕鬆擴充謎題，請遵循以下格式：
 * 
 * 1. type: 謎題類型
 *    - 'physical': 實體鎖，需要特定的鑰匙 (keyNames 陣列中的第一個元素作為鑰匙名稱)。
 *    - 'password': 密碼鎖，需要輸入密碼。系統會自動生成密碼並建立一個線索道具 (clueName 作為線索名稱)。
 *    - 'hidden': 隱藏/環境障礙，需要特定工具才能克服 (keyNames 陣列中的第一個元素作為工具名稱，例如梯子、手電筒)。
 *    - 'combination': 組合鎖，需要多個道具同時放入才能解開 (keyNames 陣列包含所有需要的道具名稱)。
 *    - 'door': 門/通道，解開後可以通往另一個房間。可以結合鑰匙使用。
 * 
 * 2. lockName: 機關的名稱 (例如 "木製寶箱")。
 * 3. lockDesc: 機關未解開時的描述。
 * 4. unlockDesc: 機關解開時的描述。
 * 5. keyNames: (可選) 需要的鑰匙或工具名稱陣列。
 * 6. clueName: (可選) 密碼鎖專用的線索道具名稱。
 */

export const templates: LockTemplate[] = [
  // --- Physical Locks (實體鎖) ---
  { type: 'physical', lockName: "木製寶箱", lockDesc: "一個古老的木製寶箱，上面掛著一個沉重的鐵鎖。", unlockDesc: "寶箱的鎖發出喀嚓聲，蓋子彈開了。", keyNames: ["生鏽的鑰匙"] },
  { type: 'physical', lockName: "辦公桌抽屜", lockDesc: "辦公桌的抽屜被鎖上了。", unlockDesc: "你用鑰匙打開了抽屜。", keyNames: ["小銅鑰匙"] },
  { type: 'physical', lockName: "玻璃展示櫃", lockDesc: "一個上鎖的玻璃展示櫃。", unlockDesc: "展示櫃的鎖被打開了。", keyNames: ["精緻的銀鑰匙"] },
  { type: 'physical', lockName: "鐵皮保險箱", lockDesc: "一個堅固的鐵皮保險箱，需要一把特殊的鑰匙。", unlockDesc: "保險箱沉重的門被打開了。", keyNames: ["十字鑰匙"] },
  { type: 'physical', lockName: "生鏽的置物櫃", lockDesc: "員工更衣室的置物櫃，掛著一個普通的掛鎖。", unlockDesc: "掛鎖應聲而開。", keyNames: ["置物櫃鑰匙"] },

  // --- Password Locks (密碼鎖) ---
  { type: 'password', lockName: "電子保險箱", lockDesc: "一個帶有數字鍵盤的電子保險箱。需要輸入4位數密碼。", unlockDesc: "保險箱發出『嗶』一聲，門彈開了。", clueName: "密碼紙條" },
  { type: 'password', lockName: "密碼鎖公事包", lockDesc: "一個帶有密碼轉盤的公事包。", unlockDesc: "密碼正確，公事包順利打開。", clueName: "血跡斑斑的日記" },
  { type: 'password', lockName: "電腦終端機", lockDesc: "一台老舊的電腦，畫面停留在密碼輸入畫面。", unlockDesc: "登入成功，螢幕顯示出隱藏的資訊並解開了旁邊的暗格。", clueName: "員工識別證" },
  { type: 'password', lockName: "牆上的保險箱", lockDesc: "隱藏在畫作後面的保險箱，有數字按鍵。", unlockDesc: "密碼正確，保險箱打開了。", clueName: "撕碎的照片" },
  { type: 'password', lockName: "四碼掛鎖", lockDesc: "一個需要四個數字才能打開的黃銅掛鎖。", unlockDesc: "轉動數字後，掛鎖彈開了。", clueName: "牆上的塗鴉" },

  // --- Hidden/Environment (隱藏/環境障礙) ---
  { type: 'hidden', lockName: "黑暗的通風管", lockDesc: "一個黑漆漆的通風管，裡面什麼都看不見，你需要照明工具。", unlockDesc: "手電筒的光芒照亮了通風管，你發現了裡面的東西。", keyNames: ["手電筒"] },
  { type: 'hidden', lockName: "高處的置物架", lockDesc: "置物架太高了，你構不到上面的東西。", unlockDesc: "你爬上梯子，終於可以拿到上面的東西了。", keyNames: ["梯子"] },
  { type: 'hidden', lockName: "天花板的暗格", lockDesc: "天花板上有一個奇怪的方形痕跡，但太高了碰不到。", unlockDesc: "踩在梯子上，你順利推開了天花板的暗格。", keyNames: ["梯子"] },
  { type: 'hidden', lockName: "釘死的木箱", lockDesc: "一個被木板死死釘住的箱子，徒手無法打開。", unlockDesc: "你用鐵撬撬開了木板，露出了裡面的物品。", keyNames: ["鐵撬"] },
  { type: 'hidden', lockName: "滿是灰塵的地毯下", lockDesc: "地毯下面似乎鼓鼓的，但積滿了灰塵和蜘蛛網，你不想用手碰。", unlockDesc: "你用掃把清理了灰塵，發現了藏在下面的東西。", keyNames: ["掃把"] },
  { type: 'hidden', lockName: "被藤蔓纏繞的石碑", lockDesc: "一塊石碑被粗壯的藤蔓緊緊纏繞，看不清上面的東西。", unlockDesc: "你用開山刀砍斷了藤蔓，露出了石碑的凹槽。", keyNames: ["開山刀"] },

  // --- Combination Locks (組合機關) ---
  { type: 'combination', lockName: "神秘機關盒", lockDesc: "一個奇怪的金屬盒，上面有兩個空缺的齒輪軸。", unlockDesc: "裝上齒輪後，機關盒自動展開了。", keyNames: ["紅色齒輪", "藍色齒輪"] },
  { type: 'combination', lockName: "無眼雕像", lockDesc: "一尊沒有眼睛的雕像，眼眶處空空如也。", unlockDesc: "裝上雙眼後，雕像的嘴巴緩緩張開，吐出了物品。", keyNames: ["左眼寶石", "右眼寶石"] },
  { type: 'combination', lockName: "天平機關", lockDesc: "一個古老的天平，兩端各有一個托盤，似乎需要放上等重的法碼。", unlockDesc: "天平達到平衡，底座彈開了一個暗格。", keyNames: ["銅法碼", "鐵法碼"] },
  { type: 'combination', lockName: "元素祭壇", lockDesc: "一個祭壇，上面有水、火、土三個凹槽。", unlockDesc: "放上三個元素結晶後，祭壇發出光芒並解開了封印。", keyNames: ["水之結晶", "火之結晶", "土之結晶"] }
];

export const doorTemplates: LockTemplate[] = [
  { type: 'door', lockName: "上鎖的木門", lockDesc: "一扇通往其他房間的木門，喇叭鎖被鎖上了。", unlockDesc: "你用鑰匙打開了木門，現在可以前往新房間了。", keyNames: ["房間鑰匙"] },
  { type: 'door', lockName: "鐵柵門", lockDesc: "堅固的鐵柵門擋住了去路，上面掛著大鎖。", unlockDesc: "大鎖被打開，鐵柵門發出刺耳的摩擦聲被推開了。", keyNames: ["生鏽的鐵鑰匙"] },
  { type: 'door', lockName: "密碼鐵門", lockDesc: "一扇厚重的鐵門，旁邊有一個電子密碼盤。", unlockDesc: "密碼正確，鐵門緩緩開啟。", clueName: "保全密碼表" }
];

export const exitTemplates: LockTemplate[] = [
  { type: 'physical', lockName: "厚重的金屬大門", lockDesc: "這是逃出密室的唯一出口。大門緊閉，上面有一個巨大的鑰匙孔。", unlockDesc: "大門緩緩打開，刺眼的陽光照射進來。你自由了！", keyNames: ["萬能金鑰匙"] },
  { type: 'password', lockName: "電子防爆門", lockDesc: "出口是一扇電子防爆門，旁邊有一個密碼輸入面板。", unlockDesc: "密碼正確，防爆門伴隨著氣流聲開啟。你成功逃脫了！", clueName: "逃脫密碼提示" },
  { type: 'combination', lockName: "煉金術士的石門", lockDesc: "出口被一扇刻滿符文的石門封死，門上有三個凹槽。", unlockDesc: "放入祭品後，石門轟然開啟。你重獲自由！", keyNames: ["太陽徽章", "月亮徽章", "星辰徽章"] }
];
