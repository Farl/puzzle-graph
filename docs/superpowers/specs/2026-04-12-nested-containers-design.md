# Nested Containers + Volume System + Graph Grouping

## Summary

Support containers inside containers (e.g. drawer containing a safe), with a volume-based capacity system to determine what fits where, and room-based grouping in the graph visualization.

## Context

Currently `Lock.containsItems: ItemId[]` only holds items. All container locks are flat on the room floor — there is no spatial nesting. `KeyTemplate` has a `volume` field (1-3) but nothing consumes it. `LockTemplate` has `maxItems` but no volume/capacity concept.

## Design Decisions

### Unified contents model

A container lock's hidden contents (items and child locks) are stored in a single `contents: string[]` array, replacing the current `containsItems: ItemId[]`. Rationale:

- From the container's perspective, it doesn't care what it hides — both items and sub-locks are "things inside me"
- Volume check is the same for both: `sum of contents' volumes <= capacity`
- Graph grouping treats both the same: children of the container sub-group
- The only divergence is at release time (items → `visibleItems`, locks → `lockIds`), handled by a single lookup dispatch

This is distinct from `targetRoomId` (spatial connectivity), which remains separate because it has fundamentally different semantics — gating traversal to another space vs revealing hidden content in the current room.

### Nesting depth controlled by config

Nesting is recursive with a configurable `maxNestingDepth` limit. No separate `nestingRate` parameter — nesting happens naturally within the existing `targetDepth` budget, as long as a suitable outer container exists (volume check passes).

## Data Model Changes

### Item (runtime)

```typescript
interface Item {
  // ... existing fields ...

  // NEW
  volume: number;            // item's volume (copied from KeyTemplate at creation time)
}
```

Currently `Item` has no `volume` field — it only exists on `KeyTemplate`. Since the volume system needs to check item volumes at runtime (engine, solver) and during generation, `volume` must be on the runtime `Item` type. The generator's `createItem` / `createConsumableItem` methods will copy `volume` from the `KeyTemplate`.

### Lock (runtime)

```typescript
interface Lock {
  // ... existing fields ...

  // RENAME: containsItems → contents
  contents: string[];        // ItemId | LockId — hidden inside this container

  // NEW
  capacity: number;          // total volume this container can hold
  volume: number;            // this container's own volume (when nested inside another)
}
```

### LockTemplate

```typescript
interface LockTemplate {
  // ... existing fields ...

  // REPLACE maxItems
  capacity: number;          // total volume capacity
  volume: number;            // container's own volume when nested
}
```

### GeneratorConfig

```typescript
interface GeneratorConfig {
  // ... existing fields ...
  maxNestingDepth?: number;  // max container nesting depth (default: 2)
}
```

### Template data (examples)

| Container | volume (self) | capacity |
|-----------|--------------|----------|
| Dark corner / small box | 2 | 3 |
| Locked chest / toolbox | 4 | 6 |
| Nailed crate / high-tech safe | 5 | 8 |

Items retain existing volume values (1-3).

## Volume Rules

When the generator places content inside a container:

```
usedVolume = sum(item.volume for item in contents if item in items)
           + sum(lock.volume for lock in contents if lock in locks)

canFit(newEntity) = usedVolume + newEntity.volume <= container.capacity
```

Note: `LockTemplate.maxItems` exists in the current codebase but is **never enforced** — the generator currently places exactly one item per container lock. The volume system is new enforcement logic, not a replacement of existing enforcement. `maxItems` will be removed and replaced by `capacity`.

A container with `capacity: 6` can hold one item of volume 3 + one sub-container of volume 2, or three items of volume 2, etc.

## Generator Changes

### `createLock` signature change

Currently `createLock(variation, isSpatial, roomId, isExit)` takes a `FamilyVariation` only. It must be extended to also receive `capacity` and `volume` from the `LockTemplate`. For spatial locks (doors) and the exit lock, `capacity` and `volume` default to 0 (they cannot contain anything or be nested).

### Phase B: Current behavior

BFS queue contains `PhaseBTarget` (items only). Each item can be wrapped in a container lock. Keys for that lock are enqueued for further wrapping.

### New behavior

The existing `PhaseBTarget` is extended with an optional `lockId` field and a `nestingDepth` field. When `lockId` is set, the target represents a container lock to be nested (instead of an item to be wrapped).

1. When a container lock is created, if `nestingDepth < maxNestingDepth` and the depth budget allows, a new `PhaseBTarget` with `lockId` set is enqueued.
2. When a lock-target is dequeued, the generator looks for an outer container template where `capacity >= usedVolume + innerLock.volume`.
3. If a suitable outer container exists, the inner lock's ID is pushed into `outerLock.contents`. The inner lock is removed from `room.lockIds` (it's now hidden).
4. If no suitable container exists or the budget is exhausted, the lock stays on the room floor as-is (target is discarded).

### Constraints

- **Only container-category locks may be nested.** Spatial locks (doors with `targetRoomId`) cannot be placed inside containers — a door hidden inside a box makes no sense.
- **Nested locks must share the same `roomId` as their parent container.** This is naturally true since the generator creates both locks in the same room, but must be maintained as an invariant.

### Cycle prevention

Existing four-layer cycle prevention still applies. Additional constraint: a lock cannot be nested inside itself or inside any lock that it (transitively) contains.

### Nesting depth tracking

Each `PhaseBTarget` gains a `nestingDepth: number` field. Items start at 0. When a container lock wraps a target, the container's own nesting depth = target's nestingDepth + 1. This container can only be further nested if its depth < `maxNestingDepth`.

## Engine Changes

### `performUnlock`

Current:
```typescript
room.visibleItems.push(...lock.containsItems);
lock.containsItems = [];
```

New:
```typescript
for (const id of lock.contents) {
  if (id in state.puzzle.items) {
    room.visibleItems.push(id);
  } else if (id in state.puzzle.locks) {
    room.lockIds.push(id);
  }
}
lock.contents = [];
```

Player experience: open drawer → "You found a safe inside!" → safe appears in interaction panel → needs its own key to open.

### Deep clone

`deepCloneState` must also clone `contents` (replacing current `containsItems` clone).

## Solver Changes

The solver currently adds `containsItems` directly to inventory (bypassing room floor). This is intentional — the solver simulates an optimal player, not the room-by-room engine flow.

When the solver unlocks a container:
- Items in `contents` → add to inventory (existing behavior, now via lookup)
- Locks in `contents` → add to the working set of available locks for that room. The solver must re-enter its main loop to attempt solving these newly available locks with the current inventory. Since the child lock shares `roomId` with the parent, reachability is already satisfied.

## Graph Layout Changes

### Room grouping

Each room becomes a visual group (colored border rectangle). All nodes belonging to that room are positioned inside the group boundary.

### Container sub-groups

Container locks that have non-empty `contents` are drawn as dashed-border sub-groups inside their room group. Their contents (items and child locks) are drawn inside the sub-group. Nested containers produce sub-groups within sub-groups.

### Layout algorithm

The current Kahn's topological sort positions nodes in columns by depth. Room grouping adds a constraint: nodes in the same room should be spatially clustered. Approach:

1. Run topological sort as before to determine column (x position)
2. Group nodes by room and container parent
3. Within each room group, stack container sub-groups vertically
4. Room group boundaries are computed as the bounding box of all contained nodes + padding

Note: nodes from the same room may span multiple columns (e.g., a key at rank 0 and its container at rank 2). Room boundaries may therefore be non-compact rectangles that span columns. Acceptable for initial implementation — rooms are visual context, not strict layout constraints. If overlapping boundaries become a problem, a post-processing pass can adjust y-positions to separate room lanes.

### Edge routing

- `requires` edges (item → lock) can cross room/container boundaries
- `contains` edges (lock → contents) stay within the container sub-group (short, downward)
- Room boundary serves as visual context, not a routing constraint

### Graph edge generation

The current `graph-layout.ts` iterates `lock.containsItems` to build `contains` edges. This must iterate `lock.contents` instead, generating edges to both child items and child locks.

## Dump Changes

Container locks in dump output now show both items and nested locks:

```
CONTAINER LOCKS
  R0: {a·b → (c), [Lock: D]}
```

Where `[Lock: D]` indicates a nested container lock with its own label.

## UI Settings

`maxNestingDepth` added to SettingsModal with a slider (min: 0, max: 5, default: 2, step: 1). Description: "容器最大嵌套層數（0=不嵌套）".

## Migration

- `containsItems` renamed to `contents` across the codebase
- `maxItems` on LockTemplate replaced by `capacity` and `volume`
- All existing tests updated to use new field names
- Existing puzzles (if any saved state) would break — acceptable since there is no persistence layer for game state

## Files to modify

| File | Changes |
|------|---------|
| `src/game/types.ts` | Item: add `volume`. Lock: rename `containsItems` → `contents`, add `capacity`, `volume`. LockTemplate: replace `maxItems` with `capacity`, `volume`. GeneratorConfig: add `maxNestingDepth` |
| `src/game/templates.ts` | Add `capacity` and `volume` to all LockTemplates. Remove `maxItems`. |
| `src/game/generator.ts` | `createLock` signature: add capacity/volume params. `createItem`/`createConsumableItem`: copy volume from KeyTemplate. Phase B: volume-based capacity check, lock nesting in BFS queue, nestingDepth tracking |
| `src/game/engine.ts` | `performUnlock`: dispatch contents by type. Deep clone update. |
| `src/game/solver.ts` | Handle lock IDs in contents — add to available locks |
| `src/game/graph-layout.ts` | Room grouping, container sub-groups, bounding box computation |
| `src/game/dump.ts` | Show nested locks in container output |
| `src/components/CanvasGraph.tsx` | Render room group boundaries, container sub-group boundaries |
| `src/components/SettingsModal.tsx` | Add maxNestingDepth slider |
| `src/hooks/useGameState.ts` | Default config for maxNestingDepth |
| `src/game/__tests__/*.ts` | Update all `containsItems` references, add nesting + volume tests |
