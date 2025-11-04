import { Request, Response, NextFunction } from 'express';
import { AppError } from './ErrorHandler';
import User from '../models/User';

/**
 * Middleware to check if user is verified
 * Use this on routes that require verification
 */
export const requireVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId);
    
    if (!user) {
      throw new AppError('User not found', 404);
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
  } catch (error) {
    next(error);
  }
};