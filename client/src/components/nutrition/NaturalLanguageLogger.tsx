import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Check, X, AlertCircle } from "lucide-react";
import { analyzeLog, createNutritionEntry } from "../../services/nutrition.service";
import Loader from "../ui/Loader";

interface NaturalLanguageLoggerProps {
  date: string;
}

export default function NaturalLanguageLogger({ date }: NaturalLanguageLoggerProps) {
  const [text, setText] = useState("");
  const [proposals, setProposals] = useState<any[]>([]);
  
  const queryClient = useQueryClient();

  const analyzeMutation = useMutation({
    mutationFn: analyzeLog,
    onSuccess: (data) => {
      // Pre-select the best candidate for each proposal
      const mapped = data.proposals.map((p: any) => {
        // Find the candidate matching selectedCandidateId, or fallback to candidates[0], or null
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
      // Filter out not_found items
      const validItems = proposals.filter(p => p.status !== "not_found" && p.confirmedCandidate);
      
      // We process them sequentially to avoid overwhelming the single-create endpoint if there are many.
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
      queryClient.invalidateQueries({ queryKey: ["nutrition", "summary", date] });
      queryClient.invalidateQueries({ queryKey: ["nutrition", "today-overview"] });
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
           <Sparkles size={100} />
        </div>
        <div className="flex justify-between items-center mb-6 relative z-10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="text-cyan-500" size={20} />
            Your Meal
          </h2>
          <button 
            onClick={() => setProposals([])}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="space-y-4 relative z-10">
          {proposals.map((proposal, i) => (
            <div key={i} className={`p-4 rounded-xl border ${proposal.status === 'not_found' ? 'border-red-900/50 bg-red-950/20' : 'border-slate-800 bg-slate-950'}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-medium text-white capitalize">
                    {proposal.quantity} {proposal.unit} {proposal.extractedFood}
                  </h3>
                  {proposal.status === "not_found" && (
                     <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                       <AlertCircle size={14} /> Food not found — please log manually.
                     </p>
                  )}
                  {proposal.requiresReview && proposal.status !== "not_found" && (
                    <p className="text-amber-400 text-xs mt-1">Multiple matches found. Please review.</p>
                  )}
                </div>
                <button onClick={() => handleRemove(i)} className="text-slate-500 hover:text-red-400 p-1">
                  <X size={16} />
                </button>
              </div>

              {proposal.status !== "not_found" && proposal.candidates.length > 0 && (
                <div className="mt-3">
                  <select 
                    value={proposal.confirmedCandidate?.food._id || ""}
                    onChange={(e) => handleCandidateChange(i, e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-cyan-500 mb-3"
                  >
                    {proposal.candidates.map((c: any) => (
                      <option key={c.food._id} value={c.food._id}>
                        {c.food.name}
                      </option>
                    ))}
                  </select>

                  {proposal.confirmedCandidate && (
                    <div className="flex gap-4 text-sm">
                       <div className="text-amber-500 font-medium">{proposal.confirmedCandidate.preview.calories} kcal</div>
                       <div className="text-slate-400 flex gap-2">
                         <span className="text-cyan-400">P: {proposal.confirmedCandidate.preview.protein}g</span>
                         <span className="text-blue-400">C: {proposal.confirmedCandidate.preview.carbs}g</span>
                         <span className="text-orange-400">F: {proposal.confirmedCandidate.preview.fat}g</span>
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
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg font-bold transition disabled:opacity-50 shadow-lg shadow-cyan-900/50"
          >
            {confirmMutation.isPending ? <Loader /> : <Check size={20} />}
            Confirm & Log Meal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 relative overflow-hidden group">
      <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-cyan-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
        <Sparkles className="text-cyan-500" size={18} />
        What did you eat?
      </h2>
      <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-3">
        <input 
          type="text" 
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={500}
          placeholder="e.g., I had 2 eggs, 2 rotis and a banana" 
          className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition shadow-inner"
        />
        <button 
          disabled={!text.trim() || analyzeMutation.isPending}
          type="submit" 
          className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-xl font-medium transition disabled:opacity-50 whitespace-nowrap flex items-center justify-center min-w-[120px]"
        >
          {analyzeMutation.isPending ? <Loader /> : "Analyze"}
        </button>
      </form>
      {analyzeMutation.isError && (
        <p className="text-red-400 text-sm mt-3">
          Analysis failed. AI requires network access and valid input.
        </p>
      )}
    </div>
  );
}
