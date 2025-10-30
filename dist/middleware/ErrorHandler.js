"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.notFound = exports.errorHandler = exports.AppError = void 0;
/**
 * Custom Error class with status code
 */
class AppError extends Error {
    constructor(message, statusCode) {
        super(message); // Call parent Error constructor
        this.statusCode = statusCode;
        // Maintains proper stack trace (useful for debugging)
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
/**
 * Global Error Handler Middleware
 * Catches all errors from controllers and sends proper response
 */
const errorHandler = (err, req, res, next) => {
    // Default to 500 Internal Server Error if no status code
    let statusCode = 500;
    let message = 'Something went wrong on the server';
    // If it's our custom AppError, use its status code
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
    }
    // Handle Mongoose validation errors
    else if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
    }
    // Handle Mongoose duplicate key errors (unique constraint)
    else if (err.name === 'MongoServerError' && err.code === 11000) {
        statusCode = 400;
        message = 'Duplicate field value entered';
    }
    // Handle Mongoose cast errors (invalid ObjectId)
    else if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid ID format';
    }
    // Handle JWT errors
    else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }
    else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }
    // Use error message if available
    else if (err.message) {
        message = err.message;
    }
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error:', err);
    }
    // Send error response
    res.status(statusCode).json({
        success: false,
        message,
        // Include stack trace in development for debugging
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};
exports.errorHandler = errorHandler;
/**
 * Catch-all for 404 Not Found
 * Use this after all route definitions
 */
const notFound = (req, res, next) => {
    const error = new AppError(`Route ${req.originalUrl} not found`, 404);
    next(error); // Pass to error handler
};
exports.notFound = notFound;
/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors automatically
 * Without this, you need try-catch in every async controller
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
