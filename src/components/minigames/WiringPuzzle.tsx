import { useState, useEffect } from 'react';
import type { MinigameConfig } from '../../game/types';
import { SeededRandom, shuffle } from '../../game/utils';

interface Props {
  config: MinigameConfig;
  onComplete: () => void;
}

interface WireColor {
  label: string;
  bg: string;       // Tailwind bg class
  ring: string;     // Tailwind ring class
  line: string;     // hex for SVG line
}

const WIRE_COLORS: WireColor[] = [
  { label: '紅', bg: 'bg-red-500',    ring: 'ring-red-300',    line: '#ef4444' },
  { label: '藍', bg: 'bg-blue-500',   ring: 'ring-blue-300',   line: '#3b82f6' },
  { label: '綠', bg: 'bg-green-500',  ring: 'ring-green-300',  line: '#22c55e' },
  { label: '黃', bg: 'bg-yellow-400', ring: 'ring-yellow-200', line: '#facc15' },
  { label: '紫', bg: 'bg-purple-500', ring: 'ring-purple-300', line: '#a855f7' },
  { label: '橙', bg: 'bg-orange-500', ring: 'ring-orange-300', line: '#f97316' },
];

function buildPuzzle(pairCount: number, rng: SeededRandom) {
  const picked = shuffle(WIRE_COLORS, rng).slice(0, pairCount);
  const left  = picked;
  const right = shuffle(picked, rng);
  return { left, right };
}

export default function WiringPuzzle({ config, onComplete }: Props) {
  const pairCount = (config.params.pairCount as number | undefined) ?? 4;
  const [{ left, right }] = useState(() => buildPuzzle(pairCount, new SeededRandom(config.seed)));

  // connections[leftIdx] = rightIdx, or -1
  const [connections, setConnections] = useState<number[]>(() => new Array(pairCount).fill(-1));
  // rightConnected[rightIdx] = leftIdx, or -1
  const [rightConnected, setRightConnected] = useState<number[]>(() => new Array(pairCount).fill(-1));

  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);

  const handleLeftClick = (leftIdx: number) => {
    if (solved) return;
    setSelectedLeft(prev => (prev === leftIdx ? null : leftIdx));
  };

  const handleRightClick = (rightIdx: number) => {
    if (solved || selectedLeft === null) return;

    const leftIdx = selectedLeft;

    setConnections(prev => {
      const next = [...prev];
      // Disconnect previous right target if any
      const prevRight = next[leftIdx]!;
      if (prevRight !== -1) {
        setRightConnected(rc => {
          const nrc = [...rc];
          nrc[prevRight] = -1;
          return nrc;
        });
      }
      next[leftIdx] = rightIdx;
      return next;
    });

    setRightConnected(prev => {
      const next = [...prev];
      // Disconnect previous left that was connected to this right
      const prevLeft = next[rightIdx]!;
      if (prevLeft !== -1 && prevLeft !== leftIdx) {
        setConnections(c => {
          const nc = [...c];
          nc[prevLeft] = -1;
          return nc;
        });
      }
      next[rightIdx] = leftIdx;
      return next;
    });

    setSelectedLeft(null);
  };

  // Check win condition after state updates
  useEffect(() => {
    if (solved) return;
    const allConnected = connections.every(r => r !== -1);
    if (!allConnected) return;

    // Each left[i] must match right[connections[i]] by label
    const allCorrect = connections.every((rightIdx, leftIdx) => {
      return right[rightIdx]?.label === left[leftIdx]?.label;
    });
    if (allCorrect) setSolved(true);
  }, [connections, left, right, solved]);

  useEffect(() => {
    if (solved) {
      const t = setTimeout(onComplete, 800);
      return () => clearTimeout(t);
    }
  }, [solved, onComplete]);

  const ITEM_HEIGHT = 48;
  const ITEM_GAP    = 12;
  const TOP_OFFSET  = ITEM_HEIGHT / 2;
  const svgHeight   = pairCount * (ITEM_HEIGHT + ITEM_GAP) - ITEM_GAP;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-xs text-slate-400">點選左側端子，再點選右側對應顏色</p>

      <div className="flex items-start gap-0">
        {/* Left column */}
        <div className="flex flex-col gap-3">
          {left.map((color, i) => {
            const isSelected = selectedLeft === i;
            const isConnected = connections[i] !== -1;
            return (
              <button
                key={i}
                onClick={() => handleLeftClick(i)}
                className={`w-12 h-12 rounded-lg font-bold text-white text-sm transition-all
                  ${color.bg}
                  ${isSelected ? `ring-2 ${color.ring} ring-offset-2 ring-offset-slate-900 scale-110` : ''}
                  ${isConnected && !isSelected ? 'opacity-70' : ''}
                `}
                disabled={solved}
              >
                {color.label}
              </button>
            );
          })}
        </div>

        {/* SVG connector lines */}
        <svg
          width={80}
          height={svgHeight}
          className="shrink-0"
          style={{ marginTop: 0 }}
        >
          {connections.map((rightIdx, leftIdx) => {
            if (rightIdx === -1) return null;
            const color = left[leftIdx]!;
            const y1 = leftIdx  * (ITEM_HEIGHT + ITEM_GAP) + TOP_OFFSET;
            const y2 = rightIdx * (ITEM_HEIGHT + ITEM_GAP) + TOP_OFFSET;
            return (
              <line
                key={leftIdx}
                x1={0}
                y1={y1}
                x2={80}
                y2={y2}
                stroke={solved ? '#34d399' : color.line}
                strokeWidth={3}
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Right column */}
        <div className="flex flex-col gap-3">
          {right.map((color, i) => {
            const isConnected = rightConnected[i] !== -1;
            return (
              <button
                key={i}
                onClick={() => handleRightClick(i)}
                className={`w-12 h-12 rounded-lg font-bold text-white text-sm transition-all
                  ${color.bg}
                  ${selectedLeft !== null ? `hover:ring-2 ${color.ring} hover:ring-offset-1 hover:ring-offset-slate-900` : ''}
                  ${isConnected ? 'opacity-70' : ''}
                `}
                disabled={solved}
              >
                {color.label}
              </button>
            );
          })}
        </div>
      </div>

      {solved && (
        <p className="text-sm text-emerald-400 font-bold animate-pulse">線路接通！</p>
      )}
    </div>
  );
}
