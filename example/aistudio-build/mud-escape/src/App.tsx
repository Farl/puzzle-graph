import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Package, Key, Lock as LockIcon, Unlock, Eye, Hand, ChevronRight, RefreshCw, LogIn, Wrench, DoorOpen } from 'lucide-react';
import { GameState, Lock, Item } from './game/types';
import { initGame, executeCommand } from './game/engine';

export default function App() {
  const [depth, setDepth] = useState(6);
  const [maxRooms, setMaxRooms] = useState(3);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const logEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Modal states
  const [useModalOpen, setUseModalOpen] = useState(false);
  const [enterModalOpen, setEnterModalOpen] = useState(false);
  const [selectedLock, setSelectedLock] = useState<Lock | null>(null);
  const [passwordInput, setPasswordInput] = useState('');

  useEffect(() => {
    startNewGame();
  }, []);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [gameState?.history]);

  useEffect(() => {
    if (!gameState) return;
    
    const cmds = ['look', 'inventory', 'examine', 'take', 'use', 'enter', 'go', 'help'];
    const currentRoom = gameState.rooms[gameState.currentRoomId];
    const visibleItems = currentRoom.visibleItems.map(id => gameState.items[id].name);
    const inventoryItems = gameState.inventory.map(id => gameState.items[id].name);
    const locks = currentRoom.locks.map(id => gameState.locks[id].name);
    const unlockedDoors = currentRoom.locks.map(id => gameState.locks[id]).filter(l => !l.isLocked && l.targetRoomId).map(l => l.name);

    let newSuggestions: string[] = [];
    const lowerInput = input.toLowerCase();

    if (lowerInput === '') {
      setSuggestions([]);
      return;
    }

    const parts = lowerInput.split(' ');
    const verb = parts[0];

    if (parts.length === 1) {
      newSuggestions = cmds.filter(c => c.startsWith(verb));
    } else {
      const rest = parts.slice(1).join(' ');
      if (verb === 'examine' || verb === 'x') {
        newSuggestions = [...visibleItems, ...inventoryItems, ...locks].filter(n => n.toLowerCase().includes(rest)).map(n => `${verb} ${n}`);
      } else if (verb === 'take' || verb === 't') {
        newSuggestions = visibleItems.filter(n => n.toLowerCase().includes(rest)).map(n => `${verb} ${n}`);
      } else if (verb === 'use') {
        if (rest.includes(' on ')) {
          const [item, lockPart] = rest.split(' on ');
          newSuggestions = locks.filter(n => n.toLowerCase().includes(lockPart)).map(n => `use ${item} on ${n}`);
        } else {
          newSuggestions = inventoryItems.filter(n => n.toLowerCase().includes(rest)).map(n => `use ${n} on `);
        }
      } else if (verb === 'enter') {
        if (rest.includes(' on ')) {
          const [pwd, lockPart] = rest.split(' on ');
          newSuggestions = locks.filter(n => n.toLowerCase().includes(lockPart)).map(n => `enter ${pwd} on ${n}`);
        } else {
          newSuggestions = [`enter ${rest} on `];
        }
      } else if (verb === 'go') {
        newSuggestions = unlockedDoors.filter(n => n.toLowerCase().includes(rest)).map(n => `go ${n}`);
      }
    }

    setSuggestions(newSuggestions);
    setActiveSuggestion(0);
  }, [input, gameState]);

  const startNewGame = () => {
    setGameState(initGame(depth, maxRooms));
    setInput('');
    setSuggestions([]);
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !gameState) return;
    setGameState(executeCommand(input, gameState));
    setInput('');
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestion(prev => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestion(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setInput(suggestions[activeSuggestion]);
      }
    }
  };

  const handleQuickAction = (cmd: string) => {
    if (!gameState) return;
    setGameState(executeCommand(cmd, gameState));
  };

  const openUseModal = (lock: Lock) => {
    setSelectedLock(lock);
    setUseModalOpen(true);
  };

  const openEnterModal = (lock: Lock) => {
    setSelectedLock(lock);
    setPasswordInput('');
    setEnterModalOpen(true);
  };

  const submitUse = (item: Item) => {
    if (selectedLock) {
      handleQuickAction(`use ${item.name} on ${selectedLock.name}`);
    }
    setUseModalOpen(false);
  };

  const submitEnter = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLock && passwordInput) {
      handleQuickAction(`enter ${passwordInput} on ${selectedLock.name}`);
    }
    setEnterModalOpen(false);
  };

  if (!gameState) return <div className="min-h-screen bg-zinc-950 text-zinc-300 flex items-center justify-center">載入中...</div>;

  const currentRoom = gameState.rooms[gameState.currentRoomId];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-mono flex flex-col md:flex-row relative">
      {/* Main Game Area */}
      <div className="flex-1 flex flex-col h-screen max-h-screen border-r border-zinc-800">
        {/* Header */}
        <div className="bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400">
            <Terminal size={20} />
            <h1 className="font-bold tracking-wider">MUD ESCAPE</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">難度深度:</span>
              <select 
                value={depth} 
                onChange={(e) => setDepth(Number(e.target.value))}
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300 focus:outline-none focus:border-emerald-500"
              >
                <option value={2}>2 (簡單)</option>
                <option value={4}>4 (普通)</option>
                <option value={6}>6 (困難)</option>
                <option value={8}>8 (極限)</option>
                <option value={10}>10 (瘋狂)</option>
                <option value={15}>15 (不可能)</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">房間數量:</span>
              <select 
                value={maxRooms} 
                onChange={(e) => setMaxRooms(Number(e.target.value))}
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300 focus:outline-none focus:border-emerald-500"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            </div>
            <button 
              onClick={startNewGame}
              className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded transition-colors"
            >
              <RefreshCw size={14} />
              <span>重新產生</span>
            </button>
          </div>
        </div>

        {/* Terminal Output */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {gameState.history.map((entry) => (
            <div 
              key={entry.id} 
              className={`
                ${entry.type === 'user' ? 'text-zinc-500' : ''}
                ${entry.type === 'system' ? 'text-zinc-300' : ''}
                ${entry.type === 'error' ? 'text-red-400' : ''}
                ${entry.type === 'success' ? 'text-emerald-400 font-bold' : ''}
                whitespace-pre-wrap
              `}
            >
              {entry.text}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 relative">
          {suggestions.length > 0 && (
            <div className="absolute bottom-full left-0 w-full bg-zinc-800 border-t border-x border-zinc-700 rounded-t shadow-lg overflow-hidden z-10">
              {suggestions.map((s, i) => (
                <div 
                  key={s} 
                  className={`px-4 py-2 cursor-pointer ${i === activeSuggestion ? 'bg-zinc-700 text-emerald-400' : 'hover:bg-zinc-700/50'}`}
                  onClick={() => {
                    setInput(s);
                    setSuggestions([]);
                    inputRef.current?.focus();
                  }}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleCommand} className="flex items-center gap-2">
            <ChevronRight size={20} className="text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="輸入指令 (Tab 自動完成)..."
              className="flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder-zinc-700"
              autoFocus
              disabled={gameState.isGameOver}
            />
          </form>
        </div>
      </div>

      {/* Sidebar - Status & Quick Actions */}
      <div className="w-full md:w-80 bg-zinc-900 h-screen overflow-y-auto flex flex-col">
        <div className="p-4 border-b border-zinc-800 bg-zinc-950/50">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
            <DoorOpen size={14} />
            當前位置
          </h2>
          <div className="text-emerald-400 font-bold">{currentRoom.name}</div>
        </div>

        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Package size={14} />
            你的背包
          </h2>
          {gameState.inventory.length === 0 ? (
            <div className="text-sm text-zinc-600 italic">背包是空的</div>
          ) : (
            <div className="space-y-2">
              {gameState.inventory.map(id => {
                const item = gameState.items[id];
                return (
                  <div key={id} className="flex items-center justify-between bg-zinc-800/50 p-2 rounded border border-zinc-800">
                    <div className="flex items-center gap-2 text-sm">
                      <Key size={14} className="text-amber-400" />
                      <span>{item.name}</span>
                    </div>
                    <button 
                      onClick={() => handleQuickAction(`examine ${item.name}`)}
                      className="text-zinc-500 hover:text-zinc-300"
                      title="檢查"
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Eye size={14} />
            可見物品
          </h2>
          {currentRoom.visibleItems.length === 0 ? (
            <div className="text-sm text-zinc-600 italic">地上沒有東西</div>
          ) : (
            <div className="space-y-2">
              {currentRoom.visibleItems.map(id => {
                const item = gameState.items[id];
                return (
                  <div key={id} className="flex items-center justify-between bg-zinc-800/50 p-2 rounded border border-zinc-800">
                    <div className="flex items-center gap-2 text-sm">
                      <Package size={14} className="text-blue-400" />
                      <span>{item.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleQuickAction(`examine ${item.name}`)}
                        className="text-zinc-500 hover:text-zinc-300"
                        title="檢查"
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        onClick={() => handleQuickAction(`take ${item.name}`)}
                        className="text-zinc-500 hover:text-emerald-400"
                        title="拾取"
                      >
                        <Hand size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <LockIcon size={14} />
            場景機關
          </h2>
          <div className="space-y-2">
            {currentRoom.locks.map(lockId => {
              const lock = gameState.locks[lockId];
              return (
                <div key={lock.id} className="flex flex-col gap-2 bg-zinc-800/50 p-2 rounded border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      {lock.isLocked ? (
                        <LockIcon size={14} className="text-red-400" />
                      ) : (
                        <Unlock size={14} className="text-emerald-400" />
                      )}
                      <span className={lock.isLocked ? 'text-zinc-300' : 'text-zinc-500 line-through'}>
                        {lock.name}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleQuickAction(`examine ${lock.name}`)}
                        className="text-zinc-500 hover:text-zinc-300"
                        title="檢查"
                      >
                        <Eye size={14} />
                      </button>
                      {lock.isLocked && (lock.type === 'password' || (lock.type === 'door' && lock.password)) && (
                        <button 
                          onClick={() => openEnterModal(lock)}
                          className="text-zinc-500 hover:text-amber-400"
                          title="輸入密碼"
                        >
                          <LogIn size={14} />
                        </button>
                      )}
                      {lock.isLocked && lock.type !== 'password' && !(lock.type === 'door' && lock.password) && (
                        <button 
                          onClick={() => openUseModal(lock)}
                          className="text-zinc-500 hover:text-blue-400"
                          title="使用物品"
                        >
                          <Wrench size={14} />
                        </button>
                      )}
                      {!lock.isLocked && lock.targetRoomId && (
                        <button 
                          onClick={() => handleQuickAction(`go ${lock.name}`)}
                          className="text-emerald-400 hover:text-emerald-300"
                          title="進入"
                        >
                          <DoorOpen size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Use Item Modal */}
      {useModalOpen && selectedLock && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-lg max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4 text-zinc-100">對 {selectedLock.name} 使用物品</h3>
            {gameState.inventory.length === 0 ? (
              <p className="text-zinc-500 mb-4">你的背包是空的。</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                {gameState.inventory.map(id => {
                  const item = gameState.items[id];
                  return (
                    <button
                      key={id}
                      onClick={() => submitUse(item)}
                      className="w-full text-left px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex justify-end">
              <button 
                onClick={() => setUseModalOpen(false)}
                className="px-4 py-2 text-zinc-400 hover:text-zinc-200"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enter Password Modal */}
      {enterModalOpen && selectedLock && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-lg max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4 text-zinc-100">輸入 {selectedLock.name} 的密碼</h3>
            <form onSubmit={submitEnter}>
              <input
                type="text"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 text-zinc-100 mb-4 focus:outline-none focus:border-emerald-500"
                autoFocus
                placeholder="請輸入密碼..."
              />
              <div className="flex justify-end gap-2">
                <button 
                  type="button"
                  onClick={() => setEnterModalOpen(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-zinc-200"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded"
                >
                  確認
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
