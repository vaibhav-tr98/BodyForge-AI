import { Outlet } from "react-router-dom";

interface AuthLayoutProps {
  title?: string;
  subtitle?: string;
}

export default function AuthLayout({
  title,
  subtitle,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">
        <div className="hidden w-1/2 lg:flex flex-col pr-16">
          <h1 className="mb-6 text-5xl font-extrabold">
            BodyForge AI
          </h1>

          <p className="text-xl text-slate-300">
            Your Personal AI Fitness Coach
          </p>
        </div>

        <div className="w-full max-w-md rounded-2xl bg-slate-900 p-8 shadow-2xl">
          {title && (
            <>
              <h2 className="mb-2 text-3xl font-bold">{title}</h2>
              <p className="mb-8 text-slate-400">{subtitle}</p>
            </>
          )}

          <Outlet />
        </div>
      </div>
    </div>
  );
}