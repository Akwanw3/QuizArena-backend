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
router.post('/', authenticate, createRoom);

/**
 * POST /api/rooms/:roomCode/join
 * Join a room
 */
router.post('/:roomCode/join', authenticate, joinRoom);

/**
 * POST /api/rooms/:roomCode/leave
 * Leave a room
 */
router.post('/:roomCode/leave', authenticate, leaveRoom);

/**
 * POST /api/rooms/:roomCode/ready
 * Toggle ready status
 */
router.post('/:roomCode/ready', authenticate, toggleReady);

/**
 * POST /api/rooms/:roomCode/kick/:userId
 * Kick a player (host only)
 */
router.post('/:roomCode/kick/:userId', authenticate, kickPlayer);

/**
 * PUT /api/rooms/:roomCode/settings
 * Update room settings (host only)
 * Body: { category?, difficulty?, numberOfQuestions?, timePerQuestion?, isPublic? }
 */
router.put('/:roomCode/settings', authenticate, updateRoomSettings);

/**
 * DELETE /api/rooms/:roomCode
 * Delete room (host only)
 */
router.delete('/:roomCode', authenticate, deleteRoom);

// Export router
export default router;