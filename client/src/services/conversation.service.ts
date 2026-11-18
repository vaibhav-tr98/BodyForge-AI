import { api } from "./api";
import type {
  ApiResponse,
  ConversationListResponse,
  ConversationDetailResponse,
  ConversationMessagesResponse,
  CreateConversationDTO,
  CreateConversationResponse,
  AddMessageResponse,
  DeleteConversationResponse,
  GenerateResponse,
} from "../types/coach.types";

class ConversationService {
  /**
   * Create a new conversation, optionally persisting an initial message.
   */
  public async createConversation(
    data?: CreateConversationDTO
  ): Promise<CreateConversationResponse> {
    const response = await api.post<ApiResponse<CreateConversationResponse>>(
      "/api/conversations",
      data || {}
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Failed to create conversation");
    }
    return response.data.data;
  }

  /**
   * Get a paginated list of conversations for the authenticated user.
   */
  public async getConversations(
    page: number = 1,
    limit: number = 20
  ): Promise<ConversationListResponse> {
    const params = new URLSearchParams();
    if (page) params.append("page", String(page));
    if (limit) params.append("limit", String(limit));

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const response = await api.get<ApiResponse<ConversationListResponse>>(
      `/api/conversations${queryString}`
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Failed to fetch conversations");
    }
    return response.data.data;
  }

  /**
   * Get metadata for a specific conversation by ID.
   */
  public async getConversation(id: string): Promise<ConversationDetailResponse> {
    const response = await api.get<ApiResponse<ConversationDetailResponse>>(
      `/api/conversations/${encodeURIComponent(id)}`
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Failed to fetch conversation");
    }
    return response.data.data;
  }

  /**
   * Delete a conversation and cascade delete its messages.
   */
  public async deleteConversation(id: string): Promise<DeleteConversationResponse> {
    const response = await api.delete<ApiResponse<null>>(
      `/api/conversations/${encodeURIComponent(id)}`
    );
    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to delete conversation");
    }
    return {
      success: true,
      message: response.data.message || "Conversation deleted successfully",
    };
  }

  /**
   * Get paginated messages for a conversation.
   * System messages are excluded by the backend.
   */
  public async getConversationMessages(
    id: string,
    page: number = 1,
    limit: number = 50,
    order: "asc" | "desc" = "asc"
  ): Promise<ConversationMessagesResponse> {
    const params = new URLSearchParams();
    if (page) params.append("page", String(page));
    if (limit) params.append("limit", String(limit));
    if (order) params.append("order", order);

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const response = await api.get<ApiResponse<ConversationMessagesResponse>>(
      `/api/conversations/${encodeURIComponent(id)}/messages${queryString}`
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Failed to fetch conversation messages");
    }
    return response.data.data;
  }

  /**
   * Manually append a user message to a conversation without generating an AI response.
   */
  public async addConversationMessage(
    id: string,
    content: string
  ): Promise<AddMessageResponse> {
    const response = await api.post<ApiResponse<AddMessageResponse>>(
      `/api/conversations/${encodeURIComponent(id)}/messages`,
      { content }
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Failed to add message");
    }
    return response.data.data;
  }

  /**
   * Generate an AI coaching response in standard non-streaming JSON mode.
   */
  public async generateConversationResponse(
    id: string,
    message: string
  ): Promise<GenerateResponse> {
    const response = await api.post<ApiResponse<GenerateResponse>>(
      `/api/conversations/${encodeURIComponent(id)}/generate`,
      { message, stream: false }
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Failed to generate AI response");
    }
    return response.data.data;
  }
}

export const conversationService = new ConversationService();
export default conversationService;
