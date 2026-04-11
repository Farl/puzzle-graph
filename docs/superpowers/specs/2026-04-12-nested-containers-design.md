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

### Nesting via post-processing (Phase C), not during BFS

Nesting is NOT done during Phase B's BFS. Instead, Phase A and B run unchanged (producing flat, one-item-per-container results), and a new **Phase C consolidation pass** reorganizes entities into containers afterward. This keeps the core generation algorithm untouched and its solvability guarantee intact.

Phase C is controlled by two config parameters:
- `maxNestingDepth` — max container nesting depth (default: 2)
- `consolidationRate` — 0-1, how aggressively to pack things into containers (0 = no consolidation, 1 = pack as much as possible)

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
  maxNestingDepth?: number;    // max container nesting depth (default: 2)
  consolidationRate?: number;  // 0-1, how aggressively to pack into containers (default: 0.5)
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

### `createItem` / `createConsumableItem` change

Must accept and store `volume` from the `KeyTemplate` onto the runtime `Item`.

### Phase A + B: unchanged core logic

Phase A (room skeleton) and Phase B (BFS wrapping) remain unchanged. They still produce flat, one-item-per-container results. The only additions are:
- `createLock` populates `capacity` and `volume` from the template
- `createItem` populates `volume` from the key template
- Room floor volume checks when placing items (if room capacity would be exceeded, try another eligible room)

### Phase C: Consolidation Pass (new)

After Phase B completes, a new consolidation pass reorganizes entities into containers. This is a post-processing step that does NOT create new locks or keys — it only moves existing entities.

#### Urgency computation

Every item and container lock gets an **urgency** score derived from the final puzzle structure:

```
urgency(item) = min roomIndex of all locks that require this item
urgency(containerLock) = min urgency of all entities in its contents
                         (or: roomIndex if contents is empty after Phase B)
```

Lower urgency = more urgent (needed earlier in the game). Higher urgency = less urgent (needed later, more flexible placement).

Items with urgency 0 are the most constrained — they are needed before leaving the first room. These will naturally remain on the floor because no container in the same room can have a lower urgency.

#### Algorithm

```
consolidate(rooms, items, locks, config):
  compute urgency for all items and container locks
  
  for each room R:
    floor = all entities on R's floor (visibleItems + container lockIds)
    sort floor by urgency descending (least urgent first)
    
    for each candidate X in floor:
      if random() > config.consolidationRate: skip
      
      for each container C in floor (sorted by urgency ascending = most urgent first):
        if C === X: skip
        if X is a spatial lock: skip (doors cannot be nested)
        if urgency(C) > urgency(X): break (no valid container left)
        if remainingCapacity(C) < volume(X): continue
        if nestingDepth(C, X) >= config.maxNestingDepth: continue
        
        → move X into C.contents
        → remove X from room floor (visibleItems or lockIds)
        → break
```

#### Why process least-urgent first

Least-urgent items have the most flexibility — they can be absorbed by any container with lower urgency. Processing them first maximizes consolidation opportunities. The most urgent items/containers stay on the floor as outer shells.

#### Safety guarantees

- **Solvability preserved**: Phase A + B already guarantee solvability. Phase C only hides entities behind locks that the player will open anyway (urgency(container) <= urgency(contents)). The player opens the container first, discovers the contents, then uses them — same as before, just physically inside a container.
- **No new locks or keys**: Phase C only moves existing entities. No new dependencies are introduced.
- **Natural floor minimum**: Items/containers with the lowest urgency in a room cannot be absorbed (nothing is more urgent to serve as a shell). At least the starting items for each room's first lock will always be visible on the floor.

#### Constraints

- **Only container-category locks may be nested.** Spatial locks (doors with `targetRoomId`) cannot be placed inside containers.
- **Nested locks must share the same `roomId` as their parent container.** This is inherently true since Phase C only processes within a single room.
- **Cycle prevention**: A lock cannot contain itself or any lock that (transitively) contains it. In practice this cannot happen because urgency ordering prevents it — a container can only absorb entities with higher urgency (less urgent), and its own urgency is always lower.

#### Nesting depth

```
nestingDepth(container, candidate):
  if candidate is an item: return 1
  if candidate is a lock: return 1 + maxDepthOf(candidate.contents)
  
maxDepthOf(contents):
  return max(nestingDepth for each lock in contents, default 0)
```

The total depth after insertion must be <= `maxNestingDepth`.

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

New sliders in SettingsModal:
- `maxNestingDepth` (min: 0, max: 5, default: 2, step: 1). Description: "容器最大嵌套層數（0=不嵌套）"
- `consolidationRate` (min: 0, max: 1, default: 0.5, step: 0.1). Description: "收納密度，越高越多東西藏在容器裡"

## Bugfix: reuseRate not in DEFAULT_CONFIG

`DEFAULT_CONFIG` in `useGameState.ts` does not include `reuseRate`, so the reuse path in the generator is never triggered (`undefined != null` is `false`). Add `reuseRate: 0.3` to `DEFAULT_CONFIG`.

## Migration

- `containsItems` renamed to `contents` across the codebase
- `maxItems` on LockTemplate replaced by `capacity` and `volume`
- All existing tests updated to use new field names
- `generatePuzzle` flow becomes: Phase A → Phase B → Phase C (consolidate)
- Existing puzzles (if any saved state) would break — acceptable since there is no persistence layer for game state

## Files to modify

| File | Changes |
|------|---------|
| `src/game/types.ts` | Room: add `capacity`. Item: add `volume`. Lock: rename `containsItems` → `contents`, add `capacity`, `volume`. LockTemplate: replace `maxItems` with `capacity`, `volume`. GeneratorConfig: add `maxNestingDepth` |
| `src/game/templates.ts` | Add `capacity` and `volume` to all LockTemplates. Remove `maxItems`. |
| `src/game/generator.ts` | `createRoom`: assign capacity. `createLock`: add capacity/volume params. `createItem`/`createConsumableItem`: copy volume from KeyTemplate. New `consolidate()` function (Phase C). `generatePuzzle` calls consolidate after Phase B. Room floor volume checks in Phase A+B. |
| `src/game/engine.ts` | `performUnlock`: dispatch contents by type. Deep clone update. |
| `src/game/solver.ts` | Handle lock IDs in contents — add to available locks |
| `src/game/graph-layout.ts` | Room grouping, container sub-groups, bounding box computation |
| `src/game/dump.ts` | Show nested locks in container output |
| `src/components/CanvasGraph.tsx` | Render room group boundaries, container sub-group boundaries |
| `src/components/SettingsModal.tsx` | Add maxNestingDepth slider |
| `src/hooks/useGameState.ts` | Default config for maxNestingDepth |
| `src/game/__tests__/*.ts` | Update all `containsItems` references, add nesting + volume tests |
