import type { RoomTheme } from './types';

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
