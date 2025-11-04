// Import mongoose to define schema and model
import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '../types/Index';

// Extend IUser to work with Mongoose Document
// Document gives us MongoDB methods like .save(), .remove(), etc.
export interface IUserDocument extends IUser, Document {}

// Define the User Schema (structure of data in MongoDB)
const UserSchema: Schema = new Schema(
  {
    // Username field
    username: {
      type: String, // Data type
      required: [true, 'Username is required'], // Validation: must exist
      unique: true, // No two users can have same username
      trim: true, // Remove whitespace from beginning/end
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [20, 'Username cannot exceed 20 characters']
    },
    
    // Email field
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true, // Convert to lowercase automatically
      trim: true,
      // Regex to validate email format
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email'
      ]
    },
    
    // Password field (will be encrypted before saving)
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // Don't return password in queries by default (security!)
    },
    
    // Email verification
isVerified: {
  type: Boolean,
  default: false
},

verificationOTP: {
  type: String,
  select: false // Don't return in queries by default
},

verificationOTPExpires: {
  type: Date,
  select: false
},

// Password reset
resetPasswordOTP: {
  type: String,
  select: false
},

resetPasswordOTPExpires: {
  type: Date,
  select: false
},
// Add this field to UserSchema (after isVerified):

notificationSettings: {
  gameInvites: {
    type: Boolean,
    default: true
  },
  achievements: {
    type: Boolean,
    default: true
  },
  leaderboard: {
    type: Boolean,
    default: true
  },
  email: {
    type: Boolean,
    default: true
  }
},
    // Avatar URL (optional)
    avatar: {
      type: String,
      default: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default' // Default avatar
    },
    
    // Player statistics (nested object)
    stats: {
      gamesPlayed: {
        type: Number,
        default: 0 // Start at 0
      },
      wins: {
        type: Number,
        default: 0
      },
      totalPoints: {
        type: Number,
        default: 0
      },
      winRate: {
        type: Number,
        default: 0,
        // Custom getter: calculate win rate as percentage
        get: function(this: IUserDocument) {
          if (this.stats.gamesPlayed === 0) return 0;
          return (this.stats.wins / this.stats.gamesPlayed) * 100;
        }
      }
    }
  },
  {
    // Schema options
    timestamps: true, // Automatically add createdAt and updatedAt fields
    toJSON: { getters: true }, // Include getters when converting to JSON
    toObject: { getters: true }
  }
);


// Create and export the User model
// mongoose.model creates a model from our schema
// Generic type <IUserDocument> tells TypeScript what this model returns
const User = mongoose.model<IUserDocument>('User', UserSchema);

export default User;