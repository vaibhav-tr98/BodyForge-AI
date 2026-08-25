import mongoose, { Document, Schema } from "mongoose";

export interface IProgressEntry extends Document {
  user: mongoose.Types.ObjectId;
  date: string;
  weight: number;
  bodyFatPercentage?: number;
  waist?: number;
  chest?: number;
  arm?: number;
  createdAt: Date;
  updatedAt: Date;
}

const progressEntrySchema = new Schema<IProgressEntry>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    weight: {
      type: Number,
      required: true,
      min: 20,
      max: 500,
    },
    bodyFatPercentage: {
      type: Number,
      min: 1,
      max: 70,
    },
    waist: {
      type: Number,
      min: 10,
      max: 300,
    },
    chest: {
      type: Number,
      min: 10,
      max: 300,
    },
    arm: {
      type: Number,
      min: 5,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

progressEntrySchema.index({ user: 1, date: 1 });
progressEntrySchema.index({ user: 1, date: -1 });

const ProgressEntry = mongoose.model<IProgressEntry>("ProgressEntry", progressEntrySchema);

export default ProgressEntry;
