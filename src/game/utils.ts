/**
 * Fisher-Yates 洗牌演算法（不修改原陣列）
 */
export function shuffle<T>(array: readonly T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
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
  for (const adj of shuffle(adjectives)) {
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

function pickN<T>(arr: readonly T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

type PasswordGenerator = () => PasswordFormat;

const PASSWORD_GENERATORS: PasswordGenerator[] = [
  // 4 位阿拉伯數字
  () => ({
    password: String(Math.floor(1000 + Math.random() * 9000)),
    hint: '請輸入 4 位數字',
    formatDesc: '四位數字轉盤鎖',
  }),
  // 4 個英文大寫字母
  () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let pwd = '';
    for (let i = 0; i < 4; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    return { password: pwd, hint: '請輸入 4 個英文字母', formatDesc: '四字母旋鈕鎖' };
  },
  // 5 位數字
  () => ({
    password: String(Math.floor(10000 + Math.random() * 90000)),
    hint: '請輸入 5 位數字',
    formatDesc: '五位數字按鍵鎖',
  }),
  // 4 個方向
  () => {
    let pwd = '';
    for (let i = 0; i < 4; i++) pwd += DIRECTION_CHARS[Math.floor(Math.random() * DIRECTION_CHARS.length)];
    return { password: pwd, hint: '請輸入方向組合（上下左右）', formatDesc: '方向搖桿裝置' };
  },
  // 3 個顏色
  () => {
    const pwd = pickN(COLOR_CHARS, 3).join('');
    return { password: pwd, hint: '請輸入 3 個顏色', formatDesc: '三色按鈕面板' };
  },
  // 英數交錯 A1B2C3
  () => {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let pwd = '';
    for (let i = 0; i < 3; i++) {
      pwd += letters[Math.floor(Math.random() * letters.length)];
      pwd += Math.floor(Math.random() * 10);
    }
    return { password: pwd, hint: '請輸入英數混合密碼', formatDesc: '英數混合鍵盤鎖' };
  },
  // 3 個生肖
  () => {
    const pwd = pickN(ZODIAC_CHARS, 3).join('');
    return { password: pwd, hint: '請輸入 3 個生肖', formatDesc: '十二生肖轉盤' };
  },
  // 3 個五行元素
  () => {
    const pwd = pickN(ELEMENT_CHARS, 3).join('');
    return { password: pwd, hint: '請輸入 3 個五行元素', formatDesc: '五行符文盤' };
  },
];

/**
 * 密碼格式池：確保同一謎題中每個密碼鎖使用不同格式
 */
export class PasswordFormatPool {
  private remaining: PasswordGenerator[];

  constructor() {
    this.remaining = shuffle(PASSWORD_GENERATORS);
  }

  next(): PasswordFormat {
    if (this.remaining.length === 0) {
      this.remaining = shuffle(PASSWORD_GENERATORS);
    }
    return this.remaining.pop()!();
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
