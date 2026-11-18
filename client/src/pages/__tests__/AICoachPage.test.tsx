import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AICoachPage } from "../AICoachPage";
import * as useConversationsModule from "../../hooks/useConversations";
import * as useConversationModule from "../../hooks/useConversation";
import * as useAIChatStreamModule from "../../hooks/useAIChatStream";
import toast from "react-hot-toast";
import type { Conversation, ConversationMessage, KnowledgeSource } from "../../types/coach.types";

// Mock API to avoid import.meta ESM issues under CommonJS ts-jest
jest.mock("../../services/api", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock ReactMarkdown to avoid pure ESM issues under CommonJS ts-jest
jest.mock("react-markdown", () => {
  return function MockReactMarkdown({ children }: any) {
    return <div data-testid="mock-markdown">{children}</div>;
  };
});
jest.mock("remark-gfm", () => () => {});
jest.mock("react-hot-toast");

// Helper to safely invoke function components with React hooks in Node test environment
function withReactHooks<T>(
  fn: () => T,
  options: {
    stateMap?: Map<number, [any, jest.Mock]>;
    refMap?: Map<number, { current: any }>;
    runEffects?: boolean;
  } = {}
): T {
  const origUseState = React.useState;
  const origUseEffect = React.useEffect;
  const origUseCallback = React.useCallback;
  const origUseRef = React.useRef;
  const origUseMemo = React.useMemo;

  let stateCallIndex = 0;
  let refCallIndex = 0;

  React.useState = ((init: any) => {
    stateCallIndex++;
    if (options.stateMap && options.stateMap.has(stateCallIndex)) {
      return options.stateMap.get(stateCallIndex)!;
    }
    const val = typeof init === "function" ? init() : init;
    return [val, jest.fn()];
  }) as any;

  React.useEffect = ((effect: any) => {
    if (options.runEffects) {
      try {
        effect();
      } catch {}
    }
  }) as any;

  React.useCallback = ((cb: any) => cb) as any;
  React.useMemo = ((cb: any) => cb()) as any;

  React.useRef = ((init: any) => {
    refCallIndex++;
    if (options.refMap && options.refMap.has(refCallIndex)) {
      return options.refMap.get(refCallIndex)!;
    }
    return { current: init };
  }) as any;

  try {
    return fn();
  } finally {
    React.useState = origUseState;
    React.useEffect = origUseEffect;
    React.useCallback = origUseCallback;
    React.useMemo = origUseMemo;
    React.useRef = origUseRef;
  }
}

describe("AICoachPage Integration (M3.4.5)", () => {
  const mockOldConversation: Conversation = {
    _id: "conv-1",
    userId: "user-1",
    title: "Leg Day Squat Technique",
    createdAt: "2026-11-14T08:00:00.000Z",
    updatedAt: "2026-11-14T08:30:00.000Z",
    lastMessageAt: "2026-11-14T08:30:00.000Z",
  };

  const mockLatestConversation: Conversation = {
    _id: "conv-2",
    userId: "user-1",
    title: "Bench Press Progressive Overload",
    createdAt: "2026-11-15T09:00:00.000Z",
    updatedAt: "2026-11-15T10:00:05.000Z",
    lastMessageAt: "2026-11-15T10:00:05.000Z",
  };

  const mockUserMessage: ConversationMessage = {
    id: "msg-user-101",
    conversationId: "conv-2",
    role: "user",
    content: "How much volume per week for chest hypertrophy?",
    createdAt: "2026-11-15T10:00:00.000Z",
  };

  const mockAssistantMessage: ConversationMessage = {
    id: "msg-asst-102",
    conversationId: "conv-2",
    role: "assistant",
    content: "Aim for 10-20 weekly hard sets spread across 2-3 sessions.",
    createdAt: "2026-11-15T10:00:05.000Z",
  };

  const mockSource: KnowledgeSource = {
    title: "Dose-Response Hypertrophy Study",
    category: "Hypertrophy",
    source: "Schoenfeld et al. (2017)",
    sourceUrl: "https://example.com/study",
    documentId: "doc-1",
    chunkId: "chk-1",
    similarity: 0.92,
  };

  let mockUseConversations: jest.SpyInstance;
  let mockUseConversation: jest.SpyInstance;
  let mockUseAIChatStream: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseConversations = jest.spyOn(useConversationsModule, "useConversations").mockReturnValue({
      conversations: [mockOldConversation, mockLatestConversation],
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
      refetch: jest.fn(),
      createConversation: jest.fn().mockResolvedValue({
        conversation: {
          _id: "conv-new-3",
          userId: "user-1",
          title: "New Conversation",
          lastMessageAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        message: null,
      }),
      createConversationAsync: jest.fn(),
      isCreating: false,
      createError: null,
      deleteConversation: jest.fn().mockResolvedValue({ success: true, message: "Deleted" }),
      deleteConversationAsync: jest.fn(),
      isDeleting: false,
      deleteError: null,
    });

    mockUseConversation = jest.spyOn(useConversationModule, "useConversation").mockReturnValue({
      conversation: mockLatestConversation,
      messages: [mockUserMessage, mockAssistantMessage],
      pagination: { page: 1, limit: 50, total: 2, totalPages: 1 },
      isLoading: false,
      isConversationLoading: false,
      isMessagesLoading: false,
      isError: false,
      error: null,
      isConversationError: false,
      conversationError: null,
      isMessagesError: false,
      messagesError: null,
      refetchConversation: jest.fn(),
      refetchMessages: jest.fn(),
      cleanupConversation: jest.fn(),
    });

    mockUseAIChatStream = jest.spyOn(useAIChatStreamModule, "useAIChatStream").mockReturnValue({
      status: "idle",
      streamingText: "",
      streamingSources: [],
      optimisticUserMessage: null,
      lastCompletedResult: null,
      error: null,
      sendMessage: jest.fn().mockResolvedValue(null),
      stopGeneration: jest.fn(),
      retry: jest.fn(),
      reset: jest.fn(),
      isIdle: true,
      isConnecting: false,
      isStreaming: false,
      isStopping: false,
      isCancelled: false,
      isCompleted: false,
      isError: false,
      isBusy: false,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── 1. Initial Load & Conversation Selection ─────────────────────────────────
  describe("Initial load and conversation selection", () => {
    it("renders the sidebar and chat workstation with the active conversation", () => {
      const html = renderToStaticMarkup(<AICoachPage />);

      expect(html).toContain("Bench Press Progressive Overload");
      expect(html).toContain("Leg Day Squat Technique");
      expect(html).toContain("How much volume per week for chest hypertrophy?");
      expect(html).toContain("Aim for 10-20 weekly hard sets spread across 2-3 sessions.");
      expect(html).toContain("Ask BodyForge Coach about your workouts, nutrition, or recovery...");
    });

    it("auto-selects the latest conversation based on lastMessageAt", () => {
      const html = renderToStaticMarkup(<AICoachPage />);
      expect(html).toContain("Bench Press Progressive Overload");
      expect(html).toContain("Ask BodyForge Coach about your workouts, nutrition, or recovery...");
    });

    it("auto-selects the latest conversation when conversations load asynchronously", () => {
      const setSelectedIdMock = jest.fn();

      const stateMap = new Map<number, [any, jest.Mock]>([
        [1, [null, setSelectedIdMock]],
      ]);

      withReactHooks(() => AICoachPage(), { stateMap, runEffects: true });
      expect(setSelectedIdMock).toHaveBeenCalledWith("conv-2");
    });

    it("renders empty state placeholder when no conversations exist", () => {
      mockUseConversations.mockReturnValue({
        conversations: [],
        pagination: null,
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
        refetch: jest.fn(),
        createConversation: jest.fn(),
        createConversationAsync: jest.fn(),
        isCreating: false,
        createError: null,
        deleteConversation: jest.fn(),
        deleteConversationAsync: jest.fn(),
        isDeleting: false,
        deleteError: null,
      });

      mockUseConversation.mockReturnValue({
        conversation: null,
        messages: [],
        pagination: null,
        isLoading: false,
        isConversationLoading: false,
        isMessagesLoading: false,
        isError: false,
        error: null,
        isConversationError: false,
        conversationError: null,
        isMessagesError: false,
        messagesError: null,
        refetchConversation: jest.fn(),
        refetchMessages: jest.fn(),
        cleanupConversation: jest.fn(),
      });

      const html = renderToStaticMarkup(<AICoachPage />);

      expect(html).toContain("BodyForge AI Coach");
      expect(html).toContain("No chats yet");
      expect(html).toContain("Meet Your BodyForge AI Coach");
      expect(html).toContain("Ask BodyForge Coach a question to start...");
    });
  });

  // ── 2. New Conversation & Creation Flow ─────────────────────────────────────
  describe("New conversation orchestration", () => {
    it("stops active generation if busy and creates a new conversation", async () => {
      const stopGenerationMock = jest.fn();
      mockUseAIChatStream.mockReturnValue({
        status: "streaming",
        streamingText: "Partial advice...",
        streamingSources: [],
        optimisticUserMessage: null,
        lastCompletedResult: null,
        error: null,
        sendMessage: jest.fn(),
        stopGeneration: stopGenerationMock,
        retry: jest.fn(),
        reset: jest.fn(),
        isIdle: false,
        isConnecting: false,
        isStreaming: true,
        isStopping: false,
        isCancelled: false,
        isCompleted: false,
        isError: false,
        isBusy: true,
      });

      const createConversationMock = jest.fn().mockResolvedValue({
        conversation: { _id: "conv-brand-new", title: "New Conversation" },
      });
      mockUseConversations.mockReturnValue({
        conversations: [mockLatestConversation],
        pagination: null,
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
        refetch: jest.fn(),
        createConversation: createConversationMock,
        createConversationAsync: jest.fn(),
        isCreating: false,
        createError: null,
        deleteConversation: jest.fn(),
        deleteConversationAsync: jest.fn(),
        isDeleting: false,
        deleteError: null,
      });

      const setSelectedIdMock = jest.fn();
      const stateMap = new Map<number, [any, jest.Mock]>([
        [1, ["conv-2", setSelectedIdMock]],
      ]);

      await withReactHooks(async () => {
        const element = AICoachPage();
        const sidebar = element.props.children.props.children[0];
        // Trigger onNewConversation
        await sidebar.props.onNewConversation();

        expect(stopGenerationMock).toHaveBeenCalled();
        expect(createConversationMock).toHaveBeenCalled();
        expect(setSelectedIdMock).toHaveBeenCalledWith("conv-brand-new");
        expect(toast.success).toHaveBeenCalledWith("New chat started");
      }, { stateMap });
    });
  });

  // ── 3. Switching Conversations During Generation ─────────────────────────────
  describe("Switching conversations", () => {
    it("aborts active generation and updates selectedConversationId", () => {
      const stopGenerationMock = jest.fn();
      mockUseAIChatStream.mockReturnValue({
        status: "streaming",
        streamingText: "Streaming tokens...",
        streamingSources: [],
        optimisticUserMessage: null,
        lastCompletedResult: null,
        error: null,
        sendMessage: jest.fn(),
        stopGeneration: stopGenerationMock,
        retry: jest.fn(),
        reset: jest.fn(),
        isIdle: false,
        isConnecting: false,
        isStreaming: true,
        isStopping: false,
        isCancelled: false,
        isCompleted: false,
        isError: false,
        isBusy: true,
      });

      const setSelectedIdMock = jest.fn();
      const stateMap = new Map<number, [any, jest.Mock]>([
        [1, ["conv-2", setSelectedIdMock]],
      ]);

      withReactHooks(() => {
        const element = AICoachPage();
        const sidebar = element.props.children.props.children[0];
        // Select conv-1
        sidebar.props.onSelectConversation("conv-1");

        expect(stopGenerationMock).toHaveBeenCalled();
        expect(setSelectedIdMock).toHaveBeenCalledWith("conv-1");
      }, { stateMap });
    });
  });

  // ── 4. Sending Messages and In-Flight Streaming ─────────────────────────────
  describe("Sending messages and stream rendering", () => {
    it("submits message via chatStream.sendMessage", async () => {
      const sendMessageMock = jest.fn().mockResolvedValue(null);
      mockUseAIChatStream.mockReturnValue({
        status: "idle",
        streamingText: "",
        streamingSources: [],
        optimisticUserMessage: null,
        lastCompletedResult: null,
        error: null,
        sendMessage: sendMessageMock,
        stopGeneration: jest.fn(),
        retry: jest.fn(),
        reset: jest.fn(),
        isIdle: true,
        isConnecting: false,
        isStreaming: false,
        isStopping: false,
        isCancelled: false,
        isCompleted: false,
        isError: false,
        isBusy: false,
      });

      const stateMap = new Map<number, [any, jest.Mock]>([
        [1, ["conv-2", jest.fn()]],
      ]);

      await withReactHooks(async () => {
        const element = AICoachPage();
        const chatWorkstation = element.props.children.props.children[1];
        const inputBoxWrapper = chatWorkstation.props.children[4];
        const inputBox = inputBoxWrapper.props.children;

        await inputBox.props.onSend("How to improve bench press arch?");
        expect(sendMessageMock).toHaveBeenCalledWith("How to improve bench press arch?");
      }, { stateMap });
    });

    it("renders streaming assistant chunks, optimistic user message and knowledge sources", () => {
      const optimisticMsg: ConversationMessage = {
        id: "opt-user-temp",
        conversationId: "conv-2",
        role: "user",
        content: "Explain progressive overload clearly",
        createdAt: "2026-11-15T10:02:00.000Z",
      };

      mockUseAIChatStream.mockReturnValue({
        status: "streaming",
        streamingText: "Progressive overload requires incrementally increasing stimulus...",
        streamingSources: [mockSource],
        optimisticUserMessage: optimisticMsg,
        lastCompletedResult: null,
        error: null,
        sendMessage: jest.fn(),
        stopGeneration: jest.fn(),
        retry: jest.fn(),
        reset: jest.fn(),
        isIdle: false,
        isConnecting: false,
        isStreaming: true,
        isStopping: false,
        isCancelled: false,
        isCompleted: false,
        isError: false,
        isBusy: true,
      });

      const html = renderToStaticMarkup(<AICoachPage />);

      expect(html).toContain("Explain progressive overload clearly");
      expect(html).toContain("Progressive overload requires incrementally increasing stimulus...");
      expect(html).toContain("Grounded in 1 verified source");
    });

    it("renders cancellation notice when generation is stopped", () => {
      mockUseAIChatStream.mockReturnValue({
        status: "cancelled",
        streamingText: "",
        streamingSources: [],
        optimisticUserMessage: null,
        lastCompletedResult: null,
        error: null,
        sendMessage: jest.fn(),
        stopGeneration: jest.fn(),
        retry: jest.fn(),
        reset: jest.fn(),
        isIdle: false,
        isConnecting: false,
        isStreaming: false,
        isStopping: false,
        isCancelled: true,
        isCompleted: false,
        isError: false,
        isBusy: false,
      });

      const html = renderToStaticMarkup(<AICoachPage />);

      expect(html).toContain("Response generation was stopped.");
      expect(html).toContain("Dismiss");
    });

    it("renders error banner with retry button when generation fails", () => {
      const retryMock = jest.fn();
      mockUseAIChatStream.mockReturnValue({
        status: "error",
        streamingText: "",
        streamingSources: [],
        optimisticUserMessage: null,
        lastCompletedResult: null,
        error: new Error("AI coaching service is temporarily unavailable. Please try again shortly."),
        sendMessage: jest.fn(),
        stopGeneration: jest.fn(),
        retry: retryMock,
        reset: jest.fn(),
        isIdle: false,
        isConnecting: false,
        isStreaming: false,
        isStopping: false,
        isCancelled: false,
        isCompleted: false,
        isError: true,
        isBusy: false,
      });

      const html = renderToStaticMarkup(<AICoachPage />);

      expect(html).toContain("AI coaching service is temporarily unavailable. Please try again shortly.");
      expect(html).toContain("Retry");
    });
  });

  // ── 5. Conversation Deletion ────────────────────────────────────────────────
  describe("Conversation deletion orchestration", () => {
    it("deletes active conversation and switches to next available conversation", async () => {
      const deleteConversationMock = jest.fn().mockResolvedValue({ success: true, message: "Deleted" });
      mockUseConversations.mockReturnValue({
        conversations: [mockOldConversation, mockLatestConversation],
        pagination: null,
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
        refetch: jest.fn(),
        createConversation: jest.fn(),
        createConversationAsync: jest.fn(),
        isCreating: false,
        createError: null,
        deleteConversation: deleteConversationMock,
        deleteConversationAsync: jest.fn(),
        isDeleting: false,
        deleteError: null,
      });

      const setSelectedIdMock = jest.fn();
      const stateMap = new Map<number, [any, jest.Mock]>([
        [1, ["conv-2", setSelectedIdMock]], // active is conv-2
      ]);

      await withReactHooks(async () => {
        const element = AICoachPage();
        const sidebar = element.props.children.props.children[0];

        // Delete active conversation conv-2
        await sidebar.props.onDeleteConversation("conv-2");

        expect(deleteConversationMock).toHaveBeenCalledWith("conv-2");
        expect(toast.success).toHaveBeenCalledWith("Conversation deleted");
        // Next available conversation is conv-1
        expect(setSelectedIdMock).toHaveBeenCalledWith("conv-1");
      }, { stateMap });
    });

    it("resets selection to null when the only conversation is deleted", async () => {
      const deleteConversationMock = jest.fn().mockResolvedValue({ success: true, message: "Deleted" });
      mockUseConversations.mockReturnValue({
        conversations: [mockLatestConversation], // only conv-2
        pagination: null,
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
        refetch: jest.fn(),
        createConversation: jest.fn(),
        createConversationAsync: jest.fn(),
        isCreating: false,
        createError: null,
        deleteConversation: deleteConversationMock,
        deleteConversationAsync: jest.fn(),
        isDeleting: false,
        deleteError: null,
      });

      const setSelectedIdMock = jest.fn();
      const stateMap = new Map<number, [any, jest.Mock]>([
        [1, ["conv-2", setSelectedIdMock]],
      ]);

      await withReactHooks(async () => {
        const element = AICoachPage();
        const sidebar = element.props.children.props.children[0];

        await sidebar.props.onDeleteConversation("conv-2");

        expect(deleteConversationMock).toHaveBeenCalledWith("conv-2");
        expect(setSelectedIdMock).toHaveBeenCalledWith(null);
      }, { stateMap });
    });
  });

  // ── 6. Mobile Drawer Responsiveness ─────────────────────────────────────────
  describe("Mobile drawer behavior", () => {
    it("opens mobile sidebar drawer when toggle button is clicked", () => {
      const setMobileOpenMock = jest.fn();
      const stateMap = new Map<number, [any, jest.Mock]>([
        [1, ["conv-2", jest.fn()]],
        [2, [false, setMobileOpenMock]], // isMobileSidebarOpen = false
      ]);

      withReactHooks(() => {
        const element = AICoachPage();
        const chatWorkstation = element.props.children.props.children[1];
        const header = chatWorkstation.props.children[0];
        const toggleBtn = header.props.children[0].props.children[0];

        expect(toggleBtn.props["aria-label"]).toBe("Open conversation sidebar");
        toggleBtn.props.onClick();
        expect(setMobileOpenMock).toHaveBeenCalledWith(true);
      }, { stateMap });
    });
  });
});
