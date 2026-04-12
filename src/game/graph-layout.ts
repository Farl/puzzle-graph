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

const NODE_W = 160;
const NODE_H = 60;
const X_GAP = 200;      // 同 rank 內節點水平間距
const Y_GAP = 100;      // rank 之間垂直間距
const CONTENT_X_OFFSET = NODE_W + 20;  // content 在鎖右側
const GROUP_PAD = 20;
const ROOM_X_GAP = 80;  // 房間之間水平間距

/**
 * DAG 佈局：房間水平排列，每房間內依 rank 垂直排列（深度向下）
 * content 節點貼在鎖的右側作為區塊
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

  // Kahn 拓撲排序 → rank
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

  // ─── 節點房間歸屬 ───

  const nodeRoom = (id: string): string => {
    return puzzle.items[id]?.initialRoom ?? puzzle.locks[id]?.roomId ?? '';
  };

  // 房間順序：BFS from startRoom
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
  for (const rid of Object.keys(puzzle.rooms)) {
    if (!visited.has(rid)) roomOrder.push(rid);
  }

  // ─── 佈局：X=房間，Y=rank（深度向下）───

  const layoutNodes: LayoutNode[] = [];
  const containedIds = new Set(containerMap.keys());

  // 每個容器鎖的 content 數量
  const lockContentCount = new Map<string, number>();
  for (const lock of allLocks) {
    const validContents = lock.contents.filter(id => nodeIds.includes(id));
    if (validContents.length > 0) lockContentCount.set(lock.id, validContents.length);
  }

  // 收集自由節點
  const roomFreeNodes: Record<string, string[]> = {};
  for (const rid of roomOrder) roomFreeNodes[rid] = [];
  for (const id of nodeIds) {
    if (containedIds.has(id)) continue;
    const rid = nodeRoom(id);
    if (roomFreeNodes[rid]) roomFreeNodes[rid]!.push(id);
  }

  const makeNode = (id: string, x: number, y: number, rid: string): LayoutNode | null => {
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

  let roomStartX = 0;

  for (const rid of roomOrder) {
    const freeIds = roomFreeNodes[rid]!;
    if (freeIds.length === 0) continue;

    // 按 rank 分組（Y 方向，深度向下）
    const rankGroups: Record<number, string[]> = {};
    for (const id of freeIds) {
      const r = ranks[id] ?? 0;
      if (!rankGroups[r]) rankGroups[r] = [];
      rankGroups[r]!.push(id);
    }

    const sortedRanks = Object.keys(rankGroups).map(Number).sort((a, b) => a - b);
    let currentY = 0;
    let roomMaxX = roomStartX;

    for (const r of sortedRanks) {
      const group = rankGroups[r]!;

      // 同 rank 節點水平排列
      group.forEach((id, index) => {
        const x = roomStartX + index * X_GAP;
        const y = currentY;

        const node = makeNode(id, x, y, rid);
        if (node) layoutNodes.push(node);

        // content 節點在鎖的右側
        const contentCount = lockContentCount.get(id);
        if (contentCount) {
          const lock = puzzle.locks[id]!;
          let ci = 0;
          for (const childId of lock.contents) {
            if (!nodeIds.includes(childId)) continue;
            const cx = x + CONTENT_X_OFFSET;
            const cy = y + ci * (NODE_H + 10);
            const childNode = makeNode(childId, cx, cy, nodeRoom(childId));
            if (childNode) layoutNodes.push(childNode);
            if (cx + NODE_W > roomMaxX) roomMaxX = cx + NODE_W;
            ci++;
          }
        }

        if (x + NODE_W > roomMaxX) roomMaxX = x + NODE_W;
      });

      // 下一個 rank 的 Y：考慮容器鎖佔的額外高度
      const maxContentHeight = group.reduce((max, id) => {
        const cc = lockContentCount.get(id) ?? 0;
        return Math.max(max, cc > 0 ? cc * (NODE_H + 10) : NODE_H);
      }, NODE_H);
      currentY += maxContentHeight + Y_GAP - NODE_H;
    }

    roomStartX = roomMaxX + ROOM_X_GAP;
  }

  // ─── 邊界和群組 ───

  let maxX = 0;
  let maxY = 0;
  for (const n of layoutNodes) {
    if (n.x + NODE_W > maxX) maxX = n.x + NODE_W;
    if (n.y + NODE_H > maxY) maxY = n.y + NODE_H;
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
