---
name: trace-seed
description: Trace a specific seed - dump structure, verify solvability, analyze dependency chains when stuck. Usage /trace-seed <seed> [config overrides]
---

# 追蹤特定 Seed

使用者提供 seed 數字（和可選的 config 覆蓋），依序執行以下分析。

## 第一步：Dump + 可解性

```bash
npx tsx -e "
import { generatePuzzle } from './src/game/generator';
import { solvePuzzle } from './src/game/solver';
import { dumpPuzzle } from './src/game/dump';
const p = generatePuzzle({ targetDepth: 6, maxRooms: 3, compositeRate: 0.3, depthStaggerVariance: 1, keySpreadRate: 0, crossRoomRate: 0.3, reuseRate: 0, maxNestingDepth: 2, consolidationRate: 0.5, stateLockRate: 0.3, seed: SEED });
console.log(dumpPuzzle(p));
console.log('Solvable:', solvePuzzle(p).solvable);
"
```

將 `SEED` 替換為使用者提供的數字。config 有覆蓋就套用。

## 第二步（若不可解）：Solver Trace

```bash
npx tsx -e "
import { generatePuzzle } from './src/game/generator';
import { solvePuzzle } from './src/game/solver';
const p = generatePuzzle({ ...CONFIG, seed: SEED });
const inv = new Set<string>(); const unlocked = new Set<string>();
const reached = new Set([p.startRoomId]);
let progress = true;
while (progress) {
  progress = false;
  for (const rid of reached) {
    for (const iid of p.rooms[rid]!.visibleItems) {
      if (!inv.has(iid) && p.items[iid]?.pickupable !== false) { inv.add(iid); console.log('PICK:', p.items[iid]?.name, 'in', p.rooms[rid]?.name); progress = true; }
    }
    for (const lid of p.rooms[rid]!.lockIds) {
      if (unlocked.has(lid)) continue;
      const lock = p.locks[lid]!;
      const ok = lock.requiredItems.every(r => inv.has(r) || (p.items[r]?.pickupable === false && reached.has(p.items[r]!.initialRoom)));
      if (!ok) continue;
      unlocked.add(lid); console.log('UNLOCK:', lock.name); progress = true;
      for (const cid of lock.contents) { if (p.items[cid]?.pickupable !== false) inv.add(cid); if (p.locks[cid]?.pickupable) inv.add(cid); }
      if (lock.targetRoomId && !reached.has(lock.targetRoomId)) { reached.add(lock.targetRoomId); console.log('  ENTER:', p.rooms[lock.targetRoomId]?.name); progress = true; }
    }
  }
}
console.log('\nSTUCK:');
for (const [id, lock] of Object.entries(p.locks)) {
  if (unlocked.has(id)) continue;
  const missing = lock.requiredItems.filter(r => !inv.has(r) && !(p.items[r]?.pickupable === false && reached.has(p.items[r]!.initialRoom)));
  if (missing.length > 0) console.log(' ', lock.name, 'needs:', missing.map(m => p.items[m]?.name ?? m).join(', '));
}
"
```

## 第三步（若不可解）：依賴鏈追蹤

從卡住的物品開始遞迴追蹤容器鏈，找到循環或不可達的根因。同時檢查：

- 同一物品是否在多個容器裡（duplicate containment）
- 容器鎖和內容物是否在同一房間（cross-room container）
- 門鑰匙是否在門後面的房間（key behind door）
