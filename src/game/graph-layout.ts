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
const ROOM_GAP = 60;

/**
 * 使用 Kahn 拓撲排序演算法計算 DAG 佈局
 * 房間分區佈局：每個房間一個水平區域，房間內依拓撲排序排列
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

    for (const reqId of lock.requiredItems) {
      if (inDegree.hasOwnProperty(reqId)) {
        edges.push({ source: reqId, target: lock.id, type: 'requires' });
        inDegree[lock.id]!++;
      }
    }

    for (const hiddenId of lock.contents) {
      if (inDegree.hasOwnProperty(hiddenId)) {
        edges.push({ source: lock.id, target: hiddenId, type: 'contains' });
        inDegree[hiddenId]!++;
      }
    }

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

  // 容器映射
  const containerMap = new Map<string, string>();
  for (const lock of allLocks) {
    for (const id of lock.contents) {
      containerMap.set(id, lock.id);
    }
  }

  // Kahn 拓撲排序 → 計算 rank
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

  // ─── 節點的房間歸屬 ───

  const nodeRoom = (id: string): string => {
    const item = puzzle.items[id];
    if (item) return item.initialRoom;
    const lock = puzzle.locks[id];
    if (lock) return lock.roomId;
    return '';
  };

  // 房間順序：起點在最左，其他按門鎖連接順序
  const roomOrder: string[] = [];
  const visited = new Set<string>();
  const roomQueue = [puzzle.startRoomId];
  visited.add(puzzle.startRoomId);
  while (roomQueue.length > 0) {
    const rid = roomQueue.shift()!;
    roomOrder.push(rid);
    for (const lock of allLocks) {
      if (lock.category === 'spatial' && lock.roomId === rid && lock.targetRoomId && !visited.has(lock.targetRoomId)) {
        visited.add(lock.targetRoomId);
        roomQueue.push(lock.targetRoomId);
      }
    }
  }
  // 補上未連通的房間
  for (const rid of Object.keys(puzzle.rooms)) {
    if (!visited.has(rid)) roomOrder.push(rid);
  }

  // ─── 房間分區佈局（兩階段）───
  // Phase 1：排自由節點（不在容器內的鎖和物品）
  // Phase 2：content 節點貼在它們的容器鎖旁邊（不參與全域 rank 排列）

  const layoutNodes: LayoutNode[] = [];
  const nodePos = new Map<string, { x: number; y: number }>();

  const containedIds = new Set(containerMap.keys());

  // 收集每個房間的自由節點（不在任何容器內）
  const roomFreeNodes: Record<string, string[]> = {};
  for (const rid of roomOrder) roomFreeNodes[rid] = [];
  for (const id of nodeIds) {
    if (containedIds.has(id)) continue;
    const rid = nodeRoom(id);
    if (roomFreeNodes[rid]) roomFreeNodes[rid]!.push(id);
  }

  const makeLayoutNode = (id: string, x: number, y: number, rid: string): LayoutNode | null => {
    const item = puzzle.items[id];
    const lock = puzzle.locks[id];
    if (!item && !lock) return null;
    return {
      id, x, y,
      entityType: item ? 'item' : 'lock',
      category: lock?.category,
      isExit: lock?.isExit,
      name: (item ?? lock)!.name,
      roomName: puzzle.rooms[rid]?.name ?? '',
      roomId: rid,
      containerId: containerMap.get(id),
    };
  };

  // Phase 1：排自由節點
  let roomStartX = 0;

  for (const rid of roomOrder) {
    const freeIds = roomFreeNodes[rid]!;
    if (freeIds.length === 0) continue;

    const rankGroups: Record<number, string[]> = {};
    for (const id of freeIds) {
      const r = ranks[id] ?? 0;
      if (!rankGroups[r]) rankGroups[r] = [];
      rankGroups[r]!.push(id);
    }

    const sortedRanks = Object.keys(rankGroups).map(Number).sort((a, b) => a - b);
    let localCol = 0;
    let roomMaxX = roomStartX;

    for (const r of sortedRanks) {
      const group = rankGroups[r]!;
      const startY = -((group.length - 1) * Y_GAP) / 2;

      group.forEach((id, index) => {
        const x = roomStartX + localCol * X_GAP;
        const y = startY + index * Y_GAP;
        nodePos.set(id, { x, y });
        const node = makeLayoutNode(id, x, y, rid);
        if (node) layoutNodes.push(node);
        if (x + NODE_W > roomMaxX) roomMaxX = x + NODE_W;
      });

      localCol++;
    }

    roomStartX = roomMaxX + ROOM_GAP;
  }

  // Phase 2：content 節點貼在容器鎖下方
  for (const lock of allLocks) {
    if (lock.category !== 'container' || lock.contents.length === 0) continue;
    const lockP = nodePos.get(lock.id);
    if (!lockP) continue;

    lock.contents.forEach((childId, i) => {
      if (!nodeIds.includes(childId)) return;
      const x = lockP.x + NODE_W + GROUP_PAD;
      const y = lockP.y + (i * Y_GAP);
      nodePos.set(childId, { x, y });
      const rid = nodeRoom(childId);
      const node = makeLayoutNode(childId, x, y, rid);
      if (node) layoutNodes.push(node);
    });
  }

  // ─── 計算邊界和群組 ───

  let maxX = 0;
  let maxY = 0;
  for (const n of layoutNodes) {
    if (n.x + NODE_W > maxX) maxX = n.x + NODE_W;
    if (Math.abs(n.y) + NODE_H > maxY) maxY = Math.abs(n.y) + NODE_H;
  }

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
  for (const rid of roomOrder) {
    const room = puzzle.rooms[rid];
    if (!room) continue;
    const rNodes = layoutNodes.filter(n => n.roomId === rid);
    if (rNodes.length === 0) continue;
    const box = boundingBox(rNodes, GROUP_PAD);
    roomGroups.push({ roomId: rid, roomName: room.name, ...box });
  }

  // 容器 group 只框內容物（不含鎖本身），避免跨 rank 的大框覆蓋不相關節點
  const containerGroups: ContainerGroup[] = [];
  for (const lock of allLocks) {
    if (lock.category !== 'container' || lock.contents.length === 0) continue;
    const childNodes = layoutNodes.filter(n => containerMap.get(n.id) === lock.id);
    if (childNodes.length === 0) continue;
    const box = boundingBox(childNodes, GROUP_PAD / 2);
    containerGroups.push({ lockId: lock.id, lockName: lock.name, roomId: lock.roomId, ...box });
  }

  return { nodes: layoutNodes, edges, bounds: { maxX, maxY }, roomGroups, containerGroups };
}
