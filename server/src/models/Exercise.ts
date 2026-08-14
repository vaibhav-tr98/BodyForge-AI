import { Document, Schema, model } from "mongoose";

export interface IExercise extends Document {
  name: string;
  category?: string;
  equipment?: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  instructions: string[];
}

const exerciseSchema = new Schema<IExercise>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200,
    },
    category: {
      type: String,
      trim: true,
    },
    equipment: {
      type: String,
      trim: true,
    },
    primaryMuscles: {
      type: [String],
      default: [],
    },
    secondaryMuscles: {
      type: [String],
      default: [],
    },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
    },
    instructions: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Indexes for scalable querying
exerciseSchema.index({ name: "text" }); // Text index for performant search
exerciseSchema.index({ primaryMuscles: 1 });
exerciseSchema.index({ equipment: 1 });
exerciseSchema.index({ difficulty: 1 });

const Exercise = model<IExercise>("Exercise", exerciseSchema);

export default Exercise;
