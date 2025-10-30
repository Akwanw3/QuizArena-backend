"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Import Express Router
const express_1 = __importDefault(require("express"));
// Import controllers
const ActivityControllers_1 = require("../controllers/ActivityControllers");
// Import authentication middleware
const Auth_1 = require("../middleware/Auth");
// Create router instance
const router = express_1.default.Router();
// ============= PUBLIC ROUTES =============
/**
 * GET /api/activities
 * Get recent global activities
 * Query: ?limit=50
 */
router.get('/', ActivityControllers_1.getRecentActivities);
/**
 * GET /api/activities/user/:userId
 * Get specific user's activities
 * Query: ?limit=20
 */
router.get('/user/:userId', ActivityControllers_1.getUserActivities);
/**
 * GET /api/activities/type/:type
 * Get activities by type
 * Types: game_won, game_played, achievement_unlocked, high_score
 * Query: ?limit=50
 */
router.get('/type/:type', ActivityControllers_1.getActivitiesByType);
// ============= PROTECTED ROUTES =============
/**
 * GET /api/activities/me
 * Get current user's activities
 * Query: ?limit=20
 */
router.get('/me', Auth_1.authenticate, ActivityControllers_1.getMyActivities);
// Export router
exports.default = router;
