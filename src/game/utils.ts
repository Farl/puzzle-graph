// ─── Seeded PRNG (mulberry32) ───

/**
 * 可種子化的偽隨機數生成器，使用 mulberry32 演算法。
 * 用於取代 Math.random()，實現可重現的關卡生成。
 */
export class SeededRandom {
  private state: number;
  readonly seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? Math.floor(Math.random() * 0x7fffffff);
    this.state = this.seed;
  }

  /** 回傳 [0, 1) 的浮點數，等同 Math.random() */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  }

  /** 回傳 [0, max) 的整數 */
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }
}

/** 取代 Math.random()，優先使用 SeededRandom */
function rngNext(rng?: SeededRandom): number {
  return rng ? rng.next() : Math.random();
}

/** 取代 Math.floor(Math.random() * max)，優先使用 SeededRandom */
function rngNextInt(max: number, rng?: SeededRandom): number {
  return rng ? rng.nextInt(max) : Math.floor(Math.random() * max);
}

/**
 * Fisher-Yates 洗牌演算法（不修改原陣列）
 */
export function shuffle<T>(array: readonly T[], rng?: SeededRandom): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = rngNextInt(i + 1, rng);
    [result[i]!, result[j]!] = [result[j]!, result[i]!];
  }
  return result;
}

/**
 * 名稱唯一化：若衝突則從形容詞列表中隨機前綴，直到唯一
 */
export function getUniqueName(
  baseName: string,
  usedSet: Set<string>,
  adjectives: readonly string[],
  rng?: SeededRandom,
): string {
  if (!usedSet.has(baseName)) {
    usedSet.add(baseName);
    return baseName;
  }

  // 去除已有的形容詞前綴
  let coreName = baseName;
  for (const adj of adjectives) {
    if (coreName.startsWith(adj)) {
      coreName = coreName.substring(adj.length);
      break;
    }
  }

  // 嘗試隨機形容詞前綴
  for (const adj of shuffle(adjectives, rng)) {
    const newName = `${adj}${coreName}`;
    if (!usedSet.has(newName)) {
      usedSet.add(newName);
      return newName;
    }
  }

  // 回退：加上數字後綴
  const fallbackName = `${baseName} ${usedSet.size}`;
  usedSet.add(fallbackName);
  return fallbackName;
}

// ─── 多元密碼格式系統 ───

export interface PasswordFormat {
  password: string;
  hint: string;       // 顯示在密碼輸入框的提示
  formatDesc: string; // 描述鎖的密碼格式（附加到鎖描述）
}

const DIRECTION_CHARS = ['上', '下', '左', '右'];
const COLOR_CHARS = ['紅', '藍', '黃', '綠', '紫', '橙', '白', '黑'];
const ZODIAC_CHARS = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'];
const ELEMENT_CHARS = ['金', '木', '水', '火', '土'];

function pickN<T>(arr: readonly T[], n: number, rng?: SeededRandom): T[] {
  return shuffle(arr, rng).slice(0, n);
}

type PasswordGenerator = (rng?: SeededRandom) => PasswordFormat;

const PASSWORD_GENERATORS: PasswordGenerator[] = [
  // 4 位阿拉伯數字
  (rng) => ({
    password: String(Math.floor(1000 + rngNext(rng) * 9000)),
    hint: '請輸入 4 位數字',
    formatDesc: '四位數字轉盤鎖',
  }),
  // 4 個英文大寫字母
  (rng) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let pwd = '';
    for (let i = 0; i < 4; i++) pwd += chars[rngNextInt(chars.length, rng)];
    return { password: pwd, hint: '請輸入 4 個英文字母', formatDesc: '四字母旋鈕鎖' };
  },
  // 5 位數字
  (rng) => ({
    password: String(Math.floor(10000 + rngNext(rng) * 90000)),
    hint: '請輸入 5 位數字',
    formatDesc: '五位數字按鍵鎖',
  }),
  // 4 個方向
  (rng) => {
    let pwd = '';
    for (let i = 0; i < 4; i++) pwd += DIRECTION_CHARS[rngNextInt(DIRECTION_CHARS.length, rng)];
    return { password: pwd, hint: '請輸入方向組合（上下左右）', formatDesc: '方向搖桿裝置' };
  },
  // 3 個顏色
  (rng) => {
    const pwd = pickN(COLOR_CHARS, 3, rng).join('');
    return { password: pwd, hint: '請輸入 3 個顏色', formatDesc: '三色按鈕面板' };
  },
  // 英數交錯 A1B2C3
  (rng) => {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let pwd = '';
    for (let i = 0; i < 3; i++) {
      pwd += letters[rngNextInt(letters.length, rng)];
      pwd += rngNextInt(10, rng);
    }
    return { password: pwd, hint: '請輸入英數混合密碼', formatDesc: '英數混合鍵盤鎖' };
  },
  // 3 個生肖
  (rng) => {
    const pwd = pickN(ZODIAC_CHARS, 3, rng).join('');
    return { password: pwd, hint: '請輸入 3 個生肖', formatDesc: '十二生肖轉盤' };
  },
  // 3 個五行元素
  (rng) => {
    const pwd = pickN(ELEMENT_CHARS, 3, rng).join('');
    return { password: pwd, hint: '請輸入 3 個五行元素', formatDesc: '五行符文盤' };
  },
];

/**
 * 密碼格式池：確保同一謎題中每個密碼鎖使用不同格式
 */
export class PasswordFormatPool {
  private remaining: PasswordGenerator[];
  private rng?: SeededRandom;

  constructor(rng?: SeededRandom) {
    this.rng = rng;
    this.remaining = shuffle(PASSWORD_GENERATORS, rng);
  }

  next(): PasswordFormat {
    if (this.remaining.length === 0) {
      this.remaining = shuffle(PASSWORD_GENERATORS, this.rng);
    }
    return this.remaining.pop()!(this.rng);
  }
}

/**
 * 模糊名稱匹配
 */
export function fuzzyMatch(input: string, target: string): boolean {
  return target.toLowerCase().includes(input.toLowerCase());
}

let idCounter = 0;

/**
 * 生成帶前綴的唯一 ID
 */
export function generateId(prefix: string): string {
  return `${prefix}_${idCounter++}`;
}

/**
 * 重置 ID 計數器（用於新遊戲）
 */
export function resetIdCounter(): void {
  idCounter = 0;
}
