// Import mongoose and our types
import mongoose, { Schema, Document, Model } from 'mongoose';
import { IRoom, IPlayer, IAnswer } from '../types/Index';

// Extend IRoom to work with Mongoose
export interface IRoomDocument extends IRoom, Document {
  roomCode: string;
  hostId: string;
  players: IPlayer[];
  settings: IRoom['settings'];
  status: IRoom['status'];
  currentQuestion: number;
  isPublic: boolean;
  isFull(): boolean;
  isHost(userId: string): boolean;
  getPlayer(userId: string): IPlayer | undefined;

}


// First, let's define the Answer sub-schema (nested inside Player)
const AnswerSchema: Schema = new Schema(
  {
    questionIndex: {
      type: Number,
      required: true
    },
    selectedAnswer: {
      type: String,
      required: true
    },
    isCorrect: {
      type: Boolean,
      required: true
    },
    timeToAnswer: {
      type: Number, // In seconds
      required: true
    },
    pointsEarned: {
      type: Number,
      required: true,
      default: 0
    }
  },
  { _id: false } // Don't create separate _id for each answer
);

// Define the Player sub-schema (nested inside Room)
const PlayerSchema: Schema = new Schema(
  {
    userId: {
      type: String,
      required: true
    },
    username: {
      type: String,
      required: true
    },
    avatar: {
      type: String,
      default: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'
    },
    score: {
      type: Number,
      default: 0
    },
    answers: {
      type: [AnswerSchema], // Array of Answer objects
      default: []
    },
    isReady: {
      type: Boolean,
      default: false // Players start as not ready
    },
    isConnected: {
      type: Boolean,
      default: true // Assume connected when they join
    }
  },
  { _id: false } // Don't create separate _id for each player
);

interface IRoomMethods {
  isFull(): boolean;
  isHost(userId: string): boolean;
  getPlayer(userId: string): IPlayer | undefined;
}

// Define the main Room Schema
const RoomSchema: Schema = new Schema<IRoomDocument, {}, IRoomMethods>(
  {
    // Unique 6-character room code (like "ABC123")
    roomCode: {
      type: String,
      required: true,
      unique: true, // No two rooms can have same code
      uppercase: true, // Always uppercase
      length: 6, // Exactly 6 characters
      index: true // Index for fast lookup
    },
    
    // ID of the user who created the room
    hostId: {
      type: String,
      required: true
    },
    
    // Array of players in the room
    players: {
      type: [PlayerSchema], // Array of Player objects
      default: [],
      validate: {
        validator: function(players: IPlayer[]) {
          return players.length <= 10; // Maximum 10 players per room
        },
        message: 'Room cannot have more than 10 players'
      }
    },
    
    // Game settings
    settings: {
      category: {
        type: String,
        required: true,
        enum: [
          'any', // Random category
          'general_knowledge',
          'science',
          'history',
          'geography',
          'sports',
          'entertainment',
          'arts',
          'animals'
        ],
        default: 'any'
      },
      difficulty: {
        type: String,
        required: true,
        enum: ['easy', 'medium', 'hard'], // Only these values allowed
        default: 'medium'
      },
      numberOfQuestions: {
        type: Number,
        required: true,
        min: [5, 'Minimum 5 questions'],
        max: [20, 'Maximum 20 questions'],
        default: 10
      },
      timePerQuestion: {
        type: Number, // In seconds
        required: true,
        min: [5, 'Minimum 5 seconds per question'],
        max: [60, 'Maximum 60 seconds per question'],
        default: 15
      }
    },
    
    // Current status of the room
    status: {
      type: String,
      enum: ['waiting', 'playing', 'finished'],
      default: 'waiting'
    },
    
    // Which question the game is currently on (0-indexed)
    currentQuestion: {
      type: Number,
      default: 0
    },
    
    // Can anyone join or only with invite?
    isPublic: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true // Add createdAt and updatedAt
  }
);

// Create index for faster queries
RoomSchema.index({ roomCode: 1, status: 1 }); // Compound index
RoomSchema.index({ createdAt: 1 }); // Index for sorting by creation time


// // Import required modules
// import mongoose, { Schema, Document, Model } from 'mongoose';

// interface IRoomDocument extends Document {
//   roomCode: string;
// }

 interface IRoomModel extends Model<IRoomDocument> {
   generateRoomCode(): Promise<string>;
 }

// // Create Room model
// const Room = mongoose.model<IRoomDocument, IRoomModel>('Room', RoomSchema);

// Add a method to generate random room codes
RoomSchema.statics.generateRoomCode = async function(): Promise<string> {
  // Characters to use in room code (no confusing ones like 0/O, 1/I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let roomCode: string;
  let codeExists: boolean;
  
  // Keep generating until we find a unique code
  do {
    roomCode = '';
    // Generate 6 random characters
    for (let i = 0; i < 6; i++) {
      roomCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if this code already exists
    const existingRoom = await this.findOne({ roomCode });
    codeExists = !!existingRoom; // Convert to boolean
  } while (codeExists); // If exists, generate new code
  
  return roomCode;
};

// Add a method to check if user is host
RoomSchema.methods.isHost = function(userId: string): boolean {
  return this.hostId === userId;
};

// Add a method to check if room is full
RoomSchema.methods.isFull = function(): boolean {
  return this.players.length >= 10;
};

// Add a method to get player by userId
RoomSchema.methods.getPlayer = function(userId: string): IPlayer | undefined {
  return this.players.find((player: IPlayer) => player.userId === userId);
};

// Create and export the Room model
const Room = mongoose.model<IRoomDocument, IRoomModel>('Room', RoomSchema);

export default Room;



// const roomSchema = new Schema<IRoomDocument, {}, IRoomMethods>(
//   {
//     roomCode: {
//       type: String,
//       required: true,
//       unique: true
//     },