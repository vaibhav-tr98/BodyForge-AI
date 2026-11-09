import KnowledgeDocument, { IKnowledgeDocument } from "../models/KnowledgeDocument";
import KnowledgeChunk, { IKnowledgeChunk } from "../models/KnowledgeChunk";
import { Types, ClientSession } from "mongoose";
import { env } from "../config/env";

class KnowledgeRepository {
  async findDocumentByTitleAndVersion(
    title: string,
    version: number,
    session?: ClientSession
  ): Promise<IKnowledgeDocument | null> {
    return await KnowledgeDocument.findOne({ title, version }).session(session || null);
  }

  async findDocumentById(id: string, session?: ClientSession): Promise<IKnowledgeDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return await KnowledgeDocument.findById(id).session(session || null);
  }

  async createDocument(
    data: Partial<IKnowledgeDocument>,
    session?: ClientSession
  ): Promise<IKnowledgeDocument> {
    const doc = new KnowledgeDocument(data);
    return await doc.save({ session });
  }

  async updateDocument(
    id: string,
    update: Partial<IKnowledgeDocument>,
    session?: ClientSession
  ): Promise<IKnowledgeDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return await KnowledgeDocument.findByIdAndUpdate(id, update, { new: true, session });
  }

  async deleteChunksByDocumentId(documentId: string, session?: ClientSession): Promise<number> {
    if (!Types.ObjectId.isValid(documentId)) return 0;
    const result = await KnowledgeChunk.deleteMany({ documentId }, { session });
    return result.deletedCount || 0;
  }

  async insertChunks(
    chunks: Array<Partial<IKnowledgeChunk>>,
    session?: ClientSession
  ): Promise<IKnowledgeChunk[]> {
    if (chunks.length === 0) return [];
    return (await KnowledgeChunk.insertMany(chunks, { session })) as IKnowledgeChunk[];
  }

  async findActiveChunks(filter?: {
    category?: string;
    embeddingModel?: string;
  }): Promise<IKnowledgeChunk[]> {
    const query: { status: string; category?: string; embeddingModel: string } = {
      status: "active",
      embeddingModel: filter?.embeddingModel || env.embeddingModel || "text-embedding-004",
    };
    if (filter?.category && filter.category !== "general") {
      query.category = filter.category;
    }
    return (await KnowledgeChunk.find(query)
      .select("documentId chunkIndex content embedding category sourceMetadata version status embeddingModel")
      .lean()) as unknown as IKnowledgeChunk[];
  }

  async countDocuments(): Promise<number> {
    return await KnowledgeDocument.countDocuments();
  }

  async countChunks(): Promise<number> {
    return await KnowledgeChunk.countDocuments();
  }
}

export const knowledgeRepository = new KnowledgeRepository();
export default knowledgeRepository;
