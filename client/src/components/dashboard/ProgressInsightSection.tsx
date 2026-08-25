import React from 'react';
import { useProgressInsight } from '../../hooks/useProgressInsight';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Info, 
  Flame,
  Activity,
  Ruler
} from 'lucide-react';
import type { ProgressInsightPriority } from '../../types/progressInsight.types';

export const ProgressInsightSection: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];
  const { data: insight, isLoading, isError } = useProgressInsight(today);

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-700 rounded w-2/3 mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
      </div>
    );
  }

  if (isError || !insight) {
    return null; // Gracefully handle error, don't break dashboard
  }

  const getPriorityColor = (priority: ProgressInsightPriority) => {
    switch (priority) {
      case 'high':
        return 'text-cyan-400';
      case 'medium':
        return 'text-blue-400';
      case 'low':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const getPriorityBorder = (priority: ProgressInsightPriority) => {
    switch (priority) {
      case 'high':
        return 'border-cyan-500/30 bg-cyan-900/10';
      case 'medium':
        return 'border-blue-500/30 bg-blue-900/10';
      case 'low':
        return 'border-gray-700 bg-gray-800/50';
      default:
        return 'border-gray-700 bg-gray-800';
    }
  };

  const getIcon = () => {
    switch (insight.type) {
      case 'no_history':
      case 'insufficient_history':
        return <Info className="w-6 h-6 text-cyan-400" />;
      case 'body_fat_improvement':
      case 'measurement_improvement':
      case 'weight_loss':
        return <TrendingDown className="w-6 h-6 text-green-400" />;
      case 'weight_gain':
      case 'body_fat_increase':
        return <TrendingUp className="w-6 h-6 text-orange-400" />;
      case 'weight_stable':
        return <Minus className="w-6 h-6 text-gray-400" />;
      default:
        return <Activity className="w-6 h-6 text-cyan-400" />;
    }
  };

  const renderContextMetric = (label: string, previous: number | null, current: number | null, unit: string, Icon: React.ElementType) => {
    if (previous === null || current === null) return null;
    
    return (
      <div className="flex items-center space-x-2 bg-gray-800 p-3 rounded-lg border border-gray-700">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-gray-400 text-sm">{label}:</span>
        <div className="flex items-center font-medium">
          <span className="text-gray-300">{previous} {unit}</span>
          <span className="mx-2 text-gray-500">→</span>
          <span className="text-white">{current} {unit}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`rounded-xl p-6 border ${getPriorityBorder(insight.priority)} transition-colors duration-300`}>
      <div className="flex items-start space-x-4">
        <div className="p-2 bg-gray-800 rounded-lg border border-gray-700">
          {getIcon()}
        </div>
        
        <div className="flex-1">
          <h3 className={`text-lg font-semibold mb-1 ${getPriorityColor(insight.priority)}`}>
            {insight.title}
          </h3>
          <p className="text-gray-300 text-sm mb-4 leading-relaxed">
            {insight.message}
          </p>

          {/* Context Metrics Grid */}
          {(insight.context.previousWeight !== null || insight.context.previousBodyFat !== null || insight.context.previousWaist !== null) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              {renderContextMetric(
                "Weight", 
                insight.context.previousWeight, 
                insight.context.currentWeight, 
                "kg",
                Activity
              )}
              {renderContextMetric(
                "Body Fat", 
                insight.context.previousBodyFat, 
                insight.context.currentBodyFat, 
                "%",
                Flame
              )}
              {renderContextMetric(
                "Waist", 
                insight.context.previousWaist, 
                insight.context.currentWaist, 
                "cm",
                Ruler
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
