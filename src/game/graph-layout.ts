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
}

export interface LayoutEdge {
  source: string;
  target: string;
  type: 'requires' | 'contains';
}

export interface GraphLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  bounds: { maxX: number; maxY: number };
}

// ─── 佈局參數 ───

const X_GAP = 280;
const Y_GAP = 90;

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

    // lock → item（容器鎖隱藏物品）
    for (const hiddenId of lock.containsItems) {
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
      let category: LockCategory | undefined;
      let isExit: boolean | undefined;

      if (item) {
        entityType = 'item';
        name = item.name;
        roomName = puzzle.rooms[item.initialRoom]?.name ?? '';
      } else if (lock) {
        entityType = 'lock';
        name = lock.name;
        category = lock.category;
        isExit = lock.isExit;
        roomName = puzzle.rooms[lock.roomId]?.name ?? '';
      } else {
        return;
      }

      layoutNodes.push({ id, x, y, entityType, category, isExit, name, roomName });

      if (x > maxX) maxX = x;
      if (Math.abs(y) > maxY) maxY = Math.abs(y);
    });
  }

  return { nodes: layoutNodes, edges, bounds: { maxX, maxY } };
}
