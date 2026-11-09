import { knowledgeRepository } from "../repositories/knowledge.repository";
import { KnowledgeCategory } from "../models/KnowledgeDocument";
import { EXPECTED_EMBEDDING_DIMENSIONS } from "../models/KnowledgeChunk";
import { AIProvider } from "./aiProvider.service";
import { env } from "../config/env";
import logger from "../utils/logger";

export interface RetrievedChunk {
  id: string;
  documentId: string;
  content: string;
  category: KnowledgeCategory;
  similarity: number;
  source: {
    title: string;
    source: string;
    sourceUrl?: string | null;
    license?: string | null;
  };
}

export interface RetrievalResult {
  query: string;
  isGrounded: boolean;
  chunks: RetrievedChunk[];
  latencyMs: number;
  error?: string;
}

export interface RetrievalOptions {
  category?: KnowledgeCategory;
  topK?: number;
  minSimilarity?: number;
  timeoutMs?: number;
}

/**
 * High-performance vector dot-product cosine similarity calculation.
 * Guaranteed to return finite float in [-1, 1] without NaN division or overflow.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA <= 0 || normB <= 0) {
    return 0;
  }

  const val = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  if (!Number.isFinite(val)) {
    return 0;
  }

  return Math.max(-1, Math.min(1, val));
}

class KnowledgeRetrievalService {
  // Query embedding cache to avoid redundant API billing and latency
  private embeddingCache = new Map<string, { embedding: number[]; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  private getCachedEmbedding(text: string): number[] | null {
    const key = text.trim().toLowerCase();
    const entry = this.embeddingCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.embeddingCache.delete(key);
      return null;
    }
    return entry.embedding;
  }

  private setCachedEmbedding(text: string, embedding: number[]): void {
    const key = text.trim().toLowerCase();
    // Keep cache bounded to 500 entries
    if (this.embeddingCache.size >= 500) {
      const firstKey = this.embeddingCache.keys().next().value;
      if (firstKey) this.embeddingCache.delete(firstKey);
    }
    this.embeddingCache.set(key, {
      embedding,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });
  }

  public clearCache(): void {
    this.embeddingCache.clear();
  }

  /**
   * Embed query string with LRU caching.
   */
  public async embedQuery(query: string, abortSignal?: AbortSignal): Promise<number[]> {
    const cached = this.getCachedEmbedding(query);
    if (cached) {
      return cached;
    }

    const embedding = await AIProvider.generateEmbedding(query, abortSignal);
    this.setCachedEmbedding(query, embedding);
    return embedding;
  }

  /**
   * Search knowledge base using vector similarity against persistent MongoDB chunks.
   * Resilient with strict timeouts, confidence thresholds, and graceful degradation.
   */
  public async retrieveKnowledge(
    query: string,
    options?: RetrievalOptions
  ): Promise<RetrievalResult> {
    const startTime = Date.now();
    const trimmedQuery = query?.trim();

    if (!trimmedQuery) {
      return {
        query: "",
        isGrounded: false,
        chunks: [],
        latencyMs: 0,
      };
    }

    const topK = Math.min(options?.topK || 3, 5);
    const minSimilarity = options?.minSimilarity ?? 0.65;
    const timeoutMs = options?.timeoutMs ?? 3500;

    let timer: NodeJS.Timeout | null = null;
    const abortController = new AbortController();

    const searchPromise = (async (): Promise<RetrievalResult> => {
      // 1. Generate query embedding with abort signal support
      const queryEmbedding = await this.embedQuery(trimmedQuery, abortController.signal);

      // Validate 768-dimensional query embedding
      if (
        !Array.isArray(queryEmbedding) ||
        queryEmbedding.length !== EXPECTED_EMBEDDING_DIMENSIONS ||
        !queryEmbedding.every(Number.isFinite)
      ) {
        throw new Error(
          `Query embedding dimension mismatch: expected ${EXPECTED_EMBEDDING_DIMENSIONS} finite floats`
        );
      }

      // 2. Fetch persistent chunks matching category/status/model filter
      const activeChunks = await knowledgeRepository.findActiveChunks({
        category: options?.category,
        embeddingModel: env.embeddingModel || "text-embedding-004",
      });

      if (!activeChunks || activeChunks.length === 0) {
        return {
          query: trimmedQuery,
          isGrounded: false,
          chunks: [],
          latencyMs: Date.now() - startTime,
        };
      }

      // 3. Score chunks by cosine similarity
      const scored: RetrievedChunk[] = [];
      for (const chunk of activeChunks) {
        if (!chunk.embedding || chunk.embedding.length !== queryEmbedding.length) {
          continue;
        }
        const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);

        if (similarity >= minSimilarity) {
          scored.push({
            id: (chunk._id || (chunk as any).id).toString(),
            documentId: chunk.documentId.toString(),
            content: chunk.content,
            category: chunk.category,
            similarity,
            source: {
              title: chunk.sourceMetadata.title,
              source: chunk.sourceMetadata.source,
              sourceUrl: chunk.sourceMetadata.sourceUrl,
              license: chunk.sourceMetadata.license,
            },
          });
        }
      }

      // 4. Sort by highest similarity and slice top-k
      scored.sort((a, b) => b.similarity - a.similarity);
      const topChunks = scored.slice(0, topK);

      const latencyMs = Date.now() - startTime;
      logger.info(`Vector retrieval completed in ${latencyMs}ms with ${topChunks.length} chunks.`, {
        query: trimmedQuery.slice(0, 40),
        topSimilarity: topChunks[0]?.similarity.toFixed(3),
      });

      return {
        query: trimmedQuery,
        isGrounded: topChunks.length > 0,
        chunks: topChunks,
        latencyMs,
      };
    })();

    // Apply strict timeout with explicit timer cleanup and abort signal
    const timeoutPromise = new Promise<RetrievalResult>((resolve) => {
      timer = setTimeout(() => {
        abortController.abort();
        resolve({
          query: trimmedQuery,
          isGrounded: false,
          chunks: [],
          latencyMs: timeoutMs,
          error: "Retrieval query timed out",
        });
      }, timeoutMs);
      if (timer.unref) {
        timer.unref();
      }
    });

    try {
      return await Promise.race([searchPromise, timeoutPromise]);
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.warn(`Knowledge retrieval failed gracefully (${latencyMs}ms): ${errorMsg}`);

      return {
        query: trimmedQuery,
        isGrounded: false,
        chunks: [],
        latencyMs,
        error: errorMsg,
      };
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  /**
   * Format retrieved chunks for prompt injection with explicit citations.
   * Groups excerpts under unique document headers to prevent duplicate source numbers.
   */
  public formatRetrievedEvidenceForPrompt(chunks: RetrievedChunk[]): string {
    if (!chunks || chunks.length === 0) return "";

    const lines: string[] = [];
    lines.push("=== RETRIEVED KNOWLEDGE BASE EVIDENCE ===");
    lines.push(
      "The following evidence was retrieved from the BodyForge verified sports science library. Cite these sources by title when explaining technical principles."
    );

    // Group chunks by documentId to prevent duplicate source numbers
    const grouped = new Map<string, RetrievedChunk[]>();
    for (const chunk of chunks) {
      const list = grouped.get(chunk.documentId) || [];
      list.push(chunk);
      grouped.set(chunk.documentId, list);
    }

    let sourceIdx = 1;
    for (const [, docChunks] of grouped.entries()) {
      const first = docChunks[0];
      lines.push(
        `\n[Source ${sourceIdx}]: "${first.source.title}" (${first.category.toUpperCase()}) — ${first.source.source}`
      );
      if (first.source.sourceUrl) {
        lines.push(`URL: ${first.source.sourceUrl}`);
      }
      for (let i = 0; i < docChunks.length; i++) {
        const prefix =
          docChunks.length > 1
            ? `Evidence Excerpt (${i + 1}/${docChunks.length}):`
            : "Evidence Excerpt:";
        lines.push(`${prefix}\n"${docChunks[i].content}"`);
      }
      sourceIdx++;
    }

    return lines.join("\n");
  }
}

export const knowledgeRetrievalService = new KnowledgeRetrievalService();
export default knowledgeRetrievalService;
