// Import required modules
import { Request, Response } from 'express';
import User from '../models/User';
import { hashPassword, comparePassword, generateToken } from '../utils/Auth';
import { asyncHandler, AppError } from '../middleware/ErrorHandler';
import { generateOTP, sendVerificationEmail, sendPasswordResetEmail } from '../utils/EmailService';


/**
 * Register a new user (UPDATED - sends OTP)
 */
export const register = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      throw new AppError('Please provide username, email, and password', 400);
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        throw new AppError('Email already registered', 400);
      }
      if (existingUser.username === username) {
        throw new AppError('Username already taken', 400);
      }
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Create user
    const user = await User.create({
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
      await sendVerificationEmail(email, username, otp);
    } catch (error) {
      console.error('Error sending verification email:', error);
      // Don't fail registration if email fails
      
    }
    
    // Generate JWT token
    const token = generateToken({
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
  }
);

/**
 * Verify email with OTP
 * POST /api/auth/verify-email
 * Protected route
 */
export const verifyEmail = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { otp } = req.body;
    
    if (!otp) {
      throw new AppError('Please provide OTP', 400);
    }
    
    // Get user with OTP fields
    const user = await User.findById(req.user?.userId).select('+verificationOTP +verificationOTPExpires');
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    if (user.isVerified) {
      throw new AppError('Email already verified', 400);
    }
    
    // Check OTP
    if (!user.verificationOTP || user.verificationOTP !== otp) {
      throw new AppError('Invalid OTP', 400);
    }
    
    // Check expiry
    if (!user.verificationOTPExpires || user.verificationOTPExpires < new Date()) {
      throw new AppError('OTP expired. Please request a new one.', 400);
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
  }
);

/**
 * Resend verification OTP
 * POST /api/auth/resend-verification
 * Protected route
 */
export const resendVerificationOTP = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = await User.findById(req.user?.userId);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    if (user.isVerified) {
      throw new AppError('Email already verified', 400);
    }
    
    // Generate new OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    
    user.verificationOTP = otp;
    user.verificationOTPExpires = otpExpires;
    await user.save();
    
    // Send email
    await sendVerificationEmail(user.email, user.username, otp);
    
    res.status(200).json({
      success: true,
      message: 'Verification code sent to your email'
    });
  }
);

/**
 * Request password reset
 * POST /api/auth/forgot-password
 * Public route
 */
export const forgotPassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    
    if (!email) {
      throw new AppError('Please provide email', 400);
    }
    
    const user = await User.findOne({ email });
    
    if (!user) {
      // Don't reveal if email exists
      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset code has been sent'
      });
      return;
    }
    
    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = otpExpires;
    await user.save();
    
    // Send email
    await sendPasswordResetEmail(user.email, user.username, otp);
    
    res.status(200).json({
      success: true,
      message: 'If the email exists, a password reset code has been sent'
    });
  }
);

/**
 * Reset password with OTP
 * POST /api/auth/reset-password
 * Public route
 */
export const resetPassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, otp, newPassword } = req.body;
    
    if (!email || !otp || !newPassword) {
      throw new AppError('Please provide email, OTP, and new password', 400);
    }
    
    if (newPassword.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400);
    }
    
    // Find user with reset fields
    const user = await User.findOne({ email }).select('+resetPasswordOTP +resetPasswordOTPExpires');
    
    if (!user) {
      throw new AppError('Invalid request', 400);
    }
    
    // Check OTP
    if (!user.resetPasswordOTP || user.resetPasswordOTP !== otp) {
      throw new AppError('Invalid OTP', 400);
    }
    
    // Check expiry
    if (!user.resetPasswordOTPExpires || user.resetPasswordOTPExpires < new Date()) {
      throw new AppError('OTP expired. Please request a new one.', 400);
    }
    
    // Hash new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update password
    user.password = hashedPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });
  }
);

/**
 * Login user
 * POST /api/auth/login
 * Public route
 */
export const login = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Step 1: Extract credentials from request
    const { email, password } = req.body;
    
    // Step 2: Validate input
    if (!email || !password) {
      throw new AppError('Please provide email and password', 400);
    }
    
    // Step 3: Find user by email (include password this time!)
    // Remember: password has select: false in schema, so we need .select('+password')
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }
    
    // Step 4: Compare passwords
    const isPasswordCorrect = await comparePassword(password, user.password);
    
    if (!isPasswordCorrect) {
      throw new AppError('Invalid email or password', 401);
    }
    
    // Step 5: Generate JWT token
    const token = generateToken({
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
  }
);

/**
 * Get current user profile
 * GET /api/auth/me
 * Protected route (requires authentication)
 */
export const getProfile = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // req.user is set by authenticate middleware
    // So we know user is logged in
    
    // Step 1: Get user from database
    const user = await User.findById(req.user?.userId);
    
    if (!user) {
      throw new AppError('User not found', 404);
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
  }
);

/**
 * Update user profile
 * PUT /api/auth/profile
 * Protected route
 */
export const updateProfile = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Step 1: Get updatable fields from request
    const { username, avatar } = req.body;
    
    // Step 2: Build update object (only include provided fields)
    const updateData: any = {};
    
    if (username) {
      // Check if username is already taken by another user
      const existingUser = await User.findOne({
        username,
        _id: { $ne: req.user?.userId } // Exclude current user
      });
      
      if (existingUser) {
        throw new AppError('Username already taken', 400);
      }
      
      updateData.username = username;
    }
    
    if (avatar) {
      updateData.avatar = avatar;
    }
    
    // Step 3: Update user
    const user = await User.findByIdAndUpdate(
      req.user?.userId,
      updateData,
      {
        new: true, // Return updated document
        runValidators: true // Run schema validations
      }
    );
    
    if (!user) {
      throw new AppError('User not found', 404);
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
  }
);

/**
 * Get user statistics
 * GET /api/auth/stats
 * Protected route
 */
export const getStats = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Get user with stats
    const user = await User.findById(req.user?.userId);
    
    if (!user) {
      throw new AppError('User not found', 404);
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
  }
);

/**
 * Change password
 * PUT /api/auth/password
 * Protected route
 */
export const changePassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Step 1: Get passwords from request
    const { currentPassword, newPassword } = req.body;
    
    // Step 2: Validate input
    if (!currentPassword || !newPassword) {
      throw new AppError('Please provide current and new password', 400);
    }
    
    if (newPassword.length < 6) {
      throw new AppError('New password must be at least 6 characters', 400);
    }
    
    // Step 3: Get user with password
    const user = await User.findById(req.user?.userId).select('+password');
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Step 4: Verify current password
    const isPasswordCorrect = await comparePassword(
      currentPassword,
      user.password
    );
    
    if (!isPasswordCorrect) {
      throw new AppError('Current password is incorrect', 401);
    }
    
    // Step 5: Hash new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Step 6: Update password
    user.password = hashedPassword;
    await user.save();
    
    // Step 7: Send success response
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  }
);

/**
 * Upload avatar image
 * POST /api/auth/avatar
 * Protected route
 */
export const uploadAvatar = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Check if file was uploaded
    if (!req.file) {
      throw new AppError('Please upload an image file', 400);
    }

    // Get user
    const user = await User.findById(req.user?.userId);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Update user avatar with Cloudinary URL
    user.avatar = (req.file as any).path; // Cloudinary URL
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        avatar: user.avatar
      }
    });
  }
);

/**
 * Update notification settings
 * PUT /api/auth/notification-settings
 * Protected route
 */
export const updateNotificationSettings = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { gameInvites, achievements, leaderboard, email } = req.body;
    
    const user = await User.findById(req.user?.userId);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Update settings (cast to any because notificationSettings is not declared on the model type)
    const ns: any = (user as any).notificationSettings || {};
    if (gameInvites !== undefined) ns.gameInvites = gameInvites;
    if (achievements !== undefined) ns.achievements = achievements;
    if (leaderboard !== undefined) ns.leaderboard = leaderboard;
    if (email !== undefined) ns.email = email;
    (user as any).notificationSettings = ns;
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Notification settings updated',
      data: {
        notificationSettings: (user as any).notificationSettings
      }
    });
  }
);