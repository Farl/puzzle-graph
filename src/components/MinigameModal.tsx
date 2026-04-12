import type React from 'react';
import { X } from 'lucide-react';
import type { MinigameConfig } from '../game/types';
import PipePuzzle from './minigames/PipePuzzle';
import WiringPuzzle from './minigames/WiringPuzzle';

interface Props {
  config: MinigameConfig;
  lockName: string;
  onComplete: () => void;
  onClose: () => void;
}

const MINIGAME_COMPONENTS: Record<
  string,
  React.ComponentType<{ config: MinigameConfig; onComplete: () => void }>
> = {
  pipe_puzzle: PipePuzzle,
  wiring: WiringPuzzle,
};

export default function MinigameModal({ config, lockName, onComplete, onClose }: Props) {
  const MinigameComponent = MINIGAME_COMPONENTS[config.type];

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-100">解謎機關</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          解開 <span className="text-amber-400">{lockName}</span> 的謎題
        </p>

        {MinigameComponent ? (
          <MinigameComponent config={config} onComplete={onComplete} />
        ) : (
          <p className="text-xs text-red-400 text-center py-4">
            未知的謎題類型：{config.type}
          </p>
        )}
      </div>
    </div>
  );
}
