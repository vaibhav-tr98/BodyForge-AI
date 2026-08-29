# BodyForge AI

BodyForge AI is a production-grade, AI-powered fitness application built on the MERN stack. It leverages deterministic fitness calculations alongside Google's Gemini AI to provide personalized workout recommendations, nutrition insights, and intelligent progress analysis.

## Core Features

- **Profile & Personalization**: Grounded in deterministic metrics (Age, Gender, Activity Level, Goals).
- **Nutrition Target Engine**: Calculates Mifflin-St Jeor BMR, TDEE, and personalized macronutrient targets.
- **Workout Tracking & Generation**: Track exercises, build routines, and generate custom workout plans from scratch using AI.
- **Progress Tracking**: Record and analyze weight, body fat, and body measurements.
- **Training Readiness**: Evaluates fatigue, recent workouts, and rest to optimize training volume.
- **AI Intelligence Layer**: Gemini interprets deterministic context to provide highly personalized Insights, Workout Analysis, Nutrition Analysis, Progress Summaries, and a Unified Daily Summary.

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS 4, React Router, React Query, React Hook Form, Zod.
- **Backend**: Node.js, Express 5, TypeScript, Mongoose, Zod.
- **Database**: MongoDB Atlas.
- **AI Provider**: Google Gemini (via `@google/genai`).
- **Deployment Architecture**:
  - Frontend: Vercel
  - Backend: Render
  - Database: MongoDB Atlas

## Local Development

### Prerequisites
- Node.js (v18+)
- MongoDB connection string
- Gemini API Key

### Backend Setup

```bash
cd server
npm install
# Create .env based on .env.example
npm run dev
```

Required Server Environment Variables:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key
AI_MODEL=gemini-2.5-flash
```

### Frontend Setup

```bash
cd client
npm install
# Create .env based on .env.example
npm run dev
```

Required Client Environment Variables:
```env
VITE_API_URL=http://localhost:5000
```

## Security & Reliability

- **Authentication**: JWT-based stateless authentication with strict route protection.
- **User Isolation**: All operations inherently scope to `req.authenticatedUserId`.
- **Validation**: Strict Zod validation on inputs and AI-generated outputs.
- **Rate Limiting**: Tiered request limiting across generic API, Auth, and AI endpoints.
- **Payload Limits**: 1MB JSON limits to prevent denial of service.
- **Graceful Shutdown**: Production SIGTERM handling for MongoDB connections.

## Build for Production

```bash
# Build backend
cd server
npm run build

# Build frontend
cd client
npm run build
```
