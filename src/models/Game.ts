// Import mongoose and our types
import mongoose, { Schema, Document, Model } from 'mongoose';
import { IGame, IGamePlayer, IQuestion } from '../types/Index';

// Extend IGame to work with Mongoose
export interface IGameDocument extends IGame, Document {
  
}

// Sub-schema for storing questions that were asked
const QuestionSchema: Schema = new Schema(
  {
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
  },
  { _id: false } // Don't create _id for each question
);

// Sub-schema for player results in completed game
const GamePlayerSchema: Schema = new Schema(
  {
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
  },
  { _id: false }
);

// Main Game Schema
const GameSchema: Schema = new Schema(
  {
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
        validator: function(players: IGamePlayer[]) {
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
  },
  {
    timestamps: true // Add createdAt and updatedAt
  }
);

// Indexes for faster queries
GameSchema.index({ winner: 1 }); // Find all games won by a user
GameSchema.index({ 'players.userId': 1 }); // Find all games a user participated in
GameSchema.index({ createdAt: -1 }); // Sort by newest first (-1 = descending)
GameSchema.index({ 'settings.difficulty': 1 }); // Filter by difficulty

// Static method to get user's game history

interface GameModel extends Model<IGameDocument> {
   getUserHistory(userId: string, limit?: number): Promise<IGameDocument[]>;
    getGlobalLeaderboard(limit?: number): Promise<any[]>;
 }

GameSchema.statics.getUserHistory = async function(
  userId: string,
  limit: number = 10
) {
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
GameSchema.statics.getGlobalLeaderboard = async function(limit: number = 100) {
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
GameSchema.methods.isWinner = function(userId: string): boolean {
  return this.winner === userId;
};

// Instance method to get player's rank in this game
GameSchema.methods.getPlayerRank = function(userId: string): number | null {
  const player = this.players.find(
    (p: IGamePlayer) => p.userId === userId
  );
  return player ? player.rank : null;
};

// Create and export the Game model
const Game = mongoose.model<IGameDocument, GameModel>('Game', GameSchema);

export default Game;