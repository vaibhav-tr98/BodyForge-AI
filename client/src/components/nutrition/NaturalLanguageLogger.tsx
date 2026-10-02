import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, X, AlertCircle, Check } from "lucide-react";
import { analyzeLog, createNutritionEntry } from "../../services/nutrition.service";

export default function NaturalLanguageLogger({ date }: { date: string }) {
  const [text, setText] = useState("");
  const [proposals, setProposals] = useState<any[]>([]);

  const queryClient = useQueryClient();

  const analyzeMutation = useMutation({
    mutationFn: analyzeLog,
    onSuccess: (data) => {
      const mapped = data.proposals.map((p: any) => {
        const candidate = p.candidates.find((c: any) => c.food._id === p.selectedCandidateId) || p.candidates[0] || null;
        return {
          ...p,
          confirmedCandidate: candidate
        };
      });
      setProposals(mapped);
    }
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const validItems = proposals.filter(p => p.status !== "not_found" && p.confirmedCandidate);
      for (const item of validItems) {
        await createNutritionEntry({
          date,
          foodName: item.confirmedCandidate.food.name,
          quantity: item.quantity,
          unit: item.unit
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutrition", "entries", date] });
      queryClient.invalidateQueries({ queryKey: ["nutrition", "today-overview", date] });
      setProposals([]);
      setText("");
    }
  });

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || text.trim().length > 500) return;
    analyzeMutation.mutate(text);
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
    if (updated.length === 0) {
      setProposals([]);
    } else {
      setProposals(updated);
    }
  };

  if (proposals.length > 0) {
    return (
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 mb-8 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-center mb-5 relative z-10">
          <h2 className="text-lg font-bold text-[#111827] flex items-center gap-2">
            <Sparkles className="text-cyan-600" size={20} />
            Review Your Meal
          </h2>
          <button
            onClick={() => setProposals([])}
            className="p-2 text-[#6B7280] hover:text-[#111827] bg-[#F1F3F5] hover:bg-[#E5E7EB] rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center"
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
                       <AlertCircle size={14} /> Food not found - please log manually.
                     </p>
                  )}
                  {proposal.requiresReview && proposal.status !== "not_found" && (
                    <p className="text-amber-600 text-xs mt-1 font-medium">Multiple matches found. Please review.</p>
                  )}
                </div>
                <button onClick={() => handleRemove(i)} className="text-[#6B7280] hover:text-red-500 p-2 rounded-lg hover:bg-white min-h-[44px] min-w-[44px] flex items-center justify-center transition">
                  <X size={18} />
                </button>
              </div>

              {proposal.status !== "not_found" && proposal.candidates.length > 0 && (
                <div className="mt-3">
                  <select
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
                    <div className="flex gap-4 text-sm bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg px-3 py-2">
                       <div className="font-bold text-[#111827]">{proposal.confirmedCandidate.preview.calories} kcal</div>
                       <div className="text-[#6B7280] flex gap-3 font-medium">
                         <span><span className="text-cyan-600">P</span> {proposal.confirmedCandidate.preview.protein}g</span>
                         <span><span className="text-blue-600">C</span> {proposal.confirmedCandidate.preview.carbs}g</span>
                         <span><span className="text-orange-500">F</span> {proposal.confirmedCandidate.preview.fat}g</span>
                       </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end relative z-10">
          <button
            disabled={confirmMutation.isPending || proposals.filter(p => p.status !== 'not_found').length === 0}
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
    <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 mb-6 shadow-sm">
      <h2 className="text-base font-bold text-[#111827] flex items-center gap-2 mb-3 uppercase tracking-wide">
        <Sparkles className="text-cyan-600" size={18} />
        Quick Log
      </h2>
      <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={500}
          placeholder="e.g., I had 2 eggs and a banana"
          className="flex-1 bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111827] font-medium placeholder:text-[#6B7280] focus:outline-none focus:border-cyan-500 focus:bg-[#FFFFFF] transition min-h-[44px]"
        />
        <button
          disabled={!text.trim() || analyzeMutation.isPending}
          type="submit"
          className="bg-[#111827] hover:bg-[#374151] text-white px-6 py-3 rounded-xl font-bold transition disabled:opacity-50 whitespace-nowrap flex items-center justify-center min-w-[120px] min-h-[44px]"
        >
          {analyzeMutation.isPending ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : "Analyze"}
        </button>
      </form>
      {analyzeMutation.isError && (
        <p className="text-red-500 text-sm mt-3 font-medium">
          Analysis failed. AI requires network access and valid input.
        </p>
      )}
    </div>
  );
}
