"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotification = exports.getUnreadCount = exports.deleteAllNotifications = exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getNotifications = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
const ErrorHandler_1 = require("../middleware/ErrorHandler");
const server_1 = require("../server");
/**
 * Get user's notifications
 * GET /api/notifications
 * Protected route
 */
exports.getNotifications = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';
    const query = { userId: req.user?.userId };
    if (unreadOnly) {
        query.isRead = false;
    }
    const notifications = await Notification_1.default.find(query)
        .sort({ createdAt: -1 })
        .limit(limit);
    // Count unread
    const unreadCount = await Notification_1.default.countDocuments({
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
});
/**
 * Mark notification as read
 * PUT /api/notifications/:notificationId/read
 * Protected route
 */
exports.markAsRead = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    const { notificationId } = req.params;
    const notification = await Notification_1.default.findOne({
        _id: notificationId,
        userId: req.user?.userId
    });
    if (!notification) {
        throw new ErrorHandler_1.AppError('Notification not found', 404);
    }
    notification.isRead = true;
    await notification.save();
    res.status(200).json({
        success: true,
        message: 'Notification marked as read'
    });
});
/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 * Protected route
 */
exports.markAllAsRead = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    await Notification_1.default.updateMany({ userId: req.user?.userId, isRead: false }, { isRead: true });
    res.status(200).json({
        success: true,
        message: 'All notifications marked as read'
    });
});
/**
 * Delete notification
 * DELETE /api/notifications/:notificationId
 * Protected route
 */
exports.deleteNotification = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    const { notificationId } = req.params;
    const notification = await Notification_1.default.findOneAndDelete({
        _id: notificationId,
        userId: req.user?.userId
    });
    if (!notification) {
        throw new ErrorHandler_1.AppError('Notification not found', 404);
    }
    res.status(200).json({
        success: true,
        message: 'Notification deleted'
    });
});
/**
 * Delete all notifications
 * DELETE /api/notifications
 * Protected route
 */
exports.deleteAllNotifications = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    await Notification_1.default.deleteMany({ userId: req.user?.userId });
    res.status(200).json({
        success: true,
        message: 'All notifications deleted'
    });
});
/**
 * Get unread count
 * GET /api/notifications/unread-count
 * Protected route
 */
exports.getUnreadCount = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    const count = await Notification_1.default.countDocuments({
        userId: req.user?.userId,
        isRead: false
    });
    res.status(200).json({
        success: true,
        data: {
            count
        }
    });
});
/**
 * Helper function to send notification
 * Use this in other controllers to create and emit notifications
 */
const sendNotification = async (userId, type, title, message, data) => {
    try {
        // Create notification in database
        const notification = await Notification_1.default.create({
            userId,
            type,
            title,
            message,
            data
        });
        // Emit real-time notification via Socket.io
        server_1.io.to(userId).emit('notification:new', {
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
    }
    catch (error) {
        console.error('Error sending notification:', error);
    }
};
exports.sendNotification = sendNotification;
