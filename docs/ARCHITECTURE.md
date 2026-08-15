# Hex RPG — Architecture Document

> Companion to `docs/GAME_DESIGN.md`. Defines the code structure, module boundaries, the migration from the current prototype, and the phased build order.
> **Confirmed foundations:** stat-based % combat · party of 4 · cooldown+priority skills (no mana) · **local-first with a server-ready seam**.

---

## 1. Architectural Principles

1. **ES modules, zero-build.** Native `<script type="module">` + `import`/`export`. No bundler required to run (drop-on-Netlify stays true). A build step (Vite) can be added later for minification/PWA without restructuring.
2. **Data-driven content.** All content — classes, skills, items, enemies, dungeons, balance — lives in pure-data modules under `src/data/`. Adding content = editing data, not logic.
3. **Deterministic, serializable, headless simulation.** The combat/economy/offline sim is pure logic with **no DOM and no wall-clock access**, fed by a seeded RNG. The same sim runs live battles, async PvP, and offline catch-up, and can run server-side unchanged.
4. **Separation of sim ↔ render ↔ services.** Game logic never touches the canvas or storage directly. UI reads state and dispatches actions; the art engine only draws.
5. **Service seam for all side effects.** Persistence, networking, and time are behind interfaces (`SaveService`, `NetService`, `TimeService`) so local↔server is a swap, not a rewrite.
6. **Keep the art engine.** The procedural renderer is preserved and modularized, not rebuilt.

---

## 2. Layering

```
        ┌─────────────────────────────────────────────┐
  ui/   │  screens + components (DOM + canvas present) │  ← reads state, dispatches actions
        └───────────────┬─────────────────────────────┘
                        │ imports (read-only) + actions
        ┌───────────────▼───────────┐   ┌──────────────┐
systems/│ pure game logic (no DOM,   │   │  engine/     │  ← canvas art only,
        │ no services, deterministic)│   │  (renderer)  │     no game logic
        └───────┬───────────┬────────┘   └──────────────┘
                │           │
        ┌───────▼──┐   ┌────▼───────┐   ┌───────────────┐
 data/  │ pure data │   │  models/   │   │  services/    │  ← side effects behind
        │ (content) │   │ (entities) │   │ (save/net/time)│    interfaces
        └───────────┘   └────────────┘   └───────────────┘
        ┌─────────────────────────────────────────────┐
 core/  │  rng, events, math, ids (no deps)            │
        └─────────────────────────────────────────────┘
        ┌─────────────────────────────────────────────┐
 state/ │  GameState (the serializable root) + store   │
        └─────────────────────────────────────────────┘
```

**Dependency rules (enforced by convention/review):**
- `core/` depends on nothing.
- `data/` is pure data; may reference `core/` constants only.
- `models/` = entity shapes + helpers; depend on `core/` + `data/`.
- `systems/` depend on `core/ data/ models/`. **No `ui/`, no `engine/`, no `services/`, no DOM, no `Date`/`Math.random`.** Deterministic and unit-testable headless.
- `services/` = side effects; expose interfaces; may serialize `state/`.
- `engine/` = canvas rendering only; no game logic.
- `ui/` may import `systems/` (to read/compute), `state/`, `engine/` (to draw), and dispatch actions; it is the only layer that touches the DOM.
- `state/` is plain serializable data; the single source persisted by `SaveService`.

---

## 3. Target Module Layout

```
/index.html                  — <script type="module" src="/src/main.js">
/src/
  main.js                    — bootstrap: load save, init services, start SceneManager
  /core/
    rng.js                   — mulberry32 + named seeded streams
    events.js                — EventBus (from prototype systems/EventBus)
    math.js                  — clamp, lerp, ease, grid/hex helpers
    id.js                    — id/uid generation
  /data/                     — PURE DATA (content & tunables)
    balance.js               — all formula constants, curves, drop/forge odds
    classes.js               — fighter/mage/rogue/cleric base stats + growth + gear/skill pools
    stats.js                 — six stat defs (hp/atk/def/dodge/crit/aspd); dodge & crit
                               are RATINGS → effective % derived vs opponent level
    skills.js                — skill catalog (target rules, conditions, effects, upgrades)
    skillTrees.js            — per-class branching trees + capstones (future depth)
    xpCurve.js               — level/XP formulas
    enemies.js               — enemy stat blocks by kind
    dungeons.js              — dungeon/region/theme configs (levelRange, pools, palette)
    lootTables.js            — per-component drop weights (rarer = lower rate); no tiers
    items/prefixes.js        — prefix table (proc + stat + drop weight)
    items/materials.js       — material table (base stats + drawbacks + drop weight)
    items/gearTypes.js       — gear-type table (slot + class + stat)
    shop.js                  — shop stock definitions
  /models/
    Character.js             — hero/companion: identity, base stats, gear, skills, xp
    Party.js                 — 4-slot party + formation
    Item.js                  — composed item (prefix+material+type+level) + stat rollup
    Skill.js                 — skill instance (level, cooldown state)
    Enemy.js                 — enemy instance
  /systems/                  — PURE LOGIC (deterministic, headless)
    StatEngine.js            — derive final six-stats from base+gear+skills+buffs
    CombatSim.js             — continuous fixed-step auto-battle (no rounds; per-unit
                               ASPD timers); emits an event/log stream
    SkillEngine.js           — priority-list resolution, cooldowns, conditions, effects
    LootGenerator.js         — roll prefix+material+type → Item (weighted drops, no tiers)
    ForgeSystem.js           — gem upgrade: success/destruction by level
    DungeonGenerator.js      — procedural rooms from dungeon config (seeded)
    ProgressionSystem.js     — xp award, level-up, skill points
    Roster.js                — companion generation, hiring, bench
    Economy.js               — silver, shop buy/sell, bank
    OfflineSim.js            — capped idle simulation (uses CombatSim/Economy)
    PvPSim.js                — snapshot vs snapshot (wraps CombatSim)
  /services/                 — SIDE EFFECTS (swap local↔server)
    SaveService.js           — localStorage now; slots; (de)serialize GameState
    NetService.js            — MOCK now (local ghost snapshots); real backend later
    TimeService.js           — now()/elapsed; single source of time (server-auth later)
    Analytics.js             — stub
  /engine/                   — PROCEDURAL ART (kept from prototype, modularized)
    style.js                 — ink/hatch/grain kit + grade/mask (from core.js art half)
    portraits.js             — hero portrait generator
    creatures.js             — full-body figure generator
    tiles.js                 — floor/feature/wall/door painters
    fx.js                    — combat effects
    board.js                 — canvas board renderer (from game.js render/drawUnit)
  /ui/
    SceneManager.js          — screen routing + transitions
    store.js                 — central store over GameState + change events
    /screens/
      BootScreen.js
      CharacterCreateScreen.js
      TownScreen.js
      WorldMapScreen.js
      DungeonScreen.js       — battle view; renders CombatSim via engine/board
      CharacterScreen.js     — stats + gear slots (equip here)
      InventoryScreen.js
      SkillPriorityScreen.js — order the rotation
      ForgeScreen.js  ShopScreen.js  BankScreen.js  TavernScreen.js
      ArenaScreen.js         — async PvP
      OfflineProgressModal.js
    /components/             — cards, stat bars, item tiles, tooltips, dialogs
  /state/
    GameState.js             — schema + factory + versioned migrations
```

---

## 4. Key Contracts (interfaces)

### 4.1 GameState (serializable root)
```
GameState {
  version, slotId,
  profile:   { name, silver, premium, createdAt, lastSeenAt },
  main:      Character,              // heroes keep XP/stats/skills through death
  roster:    Character[],           // benched + active companions
  party:     [slotRefs x4],         // main + up to 3 companion ids
  inventory: Item[],                // CARRIED — lost entirely on a party wipe
  bank:      { silver, items[] },   // DEATH-SAFE — survives a wipe
  progress:  { unlockedDungeons[], clears{}, arena{ elo, rank } },
  settings:  { ... }
}
```
Everything is plain data. Behavior lives in `systems/`. `SaveService` persists exactly this.

**Death model (§7.1 of the design):** a party wipe clears `inventory` and every hero's equipped `gear`, but leaves each `Character`'s xp/level/stats/skills and the `bank` untouched. Run-resolution logic (in the dungeon run flow) owns this transition; `Character` progression is never touched by death.

### 4.2 Deterministic sim entry points
```
CombatSim.run({ partyA, partyB, dungeon?, seed }) -> { winner, log[], stateTimeline }
StatEngine.derive(character) -> { hp, atk, def, dodge, crit, aspd, ...hidden }   // dodge/crit are ratings
StatEngine.dodgeChance(defender, attacker) -> 0..1   // rating contested vs attacker level
StatEngine.critChance(attacker, target)    -> 0..1   // rating contested vs target level
LootGenerator.roll({ dungeonLevel, classHint, seed }) -> Item   // dungeonLevel biases drop weights
OfflineSim.simulate({ state, elapsedMs, cap }) -> { rewards, log }
PvPSim.resolve({ snapshotA, snapshotB, seed }) -> result   // == CombatSim.run
```
No `Date.now()` / `Math.random()` inside — time and randomness are injected (RNG seed, elapsed ms). This is what makes PvP fair and server-verifiable.

### 4.3 Service interfaces (mock now → real later)
```
SaveService:  listSlots() load(slot) save(slot,state) delete(slot)
NetService:   findOpponent(snapshot) submitResult(r) getLadder()   // local mock today
TimeService:  now() elapsedSince(ts)                               // server-auth later
```

### 4.4 Multiplayer integrity model (why the dice model doesn't matter)

A common question: *does a dice-based combat model (d20) cause cheating or performance problems in PvP?* **No — integrity is independent of the RNG model.** Whether combat uses d20 or stat-based %, the risks and the fixes are identical:

- **Performance is a non-issue.** A full auto-battle resolves in microseconds; a server can re-simulate thousands of matches per second. d20 vs % makes no measurable difference.
- **Cheating never comes from the dice** — it comes from **client authority**. If the client runs the battle and reports "I won," that result can be forged regardless of the math.
- **The fix (already designed in):** the sim is **deterministic and seeded** (§2.4). The server stores each party as a **snapshot** and, on result submission, **re-runs the exact same sim** from the same seed. If the client's reported outcome doesn't match the server's re-simulation, it's rejected. Because the sim is pure and fast, re-simulation is cheap.
- Seeds are **server-issued** for ranked matches so a client can't cherry-pick a favorable roll.

We chose stat-based % over d20 purely for **gameplay legibility** (transparent numbers for theorycraft), *not* for any multiplayer reason. Either model would be equally safe under this snapshot + re-simulation design.

---

## 5. Migration from the Prototype

The current files map onto the new layout with mostly mechanical moves plus one real rewrite (d20 → stat model):

| Prototype file | Becomes | Notes |
|---|---|---|
| `engine/core.js` | `core/rng.js` + `engine/style.js` | split RNG from the art style-kit |
| `engine/portraits.js` | `engine/portraits.js` | add `export`s |
| `engine/creatures.js` | `engine/creatures.js` | add `export`s |
| `engine/tiles.js` | `engine/tiles.js` | add `export`s |
| `engine/fx.js` | `engine/fx.js` | add `export`s |
| `engine/dungeon.js` | `systems/DungeonGenerator.js` (+ `data/dungeons.js`) | config-drive the hardcoded `ROOMS_SPEC` |
| `engine/combat.js` | **rewrite** → `systems/CombatSim` + `StatEngine` + `data/enemies` + loot tables | d20 → stat-based %; items → new loot model |
| `game.js` | `ui/screens/DungeonScreen.js` + `engine/board.js` + wiring | glue split into render vs. logic |
| `index.html` | thin shell → `SceneManager` boots to **Town**, not straight to a fight |

**Global-scope cleanup:** the prototype shares one global scope (`d`, `R`, `T`, `G`, `PARTS`…). Modularization makes these explicit imports/parameters. Board geometry (`T/WH/OX/OY/CW/CH`) moves into a render context object rather than mutable globals.

---

## 6. Phased Build Roadmap

Each phase is independently shippable and leaves `main` runnable.

| Phase | Goal | Exit criteria |
|---|---|---|
| **0 — Modularize** | Convert prototype to ES modules, **no behavior change** | Same game, now under `/src/`, native modules, clean imports |
| **1 — Combat swap** | Stat-based % model: `StatEngine` + `CombatSim` (deterministic) + six-stat `Character` | Old fight replaced by new engine; identical UX, new math |
| **2 — Loot & gear** | Data-driven `LootGenerator` (prefix/material/type), `Inventory` + `Character` screens, equip | Kill → roll item → equip → stats change |
| **3 — Skills** | `SkillEngine` + priority list + upgrades + `SkillPriorityScreen` | Player orders a rotation that drives combat |
| **3.5 — Skill trees** 🔶 | Per-class `skillTrees.js` + point investment + respec | Same-class heroes build differently (e.g. Cleric: Devotion vs Wrath) |
| **4 — Town hub** | `SceneManager` + `TownScreen`; Shop/Bank/Forge + `Economy` | Boot to Town; buy/sell/forge loop works |
| **5 — Map & dungeons** | `WorldMapScreen` + themed procedural dungeons + uncapped progression + run resolution (wipe → strip carried items, keep progression) | Choose dungeon → generated themed run → weighted loot; wipe loses carried gear only |
| **6 — Companions** | `Roster`: generate/hire/equip/upgrade; party of 4 | Full 4-slot party from hired randoms |
| **7 — Save & offline** | `SaveService` + game slots + `OfflineSim` + modal | Multi-slot persistence + capped offline rewards |
| **8 — PvP** | `PvPSim` + `NetService` mock (async snapshots) + `ArenaScreen` | Ranked async battles vs ghost snapshots |
| **9 — Backend & monetization** | Real `NetService`/`SaveService`/`TimeService`; monetization flags | Server-authoritative; slots/offline/store hooks |

**Status:** Phase 0 complete (ES-module conversion). **Phase 1 complete** — stat-based % combat: `data/{balance,stats,classes,enemies}.js`, `models/units.js`, `systems/StatEngine.js` + `systems/CombatSim.js` (pure, deterministic, DOM-free), driving `game.js`. Verified by `tests/combat.test.mjs` and a full headless auto-playthrough.

Both carried tasks landed in Phase 1: the hero/foe schema is unified through `StatEngine.derive()` (no more `team===` branching in combat math), and the `partZ` wrapper was collapsed into `part()`.

**Phase 2 largely done** — endless-map loot loop: the **procedural `LootGenerator`** (prefix + material + gear type, drop-weighted per component in `data/items/*`, class-restricted, cosmetic grade from the rarest component, `lifesteal` proc wired end-to-end via `StatEngine.procVal` → `CombatSim`), drops-into-inventory on kill, `systems/Equipment.js`, and `ui/CharacterPanel.js`. Still ahead: **Forge** upgrades (`+1/+2` runic gems — `upgradeLevel` field is reserved), more gear **slots** than the current weapon/armor/trinket three, more procs (burn/chill need the status-effect pass), and a dedicated full-inventory screen with compare/sell.

---

## 7. Testing & Tooling

- **Headless sim tests:** because `systems/` is DOM-free and deterministic, `CombatSim`/`LootGenerator`/`ForgeSystem` are unit-testable in plain Node (seeded fixtures → asserted outcomes). Target these first.
- **Golden battles:** store `{seed, partyA, partyB} → winner/log hash` fixtures to catch balance/logic regressions.
- **No build for dev**; optional Vite for prod later. Lint/format config TBD 🔶.

---

## 8. Conventions

- One primary export per module named after the file where sensible.
- Data modules export frozen plain objects/arrays; no logic.
- Systems are stateless functions or classes constructed with their data deps (no hidden globals).
- All tunable numbers live in `data/balance.js` — **no magic numbers** in `systems/`.
- RNG: never call `Math.random()` in `systems/`; take a seeded stream from `core/rng.js`.
- Time: never call `Date.now()` in `systems/`; take elapsed/`now` from `TimeService`.

---

## 9. Open Technical Questions 🔶

1. **Build tooling:** stay no-build, or adopt Vite at Phase 4+ (PWA, minify, code-split screens)?
2. **State management:** hand-rolled `store.js` vs a tiny signals lib — keep dependency-free for now.
3. **Backend stack** (Phase 9): serverless + KV (snapshots/ladders) vs. full service; auth provider.
4. **Schema migrations:** `GameState.version` bump strategy as content evolves.
5. **Determinism guarantees** across engines/browsers (float consistency) — constrain sim math to integers where feasible.
6. **Asset-override pipeline:** how authored art slots in front of procedural generators per-entity.

See `docs/GAME_DESIGN.md` §14 for open *design* questions.
