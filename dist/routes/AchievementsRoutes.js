"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Import Express Router
const express_1 = __importDefault(require("express"));
// Import controllers
const AchievementControllers_1 = require("../controllers/AchievementControllers");
// Import authentication middleware
const Auth_1 = require("../middleware/Auth");
// Create router instance
const router = express_1.default.Router();
// ============= PUBLIC ROUTES =============
/**
 * GET /api/achievements/available
 * Get all available achievement definitions
 */
router.get('/available', AchievementControllers_1.getAvailableAchievements);
/**
 * GET /api/achievements/leaderboard
 * Get achievement leaderboard (most achievements unlocked)
 * Query: ?limit=100
 */
router.get('/leaderboard', AchievementControllers_1.getAchievementLeaderboard);
// ============= PROTECTED ROUTES =============
/**
 * GET /api/achievements
 * Get current user's unlocked achievements
 */
router.get('/', Auth_1.authenticate, AchievementControllers_1.getUserAchievements);
/**
 * GET /api/achievements/progress
 * Get achievement progress (all achievements with status)
 */
router.get('/progress', Auth_1.authenticate, AchievementControllers_1.getProgress);
/**
 * POST /api/achievements/check
 * Manually check and unlock achievements
 */
router.post('/check', Auth_1.authenticate, AchievementControllers_1.checkAchievements);
/**
 * GET /api/achievements/category/:category
 * Get achievements by category
 * Categories: games, wins, score, speed, accuracy
 */
router.get('/category/:category', Auth_1.authenticate, AchievementControllers_1.getAchievementsByCategory);
// Export router
exports.default = router;
