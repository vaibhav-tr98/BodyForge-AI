import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-slate-950 px-6 text-white"
    >
      <div className="mx-auto max-w-5xl text-center">
        <h1 className="mb-8 text-7xl font-extrabold leading-tight md:text-8xl">
          Your Personal
          <span className="text-cyan-400"> AI Fitness Coach</span>
        </h1>

        <p className="mx-auto mb-12 max-w-3xl text-xl leading-9 text-slate-400">
          Personalized workouts, AI-powered nutrition plans,
          progress tracking, and intelligent fitness insights —
          all in one powerful platform.
        </p>

        <div className="flex flex-wrap justify-center gap-6">
          <Link
            to="/register"
            className="rounded-xl bg-cyan-500 px-10 py-5 font-semibold text-slate-950 transition-all duration-300 hover:scale-105 hover:bg-cyan-400"
          >
            Start Free
          </Link>

          <button
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            className="rounded-xl border border-slate-700 px-10 py-5 font-semibold transition-all duration-300 hover:scale-105 hover:border-cyan-400 hover:bg-slate-900"
          >
            Learn More
          </button>
        </div>
      </div>
    </motion.section>
  );
}