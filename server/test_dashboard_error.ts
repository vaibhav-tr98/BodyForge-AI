import mongoose from 'mongoose';
import { AnalyticsService } from './src/services/analytics.service';
import User from './src/models/User';
import WorkoutSession from './src/models/WorkoutSession';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bodyforge');
  const user = await User.create({ name: 'Test', email: 'test3@test.com', password: 'password123' });
  await WorkoutSession.create({
    user: user._id,
    workout: new mongoose.Types.ObjectId(),
    startedAt: new Date(),
    completedAt: new Date(),
    status: 'completed',
    exercises: [{ exerciseName: 'Unknown Exercise', plannedSets: 3, plannedReps: 10, sets: [{ setNumber: 1, weight: 100, reps: 10, completed: true }] }]
  });

  const analyticsService = new AnalyticsService();
  try {
    console.log('Testing getDashboardAnalytics');
    await analyticsService.getDashboardAnalytics(user._id.toString());
    console.log('Dashboard Success!');
  } catch (err: any) {
    console.error('Dashboard Error:', err.message);
  }

  await User.deleteOne({ _id: user._id });
  await WorkoutSession.deleteMany({ user: user._id });
  process.exit(0);
}
test();
