import { Link } from "react-router-dom";

import LoginForm from "../features/auth/components/LoginForm";

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-2 text-3xl font-bold text-white">
        Welcome Back
      </h1>

      <p className="mb-8 text-slate-400">
        Sign in to continue your fitness journey.
      </p>

      <LoginForm />

      <p className="mt-6 text-center text-sm text-slate-400">
        Don't have an account?{" "}
        <Link
          to="/register"
          className="font-semibold text-cyan-400 hover:text-cyan-300"
        >
          Create Account
        </Link>
      </p>
    </>
  );
}