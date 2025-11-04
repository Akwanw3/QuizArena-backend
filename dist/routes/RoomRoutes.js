"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Import Express Router
const express_1 = __importDefault(require("express"));
// Import controllers
const RoomControllers_1 = require("../controllers/RoomControllers");
// Import authentication middleware
const Auth_1 = require("../middleware/Auth");
const CheckVerification_1 = require("../middleware/CheckVerification");
// Create router instance
const router = express_1.default.Router();
// ============= PUBLIC ROUTES =============
/**
 * GET /api/rooms
 * Get all public rooms (with optional filters)
 * Query params: ?status=waiting&difficulty=medium
 */
router.get('/', Auth_1.optionalAuth, RoomControllers_1.getPublicRooms);
/**
 * GET /api/rooms/:roomCode
 * Get specific room by code
 */
router.get('/:roomCode', RoomControllers_1.getRoomByCode);
// ============= PROTECTED ROUTES (Authentication required) =============
/**
 * POST /api/rooms
 * Create a new room
 * Body: { category, difficulty, numberOfQuestions, timePerQuestion, isPublic }
 */
router.post('/', Auth_1.authenticate, CheckVerification_1.requireVerification, RoomControllers_1.createRoom);
/**
 * POST /api/rooms/:roomCode/join
 * Join a room
 */
router.post('/:roomCode/join', Auth_1.authenticate, CheckVerification_1.requireVerification, RoomControllers_1.joinRoom);
/**
 * POST /api/rooms/:roomCode/leave
 * Leave a room
 */
router.post('/:roomCode/leave', Auth_1.authenticate, CheckVerification_1.requireVerification, RoomControllers_1.leaveRoom);
/**
 * POST /api/rooms/:roomCode/ready
 * Toggle ready status
 */
router.post('/:roomCode/ready', Auth_1.authenticate, CheckVerification_1.requireVerification, RoomControllers_1.toggleReady);
/**
 * POST /api/rooms/:roomCode/kick/:userId
 * Kick a player (host only)
 */
router.post('/:roomCode/kick/:userId', Auth_1.authenticate, CheckVerification_1.requireVerification, RoomControllers_1.kickPlayer);
/**
 * PUT /api/rooms/:roomCode/settings
 * Update room settings (host only)
 * Body: { category?, difficulty?, numberOfQuestions?, timePerQuestion?, isPublic? }
 */
router.put('/:roomCode/settings', Auth_1.authenticate, CheckVerification_1.requireVerification, RoomControllers_1.updateRoomSettings);
/**
 * DELETE /api/rooms/:roomCode
 * Delete room (host only)
 */
router.delete('/:roomCode', Auth_1.authenticate, CheckVerification_1.requireVerification, RoomControllers_1.deleteRoom);
// Export router
exports.default = router;
