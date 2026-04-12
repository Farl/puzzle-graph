import type { PuzzleDefinition, LockCategory } from './types';

// ─── 佈局輸出類型 ───

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  entityType: 'item' | 'lock';
  category?: LockCategory;
  isExit?: boolean;
  name: string;
  roomName: string;
  roomId: string;
  containerId?: string;
}

export interface LayoutEdge {
  source: string;
  target: string;
  type: 'requires' | 'contains';
}

export interface RoomGroup {
  roomId: string;
  roomName: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ContainerGroup {
  lockId: string;
  lockName: string;
  roomId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GraphLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  bounds: { maxX: number; maxY: number };
  roomGroups: RoomGroup[];
  containerGroups: ContainerGroup[];
}

// ─── 佈局參數 ───

const X_GAP = 280;
const Y_GAP = 90;
const NODE_W = 160;
const NODE_H = 60;
const GROUP_PAD = 20;

/**
 * 使用 Kahn 拓撲排序演算法計算 DAG 佈局
 * 輸入 PuzzleDefinition → 輸出節點座標 + 邊
 */
export function buildGraphLayout(puzzle: PuzzleDefinition): GraphLayout {
  const edges: LayoutEdge[] = [];
  const inDegree: Record<string, number> = {};
  const nodeIds: string[] = [];

  for (const item of Object.values(puzzle.items)) {
    nodeIds.push(item.id);
    inDegree[item.id] = 0;
  }

  const allLocks = Object.values(puzzle.locks);

  for (const lock of allLocks) {
    if (lock.requiredItems.length > 0) {
      nodeIds.push(lock.id);
      inDegree[lock.id] = 0;
    }
  }

  // 單次遍歷建立所有邊
  for (const lock of allLocks) {
    if (!inDegree.hasOwnProperty(lock.id)) continue;

    // item → lock（物品被鎖需要）
    for (const reqId of lock.requiredItems) {
      if (inDegree.hasOwnProperty(reqId)) {
        edges.push({ source: reqId, target: lock.id, type: 'requires' });
        inDegree[lock.id]!++;
      }
    }

    // lock → contents（容器鎖隱藏的物品或子鎖）
    for (const hiddenId of lock.contents) {
      if (inDegree.hasOwnProperty(hiddenId)) {
        edges.push({ source: lock.id, target: hiddenId, type: 'contains' });
        inDegree[hiddenId]!++;
      }
    }

    // spatial lock → 目標房間的鎖和地板物品（門連通房間後可存取的一切）
    if (lock.category === 'spatial' && lock.targetRoomId) {
      const targetRoom = puzzle.rooms[lock.targetRoomId];
      if (targetRoom) {
        for (const lockId of targetRoom.lockIds) {
          if (inDegree.hasOwnProperty(lockId) && lockId !== lock.id) {
            edges.push({ source: lock.id, target: lockId, type: 'contains' });
            inDegree[lockId]!++;
          }
        }
        for (const itemId of targetRoom.visibleItems) {
          if (inDegree.hasOwnProperty(itemId)) {
            edges.push({ source: lock.id, target: itemId, type: 'contains' });
            inDegree[itemId]!++;
          }
        }
      }
    }
  }

  // 建立容器映射（哪些實體在哪個容器鎖內）
  const containerMap = new Map<string, string>();
  for (const lock of allLocks) {
    for (const id of lock.contents) {
      containerMap.set(id, lock.id);
    }
  }

  // 建立鄰接表（O(V+E) Kahn 拓撲排序用）
  const adj: Record<string, LayoutEdge[]> = {};
  for (const id of nodeIds) adj[id] = [];
  for (const edge of edges) {
    adj[edge.source]?.push(edge);
  }

  const ranks: Record<string, number> = {};
  for (const id of nodeIds) ranks[id] = 0;

  const queue = nodeIds.filter(id => inDegree[id] === 0);

  while (queue.length > 0) {
    const u = queue.shift()!;
    for (const edge of adj[u]!) {
      const v = edge.target;
      ranks[v] = Math.max(ranks[v]!, (ranks[u] ?? 0) + 1);
      inDegree[v]!--;
      if (inDegree[v] === 0) queue.push(v);
    }
  }

  // 按 rank 分組
  const rankGroups: Record<number, string[]> = {};
  for (const id of nodeIds) {
    const r = Math.floor(ranks[id]!);
    if (!rankGroups[r]) rankGroups[r] = [];
    rankGroups[r]!.push(id);
  }

  // 計算座標
  const layoutNodes: LayoutNode[] = [];
  let maxX = 0;
  let maxY = 0;

  for (const [rStr, group] of Object.entries(rankGroups)) {
    const r = parseInt(rStr);
    const startY = -((group.length - 1) * Y_GAP) / 2;

    group.forEach((id, index) => {
      const x = r * X_GAP;
      const y = startY + index * Y_GAP;

      const item = puzzle.items[id];
      const lock = puzzle.locks[id];

      let entityType: 'item' | 'lock';
      let name: string;
      let roomName: string;
      let roomId: string;
      let category: LockCategory | undefined;
      let isExit: boolean | undefined;

      if (item) {
        entityType = 'item';
        name = item.name;
        roomId = item.initialRoom;
        roomName = puzzle.rooms[roomId]?.name ?? '';
      } else if (lock) {
        entityType = 'lock';
        name = lock.name;
        category = lock.category;
        isExit = lock.isExit;
        roomId = lock.roomId;
        roomName = puzzle.rooms[roomId]?.name ?? '';
      } else {
        return;
      }

      const containerId = containerMap.get(id);
      layoutNodes.push({ id, x, y, entityType, category, isExit, name, roomName, roomId, containerId });

      if (x > maxX) maxX = x;
      if (Math.abs(y) > maxY) maxY = Math.abs(y);
    });
  }

  // 計算群組邊界框的共用邏輯
  const boundingBox = (nodes: LayoutNode[], pad: number) => {
    const x = Math.min(...nodes.map(n => n.x)) - pad;
    const y = Math.min(...nodes.map(n => n.y)) - pad;
    return {
      x, y,
      width: Math.max(...nodes.map(n => n.x + NODE_W)) + pad - x,
      height: Math.max(...nodes.map(n => n.y + NODE_H)) + pad - y,
    };
  };

  const roomGroups: RoomGroup[] = [];
  for (const [roomId, room] of Object.entries(puzzle.rooms)) {
    const roomNodes = layoutNodes.filter(n => n.roomId === roomId);
    if (roomNodes.length === 0) continue;
    const box = boundingBox(roomNodes, GROUP_PAD);
    roomGroups.push({ roomId, roomName: room.name, ...box });
  }

  const containerGroups: ContainerGroup[] = [];
  for (const lock of allLocks) {
    if (lock.category !== 'container' || lock.contents.length === 0) continue;
    const childNodes = layoutNodes.filter(n => containerMap.get(n.id) === lock.id);
    const lockNode = layoutNodes.find(n => n.id === lock.id);
    const allGroupNodes = lockNode ? [lockNode, ...childNodes] : childNodes;
    if (allGroupNodes.length === 0) continue;
    const box = boundingBox(allGroupNodes, GROUP_PAD / 2);
    containerGroups.push({ lockId: lock.id, lockName: lock.name, roomId: lock.roomId, ...box });
  }

  return { nodes: layoutNodes, edges, bounds: { maxX, maxY }, roomGroups, containerGroups };
}
