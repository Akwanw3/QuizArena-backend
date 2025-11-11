"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTokenFromHeader = exports.verifyToken = exports.generateToken = exports.comparePassword = exports.hashPassword = void 0;
// Import required packages
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// --------------- PASSWORD HASHING ---------------
/**
 * Hash a plain text password
 * @param password - Plain text password from user
 * @returns Hashed password (encrypted string)
 */
const hashPassword = async (password) => {
    // Generate a salt (random data added to password before hashing)
    // 10 is the salt rounds - higher = more secure but slower
    const salt = await bcryptjs_1.default.genSalt(10);
    // Hash the password with the salt
    const hashedPassword = await bcryptjs_1.default.hash(password, salt);
    return hashedPassword;
};
exports.hashPassword = hashPassword;
/**
 * Compare plain text password with hashed password
 * @param password - Plain text password from login attempt
 * @param hashedPassword - Encrypted password from database
 * @returns true if passwords match, false otherwise
 */
const comparePassword = async (password, hashedPassword) => {
    // bcrypt.compare automatically handles the salt and comparison
    const isMatch = await bcryptjs_1.default.compare(password, hashedPassword);
    return isMatch;
};
exports.comparePassword = comparePassword;
// --------------- JWT TOKEN FUNCTIONS ---------------
/**
 * Generate a JWT token for authenticated user
 * @param payload - Data to include in token (userId, email)
 * @returns JWT token string
 */
const generateToken = (payload) => {
    // Get JWT secret from environment variables
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined in environment variables');
    }
    // Create token with payload, secret, and options
    const token = jsonwebtoken_1.default.sign(payload, // Data to encode in token
    secret, // Secret key for signing
    {
        expiresIn: '1d' // Token expires in 1 day
    });
    return token;
};
exports.generateToken = generateToken;
/**
 * Verify and decode a JWT token
 * @param token - JWT token from client
 * @returns Decoded payload if valid, throws error if invalid
 */
const verifyToken = (token) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined in environment variables');
    }
    try {
        // Verify token and decode payload
        // This will throw an error if token is invalid or expired
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        return decoded;
    }
    catch (error) {
        // Token is invalid, expired, or malformed
        throw new Error('Invalid or expired token');
    }
};
exports.verifyToken = verifyToken;
/**
 * Extract token from Authorization header
 * @param authHeader - Authorization header from request
 * @returns Token string or null
 */
const extractTokenFromHeader = (authHeader) => {
    // Authorization header format: "Bearer <token>"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    // Extract token by removing "Bearer " prefix
    const token = authHeader.substring(7); // "Bearer " is 7 characters
    return token;
};
exports.extractTokenFromHeader = extractTokenFromHeader;
