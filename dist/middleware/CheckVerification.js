"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireVerification = void 0;
const ErrorHandler_1 = require("./ErrorHandler");
const User_1 = __importDefault(require("../models/User"));
/**
 * Middleware to check if user is verified
 * Use this on routes that require verification
 */
const requireVerification = async (req, res, next) => {
    try {
        const user = await User_1.default.findById(req.user?.userId);
        if (!user) {
            throw new ErrorHandler_1.AppError('User not found', 404);
        }
        if (!user.isVerified) {
            res.status(403).json({
                success: false,
                message: 'Please verify your email before performing this action',
                requiresVerification: true
            });
            return;
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requireVerification = requireVerification;
