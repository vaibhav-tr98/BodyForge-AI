import axios from 'axios';

async function test() {
  try {
    const login = await axios.post('http://localhost:5000/api/auth/register', {
      name: 'Test UI 9',
      email: 'testui9@test.com',
      password: 'password123'
    });
    const token = login.data.data ? login.data.data.token : login.data.token;
    
    // Create workout
    const workout = await axios.post('http://localhost:5000/api/workouts', {
      name: 'My Workout',
      exercises: [{
        exercise: '507f1f77bcf86cd799439011', // Will use an existing exercise ID if possible, but let's just bypass it by creating a session directly via the mock
      }]
    }, { headers: { Authorization: `Bearer ${token}` } }).catch(e => e); // ignore error
    
    // Start session directly
    const start = await axios.post('http://localhost:5000/api/workout-sessions', {
      workoutId: workout?.data?.data?._id || "507f1f77bcf86cd799439011",
      exercises: [{
        exerciseName: 'Bench Press',
        plannedSets: 3,
        plannedReps: 10
      }]
    }, { headers: { Authorization: `Bearer ${token}` } });
    
    const sessionId = start.data.data._id;
    
    await axios.patch(`http://localhost:5000/api/workout-sessions/${sessionId}`, {
      exercises: [{
        exerciseName: 'Bench Press',
        plannedSets: 3,
        plannedReps: 10,
        sets: [{ setNumber: 1, weight: 100, reps: 10, completed: true }]
      }],
      status: 'completed'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    try {
      const dash = await axios.get('http://localhost:5000/api/analytics/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Dashboard API Success with data!');
    } catch (e: any) {
      console.log('Dashboard API Error Message:', e.message, e.response?.data);
    }
  } catch (e: any) {
    console.log('Register Error:', e.response?.data || e.message);
  }
}
test();
