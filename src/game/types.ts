// ─── ID 類型別名 ───

export type RoomId = string;
export type ItemId = string;
export type LockId = string;

// ─── 物品類型 ───

export type ItemType = 'key' | 'clue' | 'tool';

export interface Item {
  id: ItemId;
  name: string;
  description: string;
  type: ItemType;
  reusable: boolean;
  initialRoom: RoomId;
  volume: number;
  pickupable: boolean;
}

// ─── 鎖類型 ───

export interface MinigameConfig {
  type: string;
  seed: number;
  params: Record<string, unknown>;
}

/** 容器鎖 = 保護物品的機關；空間鎖 = 連接房間的通道 */
export type LockCategory = 'container' | 'spatial';

/** 鎖的解鎖機制 */
export type LockMechanism = 'physical' | 'password' | 'hidden' | 'combination' | 'minigame';

export interface Lock {
  id: LockId;
  name: string;
  description: string;
  lockedDescription: string;
  unlockDescription: string;
  partialDescription?: string;
  category: LockCategory;
  mechanism: LockMechanism;
  roomId: RoomId;
  targetRoomId?: RoomId;
  requiredItems: ItemId[];
  insertedItems: ItemId[];
  contents: string[];
  capacity: number;
  volume: number;
  password?: string;
  passwordHint?: string;
  minigameConfig?: MinigameConfig;
  pickupable: boolean;
  stateTags?: string[];
  isLocked: boolean;
  isExit: boolean;
}

// ─── 房間 ───

export interface Room {
  id: RoomId;
  name: string;
  description: string;
  lockIds: LockId[];
  visibleItems: ItemId[];
  capacity: number;
}

// ─── 謎題定義（生成器輸出，不可變） ───

export interface PuzzleDefinition {
  rooms: Record<RoomId, Room>;
  items: Record<ItemId, Item>;
  locks: Record<LockId, Lock>;
  startRoomId: RoomId;
  exitLockId: LockId;
  seed: number;               // 生成此關卡的亂數種子（可用於重現）
}

// ─── 遊戲狀態（執行時可變） ───

export type LogType = 'system' | 'user' | 'error' | 'success' | 'info' | 'room';

export interface HistoryEntry {
  id: string;
  type: LogType;
  text: string;
}

export interface GameState {
  puzzle: PuzzleDefinition;
  currentRoomId: RoomId;
  inventory: ItemId[];
  history: HistoryEntry[];
  isGameOver: boolean;
}

// ─── 生成器配置 ───

export interface GeneratorConfig {
  targetDepth: number;
  maxRooms: number;
  depthStaggerVariance: number;

  seed?: number;
  keySpreadRate?: number;
  crossRoomRate?: number;
  maxLocks?: number;
  reuseRate?: number;
  maxReusesPerTool?: number;
  maxNestingDepth?: number;
  consolidationRate?: number;
  stateLockRate?: number;

  compositeRate?: number;
  /** @deprecated 不再使用 */
  tagDiversityMode?: string;
  /** @deprecated 不再使用 */
  tagWeights?: Record<string, number>;
}

// ─── 變體與主題 ───

export interface FamilyVariation {
  name: string;
  lockMsg: string;
  unlockMsg: string;
  partialMsg?: string;
}

export interface RoomTheme {
  name: string;
  description: string;
  capacity: number;
}

// ─── 模板系統（階段 1）───

export interface KeyTemplate {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  reusable: boolean;
  volume: number;
  pickupable?: boolean;
  stateTags?: string[];          // 狀態鎖配對用（如 ['light-tool']）
}

export interface LockTemplate {
  id: string;
  name: string;
  lockedDescription: string;
  unlockDescription: string;
  partialDescription?: string;
  category: LockCategory;
  mechanism: LockMechanism;
  capacity: number;
  volume: number;
  tags: string[];
  requiredKeys: string[];       // references KeyTemplate.id
  variations: FamilyVariation[];
  minigameType?: string;
  pickupable?: boolean;           // true = 玩家可拾取進背包（轉換鎖、合成鎖）
  stateTags?: string[];           // 狀態鎖配對用，匹配 KeyTemplate.stateTags
}
