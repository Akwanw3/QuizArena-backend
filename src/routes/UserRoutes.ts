// Import Express Router
import express from 'express';

// Import controllers
import {
  searchUsers,
  getUserProfile,
  getTopPlayers,
  compareUsers,
  getMyRank
} from '../controllers/UserControllers';

// Import authentication middleware
import { authenticate } from '../middleware/Auth';

// Create router instance
const router = express.Router();

// ============= PUBLIC ROUTES =============

/**
 * GET /api/users/search
 * Search users by username
 * Query: ?q=username
 */
router.get('/search', searchUsers);

/**
 * GET /api/users/top
 * Get top players by metric
 * Query: ?metric=totalPoints&limit=10
 * Metrics: totalPoints, wins, gamesPlayed, highestScore, longestStreak, perfectGames
 */
router.get('/top', getTopPlayers);

/**
 * GET /api/users/compare
 * Compare two users head-to-head
 * Query: ?user1=id1&user2=id2
 */
router.get('/compare', compareUsers);

/**
 * GET /api/users/:userId/profile
 * Get public user profile
 */
router.get('/:userId/profile', getUserProfile);

// ============= PROTECTED ROUTES =============

/**
 * GET /api/users/rank
 * Get current user's global rank
 */
router.get('/rank', authenticate, getMyRank);

// Export router
export default router;