import { useState } from "react";
import { Sparkles, Dumbbell, Utensils, BatteryCharging, LineChart } from "lucide-react";
import { BodyForgeDailySummarySection } from "./BodyForgeDailySummarySection";
import { WorkoutAnalysisSection } from "./WorkoutAnalysisSection";
import { NutritionAnalysisSection } from "./NutritionAnalysisSection";
import { ReadinessAnalysisSection } from "./ReadinessAnalysisSection";
import { ProgressAnalysisSection } from "./ProgressAnalysisSection";

export type AIAnalyticsTab = "daily" | "workout" | "nutrition" | "readiness" | "progress";

interface AIAnalyticsHubSectionProps {
  initialTab?: AIAnalyticsTab;
}

export default function AIAnalyticsHubSection({ initialTab = "daily" }: AIAnalyticsHubSectionProps) {
  const [activeTab, setActiveTab] = useState<AIAnalyticsTab>(initialTab);

  const tabs: Array<{ id: AIAnalyticsTab; label: string; icon: React.ElementType }> = [
    { id: "daily", label: "Daily Briefing", icon: Sparkles },
    { id: "workout", label: "Workout", icon: Dumbbell },
    { id: "nutrition", label: "Nutrition", icon: Utensils },
    { id: "readiness", label: "Readiness", icon: BatteryCharging },
    { id: "progress", label: "Progress", icon: LineChart },
  ];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-wider text-[#6B7280] uppercase flex items-center gap-2">
          <Sparkles size={14} className="text-cyan-600" />
          AI Coaching Intelligence
        </h2>
        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-100">
          5-Point Analysis
        </span>
      </div>

      {/* Tab Selector */}
      <div className="flex overflow-x-auto no-scrollbar gap-1.5 p-1 rounded-xl bg-[#F1F3F5] border border-[#E5E7EB]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap min-h-[36px] ${
                isActive
                  ? "bg-[#FFFFFF] text-cyan-700 shadow-xs"
                  : "text-[#6B7280] hover:text-[#111827] hover:bg-[#FFFFFF]/50"
              }`}
            >
              <Icon size={14} className={isActive ? "text-cyan-600" : "text-[#9CA3AF]"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Analysis View */}
      <div className="pt-1">
        {activeTab === "daily" && <BodyForgeDailySummarySection />}
        {activeTab === "workout" && <WorkoutAnalysisSection />}
        {activeTab === "nutrition" && <NutritionAnalysisSection />}
        {activeTab === "readiness" && <ReadinessAnalysisSection />}
        {activeTab === "progress" && <ProgressAnalysisSection />}
      </div>
    </section>
  );
}
