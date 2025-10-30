"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    try {
        const mongoURL = process.env.MONGODB_URL;
        if (!mongoURL) {
            throw new Error('MONGODB_URL is not defined in environment variables');
        }
        await mongoose_1.default.connect(mongoURL);
        console.log('mongoDB connected succesfully');
    }
    catch (Err) {
        console.error('mongoDB connecting error:', Err);
        process.exit(1);
    }
};
exports.default = connectDB;
