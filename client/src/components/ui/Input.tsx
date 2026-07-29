import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-2 block text-sm font-medium text-gray-200">
            {label}
          </label>
        )}

        <input
          ref={ref}
          className={`w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-400 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 ${className}`}
          {...props}
        />

        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;