import type { ApiResponse } from "./index";

export type MessageRole = "user" | "assistant";

export interface Conversation {
  _id: string;
  userId: string;
  title: string;
  lastMessageAt: string;
  summary?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface ConversationPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MessagePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface KnowledgeSource {
  title: string;
  category: string;
  source: string;
  sourceUrl?: string;
  documentId: string;
  chunkId: string;
  similarity: number;
}

export interface GenerationMetadata {
  model?: string;
  finishReason?: string;
  tokenCount?: number;
  isGrounded?: boolean;
  sourcesCount?: number;
  [key: string]: unknown;
}

export interface GenerateResponse {
  userMessage: ConversationMessage;
  assistantMessage: ConversationMessage;
  sources: KnowledgeSource[];
  metadata?: GenerationMetadata;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  pagination: ConversationPagination;
}

export interface ConversationDetailResponse {
  conversation: Conversation;
}

export interface ConversationMessagesResponse {
  messages: ConversationMessage[];
  pagination: MessagePagination;
}

export interface CreateConversationDTO {
  title?: string;
  message?: string;
  initialMessage?: string;
}

export interface CreateConversationResponse {
  conversation: Conversation;
  message: ConversationMessage | null;
}

export interface AddMessageResponse {
  message: ConversationMessage;
}

export interface DeleteConversationResponse {
  success: boolean;
  message: string;
}

// ── SSE Streaming Types ─────────────────────────────────────────────────────────

export interface SSEStartPayload {
  status: "started" | string;
}

export interface SSEChunkPayload {
  text: string;
}

export interface SSECompletePayload {
  success: true;
  data: GenerateResponse;
}

export interface SSEErrorPayload {
  success: false;
  message: string;
}

export type SSEEvent =
  | { type: "start" | "metadata"; data: SSEStartPayload }
  | { type: "chunk"; data: SSEChunkPayload }
  | { type: "complete" | "done"; data: SSECompletePayload }
  | { type: "error"; data: SSEErrorPayload };

export interface SSEStreamCallbacks {
  onStart?: (data: SSEStartPayload) => void;
  onChunk?: (data: SSEChunkPayload) => void;
  onComplete?: (data: SSECompletePayload) => void;
  onError?: (error: Error) => void;
}

export interface StreamCoachingOptions {
  message: string;
  signal?: AbortSignal;
  callbacks?: SSEStreamCallbacks;
}

export type { ApiResponse };
