import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: string;
  type: 'game_invite' | 'achievement' | 'leaderboard' | 'system' | 'friend_request';
  title: string;
  message: string;
  isRead: boolean;
  data?: any; // Additional data (game ID, achievement ID, etc.)
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    
    type: {
      type: String,
      enum: ['game_invite', 'achievement', 'leaderboard', 'system', 'friend_request'],
      required: true
    },
    
    title: {
      type: String,
      required: true
    },
    
    message: {
      type: String,
      required: true
    },
    
    isRead: {
      type: Boolean,
      default: false
    },
    
    data: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

// Static method to create notification
NotificationSchema.statics.createNotification = async function(
  userId: string,
  type: INotification['type'],
  title: string,
  message: string,
  data?: any
) {
  return this.create({
    userId,
    type,
    title,
    message,
    data
  });
};

const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;