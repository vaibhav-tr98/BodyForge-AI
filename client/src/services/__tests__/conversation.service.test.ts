import { conversationService } from "../conversation.service";
import { api } from "../api";
import type {
  Conversation,
  ConversationMessage,
  GenerateResponse,
} from "../../types/coach.types";

jest.mock("../api", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

describe("ConversationService Unit Tests (M3.4.2)", () => {
  const mockConversationId = "507f1f77bcf86cd799439011";
  const mockUserId = "user_abc_123";

  const mockConversation: Conversation = {
    _id: mockConversationId,
    userId: mockUserId,
    title: "Upper Body Hypertrophy",
    lastMessageAt: "2026-11-10T12:00:00.000Z",
    summary: null,
    metadata: {},
    createdAt: "2026-11-10T12:00:00.000Z",
    updatedAt: "2026-11-10T12:00:00.000Z",
  };

  const mockUserMessage: ConversationMessage = {
    id: "msg_user_1",
    conversationId: mockConversationId,
    role: "user",
    content: "How many sets for chest per week?",
    createdAt: "2026-11-10T12:00:01.000Z",
  };

  const mockAssistantMessage: ConversationMessage = {
    id: "msg_ai_1",
    conversationId: mockConversationId,
    role: "assistant",
    content: "10 to 20 sets per week is optimal for most lifters.",
    createdAt: "2026-11-10T12:00:05.000Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createConversation", () => {
    it("creates a conversation with custom title and initial message", async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            conversation: mockConversation,
            message: mockUserMessage,
          },
        },
      };
      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await conversationService.createConversation({
        title: "Upper Body Hypertrophy",
        message: "How many sets for chest per week?",
      });

      expect(api.post).toHaveBeenCalledWith("/api/conversations", {
        title: "Upper Body Hypertrophy",
        message: "How many sets for chest per week?",
      });
      expect(result.conversation._id).toBe(mockConversationId);
      expect(result.message?.content).toBe("How many sets for chest per week?");
    });

    it("throws error when API returns success: false", async () => {
      (api.post as jest.Mock).mockResolvedValue({
        data: {
          success: false,
          message: "Validation failed: Title too long",
        },
      });

      await expect(
        conversationService.createConversation({ title: "Too long..." })
      ).rejects.toThrow("Validation failed: Title too long");
    });
  });

  describe("getConversations", () => {
    it("fetches paginated conversation list with default params", async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            conversations: [mockConversation],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          },
        },
      };
      (api.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await conversationService.getConversations();

      expect(api.get).toHaveBeenCalledWith("/api/conversations?page=1&limit=20");
      expect(result.conversations).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it("fetches custom page and limit", async () => {
      (api.get as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: {
            conversations: [],
            pagination: { page: 2, limit: 10, total: 15, totalPages: 2 },
          },
        },
      });

      await conversationService.getConversations(2, 10);
      expect(api.get).toHaveBeenCalledWith("/api/conversations?page=2&limit=10");
    });
  });

  describe("getConversation", () => {
    it("fetches single conversation by id", async () => {
      (api.get as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: { conversation: mockConversation },
        },
      });

      const result = await conversationService.getConversation(mockConversationId);

      expect(api.get).toHaveBeenCalledWith(`/api/conversations/${mockConversationId}`);
      expect(result.conversation._id).toBe(mockConversationId);
      expect(result.conversation.title).toBe("Upper Body Hypertrophy");
    });

    it("throws 404 error when conversation does not exist", async () => {
      (api.get as jest.Mock).mockResolvedValue({
        data: {
          success: false,
          message: "Conversation not found",
        },
      });

      await expect(
        conversationService.getConversation("invalid_id")
      ).rejects.toThrow("Conversation not found");
    });
  });

  describe("deleteConversation", () => {
    it("deletes conversation successfully", async () => {
      (api.delete as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          message: "Conversation deleted successfully",
        },
      });

      const result = await conversationService.deleteConversation(mockConversationId);

      expect(api.delete).toHaveBeenCalledWith(`/api/conversations/${mockConversationId}`);
      expect(result.success).toBe(true);
      expect(result.message).toBe("Conversation deleted successfully");
    });

    it("throws error when deletion fails", async () => {
      (api.delete as jest.Mock).mockResolvedValue({
        data: {
          success: false,
          message: "Conversation not found or unauthorized",
        },
      });

      await expect(
        conversationService.deleteConversation(mockConversationId)
      ).rejects.toThrow("Conversation not found or unauthorized");
    });
  });

  describe("getConversationMessages", () => {
    it("fetches paginated messages with ordering", async () => {
      (api.get as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: {
            messages: [mockUserMessage, mockAssistantMessage],
            pagination: { page: 1, limit: 50, total: 2, totalPages: 1 },
          },
        },
      });

      const result = await conversationService.getConversationMessages(
        mockConversationId,
        1,
        50,
        "asc"
      );

      expect(api.get).toHaveBeenCalledWith(
        `/api/conversations/${mockConversationId}/messages?page=1&limit=50&order=asc`
      );
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].role).toBe("user");
      expect(result.messages[1].role).toBe("assistant");
    });
  });

  describe("addConversationMessage", () => {
    it("manually adds user message to conversation", async () => {
      (api.post as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: { message: mockUserMessage },
        },
      });

      const result = await conversationService.addConversationMessage(
        mockConversationId,
        "How many sets for chest per week?"
      );

      expect(api.post).toHaveBeenCalledWith(
        `/api/conversations/${mockConversationId}/messages`,
        { content: "How many sets for chest per week?" }
      );
      expect(result.message.id).toBe("msg_user_1");
    });
  });

  describe("generateConversationResponse", () => {
    it("generates coaching response in non-streaming JSON mode", async () => {
      const mockGenResponse: GenerateResponse = {
        userMessage: mockUserMessage,
        assistantMessage: mockAssistantMessage,
        sources: [
          {
            title: "Volume Landmarks",
            category: "hypertrophy",
            source: "Renaissance Periodization",
            documentId: "doc_1",
            chunkId: "chk_1",
            similarity: 0.88,
          },
        ],
        metadata: {
          model: "gemini-2.5-pro",
          finishReason: "STOP",
          tokenCount: 80,
          isGrounded: true,
        },
      };

      (api.post as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: mockGenResponse,
        },
      });

      const result = await conversationService.generateConversationResponse(
        mockConversationId,
        "How many sets for chest per week?"
      );

      expect(api.post).toHaveBeenCalledWith(
        `/api/conversations/${mockConversationId}/generate`,
        { message: "How many sets for chest per week?", stream: false }
      );
      expect(result.userMessage.content).toBe("How many sets for chest per week?");
      expect(result.assistantMessage.content).toContain("10 to 20 sets");
      expect(result.sources).toHaveLength(1);
      expect(result.metadata?.isGrounded).toBe(true);
    });
  });
});
