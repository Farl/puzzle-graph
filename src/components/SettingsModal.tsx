import { useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import type { GeneratorConfig } from '../game/types';

interface Props {
  config: GeneratorConfig;
  onApply: (config: GeneratorConfig) => void;
  onClose: () => void;
}

/** 只列出必填的數值欄位，用於 slider UI */
type NumericConfigKey = 'targetDepth' | 'maxRooms' | 'compositeRate' | 'depthStaggerVariance' | 'keySpreadRate' | 'crossRoomRate';

interface SliderConfig {
  key: NumericConfigKey;
  label: string;
  min: number;
  max: number;
  step: number;
  color: string;
}

const SLIDERS: SliderConfig[] = [
  { key: 'targetDepth', label: '謎題深度', min: 1, max: 10, step: 1, color: 'accent-purple-500' },
  { key: 'maxRooms', label: '最大房間數', min: 3, max: 10, step: 1, color: 'accent-cyan-500' },
  { key: 'compositeRate', label: '組合鎖機率', min: 0, max: 1, step: 0.1, color: 'accent-amber-500' },
  { key: 'depthStaggerVariance', label: '深度偏差', min: 0, max: 2, step: 0.1, color: 'accent-blue-500' },
  { key: 'keySpreadRate', label: '門鑰匙分散率', min: 0, max: 1, step: 0.1, color: 'accent-emerald-500' },
  { key: 'crossRoomRate', label: '跨房間鑰匙率', min: 0, max: 1, step: 0.1, color: 'accent-rose-500' },
];

export default function SettingsModal({ config, onApply, onClose }: Props) {
  const [draft, setDraft] = useState<GeneratorConfig>({ ...config });
  const [seedInput, setSeedInput] = useState<string>(config.seed != null ? String(config.seed) : '');

  const update = (key: NumericConfigKey, value: number) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    const trimmed = seedInput.trim();
    const seed = trimmed === '' ? undefined : parseInt(trimmed, 10);
    const finalConfig = { ...draft, seed: Number.isNaN(seed) ? undefined : seed };
    onApply(finalConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-100">生成參數設定</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Seed input */}
        <div className="mb-5">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>亂數種子</span>
            <span className="text-slate-500">留空 = 隨機</span>
          </div>
          <input
            type="text"
            inputMode="numeric"
            value={seedInput}
            onChange={e => setSeedInput(e.target.value)}
            placeholder="例：12345"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
          />
        </div>

        <div className="space-y-5">
          {SLIDERS.map(({ key, label, min, max, step, color }) => (
            <div key={key}>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>{label}</span>
                <span className="text-slate-200 font-mono">{draft[key]}</span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={draft[key]}
                onChange={e => update(key, parseFloat(e.target.value))}
                className={`w-full ${color}`}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleApply}
          className="w-full mt-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <RefreshCw size={16} />
          套用並重新生成
        </button>
      </div>
    </div>
  );
}
