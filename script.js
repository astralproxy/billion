/**
 * BILLION - Game Engine with Day/Night Loop & Town System
 */

// --- LAYOUT CONFIGURATION CONSTANTS ---
const LAYOUT_CONFIG = {
    headerHeight: '10vh',       // Tune header height here
    headerExpandedHeight: '18vh', // Expanded header size
    mainHeight: '62vh',         // Tune combat/town screen height here
    // Inventory uses flex-1 to fill the rest automatically, 
    // but min/max heights for expansion can be configured here:
    invMinHeight: '160px',
    invExpandedHeight: '85vh'   // Expanded inventory height to cover combat + spacing
};

// --- GAME CONSTANTS ---
const MASS_MAX = 1000000000; // total monster mass
const MEAL_BUFF_DURATION = 60; // 1 game hour, in seconds
//const DAY_LENGTH = 120; // in seconds (60 per minute)
// DAY_LENGTH is dynamically calculated from gameState.dayLengthMinutes * 60

let idCounter = 0;
function generateUniqueId() {
    idCounter++;
    return `item-${Date.now()}-${idCounter}-${Math.random().toString(36).substr(2, 5)}`;
}

// --- GAME STATE ---
const gameState = {
    mass: MASS_MAX,
    maxMass: MASS_MAX,
    baseClickPower: 1,
    bonusClickPower: 0,
    passiveDPS: 0,
    gold: 50,
    layer: 1,
    totalHits: 0,
    inventory: [],     // Items in bag
    groundItems: [],   // Scattered '*' artifact drops on terrain 
    milestonesReached: new Set(),
    assimilationStage: 0,
    
    // DAY / NIGHT & TOWN MECHANICS
    dayNumber: 1,
    totalGameTime: 0, // in seconds
    dayLengthMinutes: 2, // Default 2 minutes
    timeRemaining: 120,  // Initialized to 2 minutes in seconds
    isNight: false,
    mealBuffActive: false,
    mealBuffTimer: 0, // Duration in seconds
    mealBuffValue: 0  // Stores the active meal's dpsBuff value
};

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

// --- PARASITIC MESSAGES ---
const PARASITIC_MESSAGES = {
    0: [
        "You extract gear lost by ancient adventurers.",
        "Debris chips away from the massive creature.",
        "The pile groans under the relentless assault."
    ],
    1: [
        "The extracted metal feels remarkably comfortable in your grip.",
        "Your palms harden into calluses that resemble stone.",
        "The mass yields to your strength with an eerie rhythm."
    ],
    2: [
        "The Greatsword feels natural against your skin.",
        "Your iron equipment begins to pulse in rhythm with your heart.",
        "The monster's outer mass shifts as if inviting your touch."
    ],
    3: [
        "You can no longer tell where the iron ends and you begin.",
        "Your body is growing heavier, denser, endless.",
        "You are not destroying the monster. You are taking its place."
    ]
};

// --- INITIALIZATION ---
window.onload = () => {
    // Apply layout tuning constants
    document.getElementById('app-header').style.height = LAYOUT_CONFIG.headerHeight;
    document.getElementById('combat-screen').style.height = LAYOUT_CONFIG.mainHeight;
    document.getElementById('town-screen').style.height = LAYOUT_CONFIG.mainHeight;

    // Attach header click listener for expansion
    document.getElementById('app-header').addEventListener('click', toggleHeaderExpand);

    loadGame(); // Load saved state before rendering

    renderMonster();
    recalculateStats(); // Recalculate DPS/Click power from saved inventory
    updateStatsUI();
    updateTimeDisplay();
    renderTerrainArtifacts();

    if (!gameState.isNight) {
        addLogEntry("You stand before the massive anomaly.");
    }
    
    // Loop: 10 Ticks per second
    setInterval(gameTick, 100);

    // Auto-save every 10 seconds
    setInterval(saveGame, 10000);

    // Click Handler for Monster
    document.getElementById('arena').addEventListener('click', handleAttack);

    // Initialize Swipe Events for Inventory Expansion
    setupInventorySwipe();
    renderShop();
    renderMeals();
};

// --- GAME TICK (10 TICKS / SEC) ---
function updateTotalGameTimeDisplay() {
    const timerEl = document.getElementById('total-game-time');
    if (!timerEl) return;

    const totalSecs = Math.floor(gameState.totalGameTime);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (hrs > 0) {
        timerEl.innerText = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } else {
        timerEl.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
}

let lastTickTime = Date.now();
function gameTick() {
    const now = Date.now();
    const delta = (now - lastTickTime) / 1000;
    lastTickTime = now;
    if (delta <= 0) return;

    // Increment total game time every tick (10 ticks per second = 0.1s)
    gameState.totalGameTime += delta;
    updateTotalGameTimeDisplay();

    // DAY/NIGHT TIMER MANAGEMENT
    if (!gameState.isNight) {
        gameState.timeRemaining -= delta;
        if (gameState.timeRemaining <= 0) {
            gameState.timeRemaining = 0;
            triggerNightPhase();
        }
        updateTimeDisplay();
    }

    // MEAL BUFF TIMER TICK
    if (gameState.mealBuffActive && gameState.mealBuffTimer > 0) {
        gameState.mealBuffTimer = Math.max(0, gameState.mealBuffTimer - delta);
        if (gameState.mealBuffTimer <= 0) {
            gameState.mealBuffActive = false;
            addLogEntry("Your meal buff has worn off.");
            recalculateStats();
        }
    }

    // PASSIVE COMBAT DPS
    if (!gameState.isNight && gameState.passiveDPS > 0) {
        const damagePerTick = gameState.passiveDPS * delta;
        applyDamage(damagePerTick, false);
    }
}

function updateDayLengthSetting(val) {
    const mins = parseInt(val, 10);
    gameState.dayLengthMinutes = mins;
    document.getElementById('day-length-label').innerText = `${mins} Minute${mins > 1 ? 's' : ''}`;

    const totalSecs = mins * 60;
    if (gameState.timeRemaining > totalSecs) {
        gameState.timeRemaining = totalSecs;
    }
    saveGame();
}

// --- TIME & DAY/NIGHT CYCLE LOGIC ---
function updateTimeDisplay() {
    const timeIcon = document.getElementById('time-icon');
    const timeDisplay = document.getElementById('time-display');
    
    if (gameState.isNight) {
        timeIcon.innerText = '🌙';
        timeDisplay.innerText = `NIGHT ${gameState.dayNumber} - TOWN`;
        timeDisplay.className = "text-xs font-bold text-indigo-400 font-mono tracking-wider";
    } else {
        const mins = Math.floor(gameState.timeRemaining / 60);
        const secs = Math.floor(gameState.timeRemaining % 60);
        const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        
        timeIcon.innerText = '☀️';
        timeDisplay.innerText = `DAY ${gameState.dayNumber} - ${formattedTime}`;
        timeDisplay.className = "text-xs font-bold text-amber-400 font-mono tracking-wider";
    }
}

function triggerNightPhase() {
    gameState.isNight = true;

    // Discard all unclaimed ground artifacts so they don't persist to the next day
    gameState.groundItems = [];
    renderTerrainArtifacts();
    
    document.getElementById('combat-screen').classList.add('hidden');
    document.getElementById('combat-screen').classList.remove('flex');
    document.getElementById('town-screen').classList.remove('hidden');
    document.getElementById('town-screen').classList.add('flex');

    addLogEntry(`DUSK FALLS. Day ${gameState.dayNumber} has ended. Return to Town.`);

    // Force Shop to be the starting tab
    switchTownTab('shop');
    renderShop();

    updateTimeDisplay();
    renderInventory();
    renderCraftingSlots();

    saveGame();
}

//#region --- TOWN SYSTEM TABS ---
let activeTownTab = 'shop';

function switchTownTab(tabName) {
    const tabs = ['shop', 'craft', 'eat', 'rest'];
    activeTownTab = tabName; // <--- Track active tab

    tabs.forEach(tab => {
        const content = document.getElementById(`town-content-${tab}`);
        const button = document.getElementById(`town-tab-${tab}`);
        
        if (tab === tabName) {
            content.classList.remove('hidden');
            button.className = 'flex-1 py-2.5 font-bold text-amber-400 border-b-2 border-amber-400 transition-all flex items-center justify-center gap-1';
        } else {
            content.classList.add('hidden');
            button.className = 'flex-1 py-2.5 font-bold text-slate-500 border-b-2 border-transparent transition-all flex items-center justify-center gap-1';
        }
    });

    if (tabName === 'craft') renderCraftingSlots();
    renderInventory();
}

// --- SHOP LOGIC ---
function renderShop() {
    const container = document.getElementById('shop-item-list');
    updateGoldUI();
    container.innerHTML = '';

    SHOP_ITEMS.forEach(item => {
        const div = document.createElement('div');
        div.className = 'bg-slate-950 border border-slate-800 p-2.5 rounded-lg flex justify-between items-center';
        div.innerHTML = `
            <div>
                <div class="text-xs font-bold text-slate-200">${item.name}</div>
                <div class="text-[10px] text-slate-400">${item.desc}</div>
            </div>
            <button onclick="buyShopItem('${item.id}')" class="px-3 py-1.5 bg-amber-500/20 border border-amber-500/50 hover:bg-amber-500 hover:text-slate-950 text-amber-300 text-xs font-bold rounded transition-colors shrink-0">
                ${item.price} 🪙
            </button>
        `;
        container.appendChild(div);
    });
}

function buyShopItem(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return;

    if (gameState.gold < item.price) {
        addLogEntry("Not enough gold to purchase item!");
        return;
    }

    gameState.gold -= item.price;
    addItemToInventory({
        uniqueId: generateUniqueId(),
        typeId: item.id,
        name: item.name,
        symbol: '📦',
        clickBonus: item.clickBonus,
        dpsBonus: item.dpsBonus,
        value: Math.floor(item.price * 0.5),
        rarity: 'Purchased',
        desc: item.desc
    });

    addLogEntry(`Bought [${item.name}] from shop.`);
    recalculateStats();
    renderShop();
    renderInventory();

    saveGame();
}

function sellItem(uniqueId) {
    const index = gameState.inventory.findIndex(i => i.uniqueId === uniqueId);
    if (index === -1) return;

    const item = gameState.inventory.splice(index, 1)[0];
    const sellPrice = item.value || 15;
    gameState.gold += sellPrice;

    if (item.quantity && item.quantity > 1) {
        item.quantity--;
        addLogEntry(`Sold 1x [${item.name}] for ${sellPrice} Gold.`);
    } else {
        gameState.inventory.splice(index, 1);
        addLogEntry(`Sold [${item.name}] for ${sellPrice} Gold.`);
    }

    recalculateStats();
    renderShop();
    renderInventory();
    renderCraftingSlots();

    saveGame();
}

// --- CRAFTING LOGIC ---
function renderCraftingSlots() {
    const slotArea = document.getElementById('craft-slots');
    slotArea.innerHTML = '';

    const stackableItems = gameState.inventory.filter(item => (item.quantity || 1) >= 2);

    if (stackableItems.length === 0) {
        slotArea.innerHTML = `<div class="text-xs text-slate-600 text-center py-6 italic">No duplicate gear available to fuse.<br>Collect more items during the day!</div>`;
        return;
    }

    stackableItems.forEach(item => {
        const count = item.quantity;
        const card = document.createElement('div');
        card.className = 'bg-slate-950 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between';
        card.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="text-xl">${item.symbol}</span>
                <div>
                    <div class="text-xs font-bold text-slate-200">${item.name} <span class="text-amber-400 font-mono">(x${count})</span></div>
                    <div class="text-[10px] text-slate-400">Combine 2 into an Upgraded +50% Powered version.</div>
                </div>
            </div>
            <button onclick="craftCombine('${item.uniqueId}')" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded transition-colors shrink-0">
                Smelt 2x
            </button>
        `;
        slotArea.appendChild(card);
    });
}

function craftCombine(uniqueId) {
    const item = gameState.inventory.find(i => i.uniqueId === uniqueId);
    if (!item || (item.quantity || 1) < 2) return;

    item.quantity -= 2;
    if (item.quantity <= 0) {
        const index = gameState.inventory.findIndex(i => i.uniqueId === uniqueId);
        gameState.inventory.splice(index, 1);
    }

    const fusedItem = {
        uniqueId: generateUniqueId(),
        typeId: `${item.typeId}_fused`,
        name: `Forged ${item.name}`,
        symbol: item.symbol,
        clickBonus: Math.round(item.clickBonus * 1.6) + 5,
        dpsBonus: Math.round(item.dpsBonus * 1.6) + 5,
        value: Math.round((item.value || 20) * 2.2),
        rarity: 'Forged',
        desc: `Smelted at the town forge. Power amplified.`
    };

    addItemToInventory(fusedItem);
    addLogEntry(`SMELTED 2x [${item.name}] into [${fusedItem.name}]!`);
    recalculateStats();
    renderCraftingSlots();
    renderInventory();

    saveGame();
}

// --- MEALS LOGIC ---
function renderMeals() {
    const container = document.getElementById('meal-list');
    container.innerHTML = '';

    MEALS.forEach(meal => {
        const div = document.createElement('div');
        div.className = 'bg-slate-950 border border-slate-800 p-2.5 rounded-lg flex justify-between items-center';
        div.innerHTML = `
            <div>
                <div class="text-xs font-bold text-slate-200">${meal.name}</div>
                <div class="text-[10px] text-slate-400">${meal.desc}</div>
            </div>
            <button onclick="eatMeal('${meal.id}')" class="px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/50 hover:bg-emerald-600 hover:text-white text-emerald-300 text-xs font-bold rounded transition-colors shrink-0">
                Eat (${meal.price}🪙)
            </button>
        `;
        container.appendChild(div);
    });
}

function eatMeal(mealId) {
    const meal = MEALS.find(m => m.id === mealId);
    if (!meal) return;

    if (gameState.gold < meal.price) {
        addLogEntry("Not enough gold to purchase a meal.");
        return;
    }

    gameState.gold -= meal.price;
    gameState.mealBuffActive = true;
    gameState.mealBuffTimer = MEAL_BUFF_DURATION;
    gameState.mealBuffValue = meal.dpsBuff;
    document.getElementById('meal-buff-indicator').classList.remove('hidden');

    addLogEntry(`Ate [${meal.name}].\nGained +${meal.dpsBuff} extra DPS for 1 Hour.`);
    recalculateStats();
    renderShop();

    saveGame();
}

// --- REST LOGIC ---
function confirmRest() {
    const sleepOverlay = document.getElementById('sleep-overlay');
    sleepOverlay.classList.remove('pointer-events-none');
    sleepOverlay.style.opacity = '1';

    setTimeout(() => {
        // Transition to Dawn
        gameState.dayNumber++;
        gameState.timeRemaining = gameState.dayLengthMinutes * 60;
        gameState.isNight = false;

        document.getElementById('town-screen').classList.add('hidden');
        document.getElementById('town-screen').classList.remove('flex');
        document.getElementById('combat-screen').classList.remove('hidden');
        document.getElementById('combat-screen').classList.add('flex');

        updateTimeDisplay();
        renderInventory();
        addLogEntry(`DAWN BREAKS. Day ${gameState.dayNumber} has begun.`);

        setTimeout(() => {
            sleepOverlay.style.opacity = '0';
            sleepOverlay.classList.add('pointer-events-none');
        }, 1000);
    }, 2000);

    saveGame();
}
//#endregion

// --- ATTACK & DAMAGE ---
function handleAttack(e) {
    if (gameState.isNight) return;

    const mealBonus = gameState.mealBuffActive ? 1 : 0;
    const totalClick = gameState.baseClickPower + gameState.bonusClickPower + mealBonus;
    applyDamage(totalClick, true);

    // Damage Text Coordinates
    const arena = document.getElementById('arena');
    const rect = arena.getBoundingClientRect();
    let x = rect.width / 2 + (Math.random() * 80 - 40);
    let y = rect.height / 2 + (Math.random() * 40 - 20);

    if (e && e.clientX && e.clientY) {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
    }

    spawnFloatingDamage(`-${Math.floor(totalClick)}`, x, y);

    // Animate Monster Hit Effect
    const container = document.getElementById('monster-container');
    container.classList.remove('hit-anim');
    void container.offsetWidth;
    container.classList.add('hit-anim');

    gameState.totalHits++;
}

function applyDamage(amount, isDirectClick) {
    if (gameState.mass <= 0) return;

    gameState.mass = Math.max(0, gameState.mass - amount);

    checkDropTriggers(amount, isDirectClick);
    updateLayerAndNarrative();
    updateStatsUI();
}

// --- ITEM DROP & TERRAIN SCATTERING (*) ---
function checkDropTriggers(amount, isDirectClick) {
    const baseChance = isDirectClick ? 0.08 : 0.008;
    if (Math.random() < baseChance) {
        spawnLootDrop();
    }

    const percentageLost = Math.floor((1 - gameState.mass / gameState.maxMass) * 10);
    if (percentageLost > 0 && !gameState.milestonesReached.has(percentageLost)) {
        gameState.milestonesReached.add(percentageLost);
        triggerStructuralShockwave();
    }
}

function triggerStructuralShockwave() {
    const banner = document.getElementById('shockwave-banner');
    banner.style.opacity = '1';
    setTimeout(() => { banner.style.opacity = '0'; }, 1800);

    const dropCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < dropCount; i++) {
        setTimeout(() => spawnLootDrop(), i * 200);
    }
    addLogEntry("A STRUCTURAL SHOCKWAVE ripples through the mass! Items pop loose!");
}

function spawnLootDrop() {
    const availableItems = ITEM_DATABASE.slice(0, Math.min(ITEM_DATABASE.length, gameState.layer + 1));
    const itemTemplate = availableItems[Math.floor(Math.random() * availableItems.length)];

    const uniqueGroundItem = {
        uniqueId: generateUniqueId(),
        typeId: itemTemplate.typeId,
        name: itemTemplate.name,
        symbol: itemTemplate.symbol,
        clickBonus: itemTemplate.clickBonus,
        dpsBonus: itemTemplate.dpsBonus,
        value: itemTemplate.value,
        rarity: itemTemplate.rarity,
        desc: itemTemplate.desc
    };

    animateEjectionTrajectory(uniqueGroundItem);
}

function animateEjectionTrajectory(groundItem) {
    const dropLayer = document.getElementById('drop-layer');
    const dropEl = document.createElement('div');
    // Exclude 'star-artifact' here so it doesn't conflict with trajectory positioning
    dropEl.className = 'ejecting-item text-amber-300 font-bold text-xl cursor-pointer select-none';
    dropEl.innerText = '*';

    const startX = 35 + Math.random() * 30; // %
    const startY = 30 + Math.random() * 20; // %
    dropEl.style.left = `${startX}%`;
    dropEl.style.top = `${startY}%`;

    dropLayer.appendChild(dropEl);

    const scatterLeft = 10 + Math.random() * 80; // %
    const scatterBottom = 10 + Math.random() * 35; // px

    requestAnimationFrame(() => {
        setTimeout(() => {
            dropEl.style.left = `${scatterLeft}%`;
            dropEl.style.top = `80%`;
        }, 20);
    });

    setTimeout(() => {
        if (dropLayer.contains(dropEl)) {
            dropLayer.removeChild(dropEl);
        }
        addToGroundTerrain(groundItem, scatterLeft, scatterBottom);
    }, 620);
}

function addToGroundTerrain(item, leftPct, bottomPx) {
    item.left = leftPct;
    item.bottom = bottomPx;
    gameState.groundItems.push(item);
    renderTerrainArtifacts();
}

function renderTerrainArtifacts() {
    const terrain = document.getElementById('ground-terrain');
    terrain.innerHTML = '';

    gameState.groundItems.forEach(item => {
        const starDiv = document.createElement('div');
        starDiv.id = item.uniqueId;
        // Removed hover:scale-150 and transition-transform, handled by styles.css
        starDiv.className = 'absolute text-amber-300 font-bold text-lg star-artifact p-1';
        starDiv.innerText = '*';
        starDiv.style.left = `${item.left}%`;
        starDiv.style.bottom = `${item.bottom}px`;

        starDiv.onclick = (e) => {
            e.stopPropagation();
            collectGroundItem(item.uniqueId);
        };

        terrain.appendChild(starDiv);
    });
}

function collectGroundItem(uniqueId) {
    const itemIndex = gameState.groundItems.findIndex(i => i.uniqueId === uniqueId);
    if (itemIndex === -1) return;

    const item = gameState.groundItems.splice(itemIndex, 1)[0];
    addItemToInventory(item);

    // Add Narrative log revealing full item name upon collection
    const msgs = PARASITIC_MESSAGES[gameState.assimilationStage];
    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    addLogEntry(`${msg}\nPicked up (*) - [${item.name}]`);

    recalculateStats();
    renderInventory();
    renderTerrainArtifacts();

    saveGame();
}

function addItemToInventory(newItem) {
    const existingItem = gameState.inventory.find(i => i.name === newItem.name);
    if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1;
    } else {
        newItem.quantity = newItem.quantity || 1;
        gameState.inventory.push(newItem);
    }
}

// --- STATS RECALCULATION ---
function recalculateStats() {
    let bonusClick = 0;
    let passiveDPS = 0;

    gameState.inventory.forEach(item => {
        bonusClick += item.clickBonus || 0;
        passiveDPS += item.dpsBonus || 0;
    });

    if (gameState.mealBuffActive) {
        passiveDPS += gameState.mealBuffValue || 1; // use value if set
    }

    gameState.bonusClickPower = bonusClick;
    gameState.passiveDPS = passiveDPS;

    const totalCount = gameState.inventory.reduce((sum, item) => sum + (item.quantity || 1), 0);
    document.getElementById('inv-count').innerText = totalCount;
}

// --- LAYER & PARASITIC NARRATIVE SHIFT ---
function updateLayerAndNarrative() {
    const massRatio = gameState.mass / gameState.maxMass;

    let newLayer = 1;
    if (massRatio < 0.8) newLayer = 2;
    if (massRatio < 0.5) newLayer = 3;
    if (massRatio < 0.25) newLayer = 4;
    if (massRatio < 0.08) newLayer = 5;

    if (newLayer !== gameState.layer) {
        gameState.layer = newLayer;
        renderMonster();
        addLogEntry(`STRUCTURAL BREAKDOWN! ${MONSTER_LAYERS[newLayer - 1].name}`);
    }

    if (massRatio < 0.75) gameState.assimilationStage = 1;
    if (massRatio < 0.40) gameState.assimilationStage = 2;
    if (massRatio < 0.15) gameState.assimilationStage = 3;
}

// --- RENDERING FUNCTIONS ---
function renderMonster() {
    const monsterEl = document.getElementById('monster-ascii');
    const layerObj = MONSTER_LAYERS[gameState.layer - 1];
    monsterEl.innerText = layerObj.ascii;
    document.getElementById('layer-display').innerText = layerObj.name;
}

function updateGoldUI() {
    const formattedGold = gameState.gold.toLocaleString();
    const goldDisplay = document.getElementById('gold-display');
    const shopGold = document.getElementById('shop-gold');

    if (goldDisplay) goldDisplay.innerText = formattedGold;
    if (shopGold) shopGold.innerText = formattedGold;
}

function updateStatsUI() {
    document.getElementById('mass-display').innerText = Math.floor(gameState.mass).toLocaleString();
    document.getElementById('dps-display').innerText = Math.floor(gameState.passiveDPS).toLocaleString();
    document.getElementById('click-display').innerText = Math.floor(gameState.baseClickPower + gameState.bonusClickPower).toLocaleString();
    updateGoldUI();
}

function renderInventory() {
    const container = document.getElementById('tab-inventory');
    container.innerHTML = '';

    if (gameState.inventory.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-xs text-slate-600 py-6">Your bag is empty.\nCollect scattered (*) drops during combat.</div>`;
        return;
    }

    gameState.inventory.forEach((item) => {
        const qty = item.quantity || 1;
        const displayName = qty > 1 ? `${item.name} (x${qty})` : item.name;
        const card = document.createElement('div');
        card.className = 'bg-slate-950 border border-slate-800 p-2 rounded-lg flex items-start justify-between gap-2 shadow-sm';
        card.innerHTML = `
            <div class="flex items-start gap-2 min-w-0">
                <div class="text-xl p-1.5 bg-slate-900 rounded border border-slate-800 shrink-0">${item.symbol}</div>
                <div class="min-w-0">
                    <div class="text-xs font-bold text-slate-200 truncate">${displayName}</div>
                    <div class="text-[10px] text-emerald-400 font-medium">
                        ${item.dpsBonus > 0 ? `+${item.dpsBonus} DPS` : ''} 
                        ${item.clickBonus > 0 ? `+${item.clickBonus} Click` : ''}
                    </div>
                    <div class="text-[9px] text-slate-500 italic truncate">${item.desc}</div>
                </div>
            </div>
            ${gameState.isNight && activeTownTab === 'shop' ? `
                <button onclick="sellItem('${item.uniqueId}')" class="px-2 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold rounded shrink-0">
                    Sell (${item.value || 15}🪙)
                </button>
            ` : ''}
        `;
        container.appendChild(card);
    });
}

let isHeaderExpanded = false;
function toggleHeaderExpand() {
    isHeaderExpanded = !isHeaderExpanded;
    const header = document.getElementById('app-header');
    const timerContainer = document.getElementById('header-timer-container');
    const menuBtnContainer = document.getElementById('header-menu-btn-container');

    if (isHeaderExpanded) {
        header.style.height = LAYOUT_CONFIG.headerExpandedHeight;
        timerContainer.classList.remove('hidden');
        menuBtnContainer.classList.remove('hidden');
        updateTotalGameTimeDisplay();
    } else {
        header.style.height = LAYOUT_CONFIG.headerHeight;
        timerContainer.classList.add('hidden');
        menuBtnContainer.classList.add('hidden');
    }
}

function openGameMenu() {
    document.getElementById('game-menu-overlay').classList.remove('hidden');
}

function closeGameMenu() {
    document.getElementById('game-menu-overlay').classList.add('hidden');
}

function resetGameProgress() {
    // Open our custom in-game confirmation modal instead of confirm()
    document.getElementById('custom-confirm-modal').classList.remove('hidden');
}

function closeConfirmModal() {
    document.getElementById('custom-confirm-modal').classList.add('hidden');
}

function executeGameReset() {

    // Clear LocalStorage
    localStorage.removeItem('billion_game_save');

    // Reset gameState properties to defaults
    gameState.mass = MASS_MAX;
    gameState.maxMass = MASS_MAX;
    gameState.baseClickPower = 1;
    gameState.bonusClickPower = 0;
    gameState.passiveDPS = 0;
    gameState.gold = 50;
    gameState.layer = 1;
    gameState.totalHits = 0;
    gameState.inventory = [];
    gameState.groundItems = [];
    gameState.milestonesReached.clear();
    gameState.assimilationStage = 0;
    gameState.dayNumber = 1;
    gameState.totalGameTime = 0;
    gameState.dayLengthMinutes = 2;
    gameState.timeRemaining = gameState.dayLengthMinutes * 60;
    gameState.isNight = false;
    gameState.mealBuffActive = false;
    gameState.mealBuffTimer = 0;
    gameState.mealBuffValue = 0;

    // Reset UI states & close overlays/menus
    closeGameMenu();
    if (isHeaderExpanded) toggleHeaderExpand();
    if (isInventoryExpanded) toggleExpandInventory();

    // Ensure combat screen is visible and town screen is hidden
    document.getElementById('town-screen').classList.add('hidden');
    document.getElementById('town-screen').classList.remove('flex');
    document.getElementById('combat-screen').classList.remove('hidden');
    document.getElementById('combat-screen').classList.add('flex');
    document.getElementById('meal-buff-indicator').classList.add('hidden');

    // Clear log and add starting entry
    document.getElementById('tab-log').innerHTML = '';

    // Reload the page for a clean process restart
    location.reload();
}

function addLogEntry(msg) {
    const logContainer = document.getElementById('tab-log');
    const entry = document.createElement('div');
    entry.className = 'border-l-2 border-sky-500/60 pl-2 py-0.5 text-slate-300 leading-snug';
    entry.innerText = `> ${msg}`;
    logContainer.prepend(entry);
}

// --- EXPAND / COLLAPSE INVENTORY PANEL ---
let isInventoryExpanded = false;
function toggleExpandInventory() {
    const panel = document.getElementById('inventory-panel');
    const expandIcon = document.getElementById('expand-icon');
    const expandText = document.getElementById('expand-text');
    const combatScreen = document.getElementById('combat-screen');
    const townScreen = document.getElementById('town-screen');

    isInventoryExpanded = !isInventoryExpanded;

    if (isInventoryExpanded) {
        // Hide combat and town screens so inventory takes up all remaining vertical space via flex-1
        combatScreen.classList.add('hidden');
        combatScreen.classList.remove('flex');
        townScreen.classList.add('hidden');
        townScreen.classList.remove('flex');

        expandIcon.innerText = "⤡";
        expandText.innerText = "Minimize";
    } else {
        // Restore active screen based on day/night state
        if (gameState.isNight) {
            townScreen.classList.remove('hidden');
            townScreen.classList.add('flex');
        } else {
            combatScreen.classList.remove('hidden');
            combatScreen.classList.add('flex');
        }

        expandIcon.innerText = "⤢";
        expandText.innerText = "Expand";
    }
}

// --- SWIPE GESTURE SUPPORT ON INVENTORY ---
function setupInventorySwipe() {
    const header = document.getElementById('inv-header');
    let startY = 0;

    header.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
    }, { passive: true });

    header.addEventListener('touchend', (e) => {
        const endY = e.changedTouches[0].clientY;
        const diffY = startY - endY;

        // Swipe up (diffY > 40px) expands, Swipe down (diffY < -40px) minimizes
        if (diffY > 40 && !isInventoryExpanded) {
            toggleExpandInventory();
        } else if (diffY < -40 && isInventoryExpanded) {
            toggleExpandInventory();
        }
    }, { passive: true });
}

// --- TAB SWITCHING (INVENTORY / LOG) ---
function switchTab(tabName) {
    const inventoryTab = document.getElementById('tab-inventory');
    const logTab = document.getElementById('tab-log');
    const invBtn = document.getElementById('tab-inv-btn');
    const logBtn = document.getElementById('tab-log-btn');

    if (tabName === 'inventory') {
        inventoryTab.classList.remove('hidden');
        logTab.classList.add('hidden');
        invBtn.className = 'py-2.5 px-3 font-bold text-sky-400 border-b-2 border-sky-400 transition-all';
        logBtn.className = 'py-2.5 px-3 font-bold text-slate-500 border-b-2 border-transparent transition-all';
        renderInventory();
    } else {
        inventoryTab.classList.add('hidden');
        logTab.classList.remove('hidden');
        logTab.classList.add('flex', 'flex-col');
        logBtn.className = 'py-2.5 px-3 font-bold text-sky-400 border-b-2 border-sky-400 transition-all';
        invBtn.className = 'py-2.5 px-3 font-bold text-slate-500 border-b-2 border-transparent transition-all';
    }
}

// --- FLOATING DAMAGE ANIMATION ---
function spawnFloatingDamage(text, x, y) {
    const layer = document.getElementById('damage-layer');
    const el = document.createElement('div');
    el.className = 'float-dmg text-sky-400 text-sm font-bold';
    el.innerText = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    layer.appendChild(el);

    setTimeout(() => {
        if (layer.contains(el)) {
            layer.removeChild(el);
        }
    }, 750);
}

// --- LOCAL STORAGE SAVE & LOAD ---
function saveGame() {
    const saveData = {
        timestamp: Date.now(),dayNumber: gameState.dayNumber,
        totalGameTime: gameState.totalGameTime,
        dayLengthMinutes: gameState.dayLengthMinutes,
        timeRemaining: gameState.timeRemaining,
        mass: gameState.mass,
        layer: gameState.layer,
        gold: gameState.gold,
        inventory: gameState.inventory,
        groundItems: gameState.groundItems, // <--- Persist ground items
        isNight: gameState.isNight,
        mealBuffActive: gameState.mealBuffActive,
        mealBuffTimer: gameState.mealBuffTimer,
        mealBuffValue: gameState.mealBuffValue
    };
    localStorage.setItem('billion_game_save', JSON.stringify(saveData));
}

function loadGame() {
    const saved = localStorage.getItem('billion_game_save');
    if (!saved) return;

    try {
        const data = JSON.parse(saved);
        gameState.dayNumber = data.dayNumber ?? gameState.dayNumber;
        gameState.dayLengthMinutes = data.dayLengthMinutes ?? gameState.dayLengthMinutes;
        gameState.timeRemaining = data.timeRemaining ?? gameState.timeRemaining;
        gameState.mass = data.mass ?? gameState.mass;
        gameState.layer = data.layer ?? gameState.layer;
        gameState.gold = data.gold ?? gameState.gold;
        gameState.inventory = (data.inventory || []).map(item => ({
            ...item,
            quantity: item.quantity ?? 1
        }));
        gameState.groundItems = data.groundItems ?? gameState.groundItems;
        gameState.isNight = data.isNight ?? gameState.isNight;
        gameState.mealBuffActive = data.mealBuffActive ?? gameState.mealBuffActive;
        gameState.mealBuffTimer = data.mealBuffTimer ?? gameState.mealBuffTimer;
        gameState.mealBuffValue = data.mealBuffValue ?? gameState.mealBuffValue;
        gameState.totalGameTime = data.totalGameTime ?? gameState.totalGameTime;

        // Simulate elapsed time if it was daytime when last saved/blurred
        if (!gameState.isNight && data.timestamp) {
            const elapsedSeconds = (Date.now() - data.timestamp) / 1000;
            if (elapsedSeconds > 0) {
                gameState.totalGameTime += elapsedSeconds;
                gameState.timeRemaining -= elapsedSeconds;

                if (gameState.mealBuffActive) {
                    gameState.mealBuffTimer = Math.max(0, gameState.mealBuffTimer - elapsedSeconds);
                    if (gameState.mealBuffTimer <= 0) {
                        gameState.mealBuffActive = false;
                    }
                }

                if (gameState.timeRemaining <= 0) {
                    gameState.timeRemaining = 0;
                    gameState.isNight = true;
                    gameState.groundItems = []; // Discard unclaimed ground items when entering night
                }
            }
        }

        // Restore screen state
        if (gameState.isNight) {
            document.getElementById('combat-screen').classList.add('hidden');
            document.getElementById('combat-screen').classList.remove('flex');
            document.getElementById('town-screen').classList.remove('hidden');
            document.getElementById('town-screen').classList.add('flex');
            switchTownTab('shop');
        } else {
            document.getElementById('town-screen').classList.add('hidden');
            document.getElementById('town-screen').classList.remove('flex');
            document.getElementById('combat-screen').classList.remove('hidden');
            document.getElementById('combat-screen').classList.add('flex');
        }
    } catch (e) {
        console.error("Failed to parse save data:", e);
    }

    renderInventory();
    renderTerrainArtifacts();

    const slider = document.getElementById('day-length-slider');
    if (slider) {
        slider.value = gameState.dayLengthMinutes;
        document.getElementById('day-length-label').innerText = `${gameState.dayLengthMinutes} Minute${gameState.dayLengthMinutes > 1 ? 's' : ''}`;
    }
}
