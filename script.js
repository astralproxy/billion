/**
 * BILLION - Game Engine with Day/Night Loop & Town System
 */

let idCounter = 0;
function generateUniqueId() {
    idCounter++;
    return `item-${Date.now()}-${idCounter}-${Math.random().toString(36).substr(2, 5)}`;
}

// --- GAME STATE ---
const gameState = {
    mass: 1000000000,
    maxMass: 1000000000,
    baseClickPower: 1,
    bonusClickPower: 0,
    passiveDPS: 0,
    gold: 50,
    layer: 1,
    totalHits: 0,
    inventory: [],     // Items in bag
    groundItems: [],   // Scattered '*' artifact drops on terrain { uniqueId, itemData, left, bottom }
    milestonesReached: new Set(),
    assimilationStage: 0,
    
    // DAY / NIGHT & TOWN MECHANICS
    dayNumber: 1,
    timeRemaining: 300, // 5 minutes (300s)
    isNight: false,
    mealBuffActive: false,
    mealBuffTimer: 0 // Duration in seconds
};

// --- ITEM DATABASE ---
const ITEM_DATABASE = [
    { typeId: 'rusted_blade', name: 'Rusted Greatsword', symbol: '🗡️', clickBonus: 8, dpsBonus: 3, value: 20, rarity: 'Common', desc: 'Embedded deep by a fallen wanderer.' },
    { typeId: 'chipped_axe', name: 'Shattered Battleaxe', symbol: '🪓', clickBonus: 18, dpsBonus: 1, value: 35, rarity: 'Common', desc: 'Wedged into the outer debris crust.' },
    { typeId: 'spiked_mace', name: 'Obsidian Mace', symbol: '🔨', clickBonus: 35, dpsBonus: 20, value: 75, rarity: 'Uncommon', desc: 'Heavy weight dislodged from deeper layers.' },
    { typeId: 'ancient_ring', name: 'Parasitic Band', symbol: '💍', clickBonus: 5, dpsBonus: 75, value: 150, rarity: 'Rare', desc: 'It pulses rhythmically with your heart.' },
    { typeId: 'relic_shard', name: 'Living Core Shard', symbol: '🔮', clickBonus: 150, dpsBonus: 300, value: 400, rarity: 'Legendary', desc: 'Fuses directly into your flesh upon contact.' }
];

// --- SHOP ITEMS ---
const SHOP_ITEMS = [
    { id: 'sharpening_stone', name: 'Grindstone', price: 60, clickBonus: 12, dpsBonus: 0, desc: 'Increases click power by +12.' },
    { id: 'auto_hammer', name: 'Clockwork Chisel', price: 120, clickBonus: 0, dpsBonus: 25, desc: 'Automated chisel deals +25 DPS.' },
    { id: 'reinforced_gauntlet', name: 'Iron Gauntlet', price: 250, clickBonus: 50, dpsBonus: 15, desc: 'Heavy iron gauntlet (+50 Click, +15 DPS).' }
];

// --- MEALS ---
const MEALS = [
    { id: 'hearty_stew', name: 'Adventurer\'s Stew', price: 30, dpsBuff: 1, desc: '+1 Extra DPS for 1 Full Hour of combat.' },
    { id: 'roast_feast', name: 'Monster Steak Feast', price: 80, dpsBuff: 10, desc: '+10 Extra DPS for 1 Full Hour of combat.' }
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

    // Click Handler for Monster Arena & Attack Button
    document.getElementById('arena').addEventListener('click', handleAttack);
    document.getElementById('attack-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        handleAttack(e);
    });

    // Initialize Swipe Events for Inventory Expansion
    setupInventorySwipe();
    renderShop();
    renderMeals();
};

// --- GAME TICK (10 TICKS / SEC) ---
function gameTick() {
    // 1. DAY/NIGHT TIMER MANAGEMENT
    if (!gameState.isNight) {
        gameState.timeRemaining -= 0.1;
        if (gameState.timeRemaining <= 0) {
            gameState.timeRemaining = 0;
            triggerNightPhase();
        }
        updateTimeDisplay();
    }

    // 2. MEAL BUFF TIMER TICK
    if (gameState.mealBuffActive && gameState.mealBuffTimer > 0) {
        gameState.mealBuffTimer -= 0.1;
        if (gameState.mealBuffTimer <= 0) {
            gameState.mealBuffActive = false;
            addLogEntry("Your meal buff has worn off.");
            recalculateStats();
        }
    }

    // 3. PASSIVE COMBAT DPS
    if (!gameState.isNight && gameState.passiveDPS > 0) {
        const damagePerTick = gameState.passiveDPS / 10;
        applyDamage(damagePerTick, false);
    }
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
    document.getElementById('combat-screen').classList.add('hidden');
    document.getElementById('town-screen').classList.remove('hidden');
    document.getElementById('town-screen').classList.add('flex');
    
    addLogEntry(`DUSK FALLS. Day ${gameState.dayNumber} combat has ended. You return to Town.`);
    updateTimeDisplay();
    renderCraftingSlots();

    saveGame();
}

// --- TOWN SYSTEM TABS ---
function switchTownTab(tabName) {
    const tabs = ['shop', 'craft', 'eat', 'rest'];
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
}

// --- SHOP LOGIC ---
function renderShop() {
    const container = document.getElementById('shop-item-list');
    document.getElementById('shop-gold').innerText = gameState.gold;
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
    gameState.inventory.push({
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

    addLogEntry(`Sold [${item.name}] for ${sellPrice} Gold.`);
    recalculateStats();
    renderShop();
    renderInventory();
    renderCraftingSlots();

    saveGame();
}

// --- CRAFTING LOGIC ---
function renderCraftingSlots() {
    const container = document.getElementById('town-content-craft');
    const slotArea = document.getElementById('craft-slots');
    slotArea.innerHTML = '';

    // Group duplicates in inventory by typeId
    const counts = {};
    gameState.inventory.forEach(item => {
        counts[item.typeId] = (counts[item.typeId] || 0) + 1;
    });

    const duplicates = Object.keys(counts).filter(typeId => counts[typeId] >= 2);

    if (duplicates.length === 0) {
        slotArea.innerHTML = `<div class="text-xs text-slate-600 text-center py-6 italic">No duplicate gear available to fuse. Collect more items during the day!</div>`;
        return;
    }

    duplicates.forEach(typeId => {
        const sampleItem = gameState.inventory.find(i => i.typeId === typeId);
        const count = counts[typeId];

        const card = document.createElement('div');
        card.className = 'bg-slate-950 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between';
        card.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="text-xl">${sampleItem.symbol}</span>
                <div>
                    <div class="text-xs font-bold text-slate-200">${sampleItem.name} <span class="text-amber-400 font-mono">(x${count})</span></div>
                    <div class="text-[10px] text-slate-400">Combine 2 into an Upgraded +50% Powered version.</div>
                </div>
            </div>
            <button onclick="craftCombine('${typeId}')" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded transition-colors shrink-0">
                Smelt 2x
            </button>
        `;
        slotArea.appendChild(card);
    });
}

function craftCombine(typeId) {
    // Find two instances of typeId
    const matchingIndices = [];
    gameState.inventory.forEach((item, index) => {
        if (item.typeId === typeId) matchingIndices.push(index);
    });

    if (matchingIndices.length < 2) return;

    // Remove the two items (back to front)
    const item1 = gameState.inventory.splice(matchingIndices[1], 1)[0];
    const item2 = gameState.inventory.splice(matchingIndices[0], 1)[0];

    // Create Fused Upgraded Version
    const fusedItem = {
        uniqueId: generateUniqueId(),
        typeId: `${typeId}_fused`,
        name: `Forged ${item1.name}`,
        symbol: item1.symbol,
        clickBonus: Math.round(item1.clickBonus * 1.6) + 5,
        dpsBonus: Math.round(item1.dpsBonus * 1.6) + 5,
        value: Math.round((item1.value || 20) * 2.2),
        rarity: 'Forged',
        desc: `Smelted at the town forge. Power vastly amplified.`
    };

    gameState.inventory.push(fusedItem);
    addLogEntry(`SMELTED 2x [${item1.name}] into [${fusedItem.name}]!`);
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
        addLogEntry("Not enough gold to purchase a meal!");
        return;
    }

    gameState.gold -= meal.price;
    gameState.mealBuffActive = true;
    gameState.mealBuffTimer = 3600; // 1 Hour real-time buff
    document.getElementById('meal-buff-indicator').classList.remove('hidden');

    addLogEntry(`Ate [${meal.name}]! Gained +${meal.dpsBuff} Extra DPS for 1 Hour.`);
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
        gameState.timeRemaining = 300; // Reset 5 minutes combat timer
        gameState.isNight = false;

        document.getElementById('town-screen').classList.add('hidden');
        document.getElementById('town-screen').classList.remove('flex');
        document.getElementById('combat-screen').classList.remove('hidden');

        updateTimeDisplay();
        addLogEntry(`DAWN BREAKS. Day ${gameState.dayNumber} has begun. Strike the mass!`);

        setTimeout(() => {
            sleepOverlay.style.opacity = '0';
            sleepOverlay.classList.add('pointer-events-none');
        }, 1000);
    }, 2000);

    saveGame();
}

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
    dropEl.className = 'ejecting-item text-amber-300 font-bold text-xl cursor-pointer select-none star-artifact';
    dropEl.innerText = '*';

    // Scatter coordinates on terrain (percentages relative to arena)
    const scatterLeft = 10 + Math.random() * 80; 
    const scatterBottom = 10 + Math.random() * 35; // px from bottom

    dropEl.style.left = `${scatterLeft}%`;
    dropEl.style.bottom = `${scatterBottom}px`;

    dropLayer.appendChild(dropEl);

    // Remove from temporary drop layer and add to permanent ground terrain after animation finishes (600ms)
    setTimeout(() => {
        if (dropLayer.contains(dropEl)) {
            dropLayer.removeChild(dropEl);
        }
        addToGroundTerrain(groundItem, scatterLeft, scatterBottom);
    }, 600);
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
        starDiv.className = 'absolute text-amber-300 font-bold text-lg hover:scale-150 transition-transform star-artifact cursor-pointer p-1';
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
    gameState.inventory.push(item);

    // Add Narrative log revealing full item name upon collection
    const msgs = PARASITIC_MESSAGES[gameState.assimilationStage];
    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    addLogEntry(`Picked up shiny drop (*). Revealed as [${item.name}]! ${msg}`);

    recalculateStats();
    renderInventory();
    renderTerrainArtifacts();

    saveGame();
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
        passiveDPS += 1;
    }

    gameState.bonusClickPower = bonusClick;
    gameState.passiveDPS = passiveDPS;

    document.getElementById('inv-count').innerText = gameState.inventory.length;
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
        addLogEntry(`STRUCTURAL BREAKDOWN: Monster degraded to ${MONSTER_LAYERS[newLayer - 1].name}!`);
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

function updateStatsUI() {
    document.getElementById('mass-display').innerText = Math.floor(gameState.mass).toLocaleString();
    document.getElementById('dps-display').innerText = Math.floor(gameState.passiveDPS).toLocaleString();
    document.getElementById('click-display').innerText = Math.floor(gameState.baseClickPower + gameState.bonusClickPower).toLocaleString();
    document.getElementById('gold-display').innerText = gameState.gold.toLocaleString();
}

function renderInventory() {
    const container = document.getElementById('tab-inventory');
    container.innerHTML = '';

    if (gameState.inventory.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-xs text-slate-600 py-6">Your bag is empty. Collect scattered (*) drops during combat!</div>`;
        return;
    }

    gameState.inventory.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'bg-slate-950 border border-slate-800 p-2 rounded-lg flex items-start justify-between gap-2 shadow-sm';
        card.innerHTML = `
            <div class="flex items-start gap-2 min-w-0">
                <div class="text-xl p-1.5 bg-slate-900 rounded border border-slate-800 shrink-0">${item.symbol}</div>
                <div class="min-w-0">
                    <div class="text-xs font-bold text-slate-200 truncate">${item.name}</div>
                    <div class="text-[10px] text-emerald-400 font-medium">
                        ${item.dpsBonus > 0 ? `+${item.dpsBonus} DPS` : ''} 
                        ${item.clickBonus > 0 ? `+${item.clickBonus} Click` : ''}
                    </div>
                    <div class="text-[9px] text-slate-500 italic truncate">${item.desc}</div>
                </div>
            </div>
            ${gameState.isNight ? `
                <button onclick="sellItem('${item.uniqueId}')" class="px-2 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold rounded shrink-0">
                    Sell (${item.value || 15}🪙)
                </button>
            ` : ''}
        `;
        container.appendChild(card);
    });
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

    isInventoryExpanded = !isInventoryExpanded;

    if (isInventoryExpanded) {
        panel.className = "h-3/4 flex flex-col bg-slate-900/95 border border-slate-800 rounded-xl overflow-hidden shrink-0 shadow-2xl transition-all duration-300 relative z-30";
        expandIcon.innerText = "⤡";
        expandText.innerText = "Minimize";
    } else {
        panel.className = "h-1/3 min-h-[160px] flex flex-col bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shrink-0 shadow-lg transition-all duration-300 relative";
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
    const invTab = document.getElementById('tab-inventory');
    const logTab = document.getElementById('tab-log');
    const invBtn = document.getElementById('tab-inv-btn');
    const logBtn = document.getElementById('tab-log-btn');

    if (tabName === 'inventory') {
        invTab.classList.remove('hidden');
        logTab.classList.add('hidden');
        invBtn.className = 'py-2.5 px-3 font-bold text-sky-400 border-b-2 border-sky-400 transition-all';
        logBtn.className = 'py-2.5 px-3 font-bold text-slate-500 border-b-2 border-transparent transition-all';
    } else {
        invTab.classList.add('hidden');
        logTab.classList.remove('hidden');
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
        dayNumber: gameState.dayNumber,
        timeRemaining: gameState.timeRemaining,
        mass: gameState.mass,
        layer: gameState.layer,
        gold: gameState.gold,
        inventory: gameState.inventory,
        groundItems: gameState.groundItems, // <--- Persist ground items
        isNight: gameState.isNight,
        mealBuffActive: gameState.mealBuffActive,
        mealBuffTimer: gameState.mealBuffTimer
    };
    localStorage.setItem('billion_game_save', JSON.stringify(saveData));
}

function loadGame() {
    const saved = localStorage.getItem('billion_game_save');
    if (!saved) return;

    try {
        const data = JSON.parse(saved);
        gameState.dayNumber = data.dayNumber ?? gameState.dayNumber;
        gameState.timeRemaining = data.timeRemaining ?? gameState.timeRemaining;
        gameState.mass = data.mass ?? gameState.mass;
        gameState.layer = data.layer ?? gameState.layer;
        gameState.gold = data.gold ?? gameState.gold;
        gameState.inventory = data.inventory ?? gameState.inventory;
        gameState.groundItems = data.groundItems ?? gameState.groundItems; // <--- Load ground items
        gameState.isNight = data.isNight ?? gameState.isNight;
        gameState.mealBuffActive = data.mealBuffActive ?? gameState.mealBuffActive;
        gameState.mealBuffTimer = data.mealBuffTimer ?? gameState.mealBuffTimer;

        // Restore screen state if loaded during night phase
        if (gameState.isNight) {
            document.getElementById('combat-screen').classList.add('hidden');
            document.getElementById('town-screen').classList.remove('hidden');
            document.getElementById('town-screen').classList.add('flex');
        }
    } catch (e) {
        console.error("Failed to parse save data:", e);
    }
}