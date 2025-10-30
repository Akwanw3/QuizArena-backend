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
// Import mongoose to define schema and model
const mongoose_1 = __importStar(require("mongoose"));
// Define the User Schema (structure of data in MongoDB)
const UserSchema = new mongoose_1.Schema({
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
            get: function () {
                if (this.stats.gamesPlayed === 0)
                    return 0;
                return (this.stats.wins / this.stats.gamesPlayed) * 100;
            }
        }
    }
}, {
    // Schema options
    timestamps: true, // Automatically add createdAt and updatedAt fields
    toJSON: { getters: true }, // Include getters when converting to JSON
    toObject: { getters: true }
});
// Create and export the User model
// mongoose.model creates a model from our schema
// Generic type <IUserDocument> tells TypeScript what this model returns
const User = mongoose_1.default.model('User', UserSchema);
exports.default = User;
