export interface ExtractedFoodItemDTO {
  foodText: string;
  quantity: number;
  unit: string;
}

export interface FoodExtractionResultDTO {
  items: ExtractedFoodItemDTO[];
}

export interface CandidatePreviewDTO {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodCandidateDTO {
  food: {
    _id: string;
    name: string;
  };
  preview: CandidatePreviewDTO;
}

export interface FoodProposalItemDTO {
  extractedFood: string;
  quantity: number;
  unit: string;
  candidates: FoodCandidateDTO[];
  selectedCandidateId: string | null;
  requiresReview: boolean;
  status: "matched" | "ambiguous" | "not_found";
}

export interface AnalyzeMealResponseDTO {
  proposals: FoodProposalItemDTO[];
}
