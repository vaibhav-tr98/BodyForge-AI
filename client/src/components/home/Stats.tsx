import { motion } from "framer-motion";
const stats = [
  {
    value: "50K+",
    label: "Active Users",
  },
  {
    value: "100K+",
    label: "Workouts Generated",
  },
  {
    value: "95%",
    label: "Success Rate",
  },
  {
    value: "24/7",
    label: "AI Coach",
  },
];

export default function Stats() {
  return (
    <motion.section
  initial={{ opacity: 0, y: 30 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.6 }} className="bg-slate-950 px-6 py-24">
      <div className="mx-auto max-w-7xl">

        <div className="grid gap-8 text-center md:grid-cols-4">

          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-8 transition-all duration-300 hover:-translate-y-2 hover:border-cyan-400 hover:shadow-xl hover:shadow-cyan-500/10"
            >
              <h2 className="mb-3 text-5xl font-extrabold text-cyan-400">
                {stat.value}
              </h2>

              <p className="text-lg text-slate-400">
                {stat.label}
              </p>
            </div>
          ))}

        </div>

      </div>
    </motion.section>
  );
}