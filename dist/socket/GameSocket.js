"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeGameSocket = void 0;
const Room_1 = __importDefault(require("../models/Room"));
const Auth_1 = require("../utils/Auth");
/**
 * Initialize Socket.io game handlers
 * @param io - Socket.io server instance
 */
const initializeGameSocket = (io) => {
    // Handle new socket connections
    io.on('connection', (socket) => {
        console.log('🔌 New client connected:', socket.id);
        // Store user info on socket after authentication
        let userId = null;
        let currentRoom = null;
        /**
         * Authenticate socket connection
         * Client must send token to join rooms
         */
        socket.on('auth:authenticate', async (token) => {
            try {
                // Verify JWT token
                const decoded = (0, Auth_1.verifyToken)(token);
                userId = decoded.userId;
                // Store userId on socket
                socket.userId = userId;
                socket.emit('auth:success', {
                    message: 'Authentication successful'
                });
                console.log(`✅ Socket ${socket.id} authenticated as user ${userId}`);
            }
            catch (error) {
                socket.emit('auth:error', {
                    message: 'Authentication failed'
                });
                console.log(`❌ Socket ${socket.id} authentication failed`);
            }
        });
        /**
         * Join a room
         * Client joins Socket.io room to receive game events
         */
        socket.on('room:join', async (roomCode) => {
            try {
                // Check if user is authenticated
                if (!userId) {
                    socket.emit('room:error', {
                        message: 'Please authenticate first'
                    });
                    return;
                }
                // Verify room exists and user is in it
                const room = await Room_1.default.findOne({ roomCode: roomCode.toUpperCase() });
                if (!room) {
                    socket.emit('room:error', {
                        message: 'Room not found'
                    });
                    return;
                }
                // Check if user is a player in this room
                const isPlayer = room.players.some((p) => p.userId === userId);
                if (!isPlayer) {
                    socket.emit('room:error', {
                        message: 'You are not in this room'
                    });
                    return;
                }
                // Join Socket.io room
                socket.join(roomCode.toUpperCase());
                currentRoom = roomCode.toUpperCase();
                // Update player connection status
                const player = room.players.find((p) => p.userId === userId);
                if (player) {
                    player.isConnected = true;
                    await room.save();
                }
                socket.emit('room:joined', {
                    message: 'Joined room successfully',
                    roomCode: roomCode.toUpperCase()
                });
                // Notify others
                socket.to(roomCode.toUpperCase()).emit('room:updated', room);
                console.log(`👥 User ${userId} joined room ${roomCode}`);
            }
            catch (error) {
                console.error('Error joining room:', error);
                socket.emit('room:error', {
                    message: 'Failed to join room'
                });
            }
        });
        /**
         * Leave current room
         */
        socket.on('room:leave', async () => {
            if (currentRoom && userId) {
                try {
                    // Update player connection status
                    const room = await Room_1.default.findOne({ roomCode: currentRoom });
                    if (room) {
                        const player = room.players.find((p) => p.userId === userId);
                        if (player) {
                            player.isConnected = false;
                            await room.save();
                            // Notify others
                            socket.to(currentRoom).emit('room:updated', room);
                        }
                    }
                    socket.leave(currentRoom);
                    console.log(`👋 User ${userId} left room ${currentRoom}`);
                    currentRoom = null;
                }
                catch (error) {
                    console.error('Error leaving room:', error);
                }
            }
        });
        /**
         * Handle disconnection
         */
        socket.on('disconnect', async () => {
            console.log('❌ Client disconnected:', socket.id);
            // Mark player as disconnected in current room
            if (currentRoom && userId) {
                try {
                    const room = await Room_1.default.findOne({ roomCode: currentRoom });
                    if (room) {
                        const player = room.players.find((p) => p.userId === userId);
                        if (player) {
                            player.isConnected = false;
                            await room.save();
                            // Notify others
                            io.to(currentRoom).emit('room:updated', room);
                        }
                    }
                }
                catch (error) {
                    console.error('Error handling disconnect:', error);
                }
            }
        });
    });
};
exports.initializeGameSocket = initializeGameSocket;
