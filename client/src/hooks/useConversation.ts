import { useQuery, useQueryClient } from "@tanstack/react-query";
import { conversationService } from "../services/conversation.service";
import { conversationKeys } from "./useConversations";
import type {
  Conversation,
  ConversationDetailResponse,
  ConversationMessage,
  ConversationMessagesResponse,
  MessagePagination,
} from "../types/coach.types";

export interface UseConversationOptions {
  page?: number;
  limit?: number;
  order?: "asc" | "desc";
  enabled?: boolean;
}

export function useConversation(
  conversationId: string | null | undefined,
  options: UseConversationOptions = {}
) {
  const { page = 1, limit = 50, order = "asc", enabled = true } = options;
  const queryClient = useQueryClient();

  const isEnabled = Boolean(conversationId) && enabled;

  // 1. Conversation Detail Query
  const detailQuery = useQuery<ConversationDetailResponse, Error>({
    queryKey: conversationId
      ? conversationKeys.detail(conversationId)
      : ["conversations", "detail", "disabled"],
    queryFn: () => conversationService.getConversation(conversationId!),
    enabled: isEnabled,
    staleTime: 60 * 1000,
  });

  // 2. Paginated Messages History Query
  const messagesQuery = useQuery<ConversationMessagesResponse, Error>({
    queryKey: conversationId
      ? conversationKeys.messageList(conversationId, page, limit, order)
      : ["conversations", "messages", "disabled"],
    queryFn: () =>
      conversationService.getConversationMessages(
        conversationId!,
        page,
        limit,
        order
      ),
    enabled: isEnabled,
    staleTime: 60 * 1000,
  });

  // Helper to remove caches for a specific conversation
  const cleanupConversation = (idToClean?: string) => {
    const targetId = idToClean || conversationId;
    if (!targetId) return;

    queryClient.removeQueries({
      queryKey: conversationKeys.detail(targetId),
      exact: true,
    });
    queryClient.removeQueries({
      queryKey: [...conversationKeys.messages(), targetId],
    });
  };

  const isLoading = detailQuery.isLoading || messagesQuery.isLoading;
  const isError = detailQuery.isError || messagesQuery.isError;
  const error = detailQuery.error || messagesQuery.error || null;

  return {
    conversation: detailQuery.data?.conversation ?? (null as Conversation | null),
    messages: messagesQuery.data?.messages ?? ([] as ConversationMessage[]),
    pagination: messagesQuery.data?.pagination ?? (null as MessagePagination | null),
    isLoading,
    isConversationLoading: detailQuery.isLoading,
    isMessagesLoading: messagesQuery.isLoading,
    isError,
    error,
    isConversationError: detailQuery.isError,
    conversationError: detailQuery.error,
    isMessagesError: messagesQuery.isError,
    messagesError: messagesQuery.error,
    refetchConversation: detailQuery.refetch,
    refetchMessages: messagesQuery.refetch,
    cleanupConversation,
  };
}
