# Smashball Stats Documentation

This document details how each player stat affects gameplay mechanics.

---

## Core Attributes

Core attributes are foundational physical/mental traits that rarely change over a player's career. They influence multiple skills and represent a player's natural athletic gifts.

### The Four Core Attributes

| Attribute | Description | Skills Influenced |
|-----------|-------------|-------------------|
| **Strength** | Raw physical power | passBlock (25%), passRush (25%), tackling (20%), hitPower (30%), balance (20%) |
| **Speed** | Top-end speed & acceleration | speed (40%), acceleration (35%), pursuit (25%) |
| **Agility** | Quickness & change of direction | agility (40%), routeRunning (20%), release (25%), balance (15%) |
| **Intelligence** | Mental processing & decision-making | awareness (35%), routeRunning (15%), focus (25%), throwing (20%) |

### How Core Attributes Affect Skills

Each skill has an "effective" value calculated by blending the trained skill with relevant core attributes:

```
effectiveStat = baseStat × (1 - totalInfluence) + weightedCoreContribution
```

**Example:** A player with 80 base speed and 90 core Speed attribute:
- Core Speed influences the speed stat at 40%
- Effective Speed = 80 × 0.6 + 90 × 0.4 = 48 + 36 = **84**

### Core Attribute Growth

Core attributes grow very rarely, even for high-potential players:

| Condition | Growth Chance |
|-----------|---------------|
| Base chance | 2% per season |
| Per potential grade (0-3) | +1% per grade |
| Young player bonus (≤23) | +1% |
| **Maximum chance** | 8% |
| Growth cutoff age | 27 (no growth after) |

**Growth amounts:**
- Normal growth: +1 to +2 points
- Breakthrough (0.5% chance): +3 to +5 points

### Core Attribute Ranges by Tier

| Tier | Range |
|------|-------|
| Elite | 75-95 |
| Veteran | 65-85 |
| Average | 50-75 |
| Below Average | 40-65 |
| Rookie | 45-80 |
| Backup | 35-55 |

### Position Tendencies

- **OL/DL:** +3 to +8 Strength, -3 to -8 Speed
- **WR/CB:** +3 to +8 Speed, +2 to +5 Agility
- **QB:** +3 to +8 Intelligence

---

## Quick Reference

| Stat | Primary Use | Key Weight |
|------|-------------|------------|
| Speed | Movement speed | 0.0005 multiplier |
| Acceleration | Clash bursts | 0.15-0.20 |
| Agility | Evasion/Separation | 0.25-0.35 |
| Catching | Catch probability | 100% base |
| Route Running | Separation vs CB | 0.20 |
| Release | Line separation | 0.15 |
| Focus | Contested catches | 0.30 per point |
| Man Coverage | Coverage penalty | 0.25 + proximity |
| Zone Coverage | Zone defense | 0.25 + proximity |
| Tackling | Tackle success | 0.40 |
| Hit Power | Knockdowns | 0.30 |
| Pursuit | Chase speed | 0.30 + speed boost |
| Awareness | Read plays | 0.15 |
| Pass Block | O-line protection | 0.35 |
| Pass Rush | D-line pressure | 0.35 |
| Strength | Physical battles | 0.30-0.35 |
| Balance | Stay on feet | 0.15-0.35 |
| Aggression | Trigger clashes | triggers + 0.25 |
| Stamina | Career decline | aging only |
| Throwing | Team rating | QB only |
| Jumping | *Unused* | - |
| Press | *Unused* | - |

---

## Core Mechanic: Weighted Roll

All clashes use this formula:
```
weightedTotal = Σ(stat × weight)
finalRoll = weightedTotal × (1 + (random - 0.5) × 0.4)
```
This adds ±20% variance to the weighted total.

---

## Stat Details

### Speed
**Movement Speed Multiplier**
- Receivers/Defenders: `baseSpeed = speed × 0.0005`
- O-Linemen: `baseSpeed = speed × 0.0004`
- D-Linemen: `baseSpeed = speed × 0.0005`

**Clash Weights:**
- Separation (Receiver): 0.25
- Separation (Defender): 0.20
- Line Clash (Defense): 0.15

**Speed Modifiers During Play:**
| Condition | Multiplier | Duration |
|-----------|------------|----------|
| Won separation clash | 1.5× | 2 sec |
| Lost separation clash | 0.5× | 2 sec |
| Broke tackle | 1.3× | 0.8 sec |
| Won line clash (DL) | 1.5× | 1.5 sec |
| Pursuit mode | 1.1-1.2× | ongoing |

---

### Acceleration
**Clash Weights:**
- Separation (Receiver): 0.15
- Line Clash (Defense): 0.20

**Effect:** Helps win separation battles and defensive momentum shifts.

---

### Agility
**Clash Weights:**
- Separation (Receiver): 0.25
- Separation (Defender): 0.25
- Tackle Evasion (Ball Carrier): 0.35

**Effect:** Primary stat for breaking tackles and creating separation.

---

### Catching
**Catch Probability Formula:**
```
baseCatch = catching (0-100)
focusMod = hasDefender ? (focus - 70) × 0.3 : 0
proximityPenalty = defenderDistance^3 × coverage × 0.8
finalProb = clamp(baseCatch + focusMod - proximityPenalty, 5, 95)
```

**Catch Zone Size:**
```
zoneScale = 0.3 + 0.9 × (catching / 100)
```
Higher catching = larger catch radius.

---

### Route Running
**Clash Weights:**
- Separation (Receiver): 0.20

**Effect:** Helps receivers win separation battles, especially at route breaks.

---

### Release
**Clash Weights:**
- Separation (Receiver): 0.15

**Effect:** Helps get off the line of scrimmage against press coverage.

---

### Focus
**Contested Catch Modifier:**
```
focusMod = (focus - 70) × 0.3
```
- Focus 70 = neutral (no bonus/penalty)
- Focus 85 = +4.5% catch bonus
- Focus 55 = -4.5% catch penalty

**Effect:** Only applies when defenders are within 1.5× clash range.

---

### Man Coverage
**Clash Weights:**
- Separation (Defender): 0.25

**Catch Penalty Formula:**
```
proximityFactor = 1 - (distance / maxRange)
penalty = proximityFactor^3 × manCoverage × 0.8
```
- Very close (≤0.6 units): 50% increased influence
- Cubed falloff = steep penalty at close range

---

### Zone Coverage
**Clash Weights:**
- Separation (Defender): 0.25 (replaces Man Coverage for zone defenders)

**Zone AI Behavior:**
- Patrols assigned zone (5-7 yard radius, 6-10 yard depth)
- Reacts to nearest receiver entering zone
- Same catch penalty formula as Man Coverage

---

### Tackling
**Clash Weights:**
- Tackle (Tackler): 0.40
- Physical Clash: 0.25

**Tackle Resolution:**
```
tackleRoll = weightedRoll({tackling: 0.40, pursuit: 0.30, hitPower: 0.30})
evasionRoll = weightedRoll({agility: 0.35, speed: 0.30, balance: 0.35})
success = (tackleRoll - evasionRoll) > -5
```

---

### Hit Power
**Clash Weights:**
- Tackle (Tackler): 0.30
- Physical Clash: 0.25

**Knockdown Chance:**
```
knockdownChance = BASE_CHANCE + (abs(margin) / 100) × 0.1
```

---

### Pursuit
**Clash Weights:**
- Tackle (Tackler): 0.30
- Separation (Defender): 0.20

**Pursuit Speed Boost:**
```
pursuitBoost = 1.0 + min(timeSinceCatch / 5, 0.2)
speed = baseSpeed × 1.1 × pursuitBoost
```
Defenders get faster the longer pursuit continues (up to 1.2× at 5 sec).

---

### Awareness
**Clash Weights:**
- Separation (Defender): 0.15
- Line Clash (Offense): 0.15

**Team Strength (QB):**
```
qbRating = (throwing + awareness) / 2
```

---

### Pass Block
**Clash Weights:**
- Line Clash (Offense): 0.35

**Line Clash Formula:**
```
oLineRoll = weightedRoll({
  passBlock: 0.35,
  strength: 0.30,
  balance: 0.20,
  awareness: 0.15
})
```

**Outcomes:**
| Margin | Result |
|--------|--------|
| O-line wins big | D-lineman knocked down |
| O-line wins small | D-lineman slowed |
| Neutral | D-lineman nearly stopped |
| D-line wins small | D-lineman breaks through slowly |
| D-line wins big | O-lineman knocked aside, D-line speed burst |

---

### Pass Rush
**Clash Weights:**
- Line Clash (Defense): 0.35

**Line Clash Formula:**
```
dLineRoll = weightedRoll({
  passRush: 0.35,
  strength: 0.30,
  acceleration: 0.20,
  speed: 0.15
})
```

---

### Strength
**Clash Weights:**
- Physical Clash (Attacker): 0.35
- Physical Clash (Defender): 0.35
- Line Clash (Offense): 0.30
- Line Clash (Defense): 0.30

**Effect:** Primary stat for all physical confrontations.

---

### Balance
**Clash Weights:**
- Physical Clash: 0.15
- Line Clash (Offense): 0.20
- Tackle Evasion (Ball Carrier): 0.35

**Effect:** Helps stay on feet during physical collisions and tackle attempts.

---

### Aggression
**Physical Clash Trigger:**
```
physicalChance = (receiverAggression + defenderAggression) / 200
if (random < physicalChance) → trigger physical clash
```

**Clash Weights:**
- Physical Clash: 0.25

**Effect:** Higher combined aggression = more knockdown battles.

---

### Stamina
**Career Decline Only:**
- Part of `PHYSICAL_DECLINE_STATS` array
- Declines faster than mental stats after peak age
- No direct in-game effect

---

### Throwing (QB Only)
**Team Strength Calculation:**
```
qbRating = (throwing + awareness) / 2
```
No direct gameplay effect (throw mechanics are player-controlled).

---

### Jumping & Press
**Status:** Currently unused in gameplay calculations.

---

## Clash Type Summary

### 1. Separation Clash (WR vs CB)
**Receiver:** speed(0.25), agility(0.25), routeRunning(0.20), acceleration(0.15), release(0.15)
**Defender:** manCoverage(0.25), speed(0.20), pursuit(0.20), agility(0.25), awareness(0.15)

**Outcomes:**
- Receiver wins: 1.5× speed boost for 2 sec
- Defender wins: Receiver slowed to 0.5× for 2 sec
- Tie: No effect

### 2. Physical Clash (Knockdown Battle)
**Both Sides:** strength(0.35), aggression(0.25), hitPower(0.25), tackling(0.25), balance(0.15)

**Outcomes:**
- Winner may knock down loser
- Knockdown duration: configurable

### 3. Line Clash (OL vs DL)
**O-Line:** passBlock(0.35), strength(0.30), balance(0.20), awareness(0.15)
**D-Line:** passRush(0.35), strength(0.30), acceleration(0.20), speed(0.15)

**Outcomes:**
- O-line decisive win: D-lineman knocked down
- D-line decisive win: O-lineman knocked aside, D-lineman speed burst

### 4. Tackle Clash
**Tackler:** tackling(0.40), pursuit(0.30), hitPower(0.30)
**Ball Carrier:** agility(0.35), speed(0.30), balance(0.35)

**Outcomes:**
- Tackler wins (margin > -5): Successful tackle
- Ball carrier wins: Broken tackle, 1.3× speed boost
