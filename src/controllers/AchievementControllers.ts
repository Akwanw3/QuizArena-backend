// Import required modules
import { Request, Response } from 'express';
import Achievement from '../models/Achievements';
import { asyncHandler, AppError } from '../middleware/ErrorHandler';
import {
  ACHIEVEMENTS,
  checkAndUnlockAchievements,
  getAchievementProgress
} from '../utils/achievement';

/**
 * Get user's unlocked achievements
 * GET /api/achievements
 * Protected route
 */
export const getUserAchievements = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId!;
    
    // Get all unlocked achievements
    const achievements = await Achievement.find({ userId })
      .sort({ unlockedAt: -1 }); // Newest first
    
    res.status(200).json({
      success: true,
      data: {
        achievements,
        count: achievements.length,
        total: ACHIEVEMENTS.length,
        progress: Math.round((achievements.length / ACHIEVEMENTS.length) * 100)
      }
    });
  }
);

/**
 * Get achievement progress (all achievements with unlock status)
 * GET /api/achievements/progress
 * Protected route
 */
export const getProgress = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId!;
    
    const progress = await getAchievementProgress(userId);
    
    if (!progress) {
      throw new AppError('Failed to fetch achievement progress', 500);
    }
    
    res.status(200).json({
      success: true,
      data: progress
    });
  }
);

/**
 * Get all available achievements (definitions)
 * GET /api/achievements/available
 * Public route
 */
export const getAvailableAchievements = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Return achievement definitions
    const achievements = ACHIEVEMENTS.map((a) => ({
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
  }
);

/**
 * Manually check and unlock achievements
 * POST /api/achievements/check
 * Protected route
 */
export const checkAchievements = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId!;
    
    const newAchievements = await checkAndUnlockAchievements(userId);
    
    res.status(200).json({
      success: true,
      message: `${newAchievements.length} new achievement(s) unlocked`,
      data: {
        newAchievements
      }
    });
  }
);

/**
 * Get achievements by category
 * GET /api/achievements/category/:category
 * Protected route
 */
export const getAchievementsByCategory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { category } = req.params;
    const userId = req.user?.userId!;
    
    // Validate category
    const validCategories = ['games', 'wins', 'score', 'speed', 'accuracy'];
    if (!validCategories.includes(category)) {
      throw new AppError('Invalid category', 400);
    }
    
    // Get progress
    const progress = await getAchievementProgress(userId);
    
    if (!progress) {
      throw new AppError('Failed to fetch achievements', 500);
    }
    
    const categoryAchievements = progress.grouped[category as keyof typeof progress.grouped];
    
    res.status(200).json({
      success: true,
      data: {
        category,
        achievements: categoryAchievements
      }
    });
  }
);

/**
 * Get leaderboard for achievements (most achievements unlocked)
 * GET /api/achievements/leaderboard
 * Public route
 */
export const getAchievementLeaderboard = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const limit = parseInt(req.query.limit as string) || 100;
    
    // Aggregate to count achievements per user
    const leaderboard = await Achievement.aggregate([
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
          total: ACHIEVEMENTS.length,
          progress: {
            $multiply: [
              { $divide: ['$achievementCount', ACHIEVEMENTS.length] },
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
  }
);