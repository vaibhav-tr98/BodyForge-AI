import React from 'react';
import { useAICoaching } from '../../hooks/useAICoaching';
import { Sparkles, Target } from 'lucide-react';

interface BodyForgeCoachSectionProps {
  date?: Date;
}

export const BodyForgeCoachSection: React.FC<BodyForgeCoachSectionProps> = ({ date = new Date() }) => {
  const dateString = date.toISOString().split('T')[0];
  const { data, isLoading, isError } = useAICoaching(dateString);

  if (isLoading) {
    return (
      <section>
        <h2 className="text-sm font-bold tracking-wider text-[#6B7280] uppercase mb-3">
          BodyForge Coach
        </h2>
        <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm animate-pulse min-h-[120px]">
          <div className="h-4 w-32 bg-[#E5E7EB] rounded mb-3"></div>
          <div className="h-12 w-full bg-[#E5E7EB] rounded"></div>
        </div>
      </section>
    );
  }

  if (isError || !data) {
    // Deterministic fallback / unavailable
    return (
      <section>
        <h2 className="text-sm font-bold tracking-wider text-[#6B7280] uppercase mb-3 flex items-center gap-2">
          <Sparkles size={14} className="text-cyan-500" />
          BodyForge Coach
        </h2>
        <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm text-center">
          <p className="text-sm font-medium text-[#6B7280]">
            Coach is resting. Keep training to generate insights!
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-sm font-bold tracking-wider text-[#6B7280] uppercase mb-3 flex items-center gap-2">
        <Sparkles size={14} className="text-cyan-600" />
        BodyForge Coach
      </h2>
      <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4 shadow-sm">
        <p className="text-sm font-medium text-[#111827] leading-relaxed mb-3">
          "{data.summary}"
        </p>
        
        <div className="flex items-start gap-2 bg-[#F1F3F5] rounded-lg p-3">
          <Target className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-[#111827] uppercase tracking-wider mb-0.5">Priority</p>
            <p className="text-xs text-[#6B7280]">{data.primaryAction}</p>
          </div>
        </div>
      </div>
    </section>
  );
};
