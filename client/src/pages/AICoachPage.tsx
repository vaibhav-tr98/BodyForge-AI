import React, { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { Sparkles, PanelLeft, Plus, AlertCircle, X, RotateCcw } from "lucide-react";
import {
  ConversationSidebar,
  ChatMessageList,
  ChatInputBox,
} from "../components/coach";
import { useConversations } from "../hooks/useConversations";
import { useConversation } from "../hooks/useConversation";
import { useAIChatStream } from "../hooks/useAIChatStream";

export const AICoachPage: React.FC = () => {
  // 1. Conversations list and mutations
  const {
    conversations,
    isLoading: isConversationsLoading,
    createConversation,
    isCreating,
    deleteConversation,
    isDeleting,
  } = useConversations();

  // Initialize selectedConversationId to latest conversation if already cached/available
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(() => {
    if (conversations && conversations.length > 0) {
      const sorted = [...conversations].sort((a, b) => {
        const dateA = new Date(a.lastMessageAt || a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.lastMessageAt || b.updatedAt || b.createdAt).getTime();
        return dateB - dateA;
      });
      return sorted[0]._id;
    }
    return null;
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  // 2. Auto-select the most recently active conversation on initial load if none is selected
  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      const sorted = [...conversations].sort((a, b) => {
        const dateA = new Date(a.lastMessageAt || a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.lastMessageAt || b.updatedAt || b.createdAt).getTime();
        return dateB - dateA;
      });
      setSelectedConversationId(sorted[0]._id);
    }
  }, [conversations, selectedConversationId]);

  // 3. Messages for the selected conversation
  const {
    conversation: activeConversation,
    messages,
    isMessagesLoading,
  } = useConversation(selectedConversationId, {
    enabled: Boolean(selectedConversationId),
  });

  // 4. In-flight chat stream state machine
  const chatStream = useAIChatStream({
    conversationId: selectedConversationId,
  });

  // 5. Send message handler (orchestrates new conversation creation if none exists)
  const handleSendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || chatStream.isBusy) return;

      if (!selectedConversationId) {
        try {
          const res = await createConversation();
          setSelectedConversationId(res.conversation._id);
          setPendingMessage(trimmed);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to start conversation");
        }
        return;
      }

      try {
        await chatStream.sendMessage(trimmed);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send message");
      }
    },
    [chatStream, selectedConversationId, createConversation]
  );

  // Send pending message once newly created conversationId attaches
  useEffect(() => {
    if (pendingMessage && selectedConversationId && !chatStream.isBusy) {
      const msg = pendingMessage;
      setPendingMessage(null);
      chatStream.sendMessage(msg).catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to send message");
      });
    }
  }, [pendingMessage, selectedConversationId, chatStream]);

  // 6. New conversation action
  const handleNewConversation = useCallback(async () => {
    try {
      if (chatStream.isBusy) {
        chatStream.stopGeneration();
      }
      const res = await createConversation();
      setSelectedConversationId(res.conversation._id);
      toast.success("New chat started");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create conversation");
    }
  }, [chatStream, createConversation]);

  // 7. Conversation selection
  const handleSelectConversation = useCallback(
    (id: string) => {
      if (id === selectedConversationId) return;
      if (chatStream.isBusy) {
        chatStream.stopGeneration();
      }
      setSelectedConversationId(id);
    },
    [chatStream, selectedConversationId]
  );

  // 8. Delete conversation
  const handleDeleteConversation = useCallback(
    async (idToDelete: string) => {
      try {
        if (selectedConversationId === idToDelete && chatStream.isBusy) {
          chatStream.stopGeneration();
        }

        await deleteConversation(idToDelete);
        toast.success("Conversation deleted");

        if (selectedConversationId === idToDelete) {
          const remaining = conversations.filter((c) => c._id !== idToDelete);
          if (remaining.length > 0) {
            const sorted = [...remaining].sort((a, b) => {
              const dateA = new Date(a.lastMessageAt || a.updatedAt || a.createdAt).getTime();
              const dateB = new Date(b.lastMessageAt || b.updatedAt || b.createdAt).getTime();
              return dateB - dateA;
            });
            setSelectedConversationId(sorted[0]._id);
          } else {
            setSelectedConversationId(null);
          }
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete conversation");
      }
    },
    [chatStream, deleteConversation, selectedConversationId, conversations]
  );

  // Active conversation title for the header
  const headerTitle = useMemo(() => {
    if (activeConversation?.title) return activeConversation.title;
    if (selectedConversationId) {
      const matched = conversations.find((c) => c._id === selectedConversationId);
      if (matched?.title) return matched.title;
    }
    return "BodyForge AI Coach";
  }, [activeConversation, selectedConversationId, conversations]);

  return (
    <div
      className="flex flex-col h-[calc(100dvh-9rem)] md:h-[calc(100vh-6.5rem)] rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden"
      role="main"
      aria-label="AI Coach Conversation"
    >
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar Navigation */}
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          isLoading={isConversationsLoading}
          isDeleting={isDeleting}
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Chat Workstation */}
        <div className="flex flex-col flex-1 min-w-0 bg-[#F9FAFB] relative">
          {/* Chat Header */}
          <header className="h-14 border-b border-gray-200 bg-white px-4 flex items-center justify-between shrink-0 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Mobile Sidebar Toggle Button */}
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="md:hidden p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                aria-label="Open conversation sidebar"
              >
                <PanelLeft className="w-5 h-5" />
              </button>

              <div className="w-7 h-7 rounded-lg bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600 shrink-0">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
              </div>

              <div className="min-w-0">
                <h1 className="text-sm font-bold text-gray-900 truncate leading-tight">
                  {headerTitle}
                </h1>
                <p className="text-[11px] text-gray-400 truncate">
                  Personalized fitness coaching intelligence
                </p>
              </div>
            </div>

            {/* Header Action: Mobile New Chat */}
            <button
              type="button"
              onClick={handleNewConversation}
              disabled={isCreating}
              className="md:hidden p-1.5 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              aria-label="New conversation"
              title="New conversation"
            >
              <Plus className="w-5 h-5" />
            </button>
          </header>

          {/* Message List Area */}
          <ChatMessageList
            messages={messages}
            optimisticUserMessage={chatStream.optimisticUserMessage}
            streamingText={chatStream.streamingText}
            streamingSources={chatStream.streamingSources}
            isConnecting={chatStream.isConnecting}
            isStreaming={chatStream.isStreaming}
            isLoading={isMessagesLoading}
            onSelectPrompt={handleSendMessage}
            className="flex-1"
          />

          {/* Cancellation Notice Banner */}
          {chatStream.isCancelled && (
            <div
              className="mx-4 mb-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2 shadow-2xs"
              role="status"
            >
              <span>Response generation was stopped.</span>
              <button
                type="button"
                onClick={() => chatStream.reset()}
                className="text-amber-800 font-semibold hover:underline text-[11px] cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Generation Error Banner with Safe Retry */}
          {chatStream.isError && chatStream.error && (
            <div
              className="mx-4 mb-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-center justify-between gap-2 shadow-2xs"
              role="alert"
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
                <span className="truncate">{chatStream.error.message}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => chatStream.retry()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition cursor-pointer text-[11px]"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
                <button
                  type="button"
                  onClick={() => chatStream.reset()}
                  className="p-1 text-red-600 hover:text-red-800 rounded cursor-pointer"
                  aria-label="Dismiss error banner"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Anchored Chat Input Area */}
          <div className="p-3 sm:p-4 bg-white border-t border-gray-200 shrink-0">
            <ChatInputBox
              onSend={handleSendMessage}
              onStop={chatStream.stopGeneration}
              isBusy={chatStream.isBusy}
              disabled={isConversationsLoading || isCreating}
              placeholder={
                selectedConversationId
                  ? "Ask BodyForge Coach about your workouts, nutrition, or recovery..."
                  : "Ask BodyForge Coach a question to start..."
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AICoachPage;
