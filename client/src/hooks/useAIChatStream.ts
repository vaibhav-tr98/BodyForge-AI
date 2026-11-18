import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { streamAICoachingResponse } from "../services/sseStream.service";
import { conversationService } from "../services/conversation.service";
import { conversationKeys } from "./useConversations";
import type {
  ConversationMessage,
  ConversationMessagesResponse,
  ConversationListResponse,
  GenerateResponse,
  KnowledgeSource,
  SSEChunkPayload,
  SSECompletePayload,
  SSEStartPayload,
} from "../types/coach.types";

export type ChatStreamStatus =
  | "idle"
  | "connecting"
  | "streaming"
  | "completed"
  | "stopping"
  | "cancelled"
  | "error";

export interface UseAIChatStreamOptions {
  conversationId: string | null | undefined;
  onStart?: (data: SSEStartPayload) => void;
  onChunk?: (data: SSEChunkPayload) => void;
  onComplete?: (data: SSECompletePayload) => void;
  onError?: (error: Error) => void;
}

function formatChatErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 401) {
      return "Your session has expired. Please sign in again.";
    }
    if (status === 409) {
      return "A coaching response is currently being generated for this conversation. Please wait a moment.";
    }
    if (status === 429) {
      return "AI coaching quota temporarily exhausted. Please wait a few moments before trying again.";
    }
    if (status === 503) {
      return "AI coaching service is temporarily unavailable. Please try again shortly.";
    }
  }
  if (err instanceof Error) {
    if (err.message.includes("409")) {
      return "A coaching response is currently being generated for this conversation. Please wait a moment.";
    }
    if (err.message.includes("429")) {
      return "AI coaching quota temporarily exhausted. Please wait a few moments before trying again.";
    }
    if (err.message.includes("503")) {
      return "AI coaching service is temporarily unavailable. Please try again shortly.";
    }
    return err.message;
  }
  return "An unexpected error occurred while generating coaching advice.";
}

export function useAIChatStream(options: UseAIChatStreamOptions) {
  const { conversationId, onStart, onChunk, onComplete, onError } = options;
  const queryClient = useQueryClient();

  // State Machine
  const [status, setStatus] = useState<ChatStreamStatus>("idle");
  const [streamingText, setStreamingText] = useState("");
  const [streamingSources, setStreamingSources] = useState<KnowledgeSource[]>([]);
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<ConversationMessage | null>(null);
  const [lastCompletedResult, setLastCompletedResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Synchronization refs for cancellation, generation identity, and stale callbacks
  const activeConversationIdRef = useRef<string | null | undefined>(conversationId);
  const activeGenerationIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFailedMessageRef = useRef<string | null>(null);

  // Update conversation ref and abort active stream if conversationId changes or unmounts
  useEffect(() => {
    activeConversationIdRef.current = conversationId;

    return () => {
      // Abort in-flight stream on switch or unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      activeGenerationIdRef.current = null;
    };
  }, [conversationId]);

  // Reset local state when conversationId changes
  const prevConversationIdRef = useRef(conversationId);
  useEffect(() => {
    if (prevConversationIdRef.current !== conversationId) {
      prevConversationIdRef.current = conversationId;
      setStatus("idle");
      setStreamingText("");
      setStreamingSources([]);
      setOptimisticUserMessage(null);
      setError(null);
      setLastCompletedResult(null);
      lastFailedMessageRef.current = null;
    }
  }, [conversationId]);

  /**
   * Stop active generation cleanly without fabricating a persisted assistant message.
   */
  const stopGeneration = useCallback(() => {
    if (status !== "connecting" && status !== "streaming") {
      return;
    }

    setStatus("stopping");
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Set to cancelled - do NOT fabricate or persist assistant message
    setStatus("cancelled");
  }, [status]);

  /**
   * Send a message and stream the AI coaching response.
   * Note: The backend /generate endpoint automatically persists the user message
   * and the final assistant response. Do NOT manually call addConversationMessage.
   */
  const sendMessage = useCallback(
    async (messageText: string): Promise<GenerateResponse | null> => {
      const trimmed = messageText?.trim();
      if (!trimmed) {
        throw new Error("Message content cannot be empty");
      }

      const activeConvId = activeConversationIdRef.current;
      if (!activeConvId) {
        throw new Error("No active conversation selected");
      }

      // Prevent concurrent sends within this hook
      if (status === "connecting" || status === "streaming" || status === "stopping") {
        throw new Error("A coaching response is already being generated");
      }

      // Initialize state for new generation
      const generationId = `gen-${activeConvId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      activeGenerationIdRef.current = generationId;
      lastFailedMessageRef.current = trimmed;

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setStatus("connecting");
      setError(null);
      setStreamingText("");
      setStreamingSources([]);
      setLastCompletedResult(null);

      // Optimistic user message for immediate UI display
      const tempUserMsg: ConversationMessage = {
        id: `opt-${Date.now()}`,
        conversationId: activeConvId,
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      setOptimisticUserMessage(tempUserMsg);

      try {
        const result = await streamAICoachingResponse(activeConvId, {
          message: trimmed,
          signal: abortController.signal,
          callbacks: {
            onStart: (startPayload) => {
              // Ignore stale callbacks from previous generations or switched conversations
              if (
                activeGenerationIdRef.current !== generationId ||
                activeConversationIdRef.current !== activeConvId
              ) {
                return;
              }
              setStatus("streaming");
              onStart?.(startPayload);
            },

            onChunk: (chunkPayload) => {
              if (
                activeGenerationIdRef.current !== generationId ||
                activeConversationIdRef.current !== activeConvId
              ) {
                return;
              }
              setStatus("streaming");
              setStreamingText((prev) => prev + chunkPayload.text);
              onChunk?.(chunkPayload);
            },

            onComplete: (completePayload) => {
              if (
                activeGenerationIdRef.current !== generationId ||
                activeConversationIdRef.current !== activeConvId
              ) {
                return;
              }

              const { userMessage, assistantMessage, sources } = completePayload.data;

              // 1. Reconcile optimistic entries with the real server message IDs and timestamps
              queryClient.setQueriesData<ConversationMessagesResponse>(
                { queryKey: [...conversationKeys.messages(), activeConvId] },
                (oldData) => {
                  if (!oldData) return oldData;
                  const existingIds = new Set(oldData.messages.map((m) => m.id));
                  const newMessages = [...oldData.messages];

                  if (!existingIds.has(userMessage.id)) {
                    newMessages.push(userMessage);
                  }
                  if (!existingIds.has(assistantMessage.id)) {
                    newMessages.push(assistantMessage);
                  }

                  return {
                    ...oldData,
                    messages: newMessages,
                    pagination: {
                      ...oldData.pagination,
                      total:
                        oldData.pagination.total +
                        (existingIds.has(userMessage.id) ? 0 : 1) +
                        (existingIds.has(assistantMessage.id) ? 0 : 1),
                    },
                  };
                }
              );

              // 2. Update conversation list lastMessageAt in cache
              queryClient.setQueriesData<ConversationListResponse>(
                { queryKey: conversationKeys.lists() },
                (oldData) => {
                  if (!oldData) return oldData;
                  return {
                    ...oldData,
                    conversations: oldData.conversations.map((c) => {
                      if (c._id === activeConvId) {
                        return {
                          ...c,
                          lastMessageAt: assistantMessage.createdAt,
                        };
                      }
                      return c;
                    }),
                  };
                }
              );

              // 3. Mark completed and clear optimistic message
              setOptimisticUserMessage(null);
              setStreamingSources(sources || []);
              setLastCompletedResult(completePayload.data);
              setStatus("completed");
              lastFailedMessageRef.current = null;
              onComplete?.(completePayload);
            },

            onError: (err) => {
              if (
                activeGenerationIdRef.current !== generationId ||
                activeConversationIdRef.current !== activeConvId
              ) {
                return;
              }

              const formattedMessage = formatChatErrorMessage(err);
              const customError = new Error(formattedMessage);
              setError(customError);
              setStatus("error");
              onError?.(customError);
            },
          },
        });

        return result;
      } catch (err: unknown) {
        if (
          activeGenerationIdRef.current !== generationId ||
          activeConversationIdRef.current !== activeConvId
        ) {
          return null;
        }

        if (abortController.signal.aborted) {
          setStatus("cancelled");
          return null;
        }

        const formattedMessage = formatChatErrorMessage(err);
        const customError = new Error(formattedMessage);
        setError(customError);
        setStatus("error");
        onError?.(customError);
        throw customError;
      } finally {
        if (activeGenerationIdRef.current === generationId) {
          abortControllerRef.current = null;
        }
      }
    },
    [status, onStart, onChunk, onComplete, onError, queryClient]
  );

  /**
   * Safely retry the last failed message, first verifying whether the server
   * already persisted it to avoid duplicate user messages.
   */
  const retry = useCallback(async (): Promise<GenerateResponse | null> => {
    const failedMessage = lastFailedMessageRef.current;
    const activeConvId = activeConversationIdRef.current;

    if (!failedMessage || !activeConvId) {
      return null;
    }

    // Pre-flight check: Reconcile from server before resending
    try {
      const recent = await conversationService.getConversationMessages(
        activeConvId,
        1,
        5,
        "desc"
      );

      const messages = recent.messages || [];
      const trimmedTarget = failedMessage.trim();

      // Case 1: Both user message and assistant message already landed
      const hasCompletedPair =
        messages.length >= 2 &&
        messages[0].role === "assistant" &&
        messages[1].role === "user" &&
        messages[1].content === trimmedTarget;

      if (hasCompletedPair) {
        // Invalidate message cache to pull full server truth
        queryClient.invalidateQueries({
          queryKey: [...conversationKeys.messages(), activeConvId],
        });
        setStatus("completed");
        setError(null);
        setOptimisticUserMessage(null);
        lastFailedMessageRef.current = null;
        return null;
      }
    } catch {
      // If network is completely down, proceed with normal attempt which will report connection error
    }

    return sendMessage(failedMessage);
  }, [sendMessage, queryClient]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    activeGenerationIdRef.current = null;
    setStatus("idle");
    setStreamingText("");
    setStreamingSources([]);
    setOptimisticUserMessage(null);
    setLastCompletedResult(null);
    setError(null);
    lastFailedMessageRef.current = null;
  }, []);

  return {
    status,
    streamingText,
    streamingSources,
    optimisticUserMessage,
    lastCompletedResult,
    error,
    // Operations
    sendMessage,
    stopGeneration,
    retry,
    reset,
    // Derived state flags
    isIdle: status === "idle",
    isConnecting: status === "connecting",
    isStreaming: status === "streaming",
    isStopping: status === "stopping",
    isCancelled: status === "cancelled",
    isCompleted: status === "completed",
    isError: status === "error",
    isBusy: status === "connecting" || status === "streaming" || status === "stopping",
  };
}
