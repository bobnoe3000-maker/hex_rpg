# Dungeon Pals — modular engine

Zero-build, native ES modules. Entry point: `index.html` loads a single module,
`<script type="module" src="src/game.js">`; the import graph resolves load order
automatically (`core` has no dependencies, everything imports from it).

## Layout
- `src/game.js`             — glue: continuous act-timer autobattle, rendering, HUD, loot/door flow
- `src/engine/core.js`      — seeded rng (mulberry32) + ink/hatch/grain style kit + shared room geometry/PARTS state (with setters)
- `src/engine/portraits.js` — hero portrait generator; `makeHeroPortrait(cls, seed)`
- `src/engine/creatures.js` — full-body procedural figures (NPCs + heroes); `buildFigure(kind, seed)`
- `src/engine/tiles.js`     — floor/feature painters + extruded 2.5D walls & doorways
- `src/engine/fx.js`        — combat effects (slash / bolt / heal / breath / dissolve / ring / text …)
- `src/engine/dungeon.js`   — `buildGameRoom(seed, spec)` → `{base, parts, blocked, door}`; room graph via `ROOMS_SPEC`
- `src/engine/combat.js`    — d20 sim, hero/foe stat blocks, items, loot rolls, XP tables

## Notes
- Shared mutable state (rng `R`, room geometry `T/WH/OX/OY/CW/CH`, `PARTS`/`BLINKS`) lives in
  `core.js` and is mutated through exported setters (`seedRng`, `setGeom`, `setParts`, `setBlinks`)
  so ES-module live bindings stay valid across files.
- **Phase 0** is a mechanical ES-module conversion with **no behavior change**. Combat is still the
  prototype's d20 system; it becomes the stat-based engine in Phase 1.

Deploy: serve the folder over HTTP (ES modules do not load from `file://`).
See `docs/GAME_DESIGN.md` and `docs/ARCHITECTURE.md` for the full design and the phased roadmap.
