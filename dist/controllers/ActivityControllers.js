"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivitiesByType = exports.getMyActivities = exports.getUserActivities = exports.getRecentActivities = void 0;
const Activity_1 = __importDefault(require("../models/Activity"));
const ErrorHandler_1 = require("../middleware/ErrorHandler");
/**
 * Get recent global activities
 * GET /api/activities
 * Public route
 */
exports.getRecentActivities = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const activities = await Activity_1.default.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    res.status(200).json({
        success: true,
        data: {
            activities,
            count: activities.length
        }
    });
});
/**
 * Get user's activities
 * GET /api/activities/user/:userId
 * Public route
 */
exports.getUserActivities = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const activities = await Activity_1.default.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    res.status(200).json({
        success: true,
        data: {
            activities,
            count: activities.length
        }
    });
});
/**
 * Get current user's activities
 * GET /api/activities/me
 * Protected route
 */
exports.getMyActivities = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.userId;
    const limit = parseInt(req.query.limit) || 20;
    const activities = await Activity_1.default.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    res.status(200).json({
        success: true,
        data: {
            activities,
            count: activities.length
        }
    });
});
/**
 * Get activities by type
 * GET /api/activities/type/:type
 * Public route
 */
exports.getActivitiesByType = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    const { type } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    // Validate type
    const validTypes = ['game_won', 'game_played', 'achievement_unlocked', 'high_score'];
    if (!validTypes.includes(type)) {
        throw new ErrorHandler_1.AppError('Invalid activity type', 400);
    }
    const activities = await Activity_1.default.find({ type })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    res.status(200).json({
        success: true,
        data: {
            type,
            activities,
            count: activities.length
        }
    });
});
