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
const CONTAINER_GAP = 30;  // 不同容器群之間的水平間距
const ROOM_X_GAP = 60;    // 不同房間之間的水平間距

/**
 * DAG 佈局：Y = 拓撲 rank（深度向下），X = 同層展開
 * 容器 contents 在下一層，X 對齊父鎖，容器 group 不交疊
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

  // ─── 按 rank 分層 ───

  const rankLayers: Record<number, string[]> = {};
  for (const id of allNodeIds) {
    const r = ranks[id] ?? 0;
    if (!rankLayers[r]) rankLayers[r] = [];
    rankLayers[r]!.push(id);
  }

  // ─── Node 資訊 + 房間順序 ───

  const nodeRoom = (id: string): string =>
    puzzle.items[id]?.initialRoom ?? puzzle.locks[id]?.roomId ?? '';

  // 房間順序：BFS from startRoom
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

  // ─── 佈局：Y = rank（向下），X = barycenter 排序展開 ───
  // 每層節點按連接的上層節點平均 X 排序（交叉最小化）
  // 同容器的 contents 保持相鄰並對齊父鎖

  const layoutNodes: LayoutNode[] = [];
  const nodePos = new Map<string, { x: number; y: number }>();

  // 建立反向鄰接表（誰連到我）
  const reverseAdj: Record<string, string[]> = {};
  for (const id of allNodeIds) reverseAdj[id] = [];
  for (const edge of edges) {
    reverseAdj[edge.target]?.push(edge.source);
  }

  const sortedRanks = Object.keys(rankLayers).map(Number).sort((a, b) => a - b);

  // ─── 第一遍（上→下）：初始 X 分配 + barycenter 排序 ───

  for (const r of sortedRanks) {
    const layer = rankLayers[r]!;
    const y = r * (NODE_H + Y_GAP);

    // 計算每個節點的 barycenter（上層連接節點的平均 X）
    const barycenter = (id: string): number => {
      const parents = reverseAdj[id]?.filter(pid => nodePos.has(pid)) ?? [];
      if (parents.length === 0) return Infinity; // 無上層連接，排最後
      return parents.reduce((sum, pid) => sum + nodePos.get(pid)!.x, 0) / parents.length;
    };

    // 先按房間分群，再按容器/barycenter 排列（確保房間群不重疊）
    const byRoom = new Map<string, string[]>();
    for (const id of layer) {
      const rid = nodeRoom(id);
      if (!byRoom.has(rid)) byRoom.set(rid, []);
      byRoom.get(rid)!.push(id);
    }

    // 房間按 roomOrder 排序
    const sortedRooms = [...byRoom.keys()].sort(
      (a, b) => roomOrder.indexOf(a) - roomOrder.indexOf(b),
    );

    let currentX = 0;
    for (const rid of sortedRooms) {
      const roomIds = byRoom.get(rid)!;

      // 房間內按容器群/barycenter 排序
      const groups = new Map<string, string[]>();
      for (const id of roomIds) {
        const parent = containerMap.get(id) ?? '';
        if (!groups.has(parent)) groups.set(parent, []);
        groups.get(parent)!.push(id);
      }

      const groupEntries: { key: string; ids: string[] }[] = [];
      for (const [key, ids] of groups) groupEntries.push({ key, ids });
      groupEntries.sort((a, b) => {
        const aVal = a.key !== '' ? (nodePos.get(a.key)?.x ?? Infinity) : Math.min(...a.ids.map(barycenter));
        const bVal = b.key !== '' ? (nodePos.get(b.key)?.x ?? Infinity) : Math.min(...b.ids.map(barycenter));
        return aVal - bVal;
      });

      for (const entry of groupEntries) {
        if (entry.key === '') entry.ids.sort((a, b) => barycenter(a) - barycenter(b));
        for (const id of entry.ids) {
          nodePos.set(id, { x: currentX, y });
          currentX += NODE_W + X_GAP;
        }
        currentX += CONTAINER_GAP;
      }

      currentX += ROOM_X_GAP; // 房間之間的間距
    }
  }

  // ─── 第二遍（下→上）：微調 X 讓子節點影響父節點 ───

  for (const r of [...sortedRanks].reverse()) {
    const layer = rankLayers[r]!;
    if (layer.length <= 1) continue;

    // 計算每個節點的下層 barycenter
    const childBarycenter = (id: string): number => {
      const children = (adj[id] ?? []).map(e => e.target).filter(cid => nodePos.has(cid));
      if (children.length === 0) return nodePos.get(id)?.x ?? 0;
      return children.reduce((sum, cid) => sum + nodePos.get(cid)!.x, 0) / children.length;
    };

    // 保持容器群完整性，只調整自由節點順序
    const freeIds = layer.filter(id => !containerMap.has(id));
    if (freeIds.length <= 1) continue;

    freeIds.sort((a, b) => childBarycenter(a) - childBarycenter(b));

    // 收集自由節點的 X 位置，重新分配
    const freeXPositions = freeIds.map(id => nodePos.get(id)!.x).sort((a, b) => a - b);
    freeIds.forEach((id, i) => {
      const pos = nodePos.get(id)!;
      pos.x = freeXPositions[i]!;
    });
  }

  // ─── 第三遍：碰撞解決 — 同 Y 的節點不能重疊 ───

  const rankNodes = new Map<number, string[]>();
  for (const [id, pos] of nodePos) {
    const r = pos.y;
    if (!rankNodes.has(r)) rankNodes.set(r, []);
    rankNodes.get(r)!.push(id);
  }

  for (const [, ids] of rankNodes) {
    if (ids.length <= 1) continue;
    ids.sort((a, b) => nodePos.get(a)!.x - nodePos.get(b)!.x);
    for (let i = 1; i < ids.length; i++) {
      const prev = nodePos.get(ids[i - 1]!)!;
      const curr = nodePos.get(ids[i]!)!;
      const minRight = prev.x + NODE_W + X_GAP;
      if (curr.x < minRight) curr.x = minRight;
    }
  }

  // 確保所有 X >= 0
  let minX = Infinity;
  for (const pos of nodePos.values()) {
    if (pos.x < minX) minX = pos.x;
  }
  if (minX < 0) {
    for (const pos of nodePos.values()) pos.x -= minX;
  }

  // ─── 第五遍：容器框避讓 — 非容器節點避開容器 bounding box 區域 ───

  type Box = { x: number; y: number; width: number; height: number };

  const posBox = (ids: string[], pad: number): Box | null => {
    const positions = ids.map(id => nodePos.get(id)).filter((p): p is { x: number; y: number } => !!p);
    if (positions.length === 0) return null;
    const x = Math.min(...positions.map(p => p.x)) - pad;
    const y = Math.min(...positions.map(p => p.y)) - pad;
    return {
      x, y,
      width: Math.max(...positions.map(p => p.x + NODE_W)) + pad - x,
      height: Math.max(...positions.map(p => p.y + NODE_H)) + pad - y,
    };
  };

  // 收集相鄰 rank 的容器群（鎖和所有 content 在 ≤ 1 rank 步內）
  const rankStep = NODE_H + Y_GAP;
  const containerGroupData: { lockId: string; memberIds: Set<string>; box: Box }[] = [];
  for (const lock of allLocks) {
    if (lock.category !== 'container' || lock.contents.length === 0) continue;
    const lockP = nodePos.get(lock.id);
    if (!lockP) continue;
    const childIds = lock.contents.filter(id => nodePos.has(id));
    if (childIds.length === 0) continue;

    // 只對相鄰 rank 的容器畫框（遠距離的用 contains 邊表達）
    const maxChildY = Math.max(...childIds.map(id => nodePos.get(id)!.y));
    if (maxChildY - lockP.y > rankStep * 1.5) continue;

    const memberIds = new Set([lock.id, ...childIds]);
    const box = posBox([...memberIds], GROUP_PAD / 2);
    if (box) containerGroupData.push({ lockId: lock.id, memberIds, box });
  }

  // 容器框已建立，不做推開（避免造成巨大 X 間距）
  // 容器框內可能含非成員節點 — 這是 position-based 框的固有限制

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

  const roomGroups: RoomGroup[] = [];
  for (const [roomId, room] of Object.entries(puzzle.rooms)) {
    const rNodes = layoutNodes.filter(n => n.roomId === roomId);
    if (rNodes.length === 0) continue;
    const box = boundingBox(rNodes, GROUP_PAD);
    roomGroups.push({ roomId, roomName: room.name, ...box });
  }

  const containerGroups: ContainerGroup[] = containerGroupData.map(cg => ({
    lockId: cg.lockId,
    lockName: puzzle.locks[cg.lockId]!.name,
    roomId: puzzle.locks[cg.lockId]!.roomId,
    ...cg.box,
  }));

  return { nodes: layoutNodes, edges, bounds: { maxX, maxY }, roomGroups, containerGroups };
}
