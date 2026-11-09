import { conversationService } from "./conversation.service";
import conversationRepository from "../repositories/conversation.repository";
import messageRepository from "../repositories/message.repository";
import { AppError } from "../errors/AppError";

jest.mock("../repositories/conversation.repository");
jest.mock("../repositories/message.repository");

describe("ConversationService Unit Tests", () => {
  const mockUserId = "507f1f77bcf86cd799439011";
  const mockOtherUserId = "507f1f77bcf86cd799439022";
  const mockConversationId = "507f191e810c19729de860ea";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateTitleFromContent", () => {
    it("should return fallback for empty or whitespace content", () => {
      expect(conversationService.generateTitleFromContent("")).toBe("New Conversation");
      expect(conversationService.generateTitleFromContent("    ")).toBe("New Conversation");
      expect(conversationService.generateTitleFromContent(null as any)).toBe("New Conversation");
    });

    it("should strip markdown headers and symbols", () => {
      expect(conversationService.generateTitleFromContent("# How to improve my bench press?")).toBe(
        "How to improve my bench press?"
      );
      expect(conversationService.generateTitleFromContent("> Can you suggest a diet plan?")).toBe(
        "Can you suggest a diet plan?"
      );
    });

    it("should truncate long messages at word boundaries with ellipsis", () => {
      const longMessage =
        "I want to design a 5 day workout split targeting upper body hypertrophy and progressive overload";
      const title = conversationService.generateTitleFromContent(longMessage);
      expect(title.length).toBeLessThanOrEqual(48);
      expect(title.endsWith("...")).toBe(true);
    });

    it("should fallback to New Conversation if only symbols are present", () => {
      expect(conversationService.generateTitleFromContent("### !!! ???")).toBe("New Conversation");
    });
  });

  describe("createConversation", () => {
    it("should create a conversation with default title when no message or title is given", async () => {
      const mockCreated = {
        _id: mockConversationId,
        userId: mockUserId,
        title: "New Conversation",
        lastMessageAt: new Date(),
      };
      (conversationRepository.create as jest.Mock).mockResolvedValue(mockCreated);

      const result = await conversationService.createConversation(mockUserId);

      expect(conversationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          title: "New Conversation",
        })
      );
      expect(result.conversation).toEqual(mockCreated);
      expect(result.initialMessage).toBeUndefined();
    });

    it("should create conversation with initial user message and auto-derived title", async () => {
      const mockCreated = {
        _id: mockConversationId,
        userId: mockUserId,
        title: "Build bigger arms",
        lastMessageAt: new Date(),
      };
      const mockMsg = {
        _id: "msg1",
        conversationId: mockConversationId,
        userId: mockUserId,
        role: "user",
        content: "Build bigger arms and chest",
      };
      (conversationRepository.create as jest.Mock).mockResolvedValue(mockCreated);
      (messageRepository.create as jest.Mock).mockResolvedValue(mockMsg);

      const result = await conversationService.createConversation(mockUserId, {
        message: "Build bigger arms and chest",
      });

      expect(conversationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          title: "Build bigger arms and chest",
        })
      );
      expect(messageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: mockConversationId,
          userId: mockUserId,
          role: "user",
          content: "Build bigger arms and chest",
        })
      );
      expect(result.initialMessage).toEqual(mockMsg);
    });
  });

  describe("addUserMessage", () => {
    it("should reject empty content", async () => {
      await expect(
        conversationService.addUserMessage(mockUserId, mockConversationId, "   ")
      ).rejects.toThrow(AppError);
    });

    it("should reject content exceeding 4000 characters", async () => {
      const hugeContent = "a".repeat(4001);
      await expect(
        conversationService.addUserMessage(mockUserId, mockConversationId, hugeContent)
      ).rejects.toThrow(AppError);
    });

    it("should throw 404 if conversation is not found or not owned by user", async () => {
      (conversationRepository.findByIdAndUser as jest.Mock).mockResolvedValue(null);

      await expect(
        conversationService.addUserMessage(mockOtherUserId, mockConversationId, "Hello")
      ).rejects.toThrow(new AppError("Conversation not found", 404));
    });

    it("should successfully persist user message with role user and update lastMessageAt", async () => {
      const mockConv = {
        _id: mockConversationId,
        userId: mockUserId,
        title: "Bench Advice",
      };
      const mockCreatedMsg = {
        _id: "msg2",
        conversationId: mockConversationId,
        userId: mockUserId,
        role: "user",
        content: "How many sets should I do?",
        createdAt: new Date(),
      };
      (conversationRepository.findByIdAndUser as jest.Mock).mockResolvedValue(mockConv);
      (messageRepository.create as jest.Mock).mockResolvedValue(mockCreatedMsg);
      (conversationRepository.updateLastMessageAt as jest.Mock).mockResolvedValue(mockConv);

      const result = await conversationService.addUserMessage(
        mockUserId,
        mockConversationId,
        "How many sets should I do?"
      );

      expect(messageRepository.create).toHaveBeenCalledWith({
        conversationId: mockConversationId,
        userId: mockUserId,
        role: "user",
        content: "How many sets should I do?",
      });
      expect(conversationRepository.updateLastMessageAt).toHaveBeenCalled();
      expect(result.role).toBe("user");
      expect(result.content).toBe("How many sets should I do?");
    });
  });

  describe("addAssistantMessage (trusted service)", () => {
    it("should persist assistant message and update conversation", async () => {
      const mockConv = {
        _id: mockConversationId,
        userId: mockUserId,
      };
      const mockAssistantMsg = {
        _id: "msg_ai",
        conversationId: mockConversationId,
        userId: mockUserId,
        role: "assistant",
        content: "I recommend 3 to 4 working sets.",
        metadata: { model: "gemini-2.5-pro" },
      };
      (conversationRepository.findById as jest.Mock).mockResolvedValue(mockConv);
      (messageRepository.create as jest.Mock).mockResolvedValue(mockAssistantMsg);
      (conversationRepository.updateLastMessageAt as jest.Mock).mockResolvedValue(mockConv);

      const result = await conversationService.addAssistantMessage(
        mockConversationId,
        "I recommend 3 to 4 working sets.",
        { model: "gemini-2.5-pro" }
      );

      expect(messageRepository.create).toHaveBeenCalledWith({
        conversationId: mockConversationId,
        userId: mockUserId,
        role: "assistant",
        content: "I recommend 3 to 4 working sets.",
        metadata: { model: "gemini-2.5-pro" },
      });
      expect(result.role).toBe("assistant");
    });
  });

  describe("getMessages", () => {
    it("should strictly exclude system messages from client delivery", async () => {
      const mockConv = {
        _id: mockConversationId,
        userId: mockUserId,
      };
      const mockRawMessages = [
        {
          _id: "msg_user",
          conversationId: mockConversationId,
          role: "user",
          content: "Hello",
          createdAt: new Date(),
        },
        {
          _id: "msg_assistant",
          conversationId: mockConversationId,
          role: "assistant",
          content: "Hello! Ready to train?",
          createdAt: new Date(),
        },
      ];

      (conversationRepository.findByIdAndUser as jest.Mock).mockResolvedValue(mockConv);
      (messageRepository.findMessagesByConversation as jest.Mock).mockResolvedValue(mockRawMessages);
      (messageRepository.countMessages as jest.Mock).mockResolvedValue(2);

      const result = await conversationService.getMessages(mockUserId, mockConversationId, 1, 50, "asc");

      expect(messageRepository.findMessagesByConversation).toHaveBeenCalledWith(
        mockConversationId,
        0,
        50,
        "asc",
        true // excludeSystem = true
      );
      expect(result.messages).toHaveLength(2);
      expect(result.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    });

    it("should throw 404 when user is not owner of conversation", async () => {
      (conversationRepository.findByIdAndUser as jest.Mock).mockResolvedValue(null);

      await expect(
        conversationService.getMessages(mockOtherUserId, mockConversationId)
      ).rejects.toThrow(new AppError("Conversation not found", 404));
    });
  });

  describe("deleteConversation", () => {
    it("should cascade delete messages and conversation", async () => {
      const mockConv = {
        _id: mockConversationId,
        userId: mockUserId,
      };
      (conversationRepository.findByIdAndUser as jest.Mock).mockResolvedValue(mockConv);
      (messageRepository.deleteByConversationId as jest.Mock).mockResolvedValue(5);
      (conversationRepository.deleteById as jest.Mock).mockResolvedValue(true);

      const result = await conversationService.deleteConversation(mockUserId, mockConversationId);

      expect(messageRepository.deleteByConversationId).toHaveBeenCalledWith(mockConversationId);
      expect(conversationRepository.deleteById).toHaveBeenCalledWith(mockConversationId);
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(5);
    });

    it("should throw 404 if conversation is not found for user", async () => {
      (conversationRepository.findByIdAndUser as jest.Mock).mockResolvedValue(null);

      await expect(
        conversationService.deleteConversation(mockOtherUserId, mockConversationId)
      ).rejects.toThrow(new AppError("Conversation not found", 404));
    });
  });
});
