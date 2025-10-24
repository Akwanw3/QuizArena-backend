// Import required modules
import { Request, Response } from 'express';
import Activity from '../models/Activity';
import { asyncHandler, AppError } from '../middleware/ErrorHandler';

/**
 * Get recent global activities
 * GET /api/activities
 * Public route
 */
export const getRecentActivities = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const limit = parseInt(req.query.limit as string) || 50;
    
    const activities = await Activity.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    res.status(200).json({
      success: true,
      data: {
        activities,
        count: activities.length
      }
    });
  }
);

/**
 * Get user's activities
 * GET /api/activities/user/:userId
 * Public route
 */
export const getUserActivities = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const activities = await Activity.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    res.status(200).json({
      success: true,
      data: {
        activities,
        count: activities.length
      }
    });
  }
);

/**
 * Get current user's activities
 * GET /api/activities/me
 * Protected route
 */
export const getMyActivities = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId!;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const activities = await Activity.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    res.status(200).json({
      success: true,
      data: {
        activities,
        count: activities.length
      }
    });
  }
);

/**
 * Get activities by type
 * GET /api/activities/type/:type
 * Public route
 */
export const getActivitiesByType = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { type } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    // Validate type
    const validTypes = ['game_won', 'game_played', 'achievement_unlocked', 'high_score'];
    if (!validTypes.includes(type)) {
      throw new AppError('Invalid activity type', 400);
    }
    
    const activities = await Activity.find({ type })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    res.status(200).json({
      success: true,
      data: {
        type,
        activities,
        count: activities.length
      }
    });
  }
);