import { AppError } from "../errors/AppError";
import conversationRepository from "../repositories/conversation.repository";
import messageRepository from "../repositories/message.repository";
import { IConversation } from "../models/Conversation";
import { IMessage } from "../models/Message";
import { AIProvider, classifyGeminiError } from "./aiProvider.service";
import { fitnessContextService } from "./fitnessContext.service";
import { buildCoachingCopilotPrompt } from "./prompts/coachingCopilot.prompt";
import { env } from "../config/env";
import logger from "../utils/logger";
import { routeKnowledgeQuery } from "../utils/ragRouter";
import { knowledgeRetrievalService } from "./knowledgeRetrieval.service";

export interface ConversationPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ClientMessageDTO {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface GenerateResponseOptions {
  stream?: boolean;
  onChunk?: (chunk: string) => Promise<void> | void;
  abortSignal?: AbortSignal;
}

export interface KnowledgeSourceDTO {
  title: string;
  category: string;
  source: string;
  sourceUrl?: string;
  documentId: string;
  chunkId: string;
  similarity: number;
}

export interface GenerateResponseResult {
  userMessage: ClientMessageDTO;
  assistantMessage: ClientMessageDTO;
  sources: KnowledgeSourceDTO[];
  metadata?: Record<string, unknown>;
}

class ConversationService {
  private inFlightGenerations = new Set<string>();

  /**
   * Deterministically generate a concise, human-friendly conversation title
   * from the user's initial message with clean word boundaries and a safe fallback.
   */
  public generateTitleFromContent(content: string): string {
    if (!content || typeof content !== "string") {
      return "New Conversation";
    }

    // Clean leading whitespace, markdown symbols, and newlines
    const cleaned = content
      .trim()
      .replace(/^[#*>\-`\s]+/, "")
      .replace(/\s+/g, " ");

    if (!cleaned || !/[a-zA-Z0-9]/.test(cleaned)) {
      return "New Conversation";
    }

    const maxLength = 45;
    if (cleaned.length <= maxLength) {
      return cleaned;
    }

    // Truncate at word boundary
    const truncated = cleaned.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > 20) {
      return `${truncated.slice(0, lastSpace)}...`;
    }

    return `${truncated}...`;
  }

  /**
   * Create a new conversation, optionally persisting an initial user message
   * and setting an auto-derived title.
   */
  async createConversation(
    userId: string,
    data?: { title?: string; message?: string; initialMessage?: string }
  ): Promise<{ conversation: IConversation; initialMessage?: IMessage }> {
    let title = data?.title?.trim();
    const initialText = data?.message?.trim() || data?.initialMessage?.trim();

    if (!title && initialText) {
      title = this.generateTitleFromContent(initialText);
    } else if (!title) {
      title = "New Conversation";
    }

    const conversation = await conversationRepository.create({
      userId: userId as any,
      title,
      lastMessageAt: new Date(),
    });

    let initialMessage: IMessage | undefined;
    if (initialText && initialText.length > 0) {
      initialMessage = await messageRepository.create({
        conversationId: conversation._id as any,
        userId: userId as any,
        role: "user",
        content: initialText,
      });
    }

    return { conversation, initialMessage };
  }

  /**
   * Fetch paginated list of conversations belonging to the user.
   */
  async getUserConversations(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ conversations: IConversation[]; pagination: ConversationPagination }> {
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const skip = (pageNum - 1) * limitNum;

    const [conversations, total] = await Promise.all([
      conversationRepository.findUserConversations(userId, skip, limitNum),
      conversationRepository.countUserConversations(userId),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      conversations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get a conversation by ID, strictly verifying ownership.
   */
  async getConversationById(userId: string, conversationId: string): Promise<IConversation> {
    const conversation = await conversationRepository.findByIdAndUser(conversationId, userId);
    if (!conversation) {
      throw new AppError("Conversation not found", 404);
    }
    return conversation;
  }

  /**
   * Delete conversation and cascade delete all associated messages.
   */
  async deleteConversation(
    userId: string,
    conversationId: string
  ): Promise<{ success: boolean; deletedCount: number }> {
    // 1. Strict ownership check
    const conversation = await conversationRepository.findByIdAndUser(conversationId, userId);
    if (!conversation) {
      throw new AppError("Conversation not found", 404);
    }

    // 2. Cascade delete messages
    const deletedCount = await messageRepository.deleteByConversationId(conversationId);

    // 3. Delete conversation
    await conversationRepository.deleteById(conversationId);

    return { success: true, deletedCount };
  }

  /**
   * Securely persist a message authored by the authenticated user.
   * Role is strictly enforced to 'user'.
   */
  async addUserMessage(
    userId: string,
    conversationId: string,
    content: string
  ): Promise<ClientMessageDTO> {
    const trimmed = content?.trim();
    if (!trimmed) {
      throw new AppError("Message content cannot be empty", 400);
    }
    if (trimmed.length > 4000) {
      throw new AppError("Message content cannot exceed 4000 characters", 400);
    }

    // Verify ownership
    const conversation = await conversationRepository.findByIdAndUser(conversationId, userId);
    if (!conversation) {
      throw new AppError("Conversation not found", 404);
    }

    const message = await messageRepository.create({
      conversationId: conversation._id as any,
      userId: userId as any,
      role: "user",
      content: trimmed,
    });

    // If conversation is titled "New Conversation", auto-title from first message
    let newTitle: string | undefined;
    if (conversation.title === "New Conversation") {
      newTitle = this.generateTitleFromContent(trimmed);
    }

    await conversationRepository.updateLastMessageAt(conversationId, new Date(), newTitle);

    return {
      id: message._id.toString(),
      conversationId: message.conversationId.toString(),
      role: "user",
      content: message.content,
      createdAt: message.createdAt,
    };
  }

  /**
   * Trusted backend method to persist an assistant response.
   * Not exposed directly to unvetted client HTTP inputs.
   */
  async addAssistantMessage(
    conversationId: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<IMessage> {
    const conversation = await conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new AppError("Conversation not found", 404);
    }

    const message = await messageRepository.create({
      conversationId: conversation._id as any,
      userId: conversation.userId,
      role: "assistant",
      content,
      metadata: metadata || {},
    });

    await conversationRepository.updateLastMessageAt(conversationId, new Date());

    return message;
  }

  /**
   * Trusted backend method to persist system instructions/context.
   */
  async addSystemMessage(
    conversationId: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<IMessage> {
    const conversation = await conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new AppError("Conversation not found", 404);
    }

    return await messageRepository.create({
      conversationId: conversation._id as any,
      userId: conversation.userId,
      role: "system",
      content,
      metadata: metadata || {},
    });
  }

  /**
   * Get paginated messages for a conversation in chronological order.
   * Never exposes internal system prompts or private tokens to the client.
   */
  async getMessages(
    userId: string,
    conversationId: string,
    page: number = 1,
    limit: number = 50,
    order: "asc" | "desc" = "asc"
  ): Promise<{ messages: ClientMessageDTO[]; pagination: ConversationPagination }> {
    // Verify ownership
    const conversation = await conversationRepository.findByIdAndUser(conversationId, userId);
    if (!conversation) {
      throw new AppError("Conversation not found", 404);
    }

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const skip = (pageNum - 1) * limitNum;

    // excludeSystem = true strictly prevents exposure of system prompts
    const [rawMessages, total] = await Promise.all([
      messageRepository.findMessagesByConversation(conversationId, skip, limitNum, order, true),
      messageRepository.countMessages(conversationId, true),
    ]);

    const messages: ClientMessageDTO[] = rawMessages.map((msg) => ({
      id: msg._id.toString(),
      conversationId: msg.conversationId.toString(),
      role: msg.role as "user" | "assistant",
      content: msg.content,
      createdAt: msg.createdAt,
    }));

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      messages,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    };
  }

  /**
   * Multi-turn AI response generation combining persistent history,
   * bounded personalized fitness context, single-flight locking, and Gemini streaming/non-streaming.
   */
  async generateResponse(
    userId: string,
    conversationId: string,
    messageContent: string,
    options?: GenerateResponseOptions
  ): Promise<GenerateResponseResult> {
    // 1. Strict ownership verification
    const conversation = await conversationRepository.findByIdAndUser(conversationId, userId);
    if (!conversation) {
      throw new AppError("Conversation not found", 404);
    }

    // 2. Validate input message
    const trimmed = messageContent?.trim();
    if (!trimmed) {
      throw new AppError("Message content cannot be empty", 400);
    }
    if (trimmed.length > 4000) {
      throw new AppError("Message content cannot exceed 4000 characters", 400);
    }

    // 3. Single-flight generation lock per conversation (prevents race conditions and duplicate assistant replies)
    if (this.inFlightGenerations.has(conversationId)) {
      throw new AppError(
        "A response is currently being generated for this conversation. Please wait.",
        409
      );
    }
    this.inFlightGenerations.add(conversationId);

    try {
      // 4. Persist user message exactly once
      const userMessage = await this.addUserMessage(userId, conversationId, trimmed);

      // 5. Retrieve bounded history (latest 12 messages, arranged chronologically)
      const recentDesc = await messageRepository.findMessagesByConversation(
        conversationId,
        0,
        12,
        "desc",
        true
      );
      const rawHistory = recentDesc.reverse();

      const history = rawHistory.map((m) => ({
        role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
        parts: [{ text: m.content }],
      }));

      // Ensure the history ends with the current user message
      if (
        history.length === 0 ||
        history[history.length - 1].parts[0].text !== trimmed ||
        history[history.length - 1].role !== "user"
      ) {
        history.push({
          role: "user",
          parts: [{ text: trimmed }],
        });
      }

      // 6. Assemble personalized fitness context
      const fitnessContext = await fitnessContextService.assembleFitnessContext(userId);
      const formattedFitness = fitnessContextService.formatContextForPrompt(fitnessContext);

      // 6b. Bounded fitness knowledge RAG routing and retrieval
      let formattedEvidence: string | null = null;
      let sources: KnowledgeSourceDTO[] = [];

      const ragRoute = routeKnowledgeQuery(trimmed);
      if (ragRoute.shouldRetrieve) {
        try {
          const retrieval = await knowledgeRetrievalService.retrieveKnowledge(trimmed, {
            category: ragRoute.category,
            topK: 3,
            minSimilarity: 0.65,
            timeoutMs: 3500,
          });

          if (retrieval.isGrounded && retrieval.chunks.length > 0) {
            formattedEvidence = knowledgeRetrievalService.formatRetrievedEvidenceForPrompt(
              retrieval.chunks
            );
            // Deduplicate sources by documentId, retaining the highest similarity instance
            const seenDocIds = new Set<string>();
            const uniqueSources: KnowledgeSourceDTO[] = [];
            for (const c of retrieval.chunks) {
              if (!seenDocIds.has(c.documentId)) {
                seenDocIds.add(c.documentId);
                uniqueSources.push({
                  title: c.source.title,
                  category: c.category,
                  source: c.source.source,
                  sourceUrl: c.source.sourceUrl || undefined,
                  documentId: c.documentId,
                  chunkId: c.id,
                  similarity: Math.round(c.similarity * 1000) / 1000,
                });
              }
            }
            sources = uniqueSources;
          }
        } catch (ragErr) {
          logger.warn("RAG retrieval failed gracefully, proceeding ungrounded", {
            error: ragErr instanceof Error ? ragErr.message : String(ragErr),
          });
        }
      }

      const systemInstruction = buildCoachingCopilotPrompt(
        formattedFitness,
        conversation.summary,
        formattedEvidence
      );

      // 7. Execute AI Generation (streaming or non-streaming)
      let responseText = "";
      let finishReason: string | undefined;
      let tokenCount: number | undefined;

      try {
        if (options?.stream && options?.onChunk) {
          const streamResult = await AIProvider.streamConversationalCoaching(
            userId,
            history,
            systemInstruction,
            options.onChunk,
            options.abortSignal
          );
          responseText = streamResult.text;
          finishReason = streamResult.finishReason;
        } else {
          const genResult = await AIProvider.generateConversationalCoaching(
            userId,
            history,
            systemInstruction
          );
          responseText = genResult.text;
          finishReason = genResult.finishReason;
          tokenCount = genResult.tokenCount;
        }
      } catch (genError: unknown) {
        if (options?.abortSignal?.aborted) {
          logger.info("Conversational generation aborted by client disconnect", {
            conversationId,
          });
          throw new AppError("Generation cancelled by client", 499);
        }

        const classified = classifyGeminiError(genError);
        if (classified.isQuotaExhausted) {
          throw new AppError(
            "AI coaching quota temporarily exhausted. Please try again later.",
            429
          );
        }
        if (classified.isServerError) {
          throw new AppError(
            "AI coaching service temporarily unavailable. Please try again shortly.",
            503
          );
        }
        if (genError instanceof Error && genError.message.includes("empty response")) {
          throw new AppError("AI coaching generated an empty response. Please try again.", 502);
        }

        throw genError;
      }

      // 8. Persist assistant message ONLY after successful generation
      const assistantMsg = await this.addAssistantMessage(conversationId, responseText, {
        model: env.aiModel,
        finishReason,
        tokenCount,
        sourcesCount: sources.length,
      });

      return {
        userMessage,
        assistantMessage: {
          id: assistantMsg._id.toString(),
          conversationId: assistantMsg.conversationId.toString(),
          role: "assistant",
          content: assistantMsg.content,
          createdAt: assistantMsg.createdAt,
        },
        sources,
        metadata: {
          model: env.aiModel,
          finishReason,
          tokenCount,
          isGrounded: sources.length > 0,
        },
      };
    } finally {
      this.inFlightGenerations.delete(conversationId);
    }
  }
}

export const conversationService = new ConversationService();
export default conversationService;
