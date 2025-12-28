/**
 * FootballEconomyEngine.ts
 *
 * A comprehensive economy system for Babylon.js football simulation.
 * Converts on-field performance into 'Fame' (currency) while tracking
 * 'Victory Points' (VP) as the ultimate win condition for coaches.
 */

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

/** Player position types */
export type Position = 'QB' | 'WR' | 'CB' | 'OL' | 'DL';

/** Player tier for generation */
export type PlayerTier = 'elite' | 'veteran' | 'average' | 'below_average' | 'rookie' | 'backup';

/** Player stats structure */
export interface PlayerStats {
    speed: number;
    acceleration: number;
    agility: number;
    catching: number;
    routeRunning: number;
    release: number;
    focus: number;
    tackling: number;
    hitPower: number;
    pursuit: number;
    awareness: number;
    passBlock: number;
    passRush: number;
    strength: number;
    balance: number;
    aggression: number;
    stamina: number;
    throwing?: number;
}

/** Hype data for a player - tracks fame multipliers */
export interface HypeData {
    /** Base multiplier from normal distribution (mean 1.0, std 0.2) */
    baseHypeMultiplier: number;
    /** Secret: years before peak where decline starts (0-5) */
    yearsBeforePrimeCliff: number;
    /** Accumulated fame from performance */
    accumulatedFameBank: number;
    /** Current season fame earnings */
    seasonFameEarnings: number;
}

/**
 * Core attributes - foundational physical/mental traits that rarely change.
 * These influence multiple skills and on-field performance.
 * Range: 0-100, with very rare growth opportunities.
 */
export interface CoreAttributes {
    /** Raw physical power - affects blocking, tackling, breaking tackles, hit power */
    strength: number;
    /** Top-end speed and acceleration - affects pursuit, separation, coverage */
    speed: number;
    /** Quickness, balance, change of direction - affects route running, evasion, reaction */
    agility: number;
    /** Mental processing, awareness, decision-making - affects reads, anticipation, focus */
    intelligence: number;
}

/** Player entity with economy data */
export interface EconomyPlayer {
    id: string;
    firstName: string;
    lastName: string;
    age: number;
    position: Position;
    stats: PlayerStats;
    overall: number;
    peakAge: number;
    potentialGrade: number;
    yearsInLeague: number;
    salaryCost: number;
    /** Hype system data */
    hypeData: HypeData;
    /** Core attributes - foundational traits that rarely change */
    coreAttributes: CoreAttributes;
}

/** Team entity */
export interface Team {
    id: string;
    name: string;
    fameBudget: number;
    coachVP: number;
    roster: EconomyPlayer[];
    record: { wins: number; losses: number };
    playoffFinish?: PlayoffFinish;
}

/** Playoff finish types */
export type PlayoffFinish =
    | 'champion'
    | 'runner_up'
    | 'conference_finals'
    | 'divisional'
    | 'wild_card'
    | 'missed';

/** Playoff bracket entry */
export interface PlayoffTeam {
    team: Team;
    seed: number;
}

/** Playoff round result */
export interface PlayoffMatchResult {
    winner: Team;
    loser: Team;
    winnerScore: number;
    loserScore: number;
}

/** Season standings */
export interface SeasonStandings {
    teams: Team[];
    week: number;
    isPlayoffs: boolean;
    playoffBracket?: PlayoffBracket;
}

/** Playoff bracket structure */
export interface PlayoffBracket {
    wildCardRound: PlayoffMatchResult[];
    divisionalRound: PlayoffMatchResult[];
    conferenceFinals: PlayoffMatchResult[];
    championship?: PlayoffMatchResult;
}

/** Performance event from a game */
export interface PerformanceEvent {
    playerId: string;
    eventType: 'catch' | 'touchdown' | 'tackle' | 'sack' | 'interception' | 'pass_defended' | 'yards_gained';
    rawPoints: number;
    metadata?: Record<string, unknown>;
}

/** Transaction result */
export interface TransactionResult {
    success: boolean;
    message: string;
    newBudget?: number;
    player?: EconomyPlayer;
}

/** Harvest result from trading a player */
export interface HarvestResult {
    success: boolean;
    famePayout: number;
    player: EconomyPlayer;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const ECONOMY_CONSTANTS = {
    /** Starting fame for new teams */
    STARTING_FAME: 1000,

    /** Hype multiplier configuration */
    HYPE: {
        MEAN: 1.0,
        STD_DEV: 0.2,
        FLOOR: 0.1,
        /** Decline rate per year after cliff (percentage) */
        DECLINE_RATE_PER_YEAR: 0.25,
    },

    /** VP awards for playoff finishes */
    VP_AWARDS: {
        CHAMPION: 100,
        RUNNER_UP: 20,
        CONFERENCE_FINALS: 10,
        DIVISIONAL: 5,
        WILD_CARD: 2.5,
        MISSED: 0,
    },

    /** Performance point values */
    PERFORMANCE_POINTS: {
        CATCH: 5,
        TOUCHDOWN: 50,
        TACKLE: 3,
        SACK: 15,
        INTERCEPTION: 25,
        PASS_DEFENDED: 8,
        YARDS_GAINED: 0.5, // per yard
    },

    /** Player pricing multipliers */
    PLAYER_PRICING: {
        BASE_COST_PER_OVERALL: 10,
        HYPE_MULTIPLIER_WEIGHT: 0.5,
        AGE_PENALTY_START: 30,
        AGE_PENALTY_PER_YEAR: 0.1,
        YOUNG_PREMIUM_END: 24,
        YOUNG_PREMIUM_BONUS: 0.15,
    },

    /** Playoff configuration */
    PLAYOFFS: {
        TEAMS_QUALIFY: 8,
        REGULAR_SEASON_WEEKS: 17,
    },

    /** Player generation tiers with stat ranges [min, max] */
    /** Note: Primary stats get +5 boost, so actual overall ≈ base + 5 */
    PLAYER_TIERS: {
        elite: { min: 83, max: 91 },       // → 88-96 overall (90s)
        veteran: { min: 73, max: 81 },     // → 78-86 overall (80s)
        average: { min: 63, max: 73 },     // → 68-78 overall (70s)
        below_average: { min: 53, max: 63 }, // → 58-68 overall (60s)
        rookie: { min: 55, max: 68 },      // → 60-73 overall (varied)
        backup: { min: 45, max: 55 },      // → 50-60 overall (50s)
    },

    /** Weights for random tier selection (creates natural distribution) */
    TIER_WEIGHTS: {
        elite: 0.05,        // 5% - rare stars
        veteran: 0.15,      // 15% - solid starters
        average: 0.35,      // 35% - most common
        below_average: 0.25, // 25% - depth players
        rookie: 0.15,       // 15% - young prospects
        backup: 0.05,       // 5% - practice squad level
    },

    /** Core attributes configuration */
    CORE_ATTRIBUTES: {
        /** Base ranges by tier [min, max] */
        TIER_RANGES: {
            elite: { min: 75, max: 95 },
            veteran: { min: 65, max: 85 },
            average: { min: 50, max: 75 },
            below_average: { min: 40, max: 65 },
            rookie: { min: 45, max: 80 },   // Higher ceiling for young players
            backup: { min: 35, max: 55 },
        },
        /** Chance per season for a core attribute to grow (even with max potential) */
        GROWTH_CHANCE_BASE: 0.02,  // 2% base chance
        /** Bonus growth chance per potential grade (0-3) */
        GROWTH_CHANCE_PER_POTENTIAL: 0.01,  // +1% per potential grade
        /** Max growth chance cap (even with max potential and youth) */
        GROWTH_CHANCE_CAP: 0.08,  // 8% max
        /** Growth amount when rare growth occurs */
        GROWTH_AMOUNT: { min: 1, max: 2 },
        /** Age at which core attributes stop growing entirely */
        GROWTH_CUTOFF_AGE: 27,
        /** Very rare "breakthrough" chance for exceptional growth */
        BREAKTHROUGH_CHANCE: 0.005,  // 0.5% chance for +3-5 points
        BREAKTHROUGH_AMOUNT: { min: 3, max: 5 },
    },

    /** How core attributes influence skills (multipliers) */
    CORE_ATTRIBUTE_SKILL_INFLUENCE: {
        /** Strength influences these skills */
        strength: {
            passBlock: 0.25,      // 25% of effective stat comes from core strength
            passRush: 0.25,
            tackling: 0.20,
            hitPower: 0.30,
            balance: 0.20,
        },
        /** Speed influences these skills */
        speed: {
            speed: 0.40,          // 40% of effective speed comes from core speed
            acceleration: 0.35,
            pursuit: 0.25,
        },
        /** Agility influences these skills */
        agility: {
            agility: 0.40,
            routeRunning: 0.20,
            release: 0.25,
            balance: 0.15,
        },
        /** Intelligence influences these skills */
        intelligence: {
            awareness: 0.35,
            routeRunning: 0.15,
            focus: 0.25,
            throwing: 0.20,       // QB reads and decisions
        },
    },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a random number from a normal (Gaussian) distribution
 * using the Box-Muller transform.
 */
export function randomNormal(mean: number = 0, stdDev: number = 1): number {
    let u1 = 0;
    let u2 = 0;

    // Ensure u1 is not 0 to avoid log(0)
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();

    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z * stdDev + mean;
}

/**
 * Generate a random integer in range [min, max] inclusive
 */
export function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

// ============================================================================
// PLAYER GENERATION
// ============================================================================

/** Primary stats by position - these get boosted for the position */
const POSITION_PRIMARY_STATS: Record<Position, (keyof PlayerStats)[]> = {
    WR: ['speed', 'catching', 'routeRunning', 'release', 'agility'],
    CB: ['speed', 'tackling', 'awareness', 'agility', 'pursuit'],
    OL: ['passBlock', 'strength', 'balance', 'awareness'],
    DL: ['passRush', 'strength', 'tackling', 'hitPower', 'pursuit'],
    QB: ['throwing', 'awareness', 'agility', 'strength'],
};

/** First names for player generation */
const FIRST_NAMES = [
    'Aldric', 'Baldwin', 'Cedric', 'Drake', 'Edmund', 'Finnian', 'Gareth',
    'Hadrian', 'Ivan', 'Jasper', 'Kendrick', 'Lionel', 'Magnus', 'Nathaniel',
    'Oswald', 'Percival', 'Quentin', 'Roland', 'Sebastian', 'Thaddeus',
    'Ulric', 'Vincent', 'Wallace', 'Xavier', 'York', 'Zephyr',
];

/** Last names for player generation */
const LAST_NAMES = [
    'Blackwood', 'Ironforge', 'Stoneheart', 'Wolfsbane', 'Dragonfire',
    'Thunderbolt', 'Nightshade', 'Bloodmoon', 'Frostborne', 'Stormwind',
    'Shadowmere', 'Goldcrest', 'Silvervale', 'Bronzehelm', 'Steelgrave',
    'Darkhollow', 'Brightwater', 'Redmane', 'Whitefang', 'Greymoor',
];

/**
 * Select a random tier based on weighted distribution
 */
export function selectRandomTier(): PlayerTier {
    const weights = ECONOMY_CONSTANTS.TIER_WEIGHTS;
    const roll = Math.random();
    let cumulative = 0;

    for (const [tier, weight] of Object.entries(weights)) {
        cumulative += weight;
        if (roll < cumulative) {
            return tier as PlayerTier;
        }
    }

    return 'average'; // fallback
}

/**
 * Generate random stats for a player based on tier
 */
export function generateRandomStats(position: Position, tier: PlayerTier): PlayerStats {
    const tierRange = ECONOMY_CONSTANTS.PLAYER_TIERS[tier];
    const primaryStats = POSITION_PRIMARY_STATS[position];

    // Generate base stats with some variance
    const generateStat = (isPrimary: boolean): number => {
        const { min, max } = tierRange;
        // Primary stats get a boost, secondary stats are slightly lower
        const boost = isPrimary ? 5 : -5;
        const base = randomInt(min, max);
        return clamp(base + boost + randomInt(-3, 3), 40, 99);
    };

    const stats: PlayerStats = {
        speed: generateStat(primaryStats.includes('speed')),
        acceleration: generateStat(primaryStats.includes('acceleration')),
        agility: generateStat(primaryStats.includes('agility')),
        catching: generateStat(primaryStats.includes('catching')),
        routeRunning: generateStat(primaryStats.includes('routeRunning')),
        release: generateStat(primaryStats.includes('release')),
        focus: generateStat(primaryStats.includes('focus')),
        tackling: generateStat(primaryStats.includes('tackling')),
        hitPower: generateStat(primaryStats.includes('hitPower')),
        pursuit: generateStat(primaryStats.includes('pursuit')),
        awareness: generateStat(primaryStats.includes('awareness')),
        passBlock: generateStat(primaryStats.includes('passBlock')),
        passRush: generateStat(primaryStats.includes('passRush')),
        strength: generateStat(primaryStats.includes('strength')),
        balance: generateStat(primaryStats.includes('balance')),
        aggression: generateStat(primaryStats.includes('aggression')),
        stamina: generateStat(primaryStats.includes('stamina')),
    };

    // Add throwing for QB
    if (position === 'QB') {
        stats.throwing = generateStat(true);
    }

    return stats;
}

/**
 * Generate age based on tier (veterans are older, rookies younger)
 */
export function generateAge(tier: PlayerTier): number {
    switch (tier) {
        case 'elite':
            return randomInt(26, 32);
        case 'veteran':
            return randomInt(28, 34);
        case 'average':
            return randomInt(24, 30);
        case 'below_average':
            return randomInt(23, 32);
        case 'rookie':
            return randomInt(21, 24);
        case 'backup':
            return randomInt(22, 35);
        default:
            return randomInt(22, 30);
    }
}

/**
 * Generate potential grade based on age and tier
 */
export function generatePotential(age: number, tier: PlayerTier): number {
    // Young players have higher potential, veterans have realized potential
    let basePotential: number;

    if (age <= 24) {
        basePotential = randomInt(1, 3);
    } else if (age <= 27) {
        basePotential = randomInt(0, 2);
    } else {
        basePotential = randomInt(0, 1);
    }

    // Elite players might have already hit potential
    if (tier === 'elite' && age > 26) {
        basePotential = Math.max(0, basePotential - 1);
    }

    // Rookies get bonus potential
    if (tier === 'rookie') {
        basePotential = Math.min(3, basePotential + 1);
    }

    return basePotential;
}

/**
 * Generate core attributes for a player based on tier and position
 * Core attributes are foundational traits that rarely change over time.
 */
export function generateCoreAttributes(position: Position, tier: PlayerTier): CoreAttributes {
    const tierRange = ECONOMY_CONSTANTS.CORE_ATTRIBUTES.TIER_RANGES[tier];

    // Generate base attribute with variance
    const generateAttribute = (): number => {
        const { min, max } = tierRange;
        const base = randomInt(min, max);
        // Add slight variance
        return clamp(base + randomInt(-3, 3), 30, 99);
    };

    // Generate all four core attributes
    let strength = generateAttribute();
    let speed = generateAttribute();
    let agility = generateAttribute();
    let intelligence = generateAttribute();

    // Position-based tendencies (slight boosts)
    switch (position) {
        case 'OL':
        case 'DL':
            // Linemen tend to be stronger
            strength = clamp(strength + randomInt(3, 8), 30, 99);
            speed = clamp(speed - randomInt(3, 8), 30, 99);
            break;
        case 'WR':
        case 'CB':
            // Skill positions tend to be faster and more agile
            speed = clamp(speed + randomInt(3, 8), 30, 99);
            agility = clamp(agility + randomInt(2, 5), 30, 99);
            break;
        case 'QB':
            // QBs tend to be smarter
            intelligence = clamp(intelligence + randomInt(3, 8), 30, 99);
            break;
    }

    return { strength, speed, agility, intelligence };
}

/**
 * Generate a complete player with randomized attributes
 */
export function generatePlayer(
    position: Position,
    tier: PlayerTier = 'average'
): EconomyPlayer {
    const firstName = FIRST_NAMES[randomInt(0, FIRST_NAMES.length - 1)];
    const lastName = LAST_NAMES[randomInt(0, LAST_NAMES.length - 1)];
    const age = generateAge(tier);
    const peakAge = randomInt(28, 32);
    const potentialGrade = generatePotential(age, tier);
    const stats = generateRandomStats(position, tier);
    const coreAttributes = generateCoreAttributes(position, tier);

    const primaryStats = POSITION_PRIMARY_STATS[position];
    const total = primaryStats.reduce((sum, stat) => sum + (stats[stat] || 0), 0);
    const overall = Math.floor(total / primaryStats.length);

    const player: EconomyPlayer = {
        id: generateId(),
        firstName,
        lastName,
        age,
        position,
        stats,
        overall,
        peakAge,
        potentialGrade,
        yearsInLeague: Math.max(0, age - 21),
        salaryCost: 0,
        hypeData: initializeHypeData(),
        coreAttributes,
    };

    // Calculate salary based on overall and tier
    player.salaryCost = calculatePlayerCostFromStats(player);

    return player;
}

/**
 * Calculate player cost from their stats (used during generation)
 */
function calculatePlayerCostFromStats(player: EconomyPlayer): number {
    const pc = ECONOMY_CONSTANTS.PLAYER_PRICING;
    let baseCost = player.overall * pc.BASE_COST_PER_OVERALL;

    // Age adjustments
    if (player.age >= pc.AGE_PENALTY_START) {
        const yearsOver = player.age - pc.AGE_PENALTY_START;
        baseCost *= (1 - yearsOver * pc.AGE_PENALTY_PER_YEAR);
    } else if (player.age <= pc.YOUNG_PREMIUM_END) {
        baseCost *= (1 + pc.YOUNG_PREMIUM_BONUS);
    }

    // Factor in potential
    baseCost *= (1 + player.potentialGrade * 0.1);

    return Math.max(50, Math.floor(baseCost));
}

/** Team strength level for roster generation */
export type TeamStrength = 'elite' | 'good' | 'average' | 'weak';

/**
 * Generate a full roster based on team strength level
 * - elite teams: mostly veteran/elite players (90s team overall)
 * - good teams: mix of veteran/average (80s team overall)
 * - average teams: mostly average players (70s team overall)
 * - weak teams: below_average/backup players (60s team overall)
 */
export function generateRoster(teamStrength: TeamStrength = 'average'): EconomyPlayer[] {
    const roster: EconomyPlayer[] = [];

    // Positions to fill
    const positions: Position[] = [
        'QB',
        'WR', 'WR', 'WR',
        'CB', 'CB', 'CB', 'CB',
        'OL', 'OL', 'OL', 'OL', 'OL',
        'DL', 'DL', 'DL', 'DL'
    ];

    // Determine tier distribution based on team strength
    const getTierForTeam = (): PlayerTier => {
        const roll = Math.random();

        switch (teamStrength) {
            case 'elite':
                // 90s team: mostly elite/veteran
                if (roll < 0.4) return 'elite';
                if (roll < 0.8) return 'veteran';
                return 'average';

            case 'good':
                // 80s team: mix of veteran/average with some elite
                if (roll < 0.15) return 'elite';
                if (roll < 0.5) return 'veteran';
                if (roll < 0.85) return 'average';
                return 'below_average';

            case 'average':
                // 70s team: mostly average with some variety
                if (roll < 0.05) return 'veteran';
                if (roll < 0.7) return 'average';
                if (roll < 0.9) return 'below_average';
                return 'rookie';

            case 'weak':
                // 60s team: below_average/backup
                if (roll < 0.1) return 'average';
                if (roll < 0.5) return 'below_average';
                if (roll < 0.8) return 'rookie';
                return 'backup';

            default:
                return 'average';
        }
    };

    positions.forEach(position => {
        roster.push(generatePlayer(position, getTierForTeam()));
    });

    return roster;
}

/**
 * Generate a league of teams with realistic strength distribution
 * Target: 2-3 elite teams (90s), most in 70s-80s, 2-3 weak teams (60s)
 */
export function generateLeague(numTeams: number = 12): Team[] {
    const teams: Team[] = [];

    // Determine distribution: 2-3 elite, 2-3 weak, rest are average/good
    const numElite = randomInt(2, 3);
    const numWeak = randomInt(2, 3);
    const numGood = Math.floor((numTeams - numElite - numWeak) / 2);
    const numAverage = numTeams - numElite - numWeak - numGood;

    // Create strength assignments and shuffle
    const strengths: TeamStrength[] = [
        ...Array(numElite).fill('elite'),
        ...Array(numGood).fill('good'),
        ...Array(numAverage).fill('average'),
        ...Array(numWeak).fill('weak'),
    ];

    // Shuffle to randomize which teams get which strength
    const shuffledStrengths = strengths.sort(() => Math.random() - 0.5);

    // Team name components
    const cities = [
        'Ironhold', 'Stormgate', 'Shadowmere', 'Goldcrest', 'Darkhollow',
        'Frostpeak', 'Thundervale', 'Crimsonfort', 'Silverlake', 'Blackmoor',
        'Dragonspire', 'Wolfhaven', 'Ravencliff', 'Stonekeep', 'Fireforge',
        'Northwatch', 'Eastmarch', 'Westfall', 'Southshore', 'Highgarden',
    ];

    const mascots = [
        'Knights', 'Dragons', 'Wolves', 'Ravens', 'Titans',
        'Warriors', 'Crusaders', 'Gladiators', 'Sentinels', 'Guardians',
        'Berserkers', 'Paladins', 'Warlords', 'Champions', 'Legends',
    ];

    // Shuffle cities for unique names
    const shuffledCities = [...cities].sort(() => Math.random() - 0.5);

    for (let i = 0; i < numTeams; i++) {
        const city = shuffledCities[i % shuffledCities.length];
        const mascot = mascots[randomInt(0, mascots.length - 1)];
        const teamStrength = shuffledStrengths[i];

        const team: Team = {
            id: generateId(),
            name: `${city} ${mascot}`,
            fameBudget: ECONOMY_CONSTANTS.STARTING_FAME,
            coachVP: 0,
            roster: generateRoster(teamStrength),
            record: { wins: 0, losses: 0 },
        };

        teams.push(team);
    }

    return teams;
}

/**
 * Calculate a team's overall rating from its roster
 */
export function calculateTeamOverall(team: Team): number {
    if (team.roster.length === 0) return 0;
    const total = team.roster.reduce((sum, player) => sum + player.overall, 0);
    return Math.floor(total / team.roster.length);
}

// ============================================================================
// CORE ATTRIBUTES SYSTEM
// ============================================================================

/**
 * Result of a core attribute growth attempt
 */
export interface CoreAttributeGrowthResult {
    attribute: keyof CoreAttributes;
    oldValue: number;
    newValue: number;
    isBreakthrough: boolean;
}

/**
 * Process potential core attribute growth for a player during offseason.
 * Core attributes grow very rarely - even high potential players only have ~5-8% chance.
 * Returns null if no growth occurred, or details of the growth.
 */
export function processCoreAttributeGrowth(
    player: EconomyPlayer
): CoreAttributeGrowthResult | null {
    const config = ECONOMY_CONSTANTS.CORE_ATTRIBUTES;

    // No growth after cutoff age
    if (player.age >= config.GROWTH_CUTOFF_AGE) {
        return null;
    }

    // Calculate growth chance based on potential
    let growthChance = config.GROWTH_CHANCE_BASE +
        (player.potentialGrade * config.GROWTH_CHANCE_PER_POTENTIAL);

    // Young players get slight bonus
    if (player.age <= 23) {
        growthChance += 0.01;
    }

    // Cap the chance
    growthChance = Math.min(growthChance, config.GROWTH_CHANCE_CAP);

    // Roll for growth
    if (Math.random() > growthChance) {
        return null;
    }

    // Growth occurred! Pick a random attribute
    const attributes: (keyof CoreAttributes)[] = ['strength', 'speed', 'agility', 'intelligence'];
    const attribute = attributes[randomInt(0, attributes.length - 1)];
    const oldValue = player.coreAttributes[attribute];

    // Check for breakthrough (exceptional growth)
    const isBreakthrough = Math.random() < config.BREAKTHROUGH_CHANCE;
    const growthAmount = isBreakthrough
        ? randomInt(config.BREAKTHROUGH_AMOUNT.min, config.BREAKTHROUGH_AMOUNT.max)
        : randomInt(config.GROWTH_AMOUNT.min, config.GROWTH_AMOUNT.max);

    // Apply growth
    const newValue = clamp(oldValue + growthAmount, 30, 99);
    player.coreAttributes[attribute] = newValue;

    return {
        attribute,
        oldValue,
        newValue,
        isBreakthrough,
    };
}

/**
 * Calculate effective stat value considering core attribute influence.
 * Formula: effectiveStat = baseStat * (1 - influence) + coreAttr * influence
 *
 * This blends the trained skill with the underlying physical/mental attribute.
 */
export function calculateEffectiveStat(
    player: EconomyPlayer,
    stat: keyof PlayerStats
): number {
    const baseStat = player.stats[stat];
    if (baseStat === undefined) return 0;

    const influences = ECONOMY_CONSTANTS.CORE_ATTRIBUTE_SKILL_INFLUENCE;
    let totalInfluence = 0;
    let weightedCoreContribution = 0;

    // Check each core attribute for influence on this stat
    for (const [coreAttr, skillInfluences] of Object.entries(influences)) {
        const influence = (skillInfluences as Record<string, number>)[stat];
        if (influence) {
            totalInfluence += influence;
            const coreValue = player.coreAttributes[coreAttr as keyof CoreAttributes];
            weightedCoreContribution += coreValue * influence;
        }
    }

    // If no core attributes influence this stat, return base stat
    if (totalInfluence === 0) {
        return baseStat;
    }

    // Blend base stat with core attribute contribution
    // Example: if speed has 0.4 influence from core speed,
    // effectiveSpeed = baseStat * 0.6 + coreSpeed * 0.4
    const effectiveStat = baseStat * (1 - totalInfluence) + weightedCoreContribution;

    return clamp(Math.round(effectiveStat), 0, 99);
}

/**
 * Get all effective stats for a player, accounting for core attribute influence.
 */
export function getEffectiveStats(player: EconomyPlayer): PlayerStats {
    const effectiveStats: PlayerStats = {
        speed: calculateEffectiveStat(player, 'speed'),
        acceleration: calculateEffectiveStat(player, 'acceleration'),
        agility: calculateEffectiveStat(player, 'agility'),
        catching: calculateEffectiveStat(player, 'catching'),
        routeRunning: calculateEffectiveStat(player, 'routeRunning'),
        release: calculateEffectiveStat(player, 'release'),
        focus: calculateEffectiveStat(player, 'focus'),
        tackling: calculateEffectiveStat(player, 'tackling'),
        hitPower: calculateEffectiveStat(player, 'hitPower'),
        pursuit: calculateEffectiveStat(player, 'pursuit'),
        awareness: calculateEffectiveStat(player, 'awareness'),
        passBlock: calculateEffectiveStat(player, 'passBlock'),
        passRush: calculateEffectiveStat(player, 'passRush'),
        strength: calculateEffectiveStat(player, 'strength'),
        balance: calculateEffectiveStat(player, 'balance'),
        aggression: calculateEffectiveStat(player, 'aggression'),
        stamina: calculateEffectiveStat(player, 'stamina'),
    };

    // Add throwing for QB
    if (player.position === 'QB' && player.stats.throwing !== undefined) {
        effectiveStats.throwing = calculateEffectiveStat(player, 'throwing');
    }

    return effectiveStats;
}

/**
 * Calculate a weighted roll for clash mechanics using effective stats.
 * This connects core attributes to on-field performance.
 */
export function calculateWeightedRoll(
    player: EconomyPlayer,
    statWeights: Partial<Record<keyof PlayerStats, number>>,
    variance: number = 0.2
): number {
    let weightedTotal = 0;

    for (const [stat, weight] of Object.entries(statWeights)) {
        const effectiveStat = calculateEffectiveStat(player, stat as keyof PlayerStats);
        weightedTotal += effectiveStat * weight;
    }

    // Apply random variance (±variance%)
    const randomFactor = 1 + (Math.random() - 0.5) * 2 * variance;
    return weightedTotal * randomFactor;
}

/**
 * Separation clash - WR trying to get open vs CB coverage
 * Returns positive if receiver wins, negative if defender wins
 */
export function calculateSeparationClash(
    receiver: EconomyPlayer,
    defender: EconomyPlayer
): number {
    const receiverRoll = calculateWeightedRoll(receiver, {
        speed: 0.25,
        agility: 0.25,
        routeRunning: 0.20,
        acceleration: 0.15,
        release: 0.15,
    });

    const defenderRoll = calculateWeightedRoll(defender, {
        speed: 0.20,
        agility: 0.25,
        pursuit: 0.20,
        awareness: 0.15,
        acceleration: 0.20,
    });

    return receiverRoll - defenderRoll;
}

/**
 * Line clash - OL blocking vs DL rushing
 * Returns positive if OL wins (protection), negative if DL wins (pressure)
 */
export function calculateLineClash(
    offensiveLineman: EconomyPlayer,
    defensiveLineman: EconomyPlayer
): number {
    const olRoll = calculateWeightedRoll(offensiveLineman, {
        passBlock: 0.35,
        strength: 0.30,
        balance: 0.20,
        awareness: 0.15,
    });

    const dlRoll = calculateWeightedRoll(defensiveLineman, {
        passRush: 0.35,
        strength: 0.30,
        acceleration: 0.20,
        speed: 0.15,
    });

    return olRoll - dlRoll;
}

/**
 * Tackle clash - defender trying to tackle ball carrier
 * Returns true if tackle succeeds
 */
export function calculateTackleClash(
    tackler: EconomyPlayer,
    ballCarrier: EconomyPlayer
): boolean {
    const tacklerRoll = calculateWeightedRoll(tackler, {
        tackling: 0.40,
        pursuit: 0.30,
        hitPower: 0.30,
    });

    const evasionRoll = calculateWeightedRoll(ballCarrier, {
        agility: 0.35,
        speed: 0.30,
        balance: 0.35,
    });

    // Tackle succeeds if tackler roll exceeds evasion by more than -5
    return tacklerRoll - evasionRoll > -5;
}

/**
 * Get a display-friendly summary of core attributes
 */
export function getCoreAttributeGrade(value: number): string {
    if (value >= 90) return 'Elite';
    if (value >= 80) return 'Excellent';
    if (value >= 70) return 'Good';
    if (value >= 60) return 'Average';
    if (value >= 50) return 'Below Avg';
    return 'Poor';
}

/**
 * Get overall core attribute average for a player
 */
export function getCoreAttributeAverage(player: EconomyPlayer): number {
    const { strength, speed, agility, intelligence } = player.coreAttributes;
    return Math.round((strength + speed + agility + intelligence) / 4);
}

// ============================================================================
// HYPE SYSTEM
// ============================================================================

/**
 * Initialize hype data for a new player.
 * - baseHypeMultiplier: Normal distribution (mean 1.0, std 0.2)
 * - yearsBeforePrimeCliff: Secret integer 0-5
 */
export function initializeHypeData(): HypeData {
    return {
        baseHypeMultiplier: Math.max(
            ECONOMY_CONSTANTS.HYPE.FLOOR,
            randomNormal(ECONOMY_CONSTANTS.HYPE.MEAN, ECONOMY_CONSTANTS.HYPE.STD_DEV)
        ),
        yearsBeforePrimeCliff: randomInt(0, 5),
        accumulatedFameBank: 0,
        seasonFameEarnings: 0,
    };
}

/**
 * Calculate the "cliff age" where decline begins.
 * CliffAge = PhysicalPeakAge - yearsBeforePrimeCliff
 */
export function calculateCliffAge(player: EconomyPlayer): number {
    return player.peakAge - player.hypeData.yearsBeforePrimeCliff;
}

/**
 * Calculate the current hype multiplier for a player.
 *
 * Logic:
 * - If Age < CliffAge: return baseHypeMultiplier
 * - If Age >= CliffAge: decline sharply each year
 * - Floor: never below 0.1
 */
export function calculateCurrentMultiplier(player: EconomyPlayer): number {
    const cliffAge = calculateCliffAge(player);
    const { baseHypeMultiplier } = player.hypeData;

    // Before cliff: full multiplier
    if (player.age < cliffAge) {
        return baseHypeMultiplier;
    }

    // After cliff: decline each year
    const yearsAfterCliff = player.age - cliffAge;
    const declineRate = ECONOMY_CONSTANTS.HYPE.DECLINE_RATE_PER_YEAR;

    // Compound decline: multiplier * (1 - rate)^years
    const declinedMultiplier = baseHypeMultiplier * Math.pow(1 - declineRate, yearsAfterCliff);

    // Apply floor
    return Math.max(ECONOMY_CONSTANTS.HYPE.FLOOR, declinedMultiplier);
}

/**
 * Check if a player has hit their cliff age
 */
export function hasHitCliff(player: EconomyPlayer): boolean {
    return player.age >= calculateCliffAge(player);
}

/**
 * Get years until cliff (or years past cliff if negative)
 */
export function getYearsToCliff(player: EconomyPlayer): number {
    return calculateCliffAge(player) - player.age;
}

// ============================================================================
// PERFORMANCE TO FAME CONVERSION
// ============================================================================

/**
 * Convert raw performance points to earned fame.
 * EarnedFame = RawPerformancePoints * CurrentMultiplier
 */
export function calculateEarnedFame(
    rawPerformancePoints: number,
    player: EconomyPlayer
): number {
    const multiplier = calculateCurrentMultiplier(player);
    const earnedFame = Math.floor(rawPerformancePoints * multiplier);
    return earnedFame;
}

/**
 * Process a performance event and add fame to player's bank
 */
export function processPerformanceEvent(
    player: EconomyPlayer,
    event: PerformanceEvent
): number {
    const earnedFame = calculateEarnedFame(event.rawPoints, player);

    // Add to accumulated bank
    player.hypeData.accumulatedFameBank += earnedFame;
    player.hypeData.seasonFameEarnings += earnedFame;

    return earnedFame;
}

/**
 * Calculate raw performance points from game stats
 */
export function calculateRawPerformancePoints(stats: {
    catches?: number;
    touchdowns?: number;
    tackles?: number;
    sacks?: number;
    interceptions?: number;
    passesDefended?: number;
    yardsGained?: number;
}): number {
    const pp = ECONOMY_CONSTANTS.PERFORMANCE_POINTS;

    return (
        (stats.catches || 0) * pp.CATCH +
        (stats.touchdowns || 0) * pp.TOUCHDOWN +
        (stats.tackles || 0) * pp.TACKLE +
        (stats.sacks || 0) * pp.SACK +
        (stats.interceptions || 0) * pp.INTERCEPTION +
        (stats.passesDefended || 0) * pp.PASS_DEFENDED +
        (stats.yardsGained || 0) * pp.YARDS_GAINED
    );
}

// ============================================================================
// HARVEST (TRADE) SYSTEM
// ============================================================================

/**
 * Calculate the harvest (trade) value for a player.
 * Returns the full AccumulatedFameBank - no modifiers or deductions.
 */
export function calculateHarvestValue(player: EconomyPlayer): number {
    return player.hypeData.accumulatedFameBank;
}

/**
 * Harvest a player - trade them for fame payout.
 * Returns the full AccumulatedFameBank and removes player from team.
 */
export function harvestPlayer(
    team: Team,
    playerId: string
): HarvestResult | null {
    const playerIndex = team.roster.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
        return null;
    }

    const player = team.roster[playerIndex];
    const famePayout = player.hypeData.accumulatedFameBank;

    // Remove player from roster
    team.roster.splice(playerIndex, 1);

    // Add fame to team budget
    team.fameBudget += famePayout;

    return {
        success: true,
        famePayout,
        player,
    };
}

// ============================================================================
// PLAYER PRICING
// ============================================================================

/**
 * Calculate the cost to buy a player based on stats and hype multiplier.
 */
export function calculatePlayerCost(player: EconomyPlayer): number {
    const pc = ECONOMY_CONSTANTS.PLAYER_PRICING;

    // Base cost from overall rating
    let baseCost = player.overall * pc.BASE_COST_PER_OVERALL;

    // Apply hype multiplier weight
    const currentMultiplier = calculateCurrentMultiplier(player);
    const hypeAdjustment = 1 + (currentMultiplier - 1) * pc.HYPE_MULTIPLIER_WEIGHT;
    baseCost *= hypeAdjustment;

    // Age adjustments
    if (player.age >= pc.AGE_PENALTY_START) {
        const yearsOver = player.age - pc.AGE_PENALTY_START;
        baseCost *= (1 - yearsOver * pc.AGE_PENALTY_PER_YEAR);
    } else if (player.age <= pc.YOUNG_PREMIUM_END) {
        baseCost *= (1 + pc.YOUNG_PREMIUM_BONUS);
    }

    // Factor in potential
    baseCost *= (1 + player.potentialGrade * 0.1);

    return Math.max(50, Math.floor(baseCost));
}

// ============================================================================
// ECONOMY MANAGER CLASS
// ============================================================================

/**
 * Main economy manager class.
 * Tracks team fame budget, handles transactions, and manages coach VP.
 */
export class FootballEconomyEngine {
    private teams: Map<string, Team> = new Map();
    private seasonStandings: SeasonStandings | null = null;

    constructor() {
        // Initialize
    }

    // ========================================================================
    // TEAM MANAGEMENT
    // ========================================================================

    /**
     * Create a new team with starting budget
     */
    createTeam(name: string): Team {
        const team: Team = {
            id: generateId(),
            name,
            fameBudget: ECONOMY_CONSTANTS.STARTING_FAME,
            coachVP: 0,
            roster: [],
            record: { wins: 0, losses: 0 },
        };

        this.teams.set(team.id, team);
        return team;
    }

    /**
     * Get a team by ID
     */
    getTeam(teamId: string): Team | undefined {
        return this.teams.get(teamId);
    }

    /**
     * Get all teams
     */
    getAllTeams(): Team[] {
        return Array.from(this.teams.values());
    }

    /**
     * Get team's current fame budget
     */
    getTeamBudget(teamId: string): number {
        const team = this.teams.get(teamId);
        return team?.fameBudget ?? 0;
    }

    /**
     * Add fame to team budget
     */
    addFame(teamId: string, amount: number): boolean {
        const team = this.teams.get(teamId);
        if (!team) return false;

        team.fameBudget += amount;
        return true;
    }

    /**
     * Deduct fame from team budget
     */
    deductFame(teamId: string, amount: number): boolean {
        const team = this.teams.get(teamId);
        if (!team || team.fameBudget < amount) return false;

        team.fameBudget -= amount;
        return true;
    }

    // ========================================================================
    // PLAYER TRANSACTIONS
    // ========================================================================

    /**
     * Create a new player with initialized hype data
     */
    createPlayer(
        firstName: string,
        lastName: string,
        position: Position,
        stats: PlayerStats,
        age: number,
        peakAge: number,
        potentialGrade: number,
        coreAttributes?: CoreAttributes
    ): EconomyPlayer {
        // Generate core attributes if not provided, inferring tier from overall
        const overall = this.calculateOverall(stats, position);
        const inferredCoreAttrs = coreAttributes || generateCoreAttributes(
            position,
            overall >= 88 ? 'elite' :
            overall >= 78 ? 'veteran' :
            overall >= 68 ? 'average' :
            overall >= 58 ? 'below_average' : 'backup'
        );

        const player: EconomyPlayer = {
            id: generateId(),
            firstName,
            lastName,
            age,
            position,
            stats,
            overall,
            peakAge,
            potentialGrade,
            yearsInLeague: Math.max(0, age - 21),
            salaryCost: 0,
            hypeData: initializeHypeData(),
            coreAttributes: inferredCoreAttrs,
        };

        // Calculate salary cost
        player.salaryCost = calculatePlayerCost(player);

        return player;
    }

    /**
     * Calculate overall rating from stats
     */
    private calculateOverall(stats: PlayerStats, position: Position): number {
        const primaryStats: Record<Position, (keyof PlayerStats)[]> = {
            WR: ['speed', 'catching', 'routeRunning', 'release', 'agility'],
            CB: ['speed', 'tackling', 'awareness', 'agility', 'pursuit'],
            OL: ['passBlock', 'strength', 'balance', 'awareness'],
            DL: ['passRush', 'strength', 'tackling', 'hitPower', 'pursuit'],
            QB: ['throwing', 'awareness', 'agility', 'strength'],
        };

        const statKeys = primaryStats[position];
        const total = statKeys.reduce((sum, key) => sum + (stats[key] || 0), 0);
        return Math.floor(total / statKeys.length);
    }

    /**
     * Buy a player for a team.
     * Cost is based on stats and hype multiplier.
     */
    buyPlayer(teamId: string, player: EconomyPlayer): TransactionResult {
        const team = this.teams.get(teamId);
        if (!team) {
            return { success: false, message: 'Team not found' };
        }

        const cost = calculatePlayerCost(player);

        if (team.fameBudget < cost) {
            return {
                success: false,
                message: `Insufficient fame. Need ${cost}, have ${team.fameBudget}`,
            };
        }

        // Deduct cost
        team.fameBudget -= cost;

        // Add player to roster
        team.roster.push(player);

        return {
            success: true,
            message: `Signed ${player.firstName} ${player.lastName} for ${cost} fame`,
            newBudget: team.fameBudget,
            player,
        };
    }

    /**
     * Harvest (trade) a player for fame
     */
    harvestPlayer(teamId: string, playerId: string): HarvestResult | null {
        const team = this.teams.get(teamId);
        if (!team) return null;

        return harvestPlayer(team, playerId);
    }

    // ========================================================================
    // PERFORMANCE PROCESSING
    // ========================================================================

    /**
     * Process game performance for a player
     */
    processGamePerformance(
        teamId: string,
        playerId: string,
        gameStats: {
            catches?: number;
            touchdowns?: number;
            tackles?: number;
            sacks?: number;
            interceptions?: number;
            passesDefended?: number;
            yardsGained?: number;
        }
    ): number {
        const team = this.teams.get(teamId);
        if (!team) return 0;

        const player = team.roster.find(p => p.id === playerId);
        if (!player) return 0;

        const rawPoints = calculateRawPerformancePoints(gameStats);
        const earnedFame = calculateEarnedFame(rawPoints, player);

        // Update player's fame bank
        player.hypeData.accumulatedFameBank += earnedFame;
        player.hypeData.seasonFameEarnings += earnedFame;

        return earnedFame;
    }

    /**
     * Reset season earnings for all players on a team
     */
    resetSeasonEarnings(teamId: string): void {
        const team = this.teams.get(teamId);
        if (!team) return;

        team.roster.forEach(player => {
            player.hypeData.seasonFameEarnings = 0;
        });
    }

    // ========================================================================
    // COACH VP & PLAYOFFS
    // ========================================================================

    /**
     * Get coach VP for a team
     */
    getCoachVP(teamId: string): number {
        const team = this.teams.get(teamId);
        return team?.coachVP ?? 0;
    }

    /**
     * Award VP based on playoff finish
     */
    awardPlayoffVP(teamId: string, finish: PlayoffFinish): number {
        const team = this.teams.get(teamId);
        if (!team) return 0;

        const vpAwards = ECONOMY_CONSTANTS.VP_AWARDS;
        let vpAwarded = 0;

        switch (finish) {
            case 'champion':
                vpAwarded = vpAwards.CHAMPION;
                break;
            case 'runner_up':
                vpAwarded = vpAwards.RUNNER_UP;
                break;
            case 'conference_finals':
                vpAwarded = vpAwards.CONFERENCE_FINALS;
                break;
            case 'divisional':
                vpAwarded = vpAwards.DIVISIONAL;
                break;
            case 'wild_card':
                vpAwarded = vpAwards.WILD_CARD;
                break;
            case 'missed':
            default:
                vpAwarded = vpAwards.MISSED;
                break;
        }

        team.coachVP += vpAwarded;
        team.playoffFinish = finish;

        return vpAwarded;
    }

    /**
     * Initialize playoffs with top teams
     */
    initializePlayoffs(teams: Team[]): PlayoffTeam[] {
        // Sort by wins, then by point differential (simplified: just wins)
        const sorted = [...teams].sort((a, b) => {
            const winDiff = b.record.wins - a.record.wins;
            if (winDiff !== 0) return winDiff;
            return a.record.losses - b.record.losses;
        });

        // Take top 8 teams
        const playoffTeams = sorted
            .slice(0, ECONOMY_CONSTANTS.PLAYOFFS.TEAMS_QUALIFY)
            .map((team, index) => ({
                team,
                seed: index + 1,
            }));

        // Mark teams that missed playoffs
        sorted.slice(ECONOMY_CONSTANTS.PLAYOFFS.TEAMS_QUALIFY).forEach(team => {
            this.awardPlayoffVP(team.id, 'missed');
        });

        return playoffTeams;
    }

    /**
     * Simulate a playoff matchup between two teams.
     * Returns the winner and awards VP to the loser.
     */
    simulatePlayoffMatch(
        team1: Team,
        team2: Team,
        round: 'wild_card' | 'divisional' | 'conference_finals' | 'championship'
    ): PlayoffMatchResult {
        // Calculate team strengths
        const strength1 = this.calculateTeamStrength(team1);
        const strength2 = this.calculateTeamStrength(team2);

        // Add randomness
        const roll1 = strength1 + Math.random() * 30;
        const roll2 = strength2 + Math.random() * 30;

        const winner = roll1 > roll2 ? team1 : team2;
        const loser = roll1 > roll2 ? team2 : team1;

        // Generate scores
        const baseScore = 14;
        const winnerScore = baseScore + randomInt(7, 28);
        const loserScore = baseScore + randomInt(0, 14);

        // Award VP to loser based on round eliminated
        let loserFinish: PlayoffFinish;
        switch (round) {
            case 'wild_card':
                loserFinish = 'wild_card';
                break;
            case 'divisional':
                loserFinish = 'divisional';
                break;
            case 'conference_finals':
                loserFinish = 'conference_finals';
                break;
            case 'championship':
                loserFinish = 'runner_up';
                break;
        }

        this.awardPlayoffVP(loser.id, loserFinish);

        // If championship, award winner
        if (round === 'championship') {
            this.awardPlayoffVP(winner.id, 'champion');
        }

        return {
            winner,
            loser,
            winnerScore,
            loserScore,
        };
    }

    /**
     * Run a complete playoff bracket
     */
    runPlayoffs(teams: Team[]): PlayoffBracket {
        const playoffTeams = this.initializePlayoffs(teams);

        if (playoffTeams.length < 8) {
            throw new Error('Not enough teams for playoffs');
        }

        // Wild Card Round: 1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5
        const wildCardMatchups = [
            [playoffTeams[0], playoffTeams[7]],
            [playoffTeams[1], playoffTeams[6]],
            [playoffTeams[2], playoffTeams[5]],
            [playoffTeams[3], playoffTeams[4]],
        ];

        const wildCardResults = wildCardMatchups.map(([t1, t2]) =>
            this.simulatePlayoffMatch(t1.team, t2.team, 'wild_card')
        );

        // Divisional Round
        const divisionalMatchups = [
            [wildCardResults[0].winner, wildCardResults[3].winner],
            [wildCardResults[1].winner, wildCardResults[2].winner],
        ];

        const divisionalResults = divisionalMatchups.map(([t1, t2]) =>
            this.simulatePlayoffMatch(t1, t2, 'divisional')
        );

        // Conference Finals
        const conferenceResults = [
            this.simulatePlayoffMatch(
                divisionalResults[0].winner,
                divisionalResults[1].winner,
                'conference_finals'
            ),
        ];

        // Championship
        const championship = this.simulatePlayoffMatch(
            conferenceResults[0].winner,
            conferenceResults[0].loser,
            'championship'
        );

        return {
            wildCardRound: wildCardResults,
            divisionalRound: divisionalResults,
            conferenceFinals: conferenceResults,
            championship,
        };
    }

    /**
     * Calculate team strength for playoff simulation
     */
    private calculateTeamStrength(team: Team): number {
        if (team.roster.length === 0) return 50;

        const avgOverall = team.roster.reduce((sum, p) => sum + p.overall, 0) / team.roster.length;
        const avgHype = team.roster.reduce((sum, p) =>
            sum + calculateCurrentMultiplier(p), 0) / team.roster.length;

        // Factor in record
        const winPct = team.record.wins / Math.max(1, team.record.wins + team.record.losses);

        return avgOverall * 0.6 + avgHype * 20 + winPct * 30;
    }

    // ========================================================================
    // SEASON MANAGEMENT
    // ========================================================================

    /**
     * Process end of season for all teams
     */
    processEndOfSeason(): void {
        this.teams.forEach(team => {
            // Age all players
            team.roster.forEach(player => {
                player.age++;
                player.yearsInLeague++;
            });

            // Reset season stats
            this.resetSeasonEarnings(team.id);

            // Reset record
            team.record = { wins: 0, losses: 0 };
            team.playoffFinish = undefined;
        });
    }

    /**
     * Get a summary of a player's economy status
     */
    getPlayerEconomySummary(player: EconomyPlayer): {
        currentMultiplier: number;
        yearsToCliff: number;
        hasHitCliff: boolean;
        accumulatedFame: number;
        seasonFame: number;
        harvestValue: number;
        marketValue: number;
    } {
        return {
            currentMultiplier: calculateCurrentMultiplier(player),
            yearsToCliff: getYearsToCliff(player),
            hasHitCliff: hasHitCliff(player),
            accumulatedFame: player.hypeData.accumulatedFameBank,
            seasonFame: player.hypeData.seasonFameEarnings,
            harvestValue: calculateHarvestValue(player),
            marketValue: calculatePlayerCost(player),
        };
    }

    // ========================================================================
    // SERIALIZATION
    // ========================================================================

    /**
     * Export state for saving
     */
    exportState(): { teams: Team[]; seasonStandings: SeasonStandings | null } {
        return {
            teams: Array.from(this.teams.values()),
            seasonStandings: this.seasonStandings,
        };
    }

    /**
     * Import state from save
     */
    importState(state: { teams: Team[]; seasonStandings?: SeasonStandings | null }): void {
        this.teams.clear();
        state.teams.forEach(team => {
            this.teams.set(team.id, team);
        });
        this.seasonStandings = state.seasonStandings ?? null;
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/** Global economy engine instance */
export const economyEngine = new FootballEconomyEngine();

// ============================================================================
// INTEGRATION HELPERS
// ============================================================================

/**
 * Helper to migrate existing players to have hype data and core attributes
 */
export function migratePlayerToEconomy(existingPlayer: {
    id: string;
    firstName: string;
    lastName: string;
    age: number;
    position: Position;
    stats: PlayerStats;
    overall: number;
    peakAge: number;
    potentialGrade: number;
    yearsInLeague?: number;
    salaryCost?: number;
    coreAttributes?: CoreAttributes;
}): EconomyPlayer {
    // Infer tier from overall for core attribute generation
    const tier: PlayerTier = existingPlayer.overall >= 88 ? 'elite' :
        existingPlayer.overall >= 78 ? 'veteran' :
        existingPlayer.overall >= 68 ? 'average' :
        existingPlayer.overall >= 58 ? 'below_average' : 'backup';

    return {
        ...existingPlayer,
        yearsInLeague: existingPlayer.yearsInLeague ?? Math.max(0, existingPlayer.age - 21),
        salaryCost: existingPlayer.salaryCost ?? 500,
        hypeData: initializeHypeData(),
        coreAttributes: existingPlayer.coreAttributes ?? generateCoreAttributes(existingPlayer.position, tier),
    };
}

/**
 * Batch process game stats for multiple players
 */
export function processTeamGameStats(
    team: Team,
    playerStats: Map<string, {
        catches?: number;
        touchdowns?: number;
        tackles?: number;
        sacks?: number;
        interceptions?: number;
        passesDefended?: number;
        yardsGained?: number;
    }>
): Map<string, number> {
    const results = new Map<string, number>();

    playerStats.forEach((stats, playerId) => {
        const player = team.roster.find(p => p.id === playerId);
        if (player) {
            const rawPoints = calculateRawPerformancePoints(stats);
            const earnedFame = calculateEarnedFame(rawPoints, player);

            player.hypeData.accumulatedFameBank += earnedFame;
            player.hypeData.seasonFameEarnings += earnedFame;

            results.set(playerId, earnedFame);
        }
    });

    return results;
}
