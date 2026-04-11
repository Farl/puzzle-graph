import { useState, useRef, useMemo, type WheelEvent, type MouseEvent, type TouchEvent } from 'react';
import { ZoomIn, ZoomOut, Move } from 'lucide-react';
import type { PuzzleDefinition } from '../game/types';
import { buildGraphLayout } from '../game/graph-layout';

interface Props {
  puzzle: PuzzleDefinition;
}

const NODE_W = 160;
const NODE_H = 60;

export default function CanvasGraph({ puzzle }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 50, y: 300, scale: 0.8 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  const layout = useMemo(() => buildGraphLayout(puzzle), [puzzle]);
  const nodeMap = useMemo(() => {
    const map = new Map<string, (typeof layout.nodes)[number]>();
    for (const n of layout.nodes) map.set(n.id, n);
    return map;
  }, [layout]);

  // Pan handlers
  const handleMouseDown = (e: MouseEvent) => {
    setIsDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  };
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setTransform(prev => ({
      ...prev,
      x: prev.x + e.clientX - lastMouse.x,
      y: prev.y + e.clientY - lastMouse.y,
    }));
    setLastMouse({ x: e.clientX, y: e.clientY });
  };
  const handleMouseUp = () => setIsDragging(false);

  // Touch handlers
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setLastMouse({ x: e.touches[0]!.clientX, y: e.touches[0]!.clientY });
    }
  };
  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setTransform(prev => ({
      ...prev,
      x: prev.x + e.touches[0]!.clientX - lastMouse.x,
      y: prev.y + e.touches[0]!.clientY - lastMouse.y,
    }));
    setLastMouse({ x: e.touches[0]!.clientX, y: e.touches[0]!.clientY });
  };
  const handleTouchEnd = () => setIsDragging(false);

  // Zoom handler
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    setTransform(prev => ({
      ...prev,
      scale: Math.min(Math.max(0.1, prev.scale + delta), 2.5),
    }));
  };

  const zoomIn = () => setTransform(p => ({ ...p, scale: Math.min(p.scale + 0.2, 2.5) }));
  const zoomOut = () => setTransform(p => ({ ...p, scale: Math.max(p.scale - 0.2, 0.1) }));
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
      onWheel={handleWheel}
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

            const startX = source.x + NODE_W;
            const startY = source.y + NODE_H / 2;
            const endX = target.x;
            const endY = target.y + NODE_H / 2;
            const cpX = startX + (endX - startX) / 2;

            const isContains = edge.type === 'contains';

            return (
              <path
                key={i}
                d={`M ${startX} ${startY} C ${cpX} ${startY}, ${cpX} ${endY}, ${endX} ${endY}`}
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

        {/* Nodes */}
        {layout.nodes.map(node => {
          let borderColor = 'border-emerald-900/60';
          let dotColor = 'bg-emerald-500 shadow-emerald-500/50';

          if (node.entityType === 'lock') {
            if (node.isExit) {
              borderColor = 'border-amber-700/60';
              dotColor = 'bg-amber-500 shadow-amber-500/50';
            } else if (node.category === 'spatial') {
              borderColor = 'border-purple-900/60';
              dotColor = 'bg-purple-500 shadow-purple-500/50';
            } else {
              borderColor = 'border-rose-900/60';
              dotColor = 'bg-rose-500 shadow-rose-500/50';
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
