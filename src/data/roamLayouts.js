/* ============ DATA :: roamLayouts.js — per-dungeon roaming geometry templates ============ */
/* Pure content. Each entry is a 3-level roaming descent's GEOMETRY (sub-room rectangles + the corridors
   that link them) plus each room's enemy pack. It's theme-neutral: the level names, the two mini-bosses
   and the final boss are supplied by the dungeon (see genRoamStack in game.js), and pack `comp` tokens are
   archetypes the dungeon's roster skins. Pack `lvl` is on a canonical 1→10 scale that genRoamStack maps
   into the dungeon's real band. Levels 1 & 2 end at a MINIBOSS that gates the descent; level 3 at the BOSS.
   Corridors are auto-carved 2-wide L-paths between room centres, so any connected link graph is walkable —
   every template here is verified (rooms in bounds, all rooms reachable from the entry). Each dungeon gets
   its OWN shape so the ten descents feel like distinct places, not one reskinned map. */
"use strict";

/* Shorthand comp palettes that ramp with depth (archetypes, skinned per dungeon). */
const T = {
  a:["rat","spider"], b:["goblin","rat","slime"], c:["kobold","goblin","rat"],
  d:["goblin","kobold","harpy"], e:["skeleton","slime","goblin"], f:["wight","skeleton","slime"],
  g:["skeleton","wight","harpy"], h:["wight","cutthroat","skeleton"], i:["golem","skeleton","wight"],
  j:["lich","wight","harpy"], k:["cutthroat","harpy","goblin"],
  mini:["MINIBOSS","goblin","skeleton"], miniHard:["MINIBOSS","wight","kobold"],
  boss:["BOSS","skeleton","wight"],
};

export const ROAM_LAYOUTS = {

  /* 3 · The Craggy Slopes — a switchback CLIMB: a tall floor you zig-zag up ledge by ledge. */
  vael: [
    { cols:21, rows:22, entry:0,
      rooms:[ {r:18,c:8,h:3,w:6}, {r:13,c:2,h:3,w:6}, {r:13,c:13,h:3,w:6}, {r:7,c:8,h:4,w:6} ],
      links:[[0,1],[0,2],[2,3]],
      packs:[ {room:1,lvl:1,comp:T.a,treasure:true}, {room:2,lvl:2,comp:T.b}, {room:3,lvl:3,comp:T.mini} ] },
    { cols:21, rows:22, entry:0,
      rooms:[ {r:18,c:2,h:3,w:6}, {r:14,c:12,h:3,w:7}, {r:9,c:2,h:3,w:6}, {r:9,c:13,h:3,w:6}, {r:3,c:7,h:4,w:7} ],
      links:[[0,1],[1,2],[1,3],[2,4],[3,4]],
      packs:[ {room:1,lvl:4,comp:T.d}, {room:2,lvl:5,comp:T.e,treasure:true}, {room:3,lvl:5,comp:T.c}, {room:4,lvl:6,comp:T.miniHard} ] },
    { cols:21, rows:22, entry:0,
      rooms:[ {r:18,c:8,h:3,w:6}, {r:14,c:2,h:3,w:6}, {r:14,c:13,h:3,w:6}, {r:9,c:8,h:3,w:6}, {r:9,c:1,h:3,w:5}, {r:9,c:15,h:3,w:5}, {r:3,c:7,h:4,w:7} ],
      links:[[0,1],[0,2],[1,3],[2,3],[3,4],[3,5],[3,6]],
      packs:[ {room:1,lvl:7,comp:T.g}, {room:2,lvl:7,comp:T.f,treasure:true}, {room:3,lvl:8,comp:T.h}, {room:4,lvl:9,comp:T.k,treasure:true}, {room:5,lvl:9,comp:T.i}, {room:6,lvl:10,comp:T.boss} ] },
  ],

  /* 4 · The Whispering Caverns — BRANCHING TUNNELS with dead-end pockets and a loop back. */
  thornwild: [
    { cols:25, rows:20, entry:0,
      rooms:[ {r:16,c:10,h:3,w:6}, {r:11,c:10,h:3,w:6}, {r:11,c:2,h:3,w:5}, {r:11,c:18,h:3,w:5}, {r:5,c:10,h:4,w:6} ],
      links:[[0,1],[1,2],[1,3],[1,4]],
      packs:[ {room:1,lvl:1,comp:T.a}, {room:2,lvl:2,comp:T.b,treasure:true}, {room:3,lvl:2,comp:T.c}, {room:4,lvl:3,comp:T.mini} ] },
    { cols:25, rows:20, entry:0,
      rooms:[ {r:16,c:2,h:3,w:6}, {r:12,c:8,h:3,w:6}, {r:16,c:16,h:3,w:7}, {r:11,c:17,h:3,w:6}, {r:6,c:9,h:4,w:6}, {r:6,c:1,h:3,w:5} ],
      links:[[0,1],[0,2],[2,3],[1,4],[3,4],[1,5]],
      packs:[ {room:1,lvl:4,comp:T.d}, {room:2,lvl:4,comp:T.e,treasure:true}, {room:3,lvl:5,comp:T.k}, {room:5,lvl:5,comp:T.f,treasure:true}, {room:4,lvl:6,comp:T.miniHard} ] },
    { cols:25, rows:20, entry:0,
      rooms:[ {r:16,c:10,h:3,w:6}, {r:12,c:10,h:3,w:6}, {r:12,c:1,h:3,w:6}, {r:12,c:18,h:3,w:6}, {r:7,c:3,h:3,w:6}, {r:7,c:16,h:3,w:6}, {r:7,c:10,h:3,w:6}, {r:2,c:10,h:4,w:6} ],
      links:[[0,1],[1,2],[1,3],[2,4],[3,5],[4,6],[5,6],[1,6],[6,7]],
      packs:[ {room:1,lvl:7,comp:T.g}, {room:2,lvl:7,comp:T.f,treasure:true}, {room:3,lvl:8,comp:T.h}, {room:4,lvl:8,comp:T.k,treasure:true}, {room:5,lvl:9,comp:T.i}, {room:6,lvl:9,comp:T.j}, {room:7,lvl:10,comp:T.boss} ] },
  ],

  /* 5 · The Hollowed Crypts — SYMMETRIC tomb-halls: a central aisle flanked by paired burial chambers. */
  foundry: [
    { cols:23, rows:20, entry:0,
      rooms:[ {r:16,c:9,h:3,w:5}, {r:11,c:9,h:3,w:5}, {r:11,c:2,h:3,w:5}, {r:11,c:16,h:3,w:5}, {r:5,c:9,h:4,w:5} ],
      links:[[0,1],[1,2],[1,3],[1,4]],
      packs:[ {room:1,lvl:1,comp:T.a}, {room:2,lvl:2,comp:T.b,treasure:true}, {room:3,lvl:2,comp:T.e}, {room:4,lvl:3,comp:T.mini} ] },
    { cols:23, rows:20, entry:0,
      rooms:[ {r:16,c:9,h:3,w:5}, {r:12,c:9,h:3,w:5}, {r:12,c:2,h:3,w:5}, {r:12,c:16,h:3,w:5}, {r:7,c:9,h:3,w:5}, {r:2,c:9,h:4,w:5} ],
      links:[[0,1],[1,2],[1,3],[1,4],[4,5]],
      packs:[ {room:1,lvl:4,comp:T.f}, {room:2,lvl:4,comp:T.e,treasure:true}, {room:3,lvl:5,comp:T.g}, {room:4,lvl:5,comp:T.h}, {room:5,lvl:6,comp:T.miniHard} ] },
    { cols:23, rows:20, entry:0,
      rooms:[ {r:16,c:9,h:3,w:5}, {r:12,c:9,h:3,w:5}, {r:12,c:2,h:3,w:5}, {r:12,c:16,h:3,w:5}, {r:7,c:9,h:3,w:5}, {r:7,c:2,h:3,w:5}, {r:7,c:16,h:3,w:5}, {r:2,c:9,h:4,w:5} ],
      links:[[0,1],[1,2],[1,3],[1,4],[4,5],[4,6],[4,7]],
      packs:[ {room:1,lvl:7,comp:T.g}, {room:2,lvl:7,comp:T.f,treasure:true}, {room:3,lvl:8,comp:T.h}, {room:4,lvl:8,comp:T.i}, {room:5,lvl:9,comp:T.j,treasure:true}, {room:6,lvl:9,comp:T.i}, {room:7,lvl:10,comp:T.boss} ] },
  ],

  /* 6 · The Blighted Grove — SCATTERED clearings joined by winding paths, with looping trails. */
  shadowfen: [
    { cols:24, rows:20, entry:0,
      rooms:[ {r:16,c:3,h:3,w:5}, {r:12,c:10,h:3,w:6}, {r:15,c:17,h:3,w:5}, {r:8,c:4,h:3,w:6}, {r:6,c:14,h:4,w:6} ],
      links:[[0,1],[1,2],[1,3],[1,4],[3,4]],
      packs:[ {room:1,lvl:1,comp:T.a}, {room:2,lvl:2,comp:T.c,treasure:true}, {room:3,lvl:2,comp:T.b}, {room:4,lvl:3,comp:T.mini} ] },
    { cols:24, rows:20, entry:0,
      rooms:[ {r:16,c:9,h:3,w:6}, {r:12,c:2,h:3,w:6}, {r:12,c:16,h:3,w:6}, {r:8,c:9,h:3,w:6}, {r:7,c:1,h:3,w:5}, {r:3,c:13,h:4,w:6} ],
      links:[[0,1],[0,2],[1,3],[2,3],[1,4],[3,5],[2,5]],
      packs:[ {room:1,lvl:4,comp:T.d}, {room:2,lvl:4,comp:T.e}, {room:3,lvl:5,comp:T.g}, {room:4,lvl:5,comp:T.f,treasure:true}, {room:5,lvl:6,comp:T.miniHard} ] },
    { cols:24, rows:20, entry:0,
      rooms:[ {r:16,c:3,h:3,w:5}, {r:13,c:10,h:3,w:6}, {r:16,c:17,h:3,w:5}, {r:9,c:2,h:3,w:6}, {r:9,c:17,h:3,w:5}, {r:8,c:9,h:3,w:6}, {r:4,c:4,h:3,w:6}, {r:2,c:14,h:4,w:6} ],
      links:[[0,1],[1,2],[1,3],[1,5],[2,4],[3,6],[5,6],[4,7],[6,7]],
      packs:[ {room:1,lvl:7,comp:T.g}, {room:2,lvl:7,comp:T.h}, {room:3,lvl:8,comp:T.f,treasure:true}, {room:4,lvl:8,comp:T.k}, {room:5,lvl:9,comp:T.i}, {room:6,lvl:9,comp:T.j,treasure:true}, {room:7,lvl:10,comp:T.boss} ] },
  ],

  /* 7 · The Obsidian Wastes — a WIDE, open sprawl: broad blackglass flats you cross rather than climb. */
  skyreach: [
    { cols:27, rows:18, entry:0,
      rooms:[ {r:13,c:11,h:3,w:6}, {r:13,c:2,h:3,w:6}, {r:13,c:19,h:3,w:6}, {r:7,c:11,h:4,w:6} ],
      links:[[0,1],[0,2],[0,3]],
      packs:[ {room:1,lvl:1,comp:T.b,treasure:true}, {room:2,lvl:2,comp:T.c}, {room:3,lvl:3,comp:T.mini} ] },
    { cols:27, rows:18, entry:0,
      rooms:[ {r:13,c:2,h:3,w:6}, {r:13,c:10,h:3,w:6}, {r:13,c:19,h:3,w:6}, {r:7,c:6,h:3,w:6}, {r:7,c:15,h:4,w:6} ],
      links:[[0,1],[1,2],[1,3],[2,4],[3,4]],
      packs:[ {room:1,lvl:4,comp:T.d}, {room:2,lvl:5,comp:T.e,treasure:true}, {room:3,lvl:5,comp:T.f}, {room:4,lvl:6,comp:T.miniHard} ] },
    { cols:27, rows:18, entry:0,
      rooms:[ {r:14,c:11,h:3,w:6}, {r:14,c:2,h:3,w:6}, {r:14,c:20,h:3,w:6}, {r:9,c:6,h:3,w:6}, {r:9,c:15,h:3,w:6}, {r:4,c:2,h:3,w:6}, {r:4,c:20,h:3,w:6}, {r:2,c:11,h:4,w:6} ],
      links:[[0,1],[0,2],[0,3],[0,4],[1,5],[2,6],[3,7],[4,7],[5,7],[6,7]],
      packs:[ {room:1,lvl:7,comp:T.g}, {room:2,lvl:7,comp:T.h}, {room:3,lvl:8,comp:T.f,treasure:true}, {room:4,lvl:8,comp:T.i}, {room:5,lvl:9,comp:T.k,treasure:true}, {room:6,lvl:9,comp:T.j}, {room:7,lvl:10,comp:T.boss} ] },
  ],

  /* 8 · The Forgotten Citadel — a FORTRESS of squared halls and paired wings, marched through rank by rank. */
  wastes: [
    { cols:23, rows:20, entry:0,
      rooms:[ {r:16,c:9,h:3,w:5}, {r:11,c:4,h:3,w:6}, {r:11,c:13,h:3,w:6}, {r:5,c:9,h:4,w:5} ],
      links:[[0,1],[0,2],[1,3],[2,3]],
      packs:[ {room:1,lvl:1,comp:T.b,treasure:true}, {room:2,lvl:2,comp:T.c}, {room:3,lvl:3,comp:T.mini} ] },
    { cols:23, rows:20, entry:0,
      rooms:[ {r:16,c:9,h:3,w:5}, {r:12,c:3,h:4,w:6}, {r:12,c:14,h:4,w:6}, {r:7,c:9,h:3,w:5}, {r:2,c:9,h:4,w:5} ],
      links:[[0,1],[0,2],[1,3],[2,3],[3,4]],
      packs:[ {room:1,lvl:4,comp:T.f,treasure:true}, {room:2,lvl:5,comp:T.g}, {room:3,lvl:5,comp:T.h}, {room:4,lvl:6,comp:T.miniHard} ] },
    { cols:23, rows:20, entry:0,
      rooms:[ {r:16,c:9,h:3,w:5}, {r:12,c:2,h:3,w:6}, {r:12,c:15,h:3,w:6}, {r:12,c:9,h:3,w:5}, {r:7,c:2,h:3,w:6}, {r:7,c:15,h:3,w:6}, {r:7,c:9,h:3,w:5}, {r:2,c:9,h:4,w:5} ],
      links:[[0,3],[3,1],[3,2],[1,4],[2,5],[3,6],[4,6],[5,6],[6,7]],
      packs:[ {room:3,lvl:7,comp:T.g}, {room:1,lvl:7,comp:T.f,treasure:true}, {room:2,lvl:8,comp:T.h}, {room:4,lvl:8,comp:T.i}, {room:5,lvl:9,comp:T.j,treasure:true}, {room:6,lvl:9,comp:T.i}, {room:7,lvl:10,comp:T.boss} ] },
  ],

  /* 9 · The Void Chasm — a DIAMOND that converges: side paths fold inward toward the rift at the top. */
  rimeheart: [
    { cols:23, rows:20, entry:0,
      rooms:[ {r:16,c:9,h:3,w:5}, {r:11,c:2,h:3,w:6}, {r:11,c:14,h:3,w:6}, {r:5,c:9,h:4,w:5} ],
      links:[[0,1],[0,2],[1,3],[2,3]],
      packs:[ {room:1,lvl:1,comp:T.a,treasure:true}, {room:2,lvl:2,comp:T.c}, {room:3,lvl:3,comp:T.mini} ] },
    { cols:23, rows:20, entry:0,
      rooms:[ {r:16,c:9,h:3,w:5}, {r:12,c:1,h:3,w:6}, {r:12,c:16,h:3,w:6}, {r:8,c:4,h:3,w:6}, {r:8,c:13,h:3,w:6}, {r:3,c:9,h:4,w:5} ],
      links:[[0,1],[0,2],[1,3],[2,4],[3,5],[4,5],[3,4]],
      packs:[ {room:1,lvl:4,comp:T.d}, {room:2,lvl:4,comp:T.e,treasure:true}, {room:3,lvl:5,comp:T.g}, {room:4,lvl:5,comp:T.h}, {room:5,lvl:6,comp:T.miniHard} ] },
    { cols:23, rows:20, entry:0,
      rooms:[ {r:16,c:2,h:3,w:6}, {r:16,c:15,h:3,w:6}, {r:12,c:9,h:3,w:5}, {r:8,c:2,h:3,w:6}, {r:8,c:15,h:3,w:6}, {r:8,c:9,h:3,w:5}, {r:3,c:9,h:4,w:5}, {r:12,c:1,h:3,w:5} ],
      links:[[0,2],[1,2],[0,7],[2,3],[2,4],[2,5],[3,5],[4,5],[5,6]],
      packs:[ {room:2,lvl:7,comp:T.g}, {room:7,lvl:7,comp:T.f,treasure:true}, {room:1,lvl:8,comp:T.h}, {room:3,lvl:8,comp:T.i}, {room:4,lvl:9,comp:T.j,treasure:true}, {room:5,lvl:9,comp:T.i}, {room:6,lvl:10,comp:T.boss} ] },
  ],

  /* 10 · The Nether Citadel — the GRAND finale: a large, many-looped ascent to the Dread Lord's spire. */
  apex: [
    { cols:25, rows:21, entry:0,
      rooms:[ {r:17,c:10,h:3,w:6}, {r:12,c:3,h:3,w:6}, {r:12,c:16,h:3,w:6}, {r:12,c:10,h:3,w:6}, {r:6,c:10,h:4,w:6} ],
      links:[[0,3],[3,1],[3,2],[3,4]],
      packs:[ {room:3,lvl:1,comp:T.b}, {room:1,lvl:2,comp:T.c,treasure:true}, {room:2,lvl:2,comp:T.e}, {room:4,lvl:3,comp:T.mini} ] },
    { cols:25, rows:21, entry:0,
      rooms:[ {r:17,c:2,h:3,w:6}, {r:17,c:17,h:3,w:6}, {r:12,c:9,h:3,w:6}, {r:12,c:1,h:3,w:6}, {r:12,c:18,h:3,w:6}, {r:6,c:9,h:3,w:6}, {r:2,c:9,h:4,w:6} ],
      links:[[0,3],[1,4],[3,2],[4,2],[2,5],[3,5],[4,5],[5,6]],
      packs:[ {room:3,lvl:4,comp:T.f}, {room:4,lvl:4,comp:T.g,treasure:true}, {room:2,lvl:5,comp:T.h}, {room:5,lvl:5,comp:T.i}, {room:6,lvl:6,comp:T.miniHard} ] },
    { cols:25, rows:21, entry:0,
      rooms:[ {r:17,c:10,h:3,w:6}, {r:13,c:2,h:3,w:6}, {r:13,c:17,h:3,w:6}, {r:13,c:10,h:3,w:6}, {r:8,c:2,h:3,w:6}, {r:8,c:17,h:3,w:6}, {r:8,c:10,h:3,w:6}, {r:4,c:3,h:3,w:6}, {r:4,c:16,h:3,w:6}, {r:0,c:10,h:4,w:6} ],
      links:[[0,3],[3,1],[3,2],[3,6],[1,4],[2,5],[6,4],[6,5],[4,7],[5,8],[6,9],[7,9],[8,9]],
      packs:[ {room:3,lvl:7,comp:T.g}, {room:1,lvl:7,comp:T.h,treasure:true}, {room:2,lvl:8,comp:T.i}, {room:6,lvl:8,comp:T.j}, {room:4,lvl:9,comp:T.i}, {room:5,lvl:9,comp:T.k,treasure:true}, {room:7,lvl:9,comp:T.j}, {room:8,lvl:10,comp:T.i}, {room:9,lvl:10,comp:T.boss} ] },
  ],
};
