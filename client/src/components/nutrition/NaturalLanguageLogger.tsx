import React, { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, X, AlertCircle, Check } from "lucide-react";
import toast from "react-hot-toast";
import { analyzeLog, createNutritionEntry } from "../../services/nutrition.service";
import { getErrorMessage } from "../../services/api";

export default function NaturalLanguageLogger({ date }: { date: string }) {
  const [text, setText] = useState("");
  const [proposals, setProposals] = useState<any[]>([]);
  const [noFoodDetected, setNoFoodDetected] = useState(false);
  const isSubmittingRef = useRef(false);

  const queryClient = useQueryClient();

  const analyzeMutation = useMutation({
    mutationFn: analyzeLog,
    onSuccess: (data) => {
      if (!data?.proposals || data.proposals.length === 0) {
        setNoFoodDetected(true);
        setProposals([]);
        return;
      }
      setNoFoodDetected(false);
      const mapped = data.proposals.map((p: any) => {
        const candidate = p.candidates.find((c: any) => c.food._id === p.selectedCandidateId) || p.candidates[0] || null;
        return {
          ...p,
          confirmedCandidate: candidate
        };
      });
      setProposals(mapped);
    },
    onError: () => {
      setNoFoodDetected(false);
    }
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      try {
        const validItems = proposals.filter(p => p.status !== "not_found" && p.confirmedCandidate);
        if (validItems.length === 0) {
          throw new Error("No matched foods available to log.");
        }
        for (const item of validItems) {
          await createNutritionEntry({
            date,
            foodName: item.confirmedCandidate.food.name,
            quantity: item.quantity,
            unit: item.unit
          });
        }
      } finally {
        isSubmittingRef.current = false;
      }
    },
    onSuccess: () => {
      toast.success("Meal logged successfully!");
      queryClient.invalidateQueries({ queryKey: ["nutrition"] });
      queryClient.invalidateQueries({ queryKey: ["daily-summary"] });
      setProposals([]);
      setText("");
      setNoFoodDetected(false);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    }
  });

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || text.trim().length > 500 || analyzeMutation.isPending) return;
    setNoFoodDetected(false);
    analyzeMutation.mutate(text.trim());
  };

  const handleCandidateChange = (index: number, candidateId: string) => {
    const updated = [...proposals];
    const candidate = updated[index].candidates.find((c: any) => c.food._id === candidateId);
    updated[index].confirmedCandidate = candidate;
    setProposals(updated);
  };

  const handleRemove = (index: number) => {
    const updated = [...proposals];
    updated.splice(index, 1);
    setProposals(updated);
  };

  if (proposals.length > 0) {
    const hasLoggable = proposals.some(p => p.status !== 'not_found' && p.confirmedCandidate);

    return (
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-center mb-5 relative z-10">
          <h2 className="text-lg font-bold text-[#111827] flex items-center gap-2">
            <Sparkles className="text-cyan-600" size={20} />
            Review Your Meal
          </h2>
          <button
            onClick={() => setProposals([])}
            disabled={confirmMutation.isPending}
            className="p-2 text-[#6B7280] hover:text-[#111827] bg-[#F1F3F5] hover:bg-[#E5E7EB] rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50"
            aria-label="Close review"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 relative z-10">
          {proposals.map((proposal, i) => (
            <div key={i} className={`p-4 rounded-xl border ${proposal.status === 'not_found' ? 'border-red-200 bg-red-50' : 'border-[#E5E7EB] bg-[#F7F8FA]'}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-base font-bold text-[#111827] capitalize">
                    {proposal.quantity} {proposal.unit} {proposal.extractedFood}
                  </h3>
                  {proposal.status === "not_found" && (
                     <p className="text-red-500 text-sm mt-1 flex items-center gap-1 font-medium">
                       <AlertCircle size={14} /> Food not found in database - please log manually.
                     </p>
                  )}
                  {proposal.requiresReview && proposal.status !== "not_found" && (
                    <p className="text-amber-600 text-xs mt-1 font-medium">Multiple matches found. Please review selection.</p>
                  )}
                </div>
                <button
                  disabled={confirmMutation.isPending}
                  onClick={() => handleRemove(i)}
                  className="text-[#6B7280] hover:text-red-500 p-2 rounded-lg hover:bg-[#E5E7EB] min-h-[44px] min-w-[44px] flex items-center justify-center transition disabled:opacity-50"
                  aria-label="Remove food"
                >
                  <X size={18} />
                </button>
              </div>

              {proposal.status !== "not_found" && proposal.candidates.length > 0 && (
                <div className="mt-3">
                  <select
                    disabled={confirmMutation.isPending}
                    value={proposal.confirmedCandidate?.food._id || ""}
                    onChange={(e) => handleCandidateChange(i, e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg p-3 text-[#111827] text-sm font-medium focus:outline-none focus:border-cyan-500 mb-3 min-h-[44px]"
                  >
                    {proposal.candidates.map((c: any) => (
                      <option key={c.food._id} value={c.food._id}>
                        {c.food.name}
                      </option>
                    ))}
                  </select>

                  {proposal.confirmedCandidate && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg px-3 py-2">
                       <div className="font-bold text-[#111827]">{proposal.confirmedCandidate.preview.calories} kcal</div>
                       <div className="text-[#6B7280] flex gap-3 font-medium">
                         <span><span className="text-cyan-600 font-bold">P</span> {proposal.confirmedCandidate.preview.protein}g</span>
                         <span><span className="text-blue-600 font-bold">C</span> {proposal.confirmedCandidate.preview.carbs}g</span>
                         <span><span className="text-orange-500 font-bold">F</span> {proposal.confirmedCandidate.preview.fat}g</span>
                       </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {confirmMutation.isError && (
          <p className="text-red-500 text-sm mt-4 text-right font-medium flex items-center justify-end gap-1.5">
            <AlertCircle size={15} />
            {getErrorMessage(confirmMutation.error)}
          </p>
        )}

        <div className="mt-6 flex justify-end relative z-10">
          <button
            disabled={confirmMutation.isPending || !hasLoggable}
            onClick={() => confirmMutation.mutate()}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-xl font-bold transition disabled:opacity-50 min-h-[44px] w-full sm:w-auto justify-center"
          >
            {confirmMutation.isPending ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : <Check size={20} />}
            Confirm & Log Meal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-sm">
      <h2 className="text-base font-bold text-[#111827] flex items-center gap-2 mb-3 uppercase tracking-wide">
        <Sparkles className="text-cyan-600" size={18} />
        Quick Log
      </h2>
      <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-3 items-stretch">
        <input
          type="text"
          value={text}
          onChange={e => {
            setText(e.target.value);
            if (noFoodDetected) setNoFoodDetected(false);
          }}
          disabled={analyzeMutation.isPending}
          maxLength={500}
          placeholder="e.g., I had 2 eggs and a banana"
          className="w-full sm:flex-1 min-w-0 bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-[#111827] font-medium placeholder:text-[#6B7280] focus:outline-none focus:border-cyan-500 focus:bg-[#FFFFFF] transition min-h-[44px] disabled:opacity-50"
        />
        <button
          disabled={!text.trim() || analyzeMutation.isPending}
          type="submit"
          className="w-full sm:w-auto shrink-0 bg-[#111827] hover:bg-[#374151] text-white px-5 py-2.5 rounded-xl font-bold transition disabled:opacity-50 whitespace-nowrap flex items-center justify-center min-h-[44px]"
        >
          {analyzeMutation.isPending ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : "Analyze"}
        </button>
      </form>
      {analyzeMutation.isError && (
        <p className="text-red-500 text-sm mt-3 font-medium flex items-center gap-1.5">
          <AlertCircle size={15} />
          {getErrorMessage(analyzeMutation.error)}
        </p>
      )}
      {noFoodDetected && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-800 text-sm font-medium">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
          <div>
            No food items detected in your input. Try describing what you ate and how much (e.g., &quot;I had 2 eggs and a banana&quot;).
          </div>
        </div>
      )}
    </div>
  );
}
