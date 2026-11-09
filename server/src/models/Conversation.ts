import { Document, Schema, Types, model } from "mongoose";

export interface IConversation extends Document {
  userId: Types.ObjectId;
  title: string;
  lastMessageAt: Date;
  summary?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      default: "New Conversation",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    summary: {
      type: String,
      trim: true,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal queries
conversationSchema.index({ userId: 1, lastMessageAt: -1 });
conversationSchema.index({ userId: 1, _id: 1 });

const Conversation = model<IConversation>("Conversation", conversationSchema);

export { Conversation };
export default Conversation;
