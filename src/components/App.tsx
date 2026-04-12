import { useState, useEffect } from 'react';
import { Terminal, Settings as SettingsIcon, Hand, Eye, Copy } from 'lucide-react';
import { useGameState, DEFAULT_CONFIG } from '../hooks/useGameState';
import TerminalLog from './TerminalLog';
import CommandInput from './CommandInput';
import InteractionPanel from './InteractionPanel';
import CanvasGraph from './CanvasGraph';
import SettingsModal from './SettingsModal';

type Tab = 'game' | 'graph';
type MobileTab = 'controls' | 'view';

export default function App() {
  const {
    gameState,
    originalPuzzle,
    config,
    selectedItem,
    setSelectedItem,
    startNewGame,
    dispatch,
    takeItem,
    useItemOnLock,
    enterPassword,
    moveToRoom,
    inspectEntity,
    completeMinigame,
    dump,
  } = useGameState(DEFAULT_CONFIG);

  const [activeTab, setActiveTab] = useState<Tab>('game');
  const [mobileTab, setMobileTab] = useState<MobileTab>('controls');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showCommandInput, setShowCommandInput] = useState(false);

  useEffect(() => {
    startNewGame();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!gameState) return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-slate-400">
      正在載入圖譜引擎...
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-300 font-sans flex flex-col overflow-hidden">

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row gap-3 md:gap-4 p-2 md:p-6 overflow-hidden min-h-0">

        {/* Left panel: log / graph */}
        <div className={`flex-1 flex-col border border-slate-800 rounded-xl bg-slate-900 overflow-hidden shadow-xl min-h-0 relative ${mobileTab === 'view' ? 'flex' : 'hidden md:flex'}`}>
          {/* Panel header with tabs + settings */}
          <div className="bg-slate-800/80 px-3 md:px-4 py-2.5 md:py-3 flex justify-between items-center border-b border-slate-700/50 shrink-0 backdrop-blur-md z-10">
            <div className="flex items-center gap-2 text-slate-200 font-bold text-sm tracking-wide">
              <Terminal size={16} className="text-cyan-400" /> 系統日誌與分析
            </div>
            <div className="flex gap-1.5 md:gap-2 items-center">
              <button
                onClick={() => setActiveTab('game')}
                className={`px-2.5 py-1.5 text-[11px] md:text-xs font-bold rounded transition-colors ${
                  activeTab === 'game' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                文字介面
              </button>
              <button
                onClick={() => setActiveTab('graph')}
                className={`px-2.5 py-1.5 text-[11px] md:text-xs font-bold rounded transition-colors ${
                  activeTab === 'graph' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                Canvas 圖譜
              </button>
              <div className="w-px h-4 bg-slate-600 mx-0.5" />
              <button
                onClick={() => setShowCommandInput(prev => !prev)}
                className={`p-1.5 rounded text-slate-300 transition-colors ${
                  showCommandInput ? 'bg-emerald-700' : 'bg-slate-700 hover:bg-slate-600'
                }`}
                title="切換指令列"
              >
                <Terminal size={14} />
              </button>
              {originalPuzzle && (
                <span
                  className="text-[10px] text-slate-500 font-mono bg-slate-950 px-2 py-1 rounded cursor-pointer hover:text-slate-300 transition-colors"
                  title="點擊複製種子"
                  onClick={() => navigator.clipboard.writeText(String(originalPuzzle.seed))}
                >
                  Seed: {originalPuzzle.seed}
                </span>
              )}
              <button
                onClick={() => {
                  const dumpText = dump();
                  console.log(dumpText);
                  navigator.clipboard.writeText(dumpText);
                }}
                className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                title="複製謎題結構至剪貼板"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                title="設定"
              >
                <SettingsIcon size={14} />
              </button>
            </div>
          </div>

          {/* Tab content */}
          {activeTab === 'game' ? (
            <div className="flex-1 flex flex-col min-h-0">
              <TerminalLog history={gameState.history} />
              {showCommandInput && (
                <CommandInput
                  gameState={gameState}
                  onCommand={dispatch}
                  disabled={gameState.isGameOver}
                />
              )}
            </div>
          ) : (
            <div className="flex-1 w-full h-full relative">
              <CanvasGraph puzzle={originalPuzzle ?? gameState.puzzle} />
            </div>
          )}
        </div>

        {/* Right panel: interaction */}
        <div className={`w-full md:w-[22rem] flex-col gap-3 h-full shrink-0 ${mobileTab === 'controls' ? 'flex' : 'hidden md:flex'}`}>

          {/* Mobile mini-log */}
          <div className="md:hidden bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] font-mono leading-relaxed h-[3.5rem] overflow-y-auto shrink-0 flex flex-col justify-end shadow-inner">
            {gameState.history.slice(-2).map((l) => (
              <div key={l.id} className={`truncate ${
                l.type === 'error' ? 'text-rose-400'
                : l.type === 'success' ? 'text-emerald-400'
                : l.type === 'info' ? 'text-amber-300'
                : 'text-slate-400'
              }`}>
                {l.text}
              </div>
            ))}
          </div>

          {/* Interaction panel */}
          <div className="border border-slate-800 rounded-xl bg-slate-900 flex flex-col min-h-0 flex-1 shrink-0 shadow-lg overflow-hidden">
            <InteractionPanel
              gameState={gameState}
              selectedItem={selectedItem}
              onTakeItem={takeItem}
              onUseItemOnLock={useItemOnLock}
              onEnterPassword={enterPassword}
              onMoveToRoom={moveToRoom}
              onInspect={inspectEntity}
              onCompleteMinigame={completeMinigame}
            />
          </div>

          {/* Inventory */}
          <InventoryPanel
            gameState={gameState}
            selectedItem={selectedItem}
            onSelectItem={setSelectedItem}
            onInspect={inspectEntity}
          />
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 border-t border-slate-800 p-2 shrink-0 z-20 px-3 shadow-[0_-4px_10px_rgba(0,0,0,0.3)]">
        <button
          onClick={() => setMobileTab('controls')}
          className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-colors ${
            mobileTab === 'controls'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
              : 'text-slate-500'
          }`}
        >
          <Hand size={16} /> 探索操作
        </button>
        <div className="w-px h-6 bg-slate-800 mx-2" />
        <button
          onClick={() => setMobileTab('view')}
          className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-colors ${
            mobileTab === 'view'
              ? 'bg-purple-600/20 text-purple-400 border border-purple-600/30'
              : 'text-slate-500'
          }`}
        >
          <Eye size={16} /> 監控圖譜
        </button>
      </div>

      {/* Settings modal */}
      {isSettingsOpen && (
        <SettingsModal
          config={config}
          defaultConfig={DEFAULT_CONFIG}
          onApply={cfg => startNewGame(cfg)}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Inventory sub-component ───

import { Package, MousePointerClick, Search as SearchIcon } from 'lucide-react';
import type { GameState, ItemId } from '../game/types';

function InventoryPanel({
  gameState,
  selectedItem,
  onSelectItem,
  onInspect,
}: {
  gameState: GameState;
  selectedItem: ItemId | null;
  onSelectItem: (id: ItemId | null) => void;
  onInspect: (entityId: string) => void;
}) {
  const { puzzle, inventory } = gameState;

  return (
    <div className="border border-slate-800 rounded-xl p-3 md:p-4 bg-slate-900 shrink-0 h-[30%] md:h-[35%] flex flex-col shadow-lg">
      <h3 className="text-slate-200 font-bold mb-2 md:mb-3 flex items-center justify-between text-xs md:text-sm shrink-0">
        <span className="flex items-center gap-1.5">
          <Package size={14} className="text-slate-400" /> 隨身背包
        </span>
        <span className="text-[10px] text-slate-500 font-normal bg-slate-950 px-2 py-0.5 rounded-full">
          {inventory.length} 件物品
        </span>
      </h3>
      <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 pr-1 flex-1">
        {inventory.length === 0 ? (
          <span className="text-[11px] text-slate-600 block bg-slate-950/50 p-3 rounded text-center mt-1 border border-slate-800 border-dashed">
            背包空空如也
          </span>
        ) : (
          <div className="flex flex-col gap-1.5 md:gap-2">
            {inventory.map(itemId => {
              const item = puzzle.items[itemId];
              const lock = item ? null : puzzle.locks[itemId];
              const entity = item ?? lock;
              if (!entity) return null;
              const isSelected = selectedItem === itemId;
              const badgeLabel = item
                ? (item.reusable ? '工具' : item.type === 'clue' ? '線索' : '道具')
                : '裝置';
              return (
                <div key={itemId} className={`flex rounded border overflow-hidden shadow-sm transition-all ${
                  isSelected
                    ? 'bg-blue-900 border-blue-400 ring-2 ring-blue-500/30'
                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                }`}>
                  <button
                    onClick={() => onSelectItem(isSelected ? null : itemId)}
                    className="flex-1 text-left px-2.5 py-2 md:py-2.5 text-[11px] md:text-xs flex items-center gap-1.5 truncate"
                  >
                    <MousePointerClick size={12} className={`shrink-0 ${isSelected ? 'text-blue-300' : 'text-slate-500'}`} />
                    <span className={`truncate font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{entity.name}</span>
                    <span className={`text-[9px] px-1 rounded flex items-center gap-0.5 border shrink-0 ml-auto ${
                      isSelected ? 'text-blue-200 bg-blue-950 border-blue-700' : 'text-slate-400 bg-slate-900 border-slate-800'
                    }`}>
                      <Package size={8} /> {badgeLabel}
                    </span>
                  </button>
                  <button
                    onClick={() => onInspect(itemId)}
                    className={`px-3 py-2 md:py-2.5 shrink-0 active:bg-slate-600 ${
                      isSelected ? 'text-blue-200 border-l border-blue-700' : 'text-slate-400 border-l border-slate-700'
                    }`}
                  >
                    <SearchIcon size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
