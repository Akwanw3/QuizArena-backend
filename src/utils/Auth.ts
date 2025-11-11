// Import required packages
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IJWTPayload } from '../types/Index';

// --------------- PASSWORD HASHING ---------------

/**
 * Hash a plain text password
 * @param password - Plain text password from user
 * @returns Hashed password (encrypted string)
 */
export const hashPassword = async (password: string): Promise<string> => {
  // Generate a salt (random data added to password before hashing)
  // 10 is the salt rounds - higher = more secure but slower
  const salt = await bcrypt.genSalt(10);
  
  // Hash the password with the salt
  const hashedPassword = await bcrypt.hash(password, salt);
  
  return hashedPassword;
};

/**
 * Compare plain text password with hashed password
 * @param password - Plain text password from login attempt
 * @param hashedPassword - Encrypted password from database
 * @returns true if passwords match, false otherwise
 */
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  // bcrypt.compare automatically handles the salt and comparison
  const isMatch = await bcrypt.compare(password, hashedPassword);
  return isMatch;
};

// --------------- JWT TOKEN FUNCTIONS ---------------

/**
 * Generate a JWT token for authenticated user
 * @param payload - Data to include in token (userId, email)
 * @returns JWT token string
 */
export const generateToken = (payload: IJWTPayload): string => {
  // Get JWT secret from environment variables
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  
  // Create token with payload, secret, and options
  const token = jwt.sign(
    payload, // Data to encode in token
    secret, // Secret key for signing
    {
      expiresIn: '1d' // Token expires in 1 day
    }
  );
  
  return token;
};

/**
 * Verify and decode a JWT token
 * @param token - JWT token from client
 * @returns Decoded payload if valid, throws error if invalid
 */
export const verifyToken = (token: string): IJWTPayload => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  
  try {
    // Verify token and decode payload
    // This will throw an error if token is invalid or expired
    const decoded = jwt.verify(token, secret) as IJWTPayload;
    return decoded;
  } catch (error) {
    // Token is invalid, expired, or malformed
    throw new Error('Invalid or expired token');
  }
};

/**
 * Extract token from Authorization header
 * @param authHeader - Authorization header from request
 * @returns Token string or null
 */
export const extractTokenFromHeader = (
  authHeader: string | undefined
): string | null => {
  // Authorization header format: "Bearer <token>"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  // Extract token by removing "Bearer " prefix
  const token = authHeader.substring(7); // "Bearer " is 7 characters
  return token;
};