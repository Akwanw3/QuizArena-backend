"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// Import mongoose and our types
const mongoose_1 = __importStar(require("mongoose"));
// First, let's define the Answer sub-schema (nested inside Player)
const AnswerSchema = new mongoose_1.Schema({
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
}, { _id: false } // Don't create separate _id for each answer
);
// Define the Player sub-schema (nested inside Room)
const PlayerSchema = new mongoose_1.Schema({
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
}, { _id: false } // Don't create separate _id for each player
);
// Define the main Room Schema
const RoomSchema = new mongoose_1.Schema({
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
            validator: function (players) {
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
}, {
    timestamps: true // Add createdAt and updatedAt
});
// Create index for faster queries
RoomSchema.index({ roomCode: 1, status: 1 }); // Compound index
RoomSchema.index({ createdAt: 1 }); // Index for sorting by creation time
// // Create Room model
// const Room = mongoose.model<IRoomDocument, IRoomModel>('Room', RoomSchema);
// Add a method to generate random room codes
RoomSchema.statics.generateRoomCode = async function () {
    // Characters to use in room code (no confusing ones like 0/O, 1/I)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let roomCode;
    let codeExists;
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
RoomSchema.methods.isHost = function (userId) {
    return this.hostId === userId;
};
// Add a method to check if room is full
RoomSchema.methods.isFull = function () {
    return this.players.length >= 10;
};
// Add a method to get player by userId
RoomSchema.methods.getPlayer = function (userId) {
    return this.players.find((player) => player.userId === userId);
};
// Create and export the Room model
const Room = mongoose_1.default.model('Room', RoomSchema);
exports.default = Room;
