# Hex RPG — Game Design Document

> **Working title:** Dungeon Pals (v2 lineage)
> **Genre:** Party auto-battler / theorycraft RPG with idle & PvP layers
> **Platform:** Mobile-first web (portrait), zero-install, later PWA
> **Status:** Living design doc. Confirmed decisions are marked ✅; open items are marked 🔶.

---

## 1. Vision & Pillars

A **strategy-first auto-battler**. The player does not click attacks — they **build** a party and a plan, then watch it play out. The depth is in **theorycrafting**: stat optimization, gear combinations, skill rotations, and party composition.

**Design pillars**
1. **Theorycraft over twitch.** Every meaningful decision happens *before* the fight — gear, skills, priority order, party makeup.
2. **Loot is the engine.** Deeply randomized, data-driven gear with meaningful trade-offs drives the chase.
3. **Readable systems.** Numbers and effects are transparent so players can reason about and optimize them.
4. **Own art identity.** A procedural, hand-inked visual engine — no stock assets, fully expandable.
5. **Respect offline time.** Progress continues while away; sessions are short and rewarding.

---

## 2. Core Combat Model ✅ (stat-based %)

We **replace the prototype's D&D d20 system** with a deterministic, stat-driven model built for optimization.

### 2.1 Character Stats (the six)
| Stat | Symbol | Role |
|---|---|---|
| **HP** | `hp` | Health pool. Unit dies at 0. |
| **Attack** | `atk` | Scales outgoing damage. |
| **Defense** | `def` | Mitigates incoming damage (diminishing curve). |
| **Dodge** | `dodge%` | Chance to fully avoid an incoming hit. |
| **Grit** | `grit%` | Chance to **blunt** a hit: negates any crit and reduces the blow (default to 50%). Toughness. |
| **Attack Speed** | `aspd` | Governs how often the unit acts (action cadence). |

**Hidden / derived (not core-six, sourced from gear procs & skills):**
- `crit%` (base 5%), `critMult` (base ×1.5)
- `lifesteal%`, elemental/DoT proc magnitudes, buff/debuff values.

### 2.2 Action economy
- Combat is a **fixed-timestep simulation** on a grid (inherits the prototype's 8×11 board and Manhattan movement).
- Each unit has an **action timer**; interval = `BASE_INTERVAL / aspd`. When it fires, the unit takes **one action**.
- An action = resolve the unit's **skill priority list** (§4): fire the first eligible skill, else a **basic attack**.
- Ranged units act at range; melee units path toward the nearest valid target first.

### 2.3 Damage resolution (per hit)
```
1. Dodge check:   rand() < target.dodge%      → AVOIDED (0 dmg, "dodge")
2. Base damage:   dmg = skill.base * atkScale(attacker.atk)
3. Crit check:    rand() < crit%               → dmg *= critMult   (crit)
4. Mitigation:    dmg *= 100 / (100 + target.def)   // smooth diminishing returns
5. Grit check:    rand() < target.grit%         → negate crit, dmg *= GRIT_BLUNT (0.5)
6. Floor:         dmg = max(1, round(dmg))
7. Apply procs (lifesteal, burn, etc.)
```
Constants (`atkScale`, `GRIT_BLUNT`, mitigation curve) live in `data/balance.js` — all tunable, no magic numbers in code. 🔶 Exact constants are placeholders pending balance passes.

### 2.4 Determinism
All randomness flows through a **seeded RNG** (mulberry32, already in the prototype). Same seed + same inputs ⇒ identical battle. This is mandatory for **fair async PvP** and **server-side verification** later.

---

## 3. Classes ✅ (fighter / mage / rogue)

Three base classes (the prototype's *cleric* is retired; healing becomes a **support skill line** any class can slot; a dedicated healer class is 🔶 future).

| Class | Fantasy | Stat lean | Role |
|---|---|---|---|
| **Fighter** | Frontline bruiser | High HP / DEF / GRIT, melee ATK | Soak & hold the line; taunt/guard skills |
| **Mage** | Glass cannon | High ATK, AoE; low HP/DEF; ranged | Burst & crowd damage |
| **Rogue** | Skirmisher | High DODGE / ASPD / crit; single-target | Burst priority targets, utility (poison/bleed) |

Each class defines: base stats, per-level growth, allowed gear types, and its native skill pool.

---

## 4. Skills & Priority Rotation ✅ (cooldown + priority list, no mana)

- Every hero has a **basic attack** (always available) + up to **4 skill slots**.
- Each skill has: `id, name, class, targetRule, condition, cooldown, effect, scalingStat, upgradeLevel`.
  - **targetRule:** nearest enemy, lowest-HP enemy, lowest-HP% ally, self, all enemies, all allies, random enemy…
  - **condition:** gate for firing — e.g. `always`, `ally.hp% < 50`, `enemies >= 3`, `self.hp% < 30`, `target.hasDebuff(x)`.
  - **effect:** damage (mult of scaling stat), heal, buff, debuff, DoT, shield, AoE, summon (future 🔶).
- **Priority list:** the player **orders** their skills. On each action the engine walks the list top→down and fires the **first skill whose cooldown is ready and condition is met**; if none, basic attack. (Feature 3.)
- **Upgrades:** skills level up (stronger effect / lower cooldown / added rider) via **skill points** (from leveling) and/or materials. Diminishing per level. (Features 1 & 2.)
- No mana/energy — the knobs are **cooldown, condition, and order**. This is the heart of the theorycraft.

---

## 5. Progression

- **XP & Levels:** kills grant shared party XP (prototype behavior, generalized). Level cap removed; XP curve is formula-driven in `data/xp-curve.js`.
- **On level-up:** class-based stat growth + skill point(s).
- **Skill points:** spent to unlock/upgrade skills.
- **Main hero** is created by the player (name, starting stat allocation, starting skills). (Feature 1.)
- **Companions** are randomly generated recruits (see §7).

---

## 6. Loot System ✅ (data-driven, procedural)

Every item is composed of **Prefix + Material + Gear Type + Upgrade Level**, and is **class-specific**. (Feature 9.)

```
[Prefix]  [Material]  [Gear Type]  (+UpgradeLevel)
  Icy       Iron         Sword         (+2)      → "Icy Iron Sword (+2)"
  —         Silk         Slippers       —        → "Silk Slippers"
  Vampiric  Dragonhide   Shield         —        → "Vampiric Dragonhide Shield"
```

### 6.1 The three component tables (each grants exactly one stat)
- **Gear Type** — defines the **slot**, the **class** it serves, and one stat bonus.
  - *Weapon types:* sword, dagger, mace (fighter); wand, staff, orb (mage); bow, blades (rogue)… 🔶 extend.
  - *Wearable types:* helm, chest, gloves, boots, cloak, ring, amulet, shield.
- **Material** — defines **base stats** and rarity weighting; carries one stat bonus and may carry a **drawback**.
  - *Weapon materials:* iron, steel, meteoric, emberglass… (e.g. *meteoric*: +ATK, −ASPD).
  - *Wearable materials:* cotton, silk, leather, dragonhide… (e.g. *dragonhide*: +DEF, +GRIT).
- **Prefix** — defines a **proc** (special effect) + one stat bonus + rarity weighting. `normal` = no proc.
  - e.g. *fiery* (burn DoT), *icy* (slow/chill), *vampiric* (lifesteal), *keen* (+crit).

Item's total stats = prefix bonus + material bonus + gear-type bonus + upgrade bonuses. **Benefits *and* drawbacks** emerge from materials/prefixes carrying negative modifiers. (Feature 9.)

### 6.2 Rarity
Rarity is **derived** from the drawn components' rarity weights (rarest component drives the item's tier), governing name color and drop rates. Tiers: 🔶 `common / rare / epic (/ legendary?)`.

### 6.3 Forge — gem upgrades ✅ (Feature 10)
- **Runic gems** are rare drops.
- At the **Forge**, apply a gem to attempt **+1 to the item's primary stat** (raises Upgrade Level).
- **Diminishing success chance** as level rises; on failure, a **chance of destruction** (or downgrade). All success/destruction odds are data-driven per level in `data/balance.js`.

---

## 7. Party & Companions ✅ (main + up to 3)

- **Party = 4 slots:** the player's **main hero** + up to **3 hired companions**. (Feature 2.)
- **Companions** are **randomly generated** (class, name, rolled base stats, starting skill(s), optional trait). Hired at the **Tavern** for gold (premium hire 🔶).
- Companions **earn XP and loot**, are **equippable**, and the player chooses **which of their skills to upgrade**. (Feature 2.)
- Roster persists (no permadeath by default 🔶); downed heroes revive between runs. A **roster cap** limits benched companions (expandable — monetization hook).

---

## 8. Meta Structure & Screens

### 8.1 Keep / Town hub ✅ (Feature 6)
Home screen with services:
| Service | Function |
|---|---|
| **Shop** | Buy/sell gear, consumables, gems (rotating stock). |
| **Bank** | Store gold & items; stash tabs (extra tabs = monetization 🔶). |
| **Forge** | Gem upgrades (§6.3). |
| **Tavern** | Hire randomly-generated companions. |
| **Barracks/Roster** | Manage party & bench; view/equip characters. |
| **Arena** | PvP entry (§9). |
| **World Map** | Depart to dungeons. |

Keep-level upgrades (unlock/boost services) are 🔶 future.

### 8.2 Character & Inventory ✅ (Features 13, 14)
- **Character screen:** view a hero's six stats, derived values, gear slots; **swap gear here**.
- **Inventory screen:** grid management, filter/sort, compare, sell, send-to-forge.

### 8.3 World Map & Dungeons ✅ (Features 11, 12)
- **World map:** node graph of dungeons/regions, gated by level/progression/keys. Future open-world hunting areas 🔶.
- **Dungeons:** **procedurally generated** rooms from a **dungeon config** (data-driven):
  - `theme, levelRange, enemyPool, lootBias, boss, roomCount, palette/tileset, npcTypes`.
  - Low-level dungeons → rats/kobolds, low-tier loot, easier boss. Higher tiers scale enemy stats **and** loot tier.
  - **Themes/regions** reskin enemies, loot bias, and visual styling for a distinct feel.

### 8.4 Skill Priority screen ✅ (Feature 3)
Drag-to-order each hero's skill rotation; set per-skill conditions.

---

## 9. Multiplayer ✅ (async PvP first; local-first seam)

- **PvP Arena (async snapshot):** the player's party — stats, gear, and skill priorities — serializes into a **battle snapshot**. Matchmaking pairs snapshots; the **deterministic sim** (§2.4) runs both parties head-to-head. Client-side now (local "ghost" opponents from generated snapshots), **server-authoritative later**. Ladder/ELO + rewards. (Feature 4.)
- **Co-op dungeons:** 🔶 future.
- All net access is behind a **`NetService`** interface — mocked locally today, swapped for a real backend with **no gameplay rewrites**.

---

## 10. Persistence, Slots & Offline

### 10.1 Save slots ✅ (Feature 5)
- Multiple **game slots** = independent profiles (separate parties/progress). 1–2 free; more **paid** (monetization).
- All state serializes to JSON behind a **`SaveService`** (localStorage now → cloud later).

### 10.2 Offline progression ✅ (Feature 7)
- On load, compute elapsed time since last save, **capped at 8h** (free). Simulate idle rewards (runs/resources) over that window and present an **offline earnings** summary.
- Extended caps (**24h / 48h**) are a monetization hook.
- ⚠️ Client-side offline sim is **clock-exploitable** — acceptable for MVP; **server-authoritative time** closes it later (`TimeService` seam).

---

## 11. Monetization (design-in, don't build yet) 🔶

Hooks reserved (all behind feature flags, no store in MVP):
- Extra **game slots**.
- Extended **offline cap** (24/48h).
- Extra **bank/stash tabs**.
- Premium **companion hires** / roster expansion.
- Cosmetics. **No pay-to-win on raw power** is the guiding constraint.

---

## 12. Art / Asset Engine ✅ (Feature 16)

Keep the prototype's **procedural, seeded, hand-inked engine** (portraits, creatures, tiles, fx). It is deterministic, cache-friendly, asset-free, and expandable. Wrapped as a rendering module; individual generators can later be swapped for authored art per-entity without touching game logic.

---

## 13. Feature Coverage Map

| # | Feature | Section | Status |
|---|---|---|---|
| 1 | Main character: name, stats, skills, upgrades | §3–5 | ✅ |
| 2 | Hire/equip/upgrade random companions | §7 | ✅ |
| 3 | Skill priority ordering | §4, §8.4 | ✅ |
| 4 | Multiplayer PvP arenas (co-op later) | §9 | ✅ async / 🔶 co-op |
| 5 | Multiple game slots (monetization) | §10.1 | ✅ |
| 6 | Keep/Town hub with services | §8.1 | ✅ |
| 7 | Offline progression (8h; 24/48h paid) | §10.2 | ✅ |
| 8 | Auto-battler; strategy/theorycraft | §1–2, §4 | ✅ |
| 9 | Data-driven random loot (prefix+material+type+level) | §6 | ✅ |
| 10 | Forge gem upgrades (diminishing, destruction) | §6.3 | ✅ |
| 11 | World map → dungeons (open world later) | §8.3 | ✅ / 🔶 open-world |
| 12 | Procedural themed dungeons w/ gating | §8.3 | ✅ |
| 13 | Inventory management | §8.2 | ✅ |
| 14 | Character view + gear swap | §8.2 | ✅ |
| 15 | Stats: atk/def/dodge/grit/aspd/hp | §2.1 | ✅ |
| 16 | Expandable asset engine | §12 | ✅ |

---

## 14. Open Questions / To-Decide 🔶

1. **Dedicated healer/support class** vs healing-as-skill-line (current: skill line).
2. **Crit** as a first-class stat vs proc/skill-only (current: hidden, from procs/skills).
3. **Rarity tiers** — 3 (common/rare/epic) or 4 (+legendary)? Colors/odds.
4. **Permadeath** for companions? (current: no; revive between runs.)
5. **Damage-formula constants** — needs a balance pass (placeholders in `balance.js`).
6. **Live PvP / co-op** — async only for now; realtime is a later backend decision.
7. **Energy/stamina** gating on dungeon runs? (Not in the feature list — omitted unless desired.)
8. **Consumables** (potions, scrolls) — in scope? Implied by Shop; needs a small spec.

See `docs/ARCHITECTURE.md` for the technical realization and the phased build roadmap.
