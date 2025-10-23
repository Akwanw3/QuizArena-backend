// Import required modules
import { Request, Response } from 'express';
import User from '../models/User';
import { hashPassword, comparePassword, generateToken } from '../utils/Auth';
import { asyncHandler, AppError } from '../middleware/ErrorHandler';

/**
 * Register a new user
 * POST /api/auth/register
 * Public route
 */
export const register = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Step 1: Extract data from request body
    const { username, email, password } = req.body;
    
    // Step 2: Validate input (basic validation)
    if (!username || !email || !password) {
      throw new AppError('Please provide username, email, and password', 400);
    }
    
    // Step 3: Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      // Check which field is duplicate
      if (existingUser.email === email) {
        throw new AppError('Email already registered', 400);
      }
      if (existingUser.username === username) {
        throw new AppError('Username already taken', 400);
      }
    }
    
    // Step 4: Hash the password
    const hashedPassword = await hashPassword(password);
    
    // Step 5: Create new user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      stats: {
        gamesPlayed: 0,
        wins: 0,
        totalPoints: 0,
        winRate: 0
      }
    });
    
    // Step 6: Generate JWT token
    const token = generateToken({
      userId: user.id.toString(),
      email: user.email
    });
    
    // Step 7: Send response (don't include password!)
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
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