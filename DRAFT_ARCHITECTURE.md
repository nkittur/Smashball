# Draft System Architecture

## Overview

The draft system allows players to build their team by selecting players from a draft pool. Each team picks in order, with the player's team picking last in each round (simulating worst-to-first draft order).

## Core Concepts

### Draft Points
- Draft points are a currency used exclusively for **trading picks**
- Draft points are NOT used to draft players - picks are free to use
- Starting budget is based on team ranking (worse teams get more points)
- New games start with `DRAFT.NEW_GAME_BUDGET` (1500 points)

### Pick Value
- Each pick position has a static value based on draft order
- Value is calculated using `calculatePickCost(pickNumber)`
- Earlier picks are worth more (pick 1 > pick 2 > pick 3, etc.)
- Example: Pick 1 = 1000 pts, Pick 10 = 550 pts, Pick 20 = 300 pts

### Draft Order
- `DRAFT.NUM_TEAMS` teams participate (default: 12)
- `DRAFT.ROUNDS` rounds of drafting (default: 5)
- Player's team picks LAST in each round (position 12 of 12)
- Total picks per draft = NUM_TEAMS × ROUNDS

## Player Actions

### 1. Draft a Player (FREE)
- When it's your turn, select any available player
- **No draft point cost** - the pick itself is the value
- Player is added to your roster
- Your pick count decreases by 1

### 2. Trade In Your Pick
- Available only on YOUR turn
- Exchange your current pick for draft points
- You receive: `pickValue - TRADE_IN_PENALTY`
- Penalty default: 50 points (configurable in settings)
- You lose this pick but gain points for future trades

### 3. Trade For Another Team's Pick
- Available only on COMPUTER'S turn
- Pay to acquire the current pick position
- Cost: `pickValue × (1 + ACQUIRE_PREMIUM)`
- Premium default: 10% (configurable in settings)
- Once acquired, it becomes YOUR pick (use it or trade it in)

## State Management

### draftState Object
```javascript
draftState = {
    active: boolean,           // Is draft in progress
    round: number,             // Current round (1-5)
    pick: number,              // Pick within round
    picksRemaining: number,    // Player's remaining picks
    currentPickNumber: number, // Overall pick # (1-60)
    isPlayersTurn: boolean,    // Is it player's turn to pick
    usingExtraPick: boolean,   // Using a traded-for pick
    draftPool: Player[],       // Available players
    draftedPlayers: string[],  // IDs of drafted players
    playerPicks: string[],     // IDs player drafted
    lastComputerPick: object,  // Last computer pick info
    simulatingPicks: boolean,  // Currently simulating
    isNewGame: boolean,        // First draft or returning
    viewingRoster: boolean,    // Viewing roster tab
    selectedDraftPlayer: Player // Currently selected player
}
```

### managementState.settings
```javascript
pickTradeInPenalty: number,  // Points lost when trading in (default: 50)
pickAcquirePremium: number   // % premium to acquire pick (default: 10)
```

## Key Functions

### Pick Value Functions
- `getCurrentPickValue()` - Returns value of current pick position
- `getTradeInValue()` - Returns points received if trading in (value - penalty)
- `getAcquireCost()` - Returns cost to acquire current pick (value × 1.1)
- `calculatePickCost(pickNumber)` - Base calculation for pick value

### Trading Functions
- `tradeInPick()` - Trade your pick for points, skip your turn
- `acquireCurrentPick()` - Pay to take the current pick from computer
- `canAffordAcquirePick()` - Check if player has enough points

### Draft Flow Functions
- `startDraft(isNewGame)` - Initialize draft state
- `draftPlayer(playerId)` - Draft selected player (no cost)
- `simulateNextComputerPick()` - Computer makes a pick
- `skipToPlayerTurn()` - Skip all computer picks to your turn
- `refreshDraftScreen()` - Update UI state
- `finishDraft()` - Complete draft, return to management

## UI Flow

### Computer's Turn
1. Shows "Computer's Turn" or last computer pick
2. Displays NEXT PICK and SKIP TO YOUR PICK buttons
3. Shows TRADE FOR PICK button (to acquire this pick)

### Player's Turn
1. Shows "YOUR TURN" indicator
2. Player list is clickable to view/draft players
3. Shows TRADE IN PICK button (to bank points)
4. No acquire button (you already have the pick)

### Using Traded Pick
1. Shows "YOUR PICK - Select a player"
2. Works exactly like your normal pick
3. Does NOT consume your regular picks remaining

## Configuration (DRAFT constants)

```javascript
DRAFT = {
    ROUNDS: 5,                    // Picks per player
    NUM_TEAMS: 12,                // Teams in draft
    PLAYERS_PER_ROUND: 15,        // Players generated per round
    NEW_GAME_BUDGET: 1500,        // Starting draft points
    DEFAULT_TRADE_IN_PENALTY: 50, // Points lost on trade-in
    DEFAULT_ACQUIRE_PREMIUM: 0.10 // 10% premium to acquire
}
```

## Important Rules

1. **Drafting is FREE** - Never charge points to draft a player
2. **Pick value is position-based** - Not based on player quality
3. **Trade-in loses value** - Penalty discourages excessive banking
4. **Acquire costs premium** - Incentive to use your own picks
5. **Traded picks don't consume regular picks** - Bonus picks
