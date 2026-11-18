import { useAIChatStream, UseAIChatStreamOptions } from "../useAIChatStream";
import { streamAICoachingResponse } from "../../services/sseStream.service";
import { conversationService } from "../../services/conversation.service";
import { conversationKeys } from "../useConversations";
import { QueryClient } from "@tanstack/react-query";
import type {
  ConversationMessagesResponse,
  ConversationListResponse,
  GenerateResponse,
  StreamCoachingOptions,
} from "../../types/coach.types";

jest.mock("../../services/api", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    defaults: { baseURL: "http://localhost:5000" },
  },
}));
jest.mock("../../services/sseStream.service");
jest.mock("../../services/conversation.service");

let testQueryClient: QueryClient;
let currentDispatcher: any = null;

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: () => testQueryClient,
  };
});

jest.mock("react", () => {
  const actual = jest.requireActual("react");
  return {
    ...actual,
    useState: (initial: any) => currentDispatcher.useState(initial),
    useRef: (initial: any) => currentDispatcher.useRef(initial),
    useCallback: (cb: any, deps: any[]) => currentDispatcher.useCallback(cb, deps),
    useEffect: (effect: any, deps: any[]) => currentDispatcher.useEffect(effect, deps),
  };
});

// Custom hook test runner for React in Jest Node environment
function setupHook(initialOptions: UseAIChatStreamOptions) {
  testQueryClient = new QueryClient();

  let currentOptions = initialOptions;
  let hookOutput: ReturnType<typeof useAIChatStream>;

  const stateCells: any[] = [];
  const refCells: any[] = [];
  const effectCells: Array<{
    deps: any[] | undefined;
    cleanup?: (() => void) | void;
  }> = [];

  let stateIdx = 0;
  let refIdx = 0;
  let effectIdx = 0;
  let isMounted = true;
  let isRunning = false;
  let needsRerender = false;
  let pendingEffects: Array<() => void> = [];

  const mockUseState = (initial: any) => {
    const idx = stateIdx++;
    if (stateCells.length <= idx) {
      stateCells[idx] = typeof initial === "function" ? initial() : initial;
    }
    const setState = (action: any) => {
      const next = typeof action === "function" ? action(stateCells[idx]) : action;
      if (Object.is(stateCells[idx], next)) {
        return; // React bail-out for identical state
      }
      stateCells[idx] = next;
      if (isMounted) {
        if (isRunning) {
          needsRerender = true;
        } else {
          runRender();
        }
      }
    };
    return [stateCells[idx], setState];
  };

  const mockUseRef = (initial: any) => {
    const idx = refIdx++;
    if (refCells.length <= idx) {
      refCells[idx] = { current: initial };
    }
    return refCells[idx];
  };

  const mockUseCallback = (callback: any, _deps: any[]) => callback;

  const mockUseEffect = (effect: () => (() => void) | void, deps?: any[]) => {
    const idx = effectIdx++;
    const prev = effectCells[idx];
    const hasChanged = !prev || !deps || deps.some((d, i) => d !== prev.deps?.[i]);

    if (hasChanged) {
      pendingEffects.push(() => {
        if (prev?.cleanup) {
          try {
            prev.cleanup();
          } catch {}
        }
        const cleanup = effect();
        effectCells[idx] = { deps, cleanup };
      });
    }
  };

  currentDispatcher = {
    useState: mockUseState,
    useRef: mockUseRef,
    useCallback: mockUseCallback,
    useEffect: mockUseEffect,
  };

  function runRender() {
    isRunning = true;
    stateIdx = 0;
    refIdx = 0;
    effectIdx = 0;
    pendingEffects = [];
    hookOutput = useAIChatStream(currentOptions);
    isRunning = false;

    // Flush pending effects after render
    const effectsToRun = [...pendingEffects];
    pendingEffects = [];
    for (const runEffect of effectsToRun) {
      runEffect();
    }

    if (needsRerender) {
      needsRerender = false;
      runRender();
    }
  }

  function rerender(newOptions?: Partial<UseAIChatStreamOptions>) {
    if (newOptions) {
      currentOptions = { ...currentOptions, ...newOptions };
    }
    runRender();
  }

  function unmount() {
    isMounted = false;
    for (const cell of effectCells) {
      if (cell?.cleanup) {
        try {
          cell.cleanup();
        } catch {}
      }
    }
  }

  // Initial render
  runRender();

  return {
    get result() {
      return { current: hookOutput };
    },
    rerender,
    unmount,
    queryClient: testQueryClient,
  };
}

describe("useAIChatStream State Machine & Operations Unit Tests (M3.4.3)", () => {
  const mockConvId = "507f1f77bcf86cd799439011";

  const mockCompletedData: GenerateResponse = {
    userMessage: {
      id: "msg_srv_user_1",
      conversationId: mockConvId,
      role: "user",
      content: "Explain progressive overload",
      createdAt: "2026-11-10T12:00:00Z",
    },
    assistantMessage: {
      id: "msg_srv_ai_1",
      conversationId: mockConvId,
      role: "assistant",
      content: "Progressive overload is gradually increasing training stimulus.",
      createdAt: "2026-11-10T12:00:05Z",
    },
    sources: [
      {
        title: "Science and Development of Muscle Hypertrophy",
        category: "hypertrophy",
        source: "Brad Schoenfeld",
        documentId: "doc_1",
        chunkId: "chk_1",
        similarity: 0.91,
      },
    ],
    metadata: {
      model: "gemini-2.5-pro",
      tokenCount: 42,
      isGrounded: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes with idle state and empty buffers", () => {
    const harness = setupHook({ conversationId: mockConvId });

    expect(harness.result.current.status).toBe("idle");
    expect(harness.result.current.isIdle).toBe(true);
    expect(harness.result.current.isStreaming).toBe(false);
    expect(harness.result.current.streamingText).toBe("");
    expect(harness.result.current.streamingSources).toEqual([]);
    expect(harness.result.current.optimisticUserMessage).toBeNull();
    expect(harness.result.current.error).toBeNull();
  });

  it("transitions connecting -> streaming -> completed and reconciles React Query cache", async () => {
    let capturedCallbacks: any = null;

    (streamAICoachingResponse as jest.Mock).mockImplementation(
      async (_convId: string, opts: StreamCoachingOptions) => {
        capturedCallbacks = opts.callbacks;
        // Simulate SSE lifecycle
        opts.callbacks?.onStart?.({ status: "started" });
        opts.callbacks?.onChunk?.({ text: "Progressive overload " });
        opts.callbacks?.onChunk?.({ text: "is gradually increasing stimulus." });
        opts.callbacks?.onComplete?.({ success: true, data: mockCompletedData });
        return mockCompletedData;
      }
    );

    const onStart = jest.fn();
    const onChunk = jest.fn();
    const onComplete = jest.fn();

    const harness = setupHook({
      conversationId: mockConvId,
      onStart,
      onChunk,
      onComplete,
    });

    // Seed existing message cache
    const messagesKey = [...conversationKeys.messages(), mockConvId];
    harness.queryClient.setQueryData<ConversationMessagesResponse>(messagesKey, {
      messages: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 1 },
    });

    // Seed conversation list cache
    const listKey = conversationKeys.list(1, 20);
    harness.queryClient.setQueryData<ConversationListResponse>(listKey, {
      conversations: [
        {
          _id: mockConvId,
          userId: "u1",
          title: "New Conversation",
          lastMessageAt: "2026-11-10T11:00:00Z",
          createdAt: "2026-11-10T11:00:00Z",
          updatedAt: "2026-11-10T11:00:00Z",
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const promise = harness.result.current.sendMessage("Explain progressive overload");

    const result = await promise;

    expect(result).toEqual(mockCompletedData);
    expect(harness.result.current.status).toBe("completed");
    expect(harness.result.current.isCompleted).toBe(true);
    expect(harness.result.current.optimisticUserMessage).toBeNull();
    expect(harness.result.current.streamingSources).toHaveLength(1);
    expect(harness.result.current.streamingSources[0].title).toContain("Science and Development");

    // Callbacks verification
    expect(onStart).toHaveBeenCalledWith({ status: "started" });
    expect(onChunk).toHaveBeenCalledTimes(2);
    expect(onComplete).toHaveBeenCalled();

    // Verify React Query message reconciliation
    const cachedMessages = harness.queryClient.getQueryData<ConversationMessagesResponse>(messagesKey);
    expect(cachedMessages?.messages).toHaveLength(2);
    expect(cachedMessages?.messages[0].id).toBe("msg_srv_user_1");
    expect(cachedMessages?.messages[1].id).toBe("msg_srv_ai_1");
    expect(cachedMessages?.pagination.total).toBe(2);

    // Verify conversation list lastMessageAt update
    const listData = harness.queryClient.getQueryData<ConversationListResponse>(listKey);
    expect(listData?.conversations[0].lastMessageAt).toBe("2026-11-10T12:00:05Z");
  });

  it("handles user cancellation (stopGeneration) without fabricating an assistant message", async () => {
    let capturedSignal: AbortSignal | undefined;

    (streamAICoachingResponse as jest.Mock).mockImplementation(
      async (_convId: string, opts: StreamCoachingOptions) => {
        capturedSignal = opts.signal;
        opts.callbacks?.onStart?.({ status: "started" });
        opts.callbacks?.onChunk?.({ text: "Half answer..." });

        // Simulate wait until abort
        return new Promise((resolve) => {
          opts.signal?.addEventListener("abort", () => {
            resolve(null);
          });
        });
      }
    );

    const harness = setupHook({ conversationId: mockConvId });

    // Seed empty message cache
    const messagesKey = [...conversationKeys.messages(), mockConvId];
    harness.queryClient.setQueryData<ConversationMessagesResponse>(messagesKey, {
      messages: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 1 },
    });

    const sendPromise = harness.result.current.sendMessage("Tell me a long workout plan");

    // While streaming, invoke stopGeneration
    expect(harness.result.current.isStreaming).toBe(true);
    harness.result.current.stopGeneration();

    expect(capturedSignal?.aborted).toBe(true);
    expect(harness.result.current.status).toBe("cancelled");
    expect(harness.result.current.isCancelled).toBe(true);

    await sendPromise;

    // Verify that NO assistant message was fabricated into the cache
    const cached = harness.queryClient.getQueryData<ConversationMessagesResponse>(messagesKey);
    expect(cached?.messages).toHaveLength(0);
  });

  it("prevents concurrent message submissions within the same hook", async () => {
    (streamAICoachingResponse as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    const harness = setupHook({ conversationId: mockConvId });

    harness.result.current.sendMessage("Message 1");

    // Second call while first is in progress
    await expect(harness.result.current.sendMessage("Message 2")).rejects.toThrow(
      "A coaching response is already being generated"
    );
  });

  it("formats HTTP 409 conflict error without infinite automatic retry", async () => {
    const conflictError: any = new Error("Conflict");
    conflictError.statusCode = 409;

    (streamAICoachingResponse as jest.Mock).mockRejectedValue(conflictError);

    const onError = jest.fn();
    const harness = setupHook({ conversationId: mockConvId, onError });

    await expect(harness.result.current.sendMessage("Hello")).rejects.toThrow(
      "A coaching response is currently being generated for this conversation. Please wait a moment."
    );

    expect(harness.result.current.status).toBe("error");
    expect(harness.result.current.isError).toBe(true);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("being generated"),
      })
    );
  });

  it("formats HTTP 429 quota exhaustion with actionable error", async () => {
    const quotaError: any = new Error("Quota exceeded");
    quotaError.statusCode = 429;

    (streamAICoachingResponse as jest.Mock).mockRejectedValue(quotaError);

    const harness = setupHook({ conversationId: mockConvId });

    await expect(harness.result.current.sendMessage("Hello")).rejects.toThrow(
      "AI coaching quota temporarily exhausted. Please wait a few moments before trying again."
    );
  });

  it("formats HTTP 503 service unavailable with clear message", async () => {
    const unavailableError: any = new Error("Service Unavailable");
    unavailableError.statusCode = 503;

    (streamAICoachingResponse as jest.Mock).mockRejectedValue(unavailableError);

    const harness = setupHook({ conversationId: mockConvId });

    await expect(harness.result.current.sendMessage("Hello")).rejects.toThrow(
      "AI coaching service is temporarily unavailable. Please try again shortly."
    );
  });

  it("discards callbacks and aborts active stream when switching conversations during streaming", async () => {
    let capturedSignal: AbortSignal | undefined;
    let lateCallback: any = null;

    (streamAICoachingResponse as jest.Mock).mockImplementation(
      async (_convId: string, opts: StreamCoachingOptions) => {
        capturedSignal = opts.signal;
        lateCallback = opts.callbacks;
        return new Promise((resolve) => {
          opts.signal?.addEventListener("abort", () => resolve(null));
        });
      }
    );

    const harness = setupHook({ conversationId: "conv_A" });

    harness.result.current.sendMessage("Message to Conv A");

    // Switch conversationId to conv_B
    harness.rerender({ conversationId: "conv_B" });

    // Previous stream signal should be aborted
    expect(capturedSignal?.aborted).toBe(true);
    expect(harness.result.current.status).toBe("idle");
    expect(harness.result.current.streamingText).toBe("");

    // Late callback arriving from old conv_A should be completely ignored
    lateCallback?.onChunk?.({ text: "stale chunk for A" });
    expect(harness.result.current.streamingText).toBe("");
  });

  it("aborts active stream on component unmount", () => {
    let capturedSignal: AbortSignal | undefined;

    (streamAICoachingResponse as jest.Mock).mockImplementation(
      async (_convId: string, opts: StreamCoachingOptions) => {
        capturedSignal = opts.signal;
        return new Promise(() => {});
      }
    );

    const harness = setupHook({ conversationId: mockConvId });

    harness.result.current.sendMessage("Hello unmount");

    // Unmount
    harness.unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });

  it("retry pre-flight checks server: reconciles without duplicate user message if already completed", async () => {
    // 1. Initial send fails with connection drop
    (streamAICoachingResponse as jest.Mock).mockRejectedValueOnce(
      new Error("Network connection dropped")
    );

    const harness = setupHook({ conversationId: mockConvId });

    await expect(harness.result.current.sendMessage("My retry message")).rejects.toThrow();
    expect(harness.result.current.status).toBe("error");

    // 2. Mock server state to simulate that the server DID complete before disconnect
    (conversationService.getConversationMessages as jest.Mock).mockResolvedValue({
      messages: [
        {
          id: "m_ai_2",
          conversationId: mockConvId,
          role: "assistant",
          content: "Answer already saved on backend",
        },
        {
          id: "m_user_2",
          conversationId: mockConvId,
          role: "user",
          content: "My retry message",
        },
      ],
      pagination: { page: 1, limit: 50, total: 2, totalPages: 1 },
    });

    const invalidateSpy = jest.spyOn(harness.queryClient, "invalidateQueries");

    // 3. User invokes retry
    await harness.result.current.retry();

    // Verify it did NOT invoke streamAICoachingResponse again (preventing duplicate user message)
    expect(streamAICoachingResponse).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [...conversationKeys.messages(), mockConvId],
    });
    expect(harness.result.current.status).toBe("completed");
  });

  it("retry resends failed message when server has no matching message", async () => {
    (streamAICoachingResponse as jest.Mock)
      .mockRejectedValueOnce(new Error("Network glitch"))
      .mockImplementationOnce(async (_convId, opts) => {
        opts.callbacks?.onComplete?.({ success: true, data: mockCompletedData });
        return mockCompletedData;
      });

    (conversationService.getConversationMessages as jest.Mock).mockResolvedValue({
      messages: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 1 },
    });

    const harness = setupHook({ conversationId: mockConvId });

    await expect(harness.result.current.sendMessage("Retry test")).rejects.toThrow();

    // Call retry
    await harness.result.current.retry();

    expect(streamAICoachingResponse).toHaveBeenCalledTimes(2);
    expect(harness.result.current.status).toBe("completed");
  });
});
