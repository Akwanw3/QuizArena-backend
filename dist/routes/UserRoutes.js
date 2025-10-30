"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Import Express Router
const express_1 = __importDefault(require("express"));
// Import controllers
const UserControllers_1 = require("../controllers/UserControllers");
// Import authentication middleware
const Auth_1 = require("../middleware/Auth");
// Create router instance
const router = express_1.default.Router();
// ============= PUBLIC ROUTES =============
/**
 * GET /api/users/search
 * Search users by username
 * Query: ?q=username
 */
router.get('/search', UserControllers_1.searchUsers);
/**
 * GET /api/users/top
 * Get top players by metric
 * Query: ?metric=totalPoints&limit=10
 * Metrics: totalPoints, wins, gamesPlayed, highestScore, longestStreak, perfectGames
 */
router.get('/top', UserControllers_1.getTopPlayers);
/**
 * GET /api/users/compare
 * Compare two users head-to-head
 * Query: ?user1=id1&user2=id2
 */
router.get('/compare', UserControllers_1.compareUsers);
/**
 * GET /api/users/:userId/profile
 * Get public user profile
 */
router.get('/:userId/profile', UserControllers_1.getUserProfile);
// ============= PROTECTED ROUTES =============
/**
 * GET /api/users/rank
 * Get current user's global rank
 */
router.get('/rank', Auth_1.authenticate, UserControllers_1.getMyRank);
// Export router
exports.default = router;
