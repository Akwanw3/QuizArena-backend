// Import mongoose
import mongoose, { Schema, Document, Model } from 'mongoose';
import { IActivity } from '../types/Index';

// Extend IActivity with Mongoose Document
export interface IActivityDocument extends IActivity, Document {}

interface IActivityModel extends Model<IActivityDocument> {
  createActivity(userId: string, username: string, type: string, description: string, metadata: any, avatar: string): Promise<IActivityDocument>;
}

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
const ActivitySchema: Schema = new Schema(
  {
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
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Index for sorting by newest first
ActivitySchema.index({ createdAt: -1 });

// Index for getting user's activities
ActivitySchema.index({ userId: 1, createdAt: -1 });

// Static method to create activity
ActivitySchema.statics.createActivity = async function(
  userId: string,
  username: string,
  type: IActivity['type'],
  description: string,
  metadata?: any,
  avatar?: string
) {
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
ActivitySchema.statics.getRecentActivities = async function(limit: number = 50) {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to get user's activities
ActivitySchema.statics.getUserActivities = async function(
  userId: string,
  limit: number = 20
) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Create and export model
const Activity = mongoose.model<IActivityDocument, IActivityModel>('Activity', ActivitySchema);

export default Activity;