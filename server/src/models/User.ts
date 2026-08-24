import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  height?: number;
  weight?: number;
  goal?: string;
  experience?: string;
  age?: number;
  gender?: string;
  activityLevel?: string;
  fitnessGoal?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    height: {
      type: Number,
      min: 50,
      max: 300,
    },

    weight: {
      type: Number,
      min: 20,
      max: 500,
    },

    goal: {
      type: String,
      trim: true,
    },

    experience: {
      type: String,
      trim: true,
    },

    age: {
      type: Number,
      min: 13,
      max: 120,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
    },

    activityLevel: {
      type: String,
      enum: ["sedentary", "lightly_active", "moderately_active", "very_active", "extremely_active"],
    },

    fitnessGoal: {
      type: String,
      enum: ["lose_fat", "maintain", "build_muscle", "improve_fitness"],
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model<IUser>("User", userSchema);

export default User;