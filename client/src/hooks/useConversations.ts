import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { conversationService } from "../services/conversation.service";
import type {
  Conversation,
  ConversationListResponse,
  CreateConversationDTO,
  CreateConversationResponse,
  DeleteConversationResponse,
} from "../types/coach.types";

export const conversationKeys = {
  all: ["conversations"] as const,
  lists: () => [...conversationKeys.all, "list"] as const,
  list: (page: number, limit: number) =>
    [...conversationKeys.lists(), { page, limit }] as const,
  details: () => [...conversationKeys.all, "detail"] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
  messages: () => [...conversationKeys.all, "messages"] as const,
  messageList: (
    id: string,
    page: number = 1,
    limit: number = 50,
    order: "asc" | "desc" = "asc"
  ) => [...conversationKeys.messages(), id, { page, limit, order }] as const,
};

export interface UseConversationsOptions {
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export function useConversations(options: UseConversationsOptions = {}) {
  const { page = 1, limit = 20, enabled = true } = options;
  const queryClient = useQueryClient();

  const queryKey = conversationKeys.list(page, limit);

  // 1. Paginated Conversations Query
  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery<ConversationListResponse, Error>({
    queryKey,
    queryFn: () => conversationService.getConversations(page, limit),
    staleTime: 60 * 1000, // 1 minute
    enabled,
  });

  // 2. Create Conversation Mutation
  const createMutation = useMutation<
    CreateConversationResponse,
    Error,
    CreateConversationDTO | undefined
  >({
    mutationFn: (dto?: CreateConversationDTO) =>
      conversationService.createConversation(dto),
    onSuccess: (newConvResponse) => {
      // Invalidate all conversation lists to preserve pagination truth
      queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(),
      });

      // Optimistically prepend to page 1 cache if present
      const page1Key = conversationKeys.list(1, limit);
      queryClient.setQueryData<ConversationListResponse>(
        page1Key,
        (oldData) => {
          if (!oldData) return oldData;
          // Avoid duplicate insertion
          const exists = oldData.conversations.some(
            (c) => c._id === newConvResponse.conversation._id
          );
          if (exists) return oldData;

          return {
            ...oldData,
            conversations: [newConvResponse.conversation, ...oldData.conversations],
            pagination: {
              ...oldData.pagination,
              total: oldData.pagination.total + 1,
            },
          };
        }
      );
    },
  });

  // 3. Delete Conversation Mutation
  const deleteMutation = useMutation<
    DeleteConversationResponse,
    Error,
    string
  >({
    mutationFn: (conversationId: string) =>
      conversationService.deleteConversation(conversationId),
    onSuccess: (_res, conversationId) => {
      // 1. Evict deleted conversation from all cached pages
      queryClient.setQueriesData<ConversationListResponse>(
        { queryKey: conversationKeys.lists() },
        (oldData) => {
          if (!oldData) return oldData;
          const filtered = oldData.conversations.filter(
            (c) => c._id !== conversationId
          );
          if (filtered.length === oldData.conversations.length) {
            return oldData;
          }
          return {
            ...oldData,
            conversations: filtered,
            pagination: {
              ...oldData.pagination,
              total: Math.max(0, oldData.pagination.total - 1),
            },
          };
        }
      );

      // 2. Remove detailed item and messages caches
      queryClient.removeQueries({
        queryKey: conversationKeys.detail(conversationId),
        exact: true,
      });
      queryClient.removeQueries({
        queryKey: [...conversationKeys.messages(), conversationId],
      });

      // 3. Invalidate lists to refetch accurate boundary pagination
      queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(),
      });
    },
  });

  const createConversation = (dto?: CreateConversationDTO) => {
    if (createMutation.isPending) return Promise.reject(new Error("Creation already in progress"));
    return createMutation.mutateAsync(dto);
  };

  const deleteConversation = (conversationId: string) => {
    if (deleteMutation.isPending) return Promise.reject(new Error("Deletion already in progress"));
    return deleteMutation.mutateAsync(conversationId);
  };

  return {
    conversations: data?.conversations ?? ([] as Conversation[]),
    pagination: data?.pagination ?? null,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
    // Create mutation
    createConversation,
    createConversationAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,
    // Delete mutation
    deleteConversation,
    deleteConversationAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
  };
}
