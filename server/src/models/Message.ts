import { Document, Schema, Types, model } from "mongoose";

export type MessageRole = "system" | "user" | "assistant";

export interface IMessage extends Document {
  conversationId: Types.ObjectId;
  userId: Types.ObjectId;
  role: MessageRole;
  content: string;
  metadata?: {
    model?: string;
    tokens?: {
      prompt?: number;
      completion?: number;
      total?: number;
    };
    finishReason?: string;
    [key: string]: unknown;
  };
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["system", "user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 10000,
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

// Compound indexes for performant retrieval and user-isolated lookup
messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ userId: 1, conversationId: 1, createdAt: 1 });
messageSchema.index({ conversationId: 1, role: 1 });

const Message = model<IMessage>("Message", messageSchema);

export { Message };
export default Message;
