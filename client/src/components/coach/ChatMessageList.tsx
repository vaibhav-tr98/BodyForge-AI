import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { ArrowDown } from "lucide-react";
import { ChatMessageItem } from "./ChatMessageItem";
import { EmptyCoachState } from "./EmptyCoachState";
import type { ConversationMessage, KnowledgeSource } from "../../types/coach.types";

export interface ChatMessageListProps {
  messages: ConversationMessage[];
  optimisticUserMessage?: ConversationMessage | null;
  streamingText?: string;
  streamingSources?: KnowledgeSource[];
  isConnecting?: boolean;
  isStreaming?: boolean;
  isLoading?: boolean;
  onSelectPrompt?: (prompt: string) => void;
  className?: string;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  optimisticUserMessage,
  streamingText = "",
  streamingSources = [],
  isConnecting = false,
  isStreaming = false,
  isLoading = false,
  onSelectPrompt,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Check if optimistic message is already persisted into messages
  const shouldRenderOptimistic = useMemo(() => {
    if (!optimisticUserMessage) return false;
    return !messages.some(
      (m) => m.id === optimisticUserMessage.id || (m.role === "user" && m.content === optimisticUserMessage.content)
    );
  }, [messages, optimisticUserMessage]);

  // Track scroll position to determine auto-scroll & show scroll-to-bottom button
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = distanceToBottom < 120;
    setIsNearBottom(near);
    setShowScrollBottom(!near);
  }, []);

  // Smoothly scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  // Auto-scroll when new messages arrive or stream updates, IF user is already near bottom
  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom("smooth");
    }
  }, [
    messages.length,
    streamingText,
    isConnecting,
    isStreaming,
    shouldRenderOptimistic,
    isNearBottom,
    scrollToBottom,
  ]);

  // Initial scroll to bottom on mount or conversation change
  useEffect(() => {
    scrollToBottom("auto");
  }, [scrollToBottom]);

  const isEmpty =
    messages.length === 0 &&
    !shouldRenderOptimistic &&
    !isConnecting &&
    !isStreaming &&
    !isLoading;

  return (
    <div className={`relative flex flex-col flex-1 min-h-0 ${className}`}>
      {/* Scrollable Message History Area */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scroll-smooth"
        tabIndex={0}
        aria-label="Conversation messages"
      >
        {/* Loading Skeleton */}
        {isLoading && (
          <div className="space-y-4 py-4" aria-busy="true" aria-label="Loading conversation messages">
            <div className="flex gap-3 justify-start max-w-[70%] animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-28" />
                <div className="h-16 bg-gray-100 rounded-xl" />
              </div>
            </div>
            <div className="flex gap-3 justify-end max-w-[70%] ml-auto animate-pulse">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-20 ml-auto" />
                <div className="h-12 bg-cyan-100 rounded-xl" />
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
            </div>
          </div>
        )}

        {/* Empty State */}
        {isEmpty && onSelectPrompt && (
          <div className="my-auto py-8">
            <EmptyCoachState onSelectPrompt={onSelectPrompt} />
          </div>
        )}

        {/* Persisted Messages */}
        {messages.map((msg) => (
          <ChatMessageItem
            key={msg.id}
            role={msg.role}
            content={msg.content}
            createdAt={msg.createdAt}
          />
        ))}

        {/* In-Flight Optimistic User Message */}
        {shouldRenderOptimistic && optimisticUserMessage && (
          <ChatMessageItem
            key={`optimistic-${optimisticUserMessage.id}`}
            role="user"
            content={optimisticUserMessage.content}
            createdAt={optimisticUserMessage.createdAt}
            isOptimistic={true}
          />
        )}

        {/* In-Flight Connecting / Waiting for First Token */}
        {isConnecting && !streamingText && (
          <ChatMessageItem
            role="assistant"
            content=""
            isStreaming={true}
          />
        )}

        {/* In-Flight Streaming Assistant Message */}
        {isStreaming && (
          <ChatMessageItem
            role="assistant"
            content={streamingText}
            isStreaming={true}
            sources={streamingSources}
          />
        )}

        {/* Bottom anchor for scrolling */}
        <div ref={bottomRef} className="h-1" aria-hidden="true" />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-4 right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-700 shadow-md hover:bg-gray-50 hover:text-cyan-600 transition-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-cyan-500 z-10"
          aria-label="Scroll to newest messages"
        >
          <ArrowDown className="w-3.5 h-3.5 text-cyan-600" aria-hidden="true" />
          <span>Latest messages</span>
        </button>
      )}
    </div>
  );
};

export default ChatMessageList;
