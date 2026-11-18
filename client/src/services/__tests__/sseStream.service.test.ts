import {
  SSEParser,
  SSEStreamError,
  streamAICoachingResponse,
} from "../sseStream.service";
import type { GenerateResponse } from "../../types/coach.types";

jest.mock("../api", () => ({
  api: {
    defaults: {
      baseURL: "http://localhost:5000",
    },
  },
}));

describe("SSEStream & SSEParser Unit Tests (M3.4.2)", () => {
  describe("SSEParser Core Behavior", () => {
    let parser: SSEParser;
    let events: Array<{ type: string; data: string }>;

    beforeEach(() => {
      parser = new SSEParser();
      events = [];
    });

    const collector = (type: string, data: string) => {
      events.push({ type, data });
    };

    it("parses normal start, chunk, and complete sequence with LF", () => {
      const sseText =
        'event: start\ndata: {"status":"started"}\n\n' +
        'event: chunk\ndata: {"text":"Hello "}\n\n' +
        'event: chunk\ndata: {"text":"world!"}\n\n' +
        'event: complete\ndata: {"success":true,"data":{"userMessage":{"id":"1","conversationId":"c1","role":"user","content":"Hi","createdAt":"2026-11-10"},"assistantMessage":{"id":"2","conversationId":"c1","role":"assistant","content":"Hello world!","createdAt":"2026-11-10"},"sources":[]}}\n\n';

      parser.feed(sseText, collector);
      parser.end(collector);

      expect(events).toHaveLength(4);
      expect(events[0]).toEqual({ type: "start", data: '{"status":"started"}' });
      expect(events[1]).toEqual({ type: "chunk", data: '{"text":"Hello "}' });
      expect(events[2]).toEqual({ type: "chunk", data: '{"text":"world!"}' });
      expect(events[3].type).toBe("complete");
      expect(JSON.parse(events[3].data).success).toBe(true);
    });

    it("handles CRLF (\\r\\n) line endings correctly", () => {
      const crlfText =
        'event: start\r\ndata: {"status":"started"}\r\n\r\n' +
        'event: chunk\r\ndata: {"text":"Bench press guidelines"}\r\n\r\n';

      parser.feed(crlfText, collector);
      parser.end(collector);

      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({ type: "start", data: '{"status":"started"}' });
      expect(events[1]).toEqual({ type: "chunk", data: '{"text":"Bench press guidelines"}' });
    });

    it("handles multiple events delivered in a single network chunk", () => {
      const multiEventChunk =
        'event: chunk\ndata: {"text":"A"}\n\n' +
        'event: chunk\ndata: {"text":"B"}\n\n' +
        'event: chunk\ndata: {"text":"C"}\n\n';

      parser.feed(multiEventChunk, collector);
      parser.end(collector);

      expect(events).toHaveLength(3);
      expect(events.map((e) => JSON.parse(e.data).text)).toEqual(["A", "B", "C"]);
    });

    it("handles fragmented events split across multiple network reads", () => {
      // Feed split across arbitrary byte positions
      parser.feed('event: ch', collector);
      expect(events).toHaveLength(0);

      parser.feed('unk\ndata: {"te', collector);
      expect(events).toHaveLength(0);

      parser.feed('xt":"Progressive Overload"}\n', collector);
      expect(events).toHaveLength(0);

      parser.feed('\n', collector); // Final newline delimiter triggers dispatch
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        type: "chunk",
        data: '{"text":"Progressive Overload"}',
      });
    });

    it("handles CRLF split across chunk boundaries (\\r in chunk 1, \\n in chunk 2)", () => {
      parser.feed('event: chunk\r\ndata: {"text":"RPE 8"}\r', collector);
      expect(events).toHaveLength(0);

      parser.feed('\n\r\n', collector);
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ type: "chunk", data: '{"text":"RPE 8"}' });
    });

    it("ignores comment lines (: comment) and empty lines without events", () => {
      const textWithComments =
        ': ping\n' +
        '\n' +
        'event: chunk\n' +
        ': keepalive\n' +
        'data: {"text":"Ready"}\n' +
        '\n';

      parser.feed(textWithComments, collector);
      parser.end(collector);

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ type: "chunk", data: '{"text":"Ready"}' });
    });

    it("handles final buffered event at EOF even if trailing blank line is missing", () => {
      parser.feed('event: chunk\ndata: {"text":"End of response"}', collector);
      expect(events).toHaveLength(0);

      parser.end(collector);
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ type: "chunk", data: '{"text":"End of response"}' });
    });

    it("correctly joins multi-line data payloads", () => {
      const multilineData =
        'event: chunk\n' +
        'data: {\n' +
        'data:   "text": "Line 1\\nLine 2"\n' +
        'data: }\n' +
        '\n';

      parser.feed(multilineData, collector);
      parser.end(collector);

      expect(events).toHaveLength(1);
      expect(events[0].data).toBe('{\n  "text": "Line 1\\nLine 2"\n}');
    });
  });

  describe("streamAICoachingResponse Service Integration", () => {
    const mockConversationId = "507f1f77bcf86cd799439011";
    const originalFetch = global.fetch;
    const originalLocalStorage = global.localStorage;

    const mockCompleteData: GenerateResponse = {
      userMessage: {
        id: "msg_user_1",
        conversationId: mockConversationId,
        role: "user",
        content: "What is hypertrophy?",
        createdAt: "2026-11-10T10:00:00Z",
      },
      assistantMessage: {
        id: "msg_ai_1",
        conversationId: mockConversationId,
        role: "assistant",
        content: "Hypertrophy is muscle growth.",
        createdAt: "2026-11-10T10:00:03Z",
      },
      sources: [
        {
          title: "Hypertrophy Science",
          category: "hypertrophy",
          source: "Schoenfeld 2021",
          documentId: "doc_1",
          chunkId: "chk_1",
          similarity: 0.89,
        },
      ],
      metadata: {
        model: "gemini-2.5-pro",
        finishReason: "STOP",
        tokenCount: 45,
        isGrounded: true,
      },
    };

    beforeEach(() => {
      // Mock localStorage
      const store: Record<string, string> = { token: "test_jwt_token_xyz" };
      global.localStorage = {
        getItem: jest.fn((k: string) => store[k] || null),
        setItem: jest.fn((k: string, v: string) => {
          store[k] = v;
        }),
        removeItem: jest.fn((k: string) => {
          delete store[k];
        }),
        clear: jest.fn(() => {}),
        length: 1,
        key: jest.fn(),
      } as any;
    });

    afterEach(() => {
      global.fetch = originalFetch;
      global.localStorage = originalLocalStorage;
      jest.clearAllMocks();
    });

    function createMockStream(chunks: string[]): ReadableStream<Uint8Array> {
      const encoder = new TextEncoder();
      return new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        },
      });
    }

    it("successfully streams complete response and invokes all callbacks", async () => {
      const chunks = [
        'event: start\ndata: {"status":"started"}\n\n',
        'event: chunk\ndata: {"text":"Hypertrophy "}\n\n',
        'event: chunk\ndata: {"text":"is muscle growth."}\n\n',
        `event: complete\ndata: ${JSON.stringify({ success: true, data: mockCompleteData })}\n\n`,
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/event-stream" }),
        body: createMockStream(chunks),
      } as unknown as Response);

      const onStart = jest.fn();
      const onChunk = jest.fn();
      const onComplete = jest.fn();
      const onError = jest.fn();

      const result = await streamAICoachingResponse(mockConversationId, {
        message: "What is hypertrophy?",
        callbacks: { onStart, onChunk, onComplete, onError },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/conversations/${mockConversationId}/generate`),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            Authorization: "Bearer test_jwt_token_xyz",
          }),
          body: JSON.stringify({ message: "What is hypertrophy?", stream: true }),
        })
      );

      expect(onStart).toHaveBeenCalledWith({ status: "started" });
      expect(onChunk).toHaveBeenCalledTimes(2);
      expect(onChunk).toHaveBeenNthCalledWith(1, { text: "Hypertrophy " });
      expect(onChunk).toHaveBeenNthCalledWith(2, { text: "is muscle growth." });
      expect(onComplete).toHaveBeenCalledWith({ success: true, data: mockCompleteData });
      expect(onError).not.toHaveBeenCalled();
      expect(result).toEqual(mockCompleteData);
    });

    it("handles multi-byte UTF-8 characters fragmented across chunks", async () => {
      const encoder = new TextEncoder();
      // '💪' is 4 bytes: 0xF0, 0x9F, 0x92, 0xAA
      const fullText = 'event: chunk\ndata: {"text":"Fit 💪"}\n\n' +
        `event: complete\ndata: ${JSON.stringify({ success: true, data: mockCompleteData })}\n\n`;
      const fullBytes = encoder.encode(fullText);

      // Split right in the middle of the 4-byte emoji
      const splitIndex = fullText.indexOf("Fit ") + 4 + 2; // Split 2 bytes into the emoji
      const chunk1 = fullBytes.slice(0, splitIndex);
      const chunk2 = fullBytes.slice(splitIndex);

      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(chunk1);
          controller.enqueue(chunk2);
          controller.close();
        },
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/event-stream" }),
        body: stream,
      } as unknown as Response);

      const onChunk = jest.fn();
      await streamAICoachingResponse(mockConversationId, {
        message: "Emojis test",
        callbacks: { onChunk },
      });

      expect(onChunk).toHaveBeenCalledWith({ text: "Fit 💪" });
    });

    it("throws and invokes onError when stream closes prematurely without complete", async () => {
      const incompleteChunks = [
        'event: start\ndata: {"status":"started"}\n\n',
        'event: chunk\ndata: {"text":"Cutting early..."}\n\n',
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/event-stream" }),
        body: createMockStream(incompleteChunks),
      } as unknown as Response);

      const onError = jest.fn();

      await expect(
        streamAICoachingResponse(mockConversationId, {
          message: "Test disconnect",
          callbacks: { onError },
        })
      ).rejects.toThrow("Stream connection closed prematurely before completion");

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Stream connection closed prematurely before completion",
        })
      );
    });

    it("handles backend error events mid-stream gracefully", async () => {
      const errorChunks = [
        'event: start\ndata: {"status":"started"}\n\n',
        'event: error\ndata: {"success":false,"message":"AI quota exhausted"}\n\n',
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/event-stream" }),
        body: createMockStream(errorChunks),
      } as unknown as Response);

      const onError = jest.fn();

      await streamAICoachingResponse(mockConversationId, {
        message: "Quota test",
        callbacks: { onError },
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "AI quota exhausted",
        })
      );
    });

    it("dispatches error when receiving malformed JSON chunk", async () => {
      const malformedChunks = [
        'event: chunk\ndata: { INVALID_JSON_PAYLOAD\n\n',
        `event: complete\ndata: ${JSON.stringify({ success: true, data: mockCompleteData })}\n\n`,
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/event-stream" }),
        body: createMockStream(malformedChunks),
      } as unknown as Response);

      const onError = jest.fn();

      await streamAICoachingResponse(mockConversationId, {
        message: "Malformed chunk test",
        callbacks: { onError },
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Malformed SSE chunk event payload"),
        })
      );
    });

    it("handles client cancellation via AbortSignal without converting to server error", async () => {
      const abortController = new AbortController();

      // Infinite stream that never completes
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('event: chunk\ndata: {"text":"A"}\n\n'));
        },
      });

      global.fetch = jest.fn().mockImplementation(async (_url, opts) => {
        // Abort while waiting
        if (opts.signal) {
          opts.signal.addEventListener("abort", () => {
            // signal triggered
          });
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "text/event-stream" }),
          body: stream,
        };
      });

      const onError = jest.fn();

      // Trigger abort immediately
      abortController.abort();

      const result = await streamAICoachingResponse(mockConversationId, {
        message: "Stop test",
        signal: abortController.signal,
        callbacks: { onError },
      });

      expect(result).toBeNull();
      expect(onError).not.toHaveBeenCalled();
    });

    it("preserves HTTP 401 Unauthorized status and message", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ success: false, message: "Token expired or missing" }),
      } as unknown as Response);

      const onError = jest.fn();

      await expect(
        streamAICoachingResponse(mockConversationId, {
          message: "Auth test",
          callbacks: { onError },
        })
      ).rejects.toThrow("Token expired or missing");

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "Token expired or missing",
        })
      );
    });

    it("preserves HTTP 409 Conflict when response generation is already in flight", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 409,
        statusText: "Conflict",
        json: async () => ({
          success: false,
          message: "A response is currently being generated for this conversation. Please wait.",
        }),
      } as unknown as Response);

      const onError = jest.fn();

      await expect(
        streamAICoachingResponse(mockConversationId, {
          message: "Double send test",
          callbacks: { onError },
        })
      ).rejects.toThrow("A response is currently being generated for this conversation");

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
        })
      );
    });

    it("preserves HTTP 429 Quota Exhausted status", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        json: async () => ({
          success: false,
          message: "AI coaching quota temporarily exhausted. Please try again later.",
        }),
      } as unknown as Response);

      const onError = jest.fn();

      await expect(
        streamAICoachingResponse(mockConversationId, {
          message: "Quota test",
          callbacks: { onError },
        })
      ).rejects.toThrow("AI coaching quota temporarily exhausted");

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 429,
        })
      );
    });

    it("preserves HTTP 503 Service Unavailable status", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        json: async () => ({
          success: false,
          message: "AI coaching service temporarily unavailable. Please try again shortly.",
        }),
      } as unknown as Response);

      const onError = jest.fn();

      await expect(
        streamAICoachingResponse(mockConversationId, {
          message: "503 test",
          callbacks: { onError },
        })
      ).rejects.toThrow("AI coaching service temporarily unavailable");

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 503,
        })
      );
    });

    it("rejects when response Content-Type is not text/event-stream", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        body: createMockStream(['{"success":true}']),
      } as unknown as Response);

      const onError = jest.fn();

      await expect(
        streamAICoachingResponse(mockConversationId, {
          message: "Wrong header test",
          callbacks: { onError },
        })
      ).rejects.toThrow("Invalid response format: expected text/event-stream");

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("expected text/event-stream"),
        })
      );
    });

    it("supports backward-compatible 'metadata' and 'done' events without breaking", async () => {
      const chunks = [
        'event: metadata\ndata: {"status":"started"}\n\n',
        'event: chunk\ndata: {"text":"Progressive overload is key."}\n\n',
        `event: done\ndata: ${JSON.stringify({ success: true, data: mockCompleteData })}\n\n`,
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/event-stream" }),
        body: createMockStream(chunks),
      } as unknown as Response);

      const onStart = jest.fn();
      const onChunk = jest.fn();
      const onComplete = jest.fn();
      const onError = jest.fn();

      const result = await streamAICoachingResponse(mockConversationId, {
        message: "Explain progressive overload",
        callbacks: { onStart, onChunk, onComplete, onError },
      });

      expect(onStart).toHaveBeenCalledWith({ status: "started" });
      expect(onChunk).toHaveBeenCalledWith({ text: "Progressive overload is key." });
      expect(onComplete).toHaveBeenCalledWith({ success: true, data: mockCompleteData });
      expect(onError).not.toHaveBeenCalled();
      expect(result).toEqual(mockCompleteData);
    });
  });
});
