"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAchievementProgress = exports.checkAndUnlockAchievements = exports.ACHIEVEMENTS = void 0;
const Achievements_1 = __importDefault(require("../models/Achievements"));
const Activity_1 = __importDefault(require("../models/Activity"));
const User_1 = __importDefault(require("../models/User"));
// All available achievements
exports.ACHIEVEMENTS = [
    // Games Played Achievements
    {
        id: 'first_game',
        title: 'First Steps',
        description: 'Play your first game',
        icon: '🎮',
        category: 'games',
        rarity: 'common',
        condition: (stats) => stats.gamesPlayed >= 1
    },
    {
        id: 'games_10',
        title: 'Getting Started',
        description: 'Play 10 games',
        icon: '🎯',
        category: 'games',
        rarity: 'common',
        condition: (stats) => stats.gamesPlayed >= 10
    },
    {
        id: 'games_50',
        title: 'Dedicated Player',
        description: 'Play 50 games',
        icon: '🎪',
        category: 'games',
        rarity: 'rare',
        condition: (stats) => stats.gamesPlayed >= 50
    },
    {
        id: 'games_100',
        title: 'Trivia Addict',
        description: 'Play 100 games',
        icon: '🏆',
        category: 'games',
        rarity: 'epic',
        condition: (stats) => stats.gamesPlayed >= 100
    },
    // Wins Achievements
    {
        id: 'first_win',
        title: 'Victory!',
        description: 'Win your first game',
        icon: '🥇',
        category: 'wins',
        rarity: 'common',
        condition: (stats) => stats.wins >= 1
    },
    {
        id: 'wins_5',
        title: 'Champion',
        description: 'Win 5 games',
        icon: '👑',
        category: 'wins',
        rarity: 'rare',
        condition: (stats) => stats.wins >= 5
    },
    {
        id: 'wins_25',
        title: 'Unstoppable',
        description: 'Win 25 games',
        icon: '⚡',
        category: 'wins',
        rarity: 'epic',
        condition: (stats) => stats.wins >= 25
    },
    {
        id: 'wins_50',
        title: 'Legend',
        description: 'Win 50 games',
        icon: '🌟',
        category: 'wins',
        rarity: 'legendary',
        condition: (stats) => stats.wins >= 50
    },
    // Score Achievements
    {
        id: 'score_1000',
        title: 'Rising Star',
        description: 'Earn 1,000 total points',
        icon: '⭐',
        category: 'score',
        rarity: 'common',
        condition: (stats) => stats.totalPoints >= 1000
    },
    {
        id: 'score_10000',
        title: 'Point Master',
        description: 'Earn 10,000 total points',
        icon: '💎',
        category: 'score',
        rarity: 'rare',
        condition: (stats) => stats.totalPoints >= 10000
    },
    {
        id: 'score_50000',
        title: 'Elite Scorer',
        description: 'Earn 50,000 total points',
        icon: '👑',
        category: 'score',
        rarity: 'epic',
        condition: (stats) => stats.totalPoints >= 50000
    },
    {
        id: 'high_score_500',
        title: 'High Roller',
        description: 'Score 500+ points in a single game',
        icon: '🔥',
        category: 'score',
        rarity: 'rare',
        condition: (stats) => stats.highestScore >= 500
    },
    {
        id: 'high_score_1000',
        title: 'Perfect Storm',
        description: 'Score 1,000+ points in a single game',
        icon: '⚡',
        category: 'score',
        rarity: 'epic',
        condition: (stats) => stats.highestScore >= 1000
    },
    // Win Rate Achievements
    {
        id: 'winrate_50',
        title: 'Consistent Winner',
        description: 'Maintain 50% win rate (min 10 games)',
        icon: '🎖️',
        category: 'wins',
        rarity: 'rare',
        condition: (stats) => stats.gamesPlayed >= 10 && stats.winRate >= 50
    },
    {
        id: 'winrate_75',
        title: 'Dominator',
        description: 'Maintain 75% win rate (min 20 games)',
        icon: '👑',
        category: 'wins',
        rarity: 'epic',
        condition: (stats) => stats.gamesPlayed >= 20 && stats.winRate >= 75
    },
    // Streak Achievements
    {
        id: 'streak_3',
        title: 'On Fire',
        description: 'Win 3 games in a row',
        icon: '🔥',
        category: 'wins',
        rarity: 'rare',
        condition: (stats) => stats.longestStreak >= 3
    },
    {
        id: 'streak_5',
        title: 'Unstoppable Force',
        description: 'Win 5 games in a row',
        icon: '⚡',
        category: 'wins',
        rarity: 'epic',
        condition: (stats) => stats.longestStreak >= 5
    },
    {
        id: 'streak_10',
        title: 'Legendary Streak',
        description: 'Win 10 games in a row',
        icon: '🌟',
        category: 'wins',
        rarity: 'legendary',
        condition: (stats) => stats.longestStreak >= 10
    },
    // Perfect Game Achievements
    {
        id: 'perfect_game',
        title: 'Flawless',
        description: 'Win a game with 100% accuracy',
        icon: '💯',
        category: 'accuracy',
        rarity: 'rare',
        condition: (stats) => stats.perfectGames >= 1
    },
    {
        id: 'perfect_games_5',
        title: 'Perfectionist',
        description: 'Win 5 games with 100% accuracy',
        icon: '✨',
        category: 'accuracy',
        rarity: 'epic',
        condition: (stats) => stats.perfectGames >= 5
    }
];
/**
 * Check and unlock achievements for a user
 * @param userId - User ID
 * @returns Array of newly unlocked achievements
 */
const checkAndUnlockAchievements = async (userId) => {
    try {
        // Get user with stats
        const user = await User_1.default.findById(userId);
        if (!user)
            return [];
        // Get user's current achievements
        const unlockedAchievements = await Achievements_1.default.find({ userId });
        const unlockedIds = unlockedAchievements.map((a) => a.achievementId);
        // Prepare stats object for checking
        const stats = {
            gamesPlayed: user.stats.gamesPlayed,
            wins: user.stats.wins,
            totalPoints: user.stats.totalPoints,
            winRate: user.stats.gamesPlayed > 0
                ? (user.stats.wins / user.stats.gamesPlayed) * 100
                : 0,
            highestScore: user.stats.highestScore || 0,
            longestStreak: user.stats.longestStreak || 0,
            perfectGames: user.stats.perfectGames || 0
        };
        // Check each achievement
        const newAchievements = [];
        for (const achievement of exports.ACHIEVEMENTS) {
            // Skip if already unlocked
            if (unlockedIds.includes(achievement.id))
                continue;
            // Check condition
            if (achievement.condition(stats)) {
                // Unlock achievement
                const unlocked = await Achievements_1.default.create({
                    userId,
                    achievementId: achievement.id,
                    title: achievement.title,
                    description: achievement.description,
                    icon: achievement.icon,
                    progress: 100
                });
                newAchievements.push(unlocked);
                // Create activity
                await Activity_1.default.create({
                    userId,
                    username: user.username,
                    type: 'achievement_unlocked',
                    message: `Unlocked achievement: ${achievement.title}`,
                    metadata: { achievementId: achievement.id },
                    avatar: user.avatar
                });
            }
        }
        return newAchievements;
    }
    catch (error) {
        console.error('Error checking achievements:', error);
        return [];
    }
};
exports.checkAndUnlockAchievements = checkAndUnlockAchievements;
/**
 * Get achievement progress for a user
 * @param userId - User ID
 * @returns Achievement progress data
 */
const getAchievementProgress = async (userId) => {
    try {
        const user = await User_1.default.findById(userId);
        if (!user)
            return null;
        const unlockedAchievements = await Achievements_1.default.find({ userId });
        const unlockedIds = unlockedAchievements.map((a) => a.achievementId);
        const stats = {
            gamesPlayed: user.stats.gamesPlayed,
            wins: user.stats.wins,
            totalPoints: user.stats.totalPoints,
            winRate: user.stats.gamesPlayed > 0
                ? (user.stats.wins / user.stats.gamesPlayed) * 100
                : 0,
            highestScore: user.stats.highestScore || 0,
            longestStreak: user.stats.longestStreak || 0,
            perfectGames: user.stats.perfectGames || 0
        };
        // Build progress for all achievements
        const progress = exports.ACHIEVEMENTS.map((achievement) => {
            const isUnlocked = unlockedIds.includes(achievement.id);
            const unlockData = unlockedAchievements.find((a) => a.achievementId === achievement.id);
            return {
                id: achievement.id,
                title: achievement.title,
                description: achievement.description,
                icon: achievement.icon,
                category: achievement.category,
                rarity: achievement.rarity,
                unlocked: isUnlocked,
                unlockedAt: unlockData?.unlockedAt || null,
                canUnlock: !isUnlocked && achievement.condition(stats)
            };
        });
        // Group by category
        const grouped = {
            games: progress.filter((a) => a.category === 'games'),
            wins: progress.filter((a) => a.category === 'wins'),
            score: progress.filter((a) => a.category === 'score'),
            speed: progress.filter((a) => a.category === 'speed'),
            accuracy: progress.filter((a) => a.category === 'accuracy')
        };
        return {
            total: exports.ACHIEVEMENTS.length,
            unlocked: unlockedIds.length,
            progress: Math.round((unlockedIds.length / exports.ACHIEVEMENTS.length) * 100),
            achievements: progress,
            grouped
        };
    }
    catch (error) {
        console.error('Error getting achievement progress:', error);
        return null;
    }
};
exports.getAchievementProgress = getAchievementProgress;
