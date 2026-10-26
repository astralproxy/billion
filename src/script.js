/**
 * BILLION - Game Engine with Day/Night Loop & Town System
 */

import { DEBUG_ENABLED, SHEET_CSV_URLS } from "./config.js";
import { loadGameContent } from "./content.js";

let ITEM_DATABASE = [];
let SHOP_ITEMS = [];
let MEALS = [];

// --- LAYOUT CONFIGURATION CONSTANTS ---
const LAYOUT_CONFIG = {
    headerHeight: '10vh',            // Tune header height here
    headerExpandedHeight: '20vh',   // Expanded header height
    mainHeight: '60vh',             // Tune combat/town screen height here
    // Inventory uses flex-1 to fill the rest automatically, 
    // but min/max heights for expansion can be configured here:
    invMinHeight: '180px',
    invExpandedHeight: '82vh'       // Expanded inventory height to cover combat + spacing
};

// --- GAME CONSTANTS ---
const MASS_MAX = 1000000000;    // total monster mass
const MEAL_BUFF_DURATION = 60;  // 1 game hour, in seconds
const DROP_RATE = 8;            // percent chance for a drop on click, less for passive DPS
const MAX_DROPS_ON_GROUND = 10; // Stop drops here until some are picked up
// DAY_LENGTH is dynamically calculated from gameState.dayLengthMinutes * 60

const LAYER_THRESHOLDS = [
    { threshold: 0.1, layer: 5 },
    { threshold: 0.35, layer: 4 },
    { threshold: 0.65,  layer: 3 },
    { threshold: 0.9,  layer: 2 }
];

const UPGRADE_TIERS = ['Forged', 'Enhanced', 'Superior'];

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
    inventory: [],          // Items in bag
    groundItems: [],        // Scattered '*' artifact drops on terrain 
    milestonesReached: new Set(),
    assimilationStage: 0,
    
    // DAY / NIGHT & TOWN MECHANICS
    dayNumber: 1,
    totalGameTime: 0,       // in seconds
    dayLengthMinutes: 2,    // Default 2 minutes
    timeRemaining: 120,     // Initialized to 2 minutes in seconds
    isNight: false,
    mealBuffActive: false,
    mealBuffTimer: 0,       // Duration in seconds
    mealBuffValue: 0,       // Stores the active meal's dpsBuff value
    mealBuffSymbol: '',
    buybackList: [],        // Track up to 5 recently sold items

    // DEBUG OPTIONS
    autoLoot: false,
    dropRate: DROP_RATE,
    showMeldAll: true,
};

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
window.onload = async () => {
    document.getElementById('app-header').style.height = LAYOUT_CONFIG.headerHeight;
    document.getElementById('combat-screen').style.height = LAYOUT_CONFIG.mainHeight;
    document.getElementById('town-screen').style.height = LAYOUT_CONFIG.mainHeight;

    // Hide mass-display if debugging is disabled
    if (!DEBUG_ENABLED) {
        const massDisplay = document.getElementById('mass-display');
        if (massDisplay) massDisplay.classList.add('hidden');
    }

    document.getElementById('app-header').addEventListener('click', toggleHeaderExpand);

    try {
        // Load content dynamically from Google Sheets CSVs
        const content = await loadGameContent(SHEET_CSV_URLS);
        ITEM_DATABASE = content.artifacts;
        SHOP_ITEMS = content.shop;
        MEALS = content.meals;
    } catch (error) {
        console.error("Failed to load game content from sheets:", error);
        addLogEntry("Error loading game data from Google Sheets.");
    }

    loadGame();

    renderMonster();
    recalculateStats(); 
    updateStatsUI();
    updateTimeDisplay();
    renderTerrainArtifacts();

    if (!gameState.isNight) {
        addLogEntry("You stand before the massive anomaly.");
    }
    
    setInterval(gameTick, 100);
    setInterval(saveGame, 10000);

    const arena = document.getElementById('arena');
    arena.addEventListener('click', handleAttack);

    if (DEBUG_ENABLED) {
        let autoClickHoldTimeout = null;
        let autoClickHoldInterval = null;

        const stopHold = () => {
            if (autoClickHoldTimeout) {
                clearTimeout(autoClickHoldTimeout);
                autoClickHoldTimeout = null;
            }
            if (autoClickHoldInterval) {
                clearInterval(autoClickHoldInterval);
                autoClickHoldInterval = null;
            }
        };

        const startHold = (e) => {
            stopHold();
            // Start auto-attacking after holding for 300ms
            autoClickHoldTimeout = setTimeout(() => {
                autoClickHoldInterval = setInterval(() => {
                    handleAttack(e);
                }, 500);
            }, 500);
        };

        arena.addEventListener('mousedown', startHold);
        arena.addEventListener('mouseup', stopHold);
        arena.addEventListener('mouseleave', stopHold);
        arena.addEventListener('touchstart', startHold, { passive: true });
        arena.addEventListener('touchend', stopHold);
        arena.addEventListener('touchcancel', stopHold);
    }

    setupInventorySwipe();
    renderShop();
    renderMeals();

    // Special key combo listener(s)
    document.addEventListener('keydown', (e) => {
        if (e.shiftKey && e.altKey && (e.key === 'D' || e.key === 'd')) {
            e.preventDefault();
            applyDamage(100000000, false);
            spawnFloatingDamage('-100,000,000', window.innerWidth / 2, window.innerHeight / 2);
            addLogEntry("SECRET COMBO ACTIVATED: 100,000,000 Damage!");
        }
    });
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

    // Increment total game time during day, or at night if the window has focus
    if (!gameState.isNight || document.hasFocus()) {
        gameState.totalGameTime += delta;
        updateTotalGameTimeDisplay();
    }

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
            gameState.mealBuffSymbol = ''; // Clear symbol
            
            // Hide indicator element
            const indicator = document.getElementById('meal-buff-indicator');
            if (indicator) {
                indicator.classList.add('hidden');
                indicator.innerText = '';
            }

            addLogEntry("Your meal buff has worn off.");
            recalculateStats();
            updateStatsUI();
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

//#region DEBUG SETTINGS
function updateAutoLootSetting(isChecked) {
    gameState.autoLoot = isChecked;
}

function updateDropRateSetting(val) {
    const rate = parseInt(val, 10);
    gameState.dropRate = rate;
    const label = document.getElementById('drop-rate-label');
    if (label) {
        label.innerText = `${rate}%`;
    }
}

function updateShowMeldAllSetting(isChecked) {
    gameState.showMeldAll = isChecked;
    updateMeldAllButtonVisibility();
}

function updateMeldAllButtonVisibility() {
    const btn = document.getElementById('meld-all-btn');
    if (btn) {
        btn.classList.toggle('hidden', !gameState.showMeldAll);
    }
}
//#endregion

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

    // Set text for Night / Town transition
    document.getElementById('sleep-title').innerHTML = "<b>DAY ENDED</b>";
    document.getElementById('sleep-subtitle').innerText = "Returning to Town";

    // Trigger the sleep overlay transition
    const sleepOverlay = document.getElementById('sleep-overlay');
    sleepOverlay.classList.remove('pointer-events-none');
    sleepOverlay.style.opacity = '1';

    setTimeout(() => {
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

        // Fade overlay back out
        setTimeout(() => {
            sleepOverlay.style.opacity = '0';
            sleepOverlay.classList.add('pointer-events-none');
        }, 1000);
    }, 2000); // 1-second pause matching your request
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

    const buybackBtn = document.getElementById('buyback-btn');
    if (buybackBtn) {
        buybackBtn.classList.toggle('hidden', gameState.buybackList.length === 0 && !isViewingBuyBack);
    }

    if (isViewingBuyBack) {
        if (gameState.buybackList.length === 0) {
            container.innerHTML = `<div class="col-span-full text-xs text-slate-600 text-center py-6 italic">No recently sold items to buy back.</div>`;
            return;
        }

        gameState.buybackList.forEach((item, index) => {
            const qty = item.quantity || 1;
            const displayName = qty > 1 ? `${item.name} (x${qty})` : item.name;
            const unitPrice = item.sellPrice || calculateItemValue(item.clickBonus || 0, item.dpsBonus || 0);
            const totalCost = unitPrice * qty;

            const tierPill = item.upgradeLevel && item.upgradeLevel > 0
                ? `<span class="text-[9px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded inline-block mb-0.5">${UPGRADE_TIERS[item.upgradeLevel - 1]}</span>`
                : '';
            const div = document.createElement('div');
            div.className = 'bg-slate-950 border border-slate-800 p-2.5 rounded-lg flex justify-between items-center';
            div.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="text-xl">${item.symbol}</span>
                    <div>
                        ${tierPill}
                        <div class="text-xs font-bold text-slate-200">${displayName}</div>
                        <div class="text-[10px] text-emerald-400 font-medium">
                            ${item.dpsBonus > 0 ? `+${item.dpsBonus} DPS` : ''} 
                            ${item.clickBonus > 0 ? `+${item.clickBonus} Click` : ''}
                        </div>
                    </div>
                </div>

                <button onclick="buyBackItem(${index})" class="px-3 py-1.5 bg-sky-600/20 border border-sky-500/50 hover:bg-sky-600 hover:text-white text-sky-300 text-xs font-bold rounded transition-colors shrink-0">
                    Value: ${totalCost} 🪙
                </button>
            `;
            container.appendChild(div);
        });
        return;
    }

    // Filter shop items unlocked up to the player's current layer
    const availableShopItems = SHOP_ITEMS.filter(item => (item.layer || 1) <= gameState.layer);

    if (availableShopItems.length === 0) {
        container.innerHTML = `<div class="text-xs text-slate-600 text-center py-6 italic">No gear available right now.</div>`;
        return;
    }

    availableShopItems.forEach(item => {
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
        upgradeLevel: 0,
        desc: item.desc
    });

    addLogEntry(`Bought [${item.name}] from shop.`);
    recalculateStats();
    updateStatsUI();
    renderShop();
    renderInventory();

    saveGame();
}

let isViewingBuyBack = false;

function sellItem(uniqueId) {
    const index = gameState.inventory.findIndex(i => i.uniqueId === uniqueId);
    if (index === -1) return;

    const item = gameState.inventory[index];
    const qty = item.quantity || 1;
    if (qty < 10) return;

    // Keep 1, sell (qty - 1)
    const sellCount = qty - 1;
    const singlePrice = item.value || calculateItemValue(item.clickBonus || 0, item.dpsBonus || 0);
    const totalPrice = singlePrice * sellCount;

    gameState.gold += totalPrice;

    // Track for buyback with the full sold quantity
    const itemCopy = { 
        ...item, 
        quantity: sellCount, 
        value: singlePrice,
        sellPrice: singlePrice 
    };
    gameState.buybackList.unshift(itemCopy);
    if (gameState.buybackList.length > 5) {
        gameState.buybackList.pop();
    }

    // Retain only 1 in inventory
    item.quantity = 1;
    addLogEntry(`Sold ${sellCount}x [${item.name}] for ${totalPrice} Gold (Kept 1).`);

    recalculateStats();
    updateStatsUI();
    renderShop();
    renderInventory();
    renderCraftingSlots();

    saveGame();
}

function sellAllMinusOne(uniqueId) {
    const index = gameState.inventory.findIndex(i => i.uniqueId === uniqueId);
    if (index === -1) return;

    const item = gameState.inventory[index];
    const qty = item.quantity || 1;
    if (qty < 10) return;

    // Sell everything except 1
    const sellCount = qty - 1;
    const singlePrice = calculateItemValue(item.clickBonus || 0, item.dpsBonus || 0);
    const totalPrice = singlePrice * sellCount;

    gameState.gold += totalPrice;

    // Push to buyback list with the exact quantity sold
    const itemCopy = { 
        ...item, 
        quantity: sellCount, 
        value: singlePrice,
        sellPrice: singlePrice 
    };
    gameState.buybackList.unshift(itemCopy);
    if (gameState.buybackList.length > 5) {
        gameState.buybackList.pop();
    }

    // Leave exactly 1 in bag
    item.quantity = 1;
    addLogEntry(`Sold ${sellCount}x [${item.name}] for ${totalPrice} Gold (Kept 1).`);

    recalculateStats();
    updateStatsUI();
    renderShop();
    renderInventory();
    renderCraftingSlots();

    saveGame();
}

function toggleBuyBackView() {
    isViewingBuyBack = !isViewingBuyBack;
    const btn = document.getElementById('buyback-btn');
    if (btn) {
        if (isViewingBuyBack) {
            btn.innerText = "Return to Shop";
            btn.className = "bg-sky-600/20 border border-sky-500/50 px-2 py-2 hover:bg-sky-600 hover:text-white text-sky-300 text-[10px] font-bold rounded transition-colors shrink-0";
        } else {
            btn.innerText = "Buy Back";
            btn.className = "bg-amber-500/20 border border-amber-500/50 px-2 py-2 hover:bg-amber-500 hover:text-slate-950 text-amber-300 text-[10px] font-bold rounded transition-colors shrink-0";
        }
    }
    renderShop();
}

function buyBackItem(index) {
    const item = gameState.buybackList[index];
    if (!item) return;

    const qty = item.quantity || 1;
    const unitPrice = item.sellPrice || calculateItemValue(item.clickBonus || 0, item.dpsBonus || 0);
    const totalCost = unitPrice * qty;

    if (gameState.gold < totalCost) {
        addLogEntry("Not enough gold to buy back item stack!");
        return;
    }

    gameState.gold -= totalCost;
    gameState.buybackList.splice(index, 1);

    // Remove temporary tracking properties and preserve the stack quantity
    const { sellPrice, ...cleanItem } = item;
    cleanItem.uniqueId = generateUniqueId();
    cleanItem.quantity = qty; // <--- Explicitly preserve the bought-back quantity
    addItemToInventory(cleanItem);

    addLogEntry(`Bought back [${cleanItem.name}] (x${qty}) for ${totalCost} Gold.`);
    recalculateStats();
    updateStatsUI();
    renderShop();
    renderInventory();

    saveGame();
}

// --- CRAFTING LOGIC ---
function renderCraftingSlots() {
    const slotArea = document.getElementById('craft-slots');
    slotArea.innerHTML = '';

    // Filter stackable items (quantity >= 2) and exclude items at max upgrade level
    const stackableItems = gameState.inventory.filter(item => {
        const qty = item.quantity || 1;
        const level = item.upgradeLevel || 0;
        return qty >= 2 && level < UPGRADE_TIERS.length;
    });

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
                MELD
            </button>
        `;
        slotArea.appendChild(card);
    });
}

function craftCombine(uniqueId) {
    const item = gameState.inventory.find(i => i.uniqueId === uniqueId);
    if (!item || (item.quantity || 1) < 2) return;

    const currentLevel = item.upgradeLevel || 0;
    
    // Enforce maximum upgrade limit (3 levels)
    if (currentLevel >= UPGRADE_TIERS.length) {
        addLogEntry(`[${item.name}] has already reached maximum upgrade tier (${UPGRADE_TIERS[UPGRADE_TIERS.length - 1]}).`);
        return;
    }

    item.quantity -= 2;
    if (item.quantity <= 0) {
        const index = gameState.inventory.findIndex(i => i.uniqueId === uniqueId);
        gameState.inventory.splice(index, 1);
    }

    const nextLevel = currentLevel + 1;
    const tierPrefix = UPGRADE_TIERS[nextLevel - 1];
    const baseName = item.baseName || item.name;

    // Calculate new stats and value
    const newClickBonus = Math.round(item.clickBonus * 1.5) + 5;
    const newDpsBonus = Math.round(item.dpsBonus * 1.5) + 5;
    const computedValue = calculateItemValue(newClickBonus, newDpsBonus);

    const fusedItem = {
        uniqueId: generateUniqueId(),
        typeId: `${item.typeId}_t${nextLevel}`,
        baseName: baseName,
        name: `${baseName}`, // base only, upgrade status is a separate pill
        symbol: item.symbol,
        clickBonus: newClickBonus,
        dpsBonus: newDpsBonus,
        value: computedValue,
        rarity: tierPrefix,
        upgradeLevel: nextLevel,
        desc: `Melded to tier ${nextLevel} (${tierPrefix}). Power amplified.`
    };

    addItemToInventory(fusedItem);
    addLogEntry(`MELDED [${fusedItem.name}] (Tier ${nextLevel}/3)!`);
    recalculateStats();
    updateStatsUI();
    renderCraftingSlots();
    renderInventory();

    saveGame();
}

function meldAllItems() {
    let meldedAny = false;
    let iterations = 0;

    // Run silently without DOM re-renders or saves inside the loop
    while (iterations < 100) {
        const stackableItems = gameState.inventory.filter(item => (item.quantity || 1) >= 2);
        if (stackableItems.length === 0) break;

        let madeProgress = false;
        stackableItems.forEach(item => {
            while ((item.quantity || 1) >= 2) {
                const currentLevel = item.upgradeLevel || 0;
                if (currentLevel >= UPGRADE_TIERS.length) break;

                item.quantity -= 2;
                if (item.quantity <= 0) {
                    const index = gameState.inventory.findIndex(i => i.uniqueId === item.uniqueId);
                    if (index !== -1) gameState.inventory.splice(index, 1);
                }

                const nextLevel = currentLevel + 1;
                const tierPrefix = UPGRADE_TIERS[nextLevel - 1];
                const baseName = item.baseName || item.name;

                const newClickBonus = Math.round(item.clickBonus * 1.5) + 5;
                const newDpsBonus = Math.round(item.dpsBonus * 1.5) + 5;

                const fusedItem = {
                    uniqueId: generateUniqueId(),
                    typeId: `${item.typeId}_t${nextLevel}`,
                    baseName: baseName,
                    name: `${baseName}`, // base only, upgrade status is a separate pill
                    symbol: item.symbol,
                    clickBonus: newClickBonus,
                    dpsBonus: newDpsBonus,
                    value: calculateItemValue(newClickBonus, newDpsBonus),
                    rarity: tierPrefix,
                    upgradeLevel: nextLevel,
                    desc: `Smelted to tier ${nextLevel} (${tierPrefix}). Power amplified.`
                };

                addItemToInventory(fusedItem);
                meldedAny = true;
                madeProgress = true;
            }
        });

        if (!madeProgress) break;
        iterations++;
    }

    if (meldedAny) {
        // Refresh UI and save exactly once after all fusing is finished
        recalculateStats();
        updateStatsUI();
        renderCraftingSlots();
        renderInventory();
        saveGame();
        addLogEntry("Recursive meld complete: All eligible duplicate gear merged.");
    } else {
        addLogEntry("No duplicate gear available to meld.");
    }
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
    gameState.mealBuffSymbol = meal.symbol || '🍴';

    // Show indicator element
    const indicator = document.getElementById('meal-buff-indicator');
    if (indicator) {
        indicator.innerText = gameState.mealBuffSymbol;
        indicator.classList.remove('hidden');
    }

    addLogEntry(`Ate [${meal.name}].\nGained +${meal.dpsBuff} extra DPS for 1 (game) hour.`);
    recalculateStats();
    updateStatsUI();
    renderShop();

    saveGame();
}

// --- REST LOGIC ---
function confirmRest() {
    // Set text back for Dawn transition
    document.getElementById('sleep-title').innerText = "DAWN OF A NEW DAY";
    document.getElementById('sleep-subtitle').innerText = "The monster awaits...";

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

        gameState.groundItems = [];
        renderTerrainArtifacts();

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

    if (gameState.mass <= 0) {
        triggerMassEliminatedSequence();
        return;
    }

    checkDropTriggers(amount, isDirectClick);
    updateLayerAndNarrative();
    updateStatsUI();
}

function triggerMassEliminatedSequence() {
    document.getElementById('sleep-title').innerHTML = "<b>MASS ELIMINATED</b>";
    document.getElementById('sleep-subtitle').innerText = "Assimilation Complete. Reviving...";

    const sleepOverlay = document.getElementById('sleep-overlay');
    sleepOverlay.classList.remove('pointer-events-none');
    sleepOverlay.style.opacity = '1';

    setTimeout(() => {
        executeGameReset();
    }, 2500);
}

// --- ITEM DROP & TERRAIN SCATTERING (*) ---
function checkDropTriggers(amount, isDirectClick) {
    // Convert to a decimal (e.g., 8 -> 0.08) for percent based calculations
    const activeDropRate = (DEBUG_ENABLED ? gameState.dropRate : DROP_RATE) / 100;

    const baseChance = isDirectClick ? activeDropRate : activeDropRate * 0.1;
    if (Math.random() < baseChance) {
        spawnLootDrop();
    }

    const percentageLost = Math.floor((1 - gameState.mass / gameState.maxMass) * 10);
    if (percentageLost > 0 && !gameState.milestonesReached.has(percentageLost)) {
        gameState.milestonesReached.add(percentageLost);
        // TODO: trigger special animation or event
    }
}

function spawnLootDrop() {
    // Wait until CSV is loaded
    if (!ITEM_DATABASE || ITEM_DATABASE.length === 0) return;
    
    // Only allow so many drops at a time
    if (gameState.groundItems.length >= MAX_DROPS_ON_GROUND) return;

    // Filter items matching the player's exact current layer
    const availableItems = ITEM_DATABASE.filter(item => (item.layer || 1) === gameState.layer);
    
    // Fallback to layer 1 items if no items are defined for the current layer yet
    const pool = availableItems.length > 0 ? availableItems : ITEM_DATABASE.filter(item => (item.layer || 1) === 1);
    
    const itemTemplate = pool[Math.floor(Math.random() * pool.length)];
    if (!itemTemplate) return;

    // Calculate dynamic value based on stats
    const computedValue = calculateItemValue(itemTemplate.clickBonus, itemTemplate.dpsBonus);

    const uniqueGroundItem = {
        uniqueId: generateUniqueId(),
        typeId: itemTemplate.typeId,
        name: itemTemplate.name,
        symbol: itemTemplate.symbol,
        clickBonus: itemTemplate.clickBonus,
        dpsBonus: itemTemplate.dpsBonus,
        value: computedValue,
        rarity: itemTemplate.rarity,
        upgradeLevel: 0,
        desc: itemTemplate.desc
    };

    animateEjectionTrajectory(uniqueGroundItem);
}

function animateEjectionTrajectory(groundItem) {
    const dropLayer = document.getElementById('drop-layer');
    const dropEl = document.createElement('div');
    dropEl.className = 'absolute text-amber-300 font-bold text-xl cursor-pointer select-none';
    dropEl.innerText = '*';

    const arenaRect = dropLayer.getBoundingClientRect();
    const startX = arenaRect.width * (0.35 + Math.random() * 0.3);
    const startY = arenaRect.height * (0.3 + Math.random() * 0.2);

    const scatterLeftPct = 10 + Math.random() * 80;
    const endX = arenaRect.width * (scatterLeftPct / 100);
    const endY = arenaRect.height - 40; // Landing near bottom

    dropEl.style.left = `${startX}px`;
    dropEl.style.top = `${startY}px`;
    dropLayer.appendChild(dropEl);

    const duration = 650;
    const startTime = performance.now();
    // Peak height offset for the arc (negative goes upwards)
    const peakHeight = -80 - Math.random() * 50; 

    function frame(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);

        // Ease out quad for smooth deceleration
        const easeProgress = 1 - (1 - progress) * (1 - progress);

        // Linear interpolation for X, Parabolic arc for Y
        const currentX = startX + (endX - startX) * easeProgress;
        
        // Quadratic bezier curve formula for Y (creates the arc peak)
        const currentY = startY + (endY - startY) * easeProgress + peakHeight * Math.sin(progress * Math.PI);

        dropEl.style.left = `${currentX}px`;
        dropEl.style.top = `${currentY}px`;

        if (progress < 1) {
            requestAnimationFrame(frame);
        } else {
            if (dropLayer.contains(dropEl)) {
                dropLayer.removeChild(dropEl);
            }

            const scatterBottom = 10 + Math.random() * 35;

            // --- AUTO-LOOT LOGIC ---
            if (gameState.autoLoot) {
                addItemToInventory(groundItem);
                const msgs = PARASITIC_MESSAGES[gameState.assimilationStage];
                const msg = msgs[Math.floor(Math.random() * msgs.length)];
                addLogEntry(`${msg}\n[Auto-Looted] - [${groundItem.name}]`);

                recalculateStats();
                renderInventory();
                saveGame();
            } else {
                addToGroundTerrain(groundItem, scatterLeftPct, scatterBottom);
            }
        }
    }

    requestAnimationFrame(frame);
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

    // Show indicator when max items are on the ground
    const maxStar = document.getElementById('max-capacity-star');
    if (maxStar) {
        maxStar.classList.toggle('hidden', gameState.groundItems.length < MAX_DROPS_ON_GROUND);
    }
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
    updateStatsUI();
    renderInventory();
    renderTerrainArtifacts();

    saveGame();
}

function addItemToInventory(newItem) {
    newItem.quantity = newItem.quantity || 1;
    const existingItem = gameState.inventory.find(
        i => i.name === newItem.name && (i.upgradeLevel || 0) === (newItem.upgradeLevel || 0)
    );
    if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + newItem.quantity;
    } else {
        newItem.quantity = newItem.quantity || 1;
        gameState.inventory.push(newItem);
    }
}

// --- STATS CALCULATION ---
function calculateItemValue(clickBonus, dpsBonus) {
    const totalBonus = clickBonus + dpsBonus;
    return Math.max(1, Math.round(3.94 * totalBonus + 299.59));
}

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

    // Determine new layer from thresholds (defaults to layer 1 if above 0.8)
    const matchedThreshold = LAYER_THRESHOLDS.find(t => massRatio < t.threshold);
    const newLayer = matchedThreshold ? matchedThreshold.layer : 1;

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
    const massDisplay = document.getElementById('mass-display');
    // Hide mass display if debugging is disabled
    if (massDisplay) {
        massDisplay.classList.toggle('hidden', !DEBUG_ENABLED);
        massDisplay.innerText = Math.floor(gameState.mass).toLocaleString();
    }

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

    // Sort inventory: DPS descending, then Click power descending
    gameState.inventory.sort((a, b) => {
        const dpsA = a.dpsBonus || 0;
        const dpsB = b.dpsBonus || 0;
        if (dpsB !== dpsA) {
            return dpsB - dpsA;
        }
        const clickA = a.clickBonus || 0;
        const clickB = b.clickBonus || 0;
        return clickB - clickA;
    });

    gameState.inventory.forEach((item) => {
        const qty = item.quantity || 1;
        const displayName = qty > 1 ? `${item.name} (x${qty})` : item.name;
        const tierPill = item.upgradeLevel && item.upgradeLevel > 0
            ? `<span class="text-[9px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded inline-block mb-0.5">${UPGRADE_TIERS[item.upgradeLevel - 1]}</span>`
            : '';
        //const card = document.createElement('div');
        //card.className = 'bg-slate-950 border border-slate-800 p-2 rounded-lg flex items-start justify-between gap-2 shadow-sm';
        const card = document.createElement('div');
        card.className = 'bg-slate-950 border border-slate-800 p-2 rounded-lg flex items-center justify-between gap-2 shadow-sm';
        card.innerHTML = `
            <div class="flex items-start gap-2 min-w-0">
                <div class="text-xl p-1.5 bg-slate-900 rounded border border-slate-800 shrink-0">${item.symbol}</div>
                <div class="min-w-0">
                    ${tierPill}
                    <div class="text-xs font-bold text-slate-200 truncate">${displayName}</div>
                    <div class="text-[10px] text-emerald-400 font-medium">
                        ${item.dpsBonus > 0 ? `+${item.dpsBonus} DPS` : ''} 
                        ${item.clickBonus > 0 ? `+${item.clickBonus} Click` : ''}
                    </div>
                    <div class="text-[9px] text-slate-500 italic whitespace-normal break-words">${item.desc}</div>
                </div>
            </div>

            ${gameState.isNight && activeTownTab === 'shop' ? `
                <div class="flex flex-col gap-1 items-end shrink-0">
                    <button onclick="sellItem('${item.uniqueId}')" class="px-2 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold rounded">
                        Sell (${item.value || calculateItemValue(item.clickBonus || 0, item.dpsBonus || 0)}🪙)
                    </button>
                    ${qty >= 10 ? `
                        <button onclick="sellAllMinusOne('${item.uniqueId}')" class="px-2 py-1 bg-red-500/20 border border-red-500/40 hover:bg-red-500 hover:text-white text-red-300 text-[9px] font-bold rounded transition-colors">
                            Sell ALL-1 (${(item.value || calculateItemValue(item.clickBonus || 0, item.dpsBonus || 0)) * (qty - 1)}🪙)
                        </button>
                    ` : ''}
                </div>
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
        mealBuffValue: gameState.mealBuffValue,
        mealBuffSymbol: gameState.mealBuffSymbol,
        showMeldAll: gameState.showMeldAll,
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

        // SETTINGS
        gameState.showMeldAll = data.showMeldAll ?? true;
        const meldCheckbox = document.getElementById('show-meld-all-checkbox');
        if (meldCheckbox) {
            meldCheckbox.checked = gameState.showMeldAll;
            updateMeldAllButtonVisibility();
        }        
        gameState.dayLengthMinutes = data.dayLengthMinutes ?? gameState.dayLengthMinutes;
        const slider = document.getElementById('day-length-slider');
        if (slider) {
            slider.value = gameState.dayLengthMinutes;
            document.getElementById('day-length-label').innerText = `${gameState.dayLengthMinutes} Minute${gameState.dayLengthMinutes > 1 ? 's' : ''}`;
        }

        // Simulate elapsed time if it was daytime when last saved/blurred
        if (!gameState.isNight && data.timestamp) {
            const elapsedSeconds = (Date.now() - data.timestamp) / 1000;
            if (elapsedSeconds > 0) {
                gameState.totalGameTime += elapsedSeconds;
                gameState.timeRemaining -= elapsedSeconds;

                if (gameState.mealBuffActive) {
                    const indicator = document.getElementById('meal-buff-indicator');
                    if (indicator) {
                        indicator.innerText = `${gameState.mealBuffSymbol || '🍴'} +${gameState.mealBuffValue}`;
                        indicator.classList.remove('hidden');
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
}

// --- ATTACH FUNCTIONS TO WINDOW FOR HTML ONCLICK HANDLERS ---
window.switchTownTab = switchTownTab;
window.buyShopItem = buyShopItem;
window.sellItem = sellItem;
window.sellAllMinusOne = sellAllMinusOne;
window.toggleBuyBackView = toggleBuyBackView;
window.buyBackItem = buyBackItem;
window.craftCombine = craftCombine;
window.eatMeal = eatMeal;
window.confirmRest = confirmRest;
window.toggleHeaderExpand = toggleHeaderExpand;
window.openGameMenu = openGameMenu;
window.closeGameMenu = closeGameMenu;
window.resetGameProgress = resetGameProgress;
window.closeConfirmModal = closeConfirmModal;
window.executeGameReset = executeGameReset;
window.toggleExpandInventory = toggleExpandInventory;
window.switchTab = switchTab;
window.updateDayLengthSetting = updateDayLengthSetting;
window.updateAutoLootSetting = updateAutoLootSetting;
window.updateDropRateSetting = updateDropRateSetting;
window.updateShowMeldAllSetting = updateShowMeldAllSetting;
window.meldAllItems = meldAllItems;