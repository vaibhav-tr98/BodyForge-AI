import React from "react";
import { BookOpen, ExternalLink } from "lucide-react";
import type { KnowledgeSource } from "../../types/coach.types";

export interface KnowledgeSourceCardProps {
  source: KnowledgeSource;
  className?: string;
}

export const KnowledgeSourceCard: React.FC<KnowledgeSourceCardProps> = ({
  source,
  className = "",
}) => {
  // Format relevance percentage if similarity is a valid finite number
  const hasSimilarity = typeof source.similarity === "number" && !Number.isNaN(source.similarity);
  const relevancePercent = hasSimilarity
    ? Math.round(Math.max(0, Math.min(1, source.similarity)) * 100)
    : null;

  const hasValidUrl =
    typeof source.sourceUrl === "string" &&
    source.sourceUrl.trim().length > 0 &&
    (source.sourceUrl.startsWith("http://") || source.sourceUrl.startsWith("https://"));

  return (
    <div
      role="region"
      aria-label={`Source: ${source.title}`}
      className={`rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 transition-colors hover:border-gray-300 ${className}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full">
          <BookOpen className="w-3 h-3 text-cyan-600 shrink-0" aria-hidden="true" />
          <span className="truncate max-w-[140px]">{source.category || "General Fitness"}</span>
        </div>

        {relevancePercent !== null && (
          <span
            className="text-[11px] font-medium text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full shrink-0"
            title="Semantic search relevance score"
          >
            Relevance: {relevancePercent}%
          </span>
        )}
      </div>

      <h4 className="text-sm font-semibold text-gray-900 leading-snug mb-1">
        {source.title}
      </h4>

      <div className="flex items-center justify-between text-xs text-gray-600 gap-2 mt-2 pt-2 border-t border-gray-200/80">
        <span className="truncate text-gray-500" title={source.source}>
          {source.source || "Fitness Knowledge Base"}
        </span>

        {hasValidUrl ? (
          <a
            href={source.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-cyan-700 hover:text-cyan-800 font-medium shrink-0 hover:underline focus:outline-hidden focus:ring-2 focus:ring-cyan-500 rounded"
            aria-label={`Open external source: ${source.title}`}
          >
            <span>View source</span>
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        ) : (
          <span className="text-[11px] text-gray-400 italic shrink-0">
            Internal archive
          </span>
        )}
      </div>
    </div>
  );
};

export default KnowledgeSourceCard;
