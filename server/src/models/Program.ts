import { Document, Schema, Types, model } from "mongoose";

export interface IProgramDay {
  dayIndex: number;
  workoutId: Types.ObjectId | null;
}

export interface IProgramWeek {
  days: IProgramDay[];
}

export interface IProgram extends Document {
  user: Types.ObjectId;
  name: string;
  goal?: string;
  startDate: string; // YYYY-MM-DD
  timezone: string;
  status: "draft" | "active" | "completed" | "archived";
  weeks: IProgramWeek[];
  createdAt: Date;
  updatedAt: Date;
}

const programDaySchema = new Schema<IProgramDay>(
  {
    dayIndex: { type: Number, required: true, min: 0, max: 6 },
    workoutId: { type: Schema.Types.ObjectId, ref: "Workout", default: null },
  },
  { _id: false }
);

const programWeekSchema = new Schema<IProgramWeek>(
  {
    days: {
      type: [programDaySchema],
      required: true,
      validate: {
        validator: function (v: IProgramDay[]) {
          if (v.length !== 7) return false;
          const indices = v.map((d) => d.dayIndex);
          const uniqueIndices = new Set(indices);
          if (uniqueIndices.size !== 7) return false;
          for (let i = 0; i < 7; i++) {
            if (!uniqueIndices.has(i)) return false;
          }
          return true;
        },
        message: "A week must have exactly 7 days with unique indices 0-6.",
      },
    },
  },
  { _id: false }
);

const programSchema = new Schema<IProgram>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    goal: { type: String, trim: true },
    startDate: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"],
    },
    timezone: { type: String, required: true },
    status: {
      type: String,
      enum: ["draft", "active", "completed", "archived"],
      default: "draft",
      required: true,
    },
    weeks: {
      type: [programWeekSchema],
      required: true,
      validate: {
        validator: function (v: IProgramWeek[]) {
          return v.length >= 1 && v.length <= 52;
        },
        message: "A program must be between 1 and 52 weeks.",
      },
    },
  },
  { timestamps: true }
);

programSchema.index(
  { user: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "active" } }
);

const Program = model<IProgram>("Program", programSchema);

export default Program;
