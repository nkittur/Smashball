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
    PLAYER_TIERS: {
        elite: { min: 85, max: 95 },
        veteran: { min: 78, max: 88 },
        average: { min: 68, max: 80 },
        below_average: { min: 58, max: 72 },
        rookie: { min: 55, max: 75 },
        backup: { min: 50, max: 65 },
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

/**
 * Generate a full roster with realistic tier distribution
 */
export function generateRoster(): EconomyPlayer[] {
    const roster: EconomyPlayer[] = [];

    // QB: 1 (random tier weighted toward average+)
    const qbTier = Math.random() < 0.3 ? 'veteran' : (Math.random() < 0.5 ? 'average' : selectRandomTier());
    roster.push(generatePlayer('QB', qbTier));

    // WR: 3 (1 good, 2 varied)
    roster.push(generatePlayer('WR', Math.random() < 0.4 ? 'veteran' : 'average'));
    roster.push(generatePlayer('WR', selectRandomTier()));
    roster.push(generatePlayer('WR', selectRandomTier()));

    // CB: 4 (1 good, 3 varied)
    roster.push(generatePlayer('CB', Math.random() < 0.4 ? 'veteran' : 'average'));
    roster.push(generatePlayer('CB', selectRandomTier()));
    roster.push(generatePlayer('CB', selectRandomTier()));
    roster.push(generatePlayer('CB', selectRandomTier()));

    // OL: 5 (1 anchor, 4 varied)
    roster.push(generatePlayer('OL', Math.random() < 0.4 ? 'veteran' : 'average'));
    roster.push(generatePlayer('OL', selectRandomTier()));
    roster.push(generatePlayer('OL', selectRandomTier()));
    roster.push(generatePlayer('OL', selectRandomTier()));
    roster.push(generatePlayer('OL', selectRandomTier()));

    // DL: 4 (1 pass rusher, 3 varied)
    roster.push(generatePlayer('DL', Math.random() < 0.4 ? 'veteran' : 'average'));
    roster.push(generatePlayer('DL', selectRandomTier()));
    roster.push(generatePlayer('DL', selectRandomTier()));
    roster.push(generatePlayer('DL', selectRandomTier()));

    return roster;
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
        potentialGrade: number
    ): EconomyPlayer {
        const player: EconomyPlayer = {
            id: generateId(),
            firstName,
            lastName,
            age,
            position,
            stats,
            overall: this.calculateOverall(stats, position),
            peakAge,
            potentialGrade,
            yearsInLeague: Math.max(0, age - 21),
            salaryCost: 0,
            hypeData: initializeHypeData(),
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
 * Helper to migrate existing players to have hype data
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
}): EconomyPlayer {
    return {
        ...existingPlayer,
        yearsInLeague: existingPlayer.yearsInLeague ?? Math.max(0, existingPlayer.age - 21),
        salaryCost: existingPlayer.salaryCost ?? 500,
        hypeData: initializeHypeData(),
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
