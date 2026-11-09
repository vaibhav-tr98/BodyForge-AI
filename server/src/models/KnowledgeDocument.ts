import { Document, Schema, model } from "mongoose";

export type KnowledgeCategory = "training" | "exercise" | "nutrition" | "recovery" | "general";
export type KnowledgeDocumentStatus = "active" | "archived" | "draft";

export interface IKnowledgeDocument extends Document {
  title: string;
  category: KnowledgeCategory;
  source: string;
  sourceUrl?: string | null;
  license?: string | null;
  content: string;
  version: number;
  status: KnowledgeDocumentStatus;
  embeddingModel: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const knowledgeDocumentSchema = new Schema<IKnowledgeDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    category: {
      type: String,
      required: true,
      enum: ["training", "exercise", "nutrition", "recovery", "general"],
      index: true,
    },
    source: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    sourceUrl: {
      type: String,
      trim: true,
      default: null,
    },
    license: {
      type: String,
      trim: true,
      default: "Public / Educational Fair Use",
    },
    content: {
      type: String,
      required: true,
      minlength: 10,
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
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

knowledgeDocumentSchema.index({ category: 1, status: 1 });
knowledgeDocumentSchema.index({ title: 1, version: 1 }, { unique: true });

const KnowledgeDocument = model<IKnowledgeDocument>("KnowledgeDocument", knowledgeDocumentSchema);

export { KnowledgeDocument };
export default KnowledgeDocument;
