import { motion } from "framer-motion";
import { Dumbbell, Salad, ChartColumn } from "lucide-react";
import FeatureCard from "../common/FeatureCard";

export default function FeatureSection() {
  return (
    <motion.section
      id="features"

      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="bg-slate-950 px-6 py-28"
    >
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-20 text-center text-5xl font-bold text-white">
          Why Choose BodyForge AI?
        </h2>

        <div className="grid gap-8 md:grid-cols-3">
          <FeatureCard
            icon={Dumbbell}
            title="AI Workout Plans"
            description="Personalized workouts generated according to your goals, equipment and experience."
          />

          <FeatureCard
            icon={Salad}
            title="Smart Nutrition"
            description="Daily calorie and macro recommendations powered by AI."
          />

          <FeatureCard
            icon={ChartColumn}
            title="Progress Tracking"
            description="Track workouts, body measurements and PRs with beautiful analytics."
          />
        </div>
      </div>
    </motion.section>
  );
}