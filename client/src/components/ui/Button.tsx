import React from "react";

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  loading = false,
  className = "",
  ...props
}) => {
  return (
    <button
      className={`w-full rounded-lg bg-cyan-600 px-4 py-3 font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? "Loading..." : children}
    </button>
  );
};

export default Button;