import { useState, useEffect } from 'react';
import type { GameState } from '../game/types';

const COMMANDS = ['look', 'inventory', 'examine', 'take', 'use', 'enter', 'go', 'help'];

export function useAutocomplete(input: string, gameState: GameState | null) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!gameState || !input.trim()) {
      setSuggestions([]);
      return;
    }

    const { puzzle, currentRoomId, inventory } = gameState;
    const room = puzzle.rooms[currentRoomId]!;
    const visibleItems = room.visibleItems.map(id => puzzle.items[id]!.name);
    const inventoryItems = inventory.map(id => puzzle.items[id]!.name);
    const locks = room.lockIds.map(id => puzzle.locks[id]!.name);
    const unlockedDoors = room.lockIds
      .map(id => puzzle.locks[id]!)
      .filter(l => !l.isLocked && l.category === 'spatial' && l.targetRoomId)
      .map(l => l.name);

    const lowerInput = input.toLowerCase();
    const parts = lowerInput.split(' ');
    const verb = parts[0]!;
    let result: string[] = [];

    if (parts.length === 1) {
      result = COMMANDS.filter(c => c.startsWith(verb));
    } else {
      const rest = parts.slice(1).join(' ');

      if (verb === 'examine' || verb === 'x') {
        result = [...visibleItems, ...inventoryItems, ...locks]
          .filter(n => n.toLowerCase().includes(rest))
          .map(n => `${verb} ${n}`);
      } else if (verb === 'take' || verb === 't') {
        result = visibleItems
          .filter(n => n.toLowerCase().includes(rest))
          .map(n => `${verb} ${n}`);
      } else if (verb === 'use') {
        if (rest.includes(' on ')) {
          const onIdx = rest.indexOf(' on ');
          const itemPart = rest.substring(0, onIdx);
          const lockPart = rest.substring(onIdx + 4);
          result = locks
            .filter(n => n.toLowerCase().includes(lockPart))
            .map(n => `use ${itemPart} on ${n}`);
        } else {
          result = inventoryItems
            .filter(n => n.toLowerCase().includes(rest))
            .map(n => `use ${n} on `);
        }
      } else if (verb === 'enter') {
        if (rest.includes(' on ')) {
          const onIdx = rest.indexOf(' on ');
          const pwd = rest.substring(0, onIdx);
          const lockPart = rest.substring(onIdx + 4);
          result = locks
            .filter(n => n.toLowerCase().includes(lockPart))
            .map(n => `enter ${pwd} on ${n}`);
        }
      } else if (verb === 'go') {
        result = unlockedDoors
          .filter(n => n.toLowerCase().includes(rest))
          .map(n => `go ${n}`);
      }
    }

    setSuggestions(result);
    setActiveIndex(0);
  }, [input, gameState]);

  return { suggestions, activeIndex, setActiveIndex };
}
