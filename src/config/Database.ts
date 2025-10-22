
import Module from "module";
import mongoose from "mongoose";
const connectDB = async(): Promise<void>=>{
try{
    const mongoURL = process.env.MONGODB_URL;
    if(!mongoURL){
        throw new Error('MONGODB_URL is not defined in environment variables');
    }
    await mongoose.connect(mongoURL);
    console.log('mongoDB connected succesfully');
    
}catch(Err){
    console.error('mongoDB connecting error:',Err);
    process.exit(1)
    
}
};
export default connectDB