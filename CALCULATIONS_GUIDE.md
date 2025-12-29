# Smashball Gameplay Calculations Guide

This document details every calculation in the game, what stats affect it, and how outcomes are determined.

---

## Game Modes Overview

The game has two distinct modes that use different calculation systems:

| Mode | Description | Key Characteristics |
|------|-------------|---------------------|
| **Gameplay Mode** | Interactive 3D Babylon.js game | Real-time, continuous movement, player controls QB throws |
| **Simulation Mode** | Text-based auto-sim for opponent drives | Round-based (5 rounds max), AI controls everything |

Both modes use the same stat weights (`CLASH_WEIGHTS`) and the same core roll formula, but differ in how and when calculations are triggered.

---

## Table of Contents
1. [Stat System Overview](#stat-system-overview)
2. [Separation Clash (WR vs CB)](#1-separation-clash-wr-vs-cb)
3. [Line Clash (OL vs DL)](#2-line-clash-ol-vs-dl)
4. [Tackle Clash](#3-tackle-clash)
5. [Physical Clash](#4-physical-clash)
6. [Catch Probability](#5-catch-probability)
7. [Yards After Catch (YAC)](#6-yards-after-catch-yac)
8. [QB Vision Check](#7-qb-vision-check)
9. [Position Abilities](#8-position-abilities)
10. [Quick Reference Tables](#9-quick-reference-tables)

---

## Stat System Overview

### Three-Tier System
| Tier | Description | Examples |
|------|-------------|----------|
| **Core Attributes** | Natural athletic gifts (rarely change) | STR, SPD, AGI, INT |
| **Technique Stats** | Trained skills (can improve) | Catching, Pass Rush, Awareness |
| **Position Abilities** | Calculated from Core + Technique | Bull Rush, Man Coverage |

### How Rolls Work
All clash calculations use weighted stat rolls with ±20% variance:
```
roll = (stat1 × weight1 + stat2 × weight2 + ...) × (0.8 to 1.2 random)
```

**Core Attribute Override:** When calculating rolls, Speed/Agility/Strength use Core Attributes instead of technique stats.

---

## 1. Separation Clash (WR vs CB)

**Used in:** Both Gameplay and Simulation

Determines if receiver gains separation from defender during route running.

| Mode | Trigger | Function |
|------|---------|----------|
| Gameplay | Real-time proximity + direction changes | `resolveClash()` |
| Simulation | Once per round (5 rounds total) | `processReceiverClashesRound()` |

### Stats Used

**Receiver Roll:**
| Stat | Weight | Source |
|------|--------|--------|
| Speed | 25% | Core Attribute |
| Agility | 25% | Core Attribute |
| Route Running | 20% | Technique |
| Acceleration | 15% | Technique |
| Release | 15% | Technique |

**Defender Roll:**
| Stat | Weight | Source |
|------|--------|--------|
| Awareness | 25% | Technique |
| Speed | 20% | Core Attribute |
| Agility | 20% | Core Attribute |
| Pursuit | 20% | Technique |
| Tackling | 15% | Technique |

### Bonuses Applied (Simulation Only)
Simulation mode includes momentum mechanics for route running:
- **Crossing Route:** +10% of Route Running
- **Break Round:** +8% of Route Running at route breaks
- **Defender Awareness:** +8% of Awareness as counter-bonus
- **Defender Tracking:** +6% of Awareness during crosses/breaks
- **Momentum Advantage:** DB's reaction delay creates separation on direction changes

### Outcomes
| Margin | Result | Effect |
|--------|--------|--------|
| > 3 | Receiver Wins | Speed boost 1.15× for 1.0 sec |
| < -3 | Defender Wins | Receiver speed penalty 0.75× for 1.0 sec |
| -3 to 3 | Contested | No speed change |

### Abilities Used (when enabled)
- **Release Phase:** Release Move vs Press Coverage
- **Route Phase:** Route Sharpness vs Man/Zone Coverage

---

## 2. Line Clash (OL vs DL)

**Used in:** Both Gameplay and Simulation

Determines pass protection success.

| Mode | Trigger | Function |
|------|---------|----------|
| Gameplay | Continuous while in range (1.5 sec interval) | `resolveLineClash()` |
| Simulation | Once per round with cumulative pressure | `processLineClashesRound()` |

### Stats Used

**Offensive Line Roll:**
| Stat | Weight | Source |
|------|--------|--------|
| Pass Block | 35% | Technique |
| Strength | 30% | Core Attribute |
| Balance | 20% | Technique |
| Awareness | 15% | Technique |

**Defensive Line Roll:**
| Stat | Weight | Source |
|------|--------|--------|
| Pass Rush | 35% | Technique |
| Strength | 30% | Core Attribute |
| Acceleration | 20% | Technique |
| Speed | 15% | Core Attribute |

### Outcomes (Gameplay)
| Margin | Result | Effect |
|--------|--------|--------|
| > 5 | OL Wins | DL knocked down 1.0 sec |
| < -5 | DL Wins | OL knocked down, DL speed boost 1.5× |
| -5 to 5 | Engaged | Both near-zero speed, continue clash |

### Outcomes (Simulation)
Simulation uses cumulative pressure tracking with round bonuses:
| Margin | Result | Pressure Added |
|--------|--------|----------------|
| > 18 | Beaten Badly | 35 (15% sack chance) |
| > 10 | Beaten | 25 |
| > 5 | Pressured | 15 |
| > 2 | Light Pressure | 10 |
| > -2 | Held | 3 |
| > -10 | Blocked | 0 |
| ≤ -10 | Pancaked | 0 (20% DL knockdown) |

**DL Round Bonus:** +3 per round (cumulative advantage)
**Sack Threshold:** Total pressure > 70 increases throw urgency

### DL Abilities
| Ability | Formula | Best Against |
|---------|---------|--------------|
| Bull Rush | STR 60% + PassRush 25% + INT 15% | Footwork |
| Block Shed | STR 40% + AGI 40% + PassRush 20% | - |
| Spin Move | AGI 55% + SPD 25% + PassRush 20% | Anchor |
| Swim Move | AGI 45% + SPD 35% + PassRush 20% | - |

### OL Abilities
| Ability | Formula | Counters |
|---------|---------|----------|
| Anchor | STR 55% + Balance 25% + PassBlock 20% | Bull Rush |
| Hand Fighting | STR 40% + AGI 35% + PassBlock 25% | Block Shed, Swim |
| Footwork | AGI 45% + INT 30% + PassBlock 25% | Spin Move |
| Drive Block | STR 40% + INT 30% + PassBlock 30% | - |

### Ability Matchup Matrix
DL effectiveness multipliers when facing OL abilities:

| DL Move | vs Anchor | vs Hand Fighting | vs Footwork | vs Drive Block |
|---------|-----------|------------------|-------------|----------------|
| Bull Rush | 0.85 (weak) | 1.0 | 1.15 (strong) | 0.95 |
| Block Shed | 1.10 | 0.90 (weak) | 1.05 | 0.95 |
| Spin Move | 1.20 (strong) | 1.05 | 0.85 (weak) | 1.10 |
| Swim Move | 1.15 | 0.85 (weak) | 0.95 | 1.05 |

---

## 3. Tackle Clash

**Used in:** Both Gameplay and Simulation

Determines if defender successfully tackles ball carrier.

| Mode | Trigger | Function |
|------|---------|----------|
| Gameplay | When defender within 1.0 yard of ball carrier | `resolveTackle()` |
| Simulation | During YAC phase (up to 3 attempts) | `simResolveTackleAttempt()` |

### Stats Used

**Tackler Roll:**
| Stat | Weight | Source |
|------|--------|--------|
| Tackling | 40% | Technique |
| Pursuit | 30% | Technique |
| Hit Power | 30% | Technique |

**Ball Carrier (Evasion) Roll:**
| Stat | Weight | Source |
|------|--------|--------|
| Agility | 35% | Core Attribute |
| Balance | 35% | Technique |
| Speed | 30% | Core Attribute |

### Modifiers
- **Tackler Bonus:** +10 base (compensates for WR training advantages)
- **Safety Bonus:** +10 + (attempt × 5) on attempts 2 and 3

### Outcomes
| Margin | Result | Effect |
|--------|--------|--------|
| > -5 | Tackle Succeeds | Receiver stopped |
| ≤ -5 | Broken Tackle | Receiver continues, defender stumbles 0.5 sec |

---

## 4. Physical Clash

**Used in:** Gameplay Only

Triggered during contact based on aggression levels. Not used in simulation mode.

### Trigger Probability
```
chance = (aggression1 + aggression2) / 200
```

### Stats Used

**Attacker Roll:**
| Stat | Weight | Source |
|------|--------|--------|
| Strength | 35% | Core Attribute |
| Aggression | 25% | Technique |
| Hit Power | 25% | Technique |
| Balance | 15% | Technique |

**Defender Roll:**
| Stat | Weight | Source |
|------|--------|--------|
| Strength | 35% | Core Attribute |
| Aggression | 25% | Technique |
| Tackling | 25% | Technique |
| Balance | 15% | Technique |

### Knockdown Chance
```
knockdownChance = 0.15 + (|margin| / 100) × 0.1 - knockdownResistance
```
- **Knockdown Duration:** 1.0 second
- **Resistance Gain:** +0.15 per knockdown suffered

---

## 5. Catch Probability

**Used in:** Both Gameplay and Simulation (different formulas)

Determines if receiver catches a thrown ball.

| Mode | Calculation Style | Function |
|------|-------------------|----------|
| Gameplay | Proximity-based DB penalty | `calculateCatchProbability()` |
| Simulation | Exponential roll vs threshold | `simCalculateCatchProbabilities()` |

---

### Gameplay Mode Catch Calculation

**Base Catch Rate:**
```
baseCatchRate = (catching - 50) × 2.5 + 20
```

| Catching Stat | Base Rate |
|---------------|-----------|
| 50 | 20% |
| 60 | 45% |
| 70 | 70% |
| 80 | 95% |
| 90 | 120% (absorbs penalty) |

**Defender Penalty:**
```
proximityFactor = max(0, 1 - (distance / coverageRange))
tightCoverageBonus = (distance ≤ 0.7) ? 1.2 : 1.0
dbPenalty = defenderCoverage × 1.5 × proximityFactor² × tightCoverageBonus
```

**Lead Bonus (Shoulder Throws):**
When ball is thrown to opposite side from defender:
```
leadReduction = (momentumScore / 100) × 0.5
effectiveDbPenalty = rawDbPenalty × (1 - leadReduction)
```

**Coverage Levels:**
| Distance | Classification | Typical Penalty |
|----------|----------------|-----------------|
| ≤ 0.6 yards | Blanketed | ~50% |
| 0.6-1.5 yards | Tight Coverage | ~35% |
| 1.5-2.5 yards | Contested | ~20% |
| > 2.5 yards | Light Coverage | ~10% |

**Final Probability:**
```
finalProbability = max(5%, min(98%, baseCatchRate - effectiveDbPenalty))
```

---

### Simulation Mode Catch Calculation

Uses exponential distribution for QB throw quality:

**QB Roll Mean (accuracy):**
```
rollMean = 79 + (75 - qbAccuracy) × 1.7 + pressure × 0.5
```
Higher rollMean = worse throws (more likely to exceed catch threshold)

**Receiver Catch Threshold:**
```
catchProb = catching + separationBonus + focusBonus - depthPenalty
```

| Separation | Bonus |
|------------|-------|
| ≥ 20 | +15 |
| ≥ 10 | +8 |
| ≥ 3 | +3 |
| ≥ -3 | 0 |
| ≥ -10 | -15 |
| < -10 | -30 |

**Focus Bonus (Contested):**
```
focusBonus = (focus - 70) × 0.3   // Only when separation < 5
```

**Effective Catch Rate:**
```
effectiveCatchPct = (1 - exp(-catchProb / rollMean)) × 100
```

**Catch Resolution:**
```
qbRoll = -rollMean × ln(random)
caught = (qbRoll < catchProbability)
```

---

## 6. Yards After Catch (YAC)

**Used in:** Simulation only (explicit calculation), Gameplay (emergent from physics)

| Mode | How YAC Works |
|------|---------------|
| Gameplay | Player physically runs until tackled - real distance traveled |
| Simulation | Segment-based calculation with tackle attempts |

### Simulation YAC Calculation

**YAC Roll Per Segment:**
| Stat | Weight | Source |
|------|--------|--------|
| Speed | 35% | Core Attribute |
| Acceleration | 25% | Technique |
| Agility | 25% | Core Attribute |
| Balance | 15% | Technique |

**Yards Per Segment:**
```
segmentYards = 2 + (yacRoll / 100) × 10
```
- **Minimum:** 2 yards
- **Maximum:** 12 yards
- Up to 3 segments (tackle attempts) per catch

**Immediate Tackle Check:**
- Separation < 5: Immediate tackle attempt
- Separation 5-15: Chance to skip (separation × 5%)
- Separation 15+: Skip to YAC phase

**Tackle Attempts:**
- Attempt 1: Standard tackle roll
- Attempt 2: +15 tackler bonus (safety help arriving)
- Attempt 3: +20 tackler bonus
- If tackled mid-segment: 50% of segment yards credited

### Gameplay YAC
In gameplay mode, YAC is simply the distance the receiver runs after catching before being tackled. No explicit calculation - it's determined by:
- Receiver's actual speed (from Core Attributes)
- Defender pursuit angles and speeds
- Broken tackle outcomes

---

## 7. QB Vision Check

**Used in:** Simulation Only

Determines which receivers the AI QB can see and consider for throws. In gameplay mode, the player controls the QB and decides who to throw to.

### Vision Roll
| Stat | Weight | Source |
|------|--------|--------|
| Awareness | 50% | Technique |
| Throwing | 30% | Technique |
| Focus | 20% | Technique |

### Notice Threshold
```
noticeThreshold = 70 - receiverSeparation
noticeRoll = visionRoll + random(-10 to +10)
```
- If `noticeRoll ≥ noticeThreshold`: Receiver is visible to QB
- More open receivers are easier to notice

### QB Decision Making (Simulation)
After vision check, QB evaluates throw options:
1. Score each visible receiver by effective catch %
2. Add first-down bias based on QB trait
3. Apply pressure urgency (higher pressure = must throw)
4. Roll to determine if throw happens this round

**QB Traits affect decision:**
| Trait | First Down Bias | Open Threshold | Aggressiveness |
|-------|-----------------|----------------|----------------|
| Balanced | +10 | 40 | 1.0 |
| Gunslinger | +5 | 30 | 1.2 |
| Game Manager | +15 | 50 | 0.8 |
| Scrambler | +8 | 35 | 1.0 |

### Interception Check (Simulation Only)
When a pass is incomplete in simulation, there's a chance for interception:

**Base INT Chance:**
```
throwBadness = qbRoll - catchProbability
intChance = min(throwBadness × 0.4, 25)
intChance += (defenderAwareness - 60) × 0.2
intChance += (defenderCatching - 50) × 0.1
```

**Separation Penalty:**
- Separation < -10: +5% INT chance

**Final Range:** Clamped to 5-35%

---

## 8. Position Abilities

### Wide Receiver (WR)
| Ability | Formula |
|---------|---------|
| Release Move | AGI 45% + STR 35% + RouteRunning 20% |
| Route Sharpness | AGI 40% + SPD 35% + RouteRunning 25% |
| Contested Catch | STR 30% + INT 25% + Catching 25% + Focus 20% |
| YAC Ability | SPD 40% + AGI 40% + Balance 20% |

### Cornerback (CB)
| Ability | Formula |
|---------|---------|
| Press Coverage | STR 45% + INT 35% + Awareness 20% |
| Man Coverage | SPD 40% + AGI 40% + Awareness 20% |
| Zone Coverage | INT 45% + AGI 35% + Awareness 20% |
| Ball Hawk | INT 40% + SPD 35% + Awareness 25% |

### Offensive Line (OL)
| Ability | Formula |
|---------|---------|
| Anchor | STR 55% + Balance 25% + PassBlock 20% |
| Hand Fighting | STR 40% + AGI 35% + PassBlock 25% |
| Footwork | AGI 45% + INT 30% + PassBlock 25% |
| Drive Block | STR 40% + INT 30% + PassBlock 30% |

### Defensive Line (DL)
| Ability | Formula |
|---------|---------|
| Bull Rush | STR 60% + PassRush 25% + INT 15% |
| Block Shed | STR 40% + AGI 40% + PassRush 20% |
| Spin Move | AGI 55% + SPD 25% + PassRush 20% |
| Swim Move | AGI 45% + SPD 35% + PassRush 20% |

### Quarterback (QB)
| Ability | Formula |
|---------|---------|
| Arm Strength | STR 45% + Throwing 35% + INT 20% |
| Quick Release | AGI 40% + Throwing 35% + INT 25% |
| Field Vision | INT 55% + Awareness 30% + Throwing 15% |
| Pocket Presence | AGI 45% + SPD 35% + Awareness 20% |

---

## 9. Quick Reference Tables

### Calculations by Mode
| Calculation | Gameplay | Simulation | Key Difference |
|-------------|----------|------------|----------------|
| Separation Clash | Real-time triggers | Per-round | Sim has momentum mechanics |
| Line Clash | Continuous interval | Per-round | Sim tracks cumulative pressure |
| Tackle | Proximity trigger | YAC phase | Same formula, different context |
| Physical Clash | Contact-based | Not used | Gameplay only |
| Catch Probability | Proximity-based | Exponential roll | Different formulas |
| YAC | Emergent (physics) | Segment-based | Sim calculates explicitly |
| QB Vision | Player controls | AI check | Simulation only |
| Interception | Not used | On incompletion | Simulation only |

### All Clash Types Summary
| Clash | Key Offensive Stats | Key Defensive Stats | Win Threshold | Duration |
|-------|--------------------|--------------------|---------------|----------|
| Separation | SPD, AGI, RouteRun | Awareness, Pursuit | > 3 margin | 1.0 sec effect |
| Line | PassBlock, STR, Balance | PassRush, STR, Accel | > 5 margin | 1.0 sec knockdown |
| Tackle | AGI, SPD, Balance | Tackle, Pursuit, HitPwr | > -12 margin | Instant |
| Physical | STR, Aggression, HitPwr | STR, Aggression, Tackle | Variable | 1.0 sec knockdown |

### Speed Modifiers
| Event | Multiplier | Duration |
|-------|-----------|----------|
| Separation win | 1.15× | 1.0 sec |
| Separation loss | 0.75× | 1.0 sec |
| DB catch-up boost | 1.30× | 1.0 sec (after 2.0 sec delay) |
| DL line clash win | 1.50× | 1.5 sec |
| Knockdown | 0× | 1.0 sec |
| Engaged in blocking | ~0.05× | While engaged |

### Key Thresholds
| Threshold | Value |
|-----------|-------|
| Clash trigger distance | 1.8 yards |
| Line clash distance | 1.5 yards |
| Tackle range | 1.0 yard |
| Catch probability floor | 5% |
| Catch probability ceiling | 98% |
| Tight coverage distance | 0.7 yards |

### Stats by Position
| Position | Shown Technique Stats |
|----------|----------------------|
| WR | Catching, Route Running, Release, Acceleration, Balance, Focus |
| CB | Tackling, Awareness, Pursuit, Hit Power, Balance |
| OL | Pass Block, Balance, Awareness |
| DL | Pass Rush, Tackling, Hit Power, Pursuit, Acceleration |
| QB | Throwing, Awareness, Focus |

---

## Appendix: Core Attribute Influence

Core Attributes (STR, SPD, AGI, INT) affect multiple technique stats:

| Core Attribute | Influences |
|----------------|------------|
| **Strength** | Pass Block (25%), Pass Rush (25%), Tackling (20%), Hit Power (30%), Balance (20%) |
| **Speed** | Speed stat (40%), Acceleration (35%), Pursuit (25%) |
| **Agility** | Agility stat (40%), Route Running (20%), Release (25%), Balance (15%) |
| **Intelligence** | Awareness (35%), Route Running (15%), Focus (25%), Throwing (20%) |

### Growth Rates
- **Core Attributes:** 2-8% chance per season, stops at age 27
- **Technique Stats:** Regular improvement through training and games
- **Abilities:** Automatically recalculated from current Core + Technique values
