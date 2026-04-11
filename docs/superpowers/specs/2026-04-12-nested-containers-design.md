# Nested Containers + Volume System + Graph Grouping

## Summary

Support containers inside containers (e.g. drawer containing a safe), with a three-layer volume-based capacity system (room → container → item) to determine what fits where, and room-based grouping in the graph visualization.

## Context

Currently `Lock.containsItems: ItemId[]` only holds items, and exactly one item per container. All container locks are flat on the room floor — there is no spatial nesting. `KeyTemplate` has a `volume` field (1-3) but nothing consumes it. `LockTemplate` has `maxItems` but no volume/capacity concept. Rooms have no capacity limit.

## Design Decisions

### Unified contents model

A container lock's hidden contents (items and child locks) are stored in a single `contents: string[]` array, replacing the current `containsItems: ItemId[]`. Rationale:

- From the container's perspective, it doesn't care what it hides — both items and sub-locks are "things inside me"
- Volume check is the same for both: `sum of contents' volumes <= capacity`
- Graph grouping treats both the same: children of the container sub-group
- The only divergence is at release time (items → `visibleItems`, locks → `lockIds`), handled by a single lookup dispatch

This is distinct from `targetRoomId` (spatial connectivity), which remains separate because it has fundamentally different semantics — gating traversal to another space vs revealing hidden content in the current room.

### Three-layer volume system

Volume uses **liters (L)** as the unit, simplified for game purposes (not physically accurate, but proportionally intuitive). The system enforces capacity at three levels:

```
Room (capacity L)
  ├─ Container A (volume L, capacity L)
  │    ├─ Item X (volume L)
  │    ├─ Item Y (volume L)
  │    └─ Container B (volume L, capacity L)   ← nested
  │         └─ Item Z (volume L)
  ├─ Container C (volume L, capacity L)
  └─ Loose item W (volume L)
```

- **Room capacity**: limits total volume of all containers and loose items on the floor
- **Container capacity**: limits total volume of contents (items + sub-containers)
- **Item/container volume**: how much space it occupies in its parent

A container can hold **multiple items and/or sub-containers**, as long as the total volume fits. This replaces the current one-item-per-container limitation.

### Volume reference table (L)

**Items:**

| Volume | Size reference | Examples |
|--------|---------------|---------|
| 0.5L | Pocket-sized | Notes, keycards, USB drives |
| 1L | One hand | Keys, small gears |
| 2L | Handheld | Flashlight, bottles, door handles |
| 3L | Two hands | Hammer, crowbar, large gears |

**Containers (self-volume / internal capacity):**

| Volume | Capacity | Size reference | Examples |
|--------|----------|---------------|---------|
| 3L | 4L | Shoebox | Small drawer, dark corner |
| 5L | 8L | Suitcase | Chest, toolbox, password safe |
| 8L | 14L | Mini-fridge | Large crate, high-tech safe |
| 12L | 20L | Wardrobe | Cabinet, cargo container |

**Rooms:**

| Capacity | Size reference | Examples |
|----------|---------------|---------|
| 30L | Closet | Tight storage room |
| 50L | Bedroom | Standard room |
| 80L | Warehouse | Large open space |

Example mental math: "Toolbox (5L) + safe (8L) + loose key (1L) = 14L. Fits in a standard room (50L), 36L left. Does the safe (capacity 14L) fit a hammer (3L) + a small drawer (3L)? 3+3=6 < 14, yes."

### Nesting depth controlled by config

Nesting is recursive with a configurable `maxNestingDepth` limit. No separate `nestingRate` parameter — nesting happens naturally within the existing `targetDepth` budget, as long as a suitable outer container exists (volume check passes).

## Data Model Changes

### Room (runtime)

```typescript
interface Room {
  // ... existing fields ...

  // NEW
  capacity: number;          // total volume (L) the room floor can hold
}
```

Room capacity limits the combined volume of all containers and loose items placed on the room floor. The generator checks room capacity when placing items and containers during Phase A and Phase B.

### Item (runtime)

```typescript
interface Item {
  // ... existing fields ...

  // NEW
  volume: number;            // item's volume in L (copied from KeyTemplate at creation time)
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

### Template data

See the "Volume reference table" in Design Decisions for the full breakdown of item volumes (0.5-3L), container volumes/capacities (3-12L / 4-20L), and room capacities (30-80L). Existing `KeyTemplate.volume` values (1-3) will be updated to match the L-based scale. `LockTemplate` entries will receive `volume` and `capacity` values based on their thematic size.

## Volume Rules

### Container level

When the generator places content inside a container:

```
usedVolume = sum(entity.volume for entity in container.contents)
canFit(newEntity) = usedVolume + newEntity.volume <= container.capacity
```

Entity volume is looked up via `items[id].volume` or `locks[id].volume` depending on the ID.

A container can hold **multiple items and sub-containers** as long as total volume fits. A container with `capacity: 8L` can hold: one item (3L) + one sub-container (3L) + one item (2L) = 8L.

### Room level

When the generator places a container or loose item on the room floor:

```
usedFloorVolume = sum(lock.volume for lock in room.lockIds if lock is container)
               + sum(item.volume for item in room.visibleItems)
canPlaceOnFloor(entity) = usedFloorVolume + entity.volume <= room.capacity
```

Spatial locks (doors) do not consume room floor volume — they represent passages, not physical objects.

### Note on maxItems

`LockTemplate.maxItems` exists in the current codebase but is **never enforced** — the generator currently places exactly one item per container lock. The volume system is new enforcement logic, not a replacement of existing enforcement. `maxItems` will be removed and replaced by `capacity`.

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
| `src/game/types.ts` | Room: add `capacity`. Item: add `volume`. Lock: rename `containsItems` → `contents`, add `capacity`, `volume`. LockTemplate: replace `maxItems` with `capacity`, `volume`. GeneratorConfig: add `maxNestingDepth` |
| `src/game/templates.ts` | Add `capacity` and `volume` to all LockTemplates. Remove `maxItems`. |
| `src/game/generator.ts` | `createRoom`: assign capacity. `createLock` signature: add capacity/volume params. `createItem`/`createConsumableItem`: copy volume from KeyTemplate. Phase A+B: room floor volume check. Phase B: container volume check, multi-item containers, lock nesting in BFS queue, nestingDepth tracking |
| `src/game/engine.ts` | `performUnlock`: dispatch contents by type. Deep clone update. |
| `src/game/solver.ts` | Handle lock IDs in contents — add to available locks |
| `src/game/graph-layout.ts` | Room grouping, container sub-groups, bounding box computation |
| `src/game/dump.ts` | Show nested locks in container output |
| `src/components/CanvasGraph.tsx` | Render room group boundaries, container sub-group boundaries |
| `src/components/SettingsModal.tsx` | Add maxNestingDepth slider |
| `src/hooks/useGameState.ts` | Default config for maxNestingDepth |
| `src/game/__tests__/*.ts` | Update all `containsItems` references, add nesting + volume tests |
