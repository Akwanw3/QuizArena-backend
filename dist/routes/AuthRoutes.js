"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Import Express Router
const express_1 = __importDefault(require("express"));
// Import controllers
const AuthController_1 = require("../controllers/AuthController");
// Import authentication middleware
const Auth_1 = require("../middleware/Auth");
// Create router instance
const router = express_1.default.Router();
// ============= PUBLIC ROUTES (No authentication required) =============
/**
 * POST /api/auth/register
 * Register a new user
 * Body: { username, email, password }
 */
router.post('/register', AuthController_1.register);
/**
 * POST /api/auth/login
 * Login user
 * Body: { email, password }
 */
router.post('/login', AuthController_1.login);
// ============= PROTECTED ROUTES (Authentication required) =============
/**
 * GET /api/auth/me
 * Get current user profile
 * Headers: { Authorization: "Bearer <token>" }
 */
router.get('/me', Auth_1.authenticate, AuthController_1.getProfile);
/**
 * PUT /api/auth/profile
 * Update user profile
 * Headers: { Authorization: "Bearer <token>" }
 * Body: { username?, avatar? }
 */
router.put('/profile', Auth_1.authenticate, AuthController_1.updateProfile);
/**
 * GET /api/auth/stats
 * Get user statistics
 * Headers: { Authorization: "Bearer <token>" }
 */
router.get('/stats', Auth_1.authenticate, AuthController_1.getStats);
/**
 * PUT /api/auth/password
 * Change password
 * Headers: { Authorization: "Bearer <token>" }
 * Body: { currentPassword, newPassword }
 */
router.put('/password', Auth_1.authenticate, AuthController_1.changePassword);
// Export router
exports.default = router;
