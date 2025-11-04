"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeGameSocket = void 0;
const Room_1 = __importDefault(require("../models/Room"));
const Auth_1 = require("../utils/Auth");
const initializeGameSocket = (io) => {
    io.on('connection', (socket) => {
        console.log('🔌 New client connected:', socket.id);
        let userId = null;
        let currentRoom = null;
        // Authenticate socket
        socket.on('auth:authenticate', async (token) => {
            try {
                const decoded = (0, Auth_1.verifyToken)(token);
                userId = decoded.userId;
                socket.userId = userId;
                // Join user's personal room for notifications
                socket.join(userId);
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
        // Join user's personal room (for notifications)
        socket.on('user:join', (userId) => {
            socket.join(userId);
            console.log(`👤 User ${userId} joined personal room`);
        });
        // Join a game room
        socket.on('room:join', async (roomCode) => {
            try {
                if (!userId) {
                    socket.emit('room:error', {
                        message: 'Please authenticate first'
                    });
                    return;
                }
                const room = await Room_1.default.findOne({ roomCode: roomCode.toUpperCase() });
                if (!room) {
                    socket.emit('room:error', {
                        message: 'Room not found'
                    });
                    return;
                }
                const isPlayer = room.players.some((p) => p.userId === userId);
                if (!isPlayer) {
                    socket.emit('room:error', {
                        message: 'You are not in this room'
                    });
                    return;
                }
                // Leave previous room if any
                if (currentRoom) {
                    socket.leave(currentRoom);
                }
                // Join new room
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
        // Leave current room
        socket.on('room:leave', async () => {
            if (currentRoom && userId) {
                try {
                    const room = await Room_1.default.findOne({ roomCode: currentRoom });
                    if (room) {
                        const player = room.players.find((p) => p.userId === userId);
                        if (player) {
                            player.isConnected = false;
                            await room.save();
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
        // Handle disconnection
        socket.on('disconnect', async () => {
            console.log('❌ Client disconnected:', socket.id);
            if (currentRoom && userId) {
                try {
                    const room = await Room_1.default.findOne({ roomCode: currentRoom });
                    if (room) {
                        const player = room.players.find((p) => p.userId === userId);
                        if (player) {
                            player.isConnected = false;
                            await room.save();
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
