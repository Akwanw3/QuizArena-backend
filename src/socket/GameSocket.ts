import { Server, Socket } from 'socket.io';
import Room from '../models/Room';
import { verifyToken } from '../utils/Auth';

export const initializeGameSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('🔌 New client connected:', socket.id);
    
    let userId: string | null = null;
    let currentRoom: string | null = null;
    
    // Authenticate socket
    socket.on('auth:authenticate', async (token: string) => {
      try {
        const decoded = verifyToken(token);
        userId = decoded.userId;
        
        (socket as any).userId = userId;
        
        // Join user's personal room for notifications
        socket.join(userId);
        
        socket.emit('auth:success', {
          message: 'Authentication successful'
        });
        
        console.log(`✅ Socket ${socket.id} authenticated as user ${userId}`);
      } catch (error) {
        socket.emit('auth:error', {
          message: 'Authentication failed'
        });
        console.log(`❌ Socket ${socket.id} authentication failed`);
      }
    });

    // Join user's personal room (for notifications)
    socket.on('user:join', (userId: string) => {
      socket.join(userId);
      console.log(`👤 User ${userId} joined personal room`);
    });
    
    // Join a game room
    socket.on('room:join', async (roomCode: string) => {
      try {
        if (!userId) {
          socket.emit('room:error', {
            message: 'Please authenticate first'
          });
          return;
        }
        
        const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
        
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
      } catch (error) {
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
          const room = await Room.findOne({ roomCode: currentRoom });
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
        } catch (error) {
          console.error('Error leaving room:', error);
        }
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log('❌ Client disconnected:', socket.id);
      
      if (currentRoom && userId) {
        try {
          const room = await Room.findOne({ roomCode: currentRoom });
          if (room) {
            const player = room.players.find((p) => p.userId === userId);
            if (player) {
              player.isConnected = false;
              await room.save();
              
              io.to(currentRoom).emit('room:updated', room);
            }
          }
        } catch (error) {
          console.error('Error handling disconnect:', error);
        }
      }
    });
  });
};