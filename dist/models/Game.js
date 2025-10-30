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
// Sub-schema for storing questions that were asked
const QuestionSchema = new mongoose_1.Schema({
    category: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    difficulty: {
        type: String,
        required: true
    },
    question: {
        type: String,
        required: true
    },
    correct_answer: {
        type: String,
        required: true
    },
    incorrect_answers: {
        type: [String], // Array of strings
        required: true
    }
}, { _id: false } // Don't create _id for each question
);
// Sub-schema for player results in completed game
const GamePlayerSchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    finalScore: {
        type: Number,
        required: true,
        default: 0
    },
    accuracy: {
        type: Number, // Percentage (0-100)
        required: true,
        default: 0,
        min: 0,
        max: 100
    },
    averageTimeToAnswer: {
        type: Number, // In seconds
        required: true,
        default: 0
    },
    fastestAnswer: {
        type: Number, // In seconds
        required: true,
        default: 0
    },
    rank: {
        type: Number, // 1st, 2nd, 3rd place, etc.
        required: true,
        min: 1
    }
}, { _id: false });
// Main Game Schema
const GameSchema = new mongoose_1.Schema({
    // Reference to the room where this game was played
    roomId: {
        type: String,
        required: true,
        index: true // Index for finding all games from a room
    },
    // Array of player results (final standings)
    players: {
        type: [GamePlayerSchema],
        required: true,
        validate: {
            validator: function (players) {
                return players.length > 0; // At least 1 player
            },
            message: 'Game must have at least one player'
        }
    },
    // User ID of the winner
    winner: {
        type: String,
        required: true
    },
    // Copy of game settings (so we know how the game was configured)
    settings: {
        category: {
            type: String,
            required: true
        },
        difficulty: {
            type: String,
            required: true,
            enum: ['easy', 'medium', 'hard']
        },
        numberOfQuestions: {
            type: Number,
            required: true
        },
        timePerQuestion: {
            type: Number,
            required: true
        }
    },
    // The actual questions that were asked
    questions: {
        type: [QuestionSchema],
        required: true
    },
    // When the game started
    startedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    // When the game ended
    finishedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    // Total duration of the game in seconds
    duration: {
        type: Number, // In seconds
        required: true,
        default: 0
    }
}, {
    timestamps: true // Add createdAt and updatedAt
});
// Indexes for faster queries
GameSchema.index({ winner: 1 }); // Find all games won by a user
GameSchema.index({ 'players.userId': 1 }); // Find all games a user participated in
GameSchema.index({ createdAt: -1 }); // Sort by newest first (-1 = descending)
GameSchema.index({ 'settings.difficulty': 1 }); // Filter by difficulty
GameSchema.statics.getUserHistory = async function (userId, limit = 10) {
    // Find all games where this user was a player
    // Sort by newest first
    // Limit results
    return this.find({
        'players.userId': userId
    })
        .sort({ createdAt: -1 }) // -1 = descending (newest first)
        .limit(limit)
        .lean(); // .lean() returns plain JavaScript objects (faster)
};
// Static method to get global leaderboard
GameSchema.statics.getGlobalLeaderboard = async function (limit = 100) {
    // Aggregate pipeline to calculate user statistics
    return this.aggregate([
        // Stage 1: Unwind players array (create separate document for each player)
        {
            $unwind: '$players'
        },
        // Stage 2: Group by userId and calculate stats
        {
            $group: {
                _id: '$players.userId', // Group by user ID
                username: { $first: '$players.username' }, // Get username
                totalGames: { $sum: 1 }, // Count games
                totalWins: {
                    // Count how many times this userId equals winner field
                    $sum: {
                        $cond: [
                            { $eq: ['$players.userId', '$winner'] },
                            1,
                            0
                        ]
                    }
                },
                totalScore: { $sum: '$players.finalScore' }, // Sum all scores
                avgAccuracy: { $avg: '$players.accuracy' }, // Average accuracy
                avgTimeToAnswer: { $avg: '$players.averageTimeToAnswer' }
            }
        },
        // Stage 3: Calculate win rate
        {
            $addFields: {
                winRate: {
                    $multiply: [
                        { $divide: ['$totalWins', '$totalGames'] },
                        100
                    ]
                }
            }
        },
        // Stage 4: Sort by total score (highest first)
        {
            $sort: { totalScore: -1 }
        },
        // Stage 5: Limit results
        {
            $limit: limit
        },
        // Stage 6: Format output
        {
            $project: {
                _id: 0, // Don't include _id
                userId: '$_id', // Rename _id to userId
                username: 1,
                totalGames: 1,
                totalWins: 1,
                totalScore: 1,
                winRate: { $round: ['$winRate', 2] }, // Round to 2 decimals
                avgAccuracy: { $round: ['$avgAccuracy', 2] },
                avgTimeToAnswer: { $round: ['$avgTimeToAnswer', 2] }
            }
        }
    ]);
};
// Instance method to check if user won this game
GameSchema.methods.isWinner = function (userId) {
    return this.winner === userId;
};
// Instance method to get player's rank in this game
GameSchema.methods.getPlayerRank = function (userId) {
    const player = this.players.find((p) => p.userId === userId);
    return player ? player.rank : null;
};
// Create and export the Game model
const Game = mongoose_1.default.model('Game', GameSchema);
exports.default = Game;
