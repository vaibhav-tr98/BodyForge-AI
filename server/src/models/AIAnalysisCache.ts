import mongoose, { Document, Schema, Types } from "mongoose";

export interface IAIAnalysisCache extends Document {
  userId: Types.ObjectId;
  date: string; // YYYY-MM-DD, or empty string for readiness (no specific date)
  type: "nutrition" | "workout" | "readiness" | "daily-summary" | "progress";
  inputHash: string;
  result: unknown;
  modelName: string; // renamed from 'model' to avoid collision with Mongoose Document.model()
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const aiAnalysisCacheSchema = new Schema<IAIAnalysisCache>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["nutrition", "workout", "readiness", "daily-summary", "progress"],
      required: true,
    },
    inputHash: {
      type: String,
      required: true,
    },
    result: {
      type: Schema.Types.Mixed,
      required: true,
    },
    modelName: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Compound unique index for cache lookup
aiAnalysisCacheSchema.index(
  { userId: 1, date: 1, type: 1, inputHash: 1 },
  { unique: true }
);

// TTL index — MongoDB deletes documents when expiresAt is reached
aiAnalysisCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AIAnalysisCache = mongoose.model<IAIAnalysisCache>(
  "AIAnalysisCache",
  aiAnalysisCacheSchema
);

export default AIAnalysisCache;
