# 📋 Hex Infinity RPG — Release Notes

---

## Version 1.0.0 — March 5, 2026

### ✨ Shared Navigation Bar

The main navigation bar has been extracted into a unified component used by all screens — Town, Battle Maps, and Housing. Badge indicators (unspent stats, skills, new loot) now behave consistently everywhere.

### 🐛 Bug Fixes

- Fixed unequip issue affecting rings and shields across all character saves
- Added Market Square shortcut button to the Housing action bar
- Various mobile layout and touch target improvements

---

## Version 0.9.0 — February 10, 2026

### ⚡ Proc System

Items can now trigger powerful effects in combat. **12 proc types** across 6 trigger categories have been added, including on-hit, on-crit, on-kill, on-low-health, on-dodge, and on-cast events.

- Proc effects are slot-aware (some only activate on weapons, others on armor)
- Procs integrate with the full 4-layer combat modifier system
- Visual feedback animations play when procs activate
- Proc stats are shown in the item detail popup in your inventory

---

## Version 0.8.0 — February 8, 2026

### 🌲 Passive Skill Integration

Passive skills now directly affect your combat stats. Skills you've learned show real impact in your character sheet — attack power, defense, crit chance, lifesteal, mana regeneration, and more are all reflected live.

- Character stats panel shows passive skill breakdowns
- Lifesteal, armor penetration, and attack speed are fully functional
- New Status Effects system manages buffs and debuffs in combat

---

## Version 0.7.0 — January 27, 2026

### ⚗️ Potion System Overhaul

Potions have been fully redesigned from the ground up.

- Potions now drop from enemies in combat
- Health and mana potions display cooldown animations when used
- Inventory filter added to quickly find potions in a full pack
- Auto-potion thresholds are configurable per character

---

## Version 0.6.0 — January 27, 2026

### 🏡 Player Housing

Your home in Kulsen's Landing is now upgradeable. Six structures can be improved using gold and crafting materials, each providing permanent passive bonuses to your character:

- 🏋️ Training Grounds — Attack Power
- 🛡️ Armory — Defense
- 🌿 Herb Garden — Health Regeneration
- 📚 Study — Magic and Mana
- 💰 Vault — Bonus Gold
- ⛺ Barracks — Extended Auto-Battle Timer

Upgrade materials drop from enemies and scale with map difficulty.

---

## Version 0.5.0 — January 26, 2026

### 💤 Offline Progress

Your character now continues to make progress while you're away. When you return, the game calculates XP, gold, and loot you would have earned based on your last map and combat effectiveness.

---

## Version 0.4.0 — January 21, 2026

### 🗺️ World Map Expansion

The world now contains **14 unique battle maps** with fully designed interconnections, enemy populations, and loot tables. The World Map panel shows all regions with pan and zoom support.

- **30+ creature types** across all maps
- **17 loot tables** with class-weighted drops
- Narrative content for each location

---

## Version 0.3.0 — January 17, 2026

### 🏘️ MUD-Style Town Interface

The town screen was rebuilt as a full MUD-style text interface. NPCs now respond in dialogue, offer flavor text, and react to your browsing. All services — shop, forge, temple, bank — flow naturally from conversation.

### 🗺️ World Map UI

A visual world map panel was added showing interconnected map nodes. Fast-travel to any accessible location from the map view.

---

## Version 0.2.0 — January 10, 2026

### ⚔️ Skill System

Full skill trees are now implemented for all four classes — Warrior, Mage, Rogue, and Cleric. Each class has **3 branches with 12 skills each** (36 skills per class).

- Active and passive skills fully functional
- Skill bar in combat with auto-cast support
- Skills scale with character stats and gear

---

## Version 0.1.0 — January 1, 2026

### 🎉 Initial Release

The core foundations of Hex Infinity RPG are live.

- Character creation with race, class, stats, and appearance
- Hex-based battle maps with movement and auto-combat
- Inventory, equipment, and loot drop system
- Turn-based combat engine with crit and dodge
- Town hub with NPC services
- Save and load via browser local storage

---

## 🔭 Coming Soon

These features are actively planned and in various stages of development.

### 🌐 Multiplayer

Battle maps will support up to **4 concurrent players** per instance. Includes:
- Real-time player presence on battle maps
- In-game chat (map chat and global chat)
- Coordinated auto-battle with shared loot rules
- New map instances spawn automatically when capacity is reached

### 🎆 Combat Animations

Expanded visual effects are in development:
- Particle effects for skills and procs
- Attack swing indicators on the hex grid
- Spell projectile animations
- Enhanced floating damage text

### 🏪 Auction House

A player-driven economy is planned:
- List items for sale to other players
- Browse and bid on gear
- Gold escrow and transaction history

### 📱 Mobile App (PWA / App Store)

Hex Infinity will be deployable as a Progressive Web App and eventually distributed through the App Store and Google Play, with full offline support and push notifications for auto-battle completion.

### 🌍 World Expansion

New regions are planned beyond the current 14 maps, with:
- Higher level content scaling beyond Level 100
- New enemy factions and lore-tied locations
- Region-specific loot and rare crafting materials
- Dungeon nodes with multi-stage exploration

### 💎 Premium Shop

Optional cosmetic and quality-of-life upgrades:
- Additional character slots
- Inventory and bank expansion
- Extended auto-battle timers
- Cosmetic appearance items

---

*Thank you for playing Hex Infinity RPG. The world keeps expanding — check back often.*
