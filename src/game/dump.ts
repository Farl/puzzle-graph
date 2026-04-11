import type { PuzzleDefinition, ItemId, LockId } from './types';

export function dumpPuzzle(puzzle: PuzzleDefinition): string {
  const { rooms, items, locks, startRoomId, exitLockId } = puzzle;

  const itemLabel = new Map<ItemId, string>();
  const lockLabel = new Map<LockId, string>();
  let itemCounter = 0;
  let lockCounter = 0;

  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const nextItemLabel = () => {
    const idx = itemCounter % 26;
    const round = Math.floor(itemCounter / 26);
    itemCounter++;
    return alphabet[idx]! + (round > 0 ? String(round) : '');
  };
  const nextLockLabel = () => {
    const idx = lockCounter % 26;
    const round = Math.floor(lockCounter / 26);
    lockCounter++;
    return 'L' + alphabet[idx]!.toUpperCase() + (round > 0 ? String(round) : '');
  };

  // Order rooms: startRoomId first
  const roomIds = Object.keys(rooms);
  const startIdx = roomIds.indexOf(startRoomId);
  if (startIdx > 0) {
    roomIds.splice(startIdx, 1);
    roomIds.unshift(startRoomId);
  }

  // Label all items
  for (const [itemId] of Object.entries(items)) {
    itemLabel.set(itemId, nextItemLabel());
  }

  // Label locks by category
  const spatialLocks = Object.values(locks).filter(l => l.category === 'spatial' && !l.isExit && l.isLocked);
  const containerLocks = Object.values(locks).filter(l => l.category === 'container' && l.isLocked && !l.isExit);
  const exitLock = locks[exitLockId]!;

  for (const l of spatialLocks) lockLabel.set(l.id, 'D' + nextLockLabel().slice(1));
  for (const l of containerLocks) lockLabel.set(l.id, 'C' + nextLockLabel().slice(1));

  const lines: string[] = [];
  lines.push('=== PUZZLE ===');

  // Rooms
  lines.push('\nROOMS');
  for (const roomId of roomIds) {
    const room = rooms[roomId]!;
    const tag = roomId === startRoomId ? ' [START]' : '';
    lines.push(`  R${roomIds.indexOf(roomId)} "${room.name}"${tag}`);
  }

  // Spatial (doors)
  lines.push('\nSPATIAL (doors)');
  for (const lock of spatialLocks) {
    const fromIdx = roomIds.indexOf(lock.roomId);
    const toIdx = lock.targetRoomId ? roomIds.indexOf(lock.targetRoomId) : '?';
    const reqLabels = lock.requiredItems.map(id => {
      const item = items[id]!;
      return `(${itemLabel.get(id)}${item.reusable ? '[TOOL]' : ''})`;
    }).join(', ');
    lines.push(`  R${fromIdx} ──${reqLabels}──► R${toIdx}`);
  }

  // Exit
  const exitReqLabels = exitLock.requiredItems.map(id => {
    const item = items[id]!;
    return `(${itemLabel.get(id)}${item.reusable ? '[TOOL]' : ''})`;
  }).join(', ');
  const exitRoomIdx = roomIds.indexOf(exitLock.roomId);
  lines.push(`  R${exitRoomIdx}  EXIT needs ${exitReqLabels}`);

  // Container locks
  lines.push('\nCONTAINER LOCKS');
  const crossDeps: string[] = [];

  if (containerLocks.length === 0) {
    lines.push('  (none)');
  } else {
    for (const lock of containerLocks) {
      const roomIdx = roomIds.indexOf(lock.roomId);
      const hidesLabels = lock.containsItems.map(id => `(${itemLabel.get(id)})`).join(', ');
      const reqParts = lock.requiredItems.map(id => {
        const item = items[id]!;
        const itemRoomIdx = roomIds.indexOf(item.initialRoom);
        const isCross = item.initialRoom !== lock.roomId;
        const label = itemLabel.get(id)! + (item.reusable ? '[TOOL]' : '');
        if (isCross) crossDeps.push(`  (${label}) in R${itemRoomIdx} ← needed by lock in R${roomIdx}`);
        return label + (isCross ? '★' : '');
      });
      const composite = lock.requiredItems.length > 1;
      const reqStr = composite ? reqParts.join('·') : reqParts[0]!;
      lines.push(`  R${roomIdx}: {${reqStr} → ${hidesLabels}}`);
    }
  }

  // Floor
  lines.push('\nFLOOR (final)');
  for (const roomId of roomIds) {
    const room = rooms[roomId]!;
    const idx = roomIds.indexOf(roomId);
    const visLabels = room.visibleItems.map(id => {
      const item = items[id]!;
      return `(${itemLabel.get(id)}${item.reusable ? '[TOOL]' : ''})`;
    }).join('  ');
    lines.push(`  R${idx}: ${visLabels || '(empty)'}`);
  }

  // Reusable tools
  const reusableItems = Object.values(items).filter(i => i.reusable);
  if (reusableItems.length > 0) {
    lines.push('\nREUSABLE TOOLS');
    for (const item of reusableItems) {
      const usedBy = Object.values(locks).filter(l => l.requiredItems.includes(item.id));
      const roomIdx = roomIds.indexOf(item.initialRoom);
      lines.push(`  (${itemLabel.get(item.id)}[TOOL]) in R${roomIdx}, used by ${usedBy.length} lock(s)`);
    }
  }

  // Cross-room deps summary
  if (crossDeps.length > 0) {
    lines.push('\n★ CROSS-ROOM DEPS:');
    lines.push(...crossDeps);
  }

  return lines.join('\n');
}
