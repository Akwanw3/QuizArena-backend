// Import Express Router
import express from 'express';

// Import controllers
import {
  register,
  login,
  getProfile,
  updateProfile,
  getStats,
  changePassword
} from '../controllers/AuthController';

// Import authentication middleware
import { authenticate } from '../middleware/Auth';

// Create router instance
const router = express.Router();

// ============= PUBLIC ROUTES (No authentication required) =============

/**
 * POST /api/auth/register
 * Register a new user
 * Body: { username, email, password }
 */
router.post('/register', register);

/**
 * POST /api/auth/login
 * Login user
 * Body: { email, password }
 */
router.post('/login', login);

// ============= PROTECTED ROUTES (Authentication required) =============

/**
 * GET /api/auth/me
 * Get current user profile
 * Headers: { Authorization: "Bearer <token>" }
 */
router.get('/me', authenticate, getProfile);

/**
 * PUT /api/auth/profile
 * Update user profile
 * Headers: { Authorization: "Bearer <token>" }
 * Body: { username?, avatar? }
 */
router.put('/profile', authenticate, updateProfile);

/**
 * GET /api/auth/stats
 * Get user statistics
 * Headers: { Authorization: "Bearer <token>" }
 */
router.get('/stats', authenticate, getStats);

/**
 * PUT /api/auth/password
 * Change password
 * Headers: { Authorization: "Bearer <token>" }
 * Body: { currentPassword, newPassword }
 */
router.put('/password', authenticate, changePassword);

// Export router
export default router;
