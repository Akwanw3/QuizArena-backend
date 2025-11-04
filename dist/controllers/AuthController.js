"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateNotificationSettings = exports.uploadAvatar = exports.changePassword = exports.getStats = exports.updateProfile = exports.getProfile = exports.login = exports.resetPassword = exports.forgotPassword = exports.resendVerificationOTP = exports.verifyEmail = exports.register = void 0;
const User_1 = __importDefault(require("../models/User"));
const Auth_1 = require("../utils/Auth");
const ErrorHandler_1 = require("../middleware/ErrorHandler");
const EmailService_1 = require("../utils/EmailService");
/**
 * Register a new user (UPDATED - sends OTP)
 */
exports.register = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        throw new ErrorHandler_1.AppError('Please provide username, email, and password', 400);
    }
    // Check if user already exists
    const existingUser = await User_1.default.findOne({
        $or: [{ email }, { username }]
    });
    if (existingUser) {
        if (existingUser.email === email) {
            throw new ErrorHandler_1.AppError('Email already registered', 400);
        }
        if (existingUser.username === username) {
            throw new ErrorHandler_1.AppError('Username already taken', 400);
        }
    }
    // Hash password
    const hashedPassword = await (0, Auth_1.hashPassword)(password);
    // Generate OTP
    const otp = (0, EmailService_1.generateOTP)();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    // Create user
    const user = await User_1.default.create({
        username,
        email,
        password: hashedPassword,
        isVerified: false,
        verificationOTP: otp,
        verificationOTPExpires: otpExpires,
        stats: {
            gamesPlayed: 0,
            wins: 0,
            totalPoints: 0,
            winRate: 0
        }
    });
    // Send verification email
    try {
        await (0, EmailService_1.sendVerificationEmail)(email, username, otp);
    }
    catch (error) {
        console.error('Error sending verification email:', error);
        // Don't fail registration if email fails
    }
    // Generate JWT token
    const token = (0, Auth_1.generateToken)({
        userId: user.id.toString(),
        email: user.email
    });
    res.status(201).json({
        success: true,
        message: 'User registered successfully. Please check your email for verification code.',
        data: {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                stats: user.stats,
                isVerified: user.isVerified
            },
            token,
            requiresVerification: true
        }
    });
});
/**
 * Verify email with OTP
 * POST /api/auth/verify-email
 * Protected route
 */
exports.verifyEmail = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    const { otp } = req.body;
    if (!otp) {
        throw new ErrorHandler_1.AppError('Please provide OTP', 400);
    }
    // Get user with OTP fields
    const user = await User_1.default.findById(req.user?.userId).select('+verificationOTP +verificationOTPExpires');
    if (!user) {
        throw new ErrorHandler_1.AppError('User not found', 404);
    }
    if (user.isVerified) {
        throw new ErrorHandler_1.AppError('Email already verified', 400);
    }
    // Check OTP
    if (!user.verificationOTP || user.verificationOTP !== otp) {
        throw new ErrorHandler_1.AppError('Invalid OTP', 400);
    }
    // Check expiry
    if (!user.verificationOTPExpires || user.verificationOTPExpires < new Date()) {
        throw new ErrorHandler_1.AppError('OTP expired. Please request a new one.', 400);
    }
    // Verify user
    user.isVerified = true;
    user.verificationOTP = undefined;
    user.verificationOTPExpires = undefined;
    await user.save();
    res.status(200).json({
        success: true,
        message: 'Email verified successfully! You can now play games.',
        data: {
            isVerified: true
        }
    });
});
/**
 * Resend verification OTP
 * POST /api/auth/resend-verification
 * Protected route
 */
exports.resendVerificationOTP = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    const user = await User_1.default.findById(req.user?.userId);
    if (!user) {
        throw new ErrorHandler_1.AppError('User not found', 404);
    }
    if (user.isVerified) {
        throw new ErrorHandler_1.AppError('Email already verified', 400);
    }
    // Generate new OTP
    const otp = (0, EmailService_1.generateOTP)();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.verificationOTP = otp;
    user.verificationOTPExpires = otpExpires;
    await user.save();
    // Send email
    await (0, EmailService_1.sendVerificationEmail)(user.email, user.username, otp);
    res.status(200).json({
        success: true,
        message: 'Verification code sent to your email'
    });
});
/**
 * Request password reset
 * POST /api/auth/forgot-password
 * Public route
 */
exports.forgotPassword = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        throw new ErrorHandler_1.AppError('Please provide email', 400);
    }
    const user = await User_1.default.findOne({ email });
    if (!user) {
        // Don't reveal if email exists
        res.status(200).json({
            success: true,
            message: 'If the email exists, a password reset code has been sent'
        });
        return;
    }
    // Generate OTP
    const otp = (0, EmailService_1.generateOTP)();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = otpExpires;
    await user.save();
    // Send email
    await (0, EmailService_1.sendPasswordResetEmail)(user.email, user.username, otp);
    res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset code has been sent'
    });
});
/**
 * Reset password with OTP
 * POST /api/auth/reset-password
 * Public route
 */
exports.resetPassword = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
        throw new ErrorHandler_1.AppError('Please provide email, OTP, and new password', 400);
    }
    if (newPassword.length < 6) {
        throw new ErrorHandler_1.AppError('Password must be at least 6 characters', 400);
    }
    // Find user with reset fields
    const user = await User_1.default.findOne({ email }).select('+resetPasswordOTP +resetPasswordOTPExpires');
    if (!user) {
        throw new ErrorHandler_1.AppError('Invalid request', 400);
    }
    // Check OTP
    if (!user.resetPasswordOTP || user.resetPasswordOTP !== otp) {
        throw new ErrorHandler_1.AppError('Invalid OTP', 400);
    }
    // Check expiry
    if (!user.resetPasswordOTPExpires || user.resetPasswordOTPExpires < new Date()) {
        throw new ErrorHandler_1.AppError('OTP expired. Please request a new one.', 400);
    }
    // Hash new password
    const hashedPassword = await (0, Auth_1.hashPassword)(newPassword);
    // Update password
    user.password = hashedPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;
    await user.save();
    res.status(200).json({
        success: true,
        message: 'Password reset successfully. You can now login with your new password.'
    });
});
/**
 * Login user
 * POST /api/auth/login
 * Public route
 */
exports.login = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    // Step 1: Extract credentials from request
    const { email, password } = req.body;
    // Step 2: Validate input
    if (!email || !password) {
        throw new ErrorHandler_1.AppError('Please provide email and password', 400);
    }
    // Step 3: Find user by email (include password this time!)
    // Remember: password has select: false in schema, so we need .select('+password')
    const user = await User_1.default.findOne({ email }).select('+password');
    if (!user) {
        throw new ErrorHandler_1.AppError('Invalid email or password', 401);
    }
    // Step 4: Compare passwords
    const isPasswordCorrect = await (0, Auth_1.comparePassword)(password, user.password);
    if (!isPasswordCorrect) {
        throw new ErrorHandler_1.AppError('Invalid email or password', 401);
    }
    // Step 5: Generate JWT token
    const token = (0, Auth_1.generateToken)({
        userId: user.id.toString(),
        email: user.email
    });
    // Step 6: Send response (without password!)
    res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                stats: user.stats
            },
            token
        }
    });
});
/**
 * Get current user profile
 * GET /api/auth/me
 * Protected route (requires authentication)
 */
exports.getProfile = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    // req.user is set by authenticate middleware
    // So we know user is logged in
    // Step 1: Get user from database
    const user = await User_1.default.findById(req.user?.userId);
    if (!user) {
        throw new ErrorHandler_1.AppError('User not found', 404);
    }
    // Step 2: Send user data
    res.status(200).json({
        success: true,
        data: {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                stats: user.stats,
                createdAt: user.createdAt
            }
        }
    });
});
/**
 * Update user profile
 * PUT /api/auth/profile
 * Protected route
 */
exports.updateProfile = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    // Step 1: Get updatable fields from request
    const { username, avatar } = req.body;
    // Step 2: Build update object (only include provided fields)
    const updateData = {};
    if (username) {
        // Check if username is already taken by another user
        const existingUser = await User_1.default.findOne({
            username,
            _id: { $ne: req.user?.userId } // Exclude current user
        });
        if (existingUser) {
            throw new ErrorHandler_1.AppError('Username already taken', 400);
        }
        updateData.username = username;
    }
    if (avatar) {
        updateData.avatar = avatar;
    }
    // Step 3: Update user
    const user = await User_1.default.findByIdAndUpdate(req.user?.userId, updateData, {
        new: true, // Return updated document
        runValidators: true // Run schema validations
    });
    if (!user) {
        throw new ErrorHandler_1.AppError('User not found', 404);
    }
    // Step 4: Send updated user
    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                stats: user.stats
            }
        }
    });
});
/**
 * Get user statistics
 * GET /api/auth/stats
 * Protected route
 */
exports.getStats = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    // Get user with stats
    const user = await User_1.default.findById(req.user?.userId);
    if (!user) {
        throw new ErrorHandler_1.AppError('User not found', 404);
    }
    // Calculate additional stats
    const winRate = user.stats.gamesPlayed > 0
        ? (user.stats.wins / user.stats.gamesPlayed) * 100
        : 0;
    const avgPointsPerGame = user.stats.gamesPlayed > 0
        ? user.stats.totalPoints / user.stats.gamesPlayed
        : 0;
    res.status(200).json({
        success: true,
        data: {
            stats: {
                gamesPlayed: user.stats.gamesPlayed,
                wins: user.stats.wins,
                losses: user.stats.gamesPlayed - user.stats.wins,
                totalPoints: user.stats.totalPoints,
                winRate: Math.round(winRate * 100) / 100, // Round to 2 decimals
                avgPointsPerGame: Math.round(avgPointsPerGame * 100) / 100
            }
        }
    });
});
/**
 * Change password
 * PUT /api/auth/password
 * Protected route
 */
exports.changePassword = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    // Step 1: Get passwords from request
    const { currentPassword, newPassword } = req.body;
    // Step 2: Validate input
    if (!currentPassword || !newPassword) {
        throw new ErrorHandler_1.AppError('Please provide current and new password', 400);
    }
    if (newPassword.length < 6) {
        throw new ErrorHandler_1.AppError('New password must be at least 6 characters', 400);
    }
    // Step 3: Get user with password
    const user = await User_1.default.findById(req.user?.userId).select('+password');
    if (!user) {
        throw new ErrorHandler_1.AppError('User not found', 404);
    }
    // Step 4: Verify current password
    const isPasswordCorrect = await (0, Auth_1.comparePassword)(currentPassword, user.password);
    if (!isPasswordCorrect) {
        throw new ErrorHandler_1.AppError('Current password is incorrect', 401);
    }
    // Step 5: Hash new password
    const hashedPassword = await (0, Auth_1.hashPassword)(newPassword);
    // Step 6: Update password
    user.password = hashedPassword;
    await user.save();
    // Step 7: Send success response
    res.status(200).json({
        success: true,
        message: 'Password changed successfully'
    });
});
/**
 * Upload avatar image
 * POST /api/auth/avatar
 * Protected route
 */
exports.uploadAvatar = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    // Check if file was uploaded
    if (!req.file) {
        throw new ErrorHandler_1.AppError('Please upload an image file', 400);
    }
    // Get user
    const user = await User_1.default.findById(req.user?.userId);
    if (!user) {
        throw new ErrorHandler_1.AppError('User not found', 404);
    }
    // Update user avatar with Cloudinary URL
    user.avatar = req.file.path; // Cloudinary URL
    await user.save();
    res.status(200).json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
            avatar: user.avatar
        }
    });
});
/**
 * Update notification settings
 * PUT /api/auth/notification-settings
 * Protected route
 */
exports.updateNotificationSettings = (0, ErrorHandler_1.asyncHandler)(async (req, res) => {
    const { gameInvites, achievements, leaderboard, email } = req.body;
    const user = await User_1.default.findById(req.user?.userId);
    if (!user) {
        throw new ErrorHandler_1.AppError('User not found', 404);
    }
    // Update settings (cast to any because notificationSettings is not declared on the model type)
    const ns = user.notificationSettings || {};
    if (gameInvites !== undefined)
        ns.gameInvites = gameInvites;
    if (achievements !== undefined)
        ns.achievements = achievements;
    if (leaderboard !== undefined)
        ns.leaderboard = leaderboard;
    if (email !== undefined)
        ns.email = email;
    user.notificationSettings = ns;
    await user.save();
    res.status(200).json({
        success: true,
        message: 'Notification settings updated',
        data: {
            notificationSettings: user.notificationSettings
        }
    });
});
