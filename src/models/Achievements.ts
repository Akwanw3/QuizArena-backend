// Import mongoose
import mongoose, { Schema, Document } from 'mongoose';
import { IAchievement } from '../types/Index';

// Extend IAchievement with Mongoose Document
export interface IAchievementDocument extends IAchievement, Document {}

// Achievement Schema
const AchievementSchema: Schema = new Schema(
  {
    // User who unlocked this achievement
    userId: {
      type: String,
      required: true,
      index: true
    },
    
    // Achievement identifier
    achievementId: {
      type: String,
      required: true
    },
    
    // Achievement details
    title: {
      type: String,
      required: true
    },
    
    description: {
      type: String,
      required: true
    },
    
    icon: {
      type: String,
      default: '🏆'
    },
    
    // When unlocked
    unlockedAt: {
      type: Date,
      default: Date.now
    },
    
    // Progress for progressive achievements (0-100)
    progress: {
      type: Number,
      default: 100, // Most achievements are instant (100%)
      min: 0,
      max: 100
    }
  },
  {
    timestamps: true
  }
);

// Compound index to prevent duplicate achievements
AchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });

// Create and export model
const Achievement = mongoose.model<IAchievementDocument>('Achievement', AchievementSchema);

export default Achievement;