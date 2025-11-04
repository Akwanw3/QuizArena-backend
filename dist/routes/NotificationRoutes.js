"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const NotificationController_1 = require("../controllers/NotificationController");
const Auth_1 = require("../middleware/Auth");
const router = express_1.default.Router();
// All routes require authentication
router.use(Auth_1.authenticate);
/**
 * GET /api/notifications
 * Get user's notifications
 * Query: ?limit=20&unreadOnly=false
 */
router.get('/', NotificationController_1.getNotifications);
/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', NotificationController_1.getUnreadCount);
/**
 * PUT /api/notifications/:notificationId/read
 * Mark notification as read
 */
router.put('/:notificationId/read', NotificationController_1.markAsRead);
/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', NotificationController_1.markAllAsRead);
/**
 * DELETE /api/notifications/:notificationId
 * Delete notification
 */
router.delete('/:notificationId', NotificationController_1.deleteNotification);
/**
 * DELETE /api/notifications
 * Delete all notifications
 */
router.delete('/', NotificationController_1.deleteAllNotifications);
exports.default = router;
