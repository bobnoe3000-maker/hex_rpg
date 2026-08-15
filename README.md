# Dungeon Pals v2 — modular engine
Zero-build, script-tag modules sharing one global scope. Load order matters (see index.html):
core → portraits → creatures → tiles → fx → dungeon → combat → game.

- engine/core.js       rng (mulberry32, seeded), ink/hatch/grain style kit, grade+mask, room part system
- engine/portraits.js  hero portrait generator (13 archetypes; makeHeroPortrait(cls,seed))
- engine/creatures.js  full-body figures: 10 NPCs + 3 heroes; buildFigure(kind,seed)
- engine/tiles.js      floor/feature painters + extruded 2.5D walls & doorways
- engine/fx.js         fxSlash/Sparks/Bolt/Heal/Breath/Cloud/Lightning/Dissolve/Ring/Block/Text
- engine/dungeon.js    buildGameRoom(seed,spec) → {base,parts,blocked,door}; room graph via ROOMS_SPEC
- engine/combat.js     d20 sim, hero/foe stat blocks, items, loot rolls, XP tables
- game.js              glue: act-timer autobattle, rendering, HUD, loot/door flow

Deploy: drop the folder on Netlify as-is. `dungeon-pals-v2.html` is the same game bundled into one file.
Optional art overrides: swap buildFigure/makeHeroPortrait outputs for PNGs at any time.
