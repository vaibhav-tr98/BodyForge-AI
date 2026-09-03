import AIAnalysisCache, { IAIAnalysisCache } from "../models/AIAnalysisCache";
import { Types } from "mongoose";

interface FindCacheParams {
  userId: string;
  date: string;
  type: string;
  inputHash: string;
}

interface SaveCacheParams {
  userId: string;
  date: string;
  type: string;
  inputHash: string;
  result: unknown;
  model: string;
  expiresAt: Date;
}

class AIAnalysisCacheRepository {
  /**
   * Find a valid (non-expired) cache entry matching all four key fields.
   * Returns the most recently created entry if multiple exist, or null if none.
   */
  async findValid(params: FindCacheParams): Promise<IAIAnalysisCache | null> {
    const { userId, date, type, inputHash } = params;
    return AIAnalysisCache.findOne({
      userId: new Types.ObjectId(userId),
      date,
      type,
      inputHash,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
  }

  /**
   * Upsert a cache entry keyed on { userId, date, type, inputHash }.
   * Returns the saved/updated document.
   */
  async save(params: SaveCacheParams): Promise<IAIAnalysisCache> {
    const { userId, date, type, inputHash, result, model, expiresAt } = params;
    const filter = {
      userId: new Types.ObjectId(userId),
      date,
      type,
      inputHash,
    };
    const update = {
      $set: {
        result,
        modelName: model,
        expiresAt,
      },
    };
    const saved = await AIAnalysisCache.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
    });
    // findOneAndUpdate with upsert always returns a document when new: true
    return saved as IAIAnalysisCache;
  }
}

export const aiAnalysisCacheRepository = new AIAnalysisCacheRepository();
export default aiAnalysisCacheRepository;
