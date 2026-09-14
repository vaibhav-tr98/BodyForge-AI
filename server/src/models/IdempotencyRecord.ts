import { Document, Schema, Types, model } from "mongoose";

export interface IIdempotencyRecord extends Document {
  user: Types.ObjectId;
  key: string;
  requestHash: string;
  status: "in_progress" | "completed";
  response?: {
    statusCode: number;
    body: any;
  };
  lockedUntil?: Date;
  createdAt: Date;
  expiresAt: Date;
}

const idempotencyRecordSchema = new Schema<IIdempotencyRecord>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  key: { type: String, required: true },
  requestHash: { type: String, required: true },
  status: { type: String, enum: ["in_progress", "completed"], required: true },
  response: {
    statusCode: { type: Number },
    body: { type: Schema.Types.Mixed }
  },
  lockedUntil: { type: Date },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

idempotencyRecordSchema.index({ user: 1, key: 1 }, { unique: true });
idempotencyRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const IdempotencyRecord = model<IIdempotencyRecord>("IdempotencyRecord", idempotencyRecordSchema);

export default IdempotencyRecord;
