---
name: template-check
description: Verify lock/key template integrity after adding or modifying templates.ts. Checks duplicates, orphans, and distribution.
---

# 模板完整性檢查

新增或修改 templates.ts 後，驗證模板的完整性和多樣性。

## 執行

一次跑完所有檢查：

```bash
npx tsx -e "
import { KEY_TEMPLATES, LOCK_TEMPLATES } from './src/game/templates';
import { generatePuzzle } from './src/game/generator';
import { solvePuzzle } from './src/game/solver';

let issues = 0;

// 1. 重複鑰匙組合
console.log('=== 重複鑰匙組合 ===');
const seen = new Map<string, string[]>();
for (const lt of LOCK_TEMPLATES) {
  if (lt.category === 'spatial') continue;
  const combo = [...lt.requiredKeys].sort().join('+');
  if (!seen.has(combo)) seen.set(combo, []);
  seen.get(combo)!.push(lt.id);
}
for (const [combo, ids] of seen) { if (ids.length > 1) { console.log('  DUPLICATE:', combo, '→', ids.join(', ')); issues++; } }
if (!issues) console.log('  OK');

// 2. 孤立鑰匙（沒被任何鎖引用）
console.log('\n=== 孤立鑰匙 ===');
const usedKeys = new Set(LOCK_TEMPLATES.flatMap(l => l.requiredKeys));
const orphanKeys = KEY_TEMPLATES.filter(k => !usedKeys.has(k.id));
for (const k of orphanKeys) { console.log('  ORPHAN:', k.id, k.name); issues++; }
if (!orphanKeys.length) console.log('  OK');

// 3. 引用不存在的鑰匙
console.log('\n=== 不存在的鑰匙引用 ===');
const keyIds = new Set(KEY_TEMPLATES.map(k => k.id));
for (const lt of LOCK_TEMPLATES) {
  for (const kid of lt.requiredKeys) { if (!keyIds.has(kid)) { console.log('  MISSING:', lt.id, 'needs', kid); issues++; } }
}
if (!issues) console.log('  OK');

// 4. 分類統計
console.log('\n=== 模板統計 ===');
const containers = LOCK_TEMPLATES.filter(l => l.category === 'container' && !l.pickupable);
const spatials = LOCK_TEMPLATES.filter(l => l.category === 'spatial');
const states = LOCK_TEMPLATES.filter(l => l.pickupable);
console.log('  通用容器:', containers.length, '  空間鎖:', spatials.length, '  狀態鎖:', states.length);
const byKeyCount: Record<number, number> = {};
for (const l of containers) { const n = l.requiredKeys.length; byKeyCount[n] = (byKeyCount[n] ?? 0) + 1; }
console.log('  按鑰匙數:', Object.entries(byKeyCount).map(([k,v]) => k + '鑰匙:' + v).join('  '));

// 5. 生成測試（compositeRate=1 不應重複）
console.log('\n=== 生成重複測試 (compositeRate=1) ===');
let dupes = 0;
for (let s = 0; s < 50; s++) {
  const p = generatePuzzle({ targetDepth: 10, maxRooms: 3, compositeRate: 1, depthStaggerVariance: 1, keySpreadRate: 0, crossRoomRate: 0.3, reuseRate: 0.3, maxNestingDepth: 2, consolidationRate: 0.5, stateLockRate: 0.3, seed: 100000 + s });
  const combos = new Set<string>();
  for (const lock of Object.values(p.locks)) {
    if (lock.category !== 'container') continue;
    const c = lock.requiredItems.map(r => p.items[r]?.name ?? r).sort().join('+');
    if (combos.has(c)) { dupes++; break; }
    combos.add(c);
  }
}
console.log('  重複:', dupes, '/ 50');
if (dupes) issues++;

console.log('\n' + (issues ? '⚠ ' + issues + ' 個問題' : '✓ 全部通過'));
"
```
