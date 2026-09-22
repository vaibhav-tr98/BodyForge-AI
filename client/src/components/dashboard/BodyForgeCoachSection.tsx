import React, { useState } from 'react';
import { useAICoaching } from '../../hooks/useAICoaching';
import { 
  Sparkles, 
  Target, 
  Dumbbell, 
  Apple, 
  TrendingUp, 
  ChevronDown, 
  ChevronUp
} from 'lucide-react';

interface BodyForgeCoachSectionProps {
  date?: Date;
}

export const BodyForgeCoachSection: React.FC<BodyForgeCoachSectionProps> = ({ date = new Date() }) => {
  const dateString = date.toISOString().split('T')[0];
  const { data, isLoading, isError } = useAICoaching(dateString);
  const [expandedSection, setExpandedSection] = useState<'training' | 'nutrition' | 'progress' | null>(null);

  const toggleSection = (section: 'training' | 'nutrition' | 'progress') => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  if (isLoading) {
    return (
      <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden animate-pulse">
        {/* Header Skeleton */}
        <div className="p-5 md:p-6 pb-4 border-b border-slate-700/50">
          <div className="flex items-center space-x-2 mb-4">
            <Sparkles className="w-5 h-5 text-cyan-400/50" />
            <div className="h-6 bg-slate-700 rounded w-40"></div>
          </div>
          <div className="space-y-2 mb-5">
            <div className="h-4 bg-slate-700 rounded w-full"></div>
            <div className="h-4 bg-slate-700 rounded w-11/12"></div>
            <div className="h-4 bg-slate-700 rounded w-4/5"></div>
          </div>

          <div className="flex items-start space-x-3 bg-slate-700/30 rounded-lg p-4">
            <div className="w-5 h-5 rounded-full bg-slate-600 flex-shrink-0 mt-0.5"></div>
            <div className="w-full">
              <div className="h-3 bg-slate-600 rounded w-24 mb-2"></div>
              <div className="h-4 bg-slate-600 rounded w-3/4"></div>
            </div>
          </div>
        </div>
        {/* Accordions Skeleton */}
        <div className="divide-y divide-slate-700/50">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-full px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-slate-700"></div>
                <div className="h-5 bg-slate-700 rounded w-32"></div>
              </div>
              <div className="w-5 h-5 rounded bg-slate-700"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700 flex flex-col items-center justify-center text-center">
        <Sparkles className="w-8 h-8 text-slate-500 mb-3 opacity-50" />
        <h3 className="text-lg font-semibold text-slate-300 mb-1">Coach is resting right now</h3>
        <p className="text-slate-500 text-sm">We'll be back with personalized insights shortly.</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
      case 'on_track':
        return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'light':
      case 'needs_attention':
        return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'rest':
        return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-800/90 rounded-xl shadow-xl border border-cyan-700/50 overflow-hidden relative">
      {/* Header */}
      <div className="p-5 md:p-6 pb-4 border-b border-slate-700/50">
        <div className="flex items-center space-x-2 mb-3">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white tracking-wide">BODYFORGE COACH</h2>
        </div>
        <p className="text-slate-300 text-base md:text-lg leading-relaxed mb-4">
          {data.summary}
        </p>
        
        <div className="flex items-start space-x-3 bg-cyan-950/40 border border-cyan-500/30 rounded-lg p-4">
          <Target className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider block mb-1">Today's Priority</span>
            <p className="text-cyan-50 font-medium text-sm md:text-base">{data.primaryAction}</p>
          </div>
        </div>
      </div>

      {/* Accordions */}
      <div className="divide-y divide-slate-700/50">
        {/* Training */}
        <div>
          <button 
            onClick={() => toggleSection('training')}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${getStatusColor(data.trainingGuidance.status)}`}>
                <Dumbbell className="w-4 h-4" />
              </div>
              <span className="font-semibold text-slate-200">Training Guidance</span>
            </div>
            {expandedSection === 'training' ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
          </button>
          {expandedSection === 'training' && (
            <div className="px-5 pb-5 pt-1 text-slate-300 text-sm leading-relaxed pl-[3.25rem]">
              {data.trainingGuidance.recommendation}
            </div>
          )}
        </div>

        {/* Nutrition */}
        <div>
          <button 
            onClick={() => toggleSection('nutrition')}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${getStatusColor(data.nutritionGuidance.status)}`}>
                <Apple className="w-4 h-4" />
              </div>
              <span className="font-semibold text-slate-200">Nutrition Guidance</span>
            </div>
            {expandedSection === 'nutrition' ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
          </button>
          {expandedSection === 'nutrition' && (
            <div className="px-5 pb-5 pt-1 text-slate-300 text-sm leading-relaxed pl-[3.25rem]">
              {data.nutritionGuidance.recommendation}
            </div>
          )}
        </div>

        {/* Progress */}
        <div>
          <button 
            onClick={() => toggleSection('progress')}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg text-indigo-400 bg-indigo-400/10 border border-indigo-400/20">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="font-semibold text-slate-200">Progress Insight</span>
            </div>
            {expandedSection === 'progress' ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
          </button>
          {expandedSection === 'progress' && (
            <div className="px-5 pb-5 pt-1 text-slate-300 text-sm leading-relaxed pl-[3.25rem]">
              {data.progressInsight.observation}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
