/**
 * @file housingStaffConfig.js
 * @description Configuration for the household staff system — all 7 hireable NPCs
 *              with costs, buffs, ambient text pools, dialogue trees (3 trust tiers),
 *              and lore hooks that connect to major story threads.
 *
 * @usage Imported by HousingStaffSystem.js for runtime logic.
 *        Imported by HousingStaffPanel.js for display.
 *        Imported by HousingScreen.js for ambient event text.
 * @dependencies None (pure configuration)
 *
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2026-03-05): Initial implementation. 7 staff NPCs with full
 *                          dialogue trees, ambient text, trust system, and
 *                          story-thread lore hooks.
 */

// ===========================================
// STAFF SYSTEM SETTINGS
// ===========================================
export const StaffSettings = {
    payIntervalMs:      86400000,  // 24 hours in ms — deduct daily wages
    wanderChance:       0.15,      // 15% — NPC appears in unexpected room
    staffAmbientWeight: 0.20,      // 20% of ambient ticks go to staff events
    ambientMinDelay:    10000,     // 10s minimum between staff ambient events
    ambientMaxDelay:    25000,     // 25s maximum between staff ambient events
    trustTier1Days:     7,         // Days employed to reach Tier 1 (Familiar)
    trustTier2Days:     14,        // Days employed to reach Tier 2 (Trusted) + lore hook
    npcPresenceDuration: 45000,    // 45s — how long NPC "presence" persists in action bar
    maxDialogueTopics:  4,         // Topics shown in Ask About menu
};

// ===========================================
// UPGRADE TIME TIERS
// Build time by structure level bracket
// ===========================================
export const UpgradeTimeTiers = [
    { minLevel: 0,   maxLevel: 4,   durationMs:        60000, label: '1 minute',  tier: 1 },
    { minLevel: 5,   maxLevel: 14,  durationMs:       900000, label: '15 minutes', tier: 2 },
    { minLevel: 15,  maxLevel: 29,  durationMs:      3600000, label: '1 hour',     tier: 3 },
    { minLevel: 30,  maxLevel: 49,  durationMs:     21600000, label: '6 hours',    tier: 4 },
    { minLevel: 50,  maxLevel: 74,  durationMs:     86400000, label: '24 hours',   tier: 5 },
    { minLevel: 75,  maxLevel: 999, durationMs:    259200000, label: '3 days',     tier: 6 },
];

// ===========================================
// STAFF BUFF LABELS
// Display names for staff-specific buff types
// (merges with existing BuffLabels in housingConfig.js)
// ===========================================
export const StaffBuffLabels = {
    hpRegen:         'HP Regen',
    offlineXp:       'Offline XP',
    herbProduction:  'Herbs/Hour',
    materialDrops:   'Material Drops',
    equipmentStats:  'Equipment Stats',
    reforgeDiscount: 'Reforge Cost',
    goldFind:        'Gold Find',
    blessingDuration:'Blessing Duration',
    critChance:      'Crit Chance',
};

// ===========================================
// STAFF DEFINITIONS
// ===========================================
export const HousingStaff = {

    // -------------------------------------------
    roslin: {
        id:          'roslin',
        name:        'Roslin Darby',
        title:       'Maid',
        icon:        '🧹',
        race:        'Human',
        homeRoom:    'hearth',
        minRoomLevel: 5,
        dailyCost:   50,
        description: 'Compact and efficient, always with a kerchief in her hair. Quick eyes that miss nothing.',
        hireText:    'Roslin Darby looks your home over with an evaluating eye, noting several things that clearly displease her. "Right," she says, already rolling up her sleeves. "I work mornings to midday. I don\'t do windows above the second storey, and I expect you to put things back where you found them." She fixes you with a look. "I\'ve had three employers before. All three are very happy with my discretion."',
        fireText:    'Roslin gathers her things with practiced efficiency. She pauses at the door. "You\'ll notice things once I\'m gone," she says. Not a threat — a simple statement of fact. She nods once and steps out into the day.',
        buffs: {
            offlineXp: 5,
        },
        roomAmbientTexts: [
            'Roslin moves through the main hall with quiet efficiency, straightening things only she noticed were crooked.',
            'You catch a glimpse of Roslin polishing the mantle with something that smells of lemon and beeswax. She doesn\'t look up.',
            'The sound of Roslin beating dust from a cushion echoes through the house — three measured strokes, always three.',
            'Roslin pauses in the doorway, surveying the room with the expression of someone composing a list.',
            'She has laid out fresh linens without being asked. This is the third time this week.',
            'Roslin sets a small clay pot on the windowsill — wildflowers, carefully arranged. "Makes the air better," she says without explanation.',
            'You hear Roslin humming quietly to herself as she works. It\'s a melody you don\'t recognize — old, somehow.',
            'A kettle appears on the hook by the fire. Roslin is nowhere to be seen, but the water is already hot.',
        ],
        wanderAmbientTexts: [
            'Roslin has somehow found her way here. She\'s cleaning something that you didn\'t know needed cleaning.',
            'You find Roslin standing very still near the entrance, listening. She turns and gives you a perfectly ordinary smile. "Just checking for drafts," she says.',
            'Roslin passes through with an armload of folded cloth, navigating around you with practiced ease.',
        ],
        dialogueTopics: {
            work: {
                label: 'Her work',
                icon: '🧹',
                responses: [
                    'I do what\'s needed. That\'s all there is to it.',
                    'I learned from my mother. She kept house for a minor lord — three stories, twelve rooms, two hounds, and a master with terrible aim. This is easy by comparison.',
                    'I\'ve worked for people whose business I did not know and did not ask about. That\'s still my rule. Though I will say — your housekeeping is better than some lords I\'ve served. That\'s not nothing.',
                ],
            },
            town: {
                label: 'The town',
                icon: '🏘️',
                responses: [
                    'I don\'t spend much time in the market. I have what I need.',
                    'Marta at the Rusty Anchor buys eggs from the same woman I do. We nod to each other. That\'s the extent of my social life and I\'m content with it.',
                    'That banker — Dolgrim. I\'ve seen him twice near the house. Not passing through. Watching. Thought you should know. May be nothing.',
                ],
            },
            past: {
                label: 'Her past',
                icon: '📖',
                responses: [
                    'I\'ve lived in a few places. This one suits me.',
                    'I had a family, once. I don\'t speak of it. Not grief — just mine, is all.',
                    'I came here on the third wave of ships. There\'s something here worth the trouble. Haven\'t figured out what yet.',
                ],
            },
            house: {
                label: 'The house',
                icon: '🏠',
                responses: [
                    'It needs work. Which is why you hired me, I assume.',
                    'There\'s something behind the south wall of the main hall that creaks when the wind\'s from the north. Probably nothing. I\'d rather know what it is.',
                    'I found some marks carved low on the hearthstone. Old — before you settled here. Looked like survey markings, but not in any language I know.',
                ],
            },
        },
        loreHook: {
            triggerText: 'Roslin is dusting the mantle when she stops, holding something small between two fingers. She turns to show you — a coin, old and unfamiliar, wedged in a gap in the stonework. "Found this behind the hearthstone," she says. "The symbol on it — I\'ve seen it before. In a book at the Athenaeum. They had a whole locked case of things with that symbol." She sets it on the mantle and goes back to dusting. "Thought you\'d want to know."',
            threadTag:   '[A thread stirs: The Coin in the Hearthstone — see Lorekeeper Theron Ashvale]',
            storyThread: 'lost_civilization',
            flagKey:     'roslin_lore_revealed',
        },
    },

    // -------------------------------------------
    sven: {
        id:          'sven',
        name:        'Sven Halloway',
        title:       'Cook',
        icon:        '👨‍🍳',
        race:        'Human',
        homeRoom:    'hearth',
        minRoomLevel: 15,
        dailyCost:   75,
        description: 'Broad-shouldered, weathered. A long scar on his left forearm he doesn\'t explain. Speaks rarely but precisely.',
        hireText:    'Sven Halloway wipes his hands on his apron and extends one. His grip is a working man\'s grip. "I keep my own hours and run my own kitchen," he says. "I don\'t water the soup and I don\'t answer questions about where I came from. The food will be good and it will be ready when it\'s ready." He looks at the hearth. "That\'ll do."',
        fireText:    'Sven gives a single nod and begins gathering his knives — a set of them, wrapped carefully in oiled cloth. He pauses at the door. "It was good work," he says quietly. He doesn\'t look back. The kitchen will smell like him for a week.',
        buffs: {
            hpRegen: 8,
        },
        roomAmbientTexts: [
            'Something is simmering on the fire. The smell alone is enough to make your shoulders unknot.',
            'Sven is methodically sharpening a knife with long, practiced strokes. He doesn\'t acknowledge your presence.',
            'The morning bread is cooling on the hook by the fire. Sven has already moved on to whatever comes next.',
            'You find Sven standing at the fire, staring into it. He doesn\'t move for a long moment. Then he stirs the pot and goes back to work.',
            'The kitchen is impeccably clean. Sven believes cleanliness in a kitchen is a moral position.',
            'Sven is murmuring something very quietly while he works. Not singing — something almost like a rote prayer, in a language you don\'t know.',
            'A bowl has been set aside for you, covered with a cloth to keep it warm. No note.',
            'Sven is grinding spices, filling the room with a warm, complicated smell. "From the market," he says without looking up. "Worth the price."',
        ],
        wanderAmbientTexts: [
            'Sven is here, looking out the window at the treeline. He hears you approach and turns back without comment.',
            'You find Sven sitting with his hands around a cup of something hot, not drinking. Just sitting.',
            'Sven moves through checking the walls for damp. He taps the stone twice, grunts, and moves on.',
        ],
        dialogueTopics: {
            cooking: {
                label: 'His cooking',
                icon: '🍲',
                responses: [
                    'Good food is honest work. There\'s nothing more to say about it.',
                    'I learned from a woman in my mother\'s village. She could make a meal out of nothing — bark, roots, old bones. I learned what that meant later. When there was nothing.',
                    'There was a dish my mother made. I\'ve tried to recreate it for twenty years. Never quite right. The spice she used — I think it only grew in Ashen Ford, and Ashen Ford is gone now.',
                ],
            },
            oldworld: {
                label: 'The Old World',
                icon: '🌊',
                responses: [
                    'There\'s things I don\'t talk about.',
                    'I left because I had to. Most folk here did. Don\'t mistake that for being the same story.',
                    'Ashen Ford was three days east of where I grew up. I heard the sky was red for a week. They said it was the orcs — but orcs don\'t leave ash without bones. Something else was there first.',
                ],
            },
            war: {
                label: 'The war',
                icon: '⚔️',
                responses: [
                    'Not my war. Not anymore.',
                    'I knew men who fought at Thornwall. Most of them weren\'t good men. That doesn\'t mean they deserved what happened to them.',
                    'The war is just the thing people see. It\'s loud and it has a shape. The thing underneath it — that has no shape. That\'s the thing that worries me.',
                ],
            },
            town: {
                label: 'The town',
                icon: '🏘️',
                responses: [
                    'It\'ll do. Colder than I expected.',
                    'The Rusty Anchor has decent ale. Marta runs a fair place. I buy from the market on Tuesdays.',
                    'There\'s a man at the docks who was at Thornwall. I recognized him. He recognized me. We said nothing. Some histories you let sleep.',
                ],
            },
        },
        loreHook: {
            triggerText: 'Sven is quiet for a long moment after you find him at the fire at an odd hour. Finally: "You\'ll hear it eventually. Ashen Ford — whole village, gone in a night. Everyone said it was the orcish raids. Corvin Vale at the guild hall recorded it that way in the ledgers." He turns the cup in his hands. "I knew people there. I went back, after. No bodies. No marks on the walls. Just ash and an old smell I\'d smelled once before, underground, in a place I was told never to speak about." He stands. "Something sleeps under this world. I\'ve seen the place where it dreams."',
            threadTag:   '[A new thread stirs: The Burning of Ashen Ford — something beneath the war]',
            storyThread: 'sleeping_darkness',
            flagKey:     'sven_lore_revealed',
        },
    },

    // -------------------------------------------
    willem: {
        id:          'willem',
        name:        'Old Willem',
        title:       'Gardener',
        icon:        '👴',
        race:        'Human',
        homeRoom:    'garden',
        minRoomLevel: 1,
        dailyCost:   60,
        description: 'Twisted fingers, earth permanently under his fingernails, a hat that has seen decades. Moves slowly but never seems to stop moving.',
        hireText:    'Old Willem looks at your garden for a long time without speaking. Then he kneels — slowly, with effort — and picks up a handful of soil. He smells it. He lets it fall through his fingers. "The land knows who tends it," he says. "I\'ll see what it needs." He doesn\'t ask about pay. He\'s already started.',
        fireText:    'Willem nods once. He walks the garden perimeter first, making small adjustments — staking a leaning plant, clearing a root boundary. When he\'s satisfied, he picks up his pack. "Talk to the plants sometimes," he says. "They don\'t need words. Just the sound of something breathing near them." He shuffles off down the path.',
        buffs: {
            herbProduction: 1,
            materialDrops:  3,
        },
        roomAmbientTexts: [
            'Old Willem moves between the rows with unhurried purpose, hands trailing across leaves.',
            'You find Willem crouching at the south bed, brushing soil away from something at the garden\'s edge. He doesn\'t look up when you approach.',
            'Willem has pruned back the eastern hedge to reveal something set into the low wall — a carved stone, worn smooth by years.',
            'He\'s talking to the plants again. Softly, in a low murmur. The herbs seem to lean toward him.',
            'Willem straightens up and studies the sky for a long moment before returning to his work. "Rain by evening," he says, to no one in particular. He\'s always right.',
            'You notice new markers in the beds — small stakes of willow, carved with signs you don\'t recognize.',
            'Old Willem is crouching at the garden wall, pressing his ear against the stone. He sits back and nods slowly.',
            'The tools are laid out exactly as he left them, clean and ordered. Willem has been here since first light.',
        ],
        wanderAmbientTexts: [
            'Old Willem is here, looking at the walls. He runs his thumb along a seam in the stone. "Old work," he says. "Good work."',
            'You find Willem sitting very still, eyes closed. He opens them when you enter. "Listening," he says.',
            'Willem is examining a corner of the floor, tracing something there with one gnarled finger.',
        ],
        dialogueTopics: {
            garden: {
                label: 'The garden',
                icon: '🌱',
                responses: [
                    'The soil is good here. Deeper than it should be. Something prepared this land before you settled it.',
                    'I\'ve found old roots under the north bed. Too old for what\'s here now. Whatever grew here before was large — a tree, maybe. But there\'s no stump, no hollow.',
                    'I\'ve been a gardener since I was a boy. I\'ve tended land on three continents. This soil is different. It grows things larger and faster than it should. The land here is awake in a way most land isn\'t.',
                ],
            },
            markers: {
                label: 'The markers',
                icon: '🪨',
                responses: [
                    'Which markers?',
                    'Survey stakes. Old ones. Not the kind surveyors put down. These are boundary marks — this plot was claimed and named by someone, long ago, before anyone here was born.',
                    'I found five of them, buried finger-deep. The metal doesn\'t rust. I know what metal doesn\'t rust — it\'s old-world alloy, from before the Shattering. Someone mapped this land. Someone intended it.',
                ],
            },
            oldworld: {
                label: 'The old world',
                icon: '🌍',
                responses: [
                    'I\'m from the valley country. Doesn\'t matter much now.',
                    'I\'ve been a lot of places. Walked a lot of ground. You learn to read what the ground remembers.',
                    'There was a great civilization here, once. But what people forget is they didn\'t just build towers and cities. They tended the land. Cultivated it. What we call wild now was their garden.',
                ],
            },
            hills: {
                label: 'The hills',
                icon: '⛰️',
                responses: [
                    'Good ground to the north. Rich, dark. Different from here.',
                    'There\'s something in the northern hills that the deer avoid. They\'ll range east or west but not through that valley. Animals know things.',
                    'Boy Pip sees lights at night. I\'ve seen them too, on clear nights — not lights. Reflections. Something beneath the soil catching the moonlight, deep down.',
                ],
            },
        },
        loreHook: {
            triggerText: 'Willem is at the far wall when he calls you over. He\'s uncovered a stone, set deliberately into the garden wall at knee height — smooth, pale, with a symbol incised into it. He traces the symbol with one finger without touching it. "I\'ve seen this mark before," he says. "On ruins, up the coast. The Athenaeum has records of it, in the locked cases." He sits back on his heels. "This land was a surveyed estate of the old empire. You\'re not the first person to have a home here. Not by a thousand years."',
            threadTag:   '[The garden holds old roots: A surveyed estate of the Sunlit Throne]',
            storyThread: 'lost_civilization',
            flagKey:     'willem_lore_revealed',
        },
    },

    // -------------------------------------------
    breck: {
        id:          'breck',
        name:        'Breck Hammerfall',
        title:       'Armorer',
        icon:        '🛡️',
        race:        'Human',
        homeRoom:    'armory',
        minRoomLevel: 5,
        dailyCost:   100,
        description: 'Heavy build, efficient movements. A brand scar on his right hand, partially obscured. Never explains it.',
        hireText:    'Breck Hammerfall runs a thumb along the edge of the nearest weapon rack and checks the thumb with a professional expression. "Your maintenance situation is poor," he says. "I\'ll fix it." He names his price without flinching. "I was a garrison armorer. King\'s service, western provinces. I left. It\'s no longer relevant." He extends the same hand with the brand. "We have a deal?"',
        fireText:    'Breck polishes every piece of equipment before he goes — methodically, piece by piece. He stacks them more efficiently than they were before. "Everything\'s inventoried," he says, leaving a folded paper. "Condition report. The crossbow bolt guides need replacing within the month." He shoulders his pack. "You\'ll do fine."',
        buffs: {
            equipmentStats:  3,
            reforgeDiscount: 5,
        },
        roomAmbientTexts: [
            'Breck is at the workbench, running a whetstone along a blade with slow, methodical strokes.',
            'A helmet that was dented is no longer dented. Breck has moved on to the next problem without comment.',
            'You find the armory reorganized. Everything is clean and accessible. There is a system. You didn\'t know there was a system before. There is now.',
            'Breck is examining a piece of your equipment with professional concern. He sets it down and makes a note.',
            'The smell of metal, oil, and hot work hangs comfortably in the armory. Breck is already at the forge.',
            'Breck holds a blade to the light, turning it slowly. Whatever he sees in it satisfies him.',
            'Two pieces of equipment have had small marks scratched into them — maker\'s marks, not yours. He says nothing about it.',
            'Breck has constructed a rack you didn\'t ask for. It holds things perfectly.',
        ],
        wanderAmbientTexts: [
            'Breck is here, assessing something structural. He presses on a wall joint. "This needs attention," he says, then goes back to the armory.',
            'You find Breck sharpening a small utility knife. He seems to sharpen things unconsciously, whatever is at hand.',
            'Breck stands in the doorway, scanning the room with a soldier\'s habit of counting exits.',
        ],
        dialogueTopics: {
            work: {
                label: 'His work',
                icon: '🔨',
                responses: [
                    'Equipment is the difference between alive and not. I take it seriously.',
                    'I\'ve worked every kind of arms — infantry, cavalry, naval, siege. I know what breaks and why. Most armorsmiths fix the symptom. I fix the cause.',
                    'The brand is a garrison mark. Western 4th. I served ten years. Left when I understood what we were actually protecting.',
                ],
            },
            garrison: {
                label: 'The garrison',
                icon: '🏰',
                responses: [
                    'No longer relevant.',
                    'We guarded roads and collected taxes and told ourselves it was civilization. Some of it was. Some of it wasn\'t.',
                    'There was a commander named Halvard. He knew what was coming from the east — the real threat, not the orcs. He tried to redirect resources. They retired him. Then things got worse, exactly as he said.',
                ],
            },
            war: {
                label: 'The war',
                icon: '⚔️',
                responses: [
                    'Wars end. The reasons for them usually don\'t.',
                    'The orc campaign is a real war with real causes. Land, resources, old grievances. I respect that. What I saw in the eastern provinces — that\'s something else.',
                    'The 4th Garrison lost forty men in one night, eastern post. No bodies recovered. No orc sign. The report said "routing action." I wrote the report. I was lying.',
                ],
            },
            town: {
                label: 'The town',
                icon: '🏘️',
                responses: [
                    'New settlement. Give it ten years, see who\'s still here.',
                    'Corvin Vale runs a tight guild. I approve. The smith — Torgin — does adequate work. I\'ve seen worse.',
                    'There\'s a man who comes into town sometimes. Pale, quiet. Asks about the vault at the bank. I\'ve seen that type before. Old World intelligence service. They don\'t retire.',
                ],
            },
        },
        loreHook: {
            triggerText: 'Breck sets down his tools and turns to face you directly — the first time he\'s done so without being asked. "There\'s something you should know about this region," he says. "The garrison maps had a notation for it — \'Interdict Zone.\' No patrols, no census, no claims. The official reason was \'unstable terrain.\' That\'s a lie we tell soldiers when the real reason would unsettle them." He picks up his tools again. "I don\'t know what\'s under these hills. I know the people who do are very interested in what you\'re building here."',
            threadTag:   '[The garrison maps marked this land \'Interdict Zone\': Why?]',
            storyThread: 'sleeping_darkness',
            flagKey:     'breck_lore_revealed',
        },
    },

    // -------------------------------------------
    aldous: {
        id:          'aldous',
        name:        'Aldous Grey',
        title:       'Butler',
        icon:        '🎩',
        race:        'Human',
        homeRoom:    'hearth',
        minRoomLevel: 30,
        dailyCost:   90,
        description: 'Impeccably dressed in slightly-too-fine clothes for his station. Quiet movements. Always seems to know where things are.',
        hireText:    'Aldous Grey presents a letter of reference — a single sheet, beautifully written, from a name you don\'t recognize. "My previous employer relocated," he says, with the perfectly neutral tone of someone who could mean several things by that. "I am accustomed to a residence of some standing, but I find this... has potential." He folds the reference away before you can read the signature. "I manage correspondence, appointments, and the efficient running of the household economy. My discretion is absolute." He smiles.',
        fireText:    'Aldous nods once, precisely. He produces a detailed household ledger from somewhere — when did he compile a household ledger? — and places it on the table. "Everything is current as of this morning. The irregular maintenance is noted on page four." He straightens his coat. "I hope the household prospers." He exits without hurry, and somehow, though you\'re watching, you don\'t quite see him leave.',
        buffs: {
            goldFind: 4,
        },
        roomAmbientTexts: [
            'Aldous glides through the room, adjusting small things — a candlestick, an angled chair — with minimal motion.',
            'You find Aldous at the writing desk, composing something. He covers it when you approach. "Correspondence," he says pleasantly.',
            'A sealed letter sits on the table. "Arrived this morning," Aldous says. "I took the liberty of determining it was not urgent." He did not open it. You are fairly certain he knows what it says.',
            'Aldous appears at your elbow with information you were about to seek — schedules, a price from the market, a name you needed. He offers it without ceremony.',
            'The room is ordered in ways that make everything marginally easier to find. Aldous has been busy.',
            'Aldous is standing near the window, watching something outside. When he hears you, he turns with his usual composed expression. "A courier passed," he says. "Nothing for us."',
            'He serves tea without being asked. The temperature is exact.',
            'Aldous is reading — something slim, bound in dark cloth. He closes it when you enter. "Light reading," he says, and his smile suggests this is a small joke.',
        ],
        wanderAmbientTexts: [
            'Aldous has appeared here. He surveys it with a professional eye. "This space has neglected potential," he observes.',
            'You find Aldous quite still, listening. He registers your presence without looking. "Nothing to concern you," he says.',
            'Aldous passes through with a small package, origin and destination unstated.',
        ],
        dialogueTopics: {
            employer: {
                label: 'Previous employer',
                icon: '📜',
                responses: [
                    'A person of distinction. They have since... relocated. I prefer not to elaborate.',
                    'The household was in the Old World — a city on the eastern coast. It dissolved under circumstances that are, shall we say, complicated in retrospect.',
                    'My employer served on a council that knew certain things. About this coast. About why no one settled here for a century despite the obvious resources. I have records. Not with me.',
                ],
            },
            correspondence: {
                label: 'The correspondence',
                icon: '✉️',
                responses: [
                    'I handle the household correspondence with full discretion. Nothing of concern.',
                    'You have more interested parties than you know. Most mean well. Some are simply curious. I help manage the volume.',
                    'Vault Master Dolgrim has inquired about you twice. Courteously, of course. I replied courteously. His interest is not financial, despite the venue. I\'ve seen this pattern.',
                ],
            },
            economy: {
                label: 'The economy',
                icon: '💰',
                responses: [
                    'I have already identified three merchants in the market square who apply inconsistent pricing. I handle them.',
                    'Wealth follows information. I have found, in my experience, that the two are nearly interchangeable.',
                    'There is a network of old-money families who have interests in this region. They funded the first expeditions here, quietly. They are watching what you build.',
                ],
            },
            himself: {
                label: 'Himself',
                icon: '🎭',
                responses: [
                    'My history is my own. My service is yours.',
                    'I was trained in a tradition that no longer exists. The household I served was formative. I learned a great deal about the mechanisms behind what people see.',
                    'I worked for an intelligence service for eleven years. I am no longer employed by them. Those are different facts.',
                ],
            },
        },
        loreHook: {
            triggerText: 'Aldous sets a folder on the table — thin, old paper, written in a precise hand. "I\'ve carried this for three years," he says. "It\'s a partial record of an organization called the Pale Court. Old World. They believe that something beneath this coast can be awakened and controlled. They are not correct about the second part." He straightens. "I\'m telling you because you should know. Not because I need anything in return." He picks up the tea service and begins to clear. "The name of the man at the docks — the pale one — is Severin Ash. He was my handler."',
            threadTag:   '[The Pale Court: Old-world agents with interests beneath this shore]',
            storyThread: 'pale_court',
            flagKey:     'aldous_lore_revealed',
        },
    },

    // -------------------------------------------
    petra: {
        id:          'petra',
        name:        'Petra Caldwell',
        title:       'Scholar',
        icon:        '🎓',
        race:        'Human',
        homeRoom:    'shrine',
        minRoomLevel: 15,
        dailyCost:   80,
        description: 'Ink on her fingers despite precautions. Reads while walking. Seems genuinely surprised when you interrupt her train of thought.',
        hireText:    'Petra Caldwell looks up from a book she was reading while walking, and doesn\'t seem particularly embarrassed about it. "I\'m told you have a shrine," she says. "The old prayer-geometries create excellent conditions for concentrated study." She closes the book. "I can teach what I know. Combat theory, arcane history, applied languages. And in return, access to the shrine and the use of your writing desk." She extends an ink-stained hand. "I find the arrangement equitable."',
        fireText:    'Petra organizes her notes into a stack that somehow represents an archive. "I\'ve left a bibliography on the desk," she says. "The third volume is borrowed from the Athenaeum — Theron Ashvale will want it back." She hesitates. "I\'ve left some notes on the old survey markers. They\'re relevant to things you should look into." She gathers her books. "Come find me at the library. I\'ll be there most evenings."',
        buffs: {
            offlineXp:       5,
            blessingDuration: 5,
        },
        roomAmbientTexts: [
            'Petra is at the writing desk, working by candlelight on something dense with annotations.',
            'You find Petra cross-legged on the floor near the shrine, a book open in her lap, entirely absorbed.',
            'The shrine smells faintly of ink. Petra has been here.',
            'Petra is murmuring something as she copies text — a translation, by the rhythm of it.',
            'A stack of books has migrated from the desk to the floor to a precarious tower near the shrine. This is apparently a system.',
            'Petra looks up and holds out a passage for you to read. "You should know this," she says, without preamble.',
            'She is tracing something on the floor near the shrine altar — not drawing, just following. Like she can see something there.',
            'Two books are open simultaneously. Petra is moving between them with practiced speed.',
        ],
        wanderAmbientTexts: [
            'Petra is here with a measuring string, checking proportions. She makes a note.',
            'You find Petra at the wall, pressing her palm flat against it, head tilted. "The stonework here is pre-settlement," she says.',
            'Petra wanders through without looking up from her book, avoiding furniture by long habit.',
        ],
        dialogueTopics: {
            research: {
                label: 'Her research',
                icon: '📚',
                responses: [
                    'The Sunlit Throne — the old empire. I\'m tracing their presence on this coast. There\'s more evidence than the popular histories admit.',
                    'Theron Ashvale at the Athenaeum has the most complete collection I\'ve found, but there are locked cases he won\'t open for me. He says I\'m "not yet ready for the context." I find that infuriating.',
                    'I\'ve found three independent accounts of a structure beneath these hills — a foundation or a vault. All three describe it the same way, from different centuries. Someone redacted the passages in every copy. I have unredacted copies.',
                ],
            },
            shrine: {
                label: 'The shrine',
                icon: '🛕',
                responses: [
                    'The prayer-geometries in this room align with a star-chart I found in the Athenaeum. The shrine was built to face something specific. Cosmological, not theological.',
                    'The goddess this shrine honors — she\'s a local interpretation of something older. The old empire had a different name for her. They didn\'t think she was a goddess.',
                    'The star the shrine faces doesn\'t exist on modern charts. It appears on exactly two pre-Shattering charts, both marked "do not observe." I find that fascinating rather than alarming. I realize that may be a personal failing.',
                ],
            },
            empire: {
                label: 'The old empire',
                icon: '🏛️',
                responses: [
                    'They were extraordinary. Not just their architecture — their relationship with the land itself. They cultivated it the way we would never think to.',
                    'The Shattering wasn\'t an accident. That\'s the honest scholarly consensus in the restricted archives. Someone did it deliberately. The arguments are about who and why.',
                    'The best theory I\'ve found is that the Shattering was a containment measure. Something was being built here — something that required breaking the entire magical infrastructure of the world to stop.',
                ],
            },
            athenaeum: {
                label: 'The Athenaeum',
                icon: '📖',
                responses: [
                    'Theron Ashvale keeps the best collection on the coast. Also the most restrictive access policy I\'ve encountered outside a royal archive.',
                    'He\'s given me access to three of the locked cases. He was more forthcoming after I told him about the survey markers found in your garden.',
                    'Theron believes someone is actively removing records from the Athenaeum. Not stealing books — making passages disappear from books that are still on shelves. He asked me not to tell anyone. So. There it is.',
                ],
            },
        },
        loreHook: {
            triggerText: 'Petra sets a document on the table — a careful hand-copy of something old. "I\'ve been working on a translation," she says. "It\'s from a pre-Shattering operational record — an actual field report from an empire surveyor." She points to a passage. "He describes a structure beneath the northern hills of this region. He calls it \'the Cradle.\' He says it should not be disturbed under any circumstances, and lists the methods of disturbance." She closes the document. "Three of those methods are things that happen naturally as a settlement grows. We\'ve already done two of them."',
            threadTag:   '[The Cradle: a pre-Shattering structure beneath the hills, documented and forbidden]',
            storyThread: 'sleeping_darkness',
            flagKey:     'petra_lore_revealed',
        },
    },

    // -------------------------------------------
    pip: {
        id:          'pip',
        name:        'Young Pip',
        title:       'Stable Hand',
        icon:        '🐴',
        race:        'Human',
        homeRoom:    'trophy',
        minRoomLevel: 1,
        dailyCost:   40,
        description: 'Gap-toothed grin, always slightly muddy, enthusiastic in a way the older staff find both charming and exhausting.',
        hireText:    'The young man at the gate has been there for fifteen minutes before you notice him. "I heard you was hiring," he says. "I\'m good with animals and I know the grounds round here better than anyone — been exploring since I was small. I work hard." He scrubs a hand through his hair. "I don\'t have a letter or nothing. But I found an old door in the north hill once, and I reckon someone with your kind of work would want to know about that."',
        fireText:    'Pip\'s face falls, then reassembles into dignity. "Right. Okay." He gathers his things — a battered satchel, a map he\'s drawn himself. He pauses. "That door in the hill — I drew it on the map. It\'s not on any other map." He sets it on the fence post. "Might be nothing." He gives a slightly too-casual wave and walks off, hands in pockets.',
        buffs: {
            critChance:    0.5,
            materialDrops: 2,
        },
        roomAmbientTexts: [
            'Pip is examining one of the trophies with unabashed curiosity. He hasn\'t touched it. He very much wants to.',
            'You find Pip outside, clearing brush from the property boundary with more energy than technique.',
            'Pip is drawing something — a rough map of the grounds, obsessively detailed for someone his age.',
            'He\'s found something outside and is holding it at arm\'s length — a bone, large, from nothing you recognize. He\'s waiting to be told what it is.',
            'Pip is crouching at the base of the old oak at the property\'s edge, pressing his ear against the bark.',
            'A pile of strange rocks sits near the grounds entrance. Pip has been collecting them. "They glow a little," he explains. "At night. Just a little."',
            'Pip runs past with a purpose he\'s chosen not to explain. He\'s back five minutes later, apparently satisfied.',
            'He\'s fixed the fence he broke last week. It\'s actually better than before, somehow.',
        ],
        wanderAmbientTexts: [
            'Pip materializes here and looks around with open curiosity. "I\'ve never been in here before," he says. Technically, neither have you until recently.',
            'Pip is here, investigating a corner. He stands when he hears you. "Nothing," he says, which means something.',
            'Young Pip leans in the doorway. "Can I ask you something?" Whatever the answer, he\'s already thought of three more questions.',
        ],
        dialogueTopics: {
            grounds: {
                label: 'The grounds',
                icon: '🌳',
                responses: [
                    'There\'s a lot of good ground here. And some weird ground. I\'ll show you the weird bits when you have time.',
                    'The east side of the property, near the big stones — animals don\'t go there at night. I\'ve seen deer detour fifty yards around it in the dark.',
                    'Old Willem says the land is awake. I think that\'s true. I think it\'s been awake a long time and most folk just don\'t notice.',
                ],
            },
            door: {
                label: 'The door in the hill',
                icon: '🚪',
                responses: [
                    'Found it when I was maybe twelve. Old stone door, set into the north hill, barely sticking out. Couldn\'t open it. Tried.',
                    'The door has a symbol on it — same as the one Roslin found in the hearthstone, I reckon. I\'ve seen it in one other place. Carved on a rock by the river, deep in the reeds.',
                    'There was a night last autumn — I saw lights from the hill. Not torches. Lights from inside the ground, moving slow. I went to the door after and it was warm.',
                ],
            },
            lights: {
                label: 'The lights',
                icon: '✨',
                responses: [
                    'Everyone thinks I\'m making it up. I\'m not making it up.',
                    'It happens on new moons, mostly. Every month or two. I\'ve been keeping a chart.',
                    'The last time, I got close enough to hear something. Through the hill — like a rhythm. Not a sound so much as a feeling in the ground. Like something breathing, very slow.',
                ],
            },
            family: {
                label: 'His family',
                icon: '👨‍👩‍👦',
                responses: [
                    'Came on a ship with my mum. She works the docks now. I go see her on Sundays.',
                    'My da didn\'t come. He said he\'d follow on the next ship. That was three years ago. The ships have been irregular.',
                    'My mum says this is a good place to start over. I believe her. But I think there\'s things here from before we arrived, and I think they\'re waking up, and I think someone should pay attention.',
                ],
            },
        },
        loreHook: {
            triggerText: 'Pip comes in from outside at dusk, slightly out of breath, and puts his hand-drawn map on the table. He points to a mark in the north hill section. "I went back to the door," he says. "It\'s open. Not wide — just a crack, maybe two fingers. It wasn\'t open before. I didn\'t open it." He looks at you steadily. "There\'s light inside. And it smells like the rain smells, right before lightning." He traces the door on his map. "I thought you should know."',
            threadTag:   '[The door in the hill stands open: something below is stirring]',
            storyThread: 'sleeping_darkness',
            flagKey:     'pip_lore_revealed',
        },
    },

}; // end HousingStaff

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get a staff definition by ID
 * @param {string} staffId
 * @returns {Object|null}
 */
export function getStaffDefinition(staffId) {
    return HousingStaff[staffId] || null;
}

/**
 * Get all staff IDs
 * @returns {string[]}
 */
export function getAllStaffIds() {
    return Object.keys(HousingStaff);
}

/**
 * Get all staff whose homeRoom matches a structure ID
 * @param {string} structureId
 * @returns {Object[]}
 */
export function getStaffForRoom(structureId) {
    return Object.values(HousingStaff).filter(s => s.homeRoom === structureId);
}

/**
 * Get a random ambient text for a staff member.
 * Uses wanderAmbientTexts if isWandering, else roomAmbientTexts.
 * @param {string} staffId
 * @param {boolean} isWandering
 * @returns {string}
 */
export function getRandomStaffAmbient(staffId, isWandering = false) {
    const staff = HousingStaff[staffId];
    if (!staff) return '';
    const pool = isWandering ? staff.wanderAmbientTexts : staff.roomAmbientTexts;
    if (!pool || pool.length === 0) return '';
    return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Get dialogue response for a staff member on a topic at a trust tier.
 * @param {string} staffId
 * @param {string} topicKey
 * @param {number} trustTier  0 | 1 | 2
 * @returns {string}
 */
export function getStaffDialogue(staffId, topicKey, trustTier = 0) {
    const staff = HousingStaff[staffId];
    if (!staff || !staff.dialogueTopics[topicKey]) return '';
    const responses = staff.dialogueTopics[topicKey].responses;
    const idx = Math.min(trustTier, responses.length - 1);
    return responses[idx];
}

/**
 * Get the available dialogue topics for a staff member.
 * @param {string} staffId
 * @returns {Array<{key, label, icon}>}
 */
export function getStaffTopics(staffId) {
    const staff = HousingStaff[staffId];
    if (!staff) return [];
    return Object.entries(staff.dialogueTopics).map(([key, topic]) => ({
        key,
        label: topic.label,
        icon:  topic.icon,
    }));
}

/**
 * Get the upgrade duration in ms for a structure at a given level.
 * @param {number} level  Current structure level (before upgrade)
 * @returns {{ durationMs: number, label: string, tier: number }}
 */
export function getUpgradeDuration(level) {
    for (const tier of UpgradeTimeTiers) {
        if (level >= tier.minLevel && level <= tier.maxLevel) {
            return { durationMs: tier.durationMs, label: tier.label, tier: tier.tier };
        }
    }
    // Fallback — should not happen given tier 6 covers 75-999
    return { durationMs: 60000, label: '1 minute', tier: 1 };
}

export default {
    StaffSettings,
    UpgradeTimeTiers,
    HousingStaff,
    StaffBuffLabels,
    getStaffDefinition,
    getAllStaffIds,
    getStaffForRoom,
    getRandomStaffAmbient,
    getStaffDialogue,
    getStaffTopics,
    getUpgradeDuration,
};
