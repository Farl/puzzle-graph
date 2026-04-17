import { useState } from 'react';
import { Key, Search, DoorOpen, Map as MapIcon, Anchor } from 'lucide-react';
import type { GameState, ItemId, LockId } from '../game/types';
import { getReturnDoors } from '../game/engine';
import PasswordModal from './PasswordModal';
import MinigameModal from './MinigameModal';

function isNpcLock(lock: { pickupable: boolean; stateTags?: string[]; category: string }): boolean {
  return lock.category === 'container' && !lock.pickupable
    && !!lock.stateTags && lock.stateTags.length > 0;
}

interface Props {
  gameState: GameState;
  selectedItem: ItemId | null;
  onTakeItem: (id: ItemId) => void;
  onUseItemOnLock: (itemId: ItemId, lockId: LockId) => void;
  onEnterPassword: (password: string, lockId: LockId) => void;
  onMoveToRoom: (lockId: LockId) => void;
  onInspect: (entityId: string) => void;
  onCompleteMinigame: (lockId: LockId) => void;
}

export default function InteractionPanel({
  gameState,
  selectedItem,
  onTakeItem,
  onUseItemOnLock,
  onEnterPassword,
  onMoveToRoom,
  onInspect,
  onCompleteMinigame,
}: Props) {
  const [passwordLockId, setPasswordLockId] = useState<LockId | null>(null);
  const [minigameLockId, setMinigameLockId] = useState<LockId | null>(null);

  const { puzzle, currentRoomId } = gameState;
  const room = puzzle.rooms[currentRoomId]!;

  // Visible items: pickupable items + pickupable locks
  const pickupableItems: typeof puzzle.items[string][] = [];
  const stationaryItems: typeof puzzle.items[string][] = [];
  for (const id of room.visibleItems) {
    const item = puzzle.items[id]!;
    (item.pickupable ? pickupableItems : stationaryItems).push(item);
  }
  const pickupableLocks: typeof puzzle.locks[string][] = [];
  const nonPickupableLocks: typeof puzzle.locks[string][] = [];
  for (const lock of room.lockIds.map(id => puzzle.locks[id]!)) {
    (lock.pickupable ? pickupableLocks : nonPickupableLocks).push(lock);
  }
  const locks = [...nonPickupableLocks, ...getReturnDoors(puzzle, currentRoomId)];

  const passwordLock = passwordLockId ? puzzle.locks[passwordLockId] : null;
  const minigameLock = minigameLockId ? puzzle.locks[minigameLockId] : null;

  const handleUse = (lockId: LockId) => {
    const lock = puzzle.locks[lockId]!;
    if (lock.mechanism === 'password') {
      setPasswordLockId(lockId);
    } else if (lock.mechanism === 'minigame') {
      const allInserted = lock.requiredItems.every(r => lock.insertedItems.includes(r));
      if (allInserted) {
        setMinigameLockId(lockId);
      } else if (selectedItem) {
        onUseItemOnLock(selectedItem, lockId);
      }
    } else if (selectedItem) {
      onUseItemOnLock(selectedItem, lockId);
    }
  };

  /** Handle "使用" on a stationary item (non-pickupable Item).
   * If the selected inventory entity is a Lock, the stationary item is the key and the lock is the target.
   * Two-item case (both keys) is invalid — do nothing. */
  const handleUseOnStationaryItem = (stationaryItemId: ItemId) => {
    if (!selectedItem) return;
    const selectedIsLock = !!puzzle.locks[selectedItem];
    if (selectedIsLock) {
      onUseItemOnLock(stationaryItemId, selectedItem as LockId);
    }
    // selectedItem is an Item → two keys, no lock → invalid, ignore
  };

  return (
    <div className="flex flex-col h-full">
      {/* Room header */}
      <div className="p-3 md:p-4 border-b border-slate-800 shrink-0 bg-slate-800/30 rounded-t-xl">
        <h3 className="text-slate-100 font-bold mb-1 flex items-center gap-2 text-sm md:text-base">
          <MapIcon size={16} className="text-cyan-400" /> {room.name}
        </h3>
        <p className="text-[11px] md:text-xs text-slate-400 leading-relaxed">{room.description}</p>
      </div>

      {/* Split scrollable sections */}
      <div className="flex flex-col flex-1 min-h-0">

        {/* Visible items — independent scroll */}
        <div className="flex flex-col min-h-0 max-h-[40%] border-b border-slate-800/50">
          <h4 className="text-[10px] md:text-[11px] text-slate-500 uppercase tracking-widest px-3 md:px-4 pt-3 md:pt-3 pb-1.5 font-bold flex items-center gap-1.5 shrink-0">
            <Search size={12} /> 此處的可見物品
            {(pickupableItems.length + pickupableLocks.length) > 0 && (
              <span className="text-slate-600 font-normal">({pickupableItems.length + pickupableLocks.length})</span>
            )}
          </h4>
          <div className="px-3 md:px-4 pb-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 flex-1 min-h-0">
            {pickupableItems.length === 0 && pickupableLocks.length === 0 ? (
              <span className="text-[11px] text-slate-600 block bg-slate-950/50 p-2 rounded border border-slate-800 border-dashed text-center">
                空無一物
              </span>
            ) : (
              <div className="flex flex-col gap-1.5 md:gap-2">
                {pickupableItems.map(item => (
                  <div key={item.id} className="flex bg-slate-800 rounded border border-slate-700 overflow-hidden shadow-sm hover:border-slate-600 active:bg-slate-700">
                    <button
                      onClick={() => onTakeItem(item.id)}
                      className="flex-1 text-emerald-400 px-3 py-2 md:py-2.5 text-xs text-left truncate font-bold"
                    >
                      + 拿取 {item.name}
                    </button>
                    <button
                      onClick={() => onInspect(item.id)}
                      className="text-slate-400 px-3 py-2 md:py-2.5 border-l border-slate-700 shrink-0 active:bg-slate-600"
                    >
                      <Search size={14} />
                    </button>
                  </div>
                ))}
                {pickupableLocks.map(lock => (
                  <div key={lock.id} className="flex bg-slate-800 rounded border border-slate-700 overflow-hidden shadow-sm hover:border-slate-600 active:bg-slate-700">
                    <button
                      onClick={() => onTakeItem(lock.id)}
                      className="flex-1 text-emerald-400 px-3 py-2 md:py-2.5 text-xs text-left truncate font-bold"
                    >
                      + 拿取 {lock.name}
                    </button>
                    <button
                      onClick={() => onInspect(lock.id)}
                      className="text-slate-400 px-3 py-2 md:py-2.5 border-l border-slate-700 shrink-0 active:bg-slate-600"
                    >
                      <Search size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Locks & Paths — independent scroll */}
        <div className="flex flex-col min-h-0 flex-1">
          <h4 className="text-[10px] md:text-[11px] text-slate-500 uppercase tracking-widest px-3 md:px-4 pt-2 pb-1.5 font-bold flex items-center gap-1.5 shrink-0">
            <Key size={12} /> 機關與通道
          </h4>
          <div className="px-3 md:px-4 pb-3 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 flex-1 min-h-0">
          <div className="flex flex-col gap-1.5 md:gap-2">
            {/* Stationary items (non-pickupable) — use targets */}
            {stationaryItems.map(item => {
              const canUse = !!selectedItem && !!puzzle.locks[selectedItem];
              return (
                <div key={item.id} className="flex gap-1">
                  <button
                    onClick={() => onInspect(item.id)}
                    className="px-2.5 py-2 rounded text-[11px] md:text-xs border flex-1 text-left flex items-center gap-1.5 truncate shadow-sm bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-orange-200 border-orange-900/50"
                  >
                    <Anchor size={14} className="shrink-0 opacity-70 text-orange-400" />
                    <span className="truncate">{item.name}</span>
                  </button>
                  <button
                    onClick={() => handleUseOnStationaryItem(item.id)}
                    className={`px-3 py-2 rounded text-[11px] md:text-xs border shrink-0 font-bold shadow-sm ${
                      canUse
                        ? 'bg-blue-900 border-blue-600 text-blue-100 active:bg-blue-800'
                        : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                    disabled={!canUse}
                  >
                    使用
                  </button>
                </div>
              );
            })}
            {locks.map(lock => {
              const isSpatial = lock.category === 'spatial';
              const isUnlocked = !lock.isLocked;
              const isLocal = lock.roomId === currentRoomId;
              const isNpc = isNpcLock(lock);
              const progStr = (lock.isLocked && lock.insertedItems.length > 0)
                ? `(${lock.insertedItems.length}/${lock.requiredItems.length})`
                : '';
              const destRoomId = isSpatial && lock.targetRoomId
                ? (isLocal ? lock.targetRoomId : lock.roomId)
                : null;
              const destName = destRoomId ? puzzle.rooms[destRoomId]?.name : null;

              return (
                <div key={lock.id} className="flex gap-1">
                  <button
                    onClick={() => onInspect(lock.id)}
                    className={`px-2.5 py-2 rounded text-[11px] md:text-xs border flex-1 text-left flex items-center gap-1.5 truncate shadow-sm ${
                      isSpatial && !isLocal
                        ? 'bg-sky-950 hover:bg-sky-900 active:bg-sky-800 text-sky-200 border-sky-800'
                        : isNpc
                          ? 'bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-indigo-200 border-indigo-900/60'
                          : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-amber-200 border-slate-700'
                    }`}
                  >
                    {isSpatial
                      ? <DoorOpen size={14} className="shrink-0 opacity-70" />
                      : <Key size={14} className="shrink-0 opacity-70" />
                    }
                    <span className="truncate">
                      {lock.name}
                      {isUnlocked
                        ? <span className={`ml-1 ${isSpatial && !isLocal ? 'text-sky-400' : 'text-emerald-400'}`}>
                            (已解開){destName ? ` → ${destName}` : ''}
                          </span>
                        : <span className="text-slate-400 ml-1">{progStr}</span>
                      }
                    </span>
                  </button>

                  {lock.isLocked && (() => {
                    const isPassword = lock.mechanism === 'password';
                    const isMinigame = lock.mechanism === 'minigame';
                    const minigameReady = isMinigame &&
                      lock.requiredItems.every(r => lock.insertedItems.includes(r));
                    const isEnabled = isPassword || minigameReady || !!selectedItem;
                    const btnLabel = isPassword ? '密碼' : minigameReady ? '挑戰' : isNpc ? '出示' : '使用';
                    const btnClass = isPassword
                      ? 'bg-amber-900 border-amber-700 text-amber-100 active:bg-amber-800'
                      : minigameReady
                        ? 'bg-orange-800 border-orange-600 text-orange-100 active:bg-orange-700'
                        : selectedItem
                          ? 'bg-blue-900 border-blue-600 text-blue-100 active:bg-blue-800'
                          : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed';
                    return (
                      <button
                        onClick={() => handleUse(lock.id)}
                        className={`px-3 py-2 rounded text-[11px] md:text-xs border shrink-0 font-bold shadow-sm ${btnClass}`}
                        disabled={!isEnabled}
                      >
                        {btnLabel}
                      </button>
                    );
                  })()}

                  {isSpatial && isUnlocked && lock.targetRoomId && (
                    <button
                      onClick={() => onMoveToRoom(lock.id)}
                      className={`px-3 py-2 rounded text-[11px] md:text-xs border shrink-0 font-bold shadow-sm ${
                        isLocal
                          ? 'bg-emerald-900 hover:bg-emerald-800 active:bg-emerald-700 border-emerald-700 text-emerald-100'
                          : 'bg-sky-900 hover:bg-sky-800 active:bg-sky-700 border-sky-700 text-sky-100'
                      }`}
                    >
                      {isLocal ? '進入' : '前往'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          </div>
        </div>
      </div>

      {/* Password modal */}
      {passwordLock && passwordLockId && (
        <PasswordModal
          lockName={passwordLock.name}
          passwordHint={passwordLock.passwordHint}
          onSubmit={pwd => onEnterPassword(pwd, passwordLockId)}
          onClose={() => setPasswordLockId(null)}
        />
      )}

      {/* Minigame modal */}
      {minigameLock && minigameLockId && minigameLock.minigameConfig && (
        <MinigameModal
          config={minigameLock.minigameConfig}
          lockName={minigameLock.name}
          onComplete={() => { onCompleteMinigame(minigameLockId); setMinigameLockId(null); }}
          onClose={() => setMinigameLockId(null)}
        />
      )}
    </div>
  );
}
