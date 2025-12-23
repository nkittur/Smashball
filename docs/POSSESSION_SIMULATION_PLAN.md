# Possession Simulation Overhaul - Implementation Plan

## Overview

This document outlines a comprehensive overhaul of the possession simulation system to create a high-fidelity, round-based simulation that can be used for both enemy possessions and player-initiated simulations.

### Goals
1. **Higher Fidelity**: More realistic play progression with dynamic route running and pressure buildup
2. **Reusable**: Same simulation can be used for enemy AI and player "simulate" option
3. **Transparent**: Each round produces clear outcomes that could be displayed to users
4. **Stat-Driven**: All outcomes determined by player stats with appropriate weights

---

## Core Concepts

### Round-Based Structure

Each play is divided into **rounds**, where each round represents ~1.5 seconds of real-time football action.

```
Round 1: 0.0s - 1.5s  (Ball snapped, initial routes)
Round 2: 1.5s - 3.0s  (Routes develop, pocket forms)
Round 3: 3.0s - 4.5s  (Routes mature, pressure builds)
Round 4: 4.5s - 6.0s  (Deep routes complete, heavy pressure)
Round 5: 6.0s - 7.5s  (Scramble territory, extreme pressure)
```

**Maximum rounds**: 5 (7.5 seconds is an extremely long play)

### Route Template System

Routes are defined as templates with per-round depth and crossing information:

```javascript
// Route template structure
{
    name: 'slant',
    rounds: [
        { depth: 3, crossing: true },   // Round 1: 3 yards deep, crossing
        { depth: 5, crossing: false },  // Round 2: 5 yards total, straight
        { depth: 7, crossing: false },  // Round 3: 7 yards total, continue
        { depth: 8, crossing: false },  // Round 4: settling
        { depth: 8, crossing: false }   // Round 5: stationary
    ],
    breakRound: 1  // Round where the "break" happens (for separation bonus)
}
```

---

## Implementation Components

### 1. Route Template Definitions

**File location**: `index.html` (new section after existing route generation code around line 5165)

**New constant**: `ROUTE_TEMPLATES`

#### Standard Routes (Field Position: 20+ yards from goal)

| Route Name | R1 Depth | R1 Cross | R2 Depth | R2 Cross | R3 Depth | R3 Cross | R4 Depth | R4 Cross | R5 Depth | R5 Cross | Break Round |
|------------|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|-------------|
| **go** | 5 | no | 12 | no | 20 | no | 28 | no | 35 | no | - |
| **slant** | 3 | yes | 6 | no | 8 | no | 8 | no | 8 | no | 1 |
| **out** | 4 | no | 8 | yes | 10 | no | 10 | no | 10 | no | 2 |
| **in** | 4 | no | 8 | yes | 10 | no | 10 | no | 10 | no | 2 |
| **post** | 5 | no | 10 | yes | 18 | no | 25 | no | 30 | no | 2 |
| **corner** | 5 | no | 10 | yes | 18 | no | 25 | no | 30 | no | 2 |
| **curl** | 5 | no | 10 | no | 8 | yes | 8 | no | 8 | no | 3 |
| **comeback** | 5 | no | 12 | no | 10 | yes | 10 | no | 10 | no | 3 |
| **dig** | 4 | no | 8 | no | 10 | yes | 12 | no | 12 | no | 3 |
| **seam** | 4 | no | 10 | no | 16 | no | 22 | no | 28 | no | - |
| **flat** | 2 | yes | 3 | no | 3 | no | 3 | no | 3 | no | 1 |
| **wheel** | 2 | yes | 5 | no | 10 | no | 16 | no | 22 | no | 1 |
| **hitch** | 4 | no | 4 | no | 4 | no | 4 | no | 4 | no | 1 |

#### Red Zone Routes (8-20 yards from goal)

| Route Name | R1 | R2 | R3 | R4 | R5 | Break |
|------------|----------|----------|----------|----------|----------|-------|
| **fade** | 4/no | 8/no | 12/no | 15/no | 15/no | - |
| **back_shoulder** | 5/no | 8/no | 7/no | 7/no | 7/no | 3 |
| **corner_fade** | 3/no | 6/yes | 10/no | 12/no | 12/no | 2 |
| **quick_slant** | 2/yes | 5/no | 6/no | 6/no | 6/no | 1 |
| **out_quick** | 3/no | 5/yes | 5/no | 5/no | 5/no | 2 |

#### Goal Line Routes (0-8 yards from goal)

| Route Name | R1 | R2 | R3 | R4 | R5 | Break |
|------------|----------|----------|----------|----------|----------|-------|
| **endzone_fade** | 2/no | 5/no | 7/no | 7/no | 7/no | - |
| **endzone_slant** | 2/yes | 4/no | 5/no | 5/no | 5/no | 1 |
| **endzone_out** | 2/no | 3/yes | 4/no | 4/no | 4/no | 2 |
| **endzone_flat** | 1/yes | 2/no | 2/no | 2/no | 2/no | 1 |

---

### 2. Pre-Play Setup

#### 2.1 Route Selection Function

```javascript
function selectRoutesForPlay(receivers, yardsFromGoal, yardsToGo, down) {
    // Returns: { receiverId: routeTemplate }

    // Determine field zone
    const zone = yardsFromGoal <= 8 ? 'goalline' :
                 yardsFromGoal <= 20 ? 'redzone' : 'standard';

    // Get available routes for zone
    const availableRoutes = ROUTE_TEMPLATES[zone];

    // Select routes based on situation
    // - 3rd/4th and long: more deep routes
    // - 3rd/4th and short: more quick routes
    // - 1st down: mix of routes

    // Ensure route diversity (don't run all same routes)
    // At least one short, one medium, one deep if 3+ receivers
}
```

#### 2.2 Initial State Setup

```javascript
function initializePlayState(offense, defense, fieldPosition) {
    return {
        round: 0,
        maxRounds: 5,

        // Field state
        yardsFromGoal: fieldPosition.yardsFromGoal,
        yardsToGo: fieldPosition.yardsToGo,
        down: fieldPosition.down,

        // Pressure tracking
        totalPressure: 0,
        sacked: false,

        // Receiver states
        receivers: offense.receivers.map(wr => ({
            id: wr.id,
            stats: wr.stats,
            route: selectedRoutes[wr.id],
            currentDepth: 0,
            separation: 0,      // Positive = open, negative = covered
            catchProbability: 0,
            targetedRound: null
        })),

        // Defender states
        defenders: defense.dbs.map(db => ({
            id: db.id,
            stats: db.stats,
            assignedReceiver: null,  // Man coverage assignment
            zoneArea: null           // Zone coverage area
        })),

        // Line states
        oLine: offense.oLine.map(ol => ({
            id: ol.id,
            stats: ol.stats,
            engaged: false,
            knockedDown: false
        })),

        dLine: defense.dLine.map(dl => ({
            id: dl.id,
            stats: dl.stats,
            engaged: false,
            knockedDown: false,
            pressureContribution: 0
        })),

        // QB state
        qb: {
            stats: offense.qb.stats,
            trait: offense.qb.trait,  // 'gunslinger' | 'game_manager' | 'balanced'
            hasThrown: false,
            targetReceiver: null
        },

        // Result tracking
        result: null  // Set when play ends
    };
}
```

---

### 3. Round Processing

#### 3.1 Main Round Loop

```javascript
function simulatePlay(offense, defense, fieldPosition) {
    const state = initializePlayState(offense, defense, fieldPosition);

    while (state.round < state.maxRounds && !state.result) {
        state.round++;

        // Phase 1: OL/DL Clashes
        processLineClashesRound(state);

        // Check for sack
        if (state.sacked) {
            state.result = resolveSack(state);
            break;
        }

        // Phase 2: WR/DB Separation Clashes
        processReceiverClashesRound(state);

        // Phase 3: Calculate catch probabilities
        calculateCatchProbabilities(state);

        // Phase 4: QB Decision
        const throwDecision = processQBDecision(state);

        if (throwDecision.shouldThrow) {
            // Phase 5: Resolve throw
            state.result = resolveThrow(state, throwDecision.target);
            break;
        }

        // Apply cumulative pressure bonus for next round
        state.pressureBonus = state.round * 5;  // +5 per round to DL
    }

    // If no throw after max rounds, QB scrambles or throws it away
    if (!state.result) {
        state.result = resolveDesperationPlay(state);
    }

    return state.result;
}
```

---

### 4. OL/DL Clash System (Per Round)

#### 4.1 Clash Resolution

```javascript
function processLineClashesRound(state) {
    const roundBonus = (state.round - 1) * 5;  // DL gets stronger each round

    let totalPressure = 0;

    for (const dl of state.dLine) {
        if (dl.knockedDown) {
            dl.pressureContribution = 0;
            continue;
        }

        // Find engaged OL (or closest available)
        const ol = findEngagedOLineman(state, dl);

        if (!ol || ol.knockedDown) {
            // Unblocked rusher - maximum pressure
            dl.pressureContribution = 40;
            totalPressure += 40;

            // High sack chance for unblocked rusher
            if (Math.random() < 0.35) {
                state.sacked = true;
                state.sackingPlayer = dl;
            }
            continue;
        }

        // Resolve clash
        const olRoll = weightedStatRoll(ol.stats, {
            passBlock: 0.35,
            strength: 0.30,
            balance: 0.20,
            awareness: 0.15
        });

        const dlRoll = weightedStatRoll(dl.stats, {
            passRush: 0.35,
            strength: 0.30,
            acceleration: 0.20,
            speed: 0.15
        }) + roundBonus;  // Cumulative pressure bonus

        const margin = dlRoll - olRoll;

        // Determine outcome
        if (margin > 20) {
            // DL dominant win - sack chance
            dl.pressureContribution = 35;
            if (Math.random() < 0.25) {
                state.sacked = true;
                state.sackingPlayer = dl;
            }
            // OL might get knocked down
            if (Math.random() < 0.3) {
                ol.knockedDown = true;
            }
        } else if (margin > 10) {
            // DL strong win - heavy pressure
            dl.pressureContribution = 25;
        } else if (margin > 5) {
            // DL moderate win
            dl.pressureContribution = 15;
        } else if (margin > 0) {
            // DL slight advantage
            dl.pressureContribution = 10;
        } else if (margin > -5) {
            // Neutral
            dl.pressureContribution = 5;
        } else if (margin > -10) {
            // OL moderate win
            dl.pressureContribution = 0;
        } else {
            // OL dominant win - DL might get knocked down
            dl.pressureContribution = 0;
            if (Math.random() < 0.2) {
                dl.knockedDown = true;
            }
        }

        totalPressure += dl.pressureContribution;
    }

    state.totalPressure = Math.min(totalPressure, 100);
}
```

#### 4.2 Sack Resolution

```javascript
function resolveSack(state) {
    // Sack loses 5-10 yards based on DL speed
    const sackYards = 5 + Math.floor(Math.random() * 6);

    return {
        type: 'sack',
        yardsGained: -sackYards,
        tackler: state.sackingPlayer,
        description: `Sacked for a loss of ${sackYards} yards`
    };
}
```

---

### 5. WR/DB Separation System (Per Round)

#### 5.1 Separation Clash

```javascript
function processReceiverClashesRound(state) {
    for (const receiver of state.receivers) {
        const routeRound = receiver.route.rounds[state.round - 1];
        const isCrossing = routeRound.crossing;
        const isBreakRound = receiver.route.breakRound === state.round;

        // Update receiver depth
        receiver.currentDepth = routeRound.depth;

        // Find covering defender(s)
        const defenders = findCoveringDefenders(state, receiver);

        if (defenders.length === 0) {
            // No coverage - receiver is wide open
            receiver.separation = 30;
            continue;
        }

        // Calculate receiver's route running roll
        let receiverRoll = weightedStatRoll(receiver.stats, {
            routeRunning: 0.25,
            agility: 0.25,
            speed: 0.25,
            acceleration: 0.15,
            release: 0.10
        });

        // Crossing route bonus (if this round has crossing)
        if (isCrossing) {
            const crossingBonus = (receiver.stats.agility * 0.3 +
                                   receiver.stats.routeRunning * 0.2);
            receiverRoll += crossingBonus * 0.5;  // Up to +15 bonus
        }

        // Break point bonus (route breaks create separation opportunities)
        if (isBreakRound) {
            const breakBonus = receiver.stats.routeRunning * 0.3;
            receiverRoll += breakBonus;  // Up to +30 on the break
        }

        // Average defender roll (if multiple defenders, use best)
        let bestDefenderRoll = 0;
        for (const defender of defenders) {
            const defenderRoll = weightedStatRoll(defender.stats, {
                manCoverage: 0.30,
                speed: 0.25,
                agility: 0.20,
                awareness: 0.15,
                acceleration: 0.10
            });

            // Crossing coverage penalty (harder to stay with crossing routes)
            const crossingPenalty = isCrossing ?
                (100 - defender.stats.agility) * 0.15 : 0;

            const adjustedRoll = defenderRoll - crossingPenalty;
            bestDefenderRoll = Math.max(bestDefenderRoll, adjustedRoll);
        }

        // Double coverage bonus for defense
        if (defenders.length > 1) {
            bestDefenderRoll += 10;
        }

        // Calculate separation
        const separationMargin = receiverRoll - bestDefenderRoll;
        receiver.separation = separationMargin;
        receiver.isCovered = separationMargin < 5;
    }
}
```

---

### 6. Catch Probability Calculation

```javascript
function calculateCatchProbabilities(state) {
    const qbAccuracy = (state.qb.stats.throwing + state.qb.stats.awareness) / 2;
    const pressurePenalty = state.totalPressure * 0.3;  // Up to -30% under pressure

    for (const receiver of state.receivers) {
        // Base catch from receiver's catching stat
        let catchProb = receiver.stats.catching;

        // Separation bonus/penalty
        if (receiver.separation >= 15) {
            // Wide open - easy catch
            catchProb += 15;
        } else if (receiver.separation >= 5) {
            // Good separation
            catchProb += 5;
        } else if (receiver.separation >= 0) {
            // Slight separation - contested
            catchProb -= 10;
        } else if (receiver.separation >= -10) {
            // Covered - difficult catch
            catchProb -= 25;
        } else {
            // Blanket coverage - very difficult
            catchProb -= 40;
        }

        // QB accuracy adjustment
        const qbBonus = (qbAccuracy - 70) * 0.3;  // +9 for 100 QB, -6 for 50 QB
        catchProb += qbBonus;

        // Pressure penalty on throw accuracy
        catchProb -= pressurePenalty;

        // Route depth penalty (longer throws are harder)
        const depthPenalty = Math.max(0, (receiver.currentDepth - 15) * 0.5);
        catchProb -= depthPenalty;

        // Focus stat for contested catches
        if (receiver.separation < 5) {
            const focusBonus = (receiver.stats.focus - 70) * 0.2;
            catchProb += focusBonus;
        }

        // Clamp to reasonable range
        receiver.catchProbability = Math.max(5, Math.min(95, catchProb));
    }
}
```

---

### 7. QB Decision System

#### 7.1 QB Traits

```javascript
const QB_TRAITS = {
    gunslinger: {
        name: 'Gunslinger',
        description: 'Waits for big plays, takes risks',
        openThreshold: 60,      // Needs higher catch % to throw
        pressureMultiplier: 0.7, // Less affected by pressure
        firstDownBias: -10,     // Less likely to take short gains
        aggressiveness: 1.3     // More likely to throw into coverage
    },
    game_manager: {
        name: 'Game Manager',
        description: 'Takes safe throws, avoids mistakes',
        openThreshold: 45,      // Throws to first open receiver
        pressureMultiplier: 1.3, // More affected by pressure
        firstDownBias: 20,      // Heavily favors first down throws
        aggressiveness: 0.7     // Avoids risky throws
    },
    balanced: {
        name: 'Balanced',
        description: 'Adapts to situation',
        openThreshold: 52,
        pressureMultiplier: 1.0,
        firstDownBias: 5,
        aggressiveness: 1.0
    },
    scrambler: {
        name: 'Scrambler',
        description: 'Prefers to run when pressured',
        openThreshold: 55,
        pressureMultiplier: 0.5, // Much less affected by pressure
        firstDownBias: 0,
        aggressiveness: 0.9,
        scrambleBonus: 20       // Extra likelihood to scramble
    }
};
```

#### 7.2 Decision Algorithm

```javascript
function processQBDecision(state) {
    const trait = QB_TRAITS[state.qb.trait] || QB_TRAITS.balanced;
    const qbStats = state.qb.stats;

    // Step 1: Can QB "see" each receiver?
    // Based on awareness (field vision) and the receiver's separation
    const visibleReceivers = [];

    for (const receiver of state.receivers) {
        // Vision check - easier to notice wide open receivers
        const visionRoll = weightedStatRoll(qbStats, {
            awareness: 0.50,  // Primary "vision" stat
            throwing: 0.30,   // Experience reading defenses
            focus: 0.20       // Concentration
        });

        // Easier to notice more open receivers
        const noticeThreshold = 70 - receiver.separation;  // Open = lower threshold

        // Add randomness
        const noticeRoll = visionRoll + (Math.random() * 20 - 10);

        if (noticeRoll >= noticeThreshold) {
            visibleReceivers.push({
                receiver,
                noticed: true,
                catchProb: receiver.catchProbability
            });
        }
    }

    // Step 2: Evaluate throw options
    let throwLikelihood = 0;
    let bestTarget = null;
    let bestScore = -999;

    for (const option of visibleReceivers) {
        const receiver = option.receiver;
        let score = receiver.catchProbability;

        // First down consideration
        const wouldGetFirstDown = receiver.currentDepth >= state.yardsToGo;
        if (wouldGetFirstDown) {
            score += trait.firstDownBias;
        } else {
            // Penalty for throws short of first down (especially late in play)
            score -= (state.round * 3);  // Increasing penalty each round
        }

        // Down situation urgency
        if (state.down >= 3 && !wouldGetFirstDown) {
            score -= 15;  // Don't want to throw short on 3rd/4th
        }

        // Trait-based threshold
        if (receiver.catchProbability < trait.openThreshold) {
            score -= 20;  // Below QB's comfort threshold
        }

        // Aggressiveness modifier for contested throws
        if (receiver.separation < 5) {
            score *= trait.aggressiveness;
        }

        if (score > bestScore) {
            bestScore = score;
            bestTarget = receiver;
        }
    }

    // Step 3: Calculate throw likelihood
    if (bestTarget) {
        // Base likelihood from best option's score
        throwLikelihood = bestScore;

        // Pressure factor
        const pressureUrgency = state.totalPressure * trait.pressureMultiplier;
        throwLikelihood += pressureUrgency * 0.5;  // Pressure makes QB want to throw

        // Round factor (later rounds = more urgency)
        throwLikelihood += state.round * 8;

        // Very high pressure = must throw
        if (state.totalPressure > 70) {
            throwLikelihood += 30;
        }

        // Minimum threshold to throw
        const throwThreshold = 50 + (5 - state.round) * 5;  // Lower threshold later
    } else {
        // No visible targets - pressure-based throw away likelihood
        throwLikelihood = state.totalPressure * 0.5 + state.round * 10;
    }

    // Step 4: Roll to throw
    const throwRoll = Math.random() * 100;
    const shouldThrow = throwRoll < throwLikelihood;

    return {
        shouldThrow,
        target: bestTarget,
        throwLikelihood,
        visibleReceivers,
        reason: shouldThrow ?
            (bestTarget ? 'Found open receiver' : 'Threw it away') :
            'Waiting for better option'
    };
}
```

---

### 8. Throw Resolution

#### 8.1 Catch Attempt

```javascript
function resolveThrow(state, target) {
    if (!target) {
        // Throw away / intentional grounding
        return {
            type: 'throwaway',
            yardsGained: 0,
            description: 'QB throws the ball away'
        };
    }

    const receiver = target;
    const catchRoll = Math.random() * 100;

    // Determine if caught
    if (catchRoll < receiver.catchProbability) {
        // CAUGHT - now resolve YAC
        return resolveCatchAndRun(state, receiver);
    } else {
        // Incomplete or interception
        return resolveIncompletions(state, receiver, catchRoll);
    }
}
```

#### 8.2 Interception Check

```javascript
function resolveIncompletions(state, receiver, catchRoll) {
    // Check for interception
    // Higher chance if: heavily covered, ball was tipped, bad throw
    const defenders = findCoveringDefenders(state, receiver);

    if (defenders.length > 0 && receiver.separation < 0) {
        const bestDefender = defenders[0];

        // INT probability based on how badly the catch failed
        const catchFailMargin = catchRoll - receiver.catchProbability;
        let intChance = catchFailMargin * 0.3;  // Base INT chance

        // Defender's ball skills
        intChance += (bestDefender.stats.awareness - 60) * 0.2;
        intChance += (bestDefender.stats.catching || 50 - 50) * 0.1;

        // Cap INT chance
        intChance = Math.max(5, Math.min(35, intChance));

        if (Math.random() * 100 < intChance) {
            return {
                type: 'interception',
                yardsGained: 0,
                interceptedBy: bestDefender,
                description: `Intercepted by ${bestDefender.id}!`
            };
        }
    }

    return {
        type: 'incomplete',
        yardsGained: 0,
        description: 'Pass incomplete'
    };
}
```

---

### 9. Yards After Catch (YAC) System

#### 9.1 Initial Tackle Attempt

```javascript
function resolveCatchAndRun(state, receiver) {
    let totalYards = receiver.currentDepth;
    const yacEvents = [];

    // Find nearest defender for immediate tackle attempt
    const nearestDB = findNearestDefender(state, receiver);

    if (nearestDB && receiver.separation < 10) {
        // Contested catch - immediate tackle attempt
        const tackleResult = resolveTackleAttempt(receiver, nearestDB, 'catch_point');

        if (tackleResult.tackled) {
            return {
                type: 'complete',
                yardsGained: totalYards,
                caughtBy: receiver,
                tackledBy: nearestDB,
                yacEvents: [tackleResult],
                description: `Caught for ${totalYards} yards, tackled immediately`
            };
        } else {
            yacEvents.push(tackleResult);
            // Broken tackle - continue to YAC phase
        }
    }

    // YAC Phase - run until tackled
    return resolveYACPhase(state, receiver, totalYards, yacEvents);
}
```

#### 9.2 YAC Phase (Break Tackles)

```javascript
function resolveYACPhase(state, receiver, startYards, existingEvents) {
    let totalYards = startYards;
    const yacEvents = [...existingEvents];
    let tackled = false;

    // Maximum YAC iterations (prevent infinite loops)
    const maxYACAttempts = 3;

    for (let attempt = 0; attempt < maxYACAttempts && !tackled; attempt++) {
        // Roll for yards gained this segment
        const yacRoll = weightedStatRoll(receiver.stats, {
            speed: 0.35,
            acceleration: 0.25,
            agility: 0.25,
            balance: 0.15
        });

        // Yards gained proportional to stats (2-12 yards per segment)
        const segmentYards = Math.floor(2 + (yacRoll / 100) * 10);

        // Find next tackler
        const nextTackler = findNextTackler(state, receiver, attempt);

        if (!nextTackler) {
            // No one left - touchdown potential
            totalYards += segmentYards;
            yacEvents.push({
                type: 'open_field',
                yardsGained: segmentYards,
                description: 'Open field running'
            });
            continue;
        }

        // Safety gets bonus on later tackle attempts
        const safetyBonus = nextTackler.position === 'S' ?
            (10 + attempt * 5) : 0;

        const tackleResult = resolveTackleAttempt(
            receiver,
            nextTackler,
            'yac',
            { safetyBonus }
        );

        if (tackleResult.tackled) {
            totalYards += Math.floor(segmentYards * 0.5);  // Partial yards
            yacEvents.push(tackleResult);
            tackled = true;
        } else {
            totalYards += segmentYards;
            yacEvents.push(tackleResult);
        }
    }

    // Check for touchdown
    const isTouchdown = totalYards >= state.yardsFromGoal;

    return {
        type: isTouchdown ? 'touchdown' : 'complete',
        yardsGained: isTouchdown ? state.yardsFromGoal : totalYards,
        caughtBy: receiver,
        tackledBy: yacEvents.find(e => e.tackled)?.tackler || null,
        yacEvents,
        yac: totalYards - startYards,
        description: isTouchdown ?
            `TOUCHDOWN! ${totalYards} yard catch and run!` :
            `Caught for ${startYards} yards, ${totalYards - startYards} YAC`
    };
}
```

#### 9.3 Tackle Resolution

```javascript
function resolveTackleAttempt(ballCarrier, tackler, situation, options = {}) {
    const { safetyBonus = 0 } = options;

    // Ball carrier evasion roll
    const evasionRoll = weightedStatRoll(ballCarrier.stats, {
        agility: 0.35,
        speed: 0.25,
        balance: 0.25,
        strength: 0.15
    });

    // Tackler roll
    let tackleRoll = weightedStatRoll(tackler.stats, {
        tackling: 0.40,
        pursuit: 0.25,
        hitPower: 0.20,
        speed: 0.15
    });

    // Apply bonuses
    tackleRoll += safetyBonus;

    // Situation modifiers
    if (situation === 'catch_point') {
        // Easier to tackle at catch point (receiver off balance)
        tackleRoll += 5;
    }

    const margin = tackleRoll - evasionRoll;
    const breakTackleThreshold = -12;  // Receiver needs to win by 12+

    if (margin > breakTackleThreshold) {
        // Tackle successful
        return {
            type: 'tackle',
            tackled: true,
            tackler,
            margin,
            description: margin > 10 ? 'Big hit!' : 'Tackled'
        };
    } else {
        // Broken tackle!
        return {
            type: 'broken_tackle',
            tackled: false,
            tackler,
            margin,
            description: margin < -20 ? 'Juked out of his shoes!' : 'Broken tackle!'
        };
    }
}
```

---

### 10. Desperation Play Resolution

```javascript
function resolveDesperationPlay(state) {
    const trait = QB_TRAITS[state.qb.trait] || QB_TRAITS.balanced;

    // After max rounds, QB must do something
    if (state.totalPressure > 60) {
        // High pressure - likely sack or throw away
        if (Math.random() < 0.4) {
            return {
                type: 'sack',
                yardsGained: -Math.floor(5 + Math.random() * 5),
                description: 'Sacked after holding the ball too long'
            };
        }
    }

    // Scrambler QBs might run
    if (trait.scrambleBonus) {
        const scrambleYards = Math.floor(
            (state.qb.stats.speed * 0.1) +
            (state.qb.stats.agility * 0.05) +
            Math.random() * 5
        );

        if (Math.random() < 0.3) {
            return {
                type: 'scramble',
                yardsGained: scrambleYards,
                description: `QB scrambles for ${scrambleYards} yards`
            };
        }
    }

    // Find any receiver and heave it
    const bestReceiver = state.receivers.reduce((best, r) =>
        r.catchProbability > (best?.catchProbability || 0) ? r : best, null
    );

    if (bestReceiver && bestReceiver.catchProbability > 20) {
        // Desperation throw - reduced catch probability
        bestReceiver.catchProbability *= 0.7;
        return resolveThrow(state, bestReceiver);
    }

    // Throw it away
    return {
        type: 'throwaway',
        yardsGained: 0,
        description: 'QB throws it away under pressure'
    };
}
```

---

### 11. Full Drive Simulation

```javascript
function simulatePossession(offense, defense, startingFieldPosition) {
    let fieldPosition = { ...startingFieldPosition };
    const plays = [];
    let driveResult = null;

    while (!driveResult) {
        // Select routes for this play
        const routes = selectRoutesForPlay(
            offense.receivers,
            fieldPosition.yardsFromGoal,
            fieldPosition.yardsToGo,
            fieldPosition.down
        );

        // Assign routes to receivers
        offense.receivers.forEach((wr, i) => {
            wr.route = routes[wr.id] || routes[i];
        });

        // Simulate the play
        const playResult = simulatePlay(offense, defense, fieldPosition);
        plays.push(playResult);

        // Update field position
        fieldPosition = updateFieldPosition(fieldPosition, playResult);

        // Check for drive-ending results
        if (playResult.type === 'touchdown') {
            driveResult = { points: 7, type: 'touchdown', plays };
        } else if (playResult.type === 'interception') {
            driveResult = { points: 0, type: 'turnover', plays };
        } else if (fieldPosition.down > 4) {
            // 4th down decision
            if (fieldPosition.yardsFromGoal <= 40) {
                // Field goal attempt
                const fgDistance = fieldPosition.yardsFromGoal + 17;
                const fgSuccess = Math.random() < (0.95 - fgDistance * 0.01);
                driveResult = {
                    points: fgSuccess ? 3 : 0,
                    type: fgSuccess ? 'field_goal' : 'missed_fg',
                    plays
                };
            } else {
                // Punt
                driveResult = { points: 0, type: 'punt', plays };
            }
        } else if (plays.length >= 15) {
            // Safety valve - shouldn't happen normally
            driveResult = { points: 0, type: 'punt', plays };
        }
    }

    return driveResult;
}

function updateFieldPosition(current, playResult) {
    const newYardsFromGoal = current.yardsFromGoal - playResult.yardsGained;
    const yardsGainedTowardFirstDown = playResult.yardsGained;

    // Check first down
    if (yardsGainedTowardFirstDown >= current.yardsToGo) {
        return {
            yardsFromGoal: Math.max(0, newYardsFromGoal),
            yardsToGo: 10,
            down: 1
        };
    }

    return {
        yardsFromGoal: Math.max(0, newYardsFromGoal),
        yardsToGo: current.yardsToGo - yardsGainedTowardFirstDown,
        down: current.down + 1
    };
}
```

---

## Additional Considerations

### 12. Missing Elements to Address

#### 12.1 Coverage Schemes
Need to implement zone vs man coverage detection:
```javascript
function determineCoverageScheme(defense) {
    // Analyze defensive personnel and tendencies
    // Returns 'man', 'zone', or 'mixed'
}
```

#### 12.2 Defensive Adjustments
Defense should adapt based on down/distance:
- 3rd and long: More deep coverage
- 3rd and short: Tighter coverage, blitz possibility
- Red zone: Condensed coverage

#### 12.3 Play Action / RPO
Future enhancement - fake handoff that affects DL rush timing

#### 12.4 Penalties
Consider adding:
- Holding (OL, if DL wins decisively but blocked)
- Pass interference (if WR wins separation but DB grabs)
- Intentional grounding (if throw away in pocket)

#### 12.5 Weather/Fatigue
Could affect catch probability and stats over time

#### 12.6 Hurry-Up Offense
Reduced time between plays affecting stamina

---

### 13. Stat Requirements

#### New Stats Needed
The current stat system mostly covers our needs, but we should ensure:

1. **QB Trait**: Need to store/generate QB trait ('gunslinger', 'game_manager', 'balanced', 'scrambler')
2. **Position for Safety**: Need to distinguish Safety from CB for tackle bonuses
3. **Catching for Defenders**: For interceptions (can default to 50 if not present)

#### Stat Weight Reference

| Action | Stats Used | Weights |
|--------|------------|---------|
| OL Block | passBlock, strength, balance, awareness | 0.35, 0.30, 0.20, 0.15 |
| DL Rush | passRush, strength, acceleration, speed | 0.35, 0.30, 0.20, 0.15 |
| WR Route | routeRunning, agility, speed, acceleration, release | 0.25, 0.25, 0.25, 0.15, 0.10 |
| DB Coverage | manCoverage, speed, agility, awareness, acceleration | 0.30, 0.25, 0.20, 0.15, 0.10 |
| Catch | catching, focus | Primary, modifier |
| QB Vision | awareness, throwing, focus | 0.50, 0.30, 0.20 |
| Break Tackle | agility, speed, balance, strength | 0.35, 0.25, 0.25, 0.15 |
| Tackle | tackling, pursuit, hitPower, speed | 0.40, 0.25, 0.20, 0.15 |
| YAC Run | speed, acceleration, agility, balance | 0.35, 0.25, 0.25, 0.15 |

---

### 14. Implementation Order

#### Phase 1: Core Infrastructure
1. Define `ROUTE_TEMPLATES` constant with all route definitions
2. Create `selectRoutesForPlay()` function
3. Add `QB_TRAITS` constant
4. Add QB trait generation to player creation

#### Phase 2: Round-Based Engine
5. Implement `initializePlayState()`
6. Implement `processLineClashesRound()`
7. Implement `processReceiverClashesRound()`
8. Implement `calculateCatchProbabilities()`

#### Phase 3: QB Decision System
9. Implement `processQBDecision()`
10. Implement vision/awareness check for receivers

#### Phase 4: Resolution Systems
11. Implement `resolveThrow()`
12. Implement `resolveIncompletions()` with INT logic
13. Implement `resolveCatchAndRun()`
14. Implement `resolveYACPhase()`
15. Implement `resolveTackleAttempt()`
16. Implement `resolveDesperationPlay()`

#### Phase 5: Integration
17. Implement `simulatePlay()` main loop
18. Implement `simulatePossession()` drive wrapper
19. Update `simulateEnemyPossession()` to use new system
20. Add "Simulate" option for player to use same system

#### Phase 6: Polish
21. Add detailed play-by-play descriptions
22. Tune stat weights and thresholds
23. Add edge case handling
24. Test balance across different team compositions

---

### 15. Testing Strategy

1. **Unit tests** for each clash type (OL/DL, WR/DB, tackle)
2. **Integration test** for full play simulation
3. **Balance testing**: Run 1000 simulated drives, analyze:
   - Points per drive distribution
   - Completion percentage
   - Sack rate
   - Interception rate
   - Average yards per play
   - Touchdown rate

4. **Edge case testing**:
   - All elite offense vs all poor defense (should dominate)
   - All poor offense vs all elite defense (should struggle)
   - Goal line situations
   - 4th and long desperation

---

## Summary

This overhaul transforms the possession simulation from a simplified probability model into a detailed round-by-round simulation that:

1. **Models realistic route development** with depth and crossing patterns per round
2. **Simulates cumulative pressure** that increases over time
3. **Implements intelligent QB decision-making** based on traits, pressure, and receiver availability
4. **Creates dynamic YAC situations** with multiple tackle attempts and safety help
5. **Uses all relevant player stats** with appropriate weights for each action
6. **Can serve both AI possessions and player simulations** with the same high-fidelity engine

The result will be a more engaging, realistic, and strategically deep simulation system.
