import { api } from "./api";
import type {
  GenerateResponse,
  SSEChunkPayload,
  SSECompletePayload,
  SSEErrorPayload,
  SSEStartPayload,
  StreamCoachingOptions,
} from "../types/coach.types";

export class SSEStreamError extends Error {
  public statusCode?: number;
  public isAbort?: boolean;

  constructor(message: string, statusCode?: number, isAbort: boolean = false) {
    super(message);
    this.name = "SSEStreamError";
    this.statusCode = statusCode;
    this.isAbort = isAbort;
    Object.setPrototypeOf(this, SSEStreamError.prototype);
  }
}

/**
 * Standard-compliant parser for Server-Sent Events (SSE).
 * Correctly processes CRLF and LF line endings, fragmented UTF-8 strings,
 * multiple events per network packet, and buffered final events at EOF.
 */
export class SSEParser {
  private buffer = "";
  private currentEvent = "";
  private currentData: string[] = [];

  /**
   * Feed an incoming decoded text chunk into the parser.
   */
  public feed(chunk: string, onEvent: (eventType: string, data: string) => void): void {
    this.buffer += chunk;

    let position = 0;
    while (position < this.buffer.length) {
      const lineEnd = this.findLineEnd(this.buffer, position);
      if (lineEnd === -1) {
        // Line is incomplete; leave remaining data in the buffer for the next chunk
        break;
      }

      const line = this.buffer.slice(position, lineEnd.start);
      position = lineEnd.end;

      this.parseLine(line, onEvent);
    }

    if (position > 0) {
      this.buffer = this.buffer.slice(position);
    }
  }

  /**
   * Flush any remaining buffered data when the stream terminates.
   */
  public end(onEvent: (eventType: string, data: string) => void): void {
    if (this.buffer.length > 0) {
      this.parseLine(this.buffer, onEvent);
      this.buffer = "";
    }
    this.dispatchCurrent(onEvent);
  }

  private findLineEnd(str: string, fromIndex: number): { start: number; end: number } | -1 {
    for (let i = fromIndex; i < str.length; i++) {
      const char = str[i];
      if (char === "\n") {
        return { start: i, end: i + 1 };
      }
      if (char === "\r") {
        if (i + 1 < str.length) {
          if (str[i + 1] === "\n") {
            return { start: i, end: i + 2 };
          }
          return { start: i, end: i + 1 };
        } else {
          // '\r' is at the very boundary of the current buffer.
          // Wait for the next chunk to determine if '\n' follows.
          return -1;
        }
      }
    }
    return -1;
  }

  private parseLine(line: string, onEvent: (eventType: string, data: string) => void): void {
    // Blank line indicates the end of an SSE message block
    if (line === "") {
      this.dispatchCurrent(onEvent);
      return;
    }

    // Comment line per SSE spec (: comment)
    if (line.startsWith(":")) {
      return;
    }

    let field = line;
    let value = "";
    const colonIndex = line.indexOf(":");
    if (colonIndex !== -1) {
      field = line.slice(0, colonIndex);
      value = line.slice(colonIndex + 1);
      if (value.startsWith(" ")) {
        value = value.slice(1);
      }
    }

    if (field === "event") {
      this.currentEvent = value;
    } else if (field === "data") {
      this.currentData.push(value);
    }
  }

  private dispatchCurrent(onEvent: (eventType: string, data: string) => void): void {
    if (this.currentData.length > 0 || this.currentEvent !== "") {
      const eventType = this.currentEvent || "message";
      const data = this.currentData.join("\n");
      this.currentEvent = "";
      this.currentData = [];
      onEvent(eventType, data);
    }
  }
}

function getBaseApiUrl(): string {
  if (api.defaults.baseURL) {
    return api.defaults.baseURL;
  }
  return "http://localhost:5000";
}

/**
 * Stream conversational coaching from the backend over an authenticated POST SSE connection.
 *
 * Handles HTTP status validation, content-type checks, chunk decoding, event parsing,
 * cancellation via AbortSignal, and error dispatching without leaking tokens.
 */
export async function streamAICoachingResponse(
  conversationId: string,
  options: StreamCoachingOptions
): Promise<GenerateResponse | null> {
  const { message, signal, callbacks } = options;
  const baseUrl = getBaseApiUrl();
  const endpoint = `${baseUrl}/api/conversations/${encodeURIComponent(conversationId)}/generate`;

  const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ message, stream: true }),
      signal,
    });
  } catch (err: unknown) {
    if (signal?.aborted || (err instanceof Error && err.name === "AbortError")) {
      return null;
    }
    const networkError = new SSEStreamError(
      err instanceof Error ? err.message : "Network error connecting to coaching service",
      0
    );
    callbacks?.onError?.(networkError);
    throw networkError;
  }

  // Handle HTTP error responses
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText || "Request failed"}`;
    try {
      const errorJson = await response.json();
      if (errorJson && typeof errorJson.message === "string") {
        errorMessage = errorJson.message;
      }
    } catch {
      try {
        const errorText = await response.text();
        if (errorText) errorMessage = errorText;
      } catch {
        // Fall back to status text
      }
    }

    const httpError = new SSEStreamError(errorMessage, response.status);
    callbacks?.onError?.(httpError);
    throw httpError;
  }

  // Validate Content-Type
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/event-stream")) {
    const typeError = new SSEStreamError(
      `Invalid response format: expected text/event-stream but received ${contentType || "none"}`,
      response.status
    );
    callbacks?.onError?.(typeError);
    throw typeError;
  }

  const body = response.body;
  if (!body) {
    const emptyBodyError = new SSEStreamError("Response body is empty", response.status);
    callbacks?.onError?.(emptyBodyError);
    throw emptyBodyError;
  }

  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  const parser = new SSEParser();

  let completedResult: GenerateResponse | null = null;
  let hasReceivedComplete = false;
  let hasReceivedError = false;

  const handleParsedEvent = (eventType: string, rawData: string) => {
    switch (eventType) {
      case "start":
      case "metadata": {
        try {
          const parsed: SSEStartPayload = JSON.parse(rawData);
          callbacks?.onStart?.(parsed);
        } catch {
          callbacks?.onStart?.({ status: "started" });
        }
        break;
      }

      case "chunk": {
        try {
          const parsed: SSEChunkPayload = JSON.parse(rawData);
          callbacks?.onChunk?.(parsed);
        } catch (err) {
          const parseError = new SSEStreamError(
            `Malformed SSE chunk event payload: ${err instanceof Error ? err.message : "JSON parse error"}`
          );
          callbacks?.onError?.(parseError);
        }
        break;
      }

      case "complete":
      case "done": {
        hasReceivedComplete = true;
        try {
          const parsed = JSON.parse(rawData);
          // Backward-compatible payload resolution: supports { success: true, data }, { data }, or direct GenerateResponse
          const dataPayload = parsed?.data ? parsed.data : (parsed?.userMessage && parsed?.assistantMessage ? parsed : null);
          completedResult = dataPayload;
          const completePayload: SSECompletePayload = {
            success: true,
            data: dataPayload,
          };
          callbacks?.onComplete?.(completePayload);
        } catch (err) {
          const parseError = new SSEStreamError(
            `Malformed SSE complete event payload: ${err instanceof Error ? err.message : "JSON parse error"}`
          );
          callbacks?.onError?.(parseError);
        }
        break;
      }

      case "error": {
        hasReceivedError = true;
        let errorMessage = "AI coaching generation encountered a server error";
        try {
          const parsed: SSEErrorPayload = JSON.parse(rawData);
          if (parsed && typeof parsed.message === "string") {
            errorMessage = parsed.message;
          }
        } catch {
          if (rawData) errorMessage = rawData;
        }

        const serverError = new SSEStreamError(errorMessage, 500);
        callbacks?.onError?.(serverError);
        break;
      }

      default: {
        // Unknown or custom event type: safely ignore or log internally
        break;
      }
    }
  };

  try {
    while (true) {
      if (signal?.aborted) {
        try {
          await reader.cancel();
        } catch {
          // Ignore cancellation errors
        }
        return null;
      }

      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (value) {
        const text = decoder.decode(value, { stream: true });
        parser.feed(text, handleParsedEvent);
      }
    }

    // Flush any remaining buffered characters at EOF
    const remainingText = decoder.decode();
    if (remainingText) {
      parser.feed(remainingText, handleParsedEvent);
    }
    parser.end(handleParsedEvent);

    if (!hasReceivedComplete && !hasReceivedError && !signal?.aborted) {
      const prematureCloseError = new SSEStreamError(
        "Stream connection closed prematurely before completion",
        500
      );
      callbacks?.onError?.(prematureCloseError);
      throw prematureCloseError;
    }

    return completedResult;
  } catch (err: unknown) {
    if (signal?.aborted || (err instanceof Error && err.name === "AbortError")) {
      return null;
    }
    if (err instanceof SSEStreamError) {
      throw err;
    }
    const streamError = new SSEStreamError(
      err instanceof Error ? err.message : "Stream processing error",
      500
    );
    callbacks?.onError?.(streamError);
    throw streamError;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Reader lock might already be released
    }
  }
}
