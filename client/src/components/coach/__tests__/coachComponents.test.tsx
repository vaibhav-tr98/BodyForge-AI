import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { KnowledgeSourceCard } from "../KnowledgeSourceCard";
import { EmptyCoachState, SUGGESTED_PROMPTS } from "../EmptyCoachState";
import { ChatMessageItem } from "../ChatMessageItem";
import { ChatInputBox } from "../ChatInputBox";
import { ChatMessageList } from "../ChatMessageList";
import { ConversationSidebar } from "../ConversationSidebar";
import type { KnowledgeSource, ConversationMessage, Conversation } from "../../../types/coach.types";

// Mock ReactMarkdown to avoid pure ESM issues under CommonJS ts-jest while testing custom component behavior
jest.mock("react-markdown", () => {
  return function MockReactMarkdown({ children, components }: any) {
    const renderedLink = components?.a
      ? components.a({
          href: "https://example.com/study",
          children: "Verified Study",
        })
      : null;

    const renderedCode = components?.code
      ? components.code({
          children: "progressive_overload(load)",
          className: "language-ts",
        })
      : null;

    return (
      <div data-testid="mock-markdown">
        {renderedLink}
        {renderedCode}
        <div data-testid="markdown-content">{children}</div>
      </div>
    );
  };
});
jest.mock("remark-gfm", () => () => {});

// Helper to safely invoke function components with React hooks in Node test environment
function withReactHooks<T>(
  fn: () => T,
  overrides: { state?: any; setState?: any; ref?: any; runEffects?: boolean } = {}
): T {
  const origUseState = React.useState;
  const origUseEffect = React.useEffect;
  const origUseCallback = React.useCallback;
  const origUseRef = React.useRef;
  const origUseMemo = React.useMemo;

  React.useState = ((init: any) => {
    return [
      overrides.state !== undefined ? overrides.state : init,
      overrides.setState || jest.fn(),
    ];
  }) as any;
  if (overrides.runEffects) {
    React.useEffect = ((effect: any) => {
      try {
        const cleanup = effect();
        if (typeof cleanup === "function") cleanup();
      } catch {}
    }) as any;
  } else {
    React.useEffect = jest.fn();
  }
  React.useCallback = ((cb: any) => cb) as any;
  React.useMemo = ((cb: any) => cb()) as any;
  React.useRef = ((init: any) => ({
    current: overrides.ref !== undefined ? overrides.ref : init,
  })) as any;

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

describe("AI Coach UI Components (M3.4.4)", () => {
  const mockSourceWithUrl: KnowledgeSource = {
    title: "Hypertrophy Mechanisms and Volume Landmarks",
    category: "Hypertrophy",
    source: "Journal of Strength and Conditioning Research",
    sourceUrl: "https://example.com/hypertrophy-landmarks",
    documentId: "doc-101",
    chunkId: "chunk-01",
    similarity: 0.887,
  };

  const mockSourceWithoutUrl: KnowledgeSource = {
    title: "Internal Metabolic Adaptation Notes",
    category: "Metabolism",
    source: "BodyForge Clinical Archive",
    documentId: "doc-102",
    chunkId: "chunk-02",
    similarity: 0.742,
  };

  const mockUserMsg: ConversationMessage = {
    id: "msg-user-1",
    conversationId: "conv-1",
    role: "user",
    content: "How should I structure my chest workouts?",
    createdAt: "2026-11-15T10:00:00.000Z",
  };

  const mockAssistantMsg: ConversationMessage = {
    id: "msg-asst-1",
    conversationId: "conv-1",
    role: "assistant",
    content: "Structure your chest workouts around 10-15 weekly sets with progressive overload.",
    createdAt: "2026-11-15T10:00:05.000Z",
  };

  const mockConversation: Conversation = {
    _id: "conv-1",
    userId: "user-1",
    title: "Bench Press Progression",
    createdAt: "2026-11-15T09:00:00.000Z",
    updatedAt: "2026-11-15T10:00:05.000Z",
    lastMessageAt: "2026-11-15T10:00:05.000Z",
  };

  // ── 1. KnowledgeSourceCard ──────────────────────────────────────────────────
  describe("KnowledgeSourceCard", () => {
    it("renders document title, category, and source name", () => {
      const html = renderToStaticMarkup(
        <KnowledgeSourceCard source={mockSourceWithUrl} />
      );

      expect(html).toContain("Hypertrophy Mechanisms and Volume Landmarks");
      expect(html).toContain("Hypertrophy");
      expect(html).toContain("Journal of Strength and Conditioning Research");
    });

    it("displays similarity score as relevance percentage without scientific claims", () => {
      const html = renderToStaticMarkup(
        <KnowledgeSourceCard source={mockSourceWithUrl} />
      );

      // 0.887 -> 89%
      expect(html).toContain("Relevance: 89%");
      expect(html).not.toContain("Scientific confidence");
      expect(html).not.toContain("Accuracy");
    });

    it("renders safe external link with target='_blank' and rel='noopener noreferrer' when sourceUrl is present", () => {
      const html = renderToStaticMarkup(
        <KnowledgeSourceCard source={mockSourceWithUrl} />
      );

      expect(html).toContain('href="https://example.com/hypertrophy-landmarks"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).toContain("View source");
    });

    it("gracefully displays internal placeholder without broken link when sourceUrl is missing", () => {
      const html = renderToStaticMarkup(
        <KnowledgeSourceCard source={mockSourceWithoutUrl} />
      );

      expect(html).toContain("Internal archive");
      expect(html).not.toContain("href=");
      expect(html).not.toContain("View source");
    });
  });

  // ── 2. EmptyCoachState ──────────────────────────────────────────────────────
  describe("EmptyCoachState", () => {
    it("renders welcoming introduction and all 4 suggested prompts", () => {
      const html = renderToStaticMarkup(
        <EmptyCoachState onSelectPrompt={jest.fn()} />
      );

      expect(html).toContain("Meet Your BodyForge AI Coach");
      expect(SUGGESTED_PROMPTS).toHaveLength(4);

      SUGGESTED_PROMPTS.forEach((p) => {
        expect(html).toContain(p.title);
        expect(html).toContain(p.prompt);
      });
    });

    it("invokes onSelectPrompt callback with exact prompt text when clicked", () => {
      const onSelectPrompt = jest.fn();
      const component = EmptyCoachState({ onSelectPrompt });

      // Find children buttons
      const buttons = (component as any).props.children[3].props.children[1].props.children;
      expect(buttons).toHaveLength(4);

      // Trigger click on first button (Progressive Overload)
      buttons[0].props.onClick();
      expect(onSelectPrompt).toHaveBeenCalledWith(SUGGESTED_PROMPTS[0].prompt);

      // Trigger click on third button (Protein Optimization)
      buttons[2].props.onClick();
      expect(onSelectPrompt).toHaveBeenCalledWith(SUGGESTED_PROMPTS[2].prompt);
    });
  });

  // ── 3. ChatMessageItem ──────────────────────────────────────────────────────
  describe("ChatMessageItem", () => {
    it("renders user message with distinct styling and identity label", () => {
      const html = renderToStaticMarkup(
        <ChatMessageItem
          role={mockUserMsg.role}
          content={mockUserMsg.content}
          createdAt={mockUserMsg.createdAt}
        />
      );

      expect(html).toContain("You");
      expect(html).toContain("How should I structure my chest workouts?");
      expect(html).toContain("bg-cyan-600"); // User bubble accent
    });

    it("renders assistant message with branding and AI Coach badge", () => {
      const html = renderToStaticMarkup(
        <ChatMessageItem
          role={mockAssistantMsg.role}
          content={mockAssistantMsg.content}
          createdAt={mockAssistantMsg.createdAt}
        />
      );

      expect(html).toContain("BodyForge Coach");
      expect(html).toContain("AI Coach");
      expect(html).toContain("Structure your chest workouts around 10-15 weekly sets");
    });

    it("renders safe markdown link and code blocks", () => {
      const html = renderToStaticMarkup(
        <ChatMessageItem
          role="assistant"
          content="Here is a study link [Verified Study](https://example.com/study) and code"
        />
      );

      expect(html).toContain('href="https://example.com/study"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });

    it("renders streaming indicator when isStreaming is true", () => {
      const html = renderToStaticMarkup(
        <ChatMessageItem
          role="assistant"
          content="Thinking..."
          isStreaming={true}
        />
      );

      expect(html).toContain("animate-pulse");
    });

    it("renders grounded-answer indicator button when sources exist", () => {
      const html = renderToStaticMarkup(
        <ChatMessageItem
          role="assistant"
          content="Grounded answer text"
          sources={[mockSourceWithUrl, mockSourceWithoutUrl]}
        />
      );

      expect(html).toContain("Grounded in 2 verified sources");
    });

    it("displays sending state for optimistic messages", () => {
      const html = renderToStaticMarkup(
        <ChatMessageItem
          role="user"
          content="Optimistic query"
          isOptimistic={true}
        />
      );

      expect(html).toContain("Sending...");
    });
  });

  // ── 4. ChatInputBox ────────────────────────────────────────────────────────
  describe("ChatInputBox", () => {
    it("renders textarea, placeholder, and action buttons", () => {
      const html = renderToStaticMarkup(
        <ChatInputBox onSend={jest.fn()} />
      );

      expect(html).toContain("Ask BodyForge Coach about your workouts");
      expect(html).toContain('aria-label="Send message"');
    });

    it("renders Stop button when isBusy is true", () => {
      const html = renderToStaticMarkup(
        <ChatInputBox onSend={jest.fn()} onStop={jest.fn()} isBusy={true} />
      );

      expect(html).toContain('aria-label="Stop generating response"');
      expect(html).toContain("Stop");
    });

    it("renders character limit indicator when input has text", () => {
      const html = renderToStaticMarkup(
        <ChatInputBox onSend={jest.fn()} initialValue="Hello Coach" />
      );

      expect(html).toContain("11 / 4,000");
    });

    it("handles Enter key submission and Shift+Enter newline logic", () => {
      const onSend = jest.fn();

      withReactHooks(() => {
        const element = ChatInputBox({ onSend, initialValue: "Bench press form check" });
        const container = element.props.children;
        const textarea = container.props.children[1];

        // 1. Shift+Enter should NOT submit
        const shiftEnterEvent = {
          key: "Enter",
          shiftKey: true,
          preventDefault: jest.fn(),
        };
        textarea.props.onKeyDown(shiftEnterEvent);
        expect(shiftEnterEvent.preventDefault).not.toHaveBeenCalled();
        expect(onSend).not.toHaveBeenCalled();

        // 2. Regular Enter should submit
        const enterEvent = {
          key: "Enter",
          shiftKey: false,
          preventDefault: jest.fn(),
        };
        textarea.props.onKeyDown(enterEvent);
        expect(enterEvent.preventDefault).toHaveBeenCalled();
        expect(onSend).toHaveBeenCalledWith("Bench press form check");
      }, {
        state: "Bench press form check",
        ref: { style: { height: "48px" }, scrollHeight: 48, focus: jest.fn() },
      });
    });

    it("prevents submission of empty or whitespace-only messages", () => {
      const onSend = jest.fn();

      withReactHooks(() => {
        const element = ChatInputBox({ onSend });
        const container = element.props.children;
        const textarea = container.props.children[1];

        const enterEvent = {
          key: "Enter",
          shiftKey: false,
          preventDefault: jest.fn(),
        };
        textarea.props.onKeyDown(enterEvent);
        expect(onSend).not.toHaveBeenCalled();
      }, {
        state: "   ",
        ref: { style: { height: "48px" }, scrollHeight: 48, focus: jest.fn() },
      });
    });

    it("prevents submission when character count exceeds 4,000 limit", () => {
      const onSend = jest.fn();
      const longText = "a".repeat(4001);

      withReactHooks(() => {
        const element = ChatInputBox({ onSend });
        const container = element.props.children;
        const textarea = container.props.children[1];
        const toolbar = container.props.children[2];
        const sendBtn = toolbar.props.children[1].props.children;

        // Button should be disabled
        expect(sendBtn.props.disabled).toBe(true);

        const enterEvent = {
          key: "Enter",
          shiftKey: false,
          preventDefault: jest.fn(),
        };
        textarea.props.onKeyDown(enterEvent);
        expect(onSend).not.toHaveBeenCalled();
      }, {
        state: longText,
        ref: { style: { height: "48px" }, scrollHeight: 48, focus: jest.fn() },
      });
    });

    it("triggers onStop when stop button is clicked while busy", () => {
      const onStop = jest.fn();

      withReactHooks(() => {
        const element = ChatInputBox({ onSend: jest.fn(), onStop, isBusy: true });
        const container = element.props.children;
        const toolbar = container.props.children[2];
        const stopBtn = toolbar.props.children[1].props.children;

        expect(stopBtn.props["aria-label"]).toBe("Stop generating response");
        stopBtn.props.onClick();
        expect(onStop).toHaveBeenCalledTimes(1);
      }, {
        state: "",
      });
    });
  });

  // ── 5. ChatMessageList ──────────────────────────────────────────────────────
  describe("ChatMessageList", () => {
    it("renders message history correctly", () => {
      const html = renderToStaticMarkup(
        <ChatMessageList messages={[mockUserMsg, mockAssistantMsg]} />
      );

      expect(html).toContain("How should I structure my chest workouts?");
      expect(html).toContain("Structure your chest workouts around 10-15 weekly sets");
    });

    it("renders empty state when message list is empty", () => {
      const html = renderToStaticMarkup(
        <ChatMessageList messages={[]} onSelectPrompt={jest.fn()} />
      );

      expect(html).toContain("Meet Your BodyForge AI Coach");
      expect(html).toContain("Suggested Topics");
    });

    it("renders loading skeletons when isLoading is true", () => {
      const html = renderToStaticMarkup(
        <ChatMessageList messages={[]} isLoading={true} />
      );

      expect(html).toContain('aria-label="Loading conversation messages"');
      expect(html).toContain("animate-pulse");
    });

    it("renders in-flight optimistic message alongside history", () => {
      const optimisticMsg: ConversationMessage = {
        id: "opt-1",
        conversationId: "conv-1",
        role: "user",
        content: "What about incline dumbbell bench?",
        createdAt: "2026-11-15T10:01:00.000Z",
      };

      const html = renderToStaticMarkup(
        <ChatMessageList
          messages={[mockUserMsg, mockAssistantMsg]}
          optimisticUserMessage={optimisticMsg}
          isStreaming={true}
          streamingText="Incline dumbbell bench provides..."
        />
      );

      expect(html).toContain("What about incline dumbbell bench?");
      expect(html).toContain("Incline dumbbell bench provides...");
    });

    it("renders scroll-to-bottom button when user is not near the bottom", () => {
      // Mock useState to simulate showScrollBottom = true
      let stateIndex = 0;
      jest.spyOn(React, "useState").mockImplementation((init: any) => {
        stateIndex++;
        // 1st useState: isNearBottom (false)
        // 2nd useState: showScrollBottom (true)
        if (stateIndex === 1) return [false, jest.fn()];
        return [true, jest.fn()];
      });
      jest.spyOn(React, "useRef").mockReturnValue({ current: { scrollIntoView: jest.fn() } });

      try {
        const html = renderToStaticMarkup(
          <ChatMessageList messages={[mockUserMsg, mockAssistantMsg]} />
        );

        expect(html).toContain('aria-label="Scroll to newest messages"');
        expect(html).toContain("Latest messages");
      } finally {
        jest.restoreAllMocks();
      }
    });
  });

  // ── 6. ConversationSidebar ──────────────────────────────────────────────────
  describe("ConversationSidebar", () => {
    it("renders conversation items with titles and formatted dates", () => {
      const html = renderToStaticMarkup(
        <ConversationSidebar
          conversations={[mockConversation]}
          activeConversationId="conv-1"
          onSelectConversation={jest.fn()}
          onNewConversation={jest.fn()}
          onDeleteConversation={jest.fn()}
        />
      );

      expect(html).toContain("New Chat");
      expect(html).toContain("Bench Press Progression");
      expect(html).toContain('aria-current="page"'); // Active indicator
    });

    it("renders empty state when no conversations exist", () => {
      const html = renderToStaticMarkup(
        <ConversationSidebar
          conversations={[]}
          onSelectConversation={jest.fn()}
          onNewConversation={jest.fn()}
          onDeleteConversation={jest.fn()}
        />
      );

      expect(html).toContain("No chats yet");
      expect(html).toContain("Start a new conversation to consult your coach.");
    });

    it("renders loading skeleton when isLoading is true", () => {
      const html = renderToStaticMarkup(
        <ConversationSidebar
          conversations={[]}
          isLoading={true}
          onSelectConversation={jest.fn()}
          onNewConversation={jest.fn()}
          onDeleteConversation={jest.fn()}
        />
      );

      expect(html).toContain('aria-label="Loading conversations"');
    });

    it("triggers callbacks on new chat and selection", () => {
      const onNewConversation = jest.fn();
      const onSelectConversation = jest.fn();

      withReactHooks(() => {
        const element = ConversationSidebar({
          conversations: [mockConversation],
          onSelectConversation,
          onNewConversation,
          onDeleteConversation: jest.fn(),
        });

        // Extract new conversation button from header
        const aside = element.props.children[0];
        const headerButton = aside.props.children.props.children[0].props.children[0];
        headerButton.props.onClick();
        expect(onNewConversation).toHaveBeenCalled();

        // Extract conversation item and click
        const nav = aside.props.children.props.children[1];
        const convItem = nav.props.children[0];
        convItem.props.onClick();
        expect(onSelectConversation).toHaveBeenCalledWith("conv-1");
      }, {
        state: null,
      });
    });

    it("renders inline delete confirmation and triggers onDeleteConversation upon confirm", () => {
      const onDeleteConversation = jest.fn();

      withReactHooks(() => {
        const element = ConversationSidebar({
          conversations: [mockConversation],
          onSelectConversation: jest.fn(),
          onNewConversation: jest.fn(),
          onDeleteConversation,
        });

        const aside = element.props.children[0];
        const nav = aside.props.children.props.children[1];
        const convItem = nav.props.children[0];
        const confirmBox = convItem.props.children;

        expect(confirmBox.props.children[0].props.children[1]).toBe("Delete chat?");

        const actionButtons = confirmBox.props.children[1].props.children;
        const confirmBtn = actionButtons[0];
        const cancelBtn = actionButtons[1];

        expect(confirmBtn.props["aria-label"]).toBe("Confirm delete conversation");
        expect(cancelBtn.props["aria-label"]).toBe("Cancel delete conversation");

        const mockStopPropagation = jest.fn();
        confirmBtn.props.onClick({ stopPropagation: mockStopPropagation });

        expect(mockStopPropagation).toHaveBeenCalled();
        expect(onDeleteConversation).toHaveBeenCalledWith("conv-1");
      }, {
        state: "conv-1", // confirmDeleteId = "conv-1"
      });
    });

    it("renders mobile drawer when isOpen is true and handles close callback", () => {
      const onClose = jest.fn();
      const html = renderToStaticMarkup(
        <ConversationSidebar
          conversations={[mockConversation]}
          isOpen={true}
          onClose={onClose}
          onSelectConversation={jest.fn()}
          onNewConversation={jest.fn()}
          onDeleteConversation={jest.fn()}
        />
      );

      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('aria-label="Close sidebar"');
    });

    it("attaches Escape keydown listener to close mobile drawer when open", () => {
      const onClose = jest.fn();
      let capturedHandler: ((e: any) => void) | null = null;
      const addEventListenerMock = jest.fn((event, handler) => {
        if (event === "keydown") {
          capturedHandler = handler;
        }
      });
      const removeEventListenerMock = jest.fn();

      const origWindow = (global as any).window;
      (global as any).window = {
        addEventListener: addEventListenerMock,
        removeEventListener: removeEventListenerMock,
      };

      try {
        withReactHooks(() => {
          ConversationSidebar({
            conversations: [mockConversation],
            isOpen: true,
            onClose,
            onSelectConversation: jest.fn(),
            onNewConversation: jest.fn(),
            onDeleteConversation: jest.fn(),
          });
        }, { runEffects: true });

        expect(addEventListenerMock).toHaveBeenCalledWith("keydown", expect.any(Function));
        expect(removeEventListenerMock).toHaveBeenCalledWith("keydown", expect.any(Function));

        // Verify captured handler invokes onClose when key is Escape
        if (capturedHandler) {
          (capturedHandler as any)({ key: "Escape" });
          expect(onClose).toHaveBeenCalled();
        }
      } finally {
        (global as any).window = origWindow;
      }
    });
  });
});
