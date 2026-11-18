import { useConversation } from "../useConversation";
import { conversationKeys } from "../useConversations";
import { conversationService } from "../../services/conversation.service";
import { QueryClient } from "@tanstack/react-query";

jest.mock("../../services/api", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    defaults: { baseURL: "http://localhost:5000" },
  },
}));
jest.mock("../../services/conversation.service");

let capturedDetailOpts: any = null;
let capturedMessagesOpts: any = null;
let testQueryClient: QueryClient;

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: () => testQueryClient,
    useQuery: (opts: any) => {
      const isDetail = opts.queryKey?.[1] === "detail";
      if (isDetail) {
        capturedDetailOpts = opts;
        return {
          data: opts.enabled
            ? {
                conversation: {
                  _id: opts.queryKey[2],
                  title: "Chest & Triceps Focus",
                  lastMessageAt: "2026-11-10T12:00:00Z",
                  createdAt: "2026-11-10T12:00:00Z",
                  updatedAt: "2026-11-10T12:00:00Z",
                },
              }
            : undefined,
          isLoading: false,
          isError: false,
          error: null,
          refetch: jest.fn(),
        };
      } else {
        capturedMessagesOpts = opts;
        return {
          data: opts.enabled
            ? {
                messages: [
                  {
                    id: "m1",
                    conversationId: opts.queryKey[2],
                    role: "user",
                    content: "What is the best rep range for bench press?",
                    createdAt: "2026-11-10T12:00:00Z",
                  },
                ],
                pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
              }
            : undefined,
          isLoading: false,
          isError: false,
          error: null,
          refetch: jest.fn(),
        };
      }
    },
  };
});

describe("useConversation Unit Tests (M3.4.3)", () => {
  beforeEach(() => {
    testQueryClient = new QueryClient();
    jest.clearAllMocks();
    capturedDetailOpts = null;
    capturedMessagesOpts = null;
  });

  it("disables both queries when conversationId is absent", () => {
    const hook = useConversation(null);

    expect(hook.conversation).toBeNull();
    expect(hook.messages).toEqual([]);
    expect(hook.pagination).toBeNull();
    expect(capturedDetailOpts.enabled).toBe(false);
    expect(capturedMessagesOpts.enabled).toBe(false);
  });

  it("enables queries and isolates queryKeys when conversationId is provided", async () => {
    (conversationService.getConversation as jest.Mock).mockResolvedValue({
      conversation: { _id: "conv_xyz" },
    });
    (conversationService.getConversationMessages as jest.Mock).mockResolvedValue({
      messages: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 1 },
    });

    const hook = useConversation("conv_xyz", { page: 1, limit: 50, order: "asc" });

    expect(capturedDetailOpts.queryKey).toEqual(conversationKeys.detail("conv_xyz"));
    expect(capturedDetailOpts.enabled).toBe(true);

    expect(capturedMessagesOpts.queryKey).toEqual(
      conversationKeys.messageList("conv_xyz", 1, 50, "asc")
    );
    expect(capturedMessagesOpts.enabled).toBe(true);

    expect(hook.conversation?._id).toBe("conv_xyz");
    expect(hook.messages).toHaveLength(1);
    expect(hook.messages[0].id).toBe("m1");

    // Execute queryFn
    await capturedDetailOpts.queryFn();
    expect(conversationService.getConversation).toHaveBeenCalledWith("conv_xyz");

    await capturedMessagesOpts.queryFn();
    expect(conversationService.getConversationMessages).toHaveBeenCalledWith(
      "conv_xyz",
      1,
      50,
      "asc"
    );
  });

  it("cleanupConversation removes detail and message queries from cache", () => {
    const removeSpy = jest.spyOn(testQueryClient, "removeQueries");

    const hook = useConversation("conv_to_clean");
    hook.cleanupConversation();

    expect(removeSpy).toHaveBeenCalledWith({
      queryKey: conversationKeys.detail("conv_to_clean"),
      exact: true,
    });
    expect(removeSpy).toHaveBeenCalledWith({
      queryKey: [...conversationKeys.messages(), "conv_to_clean"],
    });
  });
});
