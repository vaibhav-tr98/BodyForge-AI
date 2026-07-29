import { Link } from "react-router-dom";

import RegisterForm from "../features/auth/components/RegisterForm";

export default function RegisterPage() {
  return (
    <>
      <h1 className="mb-2 text-3xl font-bold text-white">
        Create Account
      </h1>

      <p className="mb-8 text-slate-400">
        Start your fitness journey today.
      </p>

      <RegisterForm />

      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-cyan-400 hover:text-cyan-300"
        >
          Sign In
        </Link>
      </p>
    </>
  );
}