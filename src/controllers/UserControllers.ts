// Import required modules
import { Request, Response } from 'express';
import User from '../models/User';
import Game from '../models/Game';
import Achievement from '../models/Achievements';
import { asyncHandler, AppError } from '../middleware/ErrorHandler';

/**
 * Search users by username
 * GET /api/users/search?q=username
 * Public route
 */
export const searchUsers = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      throw new AppError('Search query is required', 400);
    }
    
    // Search for users whose username contains the query (case-insensitive)
    const users = await User.find({
      username: { $regex: q, $options: 'i' }
    })
      .select('username avatar stats')
      .limit(20);
    
    res.status(200).json({
      success: true,
      data: {
        users,
        count: users.length
      }
    });
  }
);

/**
 * Get public user profile
 * GET /api/users/:userId/profile
 * Public route
 */
export const getUserProfile = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    
    // Get user
    const user = await User.findById(userId);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Get recent games
    const recentGames = await Game.getUserHistory(userId, 5);
    
    // Get achievements
    const achievements = await Achievement.find({ userId })
      .sort({ unlockedAt: -1 })
      .limit(10);
    
    // Calculate enhanced stats
    const winRate = user.stats.gamesPlayed > 0
      ? (user.stats.wins / user.stats.gamesPlayed) * 100
      : 0;
    
    const avgPointsPerGame = user.stats.gamesPlayed > 0
      ? user.stats.totalPoints / user.stats.gamesPlayed
      : 0;
    
    // Determine rank based on total points
    let rank = 'Beginner';
    if (user.stats.totalPoints >= 50000) rank = 'Master';
    else if (user.stats.totalPoints >= 20000) rank = 'Expert';
    else if (user.stats.totalPoints >= 5000) rank = 'Intermediate';
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          isVerrified: user.isVerified,
          avatar: user.avatar,
          createdAt: user.createdAt
        },
        stats: {
          gamesPlayed: user.stats.gamesPlayed,
          wins: user.stats.wins,
          losses: user.stats.gamesPlayed - user.stats.wins,
          totalPoints: user.stats.totalPoints,
          winRate: winRate,
          avgPointsPerGame: Math.round(avgPointsPerGame * 100) / 100,
          highestScore: (user as any).stats.highestScore || 0,
          longestStreak: (user as any).stats.longestStreak || 0,
          perfectGames: (user as any).stats.perfectGames || 0,
          rank
        },
        recentGames,
        achievements: {
          recent: achievements,
          total: achievements.length
        }
      }
    });
  }
);

/**
 * Get top players by various metrics
 * GET /api/users/top?metric=totalPoints&limit=10
 * Public route
 */
export const getTopPlayers = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const metric = (req.query.metric as string) || 'totalPoints';
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Valid metrics
    const validMetrics = [
      'totalPoints',
      'wins',
      'gamesPlayed',
      'highestScore',
      'longestStreak',
      'perfectGames'
    ];
    
    if (!validMetrics.includes(metric)) {
      throw new AppError('Invalid metric', 400);
    }
    
    // Build sort object
    const sortField = `stats.${metric}`;
    const sortObj: any = {};
    sortObj[sortField] = -1; // Descending order
    
    // Get top players
    const players = await User.find()
      .select('username avatar stats')
      .sort(sortObj)
      .limit(limit);
    
    res.status(200).json({
      success: true,
      data: {
        metric,
        players
      }
    });
  }
);

/**
 * Compare two users
 * GET /api/users/compare?user1=id1&user2=id2
 * Public route
 */
export const compareUsers = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { user1, user2 } = req.query;
    
    if (!user1 || !user2) {
      throw new AppError('Both user1 and user2 IDs are required', 400);
    }
    
    // Get both users
    const [userOne, userTwo] = await Promise.all([
      User.findById(user1),
      User.findById(user2)
    ]);
    
    if (!userOne || !userTwo) {
      throw new AppError('One or both users not found', 404);
    }
    
    // Get head-to-head games (games where both played)
    const headToHead = await Game.aggregate([
      {
        $match: {
          'players.userId': { $all: [user1, user2] }
        }
      },
      {
        $project: {
          winner: 1,
          players: {
            $filter: {
              input: '$players',
              cond: {
                $in: ['$$this.userId', [user1, user2]]
              }
            }
          }
        }
      }
    ]);
    
    // Calculate head-to-head stats
    const user1Wins = headToHead.filter((g) => g.winner === user1).length;
    const user2Wins = headToHead.filter((g) => g.winner === user2).length;
    
    res.status(200).json({
      success: true,
      data: {
        user1: {
          id: userOne._id,
          username: userOne.username,
          avatar: userOne.avatar,
          stats: userOne.stats
        },
        user2: {
          id: userTwo._id,
          username: userTwo.username,
          avatar: userTwo.avatar,
          stats: userTwo.stats
        },
        headToHead: {
          totalGames: headToHead.length,
          user1Wins,
          user2Wins,
          games: headToHead
        }
      }
    });
  }
);

/**
 * Get user's rank position globally
 * GET /api/users/rank
 * Protected route
 */
export const getMyRank = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId!;
    
    // Get current user
    const user = await User.findById(userId);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Count users with higher total points
    const rank = await User.countDocuments({
      'stats.totalPoints': { $gt: user.stats.totalPoints }
    }) + 1; // +1 because rank starts at 1
    
    // Get total users
    const totalUsers = await User.countDocuments();
    
    // Calculate percentile
    const percentile = ((totalUsers - rank) / totalUsers) * 100;
    
    res.status(200).json({
      success: true,
      data: {
        rank,
        totalUsers,
        percentile: Math.round(percentile * 100) / 100,
        totalPoints: user.stats.totalPoints
      }
    });
  }
);