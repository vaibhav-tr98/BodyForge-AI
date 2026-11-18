import React, { useState, useEffect } from "react";
import { Plus, MessageSquare, Trash2, X, Check, AlertCircle } from "lucide-react";
import type { Conversation } from "../../types/coach.types";

export interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId?: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  isLoading?: boolean;
  isDeleting?: boolean;
  isOpen?: boolean; // For mobile drawer visibility
  onClose?: () => void; // For closing mobile drawer
  className?: string;
}

function formatConversationDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "";
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();
    if (isYesterday) {
      return "Yesterday";
    }
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isLoading = false,
  isDeleting = false,
  isOpen = false,
  onClose,
  className = "",
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Close mobile drawer on Escape key for WCAG accessibility
  useEffect(() => {
    if (!isOpen || !onClose || typeof window === "undefined") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSelect = (id: string) => {
    onSelectConversation(id);
    if (onClose) onClose();
  };

  const handleNewChat = () => {
    onNewConversation();
    if (onClose) onClose();
  };

  const handleConfirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteConversation(id);
    setConfirmDeleteId(null);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  const content = (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleNewChat}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm px-4 py-2.5 shadow-xs transition-colors cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
          aria-label="Start new conversation"
        >
          <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>New Chat</span>
        </button>

        {/* Mobile close button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Conversation List */}
      <nav
        aria-label="Conversation list"
        className="flex-1 overflow-y-auto p-3 space-y-1.5 focus:outline-hidden"
      >
        {isLoading ? (
          <div className="space-y-2 p-1" aria-busy="true" aria-label="Loading conversations">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12 px-3 text-gray-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" aria-hidden="true" />
            <p className="text-xs font-semibold text-gray-500 mb-1">No chats yet</p>
            <p className="text-[11px] text-gray-400">
              Start a new conversation to consult your coach.
            </p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv._id === activeConversationId;
            const isConfirming = confirmDeleteId === conv._id;
            const dateDisplay = formatConversationDate(conv.lastMessageAt || conv.updatedAt || conv.createdAt);

            return (
              <div
                key={conv._id}
                className={`group relative flex items-center justify-between rounded-xl p-3 text-sm transition-all cursor-pointer ${
                  isActive
                    ? "bg-cyan-50/80 text-cyan-950 font-medium border border-cyan-200/80 shadow-2xs"
                    : "text-gray-700 hover:bg-gray-50 border border-transparent"
                }`}
                onClick={() => handleSelect(conv._id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelect(conv._id);
                  }
                }}
                aria-current={isActive ? "page" : undefined}
                aria-label={`Conversation: ${conv.title}`}
              >
                {isConfirming ? (
                  // Inline Delete Confirmation
                  <div
                    className="flex items-center justify-between w-full py-0.5 text-xs text-red-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      Delete chat?
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleConfirmDelete(conv._id, e)}
                        disabled={isDeleting}
                        className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 font-semibold text-[11px] cursor-pointer"
                        aria-label="Confirm delete conversation"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelDelete}
                        className="px-2 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 font-semibold text-[11px] cursor-pointer"
                        aria-label="Cancel delete conversation"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  // Regular Conversation Item View
                  <>
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="truncate text-xs font-semibold leading-tight">
                        {conv.title || "New Conversation"}
                      </p>
                      {dateDisplay && (
                        <span className="text-[10px] text-gray-400 mt-0.5 block">
                          {dateDisplay}
                        </span>
                      )}
                    </div>

                    {/* Delete Icon Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(conv._id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-opacity cursor-pointer focus:opacity-100 focus:outline-hidden"
                      aria-label={`Delete conversation ${conv.title}`}
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
            );
          })
        )}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden md:flex flex-col w-64 lg:w-72 shrink-0 h-full ${className}`}
        aria-label="Sidebar navigation"
      >
        {content}
      </aside>

      {/* Mobile Drawer Overlay & Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-white shadow-2xl z-10 flex flex-col">
            {content}
          </div>
        </div>
      )}
    </>
  );
};

export default ConversationSidebar;
