"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Import Express Router
const express_1 = __importDefault(require("express"));
// Import controllers
const GameControllers_1 = require("../controllers/GameControllers");
// Import authentication middleware
const Auth_1 = require("../middleware/Auth");
const CheckVerification_1 = require("../middleware/CheckVerification");
// Create router instance
const router = express_1.default.Router();
// ============= PROTECTED ROUTES =============
/**
 * POST /api/games/:roomCode/start
 * Start a game (host only)
 */
router.post('/:roomCode/start', Auth_1.authenticate, CheckVerification_1.requireVerification, GameControllers_1.startGame);
/**
 * POST /api/games/:roomCode/answer
 * Submit an answer during gameplay
 * Body: { answer: "selected answer text" }
 */
router.post('/:roomCode/answer', Auth_1.authenticate, CheckVerification_1.requireVerification, GameControllers_1.submitAnswer);
/**
 * GET /api/games/history
 * Get current user's game history
 * Query: ?limit=10
 */
router.get('/history', Auth_1.authenticate, CheckVerification_1.requireVerification, GameControllers_1.getGameHistory);
// ============= PUBLIC ROUTES =============
/**
 * GET /api/games/leaderboard
 * Get global leaderboard
 * Query: ?limit=100
 */
router.get('/leaderboard', GameControllers_1.getLeaderboard);
/**
 * GET /api/games/:gameId/results
 * Get results of a completed game
 */
router.get('/:gameId/results', GameControllers_1.getGameResults);
// Export router
exports.default = router;
