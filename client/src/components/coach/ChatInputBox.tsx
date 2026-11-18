import React, { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, Square } from "lucide-react";

export interface ChatInputBoxProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isBusy?: boolean;
  disabled?: boolean;
  placeholder?: string;
  initialValue?: string;
  className?: string;
}

const MAX_CHAR_LIMIT = 4000;
const WARNING_THRESHOLD = 3800;

export const ChatInputBox: React.FC<ChatInputBoxProps> = ({
  onSend,
  onStop,
  isBusy = false,
  disabled = false,
  placeholder = "Ask BodyForge Coach about your workouts, nutrition, or recovery...",
  initialValue = "",
  className = "",
}) => {
  const [text, setText] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync initialValue changes (e.g. from empty state suggestion click)
  useEffect(() => {
    if (initialValue) {
      setText(initialValue);
      // Auto-focus and resize textarea
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
        }
      }, 0);
    }
  }, [initialValue]);

  // Adjust textarea height dynamically to content
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const maxHeight = 180; // ~6 lines
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${Math.max(48, nextHeight)}px`;
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= MAX_CHAR_LIMIT) {
      setText(val);
      adjustHeight();
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isBusy || disabled || trimmed.length > MAX_CHAR_LIMIT) {
      return;
    }

    onSend(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const charCount = text.length;
  const isOverLimit = charCount > MAX_CHAR_LIMIT;
  const isNearLimit = charCount >= WARNING_THRESHOLD;
  const canSend = text.trim().length > 0 && !isBusy && !disabled && !isOverLimit;

  return (
    <div className={`w-full ${className}`}>
      <div
        className={`relative flex flex-col rounded-2xl border transition-all bg-white shadow-xs ${
          isBusy
            ? "border-gray-200 bg-gray-50/50"
            : "border-gray-300 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20"
        }`}
      >
        <label htmlFor="ai-chat-input" className="sr-only">
          Ask BodyForge Coach
        </label>

        <textarea
          ref={textareaRef}
          id="ai-chat-input"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || isBusy}
          placeholder={placeholder}
          rows={1}
          aria-label="Message BodyForge AI Coach"
          className="w-full resize-none rounded-2xl bg-transparent px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-hidden disabled:cursor-not-allowed disabled:text-gray-500 min-h-[48px] max-h-[180px] leading-relaxed"
        />

        {/* Action Toolbar */}
        <div className="flex items-center justify-between px-3 pb-2.5 pt-1 border-t border-gray-100">
          {/* Character counter */}
          <div className="text-[11px] font-medium text-gray-400">
            {charCount > 0 && (
              <span
                className={
                  isOverLimit
                    ? "text-red-600 font-semibold"
                    : isNearLimit
                    ? "text-amber-600 font-semibold"
                    : "text-gray-400"
                }
              >
                {charCount.toLocaleString()} / {MAX_CHAR_LIMIT.toLocaleString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Stop Generation Button */}
            {isBusy && onStop ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="Stop generating response"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-red-500"
              >
                <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                <span>Stop</span>
              </button>
            ) : (
              /* Send Button */
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                aria-label="Send message"
                className="w-8 h-8 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-2xs transition-colors cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
              >
                <ArrowUp className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInputBox;
