import { motion } from "framer-motion";
export default function CTA() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="bg-slate-900 px-6 py-28"
    >
      <div className="mx-auto max-w-4xl rounded-3xl border border-cyan-500/20 bg-slate-950 p-12 text-center shadow-2xl shadow-cyan-500/10">

        <h2 className="mb-6 text-5xl font-extrabold text-white">
          Ready to Transform
          <span className="block text-cyan-400">
            Your Fitness Journey?
          </span>
        </h2>

        <p className="mx-auto mb-10 max-w-2xl text-lg leading-8 text-slate-400">
          Join BodyForge AI today and get personalized workouts,
          smart nutrition guidance, and AI-powered fitness insights
          designed just for you.
        </p>

        <button className="rounded-xl bg-cyan-500 px-10 py-5 text-lg font-semibold text-slate-950 transition-all duration-300 hover:scale-105 hover:bg-cyan-400">
          Get Started Free
        </button>

      </div>
    </motion.section>
  );
}