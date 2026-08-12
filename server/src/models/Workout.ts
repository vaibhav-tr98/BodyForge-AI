import { Document, Schema, Types, model } from "mongoose";

export interface IExercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
}

export interface IWorkout extends Document {
  user: Types.ObjectId;
  name: string;
  description?: string;
  exercises: IExercise[];
  createdAt: Date;
  updatedAt: Date;
}

const exerciseSchema = new Schema<IExercise>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    sets: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Sets must be a whole number",
      },
    },
    reps: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Reps must be a whole number",
      },
    },
    weight: {
      type: Number,
      min: 0,
    },
  },
  { _id: false }
);

const workoutSchema = new Schema<IWorkout>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    exercises: {
      type: [exerciseSchema],
      required: true,
    },
  },
  { timestamps: true }
);

workoutSchema.index({ user: 1, createdAt: -1 });

const Workout = model<IWorkout>("Workout", workoutSchema);

export default Workout;
