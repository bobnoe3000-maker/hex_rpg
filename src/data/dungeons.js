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
   `roster` maps each archetype figure to its themed name; `boss` is {fig,name}. */
function dungeon(tier, id, name, accent, crest, boss, roster, blurb) {
  const baseLevel = (tier - 1) * 10 + 1;      // 1, 11, 21, … 91
  return {
    id, tier, name, accent, crest, blurb, boss, roster,
    baseLevel, band: [baseLevel, tier * 10], recLevel: tier === 1 ? 1 : baseLevel + 1,
    power: tier, dropFloor: FLOORS[tier - 1],
  };
}

export const DUNGEONS = [
  dungeon(1, "emberdeep", "The Emberdeep", "#ff9a5c", "🐲",
    { fig: "dragon", name: "Ashwing the Young" },
    { rat: "Emberling Rat", goblin: "Coal Goblin", kobold: "Cinder Kobold", skeleton: "Charred Skeleton", wight: "Barrow Wight" },
    "The molten roots of the Keep, where every run begins."),

  dungeon(2, "frostmere", "Frostmere Catacombs", "#9ad1ff", "💀",
    { fig: "skeleton", name: "Malketh, the Cold Lich" },
    { rat: "Crypt Rat", goblin: "Grave Ghoul", kobold: "Frost Acolyte", skeleton: "Frozen Skeleton", wight: "Rimebound Wight" },
    "Ice-choked tombs where the dead never quite finished dying."),

  dungeon(3, "vael", "Sunken City of Vael", "#4fd0c0", "🔱",
    { fig: "wight", name: "The Drowned King" },
    { rat: "Reef Crawler", goblin: "Drowned Thrall", kobold: "Tide Caller", skeleton: "Bloated Dead", wight: "Deep Horror" },
    "A kingdom the sea took whole — and never gave back."),

  dungeon(4, "thornwild", "The Thornwild", "#8fd39a", "🌳",
    { fig: "wight", name: "Elder Treant Mossheart" },
    { rat: "Thorn Sprite", goblin: "Feral Goblin", kobold: "Spore Shaman", skeleton: "Bramblewight", wight: "Grovekeeper" },
    "Where the forest swallowed a kingdom and kept the bones."),

  dungeon(5, "foundry", "Obsidian Foundry", "#ff7a52", "🔥",
    { fig: "wight", name: "The Forge Golem" },
    { rat: "Scrap Imp", goblin: "Slag Goblin", kobold: "Ember Artificer", skeleton: "Iron Revenant", wight: "Molten Sentinel" },
    "Demon-worked forges that have not cooled in an age."),

  dungeon(6, "shadowfen", "Shadowfen Mire", "#a6c26a", "🐍",
    { fig: "wight", name: "The Marsh Hag" },
    { rat: "Bog Leech", goblin: "Mire Stalker", kobold: "Fen Witch", skeleton: "Sunken Dead", wight: "Hydra Spawn" },
    "A poisoned marsh where the fog itself is hungry."),

  dungeon(7, "skyreach", "Skyreach Spire", "#8fb7ff", "🌩",
    { fig: "dragon", name: "The Storm Roc" },
    { rat: "Gale Wisp", goblin: "Cloud Reaver", kobold: "Storm Adept", skeleton: "Windworn Husk", wight: "Thunder Warden" },
    "A tower that pierces the storm — and answers to it."),

  dungeon(8, "wastes", "The Bleeding Wastes", "#e0575f", "😈",
    { fig: "wight", name: "Xar'goth, Pit Fiend" },
    { rat: "Ashhound Pup", goblin: "Blood Imp", kobold: "Hellcaster", skeleton: "Charred Damned", wight: "Fel Brute" },
    "Where the world's wounds never scab, and demons drink."),

  dungeon(9, "rimeheart", "Rimeheart Throne", "#bfe3ff", "❄",
    { fig: "wight", name: "The Frost Titan" },
    { rat: "Frost Mite", goblin: "Rime Marauder", kobold: "Glacier Seer", skeleton: "Frozen Revenant", wight: "Jarl of Ice" },
    "The seat of a giant king, throned in eternal winter."),

  dungeon(10, "apex", "Draconis Apex", "#d69bff", "🐉",
    { fig: "dragon", name: "Vurmalax, Elder Wyrm" },
    { rat: "Void Spawn", goblin: "Dragonkin Zealot", kobold: "Wyrm Cultist", skeleton: "Ancient Guardian", wight: "Dread Drake" },
    "The summit of the descent, where an elder wyrm still dreams."),
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
