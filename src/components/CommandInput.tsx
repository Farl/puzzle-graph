import { useState, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { useAutocomplete } from '../hooks/useAutocomplete';
import type { GameState } from '../game/types';

interface Props {
  gameState: GameState;
  onCommand: (cmd: string) => void;
  disabled?: boolean;
}

export default function CommandInput({ gameState, onCommand, disabled }: Props) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { suggestions, activeIndex, setActiveIndex } = useAutocomplete(input, gameState);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onCommand(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (suggestions.length === 0) return;

    if (e.key === 'Tab' || (e.key === 'ArrowRight' && suggestions.length > 0)) {
      e.preventDefault();
      const selected = suggestions[activeIndex];
      if (selected) setInput(selected);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(Math.min(activeIndex + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(Math.max(activeIndex - 1, 0));
    }
  };

  return (
    <div className="relative border-t border-slate-800">
      {suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 bg-slate-900 border border-slate-800 rounded-t-lg max-h-40 overflow-y-auto z-10">
          {suggestions.map((s, i) => (
            <button
              key={i}
              className={`w-full text-left px-4 py-1.5 text-xs font-mono ${
                i === activeIndex ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
              onMouseDown={() => { setInput(s); inputRef.current?.focus(); }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3">
        <span className="text-emerald-500 font-mono text-sm">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? '遊戲結束' : '輸入指令...'}
          className="flex-1 bg-transparent text-slate-200 font-mono text-sm outline-none placeholder:text-slate-600"
          autoFocus
        />
      </form>
    </div>
  );
}
