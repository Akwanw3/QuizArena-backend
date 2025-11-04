// Import Express Router
import express from 'express';

// Import controllers
import {
  startGame,
  submitAnswer,
  getGameResults,
  getGameHistory,
  getLeaderboard
} from '../controllers/GameControllers';

// Import authentication middleware
import { authenticate } from '../middleware/Auth';
import { requireVerification } from '../middleware/CheckVerification';
// Create router instance
const router = express.Router();

// ============= PROTECTED ROUTES =============

/**
 * POST /api/games/:roomCode/start
 * Start a game (host only)
 */
router.post('/:roomCode/start', authenticate, requireVerification, startGame);

/**
 * POST /api/games/:roomCode/answer
 * Submit an answer during gameplay
 * Body: { answer: "selected answer text" }
 */
router.post('/:roomCode/answer', authenticate, requireVerification, submitAnswer);

/**
 * GET /api/games/history
 * Get current user's game history
 * Query: ?limit=10
 */
router.get('/history', authenticate, requireVerification, getGameHistory);

// ============= PUBLIC ROUTES =============

/**
 * GET /api/games/leaderboard
 * Get global leaderboard
 * Query: ?limit=100
 */
router.get('/leaderboard',  getLeaderboard);

/**
 * GET /api/games/:gameId/results
 * Get results of a completed game
 */
router.get('/:gameId/results', getGameResults);

// Export router
export default router;