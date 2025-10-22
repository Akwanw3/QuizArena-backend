// Import required modules
import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/Auth';
import User from '../models/User';
import { IJWTPayload } from '../types/Index';

// Extend Express Request type to include user property
// This lets TypeScript know that req.user exists
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

/**
 * Authentication Middleware
 * Protects routes - only authenticated users can access
 * Extracts userId from JWT token and attaches to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Step 1: Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);
    
    // Step 2: Check if token exists
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
      return;
    }
    
    // Step 3: Verify token and get payload
    const decoded: IJWTPayload = verifyToken(token);
    
    // Step 4: Check if user still exists in database
    // (user might have deleted their account)
    const user = await User.findById(decoded.userId);
    
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
    
  } catch (error) {
    // Token is invalid, expired, or malformed
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }
};

/**
 * Optional Authentication Middleware
 * Doesn't block request if no token, but attaches user if token exists
 * Useful for routes that work differently for logged-in vs guest users
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Try to get token
    const token = extractTokenFromHeader(req.headers.authorization);
    
    // If token exists, verify and attach user
    if (token) {
      const decoded: IJWTPayload = verifyToken(token);
      const user = await User.findById(decoded.userId);
      
      if (user) {
        req.user = {
          userId: decoded.userId,
          email: decoded.email
        };
      }
    }
    
    // Always move to next (even if no token)
    next();
    
  } catch (error) {
    // If token is invalid, just continue without user
    // Don't block the request
    next();
  }
};