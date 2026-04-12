import { useState, useCallback } from 'react';
import type { GameState, GeneratorConfig, PuzzleDefinition, ItemId, LockId } from '../game/types';
import { generatePuzzle } from '../game/generator';
import { dumpPuzzle } from '../game/dump';
import {
  initGame,
  executeCommand,
  takeItem as engineTakeItem,
  useItemOnLock as engineUseItemOnLock,
  enterPassword as engineEnterPassword,
  moveToRoom as engineMoveToRoom,
  inspectEntity as engineInspectEntity,
  lookAround as engineLookAround,
  showInventory as engineShowInventory,
} from '../game/engine';

export const DEFAULT_CONFIG: GeneratorConfig = {
  targetDepth: 4,
  maxRooms: 3,
  compositeRate: 0.3,
  depthStaggerVariance: 1.0,
  keySpreadRate: 0.5,
  crossRoomRate: 0.3,
  reuseRate: 0.3,
  maxNestingDepth: 2,
  consolidationRate: 0.5,
};

const STORAGE_KEY = 'puzzle-graph:config';

function loadConfig(): GeneratorConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const saved = JSON.parse(raw) as Partial<GeneratorConfig>;
    // 以 DEFAULT_CONFIG 為底，覆蓋已儲存的值（防止新增欄位遺漏）
    return { ...DEFAULT_CONFIG, ...saved };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(config: GeneratorConfig): void {
  try {
    // seed 不存入 localStorage（每次應重新隨機或由使用者指定）
    const { seed: _, ...rest } = config;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
  } catch { /* quota exceeded etc. */ }
}

export function useGameState(initialConfig: GeneratorConfig = DEFAULT_CONFIG) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  // 保存原始 puzzle（engine 會 mutate clone，原始資料供 dump 和圖譜使用）
  const [originalPuzzle, setOriginalPuzzle] = useState<PuzzleDefinition | null>(null);
  const [config, setConfig] = useState<GeneratorConfig>(() => loadConfig() ?? initialConfig);
  const [selectedItem, setSelectedItem] = useState<ItemId | null>(null);

  const startNewGame = useCallback((overrideConfig?: GeneratorConfig) => {
    const cfg = overrideConfig ?? config;
    const puzzle = generatePuzzle(cfg);
    setOriginalPuzzle(puzzle);
    const state = initGame(puzzle);
    setGameState(state);
    setSelectedItem(null);
    if (overrideConfig) {
      setConfig(overrideConfig);
      saveConfig(overrideConfig);
    }
  }, [config]);

  const dispatch = useCallback((command: string) => {
    setGameState(prev => prev ? executeCommand(command, prev) : prev);
    setSelectedItem(null);
  }, []);

  const takeItem = useCallback((itemId: ItemId) => {
    setGameState(prev => prev ? engineTakeItem(prev, itemId) : prev);
  }, []);

  const useItemOnLock = useCallback((itemId: ItemId, lockId: LockId) => {
    setGameState(prev => prev ? engineUseItemOnLock(prev, itemId, lockId) : prev);
    setSelectedItem(null);
  }, []);

  const enterPasswordAction = useCallback((password: string, lockId: LockId) => {
    setGameState(prev => prev ? engineEnterPassword(prev, password, lockId) : prev);
  }, []);

  const moveToRoomAction = useCallback((lockId: LockId) => {
    setGameState(prev => prev ? engineMoveToRoom(prev, lockId) : prev);
    setSelectedItem(null);
  }, []);

  const inspectEntityAction = useCallback((entityId: string) => {
    setGameState(prev => prev ? engineInspectEntity(prev, entityId) : prev);
  }, []);

  const lookAroundAction = useCallback(() => {
    setGameState(prev => prev ? engineLookAround(prev) : prev);
  }, []);

  const showInventoryAction = useCallback(() => {
    setGameState(prev => prev ? engineShowInventory(prev) : prev);
  }, []);

  const dump = useCallback(() => {
    return originalPuzzle ? dumpPuzzle(originalPuzzle) : '';
  }, [originalPuzzle]);

  return {
    gameState,
    originalPuzzle,
    config,
    selectedItem,
    setSelectedItem,
    setConfig,
    startNewGame,
    dispatch,
    takeItem,
    useItemOnLock,
    enterPassword: enterPasswordAction,
    moveToRoom: moveToRoomAction,
    inspectEntity: inspectEntityAction,
    lookAround: lookAroundAction,
    showInventory: showInventoryAction,
    dump,
  };
}
