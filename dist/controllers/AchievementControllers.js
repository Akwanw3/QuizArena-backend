"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAchievementLeaderboard = exports.getAchievementsByCategory = exports.checkAchievements = exports.getAvailableAchievements = exports.getProgress = exports.getUserAchievements = void 0;
const Achievements_1 = __importDefault(require("../models/Achievements"));
const ErrorHandler_1 = require("../middleware/ErrorHandler");
const achievement_1 = require("../utils/achievement");
/**
 * Get user's unlocked achievements
 * GET /api/achievements
 * Protected route
 */
exports.getUserAchievements = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.userId;
    // Get all unlocked achievements
    const achievements = await Achievements_1.default.find({ userId })
        .sort({ unlockedAt: -1 }); // Newest first
    res.status(200).json({
        success: true,
        data: {
            achievements,
            count: achievements.length,
            total: achievement_1.ACHIEVEMENTS.length,
            progress: Math.round((achievements.length / achievement_1.ACHIEVEMENTS.length) * 100)
        }
    });
});
/**
 * Get achievement progress (all achievements with unlock status)
 * GET /api/achievements/progress
 * Protected route
 */
exports.getProgress = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.userId;
    const progress = await (0, achievement_1.getAchievementProgress)(userId);
    if (!progress) {
        throw new ErrorHandler_1.AppError('Failed to fetch achievement progress', 500);
    }
    res.status(200).json({
        success: true,
        data: progress
    });
});
/**
 * Get all available achievements (definitions)
 * GET /api/achievements/available
 * Public route
 */
exports.getAvailableAchievements = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    // Return achievement definitions
    const achievements = achievement_1.ACHIEVEMENTS.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        icon: a.icon,
        category: a.category,
        rarity: a.rarity
    }));
    res.status(200).json({
        success: true,
        data: {
            achievements,
            total: achievements.length
        }
    });
});
/**
 * Manually check and unlock achievements
 * POST /api/achievements/check
 * Protected route
 */
exports.checkAchievements = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.userId;
    const newAchievements = await (0, achievement_1.checkAndUnlockAchievements)(userId);
    res.status(200).json({
        success: true,
        message: `${newAchievements.length} new achievement(s) unlocked`,
        data: {
            newAchievements
        }
    });
});
/**
 * Get achievements by category
 * GET /api/achievements/category/:category
 * Protected route
 */
exports.getAchievementsByCategory = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    const { category } = req.params;
    const userId = req.user?.userId;
    // Validate category
    const validCategories = ['games', 'wins', 'score', 'speed', 'accuracy'];
    if (!validCategories.includes(category)) {
        throw new ErrorHandler_1.AppError('Invalid category', 400);
    }
    // Get progress
    const progress = await (0, achievement_1.getAchievementProgress)(userId);
    if (!progress) {
        throw new ErrorHandler_1.AppError('Failed to fetch achievements', 500);
    }
    const categoryAchievements = progress.grouped[category];
    res.status(200).json({
        success: true,
        data: {
            category,
            achievements: categoryAchievements
        }
    });
});
/**
 * Get leaderboard for achievements (most achievements unlocked)
 * GET /api/achievements/leaderboard
 * Public route
 */
exports.getAchievementLeaderboard = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    // Aggregate to count achievements per user
    const leaderboard = await Achievements_1.default.aggregate([
        {
            $group: {
                _id: '$userId',
                achievementCount: { $sum: 1 },
                recentAchievement: { $max: '$unlockedAt' }
            }
        },
        {
            $sort: { achievementCount: -1, recentAchievement: -1 }
        },
        {
            $limit: limit
        },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'user'
            }
        },
        {
            $unwind: '$user'
        },
        {
            $project: {
                userId: '$_id',
                username: '$user.username',
                avatar: '$user.avatar',
                achievementCount: 1,
                total: achievement_1.ACHIEVEMENTS.length,
                progress: {
                    $multiply: [
                        { $divide: ['$achievementCount', achievement_1.ACHIEVEMENTS.length] },
                        100
                    ]
                },
                recentAchievement: 1
            }
        }
    ]);
    res.status(200).json({
        success: true,
        data: {
            leaderboard
        }
    });
});
