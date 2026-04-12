import { useState, useCallback, useEffect } from 'react';
import type { MinigameConfig } from '../../game/types';
import { SeededRandom } from '../../game/utils';

interface Props {
  config: MinigameConfig;
  onComplete: () => void;
}

// Connection directions: [top, right, bottom, left]
type Connections = [boolean, boolean, boolean, boolean];

interface PipeType {
  name: string;
  base: Connections;
}

const PIPE_TYPES: PipeType[] = [
  { name: 'straight', base: [true, false, true, false] },
  { name: 'bend',     base: [true, true, false, false] },
  { name: 'tee',      base: [true, true, true, false] },
  { name: 'cross',    base: [true, true, true, true] },
];

/** Rotate connections 90° clockwise once */
function rotateCW(conn: Connections): Connections {
  return [conn[3]!, conn[0]!, conn[1]!, conn[2]!];
}

/** Rotate n times CW */
function rotateN(conn: Connections, n: number): Connections {
  let c: Connections = [...conn] as Connections;
  for (let i = 0; i < (n % 4); i++) c = rotateCW(c);
  return c;
}

/** Find the pipe type + rotation that exactly matches the required connections */
function findPipeMatch(required: Connections): { typeIdx: number; rotation: number } | null {
  for (let t = 0; t < PIPE_TYPES.length; t++) {
    const base = PIPE_TYPES[t]!.base;
    for (let r = 0; r < 4; r++) {
      const rotated = rotateN(base as Connections, r);
      if (
        rotated[0] === required[0] &&
        rotated[1] === required[1] &&
        rotated[2] === required[2] &&
        rotated[3] === required[3]
      ) {
        return { typeIdx: t, rotation: r };
      }
    }
  }
  return null;
}

interface Cell {
  typeIdx: number;
  /** Current visual rotation (0–3, each step = 90°) */
  rotation: number;
  /** Solution rotation */
  solvedRotation: number;
}

/** Prim's spanning tree on grid, returns set of edges as "r1,c1-r2,c2" */
function buildSpanningTree(size: number, rng: SeededRandom): Set<string> {
  const inTree = Array.from({ length: size }, () => new Array(size).fill(false) as boolean[]);
  const edges: Array<[number, number, number, number]> = []; // [r1,c1,r2,c2]
  const treeEdges = new Set<string>();

  const addEdges = (r: number, c: number) => {
    inTree[r]![c] = true;
    const dirs = [[-1, 0], [0, 1], [1, 0], [0, -1]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr!;
      const nc = c + dc!;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !inTree[nr]![nc]) {
        edges.push([r, c, nr, nc]);
      }
    }
  };

  addEdges(0, 0);

  while (edges.length > 0) {
    // pick a random edge
    const idx = rng.nextInt(edges.length);
    const [r1, c1, r2, c2] = edges.splice(idx, 1)[0]!;
    if (inTree[r2]![c2]) continue;
    treeEdges.add(`${r1},${c1}-${r2},${c2}`);
    treeEdges.add(`${r2},${c2}-${r1},${c1}`);
    addEdges(r2, c2);
  }

  return treeEdges;
}

function buildGrid(size: number, rng: SeededRandom): Cell[][] {
  const treeEdges = buildSpanningTree(size, rng);

  const grid: Cell[][] = [];
  for (let r = 0; r < size; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < size; c++) {
      const top    = treeEdges.has(`${r},${c}-${r - 1},${c}`);
      const right  = treeEdges.has(`${r},${c}-${r},${c + 1}`);
      const bottom = treeEdges.has(`${r},${c}-${r + 1},${c}`);
      const left   = treeEdges.has(`${r},${c}-${r},${c - 1}`);

      const required: Connections = [top, right, bottom, left];
      const match = findPipeMatch(required);
      if (!match) {
        // Fallback: cross
        row.push({ typeIdx: 3, rotation: 0, solvedRotation: 0 });
        continue;
      }

      // Scramble: apply at least 1 random extra rotation
      const extra = 1 + rng.nextInt(3);
      const scrambled = (match.rotation + extra) % 4;

      row.push({ typeIdx: match.typeIdx, rotation: scrambled, solvedRotation: match.rotation });
    }
    grid.push(row);
  }
  return grid;
}

/** Get actual connections for a cell at its current rotation */
function cellConnections(cell: Cell): Connections {
  return rotateN(PIPE_TYPES[cell.typeIdx]!.base as Connections, cell.rotation);
}

/** BFS from (0,0) to (size-1, size-1) using actual cell connections */
function isSolved(grid: Cell[][], size: number): boolean {
  const visited = Array.from({ length: size }, () => new Array(size).fill(false) as boolean[]);
  const queue: [number, number][] = [[0, 0]];
  visited[0]![0] = true;

  const DIRS: Array<[number, number, number, number]> = [
    [-1, 0, 0, 2], // top: check my[0] and neighbor[2]
    [0, 1, 1, 3],  // right: check my[1] and neighbor[3]
    [1, 0, 2, 0],  // bottom: check my[2] and neighbor[0]
    [0, -1, 3, 1], // left: check my[3] and neighbor[1]
  ];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    if (r === size - 1 && c === size - 1) return true;
    const myConn = cellConnections(grid[r]![c]!);

    for (const [dr, dc, myDir, theirDir] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      if (visited[nr]![nc]) continue;
      const theirConn = cellConnections(grid[nr]![nc]!);
      if (myConn[myDir] && theirConn[theirDir]) {
        visited[nr]![nc] = true;
        queue.push([nr, nc]);
      }
    }
  }
  return false;
}

// ─── SVG pipe renderers ───

const PIPE_COLOR_ACTIVE = '#22d3ee';   // cyan-400
const PIPE_COLOR_SOLVED = '#34d399';   // emerald-400
const PIPE_BG = '#1e293b';             // slate-800
const HALF = 24;                       // center of 48x48 cell
const END  = 48;

function StraightSVG({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full">
      <rect width={48} height={48} fill={PIPE_BG} />
      <line x1={HALF} y1={0} x2={HALF} y2={END} stroke={color} strokeWidth={6} strokeLinecap="square" />
    </svg>
  );
}

function BendSVG({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full">
      <rect width={48} height={48} fill={PIPE_BG} />
      <line x1={HALF} y1={0}    x2={HALF}  y2={HALF} stroke={color} strokeWidth={6} />
      <line x1={HALF} y1={HALF} x2={END}   y2={HALF} stroke={color} strokeWidth={6} />
      <circle cx={HALF} cy={HALF} r={3} fill={color} />
    </svg>
  );
}

function TeeSVG({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full">
      <rect width={48} height={48} fill={PIPE_BG} />
      <line x1={HALF} y1={0}    x2={HALF} y2={END}  stroke={color} strokeWidth={6} />
      <line x1={HALF} y1={HALF} x2={END}  y2={HALF} stroke={color} strokeWidth={6} />
      <circle cx={HALF} cy={HALF} r={3} fill={color} />
    </svg>
  );
}

function CrossSVG({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full">
      <rect width={48} height={48} fill={PIPE_BG} />
      <line x1={HALF} y1={0}    x2={HALF} y2={END}  stroke={color} strokeWidth={6} />
      <line x1={0}    y1={HALF} x2={END}  y2={HALF} stroke={color} strokeWidth={6} />
      <circle cx={HALF} cy={HALF} r={3} fill={color} />
    </svg>
  );
}

const PIPE_SVGS = [StraightSVG, BendSVG, TeeSVG, CrossSVG];

export default function PipePuzzle({ config, onComplete }: Props) {
  const size = (config.params.gridSize as number | undefined) ?? 4;
  const [grid, setGrid] = useState<Cell[][]>(() => buildGrid(size, new SeededRandom(config.seed)));
  const [solved, setSolved] = useState(false);

  const rotate = useCallback((r: number, c: number) => {
    if (solved) return;
    setGrid(prev => {
      const next = prev.map((row, ri) =>
        ri === r ? row.map((cell, ci) => ci === c ? { ...cell, rotation: (cell.rotation + 1) % 4 } : cell) : row
      );
      return next;
    });
  }, [solved]);

  useEffect(() => {
    if (!solved && isSolved(grid, size)) {
      setSolved(true);
    }
  }, [grid, size, solved]);

  useEffect(() => {
    if (solved) {
      const t = setTimeout(onComplete, 800);
      return () => clearTimeout(t);
    }
  }, [solved, onComplete]);

  const pipeColor = solved ? PIPE_COLOR_SOLVED : PIPE_COLOR_ACTIVE;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-xs text-slate-400">點擊管道旋轉，連通左上到右下</p>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${size}, 48px)` }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const PipeSVG = PIPE_SVGS[cell.typeIdx]!;
            const isStart = r === 0 && c === 0;
            const isEnd   = r === size - 1 && c === size - 1;
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => rotate(r, c)}
                disabled={solved}
                title={`(${r},${c})`}
                className={`w-12 h-12 rounded border ${
                  isStart || isEnd
                    ? 'border-amber-500'
                    : 'border-slate-700'
                } overflow-hidden transition-all`}
                style={{ transform: `rotate(${cell.rotation * 90}deg)`, transition: 'transform 0.15s ease' }}
              >
                <PipeSVG color={pipeColor} />
              </button>
            );
          })
        )}
      </div>
      {solved && (
        <p className="text-sm text-emerald-400 font-bold animate-pulse">管道已連通！</p>
      )}
    </div>
  );
}
