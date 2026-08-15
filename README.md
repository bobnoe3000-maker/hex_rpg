# Dungeon Pals — modular engine

Zero-build, native ES modules. Entry point: `index.html` loads a single module,
`<script type="module" src="src/game.js">`; the import graph resolves load order
automatically (`core` has no dependencies, everything imports from it).

## Layout
- `src/game.js`             — glue: continuous act-timer autobattle, rendering, HUD, loot/door flow
- `src/data/`               — pure content & tunables: `balance.js`, `stats.js`, `classes.js`, `enemies.js`
- `src/models/units.js`     — build hero & enemy instances (one unified six-stat shape)
- `src/systems/StatEngine.js` — `derive()` final stats + rating→chance curves (pure, DOM-free)
- `src/systems/CombatSim.js`  — deterministic, seeded basic-attack resolution (pure, DOM-free)
- `src/systems/Equipment.js`  — equip / unequip / class restriction (pure, DOM-free)
- `src/ui/CharacterPanel.js`  — tap-a-hero modal: stats + gear slots + bag (equip/unequip)
- `src/engine/core.js`      — seeded rng (mulberry32) + ink/hatch/grain style kit + shared room geometry/PARTS state (with setters)
- `src/engine/portraits.js` — hero portrait generator; `makeHeroPortrait(cls, seed)`
- `src/engine/creatures.js` — full-body procedural figures (NPCs + heroes); `buildFigure(kind, seed)`
- `src/engine/tiles.js`     — floor/feature painters + extruded 2.5D walls & doorways
- `src/engine/fx.js`        — combat effects (slash / bolt / dissolve / ring / text …)
- `src/engine/dungeon.js`   — `buildGameRoom(seed, spec)` → `{base, parts, blocked, door}`; room graph via `ROOMS_SPEC`
- `src/engine/combat.js`    — content layer: item pool, loot rolls, XP curve, room specs

## Tests
`node tests/combat.test.mjs` — headless regression tests for the pure combat layer (determinism, unified schema, damage invariants).

## Notes
- Shared mutable state (rng `R`, room geometry `T/WH/OX/OY/CW/CH`, `PARTS`/`BLINKS`) lives in
  `core.js` and is mutated through exported setters (`seedRng`, `setGeom`, `setParts`, `setBlinks`)
  so ES-module live bindings stay valid across files.
- **Phase 1 done:** combat is the **stat-based % model** (`hp/atk/def/dodge/crit/aspd`), resolved by a
  deterministic seeded `CombatSim`. Heroes and enemies share one stat schema (no `team===` branching).
  Basic attacks only for now — skills (incl. cleric heal / dragon breath) arrive in Phase 3.
- **Endless-map loop:** stay as long as you like — foes respawn in waves, loot drops from kills straight
  into your **bag**, and **tapping a hero** opens a stats/gear panel (pauses the fight) to equip/unequip.
  **Area →** moves deeper through the three rooms when you choose. (Party wipe currently auto-revives;
  the roguelite item-loss penalty waits on the Bank in a later phase.)

Deploy: serve the folder over HTTP (ES modules do not load from `file://`).
See `docs/GAME_DESIGN.md` and `docs/ARCHITECTURE.md` for the full design and the phased roadmap.
