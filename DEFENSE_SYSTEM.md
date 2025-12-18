# Smashball Defense System Design

A medieval football game where receivers and defenders battle for position, with stats-driven clash mechanics determining outcomes.

## Overview

This system introduces defenders who attempt to cover receivers, with periodic "clashes" that determine separation or coverage advantages. The medieval theme allows for physical combat, knockdowns, and squad attrition.

---

## Player Stats

### Receiver Stats

| Stat | Description | Used In |
|------|-------------|---------|
| **speed** | Top movement rate | Route running, separation |
| **acceleration** | How quickly reaches top speed | Burst off the line, after jinks |
| **agility** | Change of direction speed | Jink effectiveness, evasion |
| **routeRunning** | Precision and crispness of cuts | Jink sharpness, clash bonus on cuts |
| **release** | Getting past press/contact at line | Initial clash at start |
| **catching** | Reliability catching the ball | Base catch probability |
| **jumping** | Vertical leap | Contested high balls |
| **strength** | Physical power | Clash battles, blocking |
| **balance** | Staying on feet after contact | Knockdown resistance |
| **aggression** | Willingness to initiate contact | Physical clash frequency |
| **stamina** | Fatigue resistance | Stat degradation over time |
| **focus** | Concentration under pressure | Catching while contested |

### Defender Stats

| Stat | Description | Used In |
|------|-------------|---------|
| **speed** | Top movement rate | Chasing, recovery |
| **acceleration** | Burst speed | Reacting to cuts |
| **agility** | Change of direction | Mirroring receivers |
| **manCoverage** | Ability to stick to receiver | Man coverage AI effectiveness |
| **zoneCoverage** | Reading routes, positioning | Zone AI effectiveness |
| **press** | Disrupting at the line | Initial clash power |
| **tackling** | Securing the tackle | Post-catch combat |
| **hitPower** | Force of collisions | Knockdown chance |
| **pursuit** | Angle-taking, chase-down | Recovering when beaten |
| **awareness** | Reading the play | Reaction time to throws |
| **strength** | Physical power | Clash battles |
| **balance** | Staying on feet | Knockdown resistance |
| **aggression** | Seeking contact | Physical clash frequency |
| **stamina** | Fatigue resistance | Stat degradation over time |

### Stat Scale

Stats use a 1-100 scale:

| Rating | Meaning | Description |
|--------|---------|-------------|
| 80-99 | Elite | Star player, exploitable advantage |
| 65-79 | Good | Solid starter |
| 50-64 | Average | Role player |
| 35-49 | Below Average | Liability |
| 1-34 | Poor | Significant weakness |

---

## Defender AI Types

| Type | Zone Color | Behavior |
|------|------------|----------|
| **Man Coverage** | Purple `rgb(153, 51, 204)` | Follows assigned receiver, tries to stay in coverage position |
| **Zone Coverage** | Orange `rgb(255, 128, 26)` | Patrols assigned area, reacts to receivers entering zone |
| **Blitzer** | Red `rgb(230, 26, 26)` | Rushes toward QB or ball, aggressive pursuit |

### Cushion System

Defenders have a configurable `cushion` value determining their starting distance behind their assigned receiver:

- **Press Coverage**: cushion 0-1 (right on the receiver)
- **Off Coverage**: cushion 2-4 (few yards back)
- **Deep Zone**: cushion 6+ (playing deep)

---

## Clash System

### Clash Triggers

Clashes occur at key moments:

1. **Initial Contact**: When receiver and defender zones first overlap
2. **Direction Change**: When receiver makes a jink/cut on their route
3. **Time-based Fallback**: Every 2 seconds if no clash has occurred

### Clash Resolution

Each clash involves a weighted dice roll comparing receiver and defender stats.

#### Separation Battle

```
Receiver Score = weightedRoll({
  speed: 0.25,
  agility: 0.25,
  routeRunning: 0.20,
  acceleration: 0.15,
  release: 0.15
})

Defender Score = weightedRoll({
  speed: 0.20,
  agility: 0.20,
  manCoverage: 0.25,  // or zoneCoverage for zone defenders
  pursuit: 0.20,
  awareness: 0.15
})
```

#### Outcomes

| Result | Condition | Effect |
|--------|-----------|--------|
| **Separation** | Receiver wins by margin | Green zone, speed boost, easier catch |
| **Contested** | Close/tie | Yellow zone, standard difficulty |
| **Covered** | Defender wins by margin | Red zone, slowed, harder catch |

### Physical Battle

When players have high aggression or are in close proximity:

```
Attacker Score = weightedRoll({
  strength: 0.35,
  aggression: 0.25,
  hitPower: 0.25,
  balance: 0.15
})
```

Significant wins trigger a **knockdown check**.

### Knockdown System

- **Duration**: 1 second on the ground
- **Resistance Buff**: Each knockdown grants +15% cumulative knockdown resistance
- **Recovery**: Player gets up and resumes route/coverage

This prevents "stunlock" and rewards resilience.

---

## Separation States

Advantages persist until the next clash:

| State | Zone Color | Catch Modifier | Movement Effect |
|-------|------------|----------------|-----------------|
| **Open** | Green | +20% catch rate | +15% speed boost |
| **Contested** | Yellow | Base catch rate | Normal speed |
| **Covered** | Red | -25% catch rate | -10% speed penalty |
| **Knocked Down** | None | Cannot catch | Cannot move |

---

## Catch Probability

```
Final Catch % = Base (from catching stat)
              + Separation Bonus (if green)
              - Coverage Penalty (if red)
              + Focus Bonus (if high focus)
              - Defender proximity penalty
```

---

## Visual Feedback

### Zone Colors

- Receiver zones change color based on separation state
- Defender zones colored by AI type (purple/orange/red)

### Player Labels

- Receiver names displayed above characters
- Helps player identify targets for throws

### Clash Effects

- Brief flash/pulse when clash occurs
- Zone color transition on outcome
- Knockdown animation (player falls, recovers)

---

## Data Structures

### Receiver Config

```javascript
{
  name: "Sir Gallahad",
  start: Vector3,
  route: [...],
  stats: {
    speed, acceleration, agility, routeRunning, release,
    catching, jumping, strength, balance, aggression,
    stamina, focus
  }
}
```

### Defender Config

```javascript
{
  name: "Dark Knight",
  aiType: 'man' | 'zone' | 'blitzer',
  assignedReceiver: number,  // for man coverage
  cushion: number,           // starting distance
  zoneCenter: Vector3,       // for zone coverage
  stats: {
    speed, acceleration, agility, manCoverage, zoneCoverage,
    press, tackling, hitPower, pursuit, awareness,
    strength, balance, aggression, stamina
  }
}
```

### Runtime State

```javascript
receiver.separationState = 'open' | 'contested' | 'covered'
receiver.lastClashTime = timestamp
receiver.knockdownUntil = timestamp
receiver.knockdownResistance = 0  // cumulative buff

defender.lastClashTime = timestamp
defender.knockdownUntil = timestamp
defender.knockdownResistance = 0
```

---

## Implementation Phases

1. **Phase 1**: Data structures and stat system - COMPLETE
2. **Phase 2**: Defender creation with AI behaviors and colored zones - COMPLETE
3. **Phase 3**: Clash system with triggers and resolution - COMPLETE
4. **Phase 4**: Catch probability integration - COMPLETE
5. **Phase 5**: Player name labels and visual polish - COMPLETE

---

## Current Roster

### Receivers

| Name | Archetype | Key Stats |
|------|-----------|-----------|
| **Sir Aldric** | Route Runner | Agility 85, Route Running 88, Catching 90 |
| **Swift Roderick** | Speed Burner | Speed 95, Acceleration 92, Catching 72 |
| **Baron Wyatt** | Balanced | Speed 76, Catching 85, Jumping 82 |

### Defenders

| Name | AI Type | Key Stats |
|------|---------|-----------|
| **The Black Knight** | Man (covers Aldric) | Man Coverage 82, Hit Power 85, Strength 82 |
| **Shadow Sentinel** | Man (covers Roderick) | Speed 88, Pursuit 90, Man Coverage 78 |
| **Iron Warden** | Zone | Zone Coverage 88, Hit Power 90, Awareness 85 |

---

## Key Constants

```javascript
CLASH_CONSTANTS = {
    CLASH_RANGE: 2.5,              // Distance for clash detection
    SEPARATION_THRESHOLD: 8,        // Margin needed to win separation
    COVERAGE_THRESHOLD: 8,          // Margin needed for coverage
    KNOCKDOWN_BASE_CHANCE: 0.15,    // Base knockdown probability
    KNOCKDOWN_DURATION: 1.0,        // Seconds knocked down
    KNOCKDOWN_RESISTANCE_GAIN: 0.15,// Cumulative resistance per knockdown
    SEPARATION_SPEED_BOOST: 1.15,   // Speed multiplier when open
    COVERAGE_SPEED_PENALTY: 0.90,   // Speed multiplier when covered
    TIME_BASED_CLASH_INTERVAL: 2.0  // Forced clash interval
}
```
