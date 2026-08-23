# Hex RPG — Architecture Document

> Companion to `docs/GAME_DESIGN.md`. Defines the code structure, module boundaries, and the phased build order.
> **Confirmed foundations:** stat-based % combat · party of up to 4 · cooldown auto-cast skills (no mana) · local-first.
> **Synced to code 2026-08-23.** §1–§2 are the intended principles; §3 shows the **actual current layout** (the earlier draft's target tree was largely aspirational). Where the code hasn't reached the ideal yet — no `services/` seam, `game.js` is a single orchestrator rather than a `SceneManager`+`store`, models/systems are consolidated — it's called out inline as 🔶 **planned**.

---

## 1. Architectural Principles

1. **ES modules, zero-build.** Native `<script type="module">` + `import`/`export`. No bundler required to run (drop-on-Netlify stays true). A build step (Vite) can be added later for minification/PWA without restructuring.
2. **Data-driven content.** All content — classes, skills, items, enemies, dungeons, balance — lives in pure-data modules under `src/data/`. Adding content = editing data, not logic.
3. **Deterministic, serializable, headless simulation.** The combat/economy/offline sim is pure logic with **no DOM and no wall-clock access**, fed by a seeded RNG. The same sim runs live battles, async PvP, and offline catch-up, and can run server-side unchanged.
4. **Separation of sim ↔ render ↔ services.** *Partly honored.* The **pure systems** (`StatEngine`, `CombatSim`, `LootGenerator`, `ForgeSystem`, `Skills`, `Leveling`, `Equipment`, `Economy`) are DOM-free and deterministic, and the **art engine** only draws — but `game.js` is a single orchestrator that mixes state, the loop, scene handling, spawn/combat glue and much of the UI wiring rather than a clean UI/store split. 🔶 The `game.js` → `SceneManager` + `store` split is still ahead.
5. **Service seam for all side effects.** 🔶 *Planned, not built.* Persistence today is direct localStorage in `state/save.js` (called from `game.js`); there is **no `services/` layer** — no `SaveService`/`NetService`/`TimeService` interfaces yet. The seam matters for the (unbuilt) PvP and server-authoritative time; adding it is a future refactor.
6. **Keep the art engine.** ✅ The procedural renderer is preserved under `engine/` (portraits, creatures, tiles, fx, icons, gear icons) and unchanged in spirit.

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
- `state/` is plain serializable data; persisted by `state/save.js` (the `SaveService` role; no separate service layer yet).

---

## 3. Module Layout (actual)

The real tree. `game.js` is a single orchestrator rather than the `main.js` + `SceneManager` + `store` split the ideal calls for; `ui/` is flat (no `screens/`/`components/` subdirs); there is no `services/` layer; models and several systems are consolidated. Items marked 🔶 in §3.1 are the intended splits still ahead.

```
/index.html                  — module entry: loads /src/game.js; inline #flow / #overlay / #dhead / #party shells
/src/
  game.js                    — THE ORCHESTRATOR: the `state` object, the RAF loop, scene handling
                               (state.scene = "town" | "dungeon"), spawn + combat glue, act()/formation AI,
                               the roaming-floor data (EMBERDEEP_LEVELS/FROSTMERE_LEVELS) + genRoamStack,
                               ROAM_FLOORS, the offline-progress calc, and most UI wiring. (~2100 lines.)
  core/
    rng.js                   — mulberry32 + seeded streams
  data/                      — PURE DATA (content & tunables)
    balance.js               — all formula constants, curves, drop/forge/roam/offline odds (BAL)
    classes.js               — HERO_BASES: per-class base stats + growth
    stats.js                 — stat defs; dodge & crit are RATINGS → effective % vs opponent level
    skills.js                — the four class skill trees (branches · tiers · ranks · fx) + text ladders
    enemies.js               — enemy archetype stat blocks
    dungeons.js              — the 10 dungeons (band, roster, boss, minis, palette, tiles, power)
    roamLayouts.js           — per-dungeon roaming geometry templates (dungeons 3–10)
    potions.js               — the 7 brews + the single size
    names.js                 — name pools
    items/{prefixes,materials,gearTypes,starter}.js — loot component tables + starter kit
  models/
    units.js                 — hero/companion/enemy shapes + rollStats/makeHero/makeCompanion/growTo/scaleEnemy
  systems/                   — PURE LOGIC (DOM-free, deterministic, headless-testable)
    StatEngine.js            — derive() final stats from base+gear+points+skills+buffs; dodge/crit/mitigate; procVal
    CombatSim.js             — resolveAttack(): one hit (dodge → crit → mitigate → floor → lifesteal), seeded
    Skills.js                — skill trees, points, combat mods, actives, per-point fxNum, companion kits (the "SkillEngine")
    Leveling.js              — stat-point economy + per-class affinity (the "ProgressionSystem")
    LootGenerator.js         — roll prefix+material+type → item (weighted, no tiers)
    ForgeSystem.js           — gem +N upgrade: success / shatter by level
    Equipment.js             — equip rules, slot filter, compare/itemScore/upgrade hint
    Economy.js               — silver pricing (shop buy/sell, potions, sell value)
  engine/                    — PROCEDURAL ART + geometry (canvas)
    core.js                  — the ink/hatch/grain art kit (RNG split out to core/rng.js)
    portraits.js creatures.js tiles.js fx.js — portrait / figure / tile / combat-fx painters
    icons.js gearIcon.js     — procedural UI glyphs + composed gear icons
    dungeon.js               — floor geometry: buildGameRoom + buildRoamingFloor (corridor carving), isBlocked
    combat.js                — legacy prototype combat (superseded by systems/CombatSim; kept for reference)
    diag.js                  — APP_BUILD + the in-app diagnostics ring buffer
  ui/                        — DOM screens/components (FLAT — no screens/ or components/ subdirs)
    Onboarding.js            — splash → guest login → save slot → class → roll stats/portrait → name
    TownScreen.js            — the Keep hub + service buttons
    DungeonSelect.js         — the world-map dungeon board (the "WorldMapScreen")
    CharacterPanel.js        — the character screen: stats/skills/gear/potions tabs, bag, level-up point-buy
    ShopScreen.js TavernScreen.js TempleScreen.js ForgeScreen.js DiagScreen.js — town services
    CompanionLevelUp.js      — the companion level-up slot-machine roll
    LootRoll.js              — the drop slot-roll popup
    itemView.js potionChip.js stars.js — shared item card / potion belt chip / star widgets
  state/
    save.js                  — localStorage slots + snapshotState/loadGame (the persisted shape, §4.1)
```

### 3.1 Not built / not yet split (vs. the ideal in §1–§2)
- 🔶 **No `services/` layer.** Save is `state/save.js` called directly; no `SaveService`/`NetService`/`TimeService`/`Analytics` interfaces. (PvP and server-time need `NetService`/`TimeService`.)
- 🔶 **No `main.js` / `SceneManager` / `store.js`.** `game.js` boots the game, owns `state`, and routes scenes itself.
- 🔶 **Consolidated modules.** `models/`: one `units.js` (no separate Character/Party/Item/Skill/Enemy). Systems: `Skills.js` = the SkillEngine, `Leveling.js` = ProgressionSystem, `engine/dungeon.js` = the DungeonGenerator; there is **no `OfflineSim.js`** (offline is computed inline in `game.js`), **no `PvPSim.js`**, and **no `Roster.js`** (recruiting lives in `models/units.js` + `TavernScreen`).
- 🔶 **Unbuilt screens:** no `InventoryScreen` (bag is in `CharacterPanel`), no `SkillPriorityScreen` (Feature 3 unbuilt), no `BankScreen`/`ArenaScreen` (both stubs), no `OfflineProgressModal` (the welcome-back card is inline in `game.js`).
- 🔶 **Data not split out:** no `skillTrees.js` (trees live in `skills.js`), no `xpCurve.js` (`xpToReach` in `game.js`), no `lootTables.js` (weights live on the component tables), no `shop.js` (stock is generated in `ShopScreen`/`Economy`).

---

## 4. Key Contracts (interfaces)

### 4.1 The save (serializable snapshot) — actual
The runtime state is the `state` object in `game.js`; `state/save.js` `snapshotState()` writes a **plain-JSON snapshot** per slot (`dp_save_<n>` in localStorage) and `loadGame()` restores it. The actual shape:
```
{
  v,                                 // save version
  party:     Hero[],                 // party[0] = main hero (crowned); party[1..] = up to 2 companions
  bench:     Hero[],                 // benched reserves (keep gear)
  silver, gems,                      // currencies
  inventory: Item[],                 // the shared bag (composed prefix+material+type+upgrade items)
  potions:   {type,size,qty}[],      // the potion stash
  dungeonId, cleared[],              // active dungeon + defeated-boss ids (unlock gating)
  roomIdx, roomMax,                  // legacy classic-room fields (roaming ignores them)
  roamLevel, roamUnlocked,           // roaming descent progress
  autoLevel,                         // per-save preference (companion auto-roll)
  scene,                             // "town" | "dungeon" at save time (gates offline progress)
  farm:      {secs,silver,gems,xp,potions},  // decaying live-yield average → offline calc (§10.2 design)
  savedAt                            // ISO timestamp (offline away-time is measured from here)
}
```
Heroes carry portrait/figure **seeds**, so all art regenerates on load — nothing non-serializable is stored. There is **no `bank`** and **no `arena`/ELO** block yet (both features unbuilt).

**Death model (§7.1 of the design):** the intent is that a party wipe clears the bag + equipped gear while keeping each hero's xp/level/stats/skills. 🔶 **Not active yet** — with no Bank to hold death-safe valuables, the current wipe flow just returns the party to the Keep and revives (main free, companions at the Temple); no items are stripped. `party` always owns hero identity/progression and is never touched by death (§6.1).

### 4.2 Deterministic sim entry points
**Built (pure, DOM-free):**
```
StatEngine.derive(unit) -> { hp, atk, def, dodge, crit, aspd, rng, ... }   // dodge/crit are ratings
StatEngine.dodgeChance(defender, attacker) -> 0..1     // rating contested vs attacker level
StatEngine.critChance(attacker, target)    -> 0..1     // rating contested vs target level
StatEngine.mitigate(dmg, def) / procVal(unit, "lifesteal")
CombatSim.resolveAttack(attacker, defender, rng, mods) -> { type:"dodge" } | { type:"hit", crit, dmg, heal? }
Skills.combatMods(att, def, defHpFrac) / activeSkills(unit) / fxNum(arr, pts)
LootGenerator.generate({ classes, power, floor, seed? }) -> item   // power/floor bias the roll; no tiers
ForgeSystem — success/shatter odds by upgrade level
```
`resolveAttack` and the systems above take an injected seeded `rng` and use no `Date`/`Math.random`, so a single hit is reproducible. 🔶 **Not built:** a whole-battle `CombatSim.run({partyA,partyB,seed})` runner (the live battle is driven by `game.js`'s RAF loop calling `act()`/`attack()` — not a pure headless runner), a standalone `OfflineSim` (offline is `computeOffline()` inline in `game.js`), and `PvPSim`. Extracting a pure battle runner is a prerequisite for server-verifiable PvP.

### 4.3 Service interfaces (🔶 planned — not built)
No `services/` layer exists yet. Persistence is `state/save.js` (`listSlots`/`readSlot`/`writeSlot`/`snapshotState`/`loadGame` over localStorage), called directly from `game.js`. `NetService` and `TimeService` are unbuilt; offline uses `savedAt` + `Date.now()` directly (client-side, exploitable — see design §10.2). The intended interfaces remain:
```
SaveService:  listSlots() load(slot) save(slot,state) delete(slot)   // ≈ state/save.js today
NetService:   findOpponent(snapshot) submitResult(r) getLadder()     // 🔶 unbuilt
TimeService:  now() elapsedSince(ts)                                 // 🔶 unbuilt (server-auth later)
```

### 4.4 Multiplayer integrity model (why the dice model doesn't matter) — 🔶 design-only
> PvP isn't built (§9 of the design); this is the intended integrity model for when it is. It also depends on extracting the pure whole-battle runner noted in §4.2.

A common question: *does a dice-based combat model (d20) cause cheating or performance problems in PvP?* **No — integrity is independent of the RNG model.** Whether combat uses d20 or stat-based %, the risks and the fixes are identical:

- **Performance is a non-issue.** A full auto-battle resolves in microseconds; a server can re-simulate thousands of matches per second. d20 vs % makes no measurable difference.
- **Cheating never comes from the dice** — it comes from **client authority**. If the client runs the battle and reports "I won," that result can be forged regardless of the math.
- **The fix (already designed in):** the sim is **deterministic and seeded** (§2.4). The server stores each party as a **snapshot** and, on result submission, **re-runs the exact same sim** from the same seed. If the client's reported outcome doesn't match the server's re-simulation, it's rejected. Because the sim is pure and fast, re-simulation is cheap.
- Seeds are **server-issued** for ranked matches so a client can't cherry-pick a favorable roll.

We chose stat-based % over d20 purely for **gameplay legibility** (transparent numbers for theorycraft), *not* for any multiplayer reason. Either model would be equally safe under this snapshot + re-simulation design.

---

## 5. Migration from the Prototype ✅ (done)

The ES-module conversion and the d20 → stat-model rewrite are complete. Historical mapping — with deviations from the plan: `engine/dungeon.js` **stayed under `engine/`** (the floor-geometry builder, now including `buildRoamingFloor`) rather than moving to `systems/DungeonGenerator.js`; `engine/combat.js` **was left in place as legacy** alongside the new `systems/CombatSim.js`; and the `game.js` → `DungeonScreen` + `engine/board.js` + `SceneManager` split **never happened** — render and scene routing still live in `game.js` (no `board.js`, no `SceneManager`).

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

**Phase 2 done** — procedural `LootGenerator` (prefix + material + gear type, drop-weighted per component, class-restricted, cosmetic grade from the rarest component), drops-into-bag on kill, `systems/Equipment.js` (compare / `itemScore` **▲ hint** / slot-filter), and the `CharacterPanel` bag. The **Forge** shipped as a town service (`systems/ForgeSystem.js` + `ui/ForgeScreen.js`): gem+silver `+N` upgrades with diminishing success + shatter risk. **8 gear slots** (`data/items/gearTypes.js`), **silver** drops from kills. 🔶 Still ahead: elemental/DoT **gear procs beyond lifesteal** (only `vampiric` is wired — needs the status-effect pass) and a **dedicated full-inventory screen** with bulk compare/sell.

**Phases 3–7 are substantially done; 8–9 are not started.**
- **Phase 3 — Skills:** ✅ the four class **skill trees** (`data/skills.js`, `systems/Skills.js`, the Skills tab, draft→confirm, priced respec, per-point `fxNum` scaling, companion kits) and cooldown **auto-cast** (`tryCast`, highest-tier-first). 🔶 The phase's headline exit criteria — a player-ordered **priority list + per-skill conditions + `SkillPriorityScreen`** (Feature 3) — is **NOT built**.
- **Phase 3.5 — Skill trees:** ✅ all four classes ship, two branches each, draft→confirm allocation, priced silver respec (`BAL.SKILL_RESPEC`).
- **Phase 4 — Town hub:** ✅ `state.scene` town/dungeon, `ui/Onboarding.js` (splash → guest → slot → class → roll stats/portrait → name), `TownScreen`, `ShopScreen`, `TavernScreen`, `TempleScreen`, `ForgeScreen`, `DiagScreen`, `systems/Economy.js`. 🔶 **Bank is a stub**; there's no `SceneManager` (`game.js` routes scenes directly).
- **Phase 5 — Map & dungeons:** ✅ `DungeonSelect` world map, 10 themed dungeons, uncapped progression, boss-clear gating. Each dungeon is now a **roaming multi-level descent** (design §8.5) — per-dungeon geometry (`data/roamLayouts.js` + `genRoamStack`), mini-boss gates, elites, tiered champion-only drops, re-form-in-place, the stall guard, formation AI, and the rally "gather here" order. 🔶 The **wipe → strip-carried-items** penalty is **not active** (waits on the Bank; today a wipe returns to the Keep, main revives free, companions raise at the Temple).
- **Phase 6 — Companions:** ✅ recruiting (`models/units.js` `makeCompanion`/`growTo` + `TavernScreen`), equip, the **companion level-up slot-machine** (`ui/CompanionLevelUp.js`), party cap 4.
- **Phase 7 — Save & offline:** ✅ save slots (`state/save.js`) + **offline progress** (`computeOffline` inline in `game.js` + the welcome-back card; 10% rate, 8h cap). Plus the **potion belt** (`data/potions.js`, `ui/potionChip.js`).
- **Phase 8 — PvP:** 🔶 **not started** — the Arena is a stub; needs the pure whole-battle runner (§4.2) + a `NetService`.
- **Phase 9 — Backend & monetization:** 🔶 **not started** — still fully local; no `services/` layer, no monetization hooks.

### 6.1 State-ownership invariants (read before touching combat/roster)
The recurring bug class in this codebase is **two things holding the same fact and drifting apart**. To keep that from recurring, the model has explicit owners — respect these:

- **`party` owns roster identity & progression.** It is the source of truth for who your heroes are (name, class, level, xp, stats, skills, gear, `alive`). Nothing else creates or deletes heroes. Death sets `party[i].alive=false`; it never removes the hero from `party`. The Temple/Keep read `party` directly, so a dead hero is always listed.
- **The battlefield hero list is fully *derived*, not a synced array.** There is no `state.units`. Combatants are computed on demand: `liveHeroes()` = `party.filter(alive)`, `liveFoes()` = `state.foes.filter(alive)`, and `liveUnits()` concatenates them. `state.foes` is the *only* thing state owns for combat, and only foes are pruned (`state.foes.filter(alive)`); **heroes are never added to or removed from any combat array** — a hired/resurrected pal is a combatant the instant it's alive in `party`, and a dead hero leaves combat the instant it's `!alive`. This makes the whole placement-sync bug class (companions not appearing, dead heroes lingering) structurally impossible. `placeHeroes()` only assigns *positions* to the living party at the start line; it owns no membership. `occupied(r,c,except)`, `nearest`, and `render` all read the two owners directly. (`drawUnit` skips a unit with no `r/c` — a pal hired in town isn't placed until you descend.)
- **Ephemeral UI state is derived, never mirrored.** `panelShown()` reads `#overlay.show` (not a boolean); the pause label reads `state.phase`. When you need "is X showing?", read the DOM/state that already answers it rather than adding a parallel flag that can desync (the old `panelOpen`/`reviveAt` flags are what caused earlier freeze/revive bugs). *Note:* the battle now **keeps running behind overlays** — opening the character/gear panel no longer freezes combat (`panelShown()` still gates input like rally taps, but the loop advances); only the manual Pause (`state.phase`) stops the fight.
- **Render is fail-soft.** Every icon draw is wrapped (`icons.js build()`), the main `loop` is wrapped, and uncaught errors raise a throttled toast + land in the diagnostics buffer. A bug in one glyph or one frame must degrade locally, never take down a whole screen or the animation-frame chain.

---

## 7. Testing & Tooling

- **Headless sim tests (built):** `systems/` is DOM-free and deterministic, so it's testable in plain Node. `tests/combat.test.mjs` asserts combat outcomes; `tests/balance.sim.mjs` runs a full representative-party-vs-every-tier balance simulator (re-run after any combat-math change: `node tests/balance.sim.mjs`).
- **Manual verification harness:** UI/gameplay changes are checked with a headless Chromium (Playwright) driving the real page — onboard, patch a save slot, enter a dungeon, assert on live state. Temporary `window.__dp*` probes are added for a check and removed before commit.
- 🔶 **Golden battles** (`{seed, partyA, partyB} → winner/log hash` fixtures) depend on the pure whole-battle runner (§4.2) and aren't set up yet.
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

1. **Build tooling:** stay no-build, or adopt Vite later (PWA, minify, code-split screens)?
2. **`game.js` decomposition:** the orchestrator has grown to ~2100 lines (state, loop, scenes, spawn/combat glue, roaming data, offline, UI wiring). Split into a `SceneManager` + a `store` + smaller modules, or leave it? No `store.js` exists today — state is the `state` object in `game.js`.
3. **Service seam:** when to introduce the `services/` layer (`SaveService`/`NetService`/`TimeService`) — it's the prerequisite for PvP and server-authoritative time.
4. **Backend stack** (later): serverless + KV (snapshots/ladders) vs. full service; auth provider.
5. **Schema migrations:** the save's `v` bump strategy as content evolves (loadGame does field-level defaulting today).
6. **Determinism guarantees** across engines/browsers (float consistency) — constrain sim math to integers where feasible.
7. **Asset-override pipeline:** how authored art slots in front of procedural generators per-entity.

See `docs/GAME_DESIGN.md` §14 for open *design* questions.
