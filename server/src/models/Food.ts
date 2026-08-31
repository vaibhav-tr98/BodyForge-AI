import mongoose, { Document, Schema } from "mongoose";

export interface IFoodServing {
  unit: string;
  quantity: number;
  equivalent: number;
}

export interface IFood extends Document {
  name: string;
  aliases: string[];
  category: string;
  baseQuantity: number;
  baseUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: string;
  servings?: IFoodServing[];
}

const ServingSchema: Schema = new Schema(
  {
    unit: { type: String, required: true },
    quantity: { type: Number, required: true },
    equivalent: { type: Number, required: true }
  },
  { _id: false }
);

const FoodSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    aliases: { type: [String], default: [] },
    category: { type: String, required: true },
    baseQuantity: { type: Number, required: true },
    baseUnit: { type: String, required: true },
    calories: { type: Number, required: true },
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fat: { type: Number, required: true },
    source: { type: String, required: true },
    servings: { type: [ServingSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

// Indexes for search performance
FoodSchema.index({ name: 'text', aliases: 'text' });
FoodSchema.index({ name: 1 });

export default mongoose.model<IFood>("Food", FoodSchema);
