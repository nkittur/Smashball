# Smashball Management Layer - Implementation Plan

## Overview

This document outlines the plan to add a persistent management meta-game layer to the existing Smashball arcade football game. The system transforms the game from a session-based arcade experience into a full-featured management simulation with roster building, economy, player progression, and season play.

## Current Architecture Summary

**Existing Stack:**
- Single-file architecture (`index.html`, ~3,656 lines)
- Babylon.js for 3D rendering and GUI
- Central `gameState` object for all game flags
- Hardcoded player stats (receivers, defenders, linemen)
- No persistence (resets on page reload)
- Medieval/knight aesthetic

**Key Integration Points:**
- `gameState` object - central state management
- Player arrays (`receivers`, `defenders`, `offensiveLine`, `defensiveLine`)
- Stat system (0-100 scale with weighted rolls)
- Babylon.js GUI for overlay elements
- Route/play generation system

---

## Implementation Phases

### Phase 1: Data Layer & Persistence ✅
**Status: PENDING**

Create the foundational data structures and save/load system.

#### 1.1 Core Data Models

```javascript
// New global: managementState
const managementState = {
  team: null,           // Team entity
  season: null,         // Season progress
  freeAgents: [],       // Available players to sign
  initialized: false
};
```

**Player Entity:**
```javascript
{
  id: UUID,
  firstName: string,
  lastName: string,
  age: number (18-40),
  position: 'WR' | 'CB' | 'OL' | 'DL' | 'QB',

  // Core stats (0-100)
  stats: {
    speed, acceleration, agility,
    catching, throwing, tackling,
    // Position-specific stats preserved from existing system
    ...positionStats
  },

  // Growth system
  potentialGrade: 0-3,        // 0, +, ++, +++
  currentPotential: float,    // Growth multiplier
  peakAge: number (28-32),

  // Economy
  salaryCost: calculated,     // Sum(Stats) * 100

  // History
  seasonStartStats: {...},    // Snapshot for delta display
  gamesPlayed: number,
  seasonTDs: number,
  seasonCatches: number
}
```

**Team Entity:**
```javascript
{
  name: string,
  credits: number,
  salaryCap: 50000,
  salaryCapModifier: 0,

  roster: Player[],           // All players
  depthChart: {
    WR1: playerId, WR2: playerId, WR3: playerId,
    CB1: playerId, CB2: playerId, CB3: playerId, CB4: playerId,
    OL: [playerId x 5],
    DL: [playerId x 4],
    QB: playerId
  },

  facilities: {
    stadium: { level: 1, maxLevel: 5 },
    trainingCenter: { level: 1, maxLevel: 5 }
  },

  record: { wins: 0, losses: 0 }
}
```

**Season Entity:**
```javascript
{
  week: number (1-17),
  schedule: [
    { week: 1, opponent: OpponentTeam, isHome: boolean, result: null }
  ],
  currentOpponent: OpponentTeam
}
```

#### 1.2 Persistence System

- Use `localStorage` for save/load
- Auto-save after each game and roster change
- Save keys: `smashball_team`, `smashball_season`, `smashball_settings`

```javascript
const SaveSystem = {
  save() { localStorage.setItem('smashball_save', JSON.stringify(managementState)); },
  load() { return JSON.parse(localStorage.getItem('smashball_save')); },
  exists() { return localStorage.getItem('smashball_save') !== null; },
  clear() { localStorage.removeItem('smashball_save'); }
};
```

---

### Phase 2: Player Generation & Roster System
**Status: PENDING**

#### 2.1 Player Name Generator

Create pools of medieval-themed first and last names:
```javascript
const FIRST_NAMES = ['Aldric', 'Baldwin', 'Cedric', 'Edmund', ...];
const LAST_NAMES = ['Blackwood', 'Ironforge', 'Stoneheart', ...];
```

#### 2.2 Player Generator

```javascript
function generatePlayer(position, tier = 'average') {
  // tier: 'rookie', 'average', 'veteran', 'elite'
  const baseStats = getBaseStatsForTier(tier);
  const age = rollAge(tier);
  const peakAge = 28 + Math.floor(Math.random() * 5);
  const potentialGrade = rollPotential(age, tier);

  return {
    id: generateUUID(),
    firstName: randomFrom(FIRST_NAMES),
    lastName: randomFrom(LAST_NAMES),
    age,
    position,
    stats: generatePositionStats(position, baseStats),
    potentialGrade,
    currentPotential: calculatePotential(age, peakAge, potentialGrade),
    peakAge,
    salaryCost: calculateSalary(stats),
    seasonStartStats: {...stats},
    gamesPlayed: 0,
    seasonTDs: 0,
    seasonCatches: 0
  };
}
```

#### 2.3 Initial Roster Generation

On new game:
- Generate 3 WRs (1 good, 2 average)
- Generate 4 CBs (1 good, 3 average)
- Generate 5 OL (1 good, 4 average)
- Generate 4 DL (1 good, 3 average)
- Generate 1 QB
- Auto-assign to depth chart positions
- Start with 10,000 credits

---

### Phase 3: Economy System
**Status: PENDING**

#### 3.1 Income Sources

| Source | Formula |
|--------|---------|
| Home Game Revenue | `500 + (stadiumLevel * 300)` credits |
| Away Game Revenue | `250` credits (half of base) |
| Player Sale | `salaryCost * 0.5` credits (immediate) |

#### 3.2 Expenses

| Expense | Cost |
|---------|------|
| Weekly Salary | `sum(roster.salaryCost) / 17` (per game week) |
| Stadium Upgrade | `[2000, 5000, 10000, 20000, 40000]` per level |
| Training Center Upgrade | `[1500, 4000, 8000, 15000, 30000]` per level |
| Bribe Officials | `10000` (adds +5000 salary cap) |
| Sign Free Agent | `player.salaryCost * 0.2` (signing bonus) |

#### 3.3 Salary Cap

```javascript
function canSign(player) {
  const currentSalary = team.roster.reduce((sum, p) => sum + p.salaryCost, 0);
  const cap = team.salaryCap + team.salaryCapModifier;
  return currentSalary + player.salaryCost <= cap;
}
```

---

### Phase 4: Progression & Regression System
**Status: PENDING**

Run once per game week (after each game).

#### 4.1 Growth Phase (Age < PeakAge)

```javascript
function processGrowth(player) {
  if (player.age >= player.peakAge) return;

  const facilityBonus = team.facilities.trainingCenter.level * 0.1;
  const potentialMultiplier = 0.5 + (player.potentialGrade * 0.5);
  const baseGrowth = 0.5;

  const totalGrowth = baseGrowth + (facilityBonus * potentialMultiplier);

  // Apply to 2-3 random stats based on position
  const statsToImprove = getPositionPrimaryStats(player.position);
  const selectedStats = randomSample(statsToImprove, 2);

  selectedStats.forEach(stat => {
    player.stats[stat] = Math.min(99, player.stats[stat] + totalGrowth);
  });
}
```

#### 4.2 Decline Phase (Age >= PeakAge)

```javascript
function processDecline(player) {
  if (player.age < player.peakAge) return;

  const yearsOver = player.age - player.peakAge;
  const declineRate = yearsOver * 0.3; // Accelerates with age

  // Physical stats decline faster
  const physicalStats = ['speed', 'acceleration', 'agility', 'strength'];
  physicalStats.forEach(stat => {
    player.stats[stat] = Math.max(20, player.stats[stat] - declineRate);
  });

  // Mental stats decline slower
  const mentalStats = ['awareness', 'routeRunning', 'catching'];
  mentalStats.forEach(stat => {
    player.stats[stat] = Math.max(30, player.stats[stat] - (declineRate * 0.5));
  });
}
```

#### 4.3 Age Advancement & Retirement

```javascript
function advanceAge(player) {
  player.age++;

  const totalStats = Object.values(player.stats).reduce((a, b) => a + b, 0);
  const averageStat = totalStats / Object.keys(player.stats).length;

  // Retirement conditions
  if (player.age > 40 || averageStat < 35) {
    return { retired: true, player };
  }
  return { retired: false, player };
}
```

---

### Phase 5: Season & Schedule System
**Status: PENDING**

#### 5.1 Opponent Generation

Generate 8-16 AI opponent teams with varying difficulty:

```javascript
const OPPONENTS = [
  { name: 'Ironhelm Crusaders', difficulty: 'easy', offenseRating: 40, defenseRating: 45 },
  { name: 'Stormwall Sentinels', difficulty: 'medium', offenseRating: 55, defenseRating: 60 },
  { name: 'Dragonfire Legion', difficulty: 'hard', offenseRating: 75, defenseRating: 70 },
  // ... more teams
];
```

#### 5.2 Schedule Generation

```javascript
function generateSchedule() {
  const schedule = [];
  const opponents = [...OPPONENTS];
  shuffle(opponents);

  for (let week = 1; week <= 16; week++) {
    const opponent = opponents[(week - 1) % opponents.length];
    schedule.push({
      week,
      opponent,
      isHome: Math.random() > 0.5,
      result: null  // { playerScore, opponentScore, win }
    });
  }
  return schedule;
}
```

---

### Phase 6: Match Simulation (Enemy Scoring)
**Status: PENDING**

Instead of simulating full defense, use probabilistic enemy scoring based on opponent ratings and your defense quality.

#### 6.1 Enemy Possession Logic

When player loses possession (score or turnover):

```javascript
function simulateEnemyPossession(opponent) {
  const defenseRating = calculateTeamDefenseRating();
  const offenseRating = opponent.offenseRating;

  // Roll for outcome
  const roll = Math.random() * 100;
  const differential = offenseRating - defenseRating;

  // Base probabilities adjusted by differential
  const tdChance = 20 + (differential * 0.3);      // 20% base
  const fgChance = 25 + (differential * 0.2);      // 25% base
  // Rest = punt/turnover (0 points)

  if (roll < tdChance) return 7;        // Touchdown
  if (roll < tdChance + fgChance) return 3;  // Field Goal
  return 0;                              // Punt/Turnover
}
```

#### 6.2 Team Rating Calculation

```javascript
function calculateTeamDefenseRating() {
  const activeDefenders = getActiveDepthChartPlayers('CB');
  const activeDLine = getActiveDepthChartPlayers('DL');

  let total = 0;
  activeDefenders.forEach(p => {
    total += (p.stats.manCoverage + p.stats.zoneCoverage + p.stats.tackling) / 3;
  });
  activeDLine.forEach(p => {
    total += (p.stats.passRush + p.stats.tackling) / 2;
  });

  return total / (activeDefenders.length + activeDLine.length);
}
```

#### 6.3 Match Flow (5 Possessions)

```javascript
function runMatch() {
  let playerScore = 0;
  let enemyScore = 0;

  for (let possession = 0; possession < 5; possession++) {
    // Player plays their possession (arcade mode)
    const playerResult = await playArcadePossession();
    playerScore += playerResult.points;

    // Enemy gets counter-possession
    enemyScore += simulateEnemyPossession(season.currentOpponent);
  }

  return { playerScore, enemyScore, win: playerScore > enemyScore };
}
```

---

### Phase 7: Management UI
**Status: PENDING**

Create Babylon.js GUI screens for management interface.

#### 7.1 UI States

```javascript
const UI_STATE = {
  MAIN_MENU: 'main_menu',      // New/Continue game
  HUB: 'hub',                   // Main dashboard
  ROSTER: 'roster',             // Player list & depth chart
  PLAYER_DETAIL: 'player',      // Individual player view
  FREE_AGENCY: 'free_agency',   // Sign players
  FACILITIES: 'facilities',     // Upgrades & bribe
  SCHEDULE: 'schedule',         // Season schedule
  GAME: 'game'                  // Playing a match
};
```

#### 7.2 Hub Screen Layout

```
+--------------------------------------------------+
|  SMASHBALL MANAGEMENT                             |
+--------------------------------------------------+
|  Credits: 12,500  |  Salary: 42,000 / 55,000     |
+--------------------------------------------------+
|                                                   |
|  +------------+  +------------+  +------------+  |
|  |   ROSTER   |  |    FREE    |  | FACILITIES |  |
|  |   & DEPTH  |  |   AGENCY   |  |  UPGRADE   |  |
|  +------------+  +------------+  +------------+  |
|                                                   |
|  +------------+  +------------+  +------------+  |
|  |  SCHEDULE  |  | PLAY NEXT  |  |   STATS    |  |
|  |            |  |   GAME     |  |            |  |
|  +------------+  +------------+  +------------+  |
|                                                   |
|  Record: 5-2  |  Week 8  |  vs. Ironhelm (HOME)  |
+--------------------------------------------------+
```

#### 7.3 Player Detail Screen

```
+--------------------------------------------------+
|  < BACK                      SIR ALDRIC BLACKWOOD |
+--------------------------------------------------+
|  Position: WR  |  Age: 24  |  Potential: ++      |
|  Salary: 7,200                                    |
+--------------------------------------------------+
|  STATS                          SEASON CHANGE    |
|  ------------------------------------------------|
|  Speed:        78 [========  ]  (+3)             |
|  Acceleration: 72 [=======   ]  (+1)             |
|  Agility:      85 [========= ]  (+2)             |
|  Catching:     88 [========= ]  (+0)             |
|  Route Running:82 [========  ]  (+1)             |
+--------------------------------------------------+
|  SEASON STATS                                     |
|  Games: 7  |  Catches: 23  |  TDs: 4             |
+--------------------------------------------------+
|  [CUT PLAYER]               [SET AS STARTER]     |
+--------------------------------------------------+
```

#### 7.4 UI Implementation Approach

Use Babylon.js GUI (already in use) with:
- AdvancedDynamicTexture for fullscreen overlay
- Rectangle containers for panels
- TextBlock for labels and values
- Button controls for interactions
- Slider/progress bars for stats visualization

---

### Phase 8: Integration with Existing Game
**Status: PENDING**

#### 8.1 Connecting Roster to Gameplay

Modify player creation to use roster data:

```javascript
function createReceiversFromRoster() {
  const wrSlots = ['WR1', 'WR2', 'WR3'];
  return wrSlots.map((slot, index) => {
    const playerId = team.depthChart[slot];
    const player = team.roster.find(p => p.id === playerId);

    if (!player) {
      return generateWalkOn('WR', index);
    }

    return createReceiverFromPlayer(player, index);
  });
}

function createReceiverFromPlayer(player, index) {
  // Use existing receiver creation logic but with dynamic stats
  const receiver = createKnightMesh(...);
  receiver.displayName = `${player.firstName} ${player.lastName.charAt(0)}.`;
  receiver.stats = { ...player.stats };
  receiver.baseSpeed = player.stats.speed * 0.0005;
  // ... rest of setup
  return receiver;
}
```

#### 8.2 Post-Game Processing

After each arcade match:

```javascript
function processPostGame(matchResult) {
  // 1. Update player stats from game performance
  updatePlayerGameStats(matchResult);

  // 2. Award revenue
  const revenue = matchResult.isHome
    ? 500 + (team.facilities.stadium.level * 300)
    : 250;
  team.credits += revenue;

  // 3. Deduct weekly salary
  const weeklySalary = calculateWeeklySalary();
  team.credits -= weeklySalary;

  // 4. Run progression/regression
  team.roster.forEach(player => {
    processGrowth(player);
    processDecline(player);
  });

  // 5. Update season record
  updateSeasonRecord(matchResult);

  // 6. Advance week
  season.week++;

  // 7. Age players (at season end)
  if (season.week > 16) {
    processEndOfSeason();
  }

  // 8. Save game
  SaveSystem.save();
}
```

---

### Phase 9: Free Agency System
**Status: PENDING**

#### 9.1 Free Agent Pool

```javascript
function refreshFreeAgents() {
  managementState.freeAgents = [];

  // Generate 5-8 available players
  const count = 5 + Math.floor(Math.random() * 4);
  const positions = ['WR', 'CB', 'OL', 'DL'];

  for (let i = 0; i < count; i++) {
    const position = positions[Math.floor(Math.random() * positions.length)];
    const tier = rollAgentTier(); // mostly average, rare elite
    managementState.freeAgents.push(generatePlayer(position, tier));
  }
}
```

#### 9.2 Signing Logic

```javascript
function signFreeAgent(playerId) {
  const player = managementState.freeAgents.find(p => p.id === playerId);
  if (!player) return { success: false, error: 'Player not found' };

  const signingBonus = Math.floor(player.salaryCost * 0.2);
  if (team.credits < signingBonus) {
    return { success: false, error: 'Insufficient credits' };
  }

  if (!canSign(player)) {
    return { success: false, error: 'Over salary cap' };
  }

  team.credits -= signingBonus;
  team.roster.push(player);
  managementState.freeAgents = managementState.freeAgents.filter(p => p.id !== playerId);

  return { success: true };
}
```

---

## File Structure

Given the single-file architecture, we'll add new code sections to `index.html`:

```
index.html
├── [Existing] HTML/CSS (~100 lines)
├── [Existing] Babylon.js setup
├── [NEW] Management Data Models (300 lines)
├── [NEW] Save/Load System (100 lines)
├── [NEW] Player Generation (200 lines)
├── [NEW] Economy System (150 lines)
├── [NEW] Progression System (150 lines)
├── [NEW] Season/Schedule (200 lines)
├── [NEW] Match Simulation (150 lines)
├── [NEW] Management UI (500 lines)
├── [NEW] Integration Layer (200 lines)
├── [Existing] Game mechanics
└── [Existing] Render loop
```

**Estimated Addition:** ~1,950 lines of new code

---

## Implementation Order

1. **Phase 1:** Data layer & persistence (foundation)
2. **Phase 2:** Player generation (needed for testing)
3. **Phase 3:** Basic roster UI (to visualize progress)
4. **Phase 4:** Economy system (core loop)
5. **Phase 5:** Integration with gameplay (connect roster to game)
6. **Phase 6:** Progression system (weekly updates)
7. **Phase 7:** Season & schedule (structure)
8. **Phase 8:** Match simulation (enemy scoring)
9. **Phase 9:** Full management UI (polish)
10. **Phase 10:** Free agency (content)
11. **Phase 11:** Facilities & upgrades (depth)

---

## Progress Tracking

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Data Layer & Persistence | COMPLETE |
| 2 | Player Generation & Roster | COMPLETE |
| 3 | Economy System | COMPLETE |
| 4 | Progression & Regression | COMPLETE |
| 5 | Season & Schedule | COMPLETE |
| 6 | Match Simulation | COMPLETE |
| 7 | Management UI | COMPLETE |
| 8 | Integration with Game | COMPLETE |
| 9 | Free Agency | COMPLETE |
| 10 | Testing & Polish | IN PROGRESS |

---

## Implementation Summary

### What Was Implemented

1. **Data Layer (~200 lines)**
   - `managementState` global object for team, season, free agents
   - `SaveSystem` with localStorage persistence
   - Auto-save after game changes

2. **Player Generation (~180 lines)**
   - Medieval-themed name pools (40 first names, 36 last names)
   - Position-specific stat generation with primary stat bonuses
   - Tier system (rookie, average, veteran, elite)
   - Potential grades (0-3) affecting growth
   - Peak age calculation for decline

3. **Economy System (~100 lines)**
   - Credits currency
   - Salary cap with bribe modifier
   - Game revenue (home/away)
   - Facility upgrade costs
   - Player signing bonuses and sale values

4. **Progression System (~100 lines)**
   - Weekly stat growth based on age, potential, and training facility
   - Post-peak decline for physical stats
   - Retirement check (age > 40 or avg stat < 35)

5. **Season & Schedule (~80 lines)**
   - 16-week season
   - 16 opponent teams with varying difficulty
   - Schedule generation with home/away
   - Win/loss tracking

6. **Match Simulation (~80 lines)**
   - 5 possessions per game
   - Enemy scoring simulation based on defense rating
   - TD/FG/STOP outcomes with probability math

7. **Management UI (~1000 lines)**
   - Main Menu (new game / continue)
   - Team Hub with status bar
   - Roster screen with position grouping
   - Player Detail with stat bars and season changes
   - Free Agency with signing buttons
   - Facilities with upgrade buttons and bribe option
   - Schedule screen with results
   - Match HUD overlay during gameplay
   - Match End results screen

8. **Game Integration (~50 lines)**
   - Touchdown triggers onPossessionComplete(7)
   - Turnover on downs triggers onPossessionComplete(0)
   - Screen switching between management and game modes
   - HTML element visibility toggling

---

## Notes & Adaptations

### Adaptations from Original Spec

1. **Medieval Theme:** All names, team names, and UI elements will maintain the existing knight/medieval aesthetic rather than modern football terminology.

2. **Position Mapping:**
   - WR (Wide Receiver) → "Knights" or "Runners"
   - CB (Cornerback) → "Defenders" or "Sentinels"
   - OL (Offensive Line) → "Blockers" or "Shield Wall"
   - DL (Defensive Line) → "Rushers" or "Siege Line"
   - QB (Quarterback) → "Captain" or "Commander"

3. **Simplified Defense:** Rather than playing defense manually, enemy scoring is simulated based on your defense quality vs opponent offense.

4. **5 Possessions Per Game:** Matches the arcade feel - quick games with meaningful decisions.

5. **Facility Themes:**
   - Stadium → "Arena" or "Coliseum"
   - Training Center → "Training Grounds" or "Barracks"

6. **Economy Scale:** Adjusted to feel meaningful:
   - Starting credits: 10,000
   - Salary cap: 50,000
   - Average player salary: 3,000-8,000

---

*Last Updated: December 20, 2025 - Initial implementation complete*
