---

## Split Machine Groups Design (Option 1 – Virtual Groups)

### 1. Goals

- **Primary goal**: Allow certain OPDB machine groups (by your discretion) to behave as **multiple independently-rankable entries**, each tied to a specific variant.
- **Secondary goal**: Allow **ignoring** specific variants within a group so they never:
  - appear in matchups, or
  - impact rankings.
- **Scope**:
  - Only a **small subset of groups** (e.g., “Family Guy / Shrek”, “Funhouse”) will use this feature.
  - The **default behavior stays group-based** for all others.
- **Non-goals (for this option)**:
  - No global shift to variant-level ranking.
  - No migrations are required right now (no live user data), but the design shouldn’t make future migrations harder.

---

### 2. Core Concepts

- **OPDB group**: Identified by `groupId = opdb_id.split('-')[0]`. Existing code uses this as the ranking key.
- **Variant**: An individual machine row from `machines` with a full `opdb_id` (e.g., `G1234-abc`).
- **Virtual group**: A **synthetic “group-like” entity** that:
  - Represents a single variant (or a subset of variants),
  - Has its own ranking ID (Elo bucket),
  - Is treated like a group in matchups and rankings.

For **normal groups**:
- Matchups and rankings continue to use **groupId** as the key.

For **special “split” groups**:
- The group is **replaced or augmented** by one or more **virtual groups**:
  - Each virtual group has:
    - A **ranking ID** (usually the full `opdb_id` of the variant),
    - A **display name**,
    - A way to pick the underlying variant (usually exactly one).

---

### 3. Configuration Shape

Create a dedicated config (e.g., `src/constants/splitGroupsConfig.js`) to centralize behavior.

#### 3.1. Proposed structure

```js
// PSEUDO-CODE / SPEC, not exact implementation

/**
 * Keyed by OPDB groupId (first part of opdb_id).
 */
export const SPLIT_GROUP_CONFIG = {
  // Example: Family Guy / Shrek
  'FAMILY_SHREK_GROUP_ID': {
    mode: 'split', // group is turned into multiple virtual groups

    // Each virtual group is a separately rankable entity
    virtualGroups: [
      {
        // Ranking key to store in Firestore ELO: userRankings[userId].rankings[rankingId]
        rankingId: 'FAMILY_VARIANT_OPDB_ID', // typically the full opdb_id
        // Human-readable label, may override raw machine name
        label: 'Family Guy',
        // Which variant(s) represent this entity in matchups
        variantOpdbIds: ['FAMILY_VARIANT_OPDB_ID'],
      },
      {
        rankingId: 'SHREK_VARIANT_OPDB_ID',
        label: 'Shrek',
        variantOpdbIds: ['SHREK_VARIANT_OPDB_ID'],
      },
    ],

    // Specific variants from this group to ignore entirely
    ignoreVariants: [
      // full opdb_id strings here (if any)
    ],
  },

  // Example: Funhouse family
  'FUNHOUSE_GROUP_ID': {
    mode: 'split',

    virtualGroups: [
      {
        rankingId: 'FUNHOUSE_CLASSIC_ID',
        label: 'Funhouse',
        variantOpdbIds: ['FUNHOUSE_CLASSIC_ID'],
      },
      {
        rankingId: 'FUNHOUSE_2_0_ID',
        label: 'Funhouse 2.0',
        variantOpdbIds: ['FUNHOUSE_2_0_ID'],
      },
    ],

    ignoreVariants: [
      'FUNHOUSE_REMAKE_ID', // Funhouse (Remake) is never used
    ],
  },
};
```

Notes:

- **`mode`**:
  - Use `'split'` to mean “this group is represented by multiple virtual groups”.
  - Future-friendly: could add `'alias'` or other modes later if needed.
- **`rankingId`**:
  - For split cases, recommend using the **full variant `opdb_id`** so Elo is variant-specific.
  - For default/non-split, continue using `groupId` as today.
- **`variantOpdbIds`**:
  - Usually a single entry for clean 1:1 mapping,
  - But may allow multiple variants to share one ranking ID if needed later.

---

### 4. Affected Areas & Required Behavior Changes

#### 4.1. Matchup selection (`matchupSelectors.js`)

Current behavior:

- `filterMachinesByPreferences` returns a filtered list of individual machines.
- `selectRandomMatchup(filteredMachines, groupsData)`:
  - Derives a set of **groupIds** from `filteredMachines`.
  - Filters `groupsData` by those groupIds.
  - Shuffles and picks **two groups**.
  - For each group, calls `selectBestMachineForGroup(groupId, filteredMachines, group.name)` → returns a **single representative variant**.

**New behavior:**

1. **Introduce a virtual-group-aware representation of “available matchup entities”.**

   - Build a derived list, e.g., `matchupEntities`, where each entity has:
     - `type: 'group' | 'virtualGroup'`
     - `groupId`
     - `rankingId` (groupId or variant-opdb_id depending on config)
     - `label`
     - `getRepresentativeMachine(filteredMachines)`:
       - For normal groups: uses the existing `selectBestMachineForGroup`.
       - For virtual groups: find the variant by `variantOpdbIds` (e.g., by full `opdb_id`), maybe with fallback logic.

   - Steps:
     - Start from `groupsData`.
     - For each group:
       - If `groupId` **not** in `SPLIT_GROUP_CONFIG`: create a **single** `type: 'group'` entity.
       - If `groupId` **is** in `SPLIT_GROUP_CONFIG` with `mode: 'split'`:
         - Create **one entity per `virtualGroup`** in config:
           - Each gets its own `rankingId`, `label`, and variant list.

2. **Respect `ignoreVariants` during selection.**

   - Before selecting a representative:
     - Exclude any variant whose `opdb_id` is in the config’s `ignoreVariants` array.
   - Ensure `selectBestMachineForGroup` is not allowed to pick an ignored variant.
   - For virtual groups, representative selection should be constrained to `variantOpdbIds` minus ignored ones.

3. **Return matchup with enough metadata.**

   - Today, `selectRandomMatchup` returns an array of machines only.
   - For voting to know whether we’re dealing with a group or virtual group, you should ensure `matchup` (or each machine object) includes:
     - The **`rankingId`** used for Elo,
     - Or a small metadata container, e.g.:

     ```js
     matchup = {
       machines: [machineA, machineB],
       meta: [
         { rankingId: '...', groupId: '...' },
         { rankingId: '...', groupId: '...' },
       ],
     };
     ```

   - Alternative: attach these fields onto each machine object (e.g., `machine._rankingId`), but be consistent.

#### 4.2. Filtering (`filterMachinesByPreferences` in `matchupSelectors.js`)

Add awareness of `SPLIT_GROUP_CONFIG`:

- **Ignoring variants**:
  - After the current base filters (manufacturer, conversion kits, user “haven’t played”), add:
    - For each machine `m`, check its `groupId`:
      - If `SPLIT_GROUP_CONFIG[groupId]?.ignoreVariants` contains `m.opdb_id`, **drop** it.

- **No change** to filter groups (`getMachineFilterGroup`) logic is strictly required for Option 1, unless you also want per-virtual-group category tweaks.

#### 4.3. Voting (`useVoting.js`)

Current behavior:

- Derives:

  ```js
  const winnerGroupId = machines[winnerIndex].opdb_id.split('-')[0];
  const loserGroupId = machines[1 - winnerIndex].opdb_id.split('-')[0];
  ```

- Sends these to `processVote`.

**New behavior:**

- Replace direct `groupId` extraction with a **helper that picks the correct ranking key**:

  Conceptually:

  ```js
  function getRankingIdForMachine(machine) {
    const groupId = machine.opdb_id.split('-')[0];
    const config = SPLIT_GROUP_CONFIG[groupId];

    if (!config || config.mode !== 'split') {
      // default: legacy behavior
      return groupId;
    }

    // For split groups, use the precomputed rankingId attached to the machine
    // (preferred) OR infer from opdb_id + config
    return machine._rankingId || machine.opdb_id;
  }
  ```

- In `useVoting`, use this helper:

  ```js
  const winnerRankingId = getRankingIdForMachine(machines[winnerIndex]);
  const loserRankingId = getRankingIdForMachine(machines[1 - winnerIndex]);
  ```

- Pass `winnerRankingId` / `loserRankingId` into `processVote` and through to `updateEloRankings`.

**Key point**: For **normal groups**, `winnerRankingId` remains `groupId`.  
For **split groups**, `winnerRankingId` becomes the **virtual group’s `rankingId`** (usually the variant’s full `opdb_id`).

#### 4.4. Voting backend (`votingService.js`)

Current behavior already generalizes well:

- `updateEloRankings` uses:

  ```js
  const winnerElo = getEloObj(rankings[winnerGroupId]);
  const loserElo = getEloObj(rankings[loserGroupId]);
  rankings = {
    ...rankings,
    [winnerGroupId]: winnerElo,
    [loserGroupId]: loserElo,
  };
  ```

- `winnerGroupId` / `loserGroupId` are just keys in a dictionary.

**New behavior:**

- No major structural changes required:
  - Just treat incoming IDs as **ranking IDs**, not strictly “group IDs”.
  - Update JSDoc comments accordingly to reflect they can be **group IDs or virtual group IDs (variant IDs)**.

---

### 5. Rankings Display Considerations

When a future agent updates the rankings UI (not shown in the snippets, but likely under `Rankings` components and hooks):

- **Data source**: Rankings will now contain a mix of keys:
  - Pure group IDs,
  - Variant-based `rankingId`s for virtual groups.
- To **render** each ranking line, they should:
  1. Determine whether the ranking ID is:
     - A known `groupId` in `groupsData`, or
     - A `rankingId` from `SPLIT_GROUP_CONFIG` (virtual group).
  2. Lookup display info:
     - For groups: use existing `groupsData` (name, etc.).
     - For virtual groups:
       - Use `label` from `SPLIT_GROUP_CONFIG[groupId].virtualGroups[...]`.
       - Use the associated variant’s `name` and `images` for tooltips or images.
- This ensures “Family Guy” and “Shrek” show as **separate ranking entries**, even though they belong to one OPDB group.

---

### 6. Edge Cases & Rules

- **No available variants for a virtual group**:
  - If all `variantOpdbIds` for a virtual group are filtered out (e.g., ignored, blocked, or missing data), that virtual group should be:
    - Excluded from the matchup candidate pool, or
    - Fallback to a safe behavior (e.g., skip and re-draw).
- **User “haven’t played” behavior**:
  - Currently uses `blockedMachines` with `startsWith(groupId)` semantics.
  - For split groups, you must decide:
    - Either still treat “haven’t played” as group-level (blocks all virtual groups),
    - Or refine it to operate at the **virtual group / rankingId level** if you want more granularity later.
  - For the initial implementation, it’s acceptable to keep **group-level semantics**.
- **Consistency**:
  - Ensure that the same `rankingId` used in:
    - `useVoting` → `processVote` → `updateEloRankings`
    - Rankings display logic
    - Is also what `selectRandomMatchup` / matchup metadata uses.

---

### 7. Implementation Checklist for a Future Agent

- **Config**
  - [ ] Create `SPLIT_GROUP_CONFIG` in `src/constants/splitGroupsConfig.js`.
  - [ ] Add entries for:
    - [ ] “Family Guy / Shrek” group (2 virtual groups).
    - [ ] “Funhouse” group (2 virtual groups + 1 ignored variant).
  - [ ] Export helper(s) like `getSplitGroupConfig(groupId)`.

- **Filtering & ignoring variants**
  - [ ] Update `filterMachinesByPreferences` to drop any machine whose `opdb_id` is listed in `ignoreVariants` for its group.

- **Matchup selection**
  - [ ] Introduce a virtual-group-aware “matchup entity” abstraction.
  - [ ] Expand `groupsData` into **normal groups + virtual groups**.
  - [ ] Ensure `selectRandomMatchup`:
    - Picks from this expanded entity set.
    - Uses the correct representative variant for each entity.
    - Attaches or exposes a **`rankingId`** per machine for use during voting.

- **Voting**
  - [ ] Add `getRankingIdForMachine` (or equivalent) that:
    - Uses `groupId` for normal groups,
    - Uses variant/virtual `rankingId` for split groups.
  - [ ] Update `useVoting` to call this helper instead of `split('-')[0]`.

- **Voting service**
  - [ ] Update comments in `votingService` to indicate IDs are **ranking IDs** (group or virtual), but no major logic change needed.

- **Rankings UI (future enhancement)**
  - [ ] Update rankings display code to:
    - Differentiate between pure group IDs and virtual group IDs.
    - Resolve labels and images via `SPLIT_GROUP_CONFIG` when needed.

- **Tests / validation**
  - [ ] Validate:
    - A normal group behaves exactly as before.
    - A configured split group yields **multiple separately rankable entities**.
    - Ignored variants (e.g., Funhouse Remake) never appear in matchups or rankings.
    - Elo keys in Firestore match the expected `rankingId`s.

---