import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, User, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { KnowledgeSourceCard } from "./KnowledgeSourceCard";
import type { KnowledgeSource, MessageRole } from "../../types/coach.types";

export interface ChatMessageItemProps {
  role: MessageRole;
  content: string;
  createdAt?: string | Date;
  isStreaming?: boolean;
  isOptimistic?: boolean;
  sources?: KnowledgeSource[];
  className?: string;
}

function formatMessageTime(dateInput?: string | Date): string {
  if (!dateInput) return "";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  role,
  content,
  createdAt,
  isStreaming = false,
  isOptimistic = false,
  sources = [],
  className = "",
}) => {
  const [showSources, setShowSources] = useState(false);
  const isUser = role === "user";
  const formattedTime = formatMessageTime(createdAt);
  const hasSources = sources && sources.length > 0;

  return (
    <article
      role="article"
      aria-label={`${isUser ? "User" : "BodyForge Coach"} message`}
      className={`flex gap-3 py-3 ${isUser ? "justify-end" : "justify-start"} ${className}`}
    >
      {/* Assistant Avatar */}
      {!isUser && (
        <div
          className="w-8 h-8 rounded-full bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600 shrink-0 mt-0.5 shadow-2xs"
          aria-hidden="true"
        >
          <Sparkles className="w-4 h-4" />
        </div>
      )}

      {/* Message Container */}
      <div className={`flex flex-col max-w-[85%] sm:max-w-[78%] ${isUser ? "items-end" : "items-start"}`}>
        {/* Header metadata */}
        <div className="flex items-center gap-2 mb-1 px-1 text-xs text-gray-500">
          <span className="font-semibold text-gray-700">
            {isUser ? "You" : "BodyForge Coach"}
          </span>
          {!isUser && (
            <span className="text-[10px] font-medium bg-cyan-50 text-cyan-700 border border-cyan-200/60 px-1.5 py-0.2 rounded-full">
              AI Coach
            </span>
          )}
          {formattedTime && (
            <time
              dateTime={typeof createdAt === "string" ? createdAt : createdAt?.toISOString()}
              className="text-[11px] text-gray-400"
            >
              {formattedTime}
            </time>
          )}
          {isOptimistic && (
            <span className="text-[10px] font-medium text-cyan-600 animate-pulse">
              Sending...
            </span>
          )}
        </div>

        {/* Message Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed transition-shadow ${
            isUser
              ? "bg-cyan-600 text-white rounded-tr-xs shadow-xs"
              : "bg-white border border-gray-200 text-gray-800 rounded-tl-xs shadow-xs"
          }`}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">{content}</div>
          ) : (
            <div className="break-words">
              {content ? (
                <div className="markdown-body">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ href, children, ...props }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-600 hover:text-cyan-700 underline font-medium break-words focus:outline-hidden focus:ring-1 focus:ring-cyan-500 rounded"
                          {...props}
                        >
                          {children}
                        </a>
                      ),
                      code: ({ className, children, ...props }) => {
                        const isBlock = Boolean(className) || (typeof children === "string" && children.includes("\n"));
                        if (!isBlock) {
                          return (
                            <code className="bg-gray-100 text-cyan-900 px-1.5 py-0.5 rounded text-xs font-mono font-medium" {...props}>
                              {children}
                            </code>
                          );
                        }
                        return (
                          <code className={`font-mono text-xs ${className || ""}`} {...props}>
                            {children}
                          </code>
                        );
                      },
                      pre: ({ children, ...props }) => (
                        <pre className="bg-gray-900 text-gray-100 p-3.5 rounded-lg overflow-x-auto text-xs my-2.5 font-mono border border-gray-800" {...props}>
                          {children}
                        </pre>
                      ),
                      ul: ({ children, ...props }) => (
                        <ul className="list-disc pl-5 my-2 space-y-1" {...props}>{children}</ul>
                      ),
                      ol: ({ children, ...props }) => (
                        <ol className="list-decimal pl-5 my-2 space-y-1" {...props}>{children}</ol>
                      ),
                      li: ({ children, ...props }) => (
                        <li className="leading-relaxed" {...props}>{children}</li>
                      ),
                      p: ({ children, ...props }) => (
                        <p className="mb-2 last:mb-0 leading-relaxed" {...props}>{children}</p>
                      ),
                      blockquote: ({ children, ...props }) => (
                        <blockquote className="border-l-3 border-cyan-500 pl-3 italic text-gray-600 my-2 bg-gray-50/60 py-1 rounded-r" {...props}>
                          {children}
                        </blockquote>
                      ),
                      table: ({ children, ...props }) => (
                        <div className="overflow-x-auto my-2.5 rounded-lg border border-gray-200">
                          <table className="min-w-full divide-y divide-gray-200 text-xs" {...props}>{children}</table>
                        </div>
                      ),
                      th: ({ children, ...props }) => (
                        <th className="bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700" {...props}>{children}</th>
                      ),
                      td: ({ children, ...props }) => (
                        <td className="px-3 py-2 text-gray-600 border-t border-gray-100" {...props}>{children}</td>
                      ),
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              ) : isStreaming ? (
                <div className="flex items-center gap-1.5 text-gray-500 py-1 text-xs">
                  <span className="w-2 h-2 rounded-full bg-cyan-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-cyan-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-cyan-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                  <span className="ml-1 text-gray-400">Analyzing fitness context...</span>
                </div>
              ) : null}

              {/* Streaming Cursor */}
              {isStreaming && content && (
                <span
                  className="inline-block w-1.5 h-4 ml-1 bg-cyan-600 animate-pulse align-middle rounded-xs"
                  aria-hidden="true"
                />
              )}
            </div>
          )}

          {/* Grounded Sources Indicator (Assistant only) */}
          {!isUser && hasSources && (
            <div className="mt-3 pt-2.5 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowSources((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                aria-expanded={showSources}
                aria-label={`Toggle verified sources list (${sources.length} sources)`}
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                <span>Grounded in {sources.length} verified {sources.length === 1 ? "source" : "sources"}</span>
                {showSources ? (
                  <ChevronUp className="w-3.5 h-3.5 text-emerald-700 shrink-0 ml-0.5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-700 shrink-0 ml-0.5" aria-hidden="true" />
                )}
              </button>

              {showSources && (
                <div className="mt-2.5 space-y-2">
                  {sources.map((src, index) => (
                    <KnowledgeSourceCard
                      key={`${src.documentId}-${src.chunkId || index}`}
                      source={src}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div
          className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center text-gray-700 shrink-0 mt-0.5 shadow-2xs"
          aria-hidden="true"
        >
          <User className="w-4 h-4" />
        </div>
      )}
    </article>
  );
};

export default ChatMessageItem;
