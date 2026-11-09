import mongoose from "mongoose";
import { KnowledgeDocument, KnowledgeCategory } from "../models/KnowledgeDocument";
import { KnowledgeChunk, EXPECTED_EMBEDDING_DIMENSIONS } from "../models/KnowledgeChunk";
import { knowledgeIngestionService } from "./knowledgeIngestion.service";
import {
  knowledgeRetrievalService,
  cosineSimilarity,
  RetrievedChunk,
} from "./knowledgeRetrieval.service";
import { AIProvider } from "./aiProvider.service";

// Mock AIProvider embeddings
jest.mock("./aiProvider.service", () => {
  const actual = jest.requireActual("./aiProvider.service");
  return {
    ...actual,
    AIProvider: {
      ...actual.AIProvider,
      generateEmbedding: jest.fn(),
      generateEmbeddings: jest.fn(),
    },
  };
});

function make768Vector(prefix: number[]): number[] {
  const vec = new Array(EXPECTED_EMBEDDING_DIMENSIONS).fill(0);
  for (let i = 0; i < prefix.length; i++) {
    vec[i] = prefix[i];
  }
  return vec;
}

describe("Fitness Knowledge RAG — Ingestion & Retrieval (M3.3)", () => {
  const testMongoUri = "mongodb://127.0.0.1:27017/bodyforge_test_knowledge";

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(testMongoUri);
    }
    await KnowledgeDocument.deleteMany({});
    await KnowledgeChunk.deleteMany({});
  });

  afterAll(async () => {
    await KnowledgeDocument.deleteMany({});
    await KnowledgeChunk.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    knowledgeRetrievalService.clearCache();
    await KnowledgeDocument.deleteMany({});
    await KnowledgeChunk.deleteMany({});
  });

  describe("Cosine Similarity Vector Math", () => {
    it("should return 1.0 for identical non-zero vectors", () => {
      const vecA = make768Vector([0.6, 0.8, 0.0]);
      const vecB = make768Vector([0.6, 0.8, 0.0]);
      const sim = cosineSimilarity(vecA, vecB);
      expect(sim).toBeCloseTo(1.0, 5);
    });

    it("should return 0.0 for orthogonal vectors", () => {
      const vecA = make768Vector([1.0, 0.0, 0.0]);
      const vecB = make768Vector([0.0, 1.0, 0.0]);
      const sim = cosineSimilarity(vecA, vecB);
      expect(sim).toBeCloseTo(0.0, 5);
    });

    it("should return -1.0 for perfectly opposite vectors", () => {
      const vecA = make768Vector([1.0, 0.0]);
      const vecB = make768Vector([-1.0, 0.0]);
      const sim = cosineSimilarity(vecA, vecB);
      expect(sim).toBeCloseTo(-1.0, 5);
    });

    it("should return 0.0 for mismatched vector dimensions or empty inputs", () => {
      expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
      expect(cosineSimilarity([], [])).toBe(0);
      expect(cosineSimilarity(null as any, [1, 2])).toBe(0);
    });

    it("should return 0.0 for all-zero vectors without NaN division", () => {
      const sim = cosineSimilarity(make768Vector([0, 0]), make768Vector([1, 1]));
      expect(sim).toBe(0);
      expect(Number.isNaN(sim)).toBe(false);
    });

    it("should return 0.0 when vectors contain NaN or Infinity", () => {
      const vecWithNaN = make768Vector([NaN, 1]);
      const vecWithInf = make768Vector([Infinity, 1]);
      const normalVec = make768Vector([1, 1]);

      expect(cosineSimilarity(vecWithNaN, normalVec)).toBe(0);
      expect(cosineSimilarity(vecWithInf, normalVec)).toBe(0);
    });
  });

  describe("Knowledge Ingestion Service", () => {
    it("should chunk long content into segments with appropriate character limits", () => {
      const longText =
        "The mechanisms of muscle hypertrophy are primarily driven by mechanical tension. " +
        "When an athlete performs a resistance exercise through a full range of motion, " +
        "the muscle fibers experience mechanical deformation that stimulates signaling cascades. " +
        "Secondary factors include metabolic stress and muscle damage, although mechanical tension remains dominant. " +
        "Volume is the primary variable that can be manipulated over time to continue stimulating adaptation.";

      const chunks = knowledgeIngestionService.chunkText(longText, 600, 80);
      expect(chunks.length).toBeGreaterThan(0);
      for (const chunk of chunks) {
        expect(chunk.length).toBeLessThanOrEqual(600);
      }
    });

    it("should reject document ingestion when required fields are missing or invalid", async () => {
      await expect(
        knowledgeIngestionService.ingestDocument({
          title: "",
          category: "training",
          source: "Test",
          content: "Valid content that is long enough to meet fifty character minimum threshold.",
        })
      ).rejects.toThrow("Document title is required");

      await expect(
        knowledgeIngestionService.ingestDocument({
          title: "Valid Title",
          category: "invalid_category" as any,
          source: "Test",
          content: "Valid content that is long enough to meet fifty character minimum threshold.",
        })
      ).rejects.toThrow("Invalid knowledge category");

      await expect(
        knowledgeIngestionService.ingestDocument({
          title: "Valid Title",
          category: "training",
          source: "Test",
          content: "   ",
        })
      ).rejects.toThrow("Document content must be at least 50 characters");
    });

    it("should reject document ingestion when embeddings do not match 768 dimensions", async () => {
      // Mock returning a 512-dimensional vector instead of 768
      (AIProvider.generateEmbeddings as jest.Mock).mockResolvedValue([new Array(512).fill(0.1)]);

      await expect(
        knowledgeIngestionService.ingestDocument({
          title: "Invalid Dimensions Document",
          category: "training",
          source: "Test Source",
          content: "Valid content that is long enough to meet fifty character minimum threshold.",
        })
      ).rejects.toThrow("expected 768 finite floats");
    });

    it("should ingest a document, generate embeddings, and persist chunks idempotently", async () => {
      (AIProvider.generateEmbeddings as jest.Mock).mockImplementation(async (texts: string[]) =>
        texts.map(() => make768Vector([0.1, 0.1]))
      );

      const docInput = {
        title: "Hypertrophy Volume Landmarks",
        category: "training" as KnowledgeCategory,
        source: "Dr. Mike Israetel, Renaissance Periodization",
        sourceUrl: "https://rpstrength.com/hypertrophy-landmarks",
        license: "Educational Summary",
        content:
          "Maintenance volume (MV) is the minimum training volume required to preserve muscle mass. " +
          "Minimum effective volume (MEV) is the amount of training required to initiate measurable gains. " +
          "Maximum adaptive volume (MAV) is the sweet spot where the greatest rate of gains occurs. " +
          "Maximum recoverable volume (MRV) is the upper threshold beyond which systemic fatigue outpaces recovery.",
      };

      const result = await knowledgeIngestionService.ingestDocument(docInput);

      expect(result.document).toBeDefined();
      expect(result.document.version).toBe(1);
      expect(result.document.status).toBe("active");
      expect(result.document.embeddingModel).toBe("text-embedding-004");
      expect(result.chunksCount).toBeGreaterThanOrEqual(1);

      // Verify in MongoDB
      const savedDoc = await KnowledgeDocument.findById(result.document._id);
      expect(savedDoc).not.toBeNull();
      expect(savedDoc?.title).toBe("Hypertrophy Volume Landmarks");

      const savedChunks = await KnowledgeChunk.find({ documentId: result.document._id });
      expect(savedChunks.length).toBe(result.chunksCount);
      expect(savedChunks[0].embedding.length).toBe(768);
      expect(savedChunks[0].status).toBe("active");
      expect(savedChunks[0].embeddingModel).toBe("text-embedding-004");

      // Test Idempotent Re-Ingestion (updating the same document with new content)
      const updateResult = await knowledgeIngestionService.ingestDocument({
        ...docInput,
        content: "Updated content with new guidelines on MRV and deloading that satisfies the 50 char minimum.",
      });

      expect(updateResult.document.version).toBe(2);
      expect(updateResult.document._id.toString()).toBe(result.document._id.toString());

      // Only version 2 chunks should be active
      const activeChunks = await KnowledgeChunk.find({
        documentId: result.document._id,
        status: "active",
      });
      for (const chunk of activeChunks) {
        expect(chunk.version).toBe(2);
      }
    });

    it("should reject concurrent ingestion of the exact same document title", async () => {
      (AIProvider.generateEmbeddings as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([make768Vector([0.1])]), 100))
      );

      const docInput = {
        title: "Concurrent Ingestion Test",
        category: "training" as KnowledgeCategory,
        source: "Test",
        content: "Valid content for testing single-flight ingestion locking mechanism.",
      };

      const p1 = knowledgeIngestionService.ingestDocument(docInput);
      const p2 = knowledgeIngestionService.ingestDocument(docInput);

      await expect(p2).rejects.toThrow("Ingestion already in progress");
      await p1; // p1 should succeed
    });
  });

  describe("Knowledge Retrieval Service", () => {
    let docId: mongoose.Types.ObjectId;

    beforeEach(async () => {
      const doc = await KnowledgeDocument.create({
        title: "Bench Press Biomechanics",
        category: "exercise",
        source: "Greg Nuckols, Stronger by Science",
        content: "Bench press bar path should follow a slight diagonal curve.",
        version: 1,
        status: "active",
        embeddingModel: "text-embedding-004",
      });
      docId = doc._id;

      // Chunk 1: Vector pointing mostly along axis 0
      await KnowledgeChunk.create({
        documentId: doc._id,
        chunkIndex: 0,
        content: "The optimal barbell bench press bar path curves back over the shoulders at lockout.",
        category: "exercise",
        embedding: make768Vector([0.95, 0.05]),
        sourceMetadata: {
          title: "Bench Press Biomechanics",
          source: "Greg Nuckols, Stronger by Science",
        },
        version: 1,
        status: "active",
        embeddingModel: "text-embedding-004",
      });

      // Chunk 2: Vector pointing along axis 1
      await KnowledgeChunk.create({
        documentId: doc._id,
        chunkIndex: 1,
        content: "Tuck elbows to approximately 45 to 70 degrees to protect the anterior glenohumeral joint.",
        category: "exercise",
        embedding: make768Vector([0.1, 0.85]),
        sourceMetadata: {
          title: "Bench Press Biomechanics",
          source: "Greg Nuckols, Stronger by Science",
        },
        version: 1,
        status: "active",
        embeddingModel: "text-embedding-004",
      });

      // Chunk 3: Different category ('nutrition')
      const docNutr = await KnowledgeDocument.create({
        title: "Protein Timing",
        category: "nutrition",
        source: "ISSN Stand",
        content: "Distribute protein evenly every 3 to 4 hours.",
        version: 1,
        status: "active",
        embeddingModel: "text-embedding-004",
      });

      await KnowledgeChunk.create({
        documentId: docNutr._id,
        chunkIndex: 0,
        content: "Dosing 0.4g/kg protein per meal stimulates repeated muscle protein synthesis.",
        category: "nutrition",
        embedding: make768Vector([0.95, 0.05]),
        sourceMetadata: {
          title: "Protein Timing",
          source: "ISSN Stand",
        },
        version: 1,
        status: "active",
        embeddingModel: "text-embedding-004",
      });
    });

    it("should retrieve chunks ranked by cosine similarity and filter by confidence threshold", async () => {
      (AIProvider.generateEmbedding as jest.Mock).mockResolvedValue(make768Vector([1, 0]));

      const result = await knowledgeRetrievalService.retrieveKnowledge("What is the bench press bar path?", {
        minSimilarity: 0.65,
        topK: 5,
      });

      expect(result.isGrounded).toBe(true);
      expect(result.chunks.length).toBeGreaterThanOrEqual(1);

      // The highest similarity chunk should be first
      expect(result.chunks[0].similarity).toBeGreaterThan(0.9);
      expect(result.chunks[0].content).toContain("optimal barbell bench press bar path curves back");

      // Verify that Chunk 2 (low similarity) was filtered out (< 0.65)
      const chunk2Found = result.chunks.some((c) => c.content.includes("Tuck elbows"));
      expect(chunk2Found).toBe(false);
    });

    it("should enforce category filter during retrieval", async () => {
      (AIProvider.generateEmbedding as jest.Mock).mockResolvedValue(make768Vector([1, 0]));

      const result = await knowledgeRetrievalService.retrieveKnowledge("protein timing", {
        category: "nutrition",
        minSimilarity: 0.65,
      });

      expect(result.isGrounded).toBe(true);
      expect(result.chunks.length).toBe(1);
      expect(result.chunks[0].category).toBe("nutrition");
      expect(result.chunks[0].source.title).toBe("Protein Timing");
    });

    it("should not return chunks embedded with a different model identity", async () => {
      // Chunk with incompatible model identity
      await KnowledgeChunk.create({
        documentId: docId,
        chunkIndex: 99,
        content: "Incompatible legacy chunk that should never enter retrieval.",
        category: "exercise",
        embedding: make768Vector([1, 0]),
        sourceMetadata: {
          title: "Legacy Document",
          source: "Legacy",
        },
        version: 1,
        status: "active",
        embeddingModel: "legacy-embedding-model-v0",
      });

      (AIProvider.generateEmbedding as jest.Mock).mockResolvedValue(make768Vector([1, 0]));

      const result = await knowledgeRetrievalService.retrieveKnowledge("any query", {
        category: "exercise",
        minSimilarity: 0.65,
      });

      const legacyFound = result.chunks.some((c) => c.content.includes("Incompatible legacy chunk"));
      expect(legacyFound).toBe(false);
    });

    it("should reject query embeddings that do not match 768 dimensions", async () => {
      // Return 512-dim query embedding
      (AIProvider.generateEmbedding as jest.Mock).mockResolvedValue(new Array(512).fill(0.1));

      const result = await knowledgeRetrievalService.retrieveKnowledge("Mismatched dimensions");

      expect(result.isGrounded).toBe(false);
      expect(result.chunks).toEqual([]);
      expect(result.error).toContain("dimension mismatch");
    });

    it("should bound the results to topK", async () => {
      (AIProvider.generateEmbedding as jest.Mock).mockResolvedValue(make768Vector([1, 0]));

      const result = await knowledgeRetrievalService.retrieveKnowledge("general inquiry", {
        minSimilarity: 0.1,
        topK: 1,
      });

      expect(result.chunks.length).toBe(1);
    });

    it("should use in-memory cache for repeated query embeddings", async () => {
      (AIProvider.generateEmbedding as jest.Mock).mockResolvedValue(make768Vector([1, 0]));

      await knowledgeRetrievalService.retrieveKnowledge("Repeated query test");
      expect(AIProvider.generateEmbedding).toHaveBeenCalledTimes(1);

      // Second call with same text should hit cache
      await knowledgeRetrievalService.retrieveKnowledge("repeated query test");
      expect(AIProvider.generateEmbedding).toHaveBeenCalledTimes(1);
    });

    it("should gracefully return empty ungrounded result if embedding provider fails", async () => {
      (AIProvider.generateEmbedding as jest.Mock).mockRejectedValue(new Error("Gemini API network timeout"));

      const result = await knowledgeRetrievalService.retrieveKnowledge("Any query that triggers error");

      expect(result.isGrounded).toBe(false);
      expect(result.chunks).toEqual([]);
      expect(result.error).toContain("Gemini API network timeout");
    });

    it("should format retrieved chunks into structured prompt evidence without duplicate source headings", () => {
      const mockChunks: RetrievedChunk[] = [
        {
          id: "c1",
          documentId: "d1",
          content: "Optimal weekly training volume is 10 to 20 hard sets per muscle group.",
          category: "training",
          similarity: 0.92,
          source: {
            title: "Dose-Response Hypertrophy",
            source: "Schoenfeld et al. (2017)",
            sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/27433960/",
          },
        },
        {
          id: "c2",
          documentId: "d1", // Same document, different chunk
          content: "Sets taken to 1 to 3 reps in reserve stimulate equivalent hypertrophy with less fatigue.",
          category: "training",
          similarity: 0.88,
          source: {
            title: "Dose-Response Hypertrophy",
            source: "Schoenfeld et al. (2017)",
            sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/27433960/",
          },
        },
      ];

      const formatted = knowledgeRetrievalService.formatRetrievedEvidenceForPrompt(mockChunks);

      expect(formatted).toContain("=== RETRIEVED KNOWLEDGE BASE EVIDENCE ===");
      // Should have [Source 1] exactly once
      expect(formatted.match(/\[Source 1\]/g)?.length).toBe(1);
      expect(formatted).not.toContain("[Source 2]"); // Since both chunks are from same doc
      expect(formatted).toContain("Evidence Excerpt (1/2):");
      expect(formatted).toContain("Evidence Excerpt (2/2):");
      expect(formatted).toContain("Schoenfeld et al. (2017)");
    });
  });
});
