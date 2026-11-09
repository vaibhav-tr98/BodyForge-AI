import { Document, Schema, Types, model } from "mongoose";
import { KnowledgeCategory } from "./KnowledgeDocument";

export type KnowledgeChunkStatus = "active" | "archived" | "draft";
export const EXPECTED_EMBEDDING_DIMENSIONS = 768;

export interface IKnowledgeChunkSourceMetadata {
  title: string;
  source: string;
  sourceUrl?: string | null;
  license?: string | null;
}

export interface IKnowledgeChunk extends Document {
  documentId: Types.ObjectId;
  chunkIndex: number;
  content: string;
  embedding: number[];
  category: KnowledgeCategory;
  sourceMetadata: IKnowledgeChunkSourceMetadata;
  version: number;
  status: KnowledgeChunkStatus;
  embeddingModel: string;
  tokenCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const knowledgeChunkSchema = new Schema<IKnowledgeChunk>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "KnowledgeDocument",
      required: true,
      index: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    embedding: {
      type: [Number],
      required: true,
      validate: {
        validator: function (v: number[]) {
          return (
            Array.isArray(v) &&
            v.length === EXPECTED_EMBEDDING_DIMENSIONS &&
            v.every(Number.isFinite)
          );
        },
        message: `Embedding must be a ${EXPECTED_EMBEDDING_DIMENSIONS}-dimensional array of finite numbers`,
      },
    },
    category: {
      type: String,
      required: true,
      enum: ["training", "exercise", "nutrition", "recovery", "general"],
      index: true,
    },
    sourceMetadata: {
      title: { type: String, required: true },
      source: { type: String, required: true },
      sourceUrl: { type: String, default: null },
      license: { type: String, default: null },
    },
    version: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "archived", "draft"],
      default: "active",
      index: true,
    },
    embeddingModel: {
      type: String,
      required: true,
      default: "text-embedding-004",
      trim: true,
      index: true,
    },
    tokenCount: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

knowledgeChunkSchema.index({ documentId: 1, chunkIndex: 1, version: 1 }, { unique: true });
knowledgeChunkSchema.index({ category: 1, status: 1, embeddingModel: 1 });

const KnowledgeChunk = model<IKnowledgeChunk>("KnowledgeChunk", knowledgeChunkSchema);

export { KnowledgeChunk };
export default KnowledgeChunk;
