import { Document, Schema, Types, model } from "mongoose";

export interface INutritionEntry extends Document {
  user: Types.ObjectId;
  date: string; // YYYY-MM-DD
  foodName: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: Date;
  updatedAt: Date;
}

const nutritionEntrySchema = new Schema<INutritionEntry>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    foodName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 20,
    },
    calories: {
      type: Number,
      required: true,
      min: 0,
    },
    protein: {
      type: Number,
      required: true,
      min: 0,
    },
    carbs: {
      type: Number,
      required: true,
      min: 0,
    },
    fat: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

nutritionEntrySchema.index({ user: 1, date: -1 });

const NutritionEntry = model<INutritionEntry>("NutritionEntry", nutritionEntrySchema);

export default NutritionEntry;
