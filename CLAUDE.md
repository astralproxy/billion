BILLION - Game Engine Architecture & Features Guide (for AI Agents)
This document provides a structured analysis of the script.js codebase for the game BILLION. It maps out core systems, state management, functional modules, and flow mechanics to help AI agents understand, navigate, and modify the application efficiently.

1. Overview & System Architecture
BILLION is an incremental/idle game built with a Day/Night cycle and Town system interface.
•	Day Phase (Combat): Active and passive click/DPS combat against a massive monster entity (MASS_MAX = 1,000,000,000). Features item drops (* symbols) scattered across the terrain that can be looted.
•	Night Phase (Town): Combat pauses, ground items clear, and players switch to a multi-tab Town interface (Shop, Crafting/Melding, Eating, Resting).
•	State & Persistence: State is synchronized to local browser storage (localStorage) periodically and on key transitions.

2. Core Game Loop & State Management
Game State Object (gameState)
Central state object containing all runtime variables:
// Key State Structure
{
  mass, maxMass,              // Entity health (1B max)
  baseClickPower, bonusClickPower, passiveDPS, gold,
  layer,                      // Dynamic visual & mechanics layer (1-5)
  inventory, groundItems,     // Item storage arrays
  dayNumber, totalGameTime,
  timeRemaining, isNight,     // Day/Night control
  mealBuffActive, mealBuffTimer, mealBuffValue, mealBuffSymbol,
  buybackList,                // Item buyback array (max 5)
  autoLoot, dropRate, showMeldAll // Debug/Configuration flags
}

Execution Flow
•	Initialization (window.onload): Sets up UI heights, dynamically loads Google Sheet CSV data (items, shop, meals), loads saved state, registers tick intervals, and attaches touch/mouse listeners.
•	Tick Engine (gameTick): Fires every 100ms (10 ticks/sec). Handles delta time calculation, total game time progression, day-to-day timer progression, meal buff expiry, and passive DPS output.
•	Save/Load System (saveGame, loadGame): Serializes state into localStorage.setItem('billion_game_save', ...) every 10 seconds or on major interactions. Computes offline progression/time elapsed upon reload.

3. Key Feature Modules & Functional Mapping
Below is a direct index of features and where to find their implementing functions in script.js.
A. Combat, Damage & Layer Mechanics
•	Attack Handler (handleAttack): Handles user manual clicks, calculates total damage including buffs, triggers damage text animations (spawnFloatingDamage), and plays visual hit animations.
•	Damage Application (applyDamage): Reduces monster mass, checks for layer transitions, triggers loot drop logic, and initiates reset/elimination sequence if mass hits 0.
•	Layer System (updateLayerAndNarrative, renderMonster): Adjusts current layer (1 through 5) based on remaining mass thresholds (LAYER_THRESHOLDS) and alters the monster's ASCII representation and dialogue.

B. Loot Generation & Field Item Mechanics
•	Drop Trigger (checkDropTriggers, spawnLootDrop): Uses RNG based on dropRate (click vs passive) to spawn dynamic ground items based on the player's active layer.
•	Arc Trajectory Animation (animateEjectionTrajectory): Uses quadratic Bezier curves in requestAnimationFrame to eject * drops into parabolic arcs across the screen.
•	Terrain & Collection (addToGroundTerrain, renderTerrainArtifacts, collectGroundItem): Manages ground drops array (groundItems), renders them as interactive elements, and adds collected items to the inventory stack.

C. Town Mechanics (Night Phase)
•	Transition Logic (triggerNightPhase, confirmRest): Controls transitions between Combat (Day) and Town (Night) views using CSS overlays (#sleep-overlay).
•	Town Tabs (switchTownTab): Toggles display across four main sub-views: shop, craft, eat, rest.
•	Shop & Economy (renderShop, buyShopItem, sellItem, sellAllMinusOne): Controls buying gear, selling inventory stacks, and tracking unit values (calculateItemValue).
•	Buyback System (toggleBuyBackView, buyBackItem): Maintains a FIFO queue of up to 5 recently sold items (buybackList) for player recovery.
•	Crafting / Melding (renderCraftingSlots, craftCombine, meldAllItems): Merges duplicate items to increase item power tier (UPGRADE_TIERS) up to Tier 3 (+50% bonus power per tier). meldAllItems provides automated recursive merging.
•	Meals / Buff System (renderMeals, eatMeal): Grants timed temporary DPS increases with dedicated UI timer indicators.

D. Inventory & Stat Recalculation
•	Stat Aggregation (recalculateStats): Iterates over active inventory items to aggregate bonusClickPower and passiveDPS.
•	Inventory Rendering (renderInventory): Renders item cards, handles tier badge styling, sorts items by stats, and provides sell action triggers when in Town mode.
•	Layout Mechanics (toggleExpandInventory, setupInventorySwipe): Supports expanding/minimizing inventory height and touch-swipe gestures (touchstart, touchend).

E. Debug & Utility Operations
•	Debug Adjustments (updateAutoLootSetting, updateDropRateSetting, updateShowMeldAllSetting): Debug handlers for tuning drop rates, enabling auto-loot, and toggling UI buttons.
•	Hard Reset (executeGameReset, resetGameProgress): Clears localStorage, resets gameState properties to initial values, and reloads the application.

4. Function Location Quick Reference Table
Function / Component	Primary Responsibility	Section / Category
gameTick()	Main loop (Delta time, Timers, Passive DPS)	Core Engine
handleAttack(e)	Active click input processor & feedback	Combat
applyDamage(amount, isDirectClick)	Health reduction & event checking	Combat
spawnLootDrop()	Spawns drop items based on layer	Loot & Drop
animateEjectionTrajectory(item)	Visual arc animation for drops	Loot & Drop
triggerNightPhase()	Ends day phase; transfers to Town	Day/Night Cycle
switchTownTab(tabName)	UI routing for Town features	Town Interface
craftCombine(uniqueId)	Merges duplicate items into higher tiers	Crafting
meldAllItems()	Batch merges all eligible inventory items	Crafting
eatMeal(mealId)	Applies timed temporary stat buffs	Buff System
recalculateStats()	Aggregates item and buff bonuses	Economy & Stats
saveGame() / loadGame()	LocalStorage serialization	Persistence