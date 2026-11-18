import React from "react";
import { Sparkles, TrendingUp, HeartPulse, Utensils, Activity, ArrowRight } from "lucide-react";

export interface SuggestedPrompt {
  id: string;
  title: string;
  prompt: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    id: "progressive-overload",
    title: "Progressive Overload",
    prompt: "Explain progressive overload for my current training.",
    category: "Training Science",
    icon: TrendingUp,
  },
  {
    id: "workout-recovery",
    title: "Workout Recovery",
    prompt: "Help me understand my workout recovery.",
    category: "Recovery",
    icon: HeartPulse,
  },
  {
    id: "protein-intake",
    title: "Protein Optimization",
    prompt: "How can I improve my protein intake?",
    category: "Nutrition",
    icon: Utensils,
  },
  {
    id: "training-consistency",
    title: "Training Consistency",
    prompt: "Analyze my recent training consistency.",
    category: "Progress",
    icon: Activity,
  },
];

export interface EmptyCoachStateProps {
  onSelectPrompt: (prompt: string) => void;
  className?: string;
}

export const EmptyCoachState: React.FC<EmptyCoachStateProps> = ({
  onSelectPrompt,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center max-w-2xl mx-auto px-4 py-8 ${className}`}
      role="region"
      aria-label="AI Coach Welcome and Suggested Prompts"
    >
      <div className="w-14 h-14 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 shadow-xs mb-4">
        <Sparkles className="w-7 h-7" aria-hidden="true" />
      </div>

      <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-2">
        Meet Your BodyForge AI Coach
      </h3>

      <p className="text-sm text-gray-600 max-w-md mb-8 leading-relaxed">
        Your dedicated fitness intelligence assistant. Grounded in your actual workout logs,
        macronutrient targets, and verified exercise science.
      </p>

      <div className="w-full text-left">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Suggested Topics
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SUGGESTED_PROMPTS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectPrompt(item.prompt)}
                className="group flex flex-col justify-between p-4 rounded-xl border border-gray-200 bg-white hover:border-cyan-400 hover:bg-cyan-50/30 transition-all text-left shadow-xs cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                aria-label={`Ask: ${item.prompt}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-100">
                      {item.category}
                    </span>
                    <Icon className="w-4 h-4 text-gray-400 group-hover:text-cyan-600 transition-colors" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-cyan-900 transition-colors mb-1">
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    "{item.prompt}"
                  </p>
                </div>

                <div className="flex items-center gap-1 text-xs font-medium text-cyan-600 mt-3 pt-2 border-t border-gray-100 opacity-80 group-hover:opacity-100">
                  <span>Ask coach</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EmptyCoachState;
