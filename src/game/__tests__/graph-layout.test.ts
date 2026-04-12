/**
 * Graph layout 正確性驗證
 *
 * 用自動化測試代替人眼檢查，確保佈局滿足所有約束：
 * 1. 節點不重疊
 * 2. 每條邊的兩端節點都存在
 * 3. 容器 bounding box 不包含非成員節點
 * 4. 大多數邊向下流動（Y 增長方向）
 * 5. 所有座標非負
 * 6. 同 rank 同層的節點之間有足夠間距
 */
import { describe, it, expect } from 'vitest';
import { generatePuzzle } from '../generator';
import { buildGraphLayout } from '../graph-layout';
import type { GeneratorConfig } from '../types';

const NODE_W = 160;
const NODE_H = 60;
const MIN_GAP = 30; // 最小間距（不含節點寬度）

const CONFIGS: { name: string; config: GeneratorConfig }[] = [
  {
    name: 'default 3 rooms',
    config: { targetDepth: 6, maxRooms: 3, compositeRate: 0.3, depthStaggerVariance: 1, keySpreadRate: 0.5, crossRoomRate: 0.3, reuseRate: 0.3, maxNestingDepth: 2, consolidationRate: 0.5, stateLockRate: 0.3 },
  },
  {
    name: '1 room deep',
    config: { targetDepth: 10, maxRooms: 1, compositeRate: 0.3, depthStaggerVariance: 1, keySpreadRate: 0, crossRoomRate: 0, reuseRate: 0.3, maxNestingDepth: 2, consolidationRate: 0.5, stateLockRate: 0.3 },
  },
  {
    name: '5 rooms wide',
    config: { targetDepth: 8, maxRooms: 5, compositeRate: 0.5, depthStaggerVariance: 1, keySpreadRate: 0.5, crossRoomRate: 0.5, reuseRate: 0.3, maxNestingDepth: 2, consolidationRate: 0.5, stateLockRate: 0.3 },
  },
];

const RUNS_PER_CONFIG = 30;

/** 兩個矩形是否重疊 */
function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

for (const { name, config } of CONFIGS) {
  describe(`graph layout: ${name}`, () => {
    it('no node overlaps', () => {
      for (let i = 0; i < RUNS_PER_CONFIG; i++) {
        const puzzle = generatePuzzle(config);
        const layout = buildGraphLayout(puzzle);

        for (let a = 0; a < layout.nodes.length; a++) {
          for (let b = a + 1; b < layout.nodes.length; b++) {
            const na = layout.nodes[a]!;
            const nb = layout.nodes[b]!;
            expect(
              rectsOverlap(na.x, na.y, NODE_W, NODE_H, nb.x, nb.y, NODE_W, NODE_H),
              `seed ${puzzle.seed}: "${na.name}" (${na.x},${na.y}) overlaps "${nb.name}" (${nb.x},${nb.y})`,
            ).toBe(false);
          }
        }
      }
    });

    it('every edge has both endpoints in nodes', () => {
      for (let i = 0; i < RUNS_PER_CONFIG; i++) {
        const puzzle = generatePuzzle(config);
        const layout = buildGraphLayout(puzzle);
        const ids = new Set(layout.nodes.map(n => n.id));

        for (const edge of layout.edges) {
          expect(ids.has(edge.source), `seed ${puzzle.seed}: missing source ${edge.source}`).toBe(true);
          expect(ids.has(edge.target), `seed ${puzzle.seed}: missing target ${edge.target}`).toBe(true);
        }
      }
    });

    it('container groups do not contain non-member nodes', () => {
      for (let i = 0; i < RUNS_PER_CONFIG; i++) {
        const puzzle = generatePuzzle(config);
        const layout = buildGraphLayout(puzzle);

        for (const cg of layout.containerGroups) {
          const lock = puzzle.locks[cg.lockId];
          if (!lock) continue;
          const memberIds = new Set([lock.id, ...lock.contents]);

          for (const node of layout.nodes) {
            if (memberIds.has(node.id)) continue;
            const inside = rectsOverlap(
              node.x, node.y, NODE_W, NODE_H,
              cg.x, cg.y, cg.width, cg.height,
            );
            expect(
              inside,
              `seed ${puzzle.seed}: "${node.name}" inside container "${cg.lockName}" box`,
            ).toBe(false);
          }
        }
      }
    });

    it('all positions are non-negative', () => {
      for (let i = 0; i < RUNS_PER_CONFIG; i++) {
        const puzzle = generatePuzzle(config);
        const layout = buildGraphLayout(puzzle);

        for (const n of layout.nodes) {
          expect(n.x, `seed ${puzzle.seed}: "${n.name}" has negative X=${n.x}`).toBeGreaterThanOrEqual(0);
          expect(n.y, `seed ${puzzle.seed}: "${n.name}" has negative Y=${n.y}`).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('majority of edges flow downward', () => {
      for (let i = 0; i < RUNS_PER_CONFIG; i++) {
        const puzzle = generatePuzzle(config);
        const layout = buildGraphLayout(puzzle);
        const nodeMap = new Map(layout.nodes.map(n => [n.id, n]));

        let forward = 0;
        let backward = 0;
        for (const edge of layout.edges) {
          const s = nodeMap.get(edge.source);
          const t = nodeMap.get(edge.target);
          if (!s || !t) continue;
          if (t.y > s.y) forward++;
          else if (t.y < s.y) backward++;
        }

        expect(forward, `seed ${puzzle.seed}: forward=${forward} backward=${backward}`).toBeGreaterThanOrEqual(backward);
      }
    });

    it('no excessive X gaps within same room and Y layer', () => {
      for (let i = 0; i < RUNS_PER_CONFIG; i++) {
        const puzzle = generatePuzzle(config);
        const layout = buildGraphLayout(puzzle);

        // 按房間 + Y 分群（房間之間的間距是合理的，不檢查）
        const key = (n: typeof layout.nodes[0]) => `${n.roomId}:${n.y}`;
        const groups = new Map<string, typeof layout.nodes>();
        for (const n of layout.nodes) {
          const k = key(n);
          if (!groups.has(k)) groups.set(k, []);
          groups.get(k)!.push(n);
        }

        for (const [, nodes] of groups) {
          if (nodes.length <= 1) continue;
          nodes.sort((a, b) => a.x - b.x);
          for (let j = 1; j < nodes.length; j++) {
            const gap = nodes[j]!.x - (nodes[j - 1]!.x + NODE_W);
            expect(
              gap <= NODE_W * 5 + MIN_GAP * 5,
              `seed ${puzzle.seed}: excessive gap ${gap}px between "${nodes[j - 1]!.name}" and "${nodes[j]!.name}"`,
            ).toBe(true);
          }
        }
      }
    });
  });
}
