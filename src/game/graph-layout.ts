import type { PuzzleDefinition, LockCategory } from './types';
import { bfsRoomOrder } from './utils';

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

export interface SpatialEdge {
  lockId: string;
  targetRoomId: string;
}

export interface GraphLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  spatialEdges: SpatialEdge[];
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

// ─── 工具函式 ───

type Box = { x: number; y: number; width: number; height: number };

function computeBox(positions: { x: number; y: number }[], pad: number): Box | null {
  if (positions.length === 0) return null;
  const x = Math.min(...positions.map(p => p.x)) - pad;
  const y = Math.min(...positions.map(p => p.y)) - pad;
  return {
    x, y,
    width: Math.max(...positions.map(p => p.x + NODE_W)) + pad - x,
    height: Math.max(...positions.map(p => p.y + NODE_H)) + pad - y,
  };
}


/**
 * DAG 視覺化佈局
 *
 * 邊：requires（key→lock）+ contains（容器鎖→內容物）+ gate（空間鎖→目標房間所有實體）
 * 可解的 puzzle 不會有循環（如果有循環 = puzzle 無解 = 生成器 bug）
 * Y = Kahn 拓撲排序 rank（深度向下）
 * X = 同 rank 水平展開，房間分離保證不交疊
 */
export function buildGraphLayout(puzzle: PuzzleDefinition): GraphLayout {
  // ═══ 1. 建立 DAG（requires + contains + spatial gate）═══

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

    if (lock.category === 'container') {
      for (const hiddenId of lock.contents) {
        if (allNodeIds.has(hiddenId)) {
          edges.push({ source: lock.id, target: hiddenId, type: 'contains' });
          inDegree[hiddenId] = (inDegree[hiddenId] ?? 0) + 1;
        }
      }
    }

    // gate 邊：空間鎖 → 目標房間所有實體（可解 puzzle 不會有循環）
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

  // ═══ 2. Kahn 拓撲排序 → rank ═══

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

  // ═══ 3. 節點資訊 ═══

  const nodeRoom = (id: string): string =>
    puzzle.items[id]?.initialRoom ?? puzzle.locks[id]?.roomId ?? '';

  // 容器映射（哪些實體在哪個容器鎖內）
  const containerMap = new Map<string, string>();
  for (const lock of allLocks) {
    if (lock.category === 'container') {
      for (const id of lock.contents) containerMap.set(id, lock.id);
    }
  }

  // ═══ 4. 初始佈局：房間分欄保證不交疊 ═══

  const rankLayers: Record<number, string[]> = {};
  for (const id of allNodeIds) {
    const r = ranks[id] ?? 0;
    if (!rankLayers[r]) rankLayers[r] = [];
    rankLayers[r]!.push(id);
  }

  const roomOrder = bfsRoomOrder(puzzle.startRoomId, Object.keys(puzzle.rooms), puzzle.locks);
  const roomOrderIndex = new Map(roomOrder.map((rid, i) => [rid, i]));

  // 房間群：同 roomId 的節點
  const roomMembers = new Map<string, Set<string>>();
  for (const id of allNodeIds) {
    const rid = nodeRoom(id);
    if (!roomMembers.has(rid)) roomMembers.set(rid, new Set());
    roomMembers.get(rid)!.add(id);
  }

  const sortedRanks = Object.keys(rankLayers).map(Number).sort((a, b) => a - b);

  // ═══ 5. 容器群組定義（排序需要用到，所以先建） ═══

  const containerMembers = new Map<string, Set<string>>();
  for (const lock of allLocks) {
    if (lock.category !== 'container' || lock.contents.length === 0) continue;
    if (!allNodeIds.has(lock.id)) continue;
    const members = new Set<string>();
    const stack = [lock.id];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      if (!allNodeIds.has(cur)) continue;
      members.add(cur);
      const curLock = puzzle.locks[cur];
      if (curLock && curLock.category === 'container') {
        for (const childId of curLock.contents) {
          if (!members.has(childId)) stack.push(childId);
        }
      }
    }
    if (members.size > 1) containerMembers.set(lock.id, members);
  }

  // 節點 → 最外層容器 ID（用於排序分群）
  const nodeOuterContainer = new Map<string, string>();
  // 按容器大小降序處理，大的後寫 → 覆蓋小的 → 最外層贏
  const sortedContainers = [...containerMembers.entries()].sort((a, b) => a[1].size - b[1].size);
  for (const [lockId, members] of sortedContainers) {
    for (const id of members) nodeOuterContainer.set(id, lockId);
  }

  // ═══ 6. 放置節點：同層按房間→容器排序，自由佈局 ═══

  const nodePos = new Map<string, { x: number; y: number }>();

  for (const r of sortedRanks) {
    const layer = rankLayers[r]!;
    const y = r * (NODE_H + Y_GAP);

    // 排序：先按房間順序，房間內按容器歸屬分群
    layer.sort((a, b) => {
      const roomA = roomOrderIndex.get(nodeRoom(a)) ?? Infinity;
      const roomB = roomOrderIndex.get(nodeRoom(b)) ?? Infinity;
      if (roomA !== roomB) return roomA - roomB;
      const ca = nodeOuterContainer.get(a) ?? '';
      const cb = nodeOuterContainer.get(b) ?? '';
      if (ca !== cb) return (ca || '\uffff').localeCompare(cb || '\uffff');
      return 0;
    });

    layer.forEach((id, i) => {
      nodePos.set(id, { x: i * (NODE_W + X_GAP), y });
    });
  }

  // ═══ 6b. 房間分離：確保房間 bounding box 不交疊 ═══

  // 計算每個房間目前的 X 範圍（min~max）
  const roomXRange = new Map<string, { min: number; max: number }>();
  for (const id of allNodeIds) {
    const rid = nodeRoom(id);
    const pos = nodePos.get(id);
    if (!pos) continue;
    const range = roomXRange.get(rid) ?? { min: Infinity, max: -Infinity };
    range.min = Math.min(range.min, pos.x);
    range.max = Math.max(range.max, pos.x + NODE_W);
    roomXRange.set(rid, range);
  }

  // 按房間順序，依序確保後面的房間不跟前面的重疊
  for (let i = 1; i < roomOrder.length; i++) {
    const prevRid = roomOrder[i - 1]!;
    const curRid = roomOrder[i]!;
    const prevRange = roomXRange.get(prevRid);
    const curRange = roomXRange.get(curRid);
    if (!prevRange || !curRange) continue;

    // 需要的最小 X = 前一房間最右邊 + 間距
    const requiredMinX = prevRange.max + X_GAP + GROUP_PAD * 2;
    if (curRange.min < requiredMinX) {
      const shiftX = requiredMinX - curRange.min;
      // 把這個房間和所有後續房間的節點往右推
      for (let j = i; j < roomOrder.length; j++) {
        const rid = roomOrder[j]!;
        for (const nodeId of roomMembers.get(rid) ?? []) {
          const pos = nodePos.get(nodeId);
          if (pos) pos.x += shiftX;
        }
        const range = roomXRange.get(rid);
        if (range) { range.min += shiftX; range.max += shiftX; }
      }
    }
  }

  // ═══ 7. 生成輸出 ═══

  const layoutNodes: LayoutNode[] = [];
  for (const [id, pos] of nodePos) {
    const item = puzzle.items[id];
    const lock = puzzle.locks[id];
    if (!item && !lock) continue;
    const rid = nodeRoom(id);
    layoutNodes.push({
      id, x: pos.x, y: pos.y,
      entityType: item ? 'item' : 'lock',
      category: lock?.category,
      isExit: lock?.isExit,
      name: (item ?? lock)!.name,
      roomName: puzzle.rooms[rid]?.name ?? '',
      roomId: rid,
      containerId: containerMap.get(id),
    });
  }

  let maxX = 0;
  let maxY = 0;
  for (const n of layoutNodes) {
    if (n.x + NODE_W > maxX) maxX = n.x + NODE_W;
    if (n.y + NODE_H > maxY) maxY = n.y + NODE_H;
  }

  // 房間群組
  const roomGroups: RoomGroup[] = [];
  for (const [roomId, members] of roomMembers) {
    const room = puzzle.rooms[roomId];
    if (!room) continue;
    const positions = [...members].map(id => nodePos.get(id)).filter((p): p is { x: number; y: number } => !!p);
    const box = computeBox(positions, GROUP_PAD);
    if (box) roomGroups.push({ roomId, roomName: room.name, ...box });
  }

  // 容器群組
  const containerGroups: ContainerGroup[] = [];
  for (const [lockId, members] of containerMembers) {
    const lock = puzzle.locks[lockId];
    if (!lock) continue;
    const positions = [...members].map(id => nodePos.get(id)).filter((p): p is { x: number; y: number } => !!p);
    const box = computeBox(positions, GROUP_PAD / 2);
    if (box) containerGroups.push({ lockId, lockName: lock.name, roomId: lock.roomId, ...box });
  }

  // 空間鎖 → 目標房間
  const spatialEdges: SpatialEdge[] = [];
  for (const lock of allLocks) {
    if (lock.category === 'spatial' && lock.targetRoomId && allNodeIds.has(lock.id)) {
      spatialEdges.push({ lockId: lock.id, targetRoomId: lock.targetRoomId });
    }
  }

  return { nodes: layoutNodes, edges, spatialEdges, bounds: { maxX, maxY }, roomGroups, containerGroups };
}
