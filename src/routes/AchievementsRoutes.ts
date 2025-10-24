// Import Express Router
import express from 'express';

// Import controllers
import {
  getUserAchievements,
  getProgress,
  getAvailableAchievements,
  checkAchievements,
  getAchievementsByCategory,
  getAchievementLeaderboard
} from '../controllers/AchievementControllers';

// Import authentication middleware
import { authenticate } from '../middleware/Auth';

// Create router instance
const router = express.Router();

// ============= PUBLIC ROUTES =============

/**
 * GET /api/achievements/available
 * Get all available achievement definitions
 */
router.get('/available', getAvailableAchievements);

/**
 * GET /api/achievements/leaderboard
 * Get achievement leaderboard (most achievements unlocked)
 * Query: ?limit=100
 */
router.get('/leaderboard', getAchievementLeaderboard);

// ============= PROTECTED ROUTES =============

/**
 * GET /api/achievements
 * Get current user's unlocked achievements
 */
router.get('/', authenticate, getUserAchievements);

/**
 * GET /api/achievements/progress
 * Get achievement progress (all achievements with status)
 */
router.get('/progress', authenticate, getProgress);

/**
 * POST /api/achievements/check
 * Manually check and unlock achievements
 */
router.post('/check', authenticate, checkAchievements);

/**
 * GET /api/achievements/category/:category
 * Get achievements by category
 * Categories: games, wins, score, speed, accuracy
 */
router.get('/category/:category', authenticate, getAchievementsByCategory);

// Export router
export default router;