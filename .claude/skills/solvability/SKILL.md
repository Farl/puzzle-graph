---
name: solvability
description: Batch verify puzzle solvability after generator changes. Run when modifying generator.ts, templates.ts, or solver.ts.
---

# 批量可解性驗證

修改生成器邏輯後，驗證所有 puzzle 仍然 100% 可解。

## 執行

依序跑兩組測試，都必須 0 失敗。

### 第一組：標準配置 × 2000 seeds

```bash
npx tsx -e "
import { generatePuzzle } from './src/game/generator';
import { solvePuzzle } from './src/game/solver';
let fail = 0; const fails: number[] = [];
for (let s = 0; s < 2000; s++) {
  const seed = s * 13337;
  const p = generatePuzzle({ targetDepth: 6, maxRooms: 3, compositeRate: 0.3, depthStaggerVariance: 1, keySpreadRate: 0.5, crossRoomRate: 0.3, reuseRate: 0.3, maxNestingDepth: 2, consolidationRate: 0.5, stateLockRate: 0.3, seed });
  if (!solvePuzzle(p).solvable) { fail++; fails.push(seed); }
}
console.log('Standard:', fail, '/ 2000');
if (fails.length) console.log('Failed seeds:', fails.join(', '));
"
```

### 第二組：極端配置 × 2000 seeds

```bash
npx tsx -e "
import { generatePuzzle } from './src/game/generator';
import { solvePuzzle } from './src/game/solver';
let fail = 0; const fails: number[] = [];
for (let s = 0; s < 2000; s++) {
  const seed = s * 13337;
  const p = generatePuzzle({ targetDepth: 10, maxRooms: 5, compositeRate: 0.5, depthStaggerVariance: 1, keySpreadRate: 0.5, crossRoomRate: 0.5, reuseRate: 0.5, maxNestingDepth: 3, consolidationRate: 0.7, stateLockRate: 0.3, seed });
  if (!solvePuzzle(p).solvable) { fail++; fails.push(seed); }
}
console.log('Extreme:', fail, '/ 2000');
if (fails.length) console.log('Failed seeds:', fails.join(', '));
"
```

## 失敗時

用 `/trace-seed` 追蹤失敗的 seed 找出根本原因。
