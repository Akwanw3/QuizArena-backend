"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const Database_1 = __importDefault(require("./config/Database"));
const GameSocket_1 = require("./socket/GameSocket");
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    }
});
exports.io = io;
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || 'localhost:5173',
    credentials: true
}));
(0, GameSocket_1.initializeGameSocket)(io);
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
const AuthRoutes_1 = __importDefault(require("./routes/AuthRoutes"));
const RoomRoutes_1 = __importDefault(require("./routes/RoomRoutes"));
const GameRoutes_1 = __importDefault(require("./routes/GameRoutes"));
const UserRoutes_1 = __importDefault(require("./routes/UserRoutes"));
const ActivityRoutes_1 = __importDefault(require("./routes/ActivityRoutes"));
const AchievementsRoutes_1 = __importDefault(require("./routes/AchievementsRoutes"));
app.use('/api/games', GameRoutes_1.default);
app.use('/api/rooms', RoomRoutes_1.default);
app.use('/api/auth', AuthRoutes_1.default);
app.use('/api/users', UserRoutes_1.default);
app.use('/api/activities', ActivityRoutes_1.default);
app.use('/api/achievements', AchievementsRoutes_1.default);
app.get('/', (req, res) => {
    res.json({ message: 'TriviaGame API is running!' });
});
const ErrorHandler_1 = require("./middleware/ErrorHandler");
app.use(ErrorHandler_1.notFound);
app.use(ErrorHandler_1.errorHandler);
const PORT = process.env.PORT || 5001;
const startServer = async () => {
    try {
        await (0, Database_1.default)();
        httpServer.listen(PORT, () => {
            console.log(`Server is running on ${PORT}`);
            console.log(`socket.io is ready for connections`);
        });
    }
    catch (err) {
        console.error('Faile to start server:', err);
        process.exit(1);
    }
};
startServer();
