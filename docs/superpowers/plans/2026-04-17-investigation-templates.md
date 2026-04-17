# Investigation Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a detective/investigation-style template layer (NPC locks + evidence keys) to the puzzle graph, selectable via tag-based template filtering without forking the template pool.

**Architecture:** Pure template + config extension. Existing `templates.ts` keeps all entries, classified with new tag `classic` vs `investigation`. `GeneratorConfig` gains `includeTemplateTags` / `excludeTemplateTags` / `npcRate`. Phase B stateTag pairing is widened from "pickupable-only" to "all container locks" so NPC locks (non-pickupable) can also be paired with testimony clues for narrative chaining. No new entity type, no changes to Phase A / Phase C / solver.

**Tech Stack:** TypeScript 5, React 19, Vite 6, Tailwind CSS 4, Vitest. Branch `investigation` (already created).

**Spec:** `docs/superpowers/specs/2026-04-17-investigation-templates-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/game/types.ts` | Modify | Add `tags` to `KeyTemplate`; add 3 fields to `GeneratorConfig` |
| `src/game/templates.ts` | Modify | Backfill `classic` tag; append `investigation` templates |
| `src/game/template-filter.ts` | Create | `filterTemplatesByTags` helper |
| `src/game/generator.ts` | Modify | Apply filter in `GeneratorContext`; widen Phase B stateTag pool; add `npcRate` branch in `drawLock` |
| `src/game/dump.ts` | Modify | `[NPC]` prefix for NPC container locks |
| `src/components/CanvasGraph.tsx` | Modify | Indigo color for NPC locks |
| `src/components/InteractionPanel.tsx` | Modify | Separate 「對話」 region; 「出示」 label for NPC locks |
| `src/components/SettingsModal.tsx` | Modify | `npcRate` slider + mode preset dropdown |
| `src/hooks/useGameState.ts` | Modify | `INVESTIGATION_PRESET` / `MIXED_PRESET` / `CLASSIC_PRESET` |
| `src/game/__tests__/investigation.test.ts` | Create | Tag filter + NPC generation + solvability tests |

---

## Task 1: Type extensions (`KeyTemplate.tags` + config fields)

**Files:**
- Modify: `src/game/types.ts:103-123` (GeneratorConfig), `src/game/types.ts:142-151` (KeyTemplate)

- [ ] **Step 1: Add `tags` field to `KeyTemplate`**

In `src/game/types.ts`, change the `KeyTemplate` interface (around line 142):

```ts
export interface KeyTemplate {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  reusable: boolean;
  volume: number;
  tags: readonly string[];       // new — required, mirrors LockTemplate.tags
  pickupable?: boolean;
  stateTags?: string[];
}
```

- [ ] **Step 2: Add three new fields to `GeneratorConfig`**

In `src/game/types.ts`, extend `GeneratorConfig` (around line 103):

```ts
export interface GeneratorConfig {
  targetDepth: number;
  maxRooms: number;
  depthStaggerVariance: number;

  seed?: number;
  keySpreadRate?: number;
  crossRoomRate?: number;
  maxLocks?: number;
  reuseRate?: number;
  maxReusesPerTool?: number;
  maxNestingDepth?: number;
  consolidationRate?: number;
  stateLockRate?: number;

  compositeRate?: number;

  /** Only keep templates whose tags intersect this list (empty/undefined = no filter). */
  includeTemplateTags?: readonly string[];
  /** Exclude templates whose tags intersect this list. */
  excludeTemplateTags?: readonly string[];
  /** When an item has stateTag-matching NPC candidates, probability of picking one (0-1). */
  npcRate?: number;

  /** @deprecated 不再使用 */
  tagDiversityMode?: string;
  /** @deprecated 不再使用 */
  tagWeights?: Record<string, number>;
}
```

- [ ] **Step 3: Run typecheck to see existing templates break**

Run: `npx tsc --noEmit`
Expected: errors pointing at `KEY_TEMPLATES` entries missing `tags`. This is correct — fixed in Task 2.

- [ ] **Step 4: Commit**

```bash
git add src/game/types.ts
git commit -m "feat(types): add tags to KeyTemplate; add includeTemplateTags/excludeTemplateTags/npcRate to GeneratorConfig"
```

---

## Task 2: Backfill existing templates with `classic` tag

**Files:**
- Modify: `src/game/templates.ts` (all existing entries)

- [ ] **Step 1: Add `tags` to every `KEY_TEMPLATES` entry**

Strategy: every existing key gets `tags: ['classic']` plus one functional tag based on its semantic group:

- Consumable keys (rusty_key, brass_key, door_handle, left_valve, right_valve): `['classic', 'door-key']`
- `password_note`: `['classic', 'code']`
- Chemistry / electronics / gears combo parts (red_reagent, blue_reagent, power_cable, usb_drive, large_gear, small_gear, soldering_iron, solder_wire, antenna, battery_pack, lens, prism, hydraulic_tube, hydraulic_fluid, fuse, switch_handle, red_gem, blue_gem, green_gem, red_wire, blue_wire, green_wire, filter_core, carbon_pack, pipe_connector, fuel_canister, igniter, nav_chip, hard_drive, ram_stick, cpu_chip, power_module): `['classic', 'combo-part']`
- Reusable tools (flashlight, hammer, crowbar, keycard, bolt_cutter, wet_cloth): `['classic', 'tool']`
- Fixed stations (water_basin, workbench): `['classic', 'station']`
- Crafting parts (soldering_iron already listed, battery, pipe_part, wire_spool, metal_rod, ic_chip, whetstone): `['classic', 'crafting']`

Edit each entry by adding `tags: [...]` after `volume`. Example before/after:

```ts
// before
{ id: 'rusty_key', name: '生鏽的鑰匙', description: '...', type: 'key', reusable: false, volume: 1 },

// after
{ id: 'rusty_key', name: '生鏽的鑰匙', description: '...', type: 'key', reusable: false, volume: 1, tags: ['classic', 'door-key'] },
```

Apply to every entry in the `KEY_TEMPLATES` array.

- [ ] **Step 2: Add `'classic'` to every `LOCK_TEMPLATES` entry's existing `tags`**

For each lock template, prepend `'classic'` to its `tags` array. Example:

```ts
// before
tags: ['physical', 'key-lock'],

// after
tags: ['classic', 'physical', 'key-lock'],
```

Apply to every `LOCK_TEMPLATES` entry.

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: passes cleanly.

- [ ] **Step 4: Run existing tests**

Run: `npm test -- --run`
Expected: all existing tests still pass (templates unchanged except tag metadata).

- [ ] **Step 5: Commit**

```bash
git add src/game/templates.ts
git commit -m "feat(templates): tag all existing templates as 'classic'"
```

---

## Task 3: Template filter module

**Files:**
- Create: `src/game/template-filter.ts`
- Test: `src/game/__tests__/investigation.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/game/__tests__/investigation.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { filterTemplatesByTags } from '../template-filter';

const SAMPLE = [
  { id: 'a', tags: ['classic', 'tool'] },
  { id: 'b', tags: ['investigation', 'npc'] },
  { id: 'c', tags: ['classic', 'crafting'] },
  { id: 'd', tags: ['investigation', 'evidence'] },
];

describe('filterTemplatesByTags', () => {
  it('no filter returns all', () => {
    const result = filterTemplatesByTags(SAMPLE, undefined, undefined);
    expect(result.map(t => t.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('include: classic only', () => {
    const result = filterTemplatesByTags(SAMPLE, ['classic'], undefined);
    expect(result.map(t => t.id)).toEqual(['a', 'c']);
  });

  it('include: investigation only', () => {
    const result = filterTemplatesByTags(SAMPLE, ['investigation'], undefined);
    expect(result.map(t => t.id)).toEqual(['b', 'd']);
  });

  it('exclude: investigation', () => {
    const result = filterTemplatesByTags(SAMPLE, undefined, ['investigation']);
    expect(result.map(t => t.id)).toEqual(['a', 'c']);
  });

  it('include + exclude both applied', () => {
    const result = filterTemplatesByTags(SAMPLE, ['classic', 'investigation'], ['crafting']);
    expect(result.map(t => t.id)).toEqual(['a', 'b', 'd']);
  });

  it('empty include array means no filter (not "match nothing")', () => {
    const result = filterTemplatesByTags(SAMPLE, [], undefined);
    expect(result.map(t => t.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});
```

- [ ] **Step 2: Run test, confirm it fails**

Run: `npm test -- --run src/game/__tests__/investigation.test.ts`
Expected: FAIL — `filterTemplatesByTags` not found.

- [ ] **Step 3: Implement `filterTemplatesByTags`**

Create `src/game/template-filter.ts`:

```ts
interface Taggable {
  tags: readonly string[];
}

/**
 * Filter a template pool by include/exclude tag sets.
 * - An empty or undefined include list means "no include filter" (keep everything not excluded).
 * - Include is a disjunction: keep if any include-tag matches.
 * - Exclude is a disjunction: drop if any exclude-tag matches.
 * - Exclude wins over include.
 */
export function filterTemplatesByTags<T extends Taggable>(
  templates: readonly T[],
  includeTags: readonly string[] | undefined,
  excludeTags: readonly string[] | undefined,
): T[] {
  const includeSet = includeTags && includeTags.length > 0 ? new Set(includeTags) : null;
  const excludeSet = excludeTags && excludeTags.length > 0 ? new Set(excludeTags) : null;
  return templates.filter(t => {
    if (excludeSet && t.tags.some(tag => excludeSet.has(tag))) return false;
    if (includeSet && !t.tags.some(tag => includeSet.has(tag))) return false;
    return true;
  });
}
```

- [ ] **Step 4: Run test, confirm pass**

Run: `npm test -- --run src/game/__tests__/investigation.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/game/template-filter.ts src/game/__tests__/investigation.test.ts
git commit -m "feat(generator): add filterTemplatesByTags helper"
```

---

## Task 4: Integrate filter into `GeneratorContext`

**Files:**
- Modify: `src/game/generator.ts:40-61` (GeneratorContext constructor), `src/game/generator.ts:200-208` (deck reshuffle), `src/game/generator.ts:225-234` (tryReusePath lookup)

- [ ] **Step 1: Write failing test**

Append to `src/game/__tests__/investigation.test.ts`:

```ts
import { generatePuzzle } from '../generator';
import { KEY_TEMPLATES, LOCK_TEMPLATES } from '../templates';
import type { GeneratorConfig } from '../types';

describe('GeneratorContext tag filter', () => {
  it('excludeTemplateTags=["investigation"] uses only classic templates', () => {
    const config: GeneratorConfig = {
      targetDepth: 4,
      maxRooms: 3,
      depthStaggerVariance: 1,
      excludeTemplateTags: ['investigation'],
      seed: 42,
    };
    const puzzle = generatePuzzle(config);
    // every lock must correspond to a classic template (by tag on template.id)
    for (const lock of Object.values(puzzle.locks)) {
      if (lock.isExit) continue; // exit lock is hard-coded
      const tpl = LOCK_TEMPLATES.find(t => t.variations.some(v => v.name === lock.name) ||
        t.variations.some(v => lock.name.startsWith(v.name)));
      if (tpl) expect(tpl.tags).toContain('classic');
    }
  });

  it('filter preserves solvability', async () => {
    const { solvePuzzle } = await import('../solver');
    const config: GeneratorConfig = {
      targetDepth: 4,
      maxRooms: 3,
      depthStaggerVariance: 1,
      excludeTemplateTags: ['investigation'],
    };
    for (let i = 0; i < 20; i++) {
      const puzzle = generatePuzzle({ ...config, seed: i });
      const result = solvePuzzle(puzzle);
      expect(result.solvable, `seed=${i} not solvable`).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test, confirm first passes trivially (no investigation templates exist yet), second passes**

Run: `npm test -- --run src/game/__tests__/investigation.test.ts`
Expected: the new tests pass (since no investigation templates exist yet, the filter is a no-op). This is a regression guard for Tasks 5-7.

- [ ] **Step 3: Add filter integration to `GeneratorContext`**

In `src/game/generator.ts`, update the imports at the top:

```ts
import { KEY_TEMPLATES, LOCK_TEMPLATES, findKeyTemplate } from './templates';
import { filterTemplatesByTags } from './template-filter';
```

Replace the `GeneratorContext` class top section (currently lines 40-62):

```ts
class GeneratorContext {
  rooms: Record<RoomId, Room> = {};
  items: Record<ItemId, Item> = {};
  locks: Record<LockId, Lock> = {};

  rng: SeededRandom;
  availableThemes: { name: string; description: string; capacity: number }[];
  availableLocks: LockTemplate[];
  /** Lock templates after tag filter — used for deck reshuffle and reuse path lookup. */
  filteredLockPool: readonly LockTemplate[];
  /** Key templates after tag filter — used for reuse path lookup. */
  filteredKeyPool: readonly KeyTemplate[];
  reusableItemCache: Record<string, ItemId> = {};
  consumableCount: Record<string, number> = {};
  usedItemNames = new Set<string>();
  usedLockNames = new Set<string>();
  passwordPool: PasswordFormatPool;
  lockCount = 0;
  toolReuseCount: Record<ItemId, number> = {};

  constructor(maxRooms: number, rng: SeededRandom, config: GeneratorConfig) {
    this.rng = rng;
    this.passwordPool = new PasswordFormatPool(rng);
    this.availableThemes = shuffle(ROOM_THEMES, rng).slice(0, maxRooms);
    this.filteredLockPool = filterTemplatesByTags(
      LOCK_TEMPLATES,
      config.includeTemplateTags,
      config.excludeTemplateTags,
    );
    this.filteredKeyPool = filterTemplatesByTags(
      KEY_TEMPLATES,
      config.includeTemplateTags,
      config.excludeTemplateTags,
    );
    this.availableLocks = shuffle([...this.filteredLockPool], rng);
  }
```

Add `KeyTemplate` to the imports from `./types`:

```ts
import type {
  GeneratorConfig,
  PuzzleDefinition,
  Room,
  Item,
  Lock,
  RoomId,
  ItemId,
  LockId,
  FamilyVariation,
  LockTemplate,
  KeyTemplate,
} from './types';
```

- [ ] **Step 4: Update `drawLock` reshuffle to use filtered pool**

In `src/game/generator.ts`, find the deck-reshuffle near the end of `drawLock` (currently line 205):

```ts
// before
this.availableLocks = shuffle([...LOCK_TEMPLATES], this.rng);

// after
this.availableLocks = shuffle([...this.filteredLockPool], this.rng);
```

- [ ] **Step 5: Update `tryReusePath` lookups to use filtered pools**

In `src/game/generator.ts`, update `tryReusePath` (currently lines 225-234):

```ts
const keyTpl = this.filteredKeyPool.find(k => k.name === toolName && k.reusable);
if (!keyTpl) return null;

const compatibleLocks = this.filteredLockPool.filter(
  l => l.category === targetCategory && l.requiredKeys.includes(keyTpl.id)
    && !l.pickupable,
);
```

- [ ] **Step 6: Update `generateRoomSkeleton` to pass config to context**

Find `new GeneratorContext(config.maxRooms, rng)` (around line 358) and change to:

```ts
const ctx = new GeneratorContext(config.maxRooms, rng, config);
```

- [ ] **Step 7: Update Phase B state lock pool to use filtered set**

In `src/game/generator.ts` inside `generatePuzzleContent` (around line 452), change:

```ts
const stateLockTemplates = LOCK_TEMPLATES.filter(
  l => l.pickupable && l.category === 'container' && l.stateTags && l.stateTags.length > 0,
);
```

to:

```ts
const stateLockTemplates = ctx.filteredLockPool.filter(
  l => l.pickupable && l.category === 'container' && l.stateTags && l.stateTags.length > 0,
);
```

Also update the `keyTplByName` map to use filtered keys:

```ts
const keyTplByName = new Map(ctx.filteredKeyPool.map(k => [k.name, k]));
```

- [ ] **Step 8: Run all tests**

Run: `npm test -- --run`
Expected: all pass (filter is no-op when no filter tags are set, which is the current behavior of all tests).

- [ ] **Step 9: Verify the new investigation tests pass**

Run: `npm test -- --run src/game/__tests__/investigation.test.ts`
Expected: all investigation tests pass.

- [ ] **Step 10: Commit**

```bash
git add src/game/generator.ts src/game/__tests__/investigation.test.ts
git commit -m "feat(generator): apply tag filter to lock/key pools in GeneratorContext"
```

---

## Task 5: Phase B extension — widen stateTag pool + add `npcRate` branch

**Files:**
- Modify: `src/game/generator.ts:150-210` (drawLock), `src/game/generator.ts:440-505` (generatePuzzleContent)

- [ ] **Step 1: Widen stateTag candidate pool to include non-pickupable locks**

In `src/game/generator.ts`, in `generatePuzzleContent` (currently filtering by `l.pickupable &&`), drop the `pickupable` requirement:

```ts
// Candidate pool for stateTag pairing:
//  - pickupable=true  → state lock (pickupable, inventory transform)
//  - pickupable=false → NPC lock (stationary container bound to room)
const stateLockTemplates = ctx.filteredLockPool.filter(
  l => l.category === 'container' && l.stateTags && l.stateTags.length > 0,
);
```

- [ ] **Step 2: Split candidates inside `drawLock` and add `npcRate` branch**

In `src/game/generator.ts`, update the `drawFrom` inner function of `drawLock` (around line 176-201). Replace this block:

```ts
const drawFrom = (deck: LockTemplate[]): LockTemplate | null => {
  const valid = deck
    .map((tpl, i) => ({ tpl, i }))
    .filter(({ tpl }) => tpl.category === targetCategory && !tpl.pickupable && (!isValid || isValid(tpl)));
  if (valid.length === 0 && (!stateLockCandidates || stateLockCandidates.length === 0)) return null;

  // 合法狀態鎖候選（已在外部過濾 isValid）
  const validStateLocks = stateLockCandidates?.filter(tpl => !isValid || isValid(tpl)) ?? [];

  // 有狀態鎖 → 按 stateLockRate 決定
  if (validStateLocks.length > 0 && (valid.length === 0 || this.rng.next() < (config.stateLockRate ?? 0))) {
    return validStateLocks[this.rng.nextInt(validStateLocks.length)]!;
  }

  if (valid.length === 0) return null;

  // 按 compositeRate 決定組合鎖或單鑰匙鎖
  const composites = valid.filter(v => v.tpl.requiredKeys.length > 1);
  const singles = valid.filter(v => v.tpl.requiredKeys.length <= 1);
  const useComposite = composites.length > 0 && (singles.length === 0 || this.rng.next() < (config.compositeRate ?? 0));
  const pool = useComposite ? composites : (singles.length > 0 ? singles : valid);
  const pick = pool[this.rng.nextInt(pool.length)]!;

  deck.splice(pick.i, 1);
  return pick.tpl;
};
```

with:

```ts
const drawFrom = (deck: LockTemplate[]): LockTemplate | null => {
  const valid = deck
    .map((tpl, i) => ({ tpl, i }))
    .filter(({ tpl }) => tpl.category === targetCategory && !tpl.pickupable && (!isValid || isValid(tpl)));

  // Split stateTag candidates: pickupable = state transform, non-pickupable = NPC
  const stateTagValid = stateLockCandidates?.filter(tpl => !isValid || isValid(tpl)) ?? [];
  const validStateLocks = stateTagValid.filter(tpl => tpl.pickupable === true);
  const validNpcLocks = stateTagValid.filter(tpl => tpl.pickupable !== true);

  if (valid.length === 0 && validStateLocks.length === 0 && validNpcLocks.length === 0) return null;

  // Priority 1: state transform lock (pickupable)
  if (validStateLocks.length > 0 &&
      (valid.length === 0 || this.rng.next() < (config.stateLockRate ?? 0))) {
    return validStateLocks[this.rng.nextInt(validStateLocks.length)]!;
  }

  // Priority 2: NPC lock (non-pickupable with matching stateTag)
  if (validNpcLocks.length > 0 &&
      (valid.length === 0 || this.rng.next() < (config.npcRate ?? 0))) {
    // NPC lock is ALSO in the main deck; find and splice so it isn't redrawn.
    const npc = validNpcLocks[this.rng.nextInt(validNpcLocks.length)]!;
    const idxInDeck = deck.indexOf(npc);
    if (idxInDeck !== -1) deck.splice(idxInDeck, 1);
    return npc;
  }

  if (valid.length === 0) return null;

  // Priority 3: composite or single
  const composites = valid.filter(v => v.tpl.requiredKeys.length > 1);
  const singles = valid.filter(v => v.tpl.requiredKeys.length <= 1);
  const useComposite = composites.length > 0 && (singles.length === 0 || this.rng.next() < (config.compositeRate ?? 0));
  const pool = useComposite ? composites : (singles.length > 0 ? singles : valid);
  const pick = pool[this.rng.nextInt(pool.length)]!;

  deck.splice(pick.i, 1);
  return pick.tpl;
};
```

Note: NPC locks sit in both `stateLockCandidates` (via stateTag match) **and** the main `deck` (they are normal non-pickupable container locks). We splice out of the deck on selection to prevent redraw later.

- [ ] **Step 3: Run all tests to ensure no regression**

Run: `npm test -- --run`
Expected: all pass. (No NPC templates exist yet — new branch is dormant until Task 7.)

- [ ] **Step 4: Commit**

```bash
git add src/game/generator.ts
git commit -m "feat(generator): widen stateTag pool for NPC locks; add npcRate branch in drawLock"
```

---

## Task 6: Investigation key templates (evidence / credential / testimony / personal-item / enhancer)

**Files:**
- Modify: `src/game/templates.ts` (append new entries to `KEY_TEMPLATES`)

- [ ] **Step 1: Append to `KEY_TEMPLATES`**

At the end of `KEY_TEMPLATES` array in `src/game/templates.ts`, before the closing `];`, add:

```ts
  // ─── Investigation: 證據（可重用工具） ───
  { id: 'scene_photo',      name: '現場照片',       description: '案發現場的全景照片，角落隱約有可疑細節。', type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'blood_cloth',      name: '沾血的衣物',     description: '一件沾有血跡的外套，血跡形狀不自然。',       type: 'tool', reusable: true, volume: 1,   tags: ['investigation', 'evidence'] },
  { id: 'suicide_copy',     name: '遺書副本',       description: '一份遺書的影印本，字跡工整得可疑。',         type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'cctv_still',       name: '監視器截圖',     description: '一張從監視器擷取的靜態畫面。',               type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'bank_statement',   name: '帳戶交易紀錄',   description: '一份列印的銀行交易紀錄。',                   type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'phone_records',    name: '電話通聯紀錄',   description: '過去一個月的通話紀錄明細。',                 type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'knife_closeup',    name: '刀具特寫照',     description: '兇案現場刀具的近距離照片。',                 type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'dna_report',       name: 'DNA 比對報告',   description: '一份正式的 DNA 鑑識比對報告。',              type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'timestamp_video',  name: '時間戳記錄影',   description: '一段帶有精確時間戳的短片。',                 type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'fingerprint_scan', name: '指紋鑑定',       description: '一張採證指紋的比對圖。',                     type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'plate_photo',      name: '車牌照片',       description: '一張模糊但能認出號碼的車牌照片。',           type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'shoe_print',       name: '現場鞋印',       description: '一張採模過的鞋印圖，花紋清晰。',             type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'victim_phone',     name: '死者手機',       description: '死者的手機，螢幕鎖已解除。',                 type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'pill_bottle',      name: '藥瓶',           description: '一個處方藥瓶，標籤被刮掉了。',               type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },
  { id: 'iou_note',         name: '借據',           description: '一張寫有大額金額的手寫借據。',               type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'evidence'] },

  // ─── Investigation: 權限（可重用工具） ───
  { id: 'police_badge',     name: '警徽',           description: '一枚磨得發亮的警徽。', type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'credential'] },
  { id: 'search_warrant',   name: '搜查令',         description: '一張有法官簽名的搜查令。', type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'credential'] },
  { id: 'press_pass',       name: '記者證',         description: '一張資深記者的採訪證。', type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'credential'] },
  { id: 'family_consent',   name: '家屬同意書',     description: '受害者家屬的書面授權。', type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'credential'] },
  { id: 'attorney_letter',  name: '律師委任狀',     description: '一張律師事務所的正式委任狀。', type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'credential'] },

  // ─── Investigation: 口信／關鍵字（消耗型 clue，帶 stateTag 供 NPC 連鎖） ───
  { id: 'tip_nickname',     name: '死者的暱稱',     description: '只有親近的人才知道的小名。',             type: 'clue', reusable: false, volume: 0.5, tags: ['investigation', 'testimony'], stateTags: ['tip-nickname'] },
  { id: 'tip_quarrel',      name: '失蹤當晚的爭執', description: '關於死者最後一晚的爭吵細節。',           type: 'clue', reusable: false, volume: 0.5, tags: ['investigation', 'testimony'], stateTags: ['tip-quarrel'] },
  { id: 'tip_money',        name: '神秘的資金來源', description: '一筆無法解釋的匯款來源。',               type: 'clue', reusable: false, volume: 0.5, tags: ['investigation', 'testimony'], stateTags: ['tip-money'] },
  { id: 'tip_hideout',      name: '藏匿地點的線索', description: '某個不為人知的地址。',                   type: 'clue', reusable: false, volume: 0.5, tags: ['investigation', 'testimony'], stateTags: ['tip-hideout'] },
  { id: 'tip_affair',       name: '未公開的關係',   description: '一段外界不知的感情糾葛。',               type: 'clue', reusable: false, volume: 0.5, tags: ['investigation', 'testimony'], stateTags: ['tip-affair'] },
  { id: 'tip_weapon',       name: '兇器來源',       description: '兇器從何而來的關鍵訊息。',               type: 'clue', reusable: false, volume: 0.5, tags: ['investigation', 'testimony'], stateTags: ['tip-weapon'] },
  { id: 'tip_timing',       name: '案發時間的修正', description: '推翻官方時間線的新證詞。',               type: 'clue', reusable: false, volume: 0.5, tags: ['investigation', 'testimony'], stateTags: ['tip-timing'] },
  { id: 'tip_motive',       name: '目擊者的動機',   description: '某個證人為何出現的真實原因。',           type: 'clue', reusable: false, volume: 0.5, tags: ['investigation', 'testimony'], stateTags: ['tip-motive'] },

  // ─── Investigation: 輕型實體鑰匙（消耗型） ───
  { id: 'diary_book',       name: '日記本',         description: '死者的私人日記。',                       type: 'key', reusable: false, volume: 1,   tags: ['investigation', 'personal-item'] },
  { id: 'personal_seal',    name: '私章',           description: '一枚雕工精緻的私章。',                   type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'personal-item'] },
  { id: 'keyring',          name: '鑰匙圈',         description: '一串上面掛著多把鑰匙的鑰匙圈。',         type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'personal-item'] },
  { id: 'pill_case',        name: '藥罐',           description: '一個貼有患者標籤的藥罐。',               type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'personal-item'] },
  { id: 'bankbook',         name: '存摺',           description: '一本紀錄歷年存提款的存摺。',             type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'personal-item'] },
  { id: 'matchbox',         name: '火柴盒',         description: '印有某間酒吧 logo 的火柴盒。',           type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'personal-item'] },
  { id: 'business_card',    name: '名片盒',         description: '裝著數張名片的金屬盒。',                 type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'personal-item'] },
  { id: 'pocket_watch',     name: '懷錶',           description: '一隻停在特定時間的懷錶。',               type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'personal-item'] },
  { id: 'ring',             name: '戒指',           description: '一枚刻著縮寫的戒指。',                   type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'personal-item'] },
  { id: 'address_slip',     name: '手寫地址條',     description: '一張撕下的手寫地址紙條。',               type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'personal-item'] },

  // ─── Investigation: 證據加工工具（reusable，用於 evidence-state 鎖）───
  { id: 'image_enhancer',   name: '影像增強器',     description: '可以提升低解析度畫面的工具。', type: 'tool', reusable: true, volume: 1,   tags: ['investigation', 'enhancer'] },
  { id: 'transparent_tape', name: '透明膠帶',       description: '一卷用來重組碎紙的透明膠帶。', type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'enhancer'] },
  { id: 'decrypt_software', name: '解密軟體',       description: '一份可破解常見加密格式的軟體。', type: 'tool', reusable: true, volume: 0.5, tags: ['investigation', 'enhancer'] },
  { id: 'uv_lamp',          name: '紫外線燈',       description: '可顯現隱形字跡的紫外線燈。', type: 'tool', reusable: true, volume: 1,   tags: ['investigation', 'enhancer'] },
  { id: 'forensic_kit',     name: '鑑識採樣工具',   description: '一套採集 DNA、血跡、指紋的工具組。', type: 'tool', reusable: true, volume: 2,   tags: ['investigation', 'enhancer'] },

  // ─── Investigation: 已加工證據（消耗型 key，帶 stateTag 與 evidence-state 鎖配對）───
  { id: 'enhanced_photo',      name: '清晰截圖',       description: '經過影像增強後可以看清楚的畫面。',     type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'evidence-processed'], stateTags: ['enhanced-photo'] },
  { id: 'restored_document',   name: '拼好的遺書',     description: '用膠帶拼回的完整遺書。',               type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'evidence-processed'], stateTags: ['restored-document'] },
  { id: 'decoded_audio',       name: '還原的錄音',     description: '經過解密的原始錄音檔。',               type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'evidence-processed'], stateTags: ['decoded-audio'] },
  { id: 'revealed_notes',      name: '可讀的筆記',     description: '紫外線下現形的隱藏筆記。',             type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'evidence-processed'], stateTags: ['revealed-notes'] },
  { id: 'dna_sample',          name: '已採樣血跡',     description: '採樣管中的 DNA 樣本。',                type: 'key', reusable: false, volume: 0.5, tags: ['investigation', 'evidence-processed'], stateTags: ['dna-sample'] },
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Verify tests still pass (no filter used yet, so behavior unchanged)**

Run: `npm test -- --run`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/game/templates.ts
git commit -m "feat(templates): add investigation key catalog (evidence/credential/testimony/personal-item/enhancer/processed-evidence)"
```

---

## Task 7: Investigation lock templates (NPC + evidence-state)

**Files:**
- Modify: `src/game/templates.ts` (append to `LOCK_TEMPLATES`)

- [ ] **Step 1: Append evidence-state locks (pickupable) to `LOCK_TEMPLATES`**

Before the closing `];` of `LOCK_TEMPLATES`, add:

```ts
  // ─── Investigation: 證據加工狀態鎖（pickupable，背包內加工）───
  {
    id: 'blurry_cctv', name: '模糊的監視器截圖',
    lockedDescription: '畫面極度模糊，完全看不清細節。',
    unlockDescription: '影像增強後，關鍵畫面終於清晰。',
    category: 'container', mechanism: 'physical', capacity: 2, volume: 0.5,
    tags: ['investigation', 'evidence-state'],
    requiredKeys: ['image_enhancer'],
    pickupable: true,
    stateTags: ['enhanced-photo'],
    variations: [
      { name: '模糊的監視器截圖', lockMsg: '畫面極度模糊，看不清細節。', unlockMsg: '影像增強後，關鍵畫面終於清晰。' },
    ],
  },
  {
    id: 'torn_letter', name: '撕碎的遺書',
    lockedDescription: '遺書被撕成碎片，內容支離破碎。',
    unlockDescription: '你用透明膠帶一片一片拼回，完整訊息呈現。',
    category: 'container', mechanism: 'physical', capacity: 2, volume: 0.5,
    tags: ['investigation', 'evidence-state'],
    requiredKeys: ['transparent_tape'],
    pickupable: true,
    stateTags: ['restored-document'],
    variations: [
      { name: '撕碎的遺書', lockMsg: '遺書被撕成碎片。', unlockMsg: '你用膠帶拼回了完整遺書。' },
    ],
  },
  {
    id: 'encrypted_audio', name: '加密的錄音檔',
    lockedDescription: '一段加密的錄音檔，聽起來只是雜訊。',
    unlockDescription: '解密軟體執行後，原始對話浮現。',
    category: 'container', mechanism: 'physical', capacity: 2, volume: 0.5,
    tags: ['investigation', 'evidence-state'],
    requiredKeys: ['decrypt_software'],
    pickupable: true,
    stateTags: ['decoded-audio'],
    variations: [
      { name: '加密的錄音檔', lockMsg: '錄音只有雜訊。', unlockMsg: '解密後，對話浮現。' },
    ],
  },
  {
    id: 'burned_notebook', name: '燒焦的筆記本',
    lockedDescription: '筆記本被火燒過，字跡難以辨認。',
    unlockDescription: '紫外線燈下，隱藏的字跡顯現。',
    category: 'container', mechanism: 'physical', capacity: 2, volume: 1,
    tags: ['investigation', 'evidence-state'],
    requiredKeys: ['uv_lamp'],
    pickupable: true,
    stateTags: ['revealed-notes'],
    variations: [
      { name: '燒焦的筆記本', lockMsg: '字跡難以辨認。', unlockMsg: '紫外線下，字跡顯現。' },
    ],
  },
  {
    id: 'stained_cloth', name: '沾血的衣物樣本',
    lockedDescription: '一件沾血的衣物樣本，血跡需要正式採樣才能送驗。',
    unlockDescription: '採樣工具抽取了乾淨的樣本，可用於 DNA 比對。',
    category: 'container', mechanism: 'physical', capacity: 2, volume: 1,
    tags: ['investigation', 'evidence-state'],
    requiredKeys: ['forensic_kit'],
    pickupable: true,
    stateTags: ['dna-sample'],
    variations: [
      { name: '沾血的衣物樣本', lockMsg: '血跡需要正式採樣。', unlockMsg: '樣本採集完畢。' },
    ],
  },
```

- [ ] **Step 2: Append NPC locks (non-pickupable) to `LOCK_TEMPLATES`**

Continue appending, before the closing `];`:

```ts
  // ─── Investigation: NPC 鎖（不可拾取，固定房間內）───
  // 每個 NPC 有 1-3 把 requiredKeys，混合證據/關鍵字/權限。
  // capacity 4-8（放文件、輕物、新口信），volume 0（場景固定）。
  // stateTags 讓演算法把特定口信 clue 優先交給這位 NPC。

  // 目擊者類
  {
    id: 'npc_concierge', name: '夜班門房',
    lockedDescription: '門房警戒地看著你，守口如瓶。',
    unlockDescription: '他嘆了口氣，終於點頭開始說出他看到的。',
    category: 'container', mechanism: 'combination', capacity: 6, volume: 0,
    tags: ['investigation', 'npc', 'witness'],
    requiredKeys: ['police_badge', 'cctv_still'],
    pickupable: false,
    stateTags: ['tip-timing'],
    variations: [
      { name: '夜班門房', lockMsg: '門房警戒地看著你。', unlockMsg: '他嘆了口氣，開始說出看到的。' },
      { name: '值夜保全', lockMsg: '保全握著警棍不說話。', unlockMsg: '他鬆懈下來，談起那晚的狀況。' },
    ],
  },
  {
    id: 'npc_cleaner', name: '清潔阿姨',
    lockedDescription: '阿姨嘴巴閉得緊緊的，怕惹麻煩。',
    unlockDescription: '你遞上家屬同意書，她終於願意說。',
    category: 'container', mechanism: 'physical', capacity: 4, volume: 0,
    tags: ['investigation', 'npc', 'witness'],
    requiredKeys: ['family_consent'],
    pickupable: false,
    stateTags: ['tip-quarrel'],
    variations: [
      { name: '清潔阿姨', lockMsg: '阿姨怕惹麻煩。', unlockMsg: '看到同意書，她終於願意說。' },
    ],
  },
  {
    id: 'npc_clerk', name: '便利商店店員',
    lockedDescription: '店員忙著結帳，敷衍地應付你。',
    unlockDescription: '監視器截圖讓他想起那個人，他打開話匣子。',
    category: 'container', mechanism: 'physical', capacity: 4, volume: 0,
    tags: ['investigation', 'npc', 'witness'],
    requiredKeys: ['cctv_still'],
    pickupable: false,
    stateTags: ['tip-timing'],
    variations: [
      { name: '便利商店店員', lockMsg: '店員敷衍應付。', unlockMsg: '看到截圖，他打開話匣子。' },
    ],
  },
  {
    id: 'npc_taxi', name: '計程車司機',
    lockedDescription: '司機對乘客隱私守口如瓶。',
    unlockDescription: '你出示搜查令，他交出了行車紀錄。',
    category: 'container', mechanism: 'physical', capacity: 6, volume: 0,
    tags: ['investigation', 'npc', 'witness'],
    requiredKeys: ['search_warrant'],
    pickupable: false,
    stateTags: ['tip-hideout'],
    variations: [
      { name: '計程車司機', lockMsg: '司機守口如瓶。', unlockMsg: '看到搜查令，他交出了行車紀錄。' },
    ],
  },
  {
    id: 'npc_dogwalker', name: '遛狗的老人',
    lockedDescription: '老人裝作沒聽到你的問題。',
    unlockDescription: '聊起那晚的吠叫聲，他終於把看到的人描述出來。',
    category: 'container', mechanism: 'combination', capacity: 4, volume: 0,
    tags: ['investigation', 'npc', 'witness'],
    requiredKeys: ['scene_photo', 'tip_timing'],
    pickupable: false,
    stateTags: ['tip-motive'],
    variations: [
      { name: '遛狗的老人', lockMsg: '老人裝作沒聽到。', unlockMsg: '他描述了那晚看到的人。' },
    ],
  },

  // 關係人類
  {
    id: 'npc_exwife', name: '死者前妻',
    lockedDescription: '她冷淡地看著你，不想重提往事。',
    unlockDescription: '看見死者日記，她情緒崩潰，所有事一併吐露。',
    category: 'container', mechanism: 'combination', capacity: 8, volume: 0,
    tags: ['investigation', 'npc', 'relative'],
    requiredKeys: ['diary_book', 'tip_affair'],
    pickupable: false,
    stateTags: ['tip-money'],
    variations: [
      { name: '死者前妻', lockMsg: '她不想重提往事。', unlockMsg: '看見日記，她情緒崩潰吐露一切。' },
    ],
  },
  {
    id: 'npc_roommate', name: '失蹤者室友',
    lockedDescription: '室友很緊張，欲言又止。',
    unlockDescription: '你遞上遺物，她終於說出當晚的爭執。',
    category: 'container', mechanism: 'physical', capacity: 6, volume: 0,
    tags: ['investigation', 'npc', 'relative'],
    requiredKeys: ['personal_seal'],
    pickupable: false,
    stateTags: ['tip-quarrel'],
    variations: [
      { name: '失蹤者室友', lockMsg: '她欲言又止。', unlockMsg: '你遞上遺物，她說出當晚的爭執。' },
    ],
  },
  {
    id: 'npc_coworker', name: '死者同事',
    lockedDescription: '同事正在工作，不願被打擾。',
    unlockDescription: '帳戶紀錄攤開在他面前，他坐下來開始談錢的事。',
    category: 'container', mechanism: 'physical', capacity: 4, volume: 0,
    tags: ['investigation', 'npc', 'relative'],
    requiredKeys: ['bank_statement'],
    pickupable: false,
    stateTags: ['tip-money'],
    variations: [
      { name: '死者同事', lockMsg: '同事不願被打擾。', unlockMsg: '帳戶紀錄讓他開始談錢的事。' },
    ],
  },
  {
    id: 'npc_mother', name: '受害者母親',
    lockedDescription: '母親哭得無法言語。',
    unlockDescription: '拼好的遺書讓她深吸一口氣，說出不為人知的家族秘密。',
    category: 'container', mechanism: 'physical', capacity: 8, volume: 0,
    tags: ['investigation', 'npc', 'relative'],
    requiredKeys: ['restored_document'],
    pickupable: false,
    stateTags: ['tip-affair'],
    variations: [
      { name: '受害者母親', lockMsg: '母親哭得無法言語。', unlockMsg: '她深吸一口氣，說出家族秘密。' },
    ],
  },

  // 專業人士類
  {
    id: 'npc_coroner', name: '法醫',
    lockedDescription: '法醫正在撰寫報告，不願多說。',
    unlockDescription: '警徽 + 律師委任狀齊備，他把完整的鑑識細節告訴你。',
    category: 'container', mechanism: 'combination', capacity: 6, volume: 0,
    tags: ['investigation', 'npc', 'professional'],
    requiredKeys: ['police_badge', 'attorney_letter'],
    pickupable: false,
    stateTags: ['tip-weapon'],
    variations: [
      { name: '法醫', lockMsg: '法醫不願多說。', unlockMsg: '他說出完整的鑑識細節。' },
    ],
  },
  {
    id: 'npc_reporter', name: '資深記者',
    lockedDescription: '記者滑著手機，對你興趣缺缺。',
    unlockDescription: '你用名片盒和他交換，他打開了採訪筆記。',
    category: 'container', mechanism: 'combination', capacity: 6, volume: 0,
    tags: ['investigation', 'npc', 'professional'],
    requiredKeys: ['press_pass', 'business_card'],
    pickupable: false,
    stateTags: ['tip-motive'],
    variations: [
      { name: '資深記者', lockMsg: '記者興趣缺缺。', unlockMsg: '他打開了採訪筆記。' },
    ],
  },
  {
    id: 'npc_pi', name: '私家偵探',
    lockedDescription: '偵探眼神銳利，等著看你的籌碼。',
    unlockDescription: '懷錶和還原的錄音一起擺上桌，他沒辦法再裝糊塗。',
    category: 'container', mechanism: 'combination', capacity: 6, volume: 0,
    tags: ['investigation', 'npc', 'professional'],
    requiredKeys: ['pocket_watch', 'decoded_audio'],
    pickupable: false,
    stateTags: ['tip-hideout'],
    variations: [
      { name: '私家偵探', lockMsg: '偵探等著看你的籌碼。', unlockMsg: '他沒辦法再裝糊塗。' },
    ],
  },
  {
    id: 'npc_paralegal', name: '律師事務所職員',
    lockedDescription: '職員只願意談公事。',
    unlockDescription: '你出示律師委任狀，他翻出機密檔案。',
    category: 'container', mechanism: 'physical', capacity: 8, volume: 0,
    tags: ['investigation', 'npc', 'professional'],
    requiredKeys: ['attorney_letter'],
    pickupable: false,
    stateTags: ['tip-affair'],
    variations: [
      { name: '律師事務所職員', lockMsg: '職員只願意談公事。', unlockMsg: '他翻出機密檔案。' },
    ],
  },
  {
    id: 'npc_realtor', name: '房屋仲介',
    lockedDescription: '仲介很客氣但話鋒很謹慎。',
    unlockDescription: '手寫地址條遞過去，他終於點出那棟公寓的真實屋主。',
    category: 'container', mechanism: 'physical', capacity: 4, volume: 0,
    tags: ['investigation', 'npc', 'professional'],
    requiredKeys: ['address_slip'],
    pickupable: false,
    stateTags: ['tip-hideout'],
    variations: [
      { name: '房屋仲介', lockMsg: '仲介話鋒謹慎。', unlockMsg: '他點出公寓的真實屋主。' },
    ],
  },

  // 嫌疑人類
  {
    id: 'npc_hotelmanager', name: '旅館經理',
    lockedDescription: '經理微笑接待，但眼神躲閃。',
    unlockDescription: '你把現場鞋印和電話通聯紀錄攤開，他的微笑消失了。',
    category: 'container', mechanism: 'combination', capacity: 6, volume: 0,
    tags: ['investigation', 'npc', 'suspect'],
    requiredKeys: ['shoe_print', 'phone_records'],
    pickupable: false,
    stateTags: ['tip-quarrel'],
    variations: [
      { name: '旅館經理', lockMsg: '經理眼神躲閃。', unlockMsg: '他的微笑消失了。' },
    ],
  },
  {
    id: 'npc_blackmarket', name: '黑市掮客',
    lockedDescription: '掮客警戒地上下打量你。',
    unlockDescription: '你把兇刀特寫甩在桌上，他明白裝不下去了。',
    category: 'container', mechanism: 'physical', capacity: 6, volume: 0,
    tags: ['investigation', 'npc', 'suspect'],
    requiredKeys: ['knife_closeup'],
    pickupable: false,
    stateTags: ['tip-weapon'],
    variations: [
      { name: '黑市掮客', lockMsg: '掮客警戒地打量你。', unlockMsg: '他明白裝不下去了。' },
    ],
  },
  {
    id: 'npc_guardleader', name: '保全隊長',
    lockedDescription: '隊長立正站好，例行公事地回答。',
    unlockDescription: '警徽 + 清晰截圖齊發，他低下頭承認當晚的失職。',
    category: 'container', mechanism: 'combination', capacity: 6, volume: 0,
    tags: ['investigation', 'npc', 'suspect'],
    requiredKeys: ['police_badge', 'enhanced_photo'],
    pickupable: false,
    stateTags: ['tip-timing'],
    variations: [
      { name: '保全隊長', lockMsg: '隊長例行公事回答。', unlockMsg: '他承認當晚的失職。' },
    ],
  },
  {
    id: 'npc_superintendent', name: '公寓大樓管理員',
    lockedDescription: '管理員躲在櫃檯後面看你。',
    unlockDescription: '鑰匙圈叮噹作響地擺上櫃檯，他緊張地開始解釋。',
    category: 'container', mechanism: 'physical', capacity: 4, volume: 0,
    tags: ['investigation', 'npc', 'suspect'],
    requiredKeys: ['keyring'],
    pickupable: false,
    stateTags: ['tip-hideout'],
    variations: [
      { name: '公寓大樓管理員', lockMsg: '管理員躲在櫃檯後。', unlockMsg: '他緊張地開始解釋。' },
    ],
  },

  // 邊緣角色類
  {
    id: 'npc_intern', name: '實習生',
    lockedDescription: '實習生眼神飄忽，怕說錯話。',
    unlockDescription: '你友善地問候，他放下戒心分享自己無意中看到的。',
    category: 'container', mechanism: 'physical', capacity: 4, volume: 0,
    tags: ['investigation', 'npc', 'edge'],
    requiredKeys: ['tip_nickname'],
    pickupable: false,
    stateTags: ['tip-money'],
    variations: [
      { name: '實習生', lockMsg: '實習生眼神飄忽。', unlockMsg: '他放下戒心分享看到的。' },
    ],
  },
  {
    id: 'npc_courier', name: '送貨員',
    lockedDescription: '送貨員忙著清點貨品。',
    unlockDescription: '看到紙條上的地址，他抬起頭說「我記得這地方」。',
    category: 'container', mechanism: 'physical', capacity: 4, volume: 0,
    tags: ['investigation', 'npc', 'edge'],
    requiredKeys: ['address_slip'],
    pickupable: false,
    stateTags: ['tip-hideout'],
    variations: [
      { name: '送貨員', lockMsg: '送貨員忙著清點。', unlockMsg: '他說「我記得這地方」。' },
    ],
  },
  {
    id: 'npc_bartender', name: '酒保',
    lockedDescription: '酒保擦著杯子不想說多餘的話。',
    unlockDescription: '火柴盒上的 logo 讓他認出你，他低聲說起那晚的常客。',
    category: 'container', mechanism: 'physical', capacity: 4, volume: 0,
    tags: ['investigation', 'npc', 'edge'],
    requiredKeys: ['matchbox'],
    pickupable: false,
    stateTags: ['tip-affair'],
    variations: [
      { name: '酒保', lockMsg: '酒保不想多說。', unlockMsg: '他低聲說起那晚的常客。' },
    ],
  },
  {
    id: 'npc_regular', name: '常客',
    lockedDescription: '常客看似很熟這裡，但不想多聊。',
    unlockDescription: '你提起他熟悉的暱稱，他眼神一亮，開始暢談。',
    category: 'container', mechanism: 'physical', capacity: 4, volume: 0,
    tags: ['investigation', 'npc', 'edge'],
    requiredKeys: ['tip_nickname'],
    pickupable: false,
    stateTags: ['tip-motive'],
    variations: [
      { name: '常客', lockMsg: '常客不想多聊。', unlockMsg: '聽到暱稱，他眼神一亮。' },
    ],
  },
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 4: Run template-check skill for duplicates / orphans**

Invoke the `template-check` skill (available as `/template-check`) and verify: no duplicate IDs, no orphan required keys, key/lock stateTags properly cross-reference.

If the skill isn't runnable inline, at minimum run:

```bash
npm test -- --run
```

Expected: all existing tests still pass (since no filter is applied by default, investigation templates just add to the shuffle deck — but they won't be picked because there's no stateTag-bearing item in classic puzzles unless the evidence-processed keys get seeded, which is fine since they're also in the extended pool).

- [ ] **Step 5: Commit**

```bash
git add src/game/templates.ts
git commit -m "feat(templates): add investigation lock catalog (5 evidence-state + 20 NPC locks)"
```

---

## Task 8: Solvability test for investigation mode

**Files:**
- Modify: `src/game/__tests__/investigation.test.ts`

- [ ] **Step 1: Append investigation-mode solvability block**

At the end of `src/game/__tests__/investigation.test.ts`, add:

```ts
describe('投查模式可解性', () => {
  const INVESTIGATION_BASE: GeneratorConfig = {
    targetDepth: 6,
    maxRooms: 4,
    depthStaggerVariance: 1,
    compositeRate: 0.5,
    reuseRate: 0.6,
    maxReusesPerTool: 3,
    crossRoomRate: 0.5,
    stateLockRate: 0.3,
    npcRate: 0.7,
    includeTemplateTags: ['investigation'],
  };

  it('純 investigation tag 過濾：100 次全部可解', async () => {
    const { solvePuzzle } = await import('../solver');
    let npcSeen = 0;
    for (let i = 0; i < 100; i++) {
      const puzzle = generatePuzzle({ ...INVESTIGATION_BASE, seed: i });
      const result = solvePuzzle(puzzle);
      expect(result.solvable, `seed=${i} not solvable: ${result.blockedItems.join(', ')}`).toBe(true);
      for (const lock of Object.values(puzzle.locks)) {
        const tpl = LOCK_TEMPLATES.find(t => t.variations.some(v =>
          lock.name === v.name || lock.name.startsWith(v.name)));
        if (tpl?.tags.includes('npc')) { npcSeen++; break; }
      }
    }
    expect(npcSeen, 'NPC locks never appeared across 100 seeds').toBeGreaterThan(10);
  });

  it('mixed 模式（無 filter）：50 次全部可解', async () => {
    const { solvePuzzle } = await import('../solver');
    for (let i = 0; i < 50; i++) {
      const puzzle = generatePuzzle({ ...INVESTIGATION_BASE, includeTemplateTags: undefined, seed: i });
      const result = solvePuzzle(puzzle);
      expect(result.solvable, `seed=${i} not solvable`).toBe(true);
    }
  });

  it('classic-only 模式：50 次全部可解，且無 investigation 鎖', async () => {
    const { solvePuzzle } = await import('../solver');
    for (let i = 0; i < 50; i++) {
      const puzzle = generatePuzzle({
        ...INVESTIGATION_BASE,
        includeTemplateTags: undefined,
        excludeTemplateTags: ['investigation'],
        seed: i,
      });
      const result = solvePuzzle(puzzle);
      expect(result.solvable).toBe(true);
      for (const lock of Object.values(puzzle.locks)) {
        const tpl = LOCK_TEMPLATES.find(t => t.variations.some(v =>
          lock.name === v.name || lock.name.startsWith(v.name)));
        if (tpl) expect(tpl.tags).not.toContain('investigation');
      }
    }
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npm test -- --run src/game/__tests__/investigation.test.ts`
Expected: all pass. If solvability fails, inspect with `/trace-seed <failing-seed>` and adjust template `requiredKeys` (too many or unreachable combos) until green.

- [ ] **Step 3: Commit**

```bash
git add src/game/__tests__/investigation.test.ts
git commit -m "test: solvability for investigation/mixed/classic modes"
```

---

## Task 9: Dump tag for NPC locks

**Files:**
- Modify: `src/game/dump.ts`

- [ ] **Step 1: Add NPC detection helper**

Open `src/game/dump.ts`. After the existing `itemTag` helper (line 3-7), add:

```ts
function lockTag(lock: { stateTags?: string[]; pickupable: boolean; category: string }): string {
  // NPC = non-pickupable container lock with stateTags
  if (lock.category === 'container' && !lock.pickupable && lock.stateTags && lock.stateTags.length > 0) {
    return '[NPC]';
  }
  return '';
}
```

- [ ] **Step 2: Add NPC tag in the CONTAINER LOCKS section of dump output**

In `src/game/dump.ts`, find the container-lock rendering loop around line 97-122. The existing line 120-121 builds:

```ts
const miniTag = lock.mechanism === 'minigame' ? '[MINI] ' : '';
lines.push(`  R${roomIdx}: ${miniTag}{${reqStr} → ${hidesLabels}}`);
```

Change to:

```ts
const miniTag = lock.mechanism === 'minigame' ? '[MINI] ' : '';
const npcTag = lockTag(lock) ? `${lockTag(lock)} ` : '';
lines.push(`  R${roomIdx}: ${npcTag}${miniTag}{${reqStr} → ${hidesLabels}}`);
```

- [ ] **Step 3: Run dump test to confirm format still valid**

Run: `npm test -- --run src/game/__tests__/dump.test.ts`
Expected: passes (existing tests don't assert on NPC prefix, but structure remains intact).

- [ ] **Step 4: Commit**

```bash
git add src/game/dump.ts
git commit -m "feat(dump): prefix NPC locks with [NPC] marker for debug dumps"
```

---

## Task 10: UI — NPC visuals + `出示` interaction label

**Files:**
- Modify: `src/components/CanvasGraph.tsx:318-344` (node render), `src/components/CanvasGraph.tsx:228-238` (legend), `src/components/InteractionPanel.tsx` (NPC region + button label)

- [ ] **Step 1: Add NPC detection helper (shared)**

At the top of `src/components/InteractionPanel.tsx` (after imports), add:

```ts
function isNpcLock(lock: { pickupable: boolean; stateTags?: string[]; category: string }): boolean {
  return lock.category === 'container' && !lock.pickupable
    && !!lock.stateTags && lock.stateTags.length > 0;
}
```

And at the top of `src/components/CanvasGraph.tsx` (after imports), add the same helper (or extract into `src/game/utils.ts` — simpler to duplicate for one line).

- [ ] **Step 2: Indigo color for NPC nodes in CanvasGraph**

In `src/components/CanvasGraph.tsx`, inside the lock-node branch (currently lines 323-337), insert an NPC check BEFORE the generic container fallback:

```ts
if (node.entityType === 'lock') {
  const lock = puzzle.locks[node.id];
  if (node.isExit) {
    borderColor = 'border-amber-700/60';
    dotColor = 'bg-amber-500 shadow-amber-500/50';
  } else if (lock?.mechanism === 'minigame') {
    borderColor = 'border-orange-700/60';
    dotColor = 'bg-orange-500 shadow-orange-500/50';
  } else if (node.category === 'spatial') {
    borderColor = 'border-purple-900/60';
    dotColor = 'bg-purple-500 shadow-purple-500/50';
  } else if (lock && isNpcLock(lock)) {
    borderColor = 'border-indigo-900/60';
    dotColor = 'bg-indigo-500 shadow-indigo-500/50';
  } else {
    borderColor = 'border-rose-900/60';
    dotColor = 'bg-rose-500 shadow-rose-500/50';
  }
}
```

- [ ] **Step 3: Add NPC entry to legend**

In `src/components/CanvasGraph.tsx`, find the legend around line 230 and add after the container-lock entry:

```tsx
<div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> 容器鎖</div>
<div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" /> NPC 鎖</div>
<div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500" /> 空間鎖（門）</div>
```

- [ ] **Step 4: Label change only — `出示` when the target is an NPC lock**

We keep NPC locks inside the existing 機關與通道 region (don't split — it adds UI complexity and the `對話` title provides no functional value; the indigo node color in the graph is the main visual signal). Just change the action-button label from `使用` to `出示` when the lock is an NPC.

In `src/components/InteractionPanel.tsx`, find the btnLabel computation (line 221):

```ts
// before
const btnLabel = isPassword ? '密碼' : minigameReady ? '挑戰' : '使用';

// after
const isNpc = isNpcLock(lock);
const btnLabel = isPassword ? '密碼' : minigameReady ? '挑戰' : isNpc ? '出示' : '使用';
```

Also change the lock-button text color to indigo for NPC locks. Around line 194-198, add an `isNpc` branch:

```tsx
className={`px-2.5 py-2 rounded text-[11px] md:text-xs border flex-1 text-left flex items-center gap-1.5 truncate shadow-sm ${
  isSpatial && !isLocal
    ? 'bg-sky-950 hover:bg-sky-900 active:bg-sky-800 text-sky-200 border-sky-800'
    : isNpc
      ? 'bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-indigo-200 border-indigo-900/60'
      : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-amber-200 border-slate-700'
}`}
```

Hoist `const isNpc = isNpcLock(lock);` up beside `const isSpatial = lock.category === 'spatial';` (line 179) so it's in scope for both the outer button classes and the inner btnLabel.

- [ ] **Step 5: Manual UI smoke test**

Run: `npm run dev`
Then open the browser, generate a puzzle with these settings (via the SettingsModal — done in Task 11, for now use devtools console to inject):

```js
// in browser devtools:
localStorage.setItem('puzzle-graph:config', JSON.stringify({
  targetDepth: 6, maxRooms: 4, depthStaggerVariance: 1,
  includeTemplateTags: ['investigation'], npcRate: 0.7,
  compositeRate: 0.5, reuseRate: 0.6, maxReusesPerTool: 3,
}));
location.reload();
```

Expected: some rooms contain NPC locks with indigo nodes in the graph and a 對話 region in the interaction panel with 出示 buttons.

- [ ] **Step 6: Commit**

```bash
git add src/components/CanvasGraph.tsx src/components/InteractionPanel.tsx
git commit -m "feat(ui): indigo NPC nodes + 對話 region with 出示 labels"
```

---

## Task 11: SettingsModal — `npcRate` slider + mode presets

**Files:**
- Modify: `src/hooks/useGameState.ts:18-29` (presets), `src/components/SettingsModal.tsx:14-37` (slider config)

- [ ] **Step 1: Add presets to `useGameState.ts`**

Near the top of `src/hooks/useGameState.ts`, after `DEFAULT_CONFIG`, add:

```ts
export const CLASSIC_PRESET: GeneratorConfig = {
  ...DEFAULT_CONFIG,
  excludeTemplateTags: ['investigation'],
  npcRate: 0,
};

export const INVESTIGATION_PRESET: GeneratorConfig = {
  targetDepth: 8,
  maxRooms: 4,
  depthStaggerVariance: 1,
  compositeRate: 0.5,
  keySpreadRate: 0.5,
  crossRoomRate: 0.5,
  reuseRate: 0.6,
  maxReusesPerTool: 3,
  maxNestingDepth: 2,
  consolidationRate: 0.4,
  stateLockRate: 0.3,
  npcRate: 0.7,
  includeTemplateTags: ['investigation'],
};

export const MIXED_PRESET: GeneratorConfig = {
  ...DEFAULT_CONFIG,
  targetDepth: 8,
  maxRooms: 4,
  npcRate: 0.4,
  reuseRate: 0.5,
};

export const PRESETS: { key: string; label: string; config: GeneratorConfig }[] = [
  { key: 'classic', label: '經典模式', config: CLASSIC_PRESET },
  { key: 'mixed', label: '混合模式', config: MIXED_PRESET },
  { key: 'investigation', label: '偵訊模式', config: INVESTIGATION_PRESET },
];
```

- [ ] **Step 2: Add `npcRate` slider to `SettingsModal.tsx`**

In `src/components/SettingsModal.tsx`:

(a) Add `'npcRate'` to the `NumericConfigKey` union (line 14):

```ts
type NumericConfigKey = 'targetDepth' | 'maxRooms' | 'compositeRate' | 'depthStaggerVariance' | 'keySpreadRate' | 'crossRoomRate' | 'reuseRate' | 'maxNestingDepth' | 'consolidationRate' | 'stateLockRate' | 'npcRate';
```

(b) Add a slider entry in the `SLIDERS` array:

```ts
{ key: 'npcRate', label: 'NPC 鎖機率', desc: '有配對口信時選 NPC 鎖的機率', min: 0, max: 1, step: 0.1, color: 'accent-indigo-500' },
```

- [ ] **Step 3: Add preset dropdown to `SettingsModal.tsx`**

Import presets at the top of `src/components/SettingsModal.tsx`:

```ts
import { PRESETS } from '../hooks/useGameState';
```

Add a dropdown near the top of the modal body (before the sliders). Find the place just above the slider grid and insert:

```tsx
<div className="mb-4">
  <label className="block text-sm text-slate-300 mb-1">模板主題</label>
  <select
    className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-100"
    onChange={(e) => {
      const p = PRESETS.find(x => x.key === e.target.value);
      if (p) setDraft({ ...p.config });
    }}
    defaultValue=""
  >
    <option value="" disabled>套用 preset……</option>
    {PRESETS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
  </select>
  <p className="text-xs text-slate-500 mt-1">選擇後會覆蓋以下所有數值</p>
</div>
```

- [ ] **Step 4: Verify the dev UI**

Run: `npm run dev`
Open the settings modal. Confirm:
- Preset dropdown appears and switches sliders when chosen
- `NPC 鎖機率` slider renders
- Choosing `偵訊模式` → apply → new puzzle contains NPC locks

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useGameState.ts src/components/SettingsModal.tsx
git commit -m "feat(ui): investigation/mixed/classic presets + npcRate slider in SettingsModal"
```

---

## Task 12: Final verification

- [ ] **Step 1: Full test run**

Run: `npm test -- --run`
Expected: all tests pass, including the new investigation suite.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual playthrough**

Run: `npm run dev`

Verify by playing:
1. Pick 偵訊模式 preset → apply → new game
2. Confirm NPC nodes are indigo in graph, 對話 region renders in interaction panel
3. Play through one puzzle end-to-end
4. Repeat with different seeds (5x) — each solvable without getting stuck
5. Verify classic mode still works (pick 經典模式 preset → new game → no investigation nodes)

Document any failures as new issues. Do NOT mark verified unless all five seeds complete.

- [ ] **Step 4: Final commit (optional — empty or docs update only)**

If any fixes were needed during verification, commit them. Otherwise, nothing more to commit.

---

## Success Criteria

- `npm test -- --run` passes
- `npx tsc --noEmit` passes
- `investigation` preset generates puzzles with ≥1 NPC lock in ≥90% of seeds (verified by solvability test in Task 8)
- Classic preset generates puzzles with 0 investigation templates (verified by solvability test in Task 8)
- Manual playthrough completes 5/5 seeds in investigation mode
