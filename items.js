// --- ITEM DATABASE ---
const ITEM_DATABASE = [
    // --- STAGE 1: Outer Debris & Crust ---
    { typeId: 'rusted_shank', name: 'Rusted Jailhouse Shank', symbol: '🗡️', clickBonus: 12, dpsBonus: 0, value: 15, rarity: 'Common', desc: 'Pry-barred straight out of the monster’s scabby outer hull.' },
    { typeId: 'chipped_hatchet', name: 'Chipped Rusty Hatchet', symbol: '🪓', clickBonus: 0, dpsBonus: 8, value: 20, rarity: 'Common', desc: 'Dull, tetanus-ridden, and wedged between two plates of bone.' },
    { typeId: 'spiked_knuckle', name: 'Knuckle-Duster of Woes', symbol: '🥊', clickBonus: 18, dpsBonus: 5, value: 30, rarity: 'Common', desc: 'Fitted with tiny, disgruntled monster teeth.' },
    { typeId: 'heavy_pipe', name: 'Lead-Lined Gas Pipe', symbol: '🔧', clickBonus: 0, dpsBonus: 15, value: 40, rarity: 'Common', desc: 'Smells of ancient cosmic gas leaks and rust.' },
    { typeId: 'bone_shiv', name: 'Femur Shiv', symbol: '🦴', clickBonus: 25, dpsBonus: 0, value: 55, rarity: 'Uncommon', desc: 'Serrated edge carved from an unidentifiable ribcage.' },
    { typeId: 'jagged_harpoon', name: 'Barnacle Harpoon', symbol: '🔱', clickBonus: 10, dpsBonus: 18, value: 70, rarity: 'Uncommon', desc: 'Encrusted with stubborn barnacles that whisper insults.' },
    { typeId: 'slag_dagger', name: 'Crust-Slag Dagger', symbol: '🗡️', clickBonus: 35, dpsBonus: 0, value: 90, rarity: 'Uncommon', desc: 'Poured from molten asteroid debris.' },
    { typeId: 'pitchfork_prong', name: 'Twisted Pitchfork', symbol: '🍴', clickBonus: 0, dpsBonus: 28, value: 110, rarity: 'Rare', desc: 'Missing two prongs, but the remaining one is aggressively sharp.' },
    { typeId: 'chitin_cleaver', name: 'Chitin Carving Cleaver', symbol: '🔪', clickBonus: 45, dpsBonus: 15, value: 140, rarity: 'Rare', desc: 'Choops through meat and metaphysical barriers alike.' },
    { typeId: 'meteor_mace', name: 'Meteoric Morningstar', symbol: '🔨', clickBonus: 0, dpsBonus: 55, value: 180, rarity: 'Rare', desc: 'Heavy enough to leave a crater in your inventory.' },

    // --- STAGE 2: Muscle Layer & Sinew ---
    { typeId: 'tendon_bow', name: 'Sinew-Strung Shortbow', symbol: '🏹', clickBonus: 55, dpsBonus: 0, value: 220, rarity: 'Common', desc: 'Twangs with a wet, fleshy snap.' },
    { typeId: 'gristle_spear', name: 'Cartilage Spear', symbol: '🗡️', clickBonus: 0, dpsBonus: 45, value: 260, rarity: 'Common', desc: 'Flexible shaft bends three ways before hitting the target.' },
    { typeId: 'flesh_flail', name: 'Myomer Ball-and-Chain', symbol: '⛓️', clickBonus: 70, dpsBonus: 20, value: 310, rarity: 'Uncommon', desc: 'Pumps rhythmically as you swing it around.' },
    { typeId: 'blood_glaive', name: 'Vascular Glaive', symbol: '⚔️', clickBonus: 0, dpsBonus: 85, value: 370, rarity: 'Uncommon', desc: 'Pulsing veins act as an internal hydraulic assist.' },
    { typeId: 'rib_crossbow', name: 'Chest-Cage Arbalest', symbol: '🏹', clickBonus: 95, dpsBonus: 0, value: 440, rarity: 'Uncommon', desc: 'Fires bolts made of calcium and pure spite.' },
    { typeId: 'artery_whip', name: 'Aorta Lash', symbol: '🧶', clickBonus: 30, dpsBonus: 80, value: 520, rarity: 'Rare', desc: 'It whips back and forth like an angry garden hose.' },
    { typeId: 'muscle_machete', name: 'Fiber-Weave Machete', symbol: '🔪', clickBonus: 120, dpsBonus: 0, value: 610, rarity: 'Rare', desc: 'Edge never dulls because it keeps healing itself.' },
    { typeId: 'viscera_halberd', name: 'Guts-Spiked Halberd', symbol: '🛡️', clickBonus: 0, dpsBonus: 140, value: 710, rarity: 'Rare', desc: 'Slippery grip, but devastating downward chops.' },
    { typeId: 'spasm_rapier', name: 'Twitch-Tip Rapier', symbol: '🤺', clickBonus: 155, dpsBonus: 50, value: 820, rarity: 'Epic', desc: 'Jitters so fast it appears to be in three places at once.' },
    { typeId: 'sinew_greatsword', name: 'Titan Myomer Blade', symbol: '🗡️', clickBonus: 0, dpsBonus: 190, value: 940, rarity: 'Epic', desc: 'Requires a signed waiver for lower back safety.' },

    // --- STAGE 3: Deep Organs & Anomalies ---
    { typeId: 'bile_stinger', name: 'Acid-Drip Stinger', symbol: '🦂', clickBonus: 190, dpsBonus: 0, value: 1070, rarity: 'Uncommon', desc: 'Dripping with green digestive enzymes.' },
    { typeId: 'spleen_sledge', name: 'Tumor-Headed Sledge', symbol: '🔨', clickBonus: 0, dpsBonus: 210, value: 1210, rarity: 'Uncommon', desc: 'Squishes satisfyingly upon impact.' },
    { typeId: 'glitch_blade', name: 'Parado-Sword', symbol: '🗡️', clickBonus: 230, dpsBonus: 80, value: 1360, rarity: 'Rare', desc: 'Exists yesterday, today, and through your opponent’s armor.' },
    { typeId: 'entropy_wand', name: 'Wand of Decaying Orbit', symbol: '🪄', clickBonus: 0, dpsBonus: 270, value: 1520, rarity: 'Rare', desc: 'Points at things and makes them age fifty years in a second.' },
    { typeId: 'quantum_scalpel', name: 'Probability Scalpel', symbol: '🔪', clickBonus: 280, dpsBonus: 0, value: 1690, rarity: 'Rare', desc: 'Might cut atoms, might just tickle.' },
    { typeId: 'neural_spear', name: 'Synapse Pike', symbol: '⚡', clickBonus: 90, dpsBonus: 240, value: 1870, rarity: 'Epic', desc: 'Sends unwanted shockwaves straight up your arms.' },
    { typeId: 'tumor_flail', name: 'Cyst-Cluster Flail', symbol: '☄️', clickBonus: 340, dpsBonus: 0, value: 2060, rarity: 'Epic', desc: 'Swings heavily with a wet, squelching arc.' },
    { typeId: 'warp_cutlass', name: 'Event-Horizon Saber', symbol: '⚔️', clickBonus: 0, dpsBonus: 390, value: 2260, rarity: 'Epic', desc: 'Curves light around the blade so it looks invisible.' },
    { typeId: 'abyssal_scythe', name: 'Void-Reaper Scythe', symbol: '🌙', clickBonus: 410, dpsBonus: 150, value: 2470, rarity: 'Legendary', desc: 'Harvests crops, souls, and awkward small talk.' },
    { typeId: 'singularity_mace', name: 'Collapsed-Core Club', symbol: '🪐', clickBonus: 0, dpsBonus: 500, value: 2690, rarity: 'Legendary', desc: 'So dense it warps the drop rates around you.' },

    // --- STAGE 4: Cosmic Mantle & Void ---
    { typeId: 'stardust_dagger', name: 'Supernova Stiletto', symbol: '🗡️', clickBonus: 520, dpsBonus: 0, value: 2920, rarity: 'Rare', desc: 'Hotter than a stovetop left on all weekend.' },
    { typeId: 'pulsar_bow', name: 'Gamma-Ray Greatbow', symbol: '🏹', clickBonus: 0, dpsBonus: 580, value: 3160, rarity: 'Epic', desc: 'Fires arrows made of pure electromagnetic radiation.' },
    { typeId: 'meteor_axe', name: 'Impact-Crater Greataxe', symbol: '🪓', clickBonus: 600, dpsBonus: 200, value: 3410, rarity: 'Epic', desc: 'Leaves a tiny scorch mark on reality.' },
    { typeId: 'void_glaive', name: 'Dark-Matter Pike', symbol: '🔱', clickBonus: 0, dpsBonus: 700, value: 3670, rarity: 'Epic', desc: 'Absorbs room lighting and morale.' },
    { typeId: 'quasar_sword', name: 'Quasar-Edge Broadsword', symbol: '⚔️', clickBonus: 750, dpsBonus: 0, value: 3940, rarity: 'Legendary', desc: 'Hums with the energy of a million angry suns.' },
    { typeId: 'entropy_staff', name: 'Heat-Death Scepter', symbol: '🪄', clickBonus: 0, dpsBonus: 820, value: 4220, rarity: 'Legendary', desc: 'Slowly cools down everything it touches.' },
    { typeId: 'nebula_shiv', name: 'Gas-Cloud Stinger', symbol: '🗡️', clickBonus: 880, dpsBonus: 300, value: 4510, rarity: 'Legendary', desc: 'Smells like ozone and cosmic dust bunnies.' },
    { typeId: 'black_hole_hammer', name: 'Singularity Mallet', symbol: '🔨', clickBonus: 0, dpsBonus: 980, value: 4810, rarity: 'Legendary', desc: 'Pulls enemies closer whether they want to or not.' },
    { typeId: 'spacetime_blade', name: 'Continuum Cleaver', symbol: '🔪', clickBonus: 1050, dpsBonus: 0, value: 5120, rarity: 'Mythic', desc: 'Slices through yesterday’s problems instantly.' },
    { typeId: 'stellar_greatsword', name: 'Galaxy-Splicer Greatsword', symbol: '🗡️', clickBonus: 0, dpsBonus: 1150, value: 5440, rarity: 'Mythic', desc: 'Long enough to span two separate constellations.' },

    // --- STAGE 5: The Absolute Eldritch Core ---
    { typeId: 'primordial_spear', name: 'Genesis Pike', symbol: '🔱', clickBonus: 1250, dpsBonus: 0, value: 5770, rarity: 'Epic', desc: 'Forged back when the universe was just a messy sketch.' },
    { typeId: 'arch_deity_mace', name: 'God-Slayer Hammer', symbol: '🔨', clickBonus: 0, dpsBonus: 1320, value: 6110, rarity: 'Legendary', desc: 'Heavy enough to give cosmic entities a migraine.' },
    { typeId: 'tentacle_whip', name: 'Eldritch Lash', symbol: '🦑', clickBonus: 1380, dpsBonus: 450, value: 6460, rarity: 'Legendary', desc: 'Wriggles aggressively toward the nearest vulnerable spot.' },
    { typeId: 'chaos_scythe', name: 'Prismatic Ruin Scythe', symbol: '🌙', clickBonus: 0, dpsBonus: 1500, value: 6820, rarity: 'Legendary', desc: 'Constantly shifts colors between neon green and total void.' },
    { typeId: 'oblivion_blade', name: 'Null-Space Rapier', symbol: '🤺', clickBonus: 1620, dpsBonus: 0, value: 7190, rarity: 'Legendary', desc: 'Removes whatever it punctures from official records.' },
    { typeId: 'reality_needle', name: 'Timeline-Stitching Lance', symbol: '🪄', clickBonus: 0, dpsBonus: 1750, value: 7570, rarity: 'Mythic', desc: 'Fixes frayed dimensions by poking them really hard.' },
    { typeId: 'core_pulse_sword', name: 'Heartbeat Broadsword', symbol: '⚔️', clickBonus: 1850, dpsBonus: 600, value: 7960, rarity: 'Mythic', desc: 'Beats in time with your pulse, speeding up when you panic.' },
    { typeId: 'dad_joke_axe', name: 'Pun-Master Greataxe', symbol: '🪓', clickBonus: 0, dpsBonus: 2000, value: 8360, rarity: 'Mythic', desc: 'Incisive, sharp, and makes everyone groan on impact.' },
    { typeId: 'absolute_stinger', name: 'Eye of the Void Stiletto', symbol: '🗡️', clickBonus: 2150, dpsBonus: 0, value: 8770, rarity: 'Mythic', desc: 'Stares right through armor straight to the soul.' },
    { typeId: 'omega_core_weapon', name: 'The Alpha-Omega Obliterator', symbol: '👁️‍🗨️', clickBonus: 0, dpsBonus: 2400, value: 9200, rarity: 'Mythic', desc: 'The monster’s final, bitter weapon turned against it.' }
];

// --- SHOP ITEMS ---
const SHOP_ITEMS = [
    { id: 'rusty_whetstone', name: 'Gritty Whetstone', price: 60, clickBonus: 10, dpsBonus: 0, desc: 'Scrapes away rust to boost click power by +10.' },
    { id: 'windup_mallet', name: 'Windup Mallet', price: 130, clickBonus: 0, dpsBonus: 22, desc: 'A spring-loaded hammer that beats on the monster for +22 DPS.' },
    { id: 'sticky_fingers', name: 'Gooey Grip Tape', price: 270, clickBonus: 45, dpsBonus: 12, desc: 'Improves your grip for +45 Click and +12 DPS.' },
    { id: 'clockwork_drill', name: 'Clockwork Boring Bit', price: 550, clickBonus: 0, dpsBonus: 85, desc: 'Bores continuously into the crust, adding +85 DPS.' },
    { id: 'flesh_tether', name: 'Tendon Pulley Rig', price: 1100, clickBonus: 150, dpsBonus: 40, desc: 'Leverages monster muscle to grant +150 Click and +40 DPS.' },
    { id: 'void_battery', name: 'Bottled Singularity', price: 2200, clickBonus: 0, dpsBonus: 320, desc: 'Unleashes a micro-black hole that generates +320 DPS.' },
    { id: 'cosmic_espresso', name: 'Stardust Energy Drink', price: 4500, clickBonus: 600, dpsBonus: 150, desc: 'Tastes like purple and panic (+600 Click, +150 DPS).' },
    { id: 'entropy_engine', name: 'Heat-Death Hand-Crank', price: 9000, clickBonus: 0, dpsBonus: 1250, desc: 'Speeds up local decay for +1250 DPS.' },
    { id: 'reality_patch', name: 'Duct-Tape of the Gods', price: 18000, clickBonus: 2200, dpsBonus: 500, desc: 'Holds broken dimensions together (+2200 Click, +500 DPS).' },
    { id: 'infinite_wrench', name: 'Continuum Spanner', price: 35000, clickBonus: 0, dpsBonus: 4800, desc: 'Tightens loose paradoxes for +4800 DPS.' },
    { id: 'giggle_box', name: 'Box of Cursed Chuckles', price: 70000, clickBonus: 8500, dpsBonus: 2000, desc: 'Unsettling laughter increases click power and DPS.' },
    { id: 'omega_catalyst', name: 'The Alpha-Omega Core', price: 150000, clickBonus: 25000, dpsBonus: 10000, desc: 'The ultimate upgrade. Total reality overhaul.' }
];

// --- MEALS ---
const MEALS = [
    { id: 'tavern_stew', name: 'Adventurer’s Mystery Stew', price: 30, dpsBuff: 1, desc: '+1 Extra DPS for 1 Full Hour of combat.' },
    { id: 'monster_steak', name: 'Charred Chitin Steak', price: 80, dpsBuff: 10, desc: '+10 Extra DPS for 1 Full Hour of combat.' },
    { id: 'void_soup', name: 'Abyssal Broth', price: 250, dpsBuff: 45, desc: '+45 Extra DPS for 1 Full Hour of combat. Tastes like staring into space.' },
    { id: 'tentacle_nuggets', name: 'Crispy Eldritch Nuggets', price: 750, dpsBuff: 180, desc: '+180 Extra DPS for 1 Full Hour of combat. They try to crawl off the plate.' },
    { id: 'singularity_smoothie', name: 'Cosmic Super-Shake', price: 2000, dpsBuff: 600, desc: '+600 Extra DPS for 1 Full Hour of combat. Highly caloric and mildly radioactive.' }
];