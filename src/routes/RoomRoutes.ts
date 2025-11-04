// Import Express Router
import express from 'express';

// Import controllers
import {
  createRoom,
  getPublicRooms,
  getRoomByCode,
  joinRoom,
  leaveRoom,
  toggleReady,
  kickPlayer,
  updateRoomSettings,
  deleteRoom
} from '../controllers/RoomControllers';

// Import authentication middleware
import { authenticate, optionalAuth } from '../middleware/Auth';
import { requireVerification } from '../middleware/CheckVerification';
// Create router instance
const router = express.Router();

// ============= PUBLIC ROUTES =============

/**
 * GET /api/rooms
 * Get all public rooms (with optional filters)
 * Query params: ?status=waiting&difficulty=medium
 */
router.get('/', optionalAuth, getPublicRooms);

/**
 * GET /api/rooms/:roomCode
 * Get specific room by code
 */
router.get('/:roomCode', getRoomByCode);

// ============= PROTECTED ROUTES (Authentication required) =============

/**
 * POST /api/rooms
 * Create a new room
 * Body: { category, difficulty, numberOfQuestions, timePerQuestion, isPublic }
 */
router.post('/', authenticate, requireVerification, createRoom);

/**
 * POST /api/rooms/:roomCode/join
 * Join a room
 */
router.post('/:roomCode/join', authenticate, requireVerification, joinRoom);

/**
 * POST /api/rooms/:roomCode/leave
 * Leave a room
 */
router.post('/:roomCode/leave', authenticate, requireVerification, leaveRoom);

/**
 * POST /api/rooms/:roomCode/ready
 * Toggle ready status
 */
router.post('/:roomCode/ready', authenticate, requireVerification, toggleReady);

/**
 * POST /api/rooms/:roomCode/kick/:userId
 * Kick a player (host only)
 */
router.post('/:roomCode/kick/:userId', authenticate, requireVerification, kickPlayer);

/**
 * PUT /api/rooms/:roomCode/settings
 * Update room settings (host only)
 * Body: { category?, difficulty?, numberOfQuestions?, timePerQuestion?, isPublic? }
 */
router.put('/:roomCode/settings', authenticate, requireVerification, updateRoomSettings);

/**
 * DELETE /api/rooms/:roomCode
 * Delete room (host only)
 */
router.delete('/:roomCode', authenticate,requireVerification, deleteRoom);

// Export router
export default router;