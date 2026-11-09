import mongoose from "mongoose";
import { knowledgeRepository } from "../repositories/knowledge.repository";
import { IKnowledgeDocument, KnowledgeCategory, KnowledgeDocumentStatus } from "../models/KnowledgeDocument";
import KnowledgeChunk, { IKnowledgeChunk, EXPECTED_EMBEDDING_DIMENSIONS } from "../models/KnowledgeChunk";
import { AIProvider } from "./aiProvider.service";
import logger from "../utils/logger";
import { AppError } from "../errors/AppError";
import { env } from "../config/env";

export interface IngestionDocumentInput {
  title: string;
  category: KnowledgeCategory;
  source: string;
  sourceUrl?: string;
  license?: string;
  content: string;
  version?: number;
  status?: KnowledgeDocumentStatus;
}

export class KnowledgeIngestionService {
  private inFlightIngestions = new Set<string>();
  /**
   * Normalize input text to consistent utf-8 whitespace and line endings.
   */
  public normalizeText(text: string): string {
    if (!text || typeof text !== "string") return "";
    return text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n\s*\n+/g, "\n\n")
      .trim();
  }

  /**
   * Split document into semantically cohesive, bounded text chunks on sentence/paragraph boundaries.
   */
  public chunkText(text: string, maxChunkLength: number = 600, overlap: number = 80): string[] {
    const normalized = this.normalizeText(text);
    if (!normalized) return [];

    if (normalized.length <= maxChunkLength) {
      return [normalized];
    }

    // Split on double newlines (paragraphs) first
    const paragraphs = normalized.split(/\n\n+/);
    const chunks: string[] = [];
    let currentChunk = "";

    for (const paragraph of paragraphs) {
      const p = paragraph.trim();
      if (!p) continue;

      if (p.length > maxChunkLength) {
        // Paragraph itself exceeds maxChunkLength, split by sentences
        const sentences = p.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [p];
        for (const sentence of sentences) {
          const s = sentence.trim();
          if (!s) continue;

          if ((currentChunk + " " + s).trim().length <= maxChunkLength) {
            currentChunk = (currentChunk + " " + s).trim();
          } else {
            if (currentChunk) {
              chunks.push(currentChunk);
              // Take overlap tail
              const tail = currentChunk.slice(-overlap);
              currentChunk = (tail + " " + s).trim();
            } else {
              // Standalone long sentence
              chunks.push(s);
              currentChunk = "";
            }
          }
        }
      } else {
        if ((currentChunk + "\n\n" + p).trim().length <= maxChunkLength) {
          currentChunk = (currentChunk + "\n\n" + p).trim();
        } else {
          if (currentChunk) {
            chunks.push(currentChunk);
            const tail = currentChunk.slice(-overlap);
            currentChunk = (tail + "\n\n" + p).trim();
          } else {
            currentChunk = p;
          }
        }
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Ingest a versioned document, compute embeddings, and store chunks idempotently.
   */
  public async ingestDocument(
    input: IngestionDocumentInput
  ): Promise<{ document: IKnowledgeDocument; chunksCount: number; isUpdated: boolean }> {
    // 1. Validation
    const title = input.title?.trim();
    if (!title) {
      throw new AppError("Document title is required", 400);
    }

    if (this.inFlightIngestions.has(title)) {
      throw new AppError(`Ingestion already in progress for document: "${title}"`, 409);
    }
    this.inFlightIngestions.add(title);

    try {
    const source = input.source?.trim();
    if (!source) {
      throw new AppError("Document source is required", 400);
    }
    const content = this.normalizeText(input.content);
    if (!content || content.length < 50) {
      throw new AppError("Document content must be at least 50 characters", 400);
    }

    const VALID_CATEGORIES: KnowledgeCategory[] = [
      "training",
      "exercise",
      "nutrition",
      "recovery",
      "general",
    ];
    if (input.category && !VALID_CATEGORIES.includes(input.category)) {
      throw new AppError("Invalid knowledge category", 400);
    }

    const version = input.version || 1;
    const category = input.category || "general";
    const status = input.status || "active";

    // 2. Check existing document for idempotency
    const existingDoc = await knowledgeRepository.findDocumentByTitleAndVersion(title, version);

    if (existingDoc && existingDoc.content === content) {
      logger.info("Knowledge document already ingested with identical content. Skipping re-embedding.", {
        title,
        version,
      });
      const activeChunks = await knowledgeRepository.findActiveChunks({ category });
      const docChunks = activeChunks.filter(
        (c) => c.documentId.toString() === existingDoc._id.toString()
      );
      return { document: existingDoc, chunksCount: docChunks.length, isUpdated: false };
    }

    // 3. Chunk content
    const chunks = this.chunkText(content, 600, 80);
    if (chunks.length === 0) {
      throw new AppError("Failed to produce text chunks from document", 400);
    }

    logger.info(`Generating embeddings for document "${title}" across ${chunks.length} chunks...`);

    const embeddingModel = env.embeddingModel || "text-embedding-004";

    // 4. Generate embeddings via AIProvider (in batches)
    let embeddings: number[][];
    try {
      embeddings = await AIProvider.generateEmbeddings(chunks);
    } catch (err: unknown) {
      logger.error("Failed to generate embeddings for knowledge document", {
        title,
        error: err instanceof Error ? err.message : String(err),
      });
      throw new AppError("Embedding provider failed during ingestion", 502);
    }

    if (embeddings.length !== chunks.length) {
      throw new AppError("Embedding count mismatch during ingestion", 500);
    }

    // Validate 768-dimensional float embeddings
    for (let i = 0; i < embeddings.length; i++) {
      const vec = embeddings[i];
      if (
        !Array.isArray(vec) ||
        vec.length !== EXPECTED_EMBEDDING_DIMENSIONS ||
        !vec.every(Number.isFinite)
      ) {
        throw new AppError(
          `Chunk ${i} embedding failed validation: expected ${EXPECTED_EMBEDDING_DIMENSIONS} finite floats`,
          500
        );
      }
    }

    // 5. Database persistence with two-phase draft staging
    // Note: Standalone MongoDB deployments do not support multi-document replica-set transactions.
    // Atomicity is not claimed; instead, reliability is guaranteed via draft-staging:
    // chunks are inserted first in draft status, ensuring incomplete versions cannot become active.
    const targetVersion = existingDoc
      ? input.version || (existingDoc.version || 1) + 1
      : version;

    let savedDoc: IKnowledgeDocument;
    if (existingDoc) {
      existingDoc.content = content;
      existingDoc.source = source;
      existingDoc.sourceUrl = input.sourceUrl || null;
      existingDoc.license = input.license || "Public / Educational Fair Use";
      existingDoc.version = targetVersion;
      existingDoc.embeddingModel = embeddingModel;
      existingDoc.status = "draft";
      savedDoc = (await existingDoc.save()) as IKnowledgeDocument;
    } else {
      savedDoc = await knowledgeRepository.createDocument({
        title,
        category,
        source,
        sourceUrl: input.sourceUrl || null,
        license: input.license || "Public / Educational Fair Use",
        content,
        version: targetVersion,
        status: "draft",
        embeddingModel,
      });
    }

    const chunkRecords: Array<Partial<IKnowledgeChunk>> = chunks.map((chunkText, idx) => ({
      documentId: savedDoc._id,
      chunkIndex: idx,
      content: chunkText,
      embedding: embeddings[idx],
      category,
      sourceMetadata: {
        title,
        source,
        sourceUrl: input.sourceUrl || null,
        license: input.license || "Public / Educational Fair Use",
      },
      version: savedDoc.version,
      status: "draft",
      embeddingModel,
      tokenCount: Math.ceil(chunkText.length / 4),
    }));

    try {
      // If updating, remove old version chunks before writing new version
      if (existingDoc) {
        await knowledgeRepository.deleteChunksByDocumentId(savedDoc._id.toString());
      }
      await knowledgeRepository.insertChunks(chunkRecords);

      // Promote both chunks and document to active status together
      await KnowledgeChunk.updateMany(
        { documentId: savedDoc._id, version: savedDoc.version },
        { status: "active" }
      );
      savedDoc.status = status;
      await savedDoc.save();
    } catch (insertErr) {
      // Rollback: delete draft chunks and mark document archived so incomplete versions never become active
      await knowledgeRepository.deleteChunksByDocumentId(savedDoc._id.toString());
      savedDoc.status = "archived";
      await savedDoc.save();
      logger.error("Chunk persistence failed during ingestion; rolled back draft chunks and marked document archived", {
        title,
        version: targetVersion,
        error: insertErr instanceof Error ? insertErr.message : String(insertErr),
      });
      throw insertErr;
    }

    logger.info(`Successfully ingested "${title}" with ${chunks.length} chunks.`);

    return {
      document: savedDoc,
      chunksCount: chunks.length,
      isUpdated: !!existingDoc,
    };
    } finally {
      this.inFlightIngestions.delete(title);
    }
  }

  /**
   * Seed curated initial fitness knowledge documents covering key evidence-based domains.
   */
  public async seedCuratedKnowledge(): Promise<{ totalDocuments: number; totalChunks: number }> {
    const curatedDocs: IngestionDocumentInput[] = [
      {
        title: "Hypertrophy and Progressive Overload Fundamentals",
        category: "training",
        source: "Schoenfeld BJ. The Mechanisms of Muscle Hypertrophy. Sports Med (2010); NSCA Essentials of Strength Training",
        sourceUrl: "https://journals.lww.com/nsca-scj/fulltext/2010/10000/the_mechanisms_of_muscle_hypertrophy_and_their.4.aspx",
        content: `Muscular hypertrophy is primarily driven by three mechanisms: mechanical tension, metabolic stress, and muscle damage. Mechanical tension is the foremost driver of muscle growth. It occurs when a muscle contracts against resistance through a full range of motion, with high motor unit recruitment.

Progressive overload is the systematic increase in stress placed on the musculoskeletal system over time. Progressive overload can be accomplished through several methods:
1. Increasing external load (weight) while maintaining proper form and repetition targets.
2. Increasing repetitions with a constant load within the hypertrophy range (typically 6 to 30 repetitions taken close to failure, 1-3 Reps in Reserve / RIR).
3. Increasing the number of challenging working sets (weekly volume, typically 10 to 20 sets per muscle group per week for trained individuals).
4. Improving execution, tempo, control, and range of motion under the same load.

When progression stalls on a compound lift, the most common causes are accumulated systemic fatigue, insufficient caloric or protein intake, inadequate inter-set rest intervals (less than 2-3 minutes on compound lifts), or technical breakdown leading to inefficient force transfer.`,
      },
      {
        title: "Biomechanics and Technical Execution of the Barbell Bench Press",
        category: "exercise",
        source: "NSCA Guide to Exercise Technique; Powerlifting Biomechanics Standards",
        sourceUrl: "https://www.nsca.com/education/articles/kinetic-pe-biomechanics-bench-press/",
        content: `The barbell bench press is a multi-joint upper body push exercise targeting the pectoralis major, anterior deltoids, and triceps brachii.

Key technical setup and execution principles:
1. Five-point contact: Keep both feet firmly planted on the floor, buttocks flat on the bench, upper back firmly pinned into the pad, and the head resting naturally on the bench.
2. Scapular retraction and depression: Retract (pinch together) and depress (pull down toward the hips) the scapulae to create a stable, solid base of support and protect the anterior shoulder joint.
3. Grip width and wrist alignment: Grip the bar slightly wider than shoulder width so that forearms are vertical to the floor at the bottom of the movement. Keep wrists stacked directly over forearms without excessive extension.
4. Bar path: The optimal bar path in the bench press is curved (a 'J-curve'), not purely vertical. The bar lowers from above the shoulders to the lower sternum/nipple line, and presses back and upward toward the rack position over the shoulders.
5. Elbow flare: Maintain an elbow tuck angle of approximately 45 to 75 degrees relative to the torso during the descent. Avoid 90-degree flaring, which drastically increases subacromial impingement risk.`,
      },
      {
        title: "Biomechanics and Technical Execution of the Barbell Back Squat",
        category: "exercise",
        source: "Escamilla RF. Knee biomechanics of the dynamic squat exercise. Med Sci Sports Exerc; Starting Strength Standards",
        sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/11528346/",
        content: `The barbell back squat is a primary compound lower body movement engaging the quadriceps, gluteus maximus, adductor magnus, hamstrings, and erector spinae.

Setup and execution guidelines:
1. Bar placement: High-bar position rests across the upper trapezius; low-bar position rests across the rear deltoids below the spine of the scapula. Low-bar recruits greater posterior chain (hips and hamstrings), while high-bar demands greater knee flexion and quadriceps loading.
2. Stance and foot angle: Stance width is typically slightly wider than shoulder-width with toes angled outward 15 to 30 degrees to accommodate hip anatomy and prevent femoral acetabular impingement.
3. Descent and knee tracking: Initiate the descent by simultaneously breaking at the hips and knees. Knees must track in the exact same direction as the toes. Avoid knee valgus (caving inward), which stresses the medial collateral ligament.
4. Depth: Standard full depth requires the hip crease to descend clearly below the top of the patella ('parallel' or below) while preserving a neutral lumbar spine and avoiding severe posterior pelvic tilt ('butt wink').
5. Bracing: Create 360-degree intra-abdominal pressure using the Valsalva maneuver before initiating the descent.`,
      },
      {
        title: "Nutritional Guidelines for Muscle Hypertrophy and Resistance Training",
        category: "nutrition",
        source: "Jäger R, Kerksick CM et al. International Society of Sports Nutrition Position Stand: Protein and Exercise (2017)",
        sourceUrl: "https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8",
        content: `Protein intake is critical for muscle protein synthesis (MPS) and muscular adaptation. For resistance-trained individuals seeking muscle gain or fat loss with muscle retention, total daily protein intake should be between 1.6 g/kg and 2.2 g/kg (0.73 - 1.0 g/lb) of total body weight per day. During caloric deficits, protein targets may increase up to 2.3 - 3.1 g/kg of fat-free mass to prevent muscle catabolism.

Optimal protein distribution involves consuming 0.40 to 0.55 g/kg per meal across 3 to 5 evenly spaced meals throughout the day, each providing at least 2.5 to 3.0 g of leucine to maximally stimulate the mTOR pathway.

Energy balance:
- Muscle growth occurs most efficiently in a modest caloric surplus of 200 to 400 kcal/day (~10-15% above maintenance energy expenditure), which supports tissue synthesis without excessive fat gain.
- Training in an unplanned energy deficit significantly reduces muscle protein synthesis and diminishes strength progression on heavy compound lifts.
- Hydration and carbohydrate intake: Consume 4 to 7 g/kg/day of carbohydrates for heavy resistance training to replenish muscle glycogen stores and sustain workout intensity.`,
      },
      {
        title: "Fatigue Management, Deload Protocols, and Autoregulation",
        category: "recovery",
        source: "Helms ER et al. The Muscle and Strength Pyramid: Training; Zourdos MC. Novel Resistance Training Paradigms",
        sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/26620051/",
        content: `Training adaptations follow the Fitness-Fatigue Model: every training bout creates both fitness and fatigue. Because fatigue masks underlying fitness, accumulated fatigue over weeks of hard training causes performance plateaus and regression.

Signs of accumulated systemic fatigue:
1. Stagnating or declining weights on primary compound lifts for 2 or more consecutive weeks.
2. Elevated resting heart rate, disrupted sleep, or lack of training motivation.
3. Joint ache and prolonged localized muscle soreness beyond 72 hours post-workout.

Deloading protocols:
- A deload is a planned temporary reduction in training stress, typically scheduled every 4 to 8 weeks depending on training experience and intensity.
- Standard deload implementation: Reduce total training volume (number of sets) by 40% to 50%, while keeping intensity (load on the bar) near 80-85% of normal working weights.
- Autoregulation via RPE (Rating of Perceived Exertion) and RIR (Reps in Reserve): Ensure most training sets terminate at 1 to 3 RIR. Grinding every set to absolute muscular failure increases central nervous system fatigue disproportionately to additional hypertrophy gains.`,
      },
    ];

    let totalDocs = 0;
    let totalChunks = 0;

    for (const doc of curatedDocs) {
      try {
        const result = await this.ingestDocument(doc);
        totalDocs++;
        totalChunks += result.chunksCount;
      } catch (err: unknown) {
        logger.error(`Error during curated seed for "${doc.title}":`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { totalDocuments: totalDocs, totalChunks };
  }
}

export const knowledgeIngestionService = new KnowledgeIngestionService();
export default knowledgeIngestionService;
