export type ItemType = 'key' | 'clue' | 'tool';
export type LockType = 'physical' | 'password' | 'hidden' | 'combination' | 'door';

export interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
}

export interface Lock {
  id: string;
  name: string;
  description: string;
  lockedDescription: string;
  unlockedDescription: string;
  type: LockType;
  requiredItems: string[];
  password?: string;
  isLocked: boolean;
  containsItems: string[];
  isExit?: boolean;
  insertedItems?: string[];
  targetRoomId?: string;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  locks: string[];
  visibleItems: string[];
}

export interface GameState {
  rooms: Record<string, Room>;
  currentRoomId: string;
  locks: Record<string, Lock>;
  items: Record<string, Item>;
  inventory: string[];
  history: { id: string, type: 'system' | 'user' | 'error' | 'success', text: string }[];
  isGameOver: boolean;
}

export interface LockTemplate {
  type: LockType;
  lockName: string;
  lockDesc: string;
  unlockDesc: string;
  keyNames?: string[];
  clueName?: string;
}
