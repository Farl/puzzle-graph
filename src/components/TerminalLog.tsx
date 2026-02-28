import { useEffect, useRef } from 'react';
import type { HistoryEntry } from '../game/types';

function getLogClass(type: HistoryEntry['type']): string {
  switch (type) {
    case 'system': return 'text-purple-400 opacity-90';
    case 'room': return 'text-cyan-300 font-bold my-3 md:my-4 text-sm md:text-[15px] border-l-2 border-cyan-700 pl-2';
    case 'success': return 'text-emerald-400';
    case 'error': return 'text-rose-400';
    case 'info': return 'text-amber-300';
    case 'user': return 'text-slate-500 italic';
    default: return 'text-slate-300';
  }
}

interface Props {
  history: HistoryEntry[];
}

export default function TerminalLog({ history }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history.length]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-2 font-mono text-xs md:text-sm leading-relaxed scroll-smooth scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
      {history.map(entry => (
        <div key={entry.id} className={getLogClass(entry.type)}>
          {entry.text.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
