import { useConversations, conversationKeys } from "../useConversations";
import { conversationService } from "../../services/conversation.service";
import { QueryClient } from "@tanstack/react-query";
import type {
  Conversation,
  ConversationListResponse,
  CreateConversationResponse,
} from "../../types/coach.types";

jest.mock("../../services/api", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    defaults: { baseURL: "http://localhost:5000" },
  },
}));
jest.mock("../../services/conversation.service");

let mockUseQueryOptions: any = null;
let mockCreateMutationOptions: any = null;
let mockDeleteMutationOptions: any = null;
let mockCreateIsPending = false;
let mockDeleteIsPending = false;

let testQueryClient: QueryClient;

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: () => testQueryClient,
    useQuery: (opts: any) => {
      mockUseQueryOptions = opts;
      return {
        data: {
          conversations: [
            {
              _id: "c1",
              userId: "u1",
              title: "Leg Day Focus",
              lastMessageAt: "2026-11-10T12:00:00Z",
              summary: null,
              createdAt: "2026-11-10T12:00:00Z",
              updatedAt: "2026-11-10T12:00:00Z",
            },
          ],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
        refetch: jest.fn(),
      };
    },
    useMutation: (opts: any) => {
      if (opts.mutationFn.name?.includes("delete") || String(opts.mutationFn).includes("deleteConversation")) {
        mockDeleteMutationOptions = opts;
        return {
          mutateAsync: async (id: string) => {
            const res = await opts.mutationFn(id);
            opts.onSuccess?.(res, id);
            return res;
          },
          isPending: mockDeleteIsPending,
          error: null,
        };
      }
      mockCreateMutationOptions = opts;
      return {
        mutateAsync: async (dto?: any) => {
          const res = await opts.mutationFn(dto);
          opts.onSuccess?.(res, dto);
          return res;
        },
        isPending: mockCreateIsPending,
        error: null,
      };
    },
  };
});

describe("useConversations Unit Tests (M3.4.3)", () => {
  beforeEach(() => {
    testQueryClient = new QueryClient();
    jest.clearAllMocks();
    mockCreateIsPending = false;
    mockDeleteIsPending = false;
  });

  describe("conversationKeys factory", () => {
    it("produces deterministic, hierarchical query keys", () => {
      expect(conversationKeys.all).toEqual(["conversations"]);
      expect(conversationKeys.lists()).toEqual(["conversations", "list"]);
      expect(conversationKeys.list(1, 20)).toEqual([
        "conversations",
        "list",
        { page: 1, limit: 20 },
      ]);
      expect(conversationKeys.details()).toEqual(["conversations", "detail"]);
      expect(conversationKeys.detail("c123")).toEqual(["conversations", "detail", "c123"]);
      expect(conversationKeys.messages()).toEqual(["conversations", "messages"]);
      expect(conversationKeys.messageList("c123", 1, 50, "asc")).toEqual([
        "conversations",
        "messages",
        "c123",
        { page: 1, limit: 50, order: "asc" },
      ]);
    });
  });

  describe("Query hook execution", () => {
    it("configures query with correct queryKey and staleTime", async () => {
      (conversationService.getConversations as jest.Mock).mockResolvedValue({
        conversations: [],
        pagination: { page: 2, limit: 10, total: 0, totalPages: 1 },
      });

      const hook = useConversations({ page: 2, limit: 10 });

      expect(mockUseQueryOptions.queryKey).toEqual([
        "conversations",
        "list",
        { page: 2, limit: 10 },
      ]);
      expect(mockUseQueryOptions.staleTime).toBe(60000);
      expect(mockUseQueryOptions.enabled).toBe(true);
      expect(hook.conversations).toHaveLength(1);
      expect(hook.conversations[0].title).toBe("Leg Day Focus");

      // Verify query function executes service
      await mockUseQueryOptions.queryFn();
      expect(conversationService.getConversations).toHaveBeenCalledWith(2, 10);
    });
  });

  describe("Create Conversation Mutation", () => {
    it("creates conversation, invalidates lists, and prepends to page 1 cache", async () => {
      const page1Key = conversationKeys.list(1, 20);
      const initialCache: ConversationListResponse = {
        conversations: [
          {
            _id: "c1",
            userId: "u1",
            title: "Existing Chat",
            lastMessageAt: "2026-11-10T12:00:00Z",
            createdAt: "2026-11-10T12:00:00Z",
            updatedAt: "2026-11-10T12:00:00Z",
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      testQueryClient.setQueryData(page1Key, initialCache);

      const newConv: Conversation = {
        _id: "c2_new",
        userId: "u1",
        title: "New Shoulder Routine",
        lastMessageAt: "2026-11-10T13:00:00Z",
        createdAt: "2026-11-10T13:00:00Z",
        updatedAt: "2026-11-10T13:00:00Z",
      };

      const mockCreateResponse: CreateConversationResponse = {
        conversation: newConv,
        message: null,
      };

      (conversationService.createConversation as jest.Mock).mockResolvedValue(
        mockCreateResponse
      );

      const invalidateSpy = jest.spyOn(testQueryClient, "invalidateQueries");

      const hook = useConversations({ page: 1, limit: 20 });
      const result = await hook.createConversation({ title: "New Shoulder Routine" });

      expect(conversationService.createConversation).toHaveBeenCalledWith({
        title: "New Shoulder Routine",
      });
      expect(result.conversation._id).toBe("c2_new");
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: conversationKeys.lists(),
      });

      // Verify page 1 cache was updated
      const updatedCache = testQueryClient.getQueryData<ConversationListResponse>(page1Key);
      expect(updatedCache?.conversations).toHaveLength(2);
      expect(updatedCache?.conversations[0]._id).toBe("c2_new");
      expect(updatedCache?.pagination.total).toBe(2);
    });

    it("prevents duplicate creation submission when mutation is pending", async () => {
      mockCreateIsPending = true;
      const hook = useConversations();
      await expect(hook.createConversation({ title: "Duplicate" })).rejects.toThrow(
        "Creation already in progress"
      );
    });
  });

  describe("Delete Conversation Mutation", () => {
    it("deletes conversation, evicts from cache, cleans detail/message caches, and invalidates lists", async () => {
      const page1Key = conversationKeys.list(1, 20);
      testQueryClient.setQueryData<ConversationListResponse>(page1Key, {
        conversations: [
          {
            _id: "c1",
            userId: "u1",
            title: "Chat 1",
            lastMessageAt: "2026-11-10T12:00:00Z",
            createdAt: "2026-11-10T12:00:00Z",
            updatedAt: "2026-11-10T12:00:00Z",
          },
          {
            _id: "c2_to_delete",
            userId: "u1",
            title: "Chat 2",
            lastMessageAt: "2026-11-10T12:00:00Z",
            createdAt: "2026-11-10T12:00:00Z",
            updatedAt: "2026-11-10T12:00:00Z",
          },
        ],
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
      });

      // Seed detail and message caches for c2
      testQueryClient.setQueryData(conversationKeys.detail("c2_to_delete"), {
        conversation: { _id: "c2_to_delete" },
      });
      testQueryClient.setQueryData(
        conversationKeys.messageList("c2_to_delete", 1, 50, "asc"),
        { messages: [] }
      );

      (conversationService.deleteConversation as jest.Mock).mockResolvedValue({
        success: true,
        message: "Deleted",
      });

      const removeSpy = jest.spyOn(testQueryClient, "removeQueries");
      const invalidateSpy = jest.spyOn(testQueryClient, "invalidateQueries");

      const hook = useConversations();
      await hook.deleteConversation("c2_to_delete");

      expect(conversationService.deleteConversation).toHaveBeenCalledWith("c2_to_delete");

      // Verify list cache had item evicted
      const updatedList = testQueryClient.getQueryData<ConversationListResponse>(page1Key);
      expect(updatedList?.conversations).toHaveLength(1);
      expect(updatedList?.conversations[0]._id).toBe("c1");
      expect(updatedList?.pagination.total).toBe(1);

      // Verify detail and messages were removed from cache
      expect(removeSpy).toHaveBeenCalledWith({
        queryKey: conversationKeys.detail("c2_to_delete"),
        exact: true,
      });
      expect(removeSpy).toHaveBeenCalledWith({
        queryKey: [...conversationKeys.messages(), "c2_to_delete"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: conversationKeys.lists(),
      });
    });

    it("prevents duplicate delete submission when mutation is pending", async () => {
      mockDeleteIsPending = true;
      const hook = useConversations();
      await expect(hook.deleteConversation("c1")).rejects.toThrow(
        "Deletion already in progress"
      );
    });
  });
});
