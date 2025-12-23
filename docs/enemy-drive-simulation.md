# Enemy Drive Simulation System

This document describes the realistic enemy drive simulation system, which models offensive plays using stat-based matchups aligned with the player offense experience.

## Overview

Each enemy play simulates:
1. **DL vs OL Pressure** - Defensive line battles offensive line for pressure/sacks
2. **WR vs CB Separation** - Receiver tries to get open against cornerback
3. **QB Throw Quality** - Quarterback accuracy modified by pressure (exponential distribution)

---

## Phase 1: DL vs OL Pressure

Each defensive lineman (up to 4) rolls against their matched offensive lineman.

### Formula
```javascript
olRoll = weightedStatRoll(ol.stats, CLASH_WEIGHTS.lineClash.offense)
dlRoll = weightedStatRoll(dl.stats, CLASH_WEIGHTS.lineClash.defense)
margin = dlRoll - olRoll
```

### Pressure Results

| Margin | Result | Pressure | Sack Chance |
|--------|--------|----------|-------------|
| > 18 | beaten badly | +35 | 25% |
| > 10 | beaten | +25 | 0% |
| > 5 | pressured | +15 | 0% |
| > 2 | pressured | +10 | 0% |
| > -2 | held | +3 | 0% |
| ≤ -2 | stonewalled | +0 | 0% |

### Pressure Levels
- **Light**: 0-20 total pressure
- **Moderate**: 21-40
- **Heavy**: 41-60
- **Extreme**: 61+

---

## Phase 2: WR vs CB Separation

The receiver attempts to create separation from the covering cornerback.

### Formula
```javascript
wrRoll = weightedStatRoll(receiver.stats, CLASH_WEIGHTS.separation.receiver)
cbRoll = weightedStatRoll(cb.stats, CLASH_WEIGHTS.separation.defender)
separationMargin = wrRoll - cbRoll

// Convert to "coverage closeness" (simulates physical proximity)
coverageCloseness = clamp(0.78 - (separationMargin / 60), 0, 1)

// Defender penalty (same as player offense)
defenderPenalty = closeness³ × cbCoverage × 0.8

// Catch window
catchProb = baseCatch + focusMod - defenderPenalty
```

### Coverage Closeness Scale

| Separation Margin | Closeness | Label |
|-------------------|-----------|-------|
| WR +20 or more | 0.45 | OPEN |
| WR +10 | 0.61 | some space |
| Even (0) | 0.78 | contested |
| CB +10 | 0.95 | tight |
| CB +15 or more | 1.0 | SMOTHERED |

### Catch Window Examples (WR 80 catching, CB 80 coverage)

| Matchup | Closeness | Penalty | Catch Window |
|---------|-----------|---------|--------------|
| CB wins by 10 | 0.95 | 55 | ~25% |
| Even matchup | 0.78 | 30 | ~50% |
| WR wins by 10 | 0.61 | 15 | ~65% |
| WR wins by 20 | 0.45 | 6 | ~74% |

---

## Phase 3: QB Throw Quality

QB accuracy uses an **exponential distribution** where lower rolls are better. The QB must roll under the catch window for a successful catch.

### Formula
```javascript
qbAccuracy = (throwing + awareness) / 2
pressure = totalPressure from DL/OL phase

// Roll mean: lower = better throws, higher = worse
rollMean = 79 + (75 - qbAccuracy) × 1.7 + pressure × 0.5

// Exponential random (lower is better)
qbRoll = -rollMean × ln(random())

// Success if roll is under catch window
catchSuccess = qbRoll < catchProb

// Effective catch %
effectiveCatch = (1 - e^(-catchProb / rollMean)) × 100
```

### Why Exponential Distribution?

- **Bounded at 0**: Best possible roll is 0 (perfect throw)
- **Pressure only hurts**: Higher pressure → higher rollMean → worse throws
- **Realistic variance**: Even elite QBs occasionally make bad throws
- **No upside from pressure**: Unlike Gaussian, pressure never helps

### Roll Mean by QB Rating & Pressure

| QB Rating | Pressure 0 | Pressure 20 | Pressure 40 | Pressure 60 | Pressure 80 |
|-----------|-----------|-------------|-------------|-------------|-------------|
| **95** | 45 | 55 | 65 | 75 | 85 |
| **85** | 62 | 72 | 82 | 92 | 102 |
| **75** | 79 | 89 | 99 | 109 | 119 |
| **65** | 96 | 106 | 116 | 126 | 136 |

*Lower rollMean = rolls cluster near 0 = better throws*

### Effective Catch % (base 50% catch window)

| QB Rating | Pressure 0 | Pressure 20 | Pressure 40 | Pressure 60 | Pressure 80 |
|-----------|-----------|-------------|-------------|-------------|-------------|
| **95** | **67%** (+34%) | 60% | 54% | 49% | 44% |
| **85** | 55% (+10%) | 50% | 46% | 42% | 39% |
| **75** | 47% (-6%) | 43% | 40% | 37% | 34% |
| **65** | 41% (-18%) | 38% | 35% | 33% | 31% |

### Effective Catch % (base 30% catch window - tight coverage)

| QB Rating | Pressure 0 | Pressure 20 | Pressure 40 | Pressure 60 | Pressure 80 |
|-----------|-----------|-------------|-------------|-------------|-------------|
| **95** | **49%** | 42% | 37% | 33% | 30% |
| **85** | 38% | 34% | 31% | 28% | 25% |
| **75** | 32% | 29% | 26% | 24% | 22% |
| **65** | 27% | 25% | 23% | 21% | 20% |

### Effective Catch % (base 70% catch window - wide open)

| QB Rating | Pressure 0 | Pressure 20 | Pressure 40 | Pressure 60 | Pressure 80 |
|-----------|-----------|-------------|-------------|-------------|-------------|
| **95** | **79%** | 72% | 66% | 61% | 56% |
| **85** | 68% | 62% | 57% | 53% | 50% |
| **75** | 59% | 54% | 51% | 47% | 44% |
| **65** | 52% | 48% | 45% | 43% | 40% |

---

## Receiver Targeting

Receivers are selected with weighted probability:
- **WR1**: 50%
- **WR2**: 30%
- **WR3**: 20%

---

## Complete Play Flow

```
1. DL vs OL matchups (4 battles)
   ↓
2. Calculate total pressure
   ↓
3. If sack triggered → play ends (-7 yards)
   ↓
4. Select target receiver (weighted)
   ↓
5. WR vs CB separation roll
   ↓
6. Calculate catch window from separation
   ↓
7. QB exponential roll against catch window
   ↓
8. If catch → roll for yards gained
   If incomplete → next down
```

---

## Alignment with Player Offense

The enemy simulation mirrors the player experience:

| Aspect | Player Offense | Enemy Simulation |
|--------|---------------|------------------|
| WR/CB matchup | Physical proximity to defenders | Stat roll → coverage closeness |
| Defender penalty | proximityFactor³ × coverage × 0.8 | closeness³ × coverage × 0.8 |
| Pressure effect | Affects catch bar timing | Affects QB roll distribution |
| Catch % range | 5-95% based on coverage | 5-95% based on separation |

This ensures enemy drives feel as challenging as player drives, with the same statistical foundations.
