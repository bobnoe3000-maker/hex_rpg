/* ============ DATA :: dungeons.js — the tiered descent (10 dungeons → Lv 100) ============ */
/* Pure content. Each dungeon reuses the seven shared room LAYOUTS (shape / tiles / exits /
   blockers + an enemy composition of archetype "figures") and skins them with a themed roster,
   a boss, a level band, and a loot power. Enemy stats are the six archetype baselines in
   data/enemies.js, scaled to the room's level by models/units.scaleEnemy — so the same handful of
   figures become a Lv 1 warren or a Lv 100 wyrm's lair. Unlock is by clearing the previous boss. */
"use strict";

/* The seven rooms of any descent. `comp` lists the archetype figures that spawn (see ENEMIES keys);
   the final room's "BOSS" token is replaced by the dungeon's boss. Layouts are theme-neutral — the
   dungeon supplies the flavour (names, accent, boss) so we get variety without new floor art. */
export const LAYOUTS = [
  { roomName: "The Threshold", shape: "full",     blockers: 4, blockerKinds: ["wall", "column", "pit"],
    tiles: ["crack", "moss", "grate", "puddle", "bones", "rubble"], exits: ["onward"],
    comp: ["rat", "rat", "rat", "goblin", "goblin"] },
  { roomName: "The Gallery",   shape: "cross",    blockers: 4, blockerKinds: ["column", "wall", "pit"],
    tiles: ["bones", "bones", "crack", "rubble", "ash", "grate"], exits: ["onward"],
    comp: ["skeleton", "skeleton", "skeleton", "goblin"] },
  { roomName: "The Causeway",  shape: "causeway", blockers: 1, blockerKinds: ["fire", "column"],
    tiles: ["ember", "ash", "crack", "rubble"], exits: ["onward"],
    comp: ["kobold", "kobold", "goblin"] },
  { roomName: "The Hollow",    shape: "cavern",   blockers: 2, blockerKinds: ["column", "pit"],
    tiles: ["mushroom", "moss", "rune", "puddle", "crack"], exits: ["shrine", "onward"],
    comp: ["goblin", "kobold", "skeleton"] },
  { roomName: "The Vault",     shape: "ring",     blockers: 4, blockerKinds: ["wall", "column", "pit"],
    tiles: ["puddle", "puddle", "rune", "moss", "grate"], exits: ["vault", "onward"],
    comp: ["skeleton", "skeleton", "wight"] },
  { roomName: "The Approach",  shape: "cross",    blockers: 4, blockerKinds: ["fire", "wall", "column"],
    tiles: ["ember", "ash", "bones", "rubble"], exits: ["onward"],
    comp: ["wight", "kobold", "kobold", "skeleton"] },
  { roomName: "Inner Sanctum", shape: "cavern",   blockers: 2, blockerKinds: ["fire", "column"],
    tiles: ["ember", "ember", "ash", "bones"], exits: ["stair"],
    comp: ["BOSS", "kobold", "kobold"] },
];
export const ROOM_COUNT = LAYOUTS.length;
export const BOSS_ROOM = ROOM_COUNT - 1;

/* Grade floor per dungeon: the worst rarity a drop here can roll (loot still scales above it). */
const FLOORS = ["plain", "plain", "fine", "fine", "rare", "rare", "rare", "rare", "epic", "epic"];

/* dungeon(): assemble one rung. `tier` (1-based) drives the level band, loot power, and drop floor.
   `roster` maps each archetype figure to its themed name; `boss` is {fig,name}; `theme` = {palette,
   tiles} gives the dungeon its own floor stone + decorative tileset so each reads as a distinct place. */
function dungeon(tier, id, name, sub, accent, crest, boss, roster, blurb, theme) {
  const baseLevel = (tier - 1) * 10 + 1;      // 1, 11, 21, … 91
  return {
    id, tier, name, sub, accent, crest, blurb, boss, roster,   // `sub` = the map's short tagline
    palette: theme.palette, tiles: theme.tiles,
    baseLevel, band: [baseLevel, tier * 10], recLevel: tier === 1 ? 1 : baseLevel + 1,
    power: tier, dropFloor: FLOORS[tier - 1],
  };
}

/* Renamed & re-themed to the Dreadmere Trails world map (assets/world.png). The internal `id`s are
   kept from the original set so existing saves (active dungeon + cleared-boss list) survive untouched;
   only the player-facing name/tagline/theme changes. Tier order = the map's difficulty 1 → 10. */
export const DUNGEONS = [
  dungeon(1, "emberdeep", "The Shaded Foothills", "Safe Ascent", "#8fd39a", "🌲",
    { fig: "wight", name: "Mosstooth, the Hill Troll" },
    { rat: "Meadow Rat", goblin: "Foothill Bandit", kobold: "Sling Kobold", skeleton: "Ragged Scarecrow", wight: "Bramble Brute" },
    "Gentle wooded hills at the edge of camp — where every descent begins.",
    { palette: [["#6a7250","#4c543a","#323826"],["#727a54","#525a3c","#363c28"]], tiles: ["moss","mushroom","rubble","crack","grate"] }),

  dungeon(2, "frostmere", "The Misty Wetlands", "Boggy Trails", "#6fc2b0", "🐸",
    { fig: "wight", name: "Mudmaw, the Bog Fiend" },
    { rat: "Marsh Rat", goblin: "Mire Goblin", kobold: "Fen Croaker", skeleton: "Sunken Corpse", wight: "Marsh Lurker" },
    "Fog-drowned bogs where the trail sinks and the reeds keep whispering.",
    { palette: [["#5a6248","#3e4632","#262c20"],["#566048","#3a4430","#242a1e"]], tiles: ["puddle","moss","mushroom","bones","grate"] }),

  dungeon(3, "vael", "The Craggy Slopes", "Treacherous Climb", "#c2a878", "⛰️",
    { fig: "wight", name: "Stonefist, the Crag Ogre" },
    { rat: "Cliff Rat", goblin: "Crag Goblin", kobold: "Ledge Slinger", skeleton: "Fallen Climber", wight: "Rockback Brute" },
    "Wind-scoured cliffs and loose scree — one slip is a long way down.",
    { palette: [["#8a8272","#5e5a4c","#3c3a30"],["#8e8474","#605a4c","#3e3a30"]], tiles: ["rubble","crack","rune","grate","bones"] }),

  dungeon(4, "thornwild", "The Whispering Caverns", "Echoing Depths", "#86b0e0", "🕳️",
    { fig: "wight", name: "Nharrud, the Cave Terror" },
    { rat: "Cave Crawler", goblin: "Tunnel Goblin", kobold: "Gloom Kobold", skeleton: "Lost Miner", wight: "Deep Lurker" },
    "Lightless tunnels where your own footsteps answer back.",
    { palette: [["#5c6472","#3e4652","#282e38"],["#606876","#424a56","#2a303a"]], tiles: ["crystal","rune","crack","rubble","puddle"] }),

  dungeon(5, "foundry", "The Hollowed Crypts", "Restless Dead", "#b7c4d0", "💀",
    { fig: "skeleton", name: "Malketh, the Crypt Lich" },
    { rat: "Crypt Rat", goblin: "Grave Ghoul", kobold: "Bone Acolyte", skeleton: "Risen Skeleton", wight: "Barrow Wight" },
    "Tomb-halls where the buried refuse to lie still.",
    { palette: [["#77808c","#535a64","#353a42"],["#7c8490","#575e68","#383e46"]], tiles: ["bones","grate","crack","rune","rubble"] }),

  dungeon(6, "shadowfen", "The Blighted Grove", "Cursed Forest", "#9fc06a", "🌳",
    { fig: "wight", name: "Mordwood, the Blight Treant" },
    { rat: "Rot Sprite", goblin: "Feral Goblin", kobold: "Spore Shaman", skeleton: "Withered Husk", wight: "Grovekeeper" },
    "A forest curdled to rot, where the trees have grown teeth.",
    { palette: [["#5e6a44","#404a30","#28301e"],["#626e46","#444e32","#2a3220"]], tiles: ["moss","mushroom","bones","crack","ash"] }),

  dungeon(7, "skyreach", "The Obsidian Wastes", "Scorched Earth", "#ff8a4c", "🌋",
    { fig: "dragon", name: "Volgaroth, the Ember Wyrm" },
    { rat: "Cinder Imp", goblin: "Slag Goblin", kobold: "Ember Caster", skeleton: "Charred Dead", wight: "Molten Brute" },
    "Blackglass plains under a rain of ash, where the ground still burns.",
    { palette: [["#7a5c52","#4e3a34","#2e2220"],["#7e5648","#523a34","#301f1c"]], tiles: ["ember","ash","crack","rubble","bones"] }),

  dungeon(8, "wastes", "The Forgotten Citadel", "Guardians Awake", "#d0a86a", "🏰",
    { fig: "wight", name: "Kaldmar, the Iron Sentinel" },
    { rat: "Rubble Rat", goblin: "Ruin Skulker", kobold: "Watch Archer", skeleton: "Fallen Knight", wight: "Stone Guardian" },
    "A fortress the world forgot — but its stone wardens never slept.",
    { palette: [["#807868","#585244","#38342a"],["#847c6a","#5c5446","#3a362c"]], tiles: ["rubble","rune","grate","bones","crack"] }),

  dungeon(9, "rimeheart", "The Void Chasm", "Ethereal Peril", "#8fd0ff", "🌀",
    { fig: "wight", name: "Zhaal, the Rift Devourer" },
    { rat: "Void Mite", goblin: "Rift Stalker", kobold: "Astral Seer", skeleton: "Hollow Wraith", wight: "Chasm Horror" },
    "A wound in the world where the stars leak through and nothing holds.",
    { palette: [["#6a6f92","#484c6c","#2c2e46"],["#6e7396","#4c5070","#2e3048"]], tiles: ["crystal","rune","frost","crack","puddle"] }),

  dungeon(10, "apex", "The Nether Citadel", "Lord's Lair", "#c78aff", "👑",
    { fig: "dragon", name: "Vurmalax, the Dread Lord" },
    { rat: "Nether Spawn", goblin: "Doom Zealot", kobold: "Void Cultist", skeleton: "Damned Knight", wight: "Dread Reaver" },
    "The black spire at the end of all trails, where the Lord of Dreadmere waits.",
    { palette: [["#63587a","#443c58","#2a243a"],["#67597e","#48405c","#2c263c"]], tiles: ["crystal","rune","ember","bones","ash"] }),
];

/* ---- ladder helpers ---- */
export const dungeonById = id => DUNGEONS.find(d => d.id === id) || DUNGEONS[0];
export const dungeonByTier = tier => DUNGEONS.find(d => d.tier === tier) || null;
export const prevDungeon = d => dungeonByTier(d.tier - 1);
export const nextDungeon = d => dungeonByTier(d.tier + 1);
/* A rung is open if it's the first, or the previous boss is in the cleared set. */
export function isUnlocked(d, cleared) {
  if (d.tier === 1) return true;
  const p = prevDungeon(d);
  return !!(p && cleared && cleared.includes(p.id));
}
