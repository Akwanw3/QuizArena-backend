import express,{Application} from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createServer } from 'http';
import connectDB from './config/Database';
import { initializeGameSocket } from './socket/GameSocket';

dotenv.config();

const app: Application = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors:{
        origin: process.env.CLIENT_URL || 'http://localhost:5173' || '*',
        methods: ['GET', 'POST'],
        credentials: true
    }
});
app.use(cors({
    origin:process.env.CLIENT_URL || 'http://localhost:5173' || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

initializeGameSocket(io);

app.use(express.json());
app.use(express.urlencoded({extended:true}));

import AuthRoutes from './routes/AuthRoutes';
import RoomRoutes from './routes/RoomRoutes';
import GameRoutes from './routes/GameRoutes';
import UserRoutes from './routes/UserRoutes';
import ActivityRoutes from './routes/ActivityRoutes';
import AchievementsRoutes from './routes/AchievementsRoutes';
import NotificationRoutes from './routes/NotificationRoutes';

app.use('/api/notifications', NotificationRoutes);
app.use('/api/games', GameRoutes);
app.use('/api/rooms', RoomRoutes);
app.use('/api/auth', AuthRoutes);
app.use('/api/users', UserRoutes);
app.use('/api/activities', ActivityRoutes);
app.use('/api/achievements', AchievementsRoutes);

app.get('/', (req, res)=>{
    res.json({message: 'QuizArena API is running!'});
});



import { errorHandler, notFound } from './middleware/ErrorHandler';
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;



const startServer = async()=>{
    try{
        await connectDB();
        httpServer.listen(PORT, ()=>{
            console.log(`Server is running on ${PORT}`);
            console.log(`socket.io is ready for connections`);
            
        });
    }catch(err){
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};
startServer();
export {io};


