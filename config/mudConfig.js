/**
 * @file mudConfig.js
 * @description Configuration for MUD-inspired town UI including text feed settings,
 *              location definitions, MUD action buttons, NPC dialogues, and narrative text pools.
 * 
 * @usage Imported by TownScreen.js for UI rendering, dialogue management, and text content.
 * @dependencies None (pure data configuration)
 * 
 * @version 2.7.0
 * @changelog
 *   - v2.7.0 (2026-03-07): Added MUD_TEXT_CONFIG (canonical per-type appearance settings from mockup tool).
 *                          Added DisplayPrefsDefaults (user localStorage prefs: typewriter, font size).
 *                          Expanded TextEntryTypes with all housing types so both screens share one enum.
 *                          Updated MudSettings.typewriterSpeed to 25ms.
 *   - v2.6.0 (2026-03-05): Removed 'home' from market_square actions (moved to Go To bar in TownScreen).
 *                          Removed 'rest' from market_square and town actions — Rest is now only
 *                          available at the Rusty Anchor (tavern) as intended.
 *   - v2.5.0 (2026-01-27): Updated vault_master_dolgrim dialogue with real bank actions.
 *                          Added openBankGold, openBankVault, openBankExpand dialogue actions.
 *                          Added browsingComments, depositReactions, withdrawReactions.
 *   - v2.4.0 (2026-01-26): Added 'home' action to market_square for player housing access.
 *                          Added housing ambient events.
 *   - v2.3.0 (2025-01-24): Added imagePath property to all locations for header images.
 *                          Images load from assets/top_nav/ with emoji fallback.
 *   - v2.2.0 (2025-01-21): Added Forge dialogue options to blacksmith NPCs.
 *                          Added 'openForgePanel' action for gear upgrading.
 *                          Updated torgin_ironhand and blacksmith dialogues.
 *   - v2.1.0 (2025-01-20): Phase 3 - Added full NPC definitions for all location NPCs.
 *                          Updated getMudActions() to merge location NPCs into action bar.
 *                          Added getLocationNPCs() helper function.
 *   - v2.0.0 (2025-01-20): Major expansion - Added all 10 Eron's Landing locations with
 *                          descriptions (day/night), location-specific actions, exits,
 *                          NPCs, and MovementText for transitions.
 *   - v1.2.0 (2025-01-18): Expanded AmbientEvents pool for richer town atmosphere
 *   - v1.1.0 (2025-01-17): Added NPC dialogue trees, contextual action bars
 *   - v1.0.0 (2025-01-17): Initial implementation with town location and actions
 */

// ============================================
// TEXT FEED SETTINGS
// ============================================

export const MudSettings = {
    maxTextEntries: 100,
    autoScrollEnabled: true,
    showTimestamps: false,
    textDisplayMode: 'instant',
    typewriterSpeed: 25
};

// ============================================
// TEXT ENTRY TYPES
// ============================================

export const TextEntryTypes = {
    // ── Town types ───────────────────────────────────────────
    NARRATION:        'narration',
    SYSTEM:           'system',
    NPC:              'npc',
    EVENT:            'event',
    RUMOR:            'rumor',
    COMBAT:           'combat',
    IMPORTANT:        'important',

    // ── Housing types ────────────────────────────────────────
    AMBIENT:          'ambient',
    ACTION:           'action',
    STRUCTURE_NAME:   'structure-name',
    STRUCTURE_DESC:   'structure-desc',
    STRUCTURE_ATMO:   'structure-atmo',
    STRUCTURE_DETAIL: 'structure-detail',
    NPC_DIALOGUE:     'npc-dialogue',
    LORE_EVENT:       'lore-event',
};

// ============================================
// MUD TEXT APPEARANCE CONFIG
// Canonical per-type style settings — source of truth for MudTextRenderer
// and the reference for styles.css. Generated from the mockup tool.
// ============================================

export const MUD_TEXT_CONFIG = {
    narration:         { color: '#d4a843', eStyle: 'left-bar',  italic: false },
    system:            { color: '#6fb8e8', eStyle: 'real',       italic: false },
    npc:               { color: '#d4a843', eStyle: 'real',       italic: true  },
    event:             { color: '#d4a843', eStyle: 'left-bar',  italic: false },
    rumor:             { color: '#d4a843', eStyle: 'left-bar',  italic: false },
    combat:            { color: '#e05555', eStyle: 'left-bar',  italic: false },
    important:         { color: '#d4a843', eStyle: 'real',       italic: false, goldBox: true },
    // Housing extensions
    ambient:           { color: '#6B8E6B', eStyle: 'none',      italic: true  },
    action:            { color: '#6495ED', eStyle: 'none',      italic: false },
    'structure-name':  { color: '#FFD700', eStyle: 'none',      italic: false },
    'structure-desc':  { color: '#dddddd', eStyle: 'none',      italic: false },
    'structure-atmo':  { color: '#9370DB', eStyle: 'none',      italic: true  },
    'structure-detail':{ color: '#888888', eStyle: 'none',      italic: false },
    'npc-dialogue':    { color: '#c9a96e', eStyle: 'none',      italic: true  },
    'lore-event':      { color: '#a0d4ff', eStyle: 'left-bar',  italic: false },
};

// ============================================
// USER DISPLAY PREFERENCES
// Persisted in localStorage key: hexrpg_display_prefs
// These are display-only — not saved to character data
// ============================================

export const DisplayPrefsDefaults = {
    typewriterEnabled: false,
    typewriterSpeed:   25,       // ms per character
    fontSize:          'normal', // 'small' | 'normal' | 'large'
};

// ============================================
// MUD ACTION DEFINITIONS
// ============================================

export const MudActions = {
    town: [
        { id: 'look', label: 'Look', icon: '👁', handler: 'handleLook' },
        { id: 'rumors', label: 'Rumors', icon: '💬', handler: 'handleRumors' }
    ],
    market_square: [
        { id: 'look', label: 'Look', icon: '👁', handler: 'handleLook' },
        { id: 'notices', label: 'Notices', icon: '📌', handler: 'handleNotices' }
    ],
    docks: [
        { id: 'look', label: 'Look', icon: '👁', handler: 'handleLook' },
        { id: 'ships', label: 'Ships', icon: '⛵', handler: 'handleShips' }
    ],
    tavern: [
        { id: 'look', label: 'Look', icon: '👁', handler: 'handleLook' },
        { id: 'rest', label: 'Rest', icon: '🛏️', handler: 'handleRest' },
        { id: 'rumors', label: 'Rumors', icon: '💬', handler: 'handleRumors' },
        { id: 'drink', label: 'Drink', icon: '🍺', handler: 'handleDrink' }
    ],
    smith: [
        { id: 'look', label: 'Look', icon: '👁', handler: 'handleLook' },
        { id: 'forge', label: 'Forge', icon: '🔥', handler: 'handleForge' },
        { id: 'shop', label: 'Shop', icon: '⚔️', handler: 'handleSmith' },
        { id: 'repair', label: 'Repair', icon: '🔧', handler: 'handleRepair' }
    ],
    temple: [
        { id: 'look', label: 'Look', icon: '👁', handler: 'handleLook' },
        { id: 'heal', label: 'Heal', icon: '💚', handler: 'handleTemple' },
        { id: 'bless', label: 'Bless', icon: '✨', handler: 'handleBless' },
        { id: 'pray', label: 'Pray', icon: '🙏', handler: 'handlePray' }
    ],
    guild_hall: [
        { id: 'look', label: 'Look', icon: '👁', handler: 'handleLook' },
        { id: 'bounties', label: 'Bounties', icon: '📋', handler: 'handleBounties' },
        { id: 'contracts', label: 'Contracts', icon: '📜', handler: 'handleContracts' }
    ],
    general_shop: [
        { id: 'look', label: 'Look', icon: '👁', handler: 'handleLook' },
        { id: 'buy', label: 'Buy', icon: '🛒', handler: 'handleShop' },
        { id: 'sell', label: 'Sell', icon: '💰', handler: 'handleSell' }
    ],
    bank: [
        { id: 'look', label: 'Look', icon: '👁', handler: 'handleLook' },
        { id: 'deposit', label: 'Deposit', icon: '📥', handler: 'handleDeposit' },
        { id: 'withdraw', label: 'Withdraw', icon: '📤', handler: 'handleWithdraw' },
        { id: 'vault', label: 'Vault', icon: '🔐', handler: 'handleVault' }
    ],
    library: [
        { id: 'look', label: 'Look', icon: '👁', handler: 'handleLook' },
        { id: 'research', label: 'Research', icon: '📖', handler: 'handleResearch' },
        { id: 'identify', label: 'Identify', icon: '🔮', handler: 'handleMagicIdentify' }
    ],
    gates: [
        { id: 'look', label: 'Look', icon: '👁', handler: 'handleLook' },
        { id: 'depart', label: 'Depart', icon: '🗺️', handler: 'handleDepart' }
    ],
    npc_dialogue: [
        { id: 'look', label: 'Look', icon: '👁', handler: 'handleLook' },
        { id: 'leave', label: 'Leave', icon: '🚪', handler: 'handleLeaveDialogue' }
    ],
    dungeon: [
        { id: 'look', label: 'Look', icon: '👁', handler: 'handleLook' },
        { id: 'search', label: 'Search', icon: '🔍', handler: 'handleSearch' },
        { id: 'listen', label: 'Listen', icon: '👂', handler: 'handleListen' },
        { id: 'retreat', label: 'Retreat', icon: '🚪', handler: 'handleRetreat' }
    ],
    camp: [
        { id: 'look', label: 'Look', icon: '👁', handler: 'handleLook' },
        { id: 'rest', label: 'Rest', icon: '🛏️', handler: 'handleRest' },
        { id: 'craft', label: 'Craft', icon: '🔨', handler: 'handleCraft' },
        { id: 'break', label: 'Break Camp', icon: '⛺', handler: 'handleBreakCamp' }
    ]
};

export const ActionBarLabels = {
    town: 'Actions',
    market_square: 'Market Square',
    docks: 'The Docks',
    tavern: 'The Rusty Anchor',
    smith: 'The Crossed Swords',
    temple: 'The Wounded Wing',
    guild_hall: 'Expedition Hall',
    general_shop: "Outfitter's Guild",
    bank: 'Ironvault Depository',
    library: 'Athenaeum',
    gates: 'Town Gates',
    npc_dialogue: 'Talking',
    dungeon: 'Dungeon',
    camp: 'Camp'
};

// ============================================
// MAIN NAV BAR DEFINITIONS
// ============================================

export const MainNavButtons = [
    { id: 'stats', label: 'Char', icon: '📊', handler: 'handleStats', badge: 'unspentStatPoints' },
    { id: 'items', label: 'Items', icon: '🎒', handler: 'handleItems', badge: 'newLootFlag' },
    { id: 'skills', label: 'Skills', icon: '⚔️', handler: 'handleSkills', badge: 'unspentSkillPoints' },
    { id: 'map', label: 'Map', icon: '🗺️', handler: 'handleMap', badge: null },
    { id: 'menu', label: 'Menu', icon: '☰', handler: 'handleMenu', badge: null }
];
// ============================================
// LOCATION DEFINITIONS
// ============================================

export const Locations = {
    market_square: {
        id: 'market_square',
        type: 'town',
        name: 'Market Square',
        subtitle: 'Town Center • Safe Zone',
        icon: '🏛️',
        imagePath: 'assets/top_nav/town.jpg',  // Main town image
        actions: 'market_square',
        description: "The heart of Eron's Landing bustles with activity. Merchants hawk their wares beneath canvas awnings, travelers exchange news by the central well, and the smell of cooking food drifts from nearby stalls.",
        descriptionNight: "The market square is quiet now, stalls shuttered and locked. A few lanterns flicker, casting long shadows. The night watch makes their rounds.",
        npcs: ['street_vendor', 'town_crier'],
        exits: ['docks', 'tavern', 'smith', 'temple', 'guild_hall', 'general_shop', 'bank', 'library', 'gates'],
        entryEvents: ['TOWN_RETURN_FROM_BATTLE'],
        ambientEvents: ['market_square'],
        isStartLocation: false,
        isSafeZone: true,
        rules: { allowInventory: true, allowCharacterEdit: true, allowRest: true, allowShop: false, persistState: true }
    },
    
    docks: {
        id: 'docks',
        type: 'town',
        name: 'The Docks',
        subtitle: 'Harbor District • Safe Zone',
        icon: '⚓',
        imagePath: 'assets/top_nav/docks.jpg',
        actions: 'docks',
        description: "Salt air and the cry of gulls fill the harbor. Ships from the Old World rest at anchor, their crews unloading cargo or making repairs. The Harbormaster's office overlooks the busiest pier.",
        descriptionNight: "The docks are quieter after dark, though work never fully stops. Lanterns sway on anchored ships, and the night crew loads cargo by torchlight.",
        npcs: ['harbormaster_gren'],
        exits: ['market_square'],
        entryEvents: ['TOWN_FIRST_ARRIVAL'],
        ambientEvents: ['docks'],
        isStartLocation: true,
        isSafeZone: true,
        rules: { allowInventory: true, allowCharacterEdit: false, allowRest: false, allowShop: false, persistState: true }
    },
    
    tavern: {
        id: 'tavern',
        type: 'town',
        name: 'The Rusty Anchor',
        subtitle: 'Tavern • Safe Zone',
        icon: '🍺',
        imagePath: 'assets/top_nav/tavern.jpg',
        actions: 'tavern',
        description: "Warmth and the smell of ale wash over you as you enter The Rusty Anchor. A fire crackles in the hearth, adventurers swap stories at worn tables, and Marta Keelson keeps a watchful eye from behind the bar.",
        descriptionNight: "The tavern is livelier at night. Laughter and music fill the air, and the fire casts dancing shadows across weathered faces. This is where tales are born.",
        npcs: ['marta_keelson'],
        exits: ['market_square'],
        entryEvents: [],
        ambientEvents: ['tavern'],
        isStartLocation: false,
        isSafeZone: true,
        rules: { allowInventory: true, allowCharacterEdit: true, allowRest: true, allowShop: false, persistState: true }
    },
    
    smith: {
        id: 'smith',
        type: 'town',
        name: 'The Crossed Swords',
        subtitle: 'Smithy • Safe Zone',
        icon: '⚒️',
        imagePath: 'assets/top_nav/smith.jpg',
        actions: 'smith',
        description: "Heat radiates from the open forge. Weapons and armor line the walls—some practical, others ornate. Torgin Ironhand works the bellows, muscles gleaming with sweat, barely glancing up at your arrival.",
        descriptionNight: "The forge burns lower at night, but Torgin often works late. The rhythmic ring of hammer on anvil echoes through the quiet streets.",
        npcs: ['torgin_ironhand'],
        exits: ['market_square'],
        entryEvents: [],
        ambientEvents: ['smith'],
        isStartLocation: false,
        isSafeZone: true,
        rules: { allowInventory: true, allowCharacterEdit: false, allowRest: false, allowShop: true, persistState: true }
    },
    
    temple: {
        id: 'temple',
        type: 'town',
        name: 'The Wounded Wing',
        subtitle: 'Temple • Safe Zone',
        icon: '⛪',
        imagePath: 'assets/top_nav/temple.jpg',
        actions: 'temple',
        description: "Incense and candlelight fill the temple. The Triune symbol—three interlocking circles—adorns the altar. Sister Elara tends to the wounded and weary, her voice soft as she offers prayers.",
        descriptionNight: "The temple never truly closes. Candles burn through the night, and Sister Elara or one of her acolytes is always present for those in need.",
        npcs: ['sister_elara'],
        exits: ['market_square'],
        entryEvents: [],
        ambientEvents: ['temple'],
        isStartLocation: false,
        isSafeZone: true,
        rules: { allowInventory: true, allowCharacterEdit: false, allowRest: true, allowShop: false, persistState: true }
    },
    
    guild_hall: {
        id: 'guild_hall',
        type: 'town',
        name: 'Expedition Hall',
        subtitle: 'Adventurers Guild • Safe Zone',
        icon: '📋',
        imagePath: 'assets/top_nav/guild_hall.jpg',
        actions: 'guild_hall',
        description: "Maps cover every wall, marked with expedition routes and danger zones. A bounty board dominates one corner, covered in contracts. Guildmaster Corvin Vale studies reports at his desk.",
        descriptionNight: "The hall is quieter at night, though a few dedicated souls still pore over maps. The bounty board's contracts flutter in the draft.",
        npcs: ['corvin_vale'],
        exits: ['market_square'],
        entryEvents: [],
        ambientEvents: ['guild_hall'],
        isStartLocation: false,
        isSafeZone: true,
        rules: { allowInventory: true, allowCharacterEdit: false, allowRest: false, allowShop: false, persistState: true }
    },
    
    general_shop: {
        id: 'general_shop',
        type: 'town',
        name: "Outfitter's Guild",
        subtitle: 'General Store • Safe Zone',
        icon: '🏪',
        imagePath: 'assets/top_nav/general_shop.jpg',
        actions: 'general_shop',
        description: "Shelves crammed with supplies fill every corner—potions, rations, rope, torches, and a hundred other necessities. Quartermaster Venn keeps meticulous inventory behind the counter.",
        descriptionNight: "The shop is closed at night. A single lantern burns in the window, and the shelves wait in shadow for morning customers.",
        npcs: ['quartermaster_venn'],
        exits: ['market_square'],
        entryEvents: [],
        ambientEvents: ['general_shop'],
        isStartLocation: false,
        isSafeZone: true,
        closedAtNight: true,
        rules: { allowInventory: true, allowCharacterEdit: false, allowRest: false, allowShop: true, persistState: true }
    },
    
    bank: {
        id: 'bank',
        type: 'town',
        name: 'Ironvault Depository',
        subtitle: 'Bank • Safe Zone',
        icon: '🏦',
        imagePath: 'assets/top_nav/bank.jpg',
        actions: 'bank',
        description: "Stone walls and iron bars protect the wealth of Eron's Landing. Vault Master Dolgrim runs a tight operation—every coin counted, every item catalogued. Security is absolute.",
        descriptionNight: "The bank is sealed tight at night. Guards patrol the perimeter, and the vault's enchantments hum with protective magic.",
        npcs: ['vault_master_dolgrim'],
        exits: ['market_square'],
        entryEvents: [],
        ambientEvents: ['bank'],
        isStartLocation: false,
        isSafeZone: true,
        closedAtNight: true,
        rules: { allowInventory: true, allowCharacterEdit: false, allowRest: false, allowShop: false, persistState: true }
    },
    
    library: {
        id: 'library',
        type: 'town',
        name: 'Athenaeum of the Lost Age',
        subtitle: 'Library • Safe Zone',
        icon: '📚',
        imagePath: 'assets/top_nav/library.jpg',
        actions: 'library',
        description: "Ancient texts and scrolls fill towering shelves that reach toward the vaulted ceiling. Dust motes dance in shafts of light. Lorekeeper Theron sits among his books, ageless eyes scanning yellowed pages.",
        descriptionNight: "The library closes at dusk, but lamplight often burns late in Theron's study. Some knowledge, he says, is best sought in darkness.",
        npcs: ['theron_ashvale'],
        exits: ['market_square'],
        entryEvents: [],
        ambientEvents: ['library'],
        isStartLocation: false,
        isSafeZone: true,
        closedAtNight: true,
        rules: { allowInventory: true, allowCharacterEdit: false, allowRest: false, allowShop: false, persistState: true }
    },
    
    gates: {
        id: 'gates',
        type: 'town',
        name: 'Town Gates',
        subtitle: 'Town Exit • Safe Zone',
        icon: '🚪',
        imagePath: 'assets/top_nav/gates.jpg',
        actions: 'gates',
        description: "Massive wooden gates reinforced with iron stand open during the day. Guard Captain Marcus and his men keep watch, checking those who enter and warning those who leave.",
        descriptionNight: "The gates are barred at night. Only the desperate or the foolish venture beyond the walls after dark.",
        npcs: ['guard_marcus'],
        exits: ['market_square'],
        entryEvents: [],
        ambientEvents: ['gates'],
        isStartLocation: false,
        isSafeZone: true,
        rules: { allowInventory: true, allowCharacterEdit: false, allowRest: false, allowShop: false, persistState: true }
    }
};

// ============================================
// MOVEMENT TEXT
// ============================================

export const MovementText = {
    'market_square_docks': [
        "You walk down the sloping street toward the harbor. The smell of salt grows stronger.",
        "Following the flow of cargo carts, you make your way to the docks."
    ],
    'docks_market_square': [
        "You climb the hill from the docks, leaving the salt air behind.",
        "The sounds of the harbor fade as you return to the bustling market."
    ],
    'market_square_tavern': [
        "You cross the square toward The Rusty Anchor. Warmth and laughter spill from the doorway.",
        "The tavern's sign creaks in the breeze as you approach."
    ],
    'tavern_market_square': [
        "You step out of The Rusty Anchor, blinking in the daylight.",
        "Leaving the tavern's warmth behind, you return to the busy market."
    ],
    'market_square_smith': [
        "You follow the ring of hammer on anvil to The Crossed Swords.",
        "Heat washes over you as you approach the smithy's open forge."
    ],
    'smith_market_square': [
        "You leave the heat of the forge behind and step into the cooler air.",
        "The hammer's rhythm fades as you walk back to the market."
    ],
    'market_square_temple': [
        "You climb the worn steps toward The Wounded Wing. Incense drifts through the doors.",
        "The temple rises ahead, its Triune symbol catching the light."
    ],
    'temple_market_square': [
        "You descend the temple steps, the sanctuary's peace fading into market noise.",
        "Leaving the incense and prayers behind, you return to the square."
    ],
    'market_square_guild_hall': [
        "You make your way to the Expedition Hall. Maps and contracts await.",
        "The guild's banner—a compass rose—flutters above the entrance."
    ],
    'guild_hall_market_square': [
        "You leave the hall, contracts and routes fresh in your mind.",
        "The bustle of the market replaces the quiet study of maps."
    ],
    'market_square_general_shop': [
        "You head toward the Outfitter's Guild, mentally cataloging your supplies.",
        "The shop's cluttered window displays catch your eye as you approach."
    ],
    'general_shop_market_square': [
        "Pack adjusted, you step back into the market square.",
        "You leave the shop behind, supplies in hand."
    ],
    'market_square_bank': [
        "You approach the Ironvault Depository. Guards eye you as you near.",
        "The bank's iron-banded doors loom ahead, solid and secure."
    ],
    'bank_market_square': [
        "You leave the bank's secure interior for the open square.",
        "The vault's heavy door closes behind you with a resonant thud."
    ],
    'market_square_library': [
        "You walk toward the Athenaeum, its ancient stones promising knowledge.",
        "The library's tall windows gleam with lamplight as you approach."
    ],
    'library_market_square': [
        "You step from the hushed library into the market's bustle.",
        "The weight of ancient knowledge lingers as you return to the square."
    ],
    'market_square_gates': [
        "You make your way toward the town gates, where guards stand watch.",
        "The gates rise ahead, the wilderness visible beyond."
    ],
    'gates_market_square': [
        "You turn back from the gates, returning to the town's heart.",
        "The guards nod as you head back toward the market."
    ],
    'default': [
        "You make your way to {destination}.",
        "You head toward {destination}."
    ]
};
// ============================================
// NPC DEFINITIONS
// ============================================

export const NPCs = {
    // MARKET SQUARE NPCs
    street_vendor: {
        id: 'street_vendor',
        name: 'Street Vendor',
        title: 'Traveling Merchant',
        icon: '🧑‍💼',
        location: 'market_square',
        approachText: 'You approach a weathered merchant selling odds and ends from a handcart...',
        sceneText: "The vendor's cart is piled with an eclectic mix of goods—trinkets, dried foods, and curiosities from distant lands.",
        greetings: [
            "Looking for something special? I've got wares from every corner of the world!",
            "Ah, a discerning eye! Come, see what treasures I've collected.",
            "Fresh off the boat from the Old World! Best prices in town!"
        ],
        dialogue: {
            root: {
                options: [
                    { id: 'wares', text: 'What are you selling?', next: 'showWares' },
                    { id: 'news', text: 'Any news from your travels?', next: 'travelNews' },
                    { id: 'farewell', text: 'Just browsing', action: 'leaveDialogue' }
                ]
            },
            showWares: {
                npcResponse: "Mostly small things—lucky charms, dried herbs, preserved foods. Nothing fancy, but useful for travelers.",
                options: [
                    { id: 'news', text: 'Heard any interesting news?', next: 'travelNews' },
                    { id: 'farewell', text: "I'll check the shops", action: 'leaveDialogue' }
                ]
            },
            travelNews: {
                npcResponse: "Word is the roads north have gotten dangerous. More creatures than usual prowling about. And there's talk of strange lights in the old ruins...",
                options: [
                    { id: 'farewell', text: 'Thanks for the warning', action: 'leaveDialogue' }
                ]
            }
        },
        farewells: ["Safe travels, friend!", "Come back if you change your mind!", "May your purse stay heavy!"]
    },
    
    town_crier: {
        id: 'town_crier',
        name: 'Town Crier',
        title: 'Herald',
        icon: '📢',
        location: 'market_square',
        approachText: 'You approach the town crier, who pauses his announcements...',
        sceneText: "A thin man in a faded blue coat stands on a small platform, a brass bell in one hand and a scroll in the other.",
        greetings: [
            "Hear ye, hear ye! Oh—a moment, citizen. What news do you seek?",
            "The morning announcements are done, but I can share what I know!",
            "Ah, someone with questions! Better than shouting to disinterested crowds."
        ],
        dialogue: {
            root: {
                options: [
                    { id: 'news', text: "What's the latest news?", next: 'latestNews' },
                    { id: 'bounties', text: 'Any bounties posted?', next: 'bountyInfo' },
                    { id: 'farewell', text: 'Carry on', action: 'leaveDialogue' }
                ]
            },
            latestNews: {
                npcResponse: "The Governor has extended tax relief for another season! Less blessed: wolf sightings near the eastern farms. The Expedition Hall is offering coin for pelts.",
                options: [
                    { id: 'farewell', text: 'Thanks for the update', action: 'leaveDialogue' }
                ]
            },
            bountyInfo: {
                npcResponse: "The Expedition Hall posts all official bounties. Guildmaster Vale handles those matters. I just announce them!",
                options: [
                    { id: 'farewell', text: "I'll check the Hall", action: 'leaveDialogue' }
                ]
            }
        },
        farewells: ["Stay informed, citizen!", "Hear ye, hear ye!", "Good day to you!"]
    },
    
    // DOCKS NPC
    harbormaster_gren: {
        id: 'harbormaster_gren',
        name: 'Harbormaster Gren',
        title: 'Port Authority',
        icon: '⚓',
        location: 'docks',
        approachText: "You approach the Harbormaster's office...",
        sceneText: "A weathered man with a salt-and-pepper beard sits behind a desk covered in manifests and shipping schedules.",
        greetings: [
            "Welcome to Eron's Landing! First time on the island, or returning?",
            "Harbormaster Gren, at your service. Ship business or just passing through?",
            "Mind your step on the docks—wet boards are treacherous."
        ],
        dialogue: {
            root: {
                options: [
                    { id: 'ships', text: 'When is the next ship to the mainland?', next: 'shipSchedule' },
                    { id: 'island', text: 'Tell me about this island', next: 'islandInfo' },
                    { id: 'farewell', text: 'Just looking around', action: 'leaveDialogue' }
                ]
            },
            shipSchedule: {
                npcResponse: "The *Silver Maiden* departs in three days, weather permitting. Passage isn't cheap—fifty gold for a berth. But I'd think twice about leaving. The island has plenty of opportunity.",
                options: [
                    { id: 'island', text: 'What kind of opportunity?', next: 'islandInfo' },
                    { id: 'farewell', text: "I'll keep that in mind", action: 'leaveDialogue' }
                ]
            },
            islandInfo: {
                npcResponse: "This island's been here since before the Shattering, but we've only been settling it for thirty years. Ruins everywhere, creatures in the wilds, and treasures waiting to be found.",
                options: [
                    { id: 'farewell', text: 'Sounds promising', action: 'leaveDialogue' }
                ]
            }
        },
        farewells: ["Fair winds to you!", "Watch your footing out there!", "The harbor's always open if you need passage."]
    },
    
    // TAVERN NPC
    marta_keelson: {
        id: 'marta_keelson',
        name: 'Marta Keelson',
        title: 'Tavern Keeper',
        icon: '🍺',
        location: 'tavern',
        shopId: null,
        approachText: 'You step up to the bar...',
        sceneText: "A sturdy woman with sun-weathered skin and knowing eyes works behind the bar. A faded sailor's tattoo peeks from beneath her sleeve.",
        greetings: [
            "New face in the Anchor! Welcome to Eron's Landing, stranger. I'm Marta—this is my place.",
            "Back again? Good—means you're still alive. The usual?",
            "Pull up a stool. You look like you could use a drink and maybe some advice."
        ],
        dialogue: {
            root: {
                options: [
                    { id: 'drink', text: 'I could use a drink', next: 'drinkMenu' },
                    { id: 'rumors', text: 'Heard any good rumors?', next: 'shareRumors' },
                    { id: 'about', text: 'Tell me about yourself', next: 'aboutMarta' },
                    { id: 'farewell', text: 'Just passing through', action: 'leaveDialogue' }
                ]
            },
            drinkMenu: {
                npcResponse: "Ale's a copper, wine's three, and if you want something stronger, that'll be five. I also serve a decent stew if you're hungry.",
                options: [
                    { id: 'rumors', text: 'What about information?', next: 'shareRumors' },
                    { id: 'farewell', text: "Just the drink, thanks", action: 'leaveDialogue' }
                ]
            },
            shareRumors: {
                npcResponse: "Rumors cost more than ale, but I'll give you one for free: the ruins to the north have been more active lately. Strange lights, odd sounds. Some expeditions don't come back.",
                options: [
                    { id: 'farewell', text: "I'll keep my eyes open", action: 'leaveDialogue' }
                ]
            },
            aboutMarta: {
                npcResponse: "Sailed with Captain Eron himself, back in the day. Helped found this town. When my knees got too creaky for deck work, I opened the Anchor. Thirty years of stories have walked through that door.",
                options: [
                    { id: 'farewell', text: 'Impressive history', action: 'leaveDialogue' }
                ]
            }
        },
        browsingComments: ["Take your time, plenty of seats.", "Holler if you need anything.", "The stew's fresh, if you're hungry."],
        farewells: ["Stay safe out there.", "The Anchor's always open.", "Come back with stories to tell!"]
    },
    
    // SMITH NPC
    torgin_ironhand: {
        id: 'torgin_ironhand',
        name: 'Torgin Ironhand',
        title: 'Master Smith',
        icon: '⚒️',
        location: 'smith',
        shopId: 'smith',
        approachText: "You approach the forge...",
        sceneText: "Heat radiates from the open forge. A burly dwarf looks up from his work, hammer in hand, appraising you with experienced eyes.",
        greetings: [
            "The forge is hot and ready. What can I craft for you?",
            "*wipes brow* Ah, another adventurer! Need something repaired? Upgraded?",
            "Steel and fire, that's my trade. Let's see what you've got."
        ],
        dialogue: {
            root: {
                options: [
                    { id: 'forge', text: 'I want to upgrade my gear', next: 'forgeExplain' },
                    { id: 'shop', text: 'Show me your wares', action: 'openShopBuy' },
                    { id: 'repair', text: 'I need repairs', next: 'repairInfo' },
                    { id: 'about', text: 'Tell me about yourself', next: 'aboutTorgin' },
                    { id: 'farewell', text: 'Just looking', action: 'leaveDialogue' }
                ]
            },
            forgeExplain: {
                npcResponse: "Aye, the forge burns hot! Bring me two items of the same type—sword and sword, helm and helm—and I'll merge them into something stronger. The higher the tier, the more it'll cost in gold and Aether crystals. Fair warning: there's always some risk with the higher upgrades.",
                options: [
                    { id: 'doForge', text: "Let's use the forge", action: 'openForgePanel' },
                    { id: 'howItWorks', text: 'How does it work exactly?', next: 'forgeDetails' },
                    { id: 'back', text: 'Maybe later', next: 'root' }
                ]
            },
            forgeDetails: {
                npcResponse: "Simple enough: the base item keeps its form while the material is consumed. If the material has better properties—finer steel, stronger enchantments—those might carry over. Success rates drop at higher tiers, and past tier 5, there's a chance of destruction. But risk brings reward, eh?",
                options: [
                    { id: 'doForge', text: "I understand. Let's forge!", action: 'openForgePanel' },
                    { id: 'back', text: "I'll think about it", next: 'root' }
                ]
            },
            repairInfo: {
                npcResponse: "*Coming soon* My repair services aren't quite ready yet. Check back later! For now, I can sell you quality gear or upgrade what you have at the forge.",
                options: [
                    { id: 'forge', text: 'Tell me about upgrades', next: 'forgeExplain' },
                    { id: 'shop', text: 'Show me your wares', action: 'openShopBuy' },
                    { id: 'farewell', text: "I'll come back", action: 'leaveDialogue' }
                ]
            },
            aboutTorgin: {
                npcResponse: "Torgin Ironhand, third generation smith. My grandfather forged for kings in the Old World. When the Shattering came, we lost everything—except our skills. And those skills? They're what make my forge the best on the island.",
                options: [
                    { id: 'forge', text: 'Show me what the forge can do', next: 'forgeExplain' },
                    { id: 'shop', text: 'Impressive. Show me your work.', action: 'openShopBuy' },
                    { id: 'farewell', text: 'Fine craftsmanship', action: 'leaveDialogue' }
                ]
            }
        },
        browsingComments: ["Take yer time, I ain't going nowhere.", "That piece has potential.", "Solid craftsmanship, if I say so myself."],
        purchaseReactions: ["Fine choice! That'll serve you well.", "Dwarven quality, that is!", "You've got good taste."],
        farewells: ["Keep that blade sharp, adventurer!", "May your armor hold true!", "The forge is always burning!"]
    },
    
    // TEMPLE NPC
    sister_elara: {
        id: 'sister_elara',
        name: 'Sister Elara',
        title: 'High Priestess',
        icon: '⛪',
        location: 'temple',
        shopId: null,
        approachText: 'You approach the altar...',
        sceneText: "Soft light filters through stained glass windows. A serene woman in white robes turns to greet you, her eyes kind but carrying a weight of concern.",
        greetings: [
            "The light welcomes you, child. How may I ease your burdens?",
            "Blessings upon you, traveler. The temple offers sanctuary to all.",
            "I sense weariness in your spirit. Perhaps healing would help?"
        ],
        dialogue: {
            root: {
                options: [
                    { id: 'heal', text: 'I need healing', action: 'openHealPanel' },
                    { id: 'bless', text: 'I seek a blessing', next: 'blessingInfo' },
                    { id: 'about', text: 'Tell me about the temple', next: 'aboutTemple' },
                    { id: 'farewell', text: 'Just seeking peace', action: 'leaveDialogue' }
                ]
            },
            blessingInfo: {
                npcResponse: "*Coming soon* The blessing rituals require preparation. Soon, child. For now, I can offer healing and sanctuary.",
                options: [
                    { id: 'heal', text: 'Healing would help', action: 'openHealPanel' },
                    { id: 'farewell', text: "I'll return", action: 'leaveDialogue' }
                ]
            },
            aboutTemple: {
                npcResponse: "The Wounded Wing has stood since the town's founding. We serve the Triune—three aspects of the divine: creation, preservation, and renewal.",
                options: [
                    { id: 'farewell', text: 'A peaceful place', action: 'leaveDialogue' }
                ]
            }
        },
        browsingComments: ["May the light guide your choice.", "Each blessing carries the temple's protection."],
        farewells: ["Go with the light, child.", "May your path be illuminated.", "The temple's doors are always open."]
    },
    
    // GUILD HALL NPC
    corvin_vale: {
        id: 'corvin_vale',
        name: 'Corvin Vale',
        title: 'Guildmaster',
        icon: '📋',
        location: 'guild_hall',
        approachText: "You approach the Guildmaster's desk...",
        sceneText: "A lean man with sharp features studies a map covered in pins. When he looks up, you see the calculating gaze of someone who weighs every risk.",
        greetings: [
            "Another adventurer. Good—we need capable people. Have a seat.",
            "The board's full of work if you're looking. Some of it might even let you come back alive.",
            "You've got the look of someone who can handle themselves. Let's talk business."
        ],
        dialogue: {
            root: {
                options: [
                    { id: 'bounties', text: "What's on the bounty board?", next: 'bountyInfo' },
                    { id: 'expeditions', text: 'Tell me about expeditions', next: 'expeditionInfo' },
                    { id: 'farewell', text: 'Just looking around', action: 'leaveDialogue' }
                ]
            },
            bountyInfo: {
                npcResponse: "*Coming soon* The bounty system is being reorganized. For now, explore the wilderness and bring back what you find.",
                options: [
                    { id: 'expeditions', text: 'What about expeditions?', next: 'expeditionInfo' },
                    { id: 'farewell', text: "I'll check back", action: 'leaveDialogue' }
                ]
            },
            expeditionInfo: {
                npcResponse: "We send teams into the wilderness to map territory, clear threats, and recover artifacts. Dangerous work, but the pay is good. Lately, though... we've been losing more people than usual.",
                options: [
                    { id: 'farewell', text: "I'll be careful", action: 'leaveDialogue' }
                ]
            }
        },
        farewells: ["Check back often. The board changes.", "Come back alive.", "Good hunting, adventurer."]
    },
    
    // GENERAL SHOP NPC
    quartermaster_venn: {
        id: 'quartermaster_venn',
        name: 'Quartermaster Venn',
        title: 'Supplies & Provisions',
        icon: '🏪',
        location: 'general_shop',
        shopId: 'town',
        approachText: 'You approach the counter...',
        sceneText: "A sharp-eyed woman in practical clothing stands behind a counter cluttered with ledgers. Every item in the shop seems catalogued in her mind.",
        greetings: [
            "Welcome to the Outfitter's Guild. Everything an adventurer needs, fairly priced.",
            "Looking to resupply? You've come to the right place.",
            "Potions, rations, equipment—name it, I probably have it."
        ],
        dialogue: {
            root: {
                options: [
                    { id: 'shop', text: 'Show me your stock', action: 'openShopBuy' },
                    { id: 'sell', text: 'I have items to sell', action: 'openShopSell' },
                    { id: 'advice', text: 'What should I bring into the wilds?', next: 'gearAdvice' },
                    { id: 'farewell', text: 'Just browsing', action: 'leaveDialogue' }
                ]
            },
            gearAdvice: {
                npcResponse: "Potions, always potions. Health and mana at minimum. A good weapon, obviously. And don't skimp on supplies—running out of torches in a dark ruin is a death sentence.",
                options: [
                    { id: 'shop', text: 'Good advice. Show me your potions.', action: 'openShopBuy' },
                    { id: 'farewell', text: "I'll keep that in mind", action: 'leaveDialogue' }
                ]
            }
        },
        browsingComments: ["Take your time, friend!", "That's a popular choice.", "Everything's priced fair.", "Those potions just came in fresh."],
        purchaseReactions: ["Excellent choice!", "You won't regret that purchase.", "A wise investment."],
        saleReactions: ["I can take that off your hands.", "Fair condition. Here's what I can offer.", "Always happy to buy from adventurers."],
        farewells: ["Safe travels! Come back anytime.", "May your supplies last!", "Good luck out there."]
    },
    
    // BANK NPC
    vault_master_dolgrim: {
        id: 'vault_master_dolgrim',
        name: 'Vault Master Dolgrim',
        title: 'Bank Manager',
        icon: '🏦',
        location: 'bank',
        approachText: 'You approach the bank counter...',
        sceneText: "Behind reinforced bars sits a meticulously groomed dwarf in formal attire. His desk is organized with mathematical precision.",
        greetings: [
            "Welcome to the Ironvault Depository. Your valuables will be safe here.",
            "Ah, a potential depositor. We offer the finest security in the region.",
            "State your business. Deposits, withdrawals, or vault services?"
        ],
        dialogue: {
            root: {
                options: [
                    { id: 'deposit_gold', text: 'I want to deposit or withdraw gold', action: 'openBankGold' },
                    { id: 'store_items', text: 'I want to access my vault', action: 'openBankVault' },
                    { id: 'expand_vault', text: 'I want to expand my vault', action: 'openBankExpand' },
                    { id: 'security', text: 'How secure is this place?', next: 'securityInfo' },
                    { id: 'farewell', text: "I'll think about it", action: 'leaveDialogue' }
                ]
            },
            securityInfo: {
                npcResponse: "Dwarven engineering and elven enchantments working in harmony. The vault doors are three feet of solid adamantine. Nothing gets in—or out—without authorization.",
                options: [
                    { id: 'deposit_gold', text: 'That sounds safe enough. Let me access my gold.', action: 'openBankGold' },
                    { id: 'store_items', text: 'Good. I have items to store.', action: 'openBankVault' },
                    { id: 'farewell', text: 'Impressive. I may return.', action: 'leaveDialogue' }
                ]
            }
        },
        browsingComments: [
            "Take your time. Your valuables aren't going anywhere.",
            "A wise decision, storing with us.",
            "Every coin is counted and catalogued.",
            "Security is not just our business—it is our way of life."
        ],
        depositReactions: [
            "*counts coins with practiced precision* Deposited and secured.",
            "*nods approvingly* Your gold is now protected by dwarven engineering.",
            "A wise decision. Your wealth grows safer by the day."
        ],
        withdrawReactions: [
            "*retrieves coins carefully* Exactly as deposited.",
            "Your gold, not a piece missing. We do not touch what is not ours.",
            "*slides coins across the counter* Spend it wisely."
        ],
        farewells: [
            "Your business is appreciated.",
            "Security and trust. That is the dwarven way.",
            "May your fortunes grow—and may we keep them safe."
        ]
    },
    
    // LIBRARY NPC
    theron_ashvale: {
        id: 'theron_ashvale',
        name: 'Lorekeeper Theron',
        title: 'Scholar',
        icon: '📚',
        location: 'library',
        approachText: "You approach the scholar's desk...",
        sceneText: "An elderly elf sits surrounded by towering stacks of books. His eyes, ancient and knowing, look up from a weathered tome.",
        greetings: [
            "Ah, a seeker of knowledge. The Athenaeum welcomes you.",
            "Few visit the library these days. What wisdom do you seek?",
            "Books don't lie, though they sometimes hide their truths. How may I help?"
        ],
        dialogue: {
            root: {
                options: [
                    { id: 'research', text: 'I need to research something', next: 'researchInfo' },
                    { id: 'island', text: 'What do you know about this island?', next: 'islandLore' },
                    { id: 'shattering', text: 'Tell me about the Shattering', next: 'shatteringLore' },
                    { id: 'farewell', text: 'Just browsing', action: 'leaveDialogue' }
                ]
            },
            researchInfo: {
                npcResponse: "*Coming soon* The research archives are being reorganized. Soon I'll be able to help you identify magical items and uncover lost knowledge.",
                options: [
                    { id: 'island', text: 'What about the island?', next: 'islandLore' },
                    { id: 'farewell', text: "I'll return", action: 'leaveDialogue' }
                ]
            },
            islandLore: {
                npcResponse: "This island existed before the Shattering, home to a civilization we barely understand. Their ruins dot the landscape, filled with wonders and dangers.",
                options: [
                    { id: 'farewell', text: 'Fascinating', action: 'leaveDialogue' }
                ]
            },
            shatteringLore: {
                npcResponse: "One hundred years ago, magic itself went mad. Continents cracked, seas boiled, the sky burned for three days. When it ended, the world was forever changed.",
                options: [
                    { id: 'farewell', text: 'Heavy history', action: 'leaveDialogue' }
                ]
            }
        },
        farewells: ["Knowledge is the greatest treasure.", "May your questions find answers.", "The library is always open to seekers."]
    },
    
    // GATES NPC
    guard_marcus: {
        id: 'guard_marcus',
        name: 'Guard Captain Marcus',
        title: 'Town Guard',
        icon: '🛡️',
        location: 'gates',
        approachText: 'You approach the guard captain...',
        sceneText: "A weathered soldier in well-maintained armor stands at attention near the gates. His eyes constantly scan the road, watching for trouble.",
        greetings: [
            "Hold. State your business beyond the gates.",
            "Heading out? Make sure you're prepared. It's dangerous beyond the walls.",
            "The gates close at sunset. Don't be caught outside after dark."
        ],
        dialogue: {
            root: {
                options: [
                    { id: 'beyond', text: "What's out there?", next: 'beyondGates' },
                    { id: 'threats', text: 'Any current threats?', next: 'threatInfo' },
                    { id: 'farewell', text: "I'm just looking around", action: 'leaveDialogue' }
                ]
            },
            beyondGates: {
                npcResponse: "Wilderness. Forests, hills, ruins. Creatures that'll eat you soon as look at you. But also opportunity—resources, artifacts, glory.",
                options: [
                    { id: 'threats', text: 'Any specific dangers?', next: 'threatInfo' },
                    { id: 'farewell', text: "I'll be careful", action: 'leaveDialogue' }
                ]
            },
            threatInfo: {
                npcResponse: "Wolves to the east, more aggressive than usual. Reports of goblin activity in the old mines. And the ruins... just be careful in the ruins. Things have been stirring.",
                options: [
                    { id: 'farewell', text: 'Thanks for the warning', action: 'leaveDialogue' }
                ]
            }
        },
        farewells: ["Stay sharp out there.", "The gates close at sunset. Remember that.", "Come back in one piece."]
    },
    
    // LEGACY NPCs (backward compatibility)
    shopkeeper: {
        id: 'shopkeeper',
        name: 'Quartermaster Venn',
        title: 'General Goods',
        icon: '🏪',
        shopId: 'town',
        approachText: 'You approach the general store...',
        sceneText: "Shelves lined with potions, scrolls, and sundries fill the cozy shop.",
        greetings: [
            "Welcome to the Outfitter's Guild. Everything an adventurer needs, fairly priced.",
            "Looking to resupply? You've come to the right place.",
            "We stock quality goods. What do you need?"
        ],
        dialogue: {
            root: {
                options: [
                    { id: 'browse', text: 'Show me your wares', action: 'openShopBuy' },
                    { id: 'sell', text: "I'd like to sell some things", action: 'openShopSell' },
                    { id: 'farewell', text: 'Farewell', action: 'leaveDialogue' }
                ]
            }
        },
        browsingComments: ["Take your time, friend!", "That's a fine choice.", "Everything's priced fair!"],
        purchaseReactions: ["Excellent choice!", "You won't regret that purchase!"],
        saleReactions: ["I can take that off your hands.", "Fair condition."],
        farewells: ["Safe travels, friend!", "May your purse stay full!", "Until next time!"]
    },
    
    blacksmith: {
        id: 'blacksmith',
        name: 'Torgin Ironhand',
        title: 'Arms & Armor',
        icon: '⚒️',
        shopId: null,
        approachText: "You approach the blacksmith's forge...",
        sceneText: "Heat radiates from the open forge. A burly dwarf looks up from his work, hammer in hand.",
        greetings: [
            "The forge is hot and ready. What can I craft for you?",
            "*wipes brow* Ah, another adventurer! Need something upgraded?",
            "Steel and fire, that's my trade."
        ],
        dialogue: {
            root: {
                options: [
                    { id: 'forge', text: 'I want to upgrade my gear', next: 'forgeExplain' },
                    { id: 'farewell', text: 'Farewell', action: 'leaveDialogue' }
                ]
            },
            forgeExplain: {
                npcResponse: "Aye, the forge burns hot! Bring me two items of the same type—sword and sword, helm and helm—and I'll merge them into something stronger. Costs gold and Aether for the higher tiers. Fair warning: there's risk involved with powerful upgrades.",
                options: [
                    { id: 'doForge', text: "Let's use the forge", action: 'openForgePanel' },
                    { id: 'howItWorks', text: 'Tell me more', next: 'forgeDetails' },
                    { id: 'farewell', text: 'Maybe later', action: 'leaveDialogue' }
                ]
            },
            forgeDetails: {
                npcResponse: "The base item keeps its form while the material is consumed. Better materials might carry their properties over. Success rates drop at higher tiers, and past tier 5, there's a chance of destruction. But risk brings reward!",
                options: [
                    { id: 'doForge', text: "I understand. Let's forge!", action: 'openForgePanel' },
                    { id: 'farewell', text: "I'll think about it", action: 'leaveDialogue' }
                ]
            }
        },
        browsingComments: ["Take yer time.", "That piece has potential."],
        farewells: ["Keep that blade sharp!", "May your armor hold true!"]
    },
    
    priest: {
        id: 'priest',
        name: 'Sister Elara',
        title: 'Temple of Light',
        icon: '⛪',
        shopId: null,
        approachText: 'You enter the Temple of Light...',
        sceneText: "Soft light filters through stained glass windows. A serene woman in white robes turns to greet you.",
        greetings: [
            "The light welcomes you, child. How may I ease your burdens?",
            "Blessings upon you, traveler.",
            "I sense weariness in your spirit."
        ],
        dialogue: {
            root: {
                options: [
                    { id: 'heal', text: 'Can you heal my wounds?', action: 'openHealPanel' },
                    { id: 'farewell', text: 'I must go', action: 'leaveDialogue' }
                ]
            }
        },
        browsingComments: ["May the light guide your choice."],
        farewells: ["Go with the light, child.", "May your path be illuminated."]
    }
};
// ============================================
// NARRATIVE TEXT POOLS
// ============================================

export const LookText = {
    market_square: [
        "The town square bustles with activity. Merchants hawk their wares, children chase each other around the fountain.",
        "Sunlight filters through the clouds, casting long shadows across the cobblestones.",
        "You take in your surroundings. The temple's spire rises above the rooftops. Smoke billows from the smithy's forge."
    ],
    docks: [
        "Ships bob at anchor, their masts creaking in the breeze. Dockworkers haul crates while sailors mend sails.",
        "The smell of salt and fish fills the air. Gulls wheel overhead, crying out as they hunt for scraps.",
        "You watch a ship from the Old World unload its cargo—crates of supplies and the occasional artifact."
    ],
    tavern: [
        "The tavern is warm and inviting. A fire crackles in the hearth, and the smell of cooking food makes your stomach growl.",
        "Adventurers of all types fill the tables—warriors comparing scars, mages debating arcane theory.",
        "Marta works behind the bar with practiced efficiency, somehow keeping track of a dozen conversations at once."
    ],
    smith: [
        "Heat radiates from the forge. Weapons and armor line the walls, each piece a testament to dwarven craftsmanship.",
        "The ring of hammer on anvil fills the air. Sparks fly as Torgin shapes hot metal with practiced strikes.",
        "You examine the weapons on display—swords, axes, maces. Each one balanced and deadly."
    ],
    temple: [
        "Candlelight flickers across the stone walls. The air is thick with incense, and soft hymns echo from somewhere deeper.",
        "The Triune symbol dominates the altar—three interlocking circles representing the divine trinity.",
        "A few worshippers kneel in prayer. Sister Elara moves among them, offering comfort and blessings."
    ],
    guild_hall: [
        "Maps cover every surface, marked with routes, dangers, and points of interest. This is where expeditions are planned.",
        "The bounty board dominates one wall, covered in contracts ranging from pest control to dangerous artifact retrieval.",
        "Adventurers cluster around tables, planning their next expeditions or nursing drinks after returning."
    ],
    general_shop: [
        "Shelves overflow with supplies—potions, rations, rope, torches, and countless other necessities.",
        "Everything is organized with meticulous precision. Venn runs a tight ship.",
        "You spot health potions, mana restoratives, and various tools. Everything an adventurer might need."
    ],
    bank: [
        "Stone walls and iron bars speak of security. This place was built to protect wealth.",
        "A few customers conduct business at the counter, their voices hushed in the solemn atmosphere.",
        "You can feel the weight of the vault's protections—both physical and magical."
    ],
    library: [
        "Towering shelves reach toward the vaulted ceiling, crammed with books, scrolls, and manuscripts.",
        "Dust motes dance in shafts of light. The smell of old paper and leather bindings fills the air.",
        "Theron sits surrounded by stacks of texts, ageless eyes scanning pages written in a dozen languages."
    ],
    gates: [
        "The massive wooden gates stand open, guarded by watchful soldiers. Beyond lies the wilderness.",
        "You can see the road stretching into the distance, disappearing into forests and hills.",
        "Guards check those entering and warn those leaving. The wilderness beyond is not to be underestimated."
    ],
    shopkeeper: [
        "The shop is filled with interesting wares. Potions of various colors line one shelf, while supplies occupy another."
    ],
    blacksmith: [
        "Weapons and armor of all kinds line the walls—swords, axes, shields, helms. Each piece is clearly well-crafted."
    ],
    priest: [
        "The temple's interior is peaceful. Stained glass windows depict scenes of healing and hope."
    ]
};

export const Rumors = {
    tavern: [
        "💬 A drunk patron mutters about 'shadows in the old ruins that move when you're not looking.'",
        "💬 You overhear merchants discussing increased goblin activity near the eastern trade routes.",
        "💬 'The Lorekeeper's been acting strange,' someone whispers. 'Says he's found references to something that shouldn't exist.'",
        "💬 A grizzled veteran warns a young adventurer: 'The Sunken Temple claims all who enter. Don't be foolish.'",
        "💬 Two merchants argue about whether the strange lights in the northern ruins are treasure or trap."
    ],
    market_square: [
        "💬 A merchant complains about delayed shipments. 'Ships keep getting turned back by strange weather,' he says.",
        "💬 You catch fragments of conversation: '...three expeditions lost this month alone...'",
        "💬 'The wolves aren't natural,' a farmer insists. 'Something's driving them down from the mountains.'"
    ]
};

export const RestText = {
    tavern: [
        "🛏️ You find a quiet corner and rest your weary bones. The fire crackles softly.",
        "🛏️ You take a moment to relax. The sounds of the tavern fade into a comfortable murmur.",
        "🛏️ A brief rest restores your energy. You feel ready to face what comes next."
    ],
    temple: [
        "🛏️ You kneel in prayer, and a sense of peace washes over you.",
        "🛏️ The temple's tranquility seeps into your tired muscles. You feel renewed.",
        "🛏️ In the sanctuary's quiet, you find a moment of rest and reflection."
    ],
    market_square: [
        "🛏️ You find a bench by the fountain and take a brief rest.",
        "🛏️ Leaning against a pillar, you catch your breath and gather your thoughts.",
        "🛏️ The bustle of the market continues around you as you take a moment to rest."
    ]
};

export const AmbientEvents = {
    market_square: [
        "✦ A merchant's cart rumbles past, loaded with goods from the docks ✦",
        "✦ Children run through the square, laughing and playing ✦",
        "✦ The town crier's bell rings in the distance ✦",
        "✦ A group of adventurers marches toward the gates, gear clinking ✦",
        "✦ You catch the scent of fresh bread from a nearby bakery ✦",
        "✦ A cat stretches lazily in a patch of sunlight ✦",
        "✦ Somewhere nearby, a bard plays a cheerful tune ✦",
        // NEW v2.4.0 - Housing-related ambient events
        "✦ You glance toward the residential quarter—smoke rises from cottage chimneys ✦",
        "✦ A carpenter carries lumber toward the housing district ✦",
        "✦ You hear distant hammering from someone's home improvements ✦"
    ],
    docks: [
        "✦ Gulls wheel and cry overhead, searching for scraps ✦",
        "✦ A ship's bell rings as cargo is lowered to the pier ✦",
        "✦ Sailors share stories and songs as they work ✦",
        "✦ The smell of salt and tar fills the air ✦",
        "✦ A fishing boat returns, its nets heavy with the day's catch ✦"
    ],
    tavern: [
        "✦ Someone starts a drinking song, and others quickly join in ✦",
        "✦ Dice clatter across a table as gamblers test their luck ✦",
        "✦ The fire pops and crackles, sending sparks up the chimney ✦",
        "✦ Marta calls out an order to the kitchen ✦",
        "✦ An adventurer regales listeners with tales of narrow escapes ✦",
        "✦ The tavern door swings open as a traveler stumbles in from the road ✦"
    ],
    smith: [
        "✦ Sparks fly as Torgin hammers a glowing blade ✦",
        "✦ The bellows wheeze as the forge fire roars higher ✦",
        "✦ A customer tests the balance of a newly forged sword ✦",
        "✦ The smell of hot metal and coal fills your nostrils ✦",
        "✦ Torgin mutters dwarven curses at a stubborn piece of iron ✦"
    ],
    temple: [
        "✦ Soft hymns drift through the air from an unseen choir ✦",
        "✦ Candle flames dance in an unfelt breeze ✦",
        "✦ A wounded traveler limps in, seeking the priestess's aid ✦",
        "✦ The incense seems to glow faintly in the candlelight ✦",
        "✦ You feel a sense of peace wash over you ✦"
    ],
    guild_hall: [
        "✦ Adventurers argue over the best route through the wilderness ✦",
        "✦ Someone pins a new contract to the bounty board ✦",
        "✦ Guildmaster Vale studies a report with a furrowed brow ✦",
        "✦ A returning expedition files their report, voices weary ✦"
    ],
    general_shop: [
        "✦ Venn marks something in her ever-present ledger ✦",
        "✦ A customer carefully examines a potion's label ✦",
        "✦ Shelves creak under the weight of supplies ✦"
    ],
    bank: [
        "✦ A clerk counts coins with practiced efficiency ✦",
        "✦ The vault's protective wards hum faintly ✦",
        "✦ Someone conducts business in hushed tones ✦"
    ],
    library: [
        "✦ Pages rustle as Theron turns to a new chapter ✦",
        "✦ Dust motes dance in a shaft of light ✦",
        "✦ Somewhere in the stacks, a book falls with a soft thump ✦"
    ],
    gates: [
        "✦ A guard calls out a challenge to approaching travelers ✦",
        "✦ The gates creak slightly in the wind ✦",
        "✦ An adventurer departs through the gates, heading into the wilds ✦"
    ]
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getRandomText(array) {
    if (!array || array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
}

export function getLocation(locationId) {
    return Locations[locationId] || null;
}

/**
 * Get MUD actions for a context, including location NPCs as buttons
 * @param {string} context - Location ID or 'npc_dialogue'
 * @param {string|null} currentNPC - Current NPC ID if in dialogue
 * @returns {Array} Action definitions including NPC buttons
 */
export function getMudActions(context, currentNPC = null) {
    // If in dialogue, use simplified dialogue actions
    if (currentNPC) {
        return MudActions.npc_dialogue || MudActions.town;
    }
    
    // Get base actions for the location
    const baseActions = MudActions[context] || MudActions.town;
    
    // Get NPCs for this location and append them as action buttons
    const npcButtons = getLocationNPCButtons(context);
    
    // Return combined actions + NPC buttons
    return [...baseActions, ...npcButtons];
}

/**
 * Get NPC buttons for a location to display in action bar
 */
export function getLocationNPCButtons(locationId) {
    const location = Locations[locationId];
    if (!location || !location.npcs || location.npcs.length === 0) {
        return [];
    }
    
    return location.npcs.map(npcId => {
        const npc = NPCs[npcId];
        if (!npc) return null;
        
        return {
            id: `npc_${npcId}`,
            label: npc.name.split(' ')[0], // First name only for button
            icon: npc.icon,
            isNPC: true,
            npcId: npcId
        };
    }).filter(Boolean);
}

/**
 * Get NPCs for a location
 */
export function getLocationNPCs(locationId) {
    const location = Locations[locationId];
    if (!location || !location.npcs) return [];
    return location.npcs.map(npcId => NPCs[npcId]).filter(Boolean);
}

/**
 * Get action bar label for a context
 */
export function getActionBarLabel(context, currentNPC = null) {
    if (currentNPC) {
        const npc = NPCs[currentNPC];
        return npc ? `Talking to ${npc.name}` : 'Talking';
    }
    return ActionBarLabels[context] || 'Actions';
}

export function getNPC(npcId) {
    return NPCs[npcId] || null;
}

export function getNPCGreeting(npcId) {
    const npc = NPCs[npcId];
    if (!npc) return null;
    return {
        name: npc.name,
        greeting: getRandomText(npc.greetings)
    };
}

export function getDialogueNode(npcId, nodeId = 'root') {
    const npc = NPCs[npcId];
    if (!npc || !npc.dialogue) return null;
    return npc.dialogue[nodeId] || null;
}

export function getNPCBrowsingComment(npcId) {
    const npc = NPCs[npcId];
    if (!npc || !npc.browsingComments) return null;
    return getRandomText(npc.browsingComments);
}

export function getNPCPurchaseReaction(npcId) {
    const npc = NPCs[npcId];
    if (!npc || !npc.purchaseReactions) return null;
    return getRandomText(npc.purchaseReactions);
}

export function getNPCSaleReaction(npcId) {
    const npc = NPCs[npcId];
    if (!npc || !npc.saleReactions) return null;
    return getRandomText(npc.saleReactions);
}

export function getNPCFarewell(npcId) {
    const npc = NPCs[npcId];
    if (!npc || !npc.farewells) return null;
    return getRandomText(npc.farewells);
}

export function getRandomRumor(locationId) {
    const rumors = Rumors[locationId] || Rumors['tavern'];
    return getRandomText(rumors);
}

export function getRandomLookText(contextId) {
    const lookTexts = LookText[contextId];
    return getRandomText(lookTexts);
}

export function getRandomAmbientEvent(locationId) {
    const events = AmbientEvents[locationId] || AmbientEvents['market_square'];
    return getRandomText(events);
}

export function getMovementText(fromId, toId) {
    const key = `${fromId}_${toId}`;
    const textOptions = MovementText[key] || MovementText['default'];
    const text = getRandomText(textOptions);
    const destination = Locations[toId];
    return text.replace('{destination}', destination?.name || toId);
}

export function getLocationExits(locationId) {
    const location = Locations[locationId];
    if (!location || !location.exits) return [];
    return location.exits.map(exitId => Locations[exitId]).filter(Boolean);
}

export function getRandomRestText(locationId) {
    const restTexts = RestText[locationId] || RestText['market_square'];
    return getRandomText(restTexts);
}

export default {
    MudSettings,
    TextEntryTypes,
    MUD_TEXT_CONFIG,
    DisplayPrefsDefaults,
    MudActions,
    ActionBarLabels,
    MainNavButtons,
    Locations,
    MovementText,
    NPCs,
    LookText,
    Rumors,
    RestText,
    AmbientEvents,
    getRandomText,
    getLocation,
    getMudActions,
    getLocationNPCButtons,
    getLocationNPCs,
    getActionBarLabel,
    getNPC,
    getNPCGreeting,
    getDialogueNode,
    getNPCBrowsingComment,
    getNPCPurchaseReaction,
    getNPCSaleReaction,
    getNPCFarewell,
    getRandomRumor,
    getRandomLookText,
    getRandomAmbientEvent,
    getMovementText,
    getLocationExits,
    getRandomRestText
};
