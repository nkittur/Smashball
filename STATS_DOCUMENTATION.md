# Smashball Stats Documentation

This document details how each player stat affects gameplay mechanics.

---

## Stat System Overview

Player stats are organized into three distinct tiers:

| Tier | Description | Growth | Examples |
|------|-------------|--------|----------|
| **Core Attributes** | Natural athletic gifts (the "genes") | Very rare (2-8% per season, stops at 27) | STR, SPD, AGI, INT |
| **Position Abilities** | What they do on the field (derived) | Automatic (from core + technique) | Bull Rush, Man Coverage, Route Sharpness |
| **Technique Stats** | Trained skills and knowledge | Regular (through training/games) | Catching, Pass Rush, Awareness |

### How They Connect

```
Core Attributes (rarely change)
        ↓
   Influence technique via calculateEffectiveStat()
        ↓
Technique Stats (can improve) → Position Abilities (calculated each play)
        ↓
   Used in clash calculations
```

**Key insight:** Core Attributes define a player's ceiling. Technique can be trained, but a player with low core Speed will never be truly fast, even with high technique.

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

## Position-Specific Abilities

Each position has unique abilities derived from core attributes. Players can excel through different builds based on their attribute strengths.

### DL (Defensive Line) Abilities

| Ability | Description | Formula |
|---------|-------------|---------|
| **Bull Rush** | Power through blockers | Strength (60%) + PassRush (25%) + Intelligence (15%) |
| **Block Shed** | Disengage from blocks | Strength (40%) + Agility (40%) + PassRush (20%) |
| **Spin Move** | Finesse around blocker | Agility (55%) + Speed (25%) + PassRush (20%) |
| **Swim Move** | Over the blocker's arms | Agility (45%) + Speed (35%) + PassRush (20%) |

**Build Examples:**
- **Power Rusher:** High Strength → Excels at Bull Rush
- **Speed Rusher:** High Agility + Speed → Excels at Spin/Swim Moves
- **Versatile:** Balanced → Good at Block Shed

### OL (Offensive Line) Abilities

| Ability | Description | Formula |
|---------|-------------|---------|
| **Anchor** | Hold ground vs power | Strength (55%) + Balance (25%) + PassBlock (20%) |
| **Hand Fighting** | Control rushers | Strength (40%) + Agility (35%) + PassBlock (25%) |
| **Footwork** | Mirror lateral moves | Agility (45%) + Intelligence (30%) + PassBlock (25%) |
| **Drive Block** | Sustain and move | Strength (40%) + Intelligence (30%) + PassBlock (30%) |

**Build Examples:**
- **Power Blocker:** High Strength → Excels at Anchor, Drive Block
- **Athletic Blocker:** High Agility → Excels at Footwork, Hand Fighting
- **Smart Blocker:** High Intelligence → Excels at Footwork, Drive Block

### OL vs DL Matchup Matrix

Certain abilities counter others (values show DL effectiveness modifier):

| DL Move → | vs Anchor | vs Hand Fighting | vs Footwork | vs Drive Block |
|-----------|-----------|------------------|-------------|----------------|
| **Bull Rush** | 0.85 (countered) | 1.0 | 1.15 (effective) | 0.95 |
| **Block Shed** | 1.10 | 0.90 (countered) | 1.05 | 0.95 |
| **Spin Move** | 1.20 (effective) | 1.05 | 0.85 (countered) | 1.10 |
| **Swim Move** | 1.15 | 0.85 (countered) | 0.95 | 1.05 |

### CB (Cornerback) Abilities

| Ability | Description | Formula |
|---------|-------------|---------|
| **Press Coverage** | Jam at line of scrimmage | Strength (45%) + Intelligence (35%) + Awareness (20%) |
| **Man Coverage** | Stick with receiver | Speed (40%) + Agility (40%) + Awareness (20%) |
| **Zone Coverage** | Read routes, defend zones | Intelligence (45%) + Agility (35%) + Awareness (20%) |
| **Ball Hawk** | Intercept passes | Intelligence (40%) + Speed (35%) + Awareness (25%) |

**Build Examples:**
- **Physical Corner:** High Strength → Excels at Press Coverage
- **Speed Corner:** High Speed + Agility → Excels at Man Coverage
- **Smart Corner:** High Intelligence → Excels at Zone Coverage, Ball Hawk

### WR (Wide Receiver) Abilities

| Ability | Description | Formula |
|---------|-------------|---------|
| **Release Move** | Beat press coverage | Agility (45%) + Strength (35%) + RouteRunning (20%) |
| **Route Sharpness** | Create separation | Agility (40%) + Speed (35%) + RouteRunning (25%) |
| **Contested Catch** | Catch in traffic | Strength (30%) + Intelligence (25%) + Catching (25%) + Focus (20%) |
| **YAC Ability** | Yards after catch | Speed (40%) + Agility (40%) + Balance (20%) |

**Build Examples:**
- **Burner:** High Speed + Agility → Excels at Route Sharpness, YAC
- **Possession Receiver:** High Intelligence + Strength → Excels at Contested Catch
- **Complete Receiver:** Balanced → Good at all abilities

### QB (Quarterback) Abilities

| Ability | Description | Formula |
|---------|-------------|---------|
| **Arm Strength** | Deep throws | Strength (45%) + Throwing (35%) + Intelligence (20%) |
| **Quick Release** | Fast delivery | Agility (40%) + Throwing (35%) + Intelligence (25%) |
| **Field Vision** | Read defenses | Intelligence (55%) + Awareness (30%) + Throwing (15%) |
| **Pocket Presence** | Escape pressure | Agility (45%) + Speed (35%) + Awareness (20%) |

**Build Examples:**
- **Cannon Arm:** High Strength → Excels at Arm Strength
- **Cerebral QB:** High Intelligence → Excels at Field Vision
- **Mobile QB:** High Agility + Speed → Excels at Pocket Presence

---

## Technique Stats

Technique stats represent trained skills that can improve through practice and game experience. Unlike core attributes, these grow more regularly and are influenced by core attributes.

### Position-Specific Technique Stats

| Position | Technique Stats | Notes |
|----------|-----------------|-------|
| **WR** | Catching, Route Running, Release, Focus | Focus affects contested catches |
| **CB** | Tackling, Awareness, Pursuit, Hit Power | Defense-focused technique |
| **OL** | Pass Block, Balance, Awareness | Blocking technique |
| **DL** | Pass Rush, Tackling, Hit Power, Pursuit | Rush technique |
| **QB** | Throwing, Awareness, Focus | Mental + throwing technique |

### How Technique Relates to Core Attributes

Technique stats are influenced by core attributes but represent the learned component:

| Technique | Core Influence | What It Means |
|-----------|----------------|---------------|
| Catching | None directly | Pure technique, not affected by athleticism |
| Route Running | Agility (20%), Intelligence (15%) | Natural agility helps, but routes are learned |
| Pass Block | Strength (25%) | Strength helps, but hand placement is technique |
| Awareness | Intelligence (35%) | Smart players read plays better |

**Example:** Two players with identical 80 Awareness, but one has 70 INT and the other has 90 INT:
- Player A: Effective Awareness = 80 × 0.65 + 70 × 0.35 = 52 + 24.5 = **76.5**
- Player B: Effective Awareness = 80 × 0.65 + 90 × 0.35 = 52 + 31.5 = **83.5**

The smarter player's awareness is more effective on the field.

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
