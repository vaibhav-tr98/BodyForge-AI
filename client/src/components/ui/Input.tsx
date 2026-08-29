import React from "react";
import { Eye, EyeOff } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    const [isRevealed, setIsRevealed] = React.useState(false);
    const isPasswordField = props.type === "password";
    const inputType = isPasswordField ? (isRevealed ? "text" : "password") : props.type;

    const handleRevealStart = () => setIsRevealed(true);
    const handleRevealEnd = () => setIsRevealed(false);

    return (
      <div className="w-full">
        {label && (
          <label className="mb-2 block text-sm font-medium text-gray-200">
            {label}
          </label>
        )}

        <div className="relative">
          <input
            {...props}
            ref={ref}
            type={inputType}
            className={`w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-400 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 ${isPasswordField ? "pr-12" : ""} ${className}`}
          />
          {isPasswordField && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-cyan-400 focus:outline-none"
              onMouseDown={handleRevealStart}
              onMouseUp={handleRevealEnd}
              onMouseLeave={handleRevealEnd}
              onTouchStart={handleRevealStart}
              onTouchEnd={handleRevealEnd}
              onTouchCancel={handleRevealEnd}
              aria-label={isRevealed ? "Hide password" : "Show password"}
            >
              {isRevealed ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          )}
        </div>

        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;