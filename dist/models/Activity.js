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
// Import mongoose
const mongoose_1 = __importStar(require("mongoose"));
/** Activity Model
 * import mongoose, { Schema, Document, Model } from 'mongoose';

interface IActivityDocument extends Document {
  userId: string;
  username: string;
  type: string;
  description: string;
  metadata: any;
  avatar: string;
  createdAt: Date;
}



const activitySchema = new Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  type: { type: String, required: true },
  description: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
  avatar: { type: String },
  createdAt: { type: Date, default: Date.now }
});

activitySchema.statics.createActivity = async function(
  userId: string,
  username: string,
  type: string,
  description: string,
  metadata: any,
  avatar: string
) {
  return this.create({
    userId,
    username,
    type,
    description,
    metadata,
    avatar
  });
};
 */
// Activity Schema
const ActivitySchema = new mongoose_1.Schema({
    // User who performed the activity
    userId: {
        type: String,
        required: true,
        index: true
    },
    username: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        default: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'
    },
    // Type of activity
    type: {
        type: String,
        enum: ['game_won', 'game_played', 'achievement_unlocked', 'high_score'],
        required: true
    },
    // Human-readable description
    description: {
        type: String,
        required: true
    },
    // Additional data (game ID, score, etc.)
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});
// Index for sorting by newest first
ActivitySchema.index({ createdAt: -1 });
// Index for getting user's activities
ActivitySchema.index({ userId: 1, createdAt: -1 });
// Static method to create activity
ActivitySchema.statics.createActivity = async function (userId, username, type, description, metadata, avatar) {
    return this.create({
        userId,
        username,
        avatar,
        type,
        description,
        metadata
    });
};
// Static method to get recent activities
ActivitySchema.statics.getRecentActivities = async function (limit = 50) {
    return this.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};
// Static method to get user's activities
ActivitySchema.statics.getUserActivities = async function (userId, limit = 20) {
    return this.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};
// Create and export model
const Activity = mongoose_1.default.model('Activity', ActivitySchema);
exports.default = Activity;
