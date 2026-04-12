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
const X_GAP = 40;
const Y_GAP = 80;
const GROUP_PAD = 20;
const ROOM_X_GAP = 80;

/**
 * 房間分欄佈局：X = 房間欄位，Y = 全域拓撲 rank（深度向下）
 * 每個房間有獨立的 X 區域，房間之間不重疊
 * 跨房間的依賴以對角線邊表達
 */
export function buildGraphLayout(puzzle: PuzzleDefinition): GraphLayout {
  // ─── 建立 DAG ───

  const edges: LayoutEdge[] = [];
  const inDegree: Record<string, number> = {};
  const allNodeIds = new Set<string>();

  for (const item of Object.values(puzzle.items)) {
    allNodeIds.add(item.id);
    inDegree[item.id] = 0;
  }

  const allLocks = Object.values(puzzle.locks);
  for (const lock of allLocks) {
    if (lock.requiredItems.length > 0) {
      allNodeIds.add(lock.id);
      inDegree[lock.id] = 0;
    }
  }

  for (const lock of allLocks) {
    if (!allNodeIds.has(lock.id)) continue;

    for (const reqId of lock.requiredItems) {
      if (allNodeIds.has(reqId)) {
        edges.push({ source: reqId, target: lock.id, type: 'requires' });
        inDegree[lock.id] = (inDegree[lock.id] ?? 0) + 1;
      }
    }

    for (const hiddenId of lock.contents) {
      if (allNodeIds.has(hiddenId)) {
        edges.push({ source: lock.id, target: hiddenId, type: 'contains' });
        inDegree[hiddenId] = (inDegree[hiddenId] ?? 0) + 1;
      }
    }

    if (lock.category === 'spatial' && lock.targetRoomId) {
      const targetRoom = puzzle.rooms[lock.targetRoomId];
      if (targetRoom) {
        for (const id of [...targetRoom.lockIds, ...targetRoom.visibleItems]) {
          if (allNodeIds.has(id) && id !== lock.id) {
            edges.push({ source: lock.id, target: id, type: 'contains' });
            inDegree[id] = (inDegree[id] ?? 0) + 1;
          }
        }
      }
    }
  }

  // ─── 容器映射 ───

  const containerMap = new Map<string, string>();
  for (const lock of allLocks) {
    for (const id of lock.contents) containerMap.set(id, lock.id);
  }

  // ─── Kahn 拓撲排序 ───

  const adj: Record<string, LayoutEdge[]> = {};
  for (const id of allNodeIds) adj[id] = [];
  for (const edge of edges) adj[edge.source]?.push(edge);

  const ranks: Record<string, number> = {};
  for (const id of allNodeIds) ranks[id] = 0;

  const inDegreeCopy = { ...inDegree };
  const queue = [...allNodeIds].filter(id => inDegreeCopy[id] === 0);
  while (queue.length > 0) {
    const u = queue.shift()!;
    for (const edge of adj[u]!) {
      const v = edge.target;
      ranks[v] = Math.max(ranks[v]!, (ranks[u] ?? 0) + 1);
      inDegreeCopy[v]!--;
      if (inDegreeCopy[v] === 0) queue.push(v);
    }
  }

  // ─── 節點資訊 ───

  const nodeRoom = (id: string): string =>
    puzzle.items[id]?.initialRoom ?? puzzle.locks[id]?.roomId ?? '';

  const makeNode = (id: string, x: number, y: number): LayoutNode | null => {
    const item = puzzle.items[id];
    const lock = puzzle.locks[id];
    if (!item && !lock) return null;
    const rid = nodeRoom(id);
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

  // ─── 房間順序（BFS from startRoom）───

  const roomOrder: string[] = [];
  const visitedRooms = new Set<string>();
  const roomQueue = [puzzle.startRoomId];
  visitedRooms.add(puzzle.startRoomId);
  while (roomQueue.length > 0) {
    const rid = roomQueue.shift()!;
    roomOrder.push(rid);
    for (const lock of allLocks) {
      if (lock.category === 'spatial' && lock.roomId === rid && lock.targetRoomId && !visitedRooms.has(lock.targetRoomId)) {
        visitedRooms.add(lock.targetRoomId);
        roomQueue.push(lock.targetRoomId);
      }
    }
  }
  for (const rid of Object.keys(puzzle.rooms)) {
    if (!visitedRooms.has(rid)) roomOrder.push(rid);
  }

  // ─── 房間分欄佈局 ───

  const layoutNodes: LayoutNode[] = [];
  const nodePos = new Map<string, { x: number; y: number }>();

  // 收集每個房間的節點
  const roomNodeIds: Record<string, string[]> = {};
  for (const rid of roomOrder) roomNodeIds[rid] = [];
  for (const id of allNodeIds) {
    const rid = nodeRoom(id);
    if (roomNodeIds[rid]) roomNodeIds[rid]!.push(id);
  }

  // 計算每個房間的欄位寬度和 X 起始位置
  let roomStartX = 0;
  const roomXStart = new Map<string, number>();

  for (const rid of roomOrder) {
    const ids = roomNodeIds[rid]!;
    roomXStart.set(rid, roomStartX);
    if (ids.length === 0) continue;

    // 同 rank 最多幾個節點 = 決定房間欄寬
    const byRank = new Map<number, number>();
    for (const id of ids) {
      const r = ranks[id] ?? 0;
      byRank.set(r, (byRank.get(r) ?? 0) + 1);
    }
    const maxInRank = Math.max(...byRank.values(), 1);
    const roomWidth = maxInRank * (NODE_W + X_GAP) - X_GAP;
    roomStartX += roomWidth + ROOM_X_GAP;
  }

  // 放置節點
  for (const rid of roomOrder) {
    const ids = roomNodeIds[rid]!;
    if (ids.length === 0) continue;
    const startX = roomXStart.get(rid) ?? 0;

    // 按 rank 分層
    const byRank = new Map<number, string[]>();
    for (const id of ids) {
      const r = ranks[id] ?? 0;
      if (!byRank.has(r)) byRank.set(r, []);
      byRank.get(r)!.push(id);
    }

    for (const [r, group] of byRank) {
      const y = r * (NODE_H + Y_GAP);
      group.forEach((id, i) => {
        const x = startX + i * (NODE_W + X_GAP);
        nodePos.set(id, { x, y });
      });
    }
  }

  // ─── 生成 LayoutNode ───

  for (const [id, pos] of nodePos) {
    const node = makeNode(id, pos.x, pos.y);
    if (node) layoutNodes.push(node);
  }

  // ─── 邊界和群組 ───

  let maxX = 0;
  let maxY = 0;
  for (const n of layoutNodes) {
    if (n.x + NODE_W > maxX) maxX = n.x + NODE_W;
    if (n.y + NODE_H > maxY) maxY = n.y + NODE_H;
  }

  const boundingBox = (nodes: LayoutNode[], pad: number) => {
    if (nodes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    const x = Math.min(...nodes.map(n => n.x)) - pad;
    const y = Math.min(...nodes.map(n => n.y)) - pad;
    return {
      x, y,
      width: Math.max(...nodes.map(n => n.x + NODE_W)) + pad - x,
      height: Math.max(...nodes.map(n => n.y + NODE_H)) + pad - y,
    };
  };

  // 房間群
  const roomGroups: RoomGroup[] = [];
  for (const rid of roomOrder) {
    const room = puzzle.rooms[rid];
    if (!room) continue;
    const rNodes = layoutNodes.filter(n => n.roomId === rid);
    if (rNodes.length === 0) continue;
    const box = boundingBox(rNodes, GROUP_PAD);
    roomGroups.push({ roomId: rid, roomName: room.name, ...box });
  }

  // 容器群（只畫相鄰 rank 的）
  const rankStep = NODE_H + Y_GAP;
  const containerGroups: ContainerGroup[] = [];
  for (const lock of allLocks) {
    if (lock.category !== 'container' || lock.contents.length === 0) continue;
    const lockNode = layoutNodes.find(n => n.id === lock.id);
    if (!lockNode) continue;
    const childNodes = layoutNodes.filter(n => containerMap.get(n.id) === lock.id);
    if (childNodes.length === 0) continue;
    const maxChildY = Math.max(...childNodes.map(n => n.y));
    if (maxChildY - lockNode.y > rankStep * 1.5) continue;
    const groupNodes = [lockNode, ...childNodes];
    const box = boundingBox(groupNodes, GROUP_PAD / 2);
    containerGroups.push({ lockId: lock.id, lockName: lock.name, roomId: lock.roomId, ...box });
  }

  return { nodes: layoutNodes, edges, bounds: { maxX, maxY }, roomGroups, containerGroups };
}
