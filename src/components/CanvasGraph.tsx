import { useState, useRef, useMemo, useEffect, useCallback, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent } from 'react';
import { ZoomIn, ZoomOut, Move } from 'lucide-react';
import type { PuzzleDefinition } from '../game/types';
import { buildGraphLayout } from '../game/graph-layout';

interface Props {
  puzzle: PuzzleDefinition;
}

const NODE_W = 160;
const NODE_H = 60;
const MIN_SCALE = 0.1;
const MAX_SCALE = 2.5;

/** 以指定的畫面座標為中心進行縮放，scale 不變時回傳 prev（避免無效 re-render） */
function zoomAtPoint(
  prev: { x: number; y: number; scale: number },
  newScale: number,
  pivotX: number,
  pivotY: number,
) {
  const clamped = Math.min(Math.max(MIN_SCALE, newScale), MAX_SCALE);
  if (clamped === prev.scale) return prev;
  const worldX = (pivotX - prev.x) / prev.scale;
  const worldY = (pivotY - prev.y) / prev.scale;
  return {
    x: pivotX - worldX * clamped,
    y: pivotY - worldY * clamped,
    scale: clamped,
  };
}

/** 取得兩個 touch 點的中心與距離 */
function getTouchMeta(a: React.Touch, b: React.Touch) {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return {
    cx: (a.clientX + b.clientX) / 2,
    cy: (a.clientY + b.clientY) / 2,
    dist: Math.hypot(dx, dy),
  };
}

export default function CanvasGraph({ puzzle }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 50, y: 300, scale: 0.8 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  // Pinch state (refs to avoid re-renders during gesture)
  const pinchRef = useRef<{ dist: number; cx: number; cy: number; scale: number } | null>(null);

  // 快取容器 rect，避免每次 wheel 事件都 getBoundingClientRect（觸發 layout reflow）
  const rectRef = useRef<DOMRect | null>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    rectRef.current = el.getBoundingClientRect();
    const observer = new ResizeObserver(() => {
      rectRef.current = el.getBoundingClientRect();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(() => buildGraphLayout(puzzle), [puzzle]);
  const nodeMap = useMemo(() => {
    const map = new Map<string, (typeof layout.nodes)[number]>();
    for (const n of layout.nodes) map.set(n.id, n);
    return map;
  }, [layout]);

  // 同步 transform 到 ref，讓 native listener / callback 永遠讀到最新值
  const transformRef = useRef(transform);
  transformRef.current = transform;

  // ── Pan handlers (mouse) ──
  const handleMouseDown = (e: ReactMouseEvent) => {
    setIsDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  };
  const handleMouseMove = (e: ReactMouseEvent) => {
    if (!isDragging) return;
    setTransform(prev => ({
      ...prev,
      x: prev.x + e.clientX - lastMouse.x,
      y: prev.y + e.clientY - lastMouse.y,
    }));
    setLastMouse({ x: e.clientX, y: e.clientY });
  };
  const handleMouseUp = () => setIsDragging(false);

  // ── Touch handlers (pan + pinch) ──
  const handleTouchStart = (e: ReactTouchEvent) => {
    if (e.touches.length === 1) {
      pinchRef.current = null;
      setIsDragging(true);
      setLastMouse({ x: e.touches[0]!.clientX, y: e.touches[0]!.clientY });
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const meta = getTouchMeta(e.touches[0]!, e.touches[1]!);
      const rect = rectRef.current ?? containerRef.current?.getBoundingClientRect();
      pinchRef.current = {
        dist: meta.dist,
        cx: meta.cx - (rect?.left ?? 0),
        cy: meta.cy - (rect?.top ?? 0),
        scale: transformRef.current.scale,
      };
    }
  };
  const handleTouchMove = (e: ReactTouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setTransform(prev => ({
        ...prev,
        x: prev.x + e.touches[0]!.clientX - lastMouse.x,
        y: prev.y + e.touches[0]!.clientY - lastMouse.y,
      }));
      setLastMouse({ x: e.touches[0]!.clientX, y: e.touches[0]!.clientY });
    } else if (e.touches.length === 2 && pinchRef.current) {
      const meta = getTouchMeta(e.touches[0]!, e.touches[1]!);
      const ratio = meta.dist / pinchRef.current.dist;
      const newScale = pinchRef.current.scale * ratio;
      setTransform(prev => zoomAtPoint(prev, newScale, pinchRef.current!.cx, pinchRef.current!.cy));
    }
  };
  const handleTouchEnd = () => {
    setIsDragging(false);
    pinchRef.current = null;
  };

  // ── Wheel/trackpad zoom（native listener 才能 preventDefault）──
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = rectRef.current;
    if (!rect) return;

    const pivotX = e.clientX - rect.left;
    const pivotY = e.clientY - rect.top;
    const prev = transformRef.current;

    // ctrlKey = trackpad pinch on macOS；否則為一般滾輪
    if (e.ctrlKey) {
      // trackpad pinch：deltaY 是縮放量
      const factor = 1 - e.deltaY * 0.01;
      setTransform(zoomAtPoint(prev, prev.scale * factor, pivotX, pivotY));
    } else {
      const delta = e.deltaY * -0.001;
      setTransform(zoomAtPoint(prev, prev.scale + delta, pivotX, pivotY));
    }
  }, []);

  // 掛載 native wheel listener（passive: false），React onWheel 預設 passive 無法 preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const zoomAtCenter = useCallback((delta: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const cx = rect ? rect.width / 2 : 300;
    const cy = rect ? rect.height / 2 : 300;
    setTransform(prev => zoomAtPoint(prev, prev.scale + delta, cx, cy));
  }, []);
  const zoomIn = () => zoomAtCenter(0.2);
  const zoomOut = () => zoomAtCenter(-0.2);
  const resetView = () => setTransform({
    x: 50,
    y: (containerRef.current?.clientHeight ?? 600) / 2,
    scale: 0.8,
  });

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-slate-950/80 cursor-grab active:cursor-grabbing border border-slate-800 rounded-lg shadow-inner touch-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button onClick={zoomIn} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded shadow border border-slate-700">
          <ZoomIn size={16} />
        </button>
        <button onClick={zoomOut} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded shadow border border-slate-700">
          <ZoomOut size={16} />
        </button>
        <button onClick={resetView} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded shadow border border-slate-700">
          <Move size={16} />
        </button>
      </div>

      {/* Status bar */}
      <div className="absolute bottom-4 left-4 z-20 text-[10px] text-slate-500 bg-slate-900/80 px-2 py-1 rounded border border-slate-800 pointer-events-none">
        拖曳平移 | 縮放 ({Math.round(transform.scale * 100)}%)
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 z-20 text-[10px] text-slate-400 bg-slate-900/80 px-3 py-2 rounded border border-slate-800 pointer-events-none space-y-1">
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> 物品</div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" /> 小遊戲 / 固定物品</div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> 容器鎖</div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500" /> 空間鎖（門）</div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> 出口</div>
        <div className="mt-1.5 pt-1.5 border-t border-slate-700 space-y-1">
          <div className="flex items-center gap-1.5"><span className="w-3 border-t-2 border-slate-400" /> 需要（物品→鎖）</div>
          <div className="flex items-center gap-1.5"><span className="w-3 border-t-2 border-dashed border-cyan-600" /> 隱藏（鎖→物品）</div>
        </div>
      </div>

      {/* Transform layer */}
      <div
        style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: '0 0' }}
        className="absolute top-0 left-0 w-full h-full will-change-transform"
      >
        {/* Edges */}
        <svg className="absolute top-0 left-0 overflow-visible z-0 pointer-events-none">
          <defs>
            <marker id="arrow-req" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
            </marker>
            <marker id="arrow-contains" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#0891b2" />
            </marker>
          </defs>
          {layout.edges.map((edge, i) => {
            const source = nodeMap.get(edge.source);
            const target = nodeMap.get(edge.target);
            if (!source || !target) return null;

            const isContains = edge.type === 'contains';

            // 判斷方向
            const goesDown = target.y > source.y + NODE_H / 2;
            const goesRight = target.x > source.x;
            const sameRow = Math.abs(target.y - source.y) < NODE_H;

            let d: string;
            if (sameRow && goesRight) {
              // 同層右邊（如鎖→右側 content）
              const sx = source.x + NODE_W;
              const sy = source.y + NODE_H / 2;
              const ex = target.x;
              const ey = target.y + NODE_H / 2;
              d = `M ${sx} ${sy} L ${ex} ${ey}`;
            } else if (goesDown) {
              // 正向（下方）：從底部中央出發，到頂部中央
              const sx = source.x + NODE_W / 2;
              const sy = source.y + NODE_H;
              const ex = target.x + NODE_W / 2;
              const ey = target.y;
              const dist = ey - sy;
              const cpY1 = sy + Math.min(dist * 0.4, 50);
              const cpY2 = ey - Math.min(dist * 0.4, 50);
              d = `M ${sx} ${sy} C ${sx} ${cpY1}, ${ex} ${cpY2}, ${ex} ${ey}`;
            } else {
              // 反向/上方：從左側出發，繞弧到目標左側
              const sx = source.x;
              const sy = source.y + NODE_H / 2;
              const ex = target.x;
              const ey = target.y + NODE_H / 2;
              const loopX = Math.min(sx, ex) - 80;
              d = `M ${sx} ${sy} C ${loopX} ${sy}, ${loopX} ${ey}, ${ex} ${ey}`;
            }

            return (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={isContains ? '#0891b2' : '#475569'}
                strokeWidth="2"
                strokeDasharray={isContains ? '6 3' : 'none'}
                markerEnd={isContains ? 'url(#arrow-contains)' : 'url(#arrow-req)'}
                className={isContains ? 'opacity-70' : 'opacity-60'}
              />
            );
          })}
        </svg>

        {/* Room groups */}
        {layout.roomGroups.map(group => (
          <div
            key={`room-${group.roomId}`}
            style={{ left: group.x, top: group.y, width: group.width, height: group.height }}
            className="absolute border-2 border-blue-800/40 rounded-xl bg-blue-950/10 z-0 pointer-events-none"
          >
            <div className="absolute -top-5 left-2 text-[10px] text-blue-400/60 font-bold whitespace-nowrap">
              {group.roomName}
            </div>
          </div>
        ))}

        {/* Container groups */}
        {layout.containerGroups.map(group => (
          <div
            key={`container-${group.lockId}`}
            style={{ left: group.x, top: group.y, width: group.width, height: group.height }}
            className="absolute border-2 border-dashed border-rose-800/30 rounded-lg bg-rose-950/5 z-[5] pointer-events-none"
          />
        ))}

        {/* Nodes */}
        {layout.nodes.map(node => {
          let borderColor = 'border-emerald-900/60';
          let dotColor = 'bg-emerald-500 shadow-emerald-500/50';

          if (node.entityType === 'lock') {
            const lock = puzzle.locks[node.id];
            if (node.isExit) {
              borderColor = 'border-amber-700/60';
              dotColor = 'bg-amber-500 shadow-amber-500/50';
            } else if (lock?.mechanism === 'minigame') {
              borderColor = 'border-orange-700/60';
              dotColor = 'bg-orange-500 shadow-orange-500/50';
            } else if (node.category === 'spatial') {
              borderColor = 'border-purple-900/60';
              dotColor = 'bg-purple-500 shadow-purple-500/50';
            } else {
              borderColor = 'border-rose-900/60';
              dotColor = 'bg-rose-500 shadow-rose-500/50';
            }
          } else if (node.entityType === 'item') {
            const item = puzzle.items[node.id];
            if (item && item.pickupable === false) {
              borderColor = 'border-orange-700/60';
              dotColor = 'bg-orange-500 shadow-orange-500/50';
            }
          }

          return (
            <div
              key={node.id}
              style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
              className={`absolute bg-slate-900/90 border-2 backdrop-blur-sm ${borderColor} rounded-lg p-2.5 flex flex-col justify-center shadow-lg z-10 select-none hover:border-slate-400 transition-colors`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className={`shrink-0 w-2.5 h-2.5 rounded-full shadow-sm ${dotColor}`} />
                <span className="text-xs font-bold text-slate-100 truncate" title={node.name}>
                  {node.name}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1 truncate pl-4">
                @ {node.roomName || '未知'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
