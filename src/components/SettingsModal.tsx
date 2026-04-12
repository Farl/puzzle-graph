import { useState } from 'react';
import { X, RefreshCw, RotateCcw } from 'lucide-react';
import type { GeneratorConfig } from '../game/types';

interface Props {
  config: GeneratorConfig;
  defaultConfig: GeneratorConfig;
  onApply: (config: GeneratorConfig) => void;
  onClose: () => void;
}

/** 只列出必填的數值欄位，用於 slider UI */
type NumericConfigKey = 'targetDepth' | 'maxRooms' | 'compositeRate' | 'depthStaggerVariance' | 'keySpreadRate' | 'crossRoomRate' | 'reuseRate' | 'maxNestingDepth' | 'consolidationRate' | 'stateLockRate';

interface SliderConfig {
  key: NumericConfigKey;
  label: string;
  desc: string;
  min: number;
  max: number;
  step: number;
  color: string;
}

const SLIDERS: SliderConfig[] = [
  { key: 'targetDepth', label: '謎題深度', desc: '容器鎖總數，越高解謎步驟越多', min: 1, max: 20, step: 1, color: 'accent-purple-500' },
  { key: 'maxRooms', label: '房間數量', desc: '關卡中的房間數', min: 1, max: 10, step: 1, color: 'accent-cyan-500' },
  { key: 'compositeRate', label: '組合鎖機率', desc: '需要多把鑰匙才能開的鎖出現機率', min: 0, max: 1, step: 0.1, color: 'accent-amber-500' },
  { key: 'depthStaggerVariance', label: '深度偏差', desc: '同一鎖的多把鑰匙之間的深度差異', min: 0, max: 2, step: 0.1, color: 'accent-blue-500' },
  { key: 'keySpreadRate', label: '門鑰匙分散率', desc: '門鑰匙放到較遠房間的機率', min: 0, max: 1, step: 0.1, color: 'accent-emerald-500' },
  { key: 'crossRoomRate', label: '跨房間鑰匙率', desc: '容器鎖鑰匙跨房間放置的機率', min: 0, max: 1, step: 0.1, color: 'accent-rose-500' },
  { key: 'reuseRate', label: '工具復用率', desc: '已有工具被其他鎖重複使用的機率', min: 0, max: 1, step: 0.1, color: 'accent-orange-500' },
  { key: 'maxNestingDepth', label: '容器嵌套層數', desc: '容器最大嵌套深度（0=不嵌套）', min: 0, max: 5, step: 1, color: 'accent-violet-500' },
  { key: 'consolidationRate', label: '收納密度', desc: '越高越多東西藏在容器裡', min: 0, max: 1, step: 0.1, color: 'accent-teal-500' },
  { key: 'stateLockRate', label: '狀態鎖機率', desc: '地板物品被狀態鎖（可拾取）包裹的機率', min: 0, max: 1, step: 0.1, color: 'accent-pink-500' },
];

export default function SettingsModal({ config, defaultConfig, onApply, onClose }: Props) {
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

  const handleReset = () => {
    setDraft({ ...defaultConfig });
    setSeedInput('');
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl p-4 md:p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-100">生成參數設定</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Seed input */}
        <div className="mb-3">
          <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
            <span>亂數種子</span>
            <span className="text-slate-500">留空 = 隨機</span>
          </div>
          <input
            type="text"
            inputMode="numeric"
            value={seedInput}
            onChange={e => setSeedInput(e.target.value)}
            placeholder="例：12345（輸入相同種子可重現關卡）"
            className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
          />
        </div>

        <div className="space-y-2.5">
          {SLIDERS.map(({ key, label, desc, min, max, step, color }) => (
            <div key={key}>
              <div className="flex justify-between items-baseline text-[11px] text-slate-400 mb-0.5">
                <span>
                  {label}
                  <span className="text-slate-600 ml-1.5">{desc}</span>
                </span>
                <span className="text-slate-200 font-mono ml-2 shrink-0">{draft[key]}</span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={draft[key]}
                onChange={e => update(key, parseFloat(e.target.value))}
                className={`w-full h-1.5 ${color}`}
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleReset}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <RotateCcw size={13} />
            重置預設
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
          >
            <RefreshCw size={13} />
            套用並重新生成
          </button>
        </div>
      </div>
    </div>
  );
}
