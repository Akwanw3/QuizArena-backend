// Import Express Router
import express from 'express';

// Import controllers
import {
  getRecentActivities,
  getUserActivities,
  getMyActivities,
  getActivitiesByType
} from '../controllers/ActivityControllers';

// Import authentication middleware
import { authenticate } from '../middleware/Auth';

// Create router instance
const router = express.Router();

// ============= PUBLIC ROUTES =============

/**
 * GET /api/activities
 * Get recent global activities
 * Query: ?limit=50
 */
router.get('/', getRecentActivities);

/**
 * GET /api/activities/user/:userId
 * Get specific user's activities
 * Query: ?limit=20
 */
router.get('/user/:userId', getUserActivities);

/**
 * GET /api/activities/type/:type
 * Get activities by type
 * Types: game_won, game_played, achievement_unlocked, high_score
 * Query: ?limit=50
 */
router.get('/type/:type', getActivitiesByType);

// ============= PROTECTED ROUTES =============

/**
 * GET /api/activities/me
 * Get current user's activities
 * Query: ?limit=20
 */
router.get('/me', authenticate, getMyActivities);

// Export router
export default router;