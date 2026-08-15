import { Document, Schema, Types, model } from "mongoose";

export interface IWorkoutSessionSet {
  setNumber: number;
  weight: number;
  reps: number;
  completed: boolean;
}

export interface IWorkoutSessionExercise {
  exerciseName: string;
  plannedSets: number;
  plannedReps: number;
  plannedWeight?: number;
  sets: IWorkoutSessionSet[];
}

export interface IWorkoutSession extends Document {
  user: Types.ObjectId;
  workout: Types.ObjectId;
  startedAt: Date;
  completedAt?: Date | null;
  status: "active" | "completed";
  exercises: IWorkoutSessionExercise[];
  createdAt: Date;
  updatedAt: Date;
}

const workoutSessionSetSchema = new Schema<IWorkoutSessionSet>(
  {
    setNumber: { type: Number, required: true, min: 1 },
    weight: { type: Number, required: true, min: 0 },
    reps: { type: Number, required: true, min: 0 },
    completed: { type: Boolean, default: false },
  },
  { _id: false }
);

const workoutSessionExerciseSchema = new Schema<IWorkoutSessionExercise>(
  {
    exerciseName: { type: String, required: true, trim: true },
    plannedSets: { type: Number, required: true, min: 1 },
    plannedReps: { type: Number, required: true, min: 1 },
    plannedWeight: { type: Number, min: 0 },
    sets: { type: [workoutSessionSetSchema], default: [] },
  },
  { _id: false }
);

const workoutSessionSchema = new Schema<IWorkoutSession>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    workout: { type: Schema.Types.ObjectId, ref: "Workout", required: true },
    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
      required: true,
    },
    exercises: { type: [workoutSessionExerciseSchema], required: true },
  },
  { timestamps: true }
);

workoutSessionSchema.index({ user: 1, startedAt: -1 });
workoutSessionSchema.index({ user: 1, status: 1 });

const WorkoutSession = model<IWorkoutSession>("WorkoutSession", workoutSessionSchema);

export default WorkoutSession;
