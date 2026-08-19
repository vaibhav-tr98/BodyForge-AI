import mongoose from 'mongoose';
import User from './src/models/User';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bodyforge');
  const users = await User.find();
  console.log('Users count:', users.length);
  if (users.length > 0) {
     console.log('First user:', users[0].email, users[0]._id.toString());
  }
  process.exit(0);
}
test();
