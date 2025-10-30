"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authenticate = void 0;
const Auth_1 = require("../utils/Auth");
const User_1 = __importDefault(require("../models/User"));
/**
 * Authentication Middleware
 * Protects routes - only authenticated users can access
 * Extracts userId from JWT token and attaches to request
 */
const authenticate = async (req, res, next) => {
    try {
        // Step 1: Extract token from Authorization header
        const token = (0, Auth_1.extractTokenFromHeader)(req.headers.authorization);
        // Step 2: Check if token exists
        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
            return;
        }
        // Step 3: Verify token and get payload
        const decoded = (0, Auth_1.verifyToken)(token);
        // Step 4: Check if user still exists in database
        // (user might have deleted their account)
        const user = await User_1.default.findById(decoded.userId);
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'User no longer exists.'
            });
            return;
        }
        // Step 5: Attach user info to request object
        // Now all subsequent middleware/controllers can access req.user
        req.user = {
            userId: decoded.userId,
            email: decoded.email
        };
        // Step 6: Move to next middleware/controller
        next();
    }
    catch (error) {
        // Token is invalid, expired, or malformed
        res.status(401).json({
            success: false,
            message: 'Invalid or expired token.'
        });
    }
};
exports.authenticate = authenticate;
/**
 * Optional Authentication Middleware
 * Doesn't block request if no token, but attaches user if token exists
 * Useful for routes that work differently for logged-in vs guest users
 */
const optionalAuth = async (req, res, next) => {
    try {
        // Try to get token
        const token = (0, Auth_1.extractTokenFromHeader)(req.headers.authorization);
        // If token exists, verify and attach user
        if (token) {
            const decoded = (0, Auth_1.verifyToken)(token);
            const user = await User_1.default.findById(decoded.userId);
            if (user) {
                req.user = {
                    userId: decoded.userId,
                    email: decoded.email
                };
            }
        }
        // Always move to next (even if no token)
        next();
    }
    catch (error) {
        // If token is invalid, just continue without user
        // Don't block the request
        next();
    }
};
exports.optionalAuth = optionalAuth;
