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
const X_GAP = 200;
const Y_GAP = 100;
const GROUP_PAD = 24;

/**
 * DAG 佈局：Kahn 拓撲排序 → rank 決定 Y（深度向下），同 rank 水平展開
 * 容器 contents 不參與全域 rank，而是貼在鎖的右側
 */
export function buildGraphLayout(puzzle: PuzzleDefinition): GraphLayout {
  // ─── 建立 DAG 邊 ───

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
    for (const id of lock.contents) {
      containerMap.set(id, lock.id);
    }
  }
  const containedIds = new Set(containerMap.keys());

  // ─── Kahn 拓撲排序（只對自由節點計算 rank）───

  const adj: Record<string, LayoutEdge[]> = {};
  for (const id of allNodeIds) adj[id] = [];
  for (const edge of edges) {
    adj[edge.source]?.push(edge);
  }

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

  // ─── 將自由節點按 rank 分層 ───

  const rankLayers: Record<number, string[]> = {};
  for (const id of allNodeIds) {
    if (containedIds.has(id)) continue; // content 不參與全域排列
    const r = ranks[id] ?? 0;
    if (!rankLayers[r]) rankLayers[r] = [];
    rankLayers[r]!.push(id);
  }

  // ─── 節點資訊 helper ───

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

  // ─── 計算每個容器鎖的有效 content 數量 ───

  const lockValidContents = new Map<string, string[]>();
  for (const lock of allLocks) {
    const valid = lock.contents.filter(id => allNodeIds.has(id));
    if (valid.length > 0) lockValidContents.set(lock.id, valid);
  }

  // ─── 佈局：Y = rank 層（向下），X = 層內展開 ───

  const layoutNodes: LayoutNode[] = [];
  const sortedRanks = Object.keys(rankLayers).map(Number).sort((a, b) => a - b);

  let currentY = 0;

  for (const r of sortedRanks) {
    const layer = rankLayers[r]!;

    let currentX = 0;
    let layerMaxContentH = 0;

    for (const id of layer) {
      // 放置自由節點
      const node = makeNode(id, currentX, currentY);
      if (node) layoutNodes.push(node);

      // 放置容器 contents 在鎖的右側
      const contents = lockValidContents.get(id);
      let blockWidth = NODE_W;
      if (contents && contents.length > 0) {
        contents.forEach((childId, ci) => {
          const cx = currentX + NODE_W + GROUP_PAD;
          const cy = currentY + ci * (NODE_H + 10);
          const childNode = makeNode(childId, cx, cy);
          if (childNode) layoutNodes.push(childNode);
        });
        blockWidth = NODE_W + GROUP_PAD + NODE_W;
        const contentH = contents.length * (NODE_H + 10) - 10;
        if (contentH > layerMaxContentH) layerMaxContentH = contentH;
      }

      currentX += blockWidth + X_GAP;
    }

    // 下一層 Y：考慮 content 佔的高度
    const layerH = Math.max(NODE_H, layerMaxContentH);
    currentY += layerH + Y_GAP;
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

  const roomGroups: RoomGroup[] = [];
  for (const [roomId, room] of Object.entries(puzzle.rooms)) {
    const rNodes = layoutNodes.filter(n => n.roomId === roomId);
    if (rNodes.length === 0) continue;
    const box = boundingBox(rNodes, GROUP_PAD);
    roomGroups.push({ roomId, roomName: room.name, ...box });
  }

  const containerGroups: ContainerGroup[] = [];
  for (const lock of allLocks) {
    const contents = lockValidContents.get(lock.id);
    if (!contents) continue;
    const childNodes = layoutNodes.filter(n => containerMap.get(n.id) === lock.id);
    const lockNode = layoutNodes.find(n => n.id === lock.id);
    const groupNodes = lockNode ? [lockNode, ...childNodes] : childNodes;
    if (groupNodes.length === 0) continue;
    const box = boundingBox(groupNodes, GROUP_PAD / 2);
    containerGroups.push({ lockId: lock.id, lockName: lock.name, roomId: lock.roomId, ...box });
  }

  return { nodes: layoutNodes, edges, bounds: { maxX, maxY }, roomGroups, containerGroups };
}
