// Race Configuration - Human, Dwarf, Elf definitions
export const RaceConfig = {
    human: {
        id: 'human',
        name: 'Human',
        description: 'Versatile and adaptable, humans are balanced in all attributes and excel through determination.',
        
        // Stat bonuses
        statBonus: {
            strength: 1,
            dexterity: 1,
            intelligence: 1,
            stamina: 1
        },
        
        // Special racial traits
        traits: {
            xpBonus: 1.05,          // 5% bonus XP
            allStatBonus: 0         // No additional stat bonus
        },
        
        // Appearance options
        appearance: {
            skinColors: ['fair', 'light', 'tan', 'olive', 'brown', 'dark'],
            hairColors: ['black', 'brown', 'blonde', 'red', 'gray', 'white'],
            hairStyles: ['short', 'medium', 'long', 'bald', 'ponytail', 'braided'],
            eyeColors: ['brown', 'blue', 'green', 'hazel', 'gray'],
            heights: ['short', 'average', 'tall'],
            builds: ['slim', 'average', 'muscular', 'stocky']
        },
        
        // Lore
        homeland: 'The Free Cities',
        lifespan: '70-90 years'
    },
    
    dwarf: {
        id: 'dwarf',
        name: 'Dwarf',
        description: 'Stout and resilient, dwarves are natural warriors with an affinity for crafting and stone.',
        
        statBonus: {
            strength: 2,
            dexterity: -1,
            intelligence: 0,
            stamina: 3
        },
        
        traits: {
            xpBonus: 1.0,
            poisonResist: 0.15,     // 15% poison resistance
            craftBonus: 0.10        // 10% upgrade success bonus
        },
        
        appearance: {
            skinColors: ['ruddy', 'tan', 'pale', 'gray'],
            hairColors: ['black', 'brown', 'red', 'gray', 'white', 'auburn'],
            hairStyles: ['short', 'braided', 'mohawk', 'bald'],
            beardStyles: ['full', 'braided', 'forked', 'long', 'short'],
            eyeColors: ['brown', 'black', 'amber', 'gray'],
            heights: ['short'],  // Dwarves are always short
            builds: ['stocky', 'muscular', 'broad']
        },
        
        homeland: 'Ironhold Mountains',
        lifespan: '250-350 years'
    },
    
    elf: {
        id: 'elf',
        name: 'Elf',
        description: 'Graceful and ancient, elves possess keen senses and natural magical aptitude.',
        
        statBonus: {
            strength: -1,
            dexterity: 3,
            intelligence: 2,
            stamina: 0
        },
        
        traits: {
            xpBonus: 1.0,
            magicResist: 0.10,      // 10% magic resistance
            critBonus: 0.05         // 5% bonus crit chance
        },
        
        appearance: {
            skinColors: ['pale', 'fair', 'golden', 'silver', 'bronze'],
            hairColors: ['silver', 'gold', 'white', 'black', 'green', 'blue'],
            hairStyles: ['long', 'flowing', 'braided', 'half-up', 'ponytail'],
            eyeColors: ['blue', 'green', 'gold', 'silver', 'violet', 'amber'],
            heights: ['tall', 'average'],
            builds: ['slim', 'lithe', 'graceful']
        },
        
        homeland: 'Silverwood Forest',
        lifespan: '700-1000 years'
    }
};

// Helper to get race by ID
export function getRace(raceId) {
    return RaceConfig[raceId] || null;
}

// Get all race IDs
export function getRaceIds() {
    return Object.keys(RaceConfig);
}

// Calculate total stat bonus from race
export function getRaceStatTotal(raceId) {
    const race = getRace(raceId);
    if (!race) return 0;
    return Object.values(race.statBonus).reduce((sum, val) => sum + val, 0);
}

export default RaceConfig;
