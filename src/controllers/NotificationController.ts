import { Request, Response } from 'express';
import Notification from '../models/Notification';
import { asyncHandler, AppError } from '../middleware/ErrorHandler';
import { io } from '../server';

/**
 * Get user's notifications
 * GET /api/notifications
 * Protected route
 */
export const getNotifications = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const limit = parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';
    
    const query: any = { userId: req.user?.userId };
    
    if (unreadOnly) {
      query.isRead = false;
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);
    
    // Count unread
    const unreadCount = await Notification.countDocuments({
      userId: req.user?.userId,
      isRead: false
    });
    
    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    });
  }
);

/**
 * Mark notification as read
 * PUT /api/notifications/:notificationId/read
 * Protected route
 */
export const markAsRead = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { notificationId } = req.params;
    
    const notification = await Notification.findOne({
      _id: notificationId,
      userId: req.user?.userId
    });
    
    if (!notification) {
      throw new AppError('Notification not found', 404);
    }
    
    notification.isRead = true;
    await notification.save();
    
    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  }
);

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 * Protected route
 */
export const markAllAsRead = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    await Notification.updateMany(
      { userId: req.user?.userId, isRead: false },
      { isRead: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  }
);

/**
 * Delete notification
 * DELETE /api/notifications/:notificationId
 * Protected route
 */
export const deleteNotification = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { notificationId } = req.params;
    
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId: req.user?.userId
    });
    
    if (!notification) {
      throw new AppError('Notification not found', 404);
    }
    
    res.status(200).json({
      success: true,
      message: 'Notification deleted'
    });
  }
);

/**
 * Delete all notifications
 * DELETE /api/notifications
 * Protected route
 */
export const deleteAllNotifications = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    await Notification.deleteMany({ userId: req.user?.userId });
    
    res.status(200).json({
      success: true,
      message: 'All notifications deleted'
    });
  }
);

/**
 * Get unread count
 * GET /api/notifications/unread-count
 * Protected route
 */
export const getUnreadCount = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const count = await Notification.countDocuments({
      userId: req.user?.userId,
      isRead: false
    });
    
    res.status(200).json({
      success: true,
      data: {
        count
      }
    });
  }
);

/**
 * Helper function to send notification
 * Use this in other controllers to create and emit notifications
 */
export const sendNotification = async (
  userId: string,
  type: 'game_invite' | 'achievement' | 'leaderboard' | 'system' | 'friend_request',
  title: string,
  message: string,
  data?: any
) => {
  try {
    // Create notification in database
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      data
    });
    
    // Emit real-time notification via Socket.io
    io.to(userId).emit('notification:new', {
      notification: {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        isRead: notification.isRead,
        createdAt: notification.createdAt
      }
    });
    
    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};