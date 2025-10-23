// Import required modules
import { Request, Response } from 'express';
import Room from '../models/Room';
import User from '../models/User';
import { asyncHandler, AppError } from '../middleware/ErrorHandler';
import { io } from '../server';

/**
 * Create a new game room
 * POST /api/rooms
 * Protected route
 */
export const createRoom = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Step 1: Extract room settings from request
    const { category, difficulty, numberOfQuestions, timePerQuestion, isPublic } = req.body;
    
    // Step 2: Validate settings
    if (!category || !difficulty || !numberOfQuestions || !timePerQuestion) {
      throw new AppError('Please provide all room settings', 400);
    }
    
    // Validate ranges
    if (numberOfQuestions < 5 || numberOfQuestions > 20) {
      throw new AppError('Number of questions must be between 5 and 20', 400);
    }
    
    if (timePerQuestion < 5 || timePerQuestion > 60) {
      throw new AppError('Time per question must be between 5 and 60 seconds', 400);
    }
    
    // Step 3: Generate unique room code
    const roomCode = await Room.generateRoomCode();
    
    // Step 4: Get user info
    const user = await User.findById(req.user?.userId);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Step 5: Create room
    const room = await Room.create({
      roomCode,
      hostId: req.user?.userId,
      players: [
        {
          userId: req.user?.userId,
          username: user.username,
          avatar: user.avatar,
          score: 0,
          answers: [],
          isReady: false,
          isConnected: true
        }
      ],
      settings: {
        category,
        difficulty,
        numberOfQuestions,
        timePerQuestion
      },
      status: 'waiting',
      currentQuestion: 0,
      isPublic: isPublic !== undefined ? isPublic : true
    });
    
    // Step 6: Send response
    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: {
        room
      }
    });
  }
);

/**
 * Get all public rooms
 * GET /api/rooms
 * Public route (with optional auth)
 */
export const getPublicRooms = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Get query parameters for filtering
    const { status, difficulty } = req.query;
    
    // Build filter object
    const filter: any = {
      isPublic: true
    };
    
    // Add status filter if provided
    if (status && (status === 'waiting' || status === 'playing')) {
      filter.status = status;
    }
    
    // Add difficulty filter if provided
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty as string)) {
      filter['settings.difficulty'] = difficulty;
    }
    
    // Find rooms with filters
    const rooms = await Room.find(filter)
      .sort({ createdAt: -1 }) // Newest first
      .limit(50); // Limit to 50 rooms
    
    res.status(200).json({
      success: true,
      data: {
        rooms,
        count: rooms.length
      }
    });
  }
);

/**
 * Get room by code
 * GET /api/rooms/:roomCode
 * Public route
 */
export const getRoomByCode = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { roomCode } = req.params;
    
    // Find room by code
    const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
    
    if (!room) {
      throw new AppError('Room not found', 404);
    }
    
    res.status(200).json({
      success: true,
      data: {
        room
      }
    });
  }
);

/**
 * Join a room
 * POST /api/rooms/:roomCode/join
 * Protected route
 */
export const joinRoom = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { roomCode } = req.params;
    
    // Step 1: Find room
    const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
    
    if (!room) {
      throw new AppError('Room not found', 404);
    }
    
    // Step 2: Check if room is full
    if (room.isFull()) {
      throw new AppError('Room is full (maximum 10 players)', 400);
    }
    
    // Step 3: Check if game already started
    if (room.status !== 'waiting') {
      throw new AppError('Cannot join - game already started', 400);
    }
    
    // Step 4: Check if user already in room
    const existingPlayer = room.getPlayer(req.user?.userId!);
    
    if (existingPlayer) {
      throw new AppError('You are already in this room', 400);
    }
    
    // Step 5: Get user info
    const user = await User.findById(req.user?.userId);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Step 6: Add player to room
    room.players.push({
      userId: req.user?.userId!,
      username: user.username,
      avatar: user.avatar,
      score: 0,
      answers: [],
      isReady: false,
      isConnected: true
    });
    
    await room.save();
    
    // Step 7: Emit Socket.io event to notify other players
    io.to(roomCode).emit('room:updated', room);
    
    res.status(200).json({
      success: true,
      message: 'Joined room successfully',
      data: {
        room
      }
    });
  }
);

/**
 * Leave a room
 * POST /api/rooms/:roomCode/leave
 * Protected route
 */
export const leaveRoom = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { roomCode } = req.params;
    
    // Step 1: Find room
    const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
    
    if (!room) {
      throw new AppError('Room not found', 404);
    }
    
    // Step 2: Check if user is in room
    const playerIndex = room.players.findIndex(
      (p) => p.userId === req.user?.userId
    );
    
    if (playerIndex === -1) {
      throw new AppError('You are not in this room', 400);
    }
    
    // Step 3: Remove player from room
    room.players.splice(playerIndex, 1);
    
    // Step 4: If room is empty or host left, delete room
    if (room.players.length === 0 || room.hostId === req.user?.userId) {
      await Room.findByIdAndDelete(room._id);
      
      // Emit room deleted event
      io.to(roomCode).emit('room:deleted', {
        message: 'Room has been closed'
      });
      
      res.status(200).json({
        success: true,
        message: 'Room closed - host left'
      });
      return;
    }
    
    // Step 5: If host left but room not empty, assign new host
    if (room.hostId === req.user?.userId) {
      room.hostId = room.players[0].userId;
    }
    
    await room.save();
    
    // Step 6: Emit update to other players
    io.to(roomCode).emit('room:updated', room);
    
    res.status(200).json({
      success: true,
      message: 'Left room successfully'
    });
  }
);

/**
 * Toggle player ready status
 * POST /api/rooms/:roomCode/ready
 * Protected route
 */
export const toggleReady = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { roomCode } = req.params;
    
    // Find room
    const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
    
    if (!room) {
      throw new AppError('Room not found', 404);
    }
    
    // Find player
    
    const player = room.getPlayer(req.user?.userId!);
    
    if (!player) {
      throw new AppError('You are not in this room', 400);
    }
    
    // Toggle ready status
    player.isReady = !player.isReady;
    
    await room.save();
    
    // Emit update
    io.to(roomCode).emit('room:updated', room);
    
    res.status(200).json({
      success: true,
      message: `Ready status: ${player.isReady ? 'Ready' : 'Not Ready'}`,
      data: {
        isReady: player.isReady
      }
    });
  }
);

/**
 * Kick a player from room (host only)
 * POST /api/rooms/:roomCode/kick/:userId
 * Protected route
 */
export const kickPlayer = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { roomCode, userId } = req.params;
    
    // Find room
    const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
    
    if (!room) {
      throw new AppError('Room not found', 404);
    }
    
    // Check if requester is host
    if (!room.isHost(req.user?.userId!)) {
      throw new AppError('Only host can kick players', 403);
    }
    
    // Check if trying to kick themselves
    if (userId === req.user?.userId) {
      throw new AppError('Cannot kick yourself', 400);
    }
    
    // Find player to kick
    const playerIndex = room.players.findIndex((p) => p.userId === userId);
    
    if (playerIndex === -1) {
      throw new AppError('Player not found in room', 404);
    }
    
    // Remove player
    const kickedPlayer = room.players[playerIndex];
    room.players.splice(playerIndex, 1);
    
    await room.save();
    
    // Emit events
    io.to(roomCode).emit('room:updated', room);
    io.to(userId).emit('room:kicked', {
      message: 'You have been kicked from the room'
    });
    
    res.status(200).json({
      success: true,
      message: `${kickedPlayer.username} has been kicked`
    });
  }
);

/**
 * Update room settings (host only)
 * PUT /api/rooms/:roomCode/settings
 * Protected route
 */
export const updateRoomSettings = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { roomCode } = req.params;
    const { category, difficulty, numberOfQuestions, timePerQuestion, isPublic } = req.body;
    
    // Find room
    const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
    
    if (!room) {
      throw new AppError('Room not found', 404);
    }
    
    // Check if requester is host
    if (!room.isHost(req.user?.userId!)) {
      throw new AppError('Only host can update settings', 403);
    }
    
    // Check if game already started
    if (room.status !== 'waiting') {
      throw new AppError('Cannot update settings - game already started', 400);
    }
    
    // Update settings
    if (category) room.settings.category = category;
    if (difficulty) room.settings.difficulty = difficulty;
    if (numberOfQuestions) {
      if (numberOfQuestions < 5 || numberOfQuestions > 20) {
        throw new AppError('Number of questions must be between 5 and 20', 400);
      }
      room.settings.numberOfQuestions = numberOfQuestions;
    }
    if (timePerQuestion) {
      if (timePerQuestion < 5 || timePerQuestion > 60) {
        throw new AppError('Time per question must be between 5 and 60 seconds', 400);
      }
      room.settings.timePerQuestion = timePerQuestion;
    }
    if (isPublic !== undefined) room.isPublic = isPublic;
    
    await room.save();
    
    // Emit update
    io.to(roomCode).emit('room:updated', room);
    
    res.status(200).json({
      success: true,
      message: 'Room settings updated',
      data: {
        room
      }
    });
  }
);

/**
 * Delete a room (host only)
 * DELETE /api/rooms/:roomCode
 * Protected route
 */
export const deleteRoom = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { roomCode } = req.params;
    
    // Find room
    const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
    
    if (!room) {
      throw new AppError('Room not found', 404);
    }
    
    // Check if requester is host
    if (!room.isHost(req.user?.userId!)) {
      throw new AppError('Only host can delete room', 403);
    }
    
    // Delete room
    await Room.findByIdAndDelete(room._id);
    
    // Emit room deleted event
    io.to(roomCode).emit('room:deleted', {
      message: 'Room has been closed by host'
    });
    
    res.status(200).json({
      success: true,
      message: 'Room deleted successfully'
    });
  }
);