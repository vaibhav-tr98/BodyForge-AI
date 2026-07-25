import type { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function FeatureCard({
  icon: Icon,
  title,
  description,
}: FeatureCardProps) {
  return (
    <div
      className="
        group
        cursor-pointer
        rounded-2xl
        border
        border-slate-800
        bg-slate-900
        p-10
        transition-all
        duration-300
        hover:-translate-y-2
        hover:scale-[1.03]
        hover:border-cyan-400
        hover:bg-slate-800
        hover:shadow-xl
        hover:shadow-cyan-500/10
      "
    >
      <Icon className="mb-6 h-14 w-14 text-cyan-400 transition-transform duration-300 group-hover:scale-110" />

      <h3 className="mb-4 text-3xl font-bold text-white">
        {title}
      </h3>

      <p className="text-lg leading-8 text-slate-400">
        {description}
      </p>
    </div>
  );
}