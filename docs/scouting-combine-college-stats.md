# Scouting System: Combine & College Stats

## Overview

This system adds two new categories of observable metrics to the draft scouting system:
1. **Combine Stats** - Physical measurables from the pre-draft combine
2. **College Stats** - Performance statistics from college career

These stats are **correlated** to underlying player attributes, giving scouts indirect information about a player's abilities without revealing exact attribute values.

## Design Rationale

### Why Correlated Stats?

In real sports drafts, teams can't directly measure a player's "pass blocking" or "route running" ability. Instead, they observe:
- **Combine results** - Raw athleticism that hints at physical attributes
- **Game tape/stats** - Performance outcomes that reflect multiple skills combined

This creates interesting draft decisions:
- A player with great combine numbers might have poor technique
- A player with great college stats might have benefited from a strong supporting cast
- Scouting reduces uncertainty but never gives perfect information

### Uncertainty Model

Each observable stat is generated from underlying attributes with:
1. **Base calculation** - Weighted combination of relevant attributes
2. **Random variance** - Represents day-to-day performance variation
3. **Scouting refinement** - Higher scout levels show narrower ranges

---

## Combine Stats

Physical and mental measurables taken at the draft combine. Each test targets **specific attributes** with minimal overlap.

### Athletic Testing

| Event | Unit | Primary Attribute | Secondary | Notes |
|-------|------|-------------------|-----------|-------|
| **40-Yard Dash** | seconds | Speed (82%) | Agility (18%) | Pure speed test |
| **Vertical Jump** | inches | Speed (56%) | Agility (44%) | Explosiveness |
| **3-Cone Drill** | seconds | Agility (83%) | Speed (17%) | Change of direction |
| **20-Yard Shuttle** | seconds | Agility (70%) | Speed (30%) | Lateral quickness |
| **Bench Press** | reps | Strength (100%) | - | Upper body strength |
| **Broad Jump** | inches | Strength (55%) | Speed (45%) | Lower body power |

### Mental/Interview Testing

| Event | Format | Primary Attribute | Secondary | Notes |
|-------|--------|-------------------|-----------|-------|
| **Wonderlic** | 0-50 score | Intelligence (100%) | - | Cognitive test |
| **Film Study** | Letter grade | Intelligence (70%) | Agility/Speed (30%) | Football IQ |
| **Position Drills** | Letter grade | Intelligence (40%) | Agility (30%), Speed (30%) | Learning ability |

### Design Rationale

Each physical test is designed to isolate specific attributes:
- **Speed tests** (40-yard, vertical): No strength component - pure speed/explosiveness
- **Agility tests** (3-cone, shuttle): Minimal speed component - pure change of direction
- **Strength tests** (bench): Pure upper body strength
- **Power tests** (broad jump): Strength + speed combination for lower body

Mental tests reveal intelligence without physical skill:
- **Wonderlic**: Raw cognitive ability, independent of football experience
- **Film Study**: How well they understand football concepts
- **Position Drills**: Ability to learn and execute new techniques

### Position-Specific Benchmarks

| Position | 40-Yard | Wonderlic | Vertical | Key Tests |
|----------|---------|-----------|----------|-----------|
| QB | 4.6-5.0 | 28-40 | 30-35 | Wonderlic, Film Study |
| WR | 4.3-4.6 | 18-28 | 35-42 | 40-yard, Vertical |
| CB | 4.3-4.5 | 20-30 | 36-44 | 40-yard, 3-Cone |
| OL | 4.9-5.4 | 24-32 | 26-32 | Bench, Wonderlic |
| DL | 4.6-5.0 | 18-26 | 30-36 | Bench, 40-yard |

---

## College Stats

Performance statistics from college career. These reflect **technique/skill attributes** combined with physical tools.

### Stats by Position

#### Quarterback (QB)

| Stat | Display | Primary Skills | Secondary Skills | Notes |
|------|---------|---------------|-----------------|-------|
| **Completion %** | 58-72% | Accuracy (50%) | Decision Making (30%), Arm Strength (20%) | Higher = better |
| **TD:INT Ratio** | 1.0-4.0 | Decision Making (50%) | Accuracy (30%), Intelligence (20%) | Higher = better |
| **Yards/Attempt** | 6.0-10.0 | Arm Strength (40%) | Accuracy (30%), Decision Making (30%) | Higher = better |
| **Passer Rating** | 120-170 | Composite | All QB skills | NCAA formula |
| **Sack %** | 3-10% | Pocket Presence (60%) | Intelligence (40%) | Lower = better |

#### Wide Receiver (WR)

| Stat | Display | Primary Skills | Secondary Skills | Notes |
|------|---------|---------------|-----------------|-------|
| **Yards/Reception** | 10-18 | Speed (40%) | Route Running (30%), Hands (30%) | Higher = better |
| **Catch Rate** | 55-75% | Hands (50%) | Route Running (30%), Agility (20%) | Higher = better |
| **Contested Catch %** | 40-65% | Hands (40%), Jumping (30%) | Strength (30%) | Higher = better |
| **Yards After Catch** | 3-8 | Speed (40%), Agility (40%) | Strength (20%) | Higher = better |
| **Drop Rate** | 2-10% | Hands (70%) | Intelligence (30%) | Lower = better |

#### Cornerback (CB)

| Stat | Display | Primary Skills | Secondary Skills | Notes |
|------|---------|---------------|-----------------|-------|
| **INTs/Season** | 1-8 | Ball Skills (50%) | Coverage (30%), Speed (20%) | Higher = better |
| **Pass Breakups** | 5-18 | Coverage (50%) | Speed (30%), Agility (20%) | Higher = better |
| **Passer Rating Allowed** | 60-110 | Coverage (40%) | Speed (30%), Intelligence (30%) | Lower = better |
| **Completion % Allowed** | 45-65% | Coverage (50%) | Speed (25%), Agility (25%) | Lower = better |
| **Tackles/Season** | 30-70 | Tackling (60%) | Speed (20%), Strength (20%) | Context-dependent |

#### Offensive Line (OL)

| Stat | Display | Primary Skills | Secondary Skills | Notes |
|------|---------|---------------|-----------------|-------|
| **Sacks Allowed** | 0-6 | Pass Blocking (60%) | Intelligence (25%), Agility (15%) | Lower = better |
| **Pressures Allowed** | 5-25 | Pass Blocking (50%) | Strength (30%), Agility (20%) | Lower = better |
| **Pancake Blocks** | 10-50 | Run Blocking (50%) | Strength (40%), Agility (10%) | Higher = better |
| **Penalties** | 2-12 | Intelligence (50%) | Agility (30%), Strength (20%) | Lower = better |
| **Run Block Grade** | C- to A+ | Run Blocking (60%) | Strength (25%), Intelligence (15%) | Letter grade |

#### Defensive Line (DL)

| Stat | Display | Primary Skills | Secondary Skills | Notes |
|------|---------|---------------|-----------------|-------|
| **Sacks/Season** | 2-15 | Pass Rush (50%) | Speed (30%), Strength (20%) | Higher = better |
| **TFLs/Season** | 5-20 | Run Defense (40%) | Speed (30%), Strength (30%) | Higher = better |
| **QB Hurries** | 10-40 | Pass Rush (50%) | Speed (35%), Agility (15%) | Higher = better |
| **Run Stops** | 15-45 | Run Defense (50%) | Strength (35%), Intelligence (15%) | Higher = better |
| **Forced Fumbles** | 0-5 | Ball Skills (40%) | Strength (40%), Speed (20%) | Higher = better |

---

## Display & Scouting Integration

### How Stats Appear in UI

**Unscouted (Level 0):**
```
40-Yard Dash: 4.4 - 4.8 sec
Bench Press: 18-28 reps
Completion %: 58-68%
```

**Partially Scouted (Level 1-2):**
```
40-Yard Dash: 4.52 - 4.68 sec
Bench Press: 21-25 reps
Completion %: 61-66%
```

**Fully Scouted (Level 3):**
```
40-Yard Dash: 4.58 - 4.62 sec
Bench Press: 22-24 reps
Completion %: 63-65%
```

### Variance by Scout Level

| Scout Level | Combine Variance | College Stat Variance |
|-------------|-----------------|----------------------|
| 0 (Unscouted) | ±15% | ±20% |
| 1 | ±10% | ±14% |
| 2 | ±6% | ±8% |
| 3 (Full) | ±3% | ±4% |

---

## Implementation Notes

### Stat Generation

Stats are generated deterministically from player attributes + player ID hash:
1. Calculate base value from weighted attributes
2. Add consistent random variance using player ID as seed
3. Store as player property on draft pool generation

### Scouting Interaction

- Combine stats and college stats are **always visible** but with uncertainty
- Scouting a player reduces uncertainty on ALL their observable stats
- The underlying correlation formulas are hidden from the player

### Strategic Implications

1. **Combine warriors** - Great athleticism doesn't guarantee great skills
2. **Production monsters** - Great college stats might not translate to pros
3. **Hidden gems** - Mediocre combine + mediocre stats could still have high potential
4. **Scouting value** - More scouting reveals if stats match underlying ability

---

## Future Enhancements

- **Interview/Character grades** - Correlate to leadership, work ethic
- **Medical reports** - Injury history affecting durability
- **Pro day results** - Alternate combine numbers
- **Game tape grades** - Subjective evaluations with high variance
