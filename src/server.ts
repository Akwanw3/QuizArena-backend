import express,{Application} from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createServer } from 'http';
import connectDB from './config/Database';

dotenv.config();

const app: Application = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors:{
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    }
});
app.use(cors({
    origin:process.env.CLIENT_URL || 'localhost:5173',
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({extended:true}));

import AuthRoutes from './routes/AuthRoutes';
import RoomRoutes from './routes/RoomRoutes';

app.use('/api/rooms', RoomRoutes);
app.use('/api/auth', AuthRoutes);

app.get('/', (req, res)=>{
    res.json({message: 'TriviaGame API is running!'});
});

io.on('connection', (socket)=>{
    console.log('New client connected :', socket.id);

    socket.on('disconnect',()=>{
        console.log('client disconnected:',socket.id);
        
    });
    
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
        console.error('Faile to start server:', err);
        process.exit(1);
    }
};
startServer();
export {io};
