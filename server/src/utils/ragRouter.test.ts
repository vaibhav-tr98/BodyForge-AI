import { routeKnowledgeQuery } from "./ragRouter";

describe("RAG Router (ragRouter.ts)", () => {
  describe("Personal History & Data Lookups (Bypass Vector Search)", () => {
    it("should bypass RAG when asking about past workout weights", () => {
      const decision = routeKnowledgeQuery("What did I bench yesterday?");
      expect(decision.shouldRetrieve).toBe(false);
      expect(decision.reason).toContain("Personal structured history");
    });

    it("should bypass RAG when asking about personal workout sessions", () => {
      const decision = routeKnowledgeQuery("Can you show my workouts from this week?");
      expect(decision.shouldRetrieve).toBe(false);
    });

    it("should bypass RAG when checking macro adherence", () => {
      const decision = routeKnowledgeQuery("Did I hit my macros today?");
      expect(decision.shouldRetrieve).toBe(false);
    });

    it("should bypass RAG when checking personal PRs", () => {
      const decision = routeKnowledgeQuery("What is my PR on deadlift?");
      expect(decision.shouldRetrieve).toBe(false);
    });

    it("should bypass RAG for last logged session queries", () => {
      const decision = routeKnowledgeQuery("What was my last squat workout?");
      expect(decision.shouldRetrieve).toBe(false);
    });
  });

  describe("Conversational Pleasantries & Filler (Bypass Vector Search)", () => {
    it("should bypass RAG for greetings", () => {
      expect(routeKnowledgeQuery("Hello coach").shouldRetrieve).toBe(false);
      expect(routeKnowledgeQuery("Hey").shouldRetrieve).toBe(false);
      expect(routeKnowledgeQuery("Good morning").shouldRetrieve).toBe(false);
    });

    it("should bypass RAG for acknowledgments and thanks", () => {
      expect(routeKnowledgeQuery("Thanks!").shouldRetrieve).toBe(false);
      expect(routeKnowledgeQuery("ok got it").shouldRetrieve).toBe(false);
      expect(routeKnowledgeQuery("awesome").shouldRetrieve).toBe(false);
      expect(routeKnowledgeQuery("cool").shouldRetrieve).toBe(false);
    });

    it("should bypass RAG for empty or whitespace messages", () => {
      expect(routeKnowledgeQuery("").shouldRetrieve).toBe(false);
      expect(routeKnowledgeQuery("   ").shouldRetrieve).toBe(false);
      expect(routeKnowledgeQuery(null as any).shouldRetrieve).toBe(false);
    });
  });

  describe("Exercise Technique & Biomechanics (Route to 'exercise')", () => {
    it("should route bench press bar path inquiry to exercise", () => {
      const decision = routeKnowledgeQuery("What is the proper bar path on barbell bench press?");
      expect(decision.shouldRetrieve).toBe(true);
      expect(decision.category).toBe("exercise");
    });

    it("should route squat depth and knee valgus questions to exercise", () => {
      const decision = routeKnowledgeQuery("How do I prevent knee valgus during deep squats?");
      expect(decision.shouldRetrieve).toBe(true);
      expect(decision.category).toBe("exercise");
    });

    it("should route general form and technique questions to exercise", () => {
      const decision = routeKnowledgeQuery("Can you give me form cues for Romanian deadlifts?");
      expect(decision.shouldRetrieve).toBe(true);
      expect(decision.category).toBe("exercise");
    });
  });

  describe("Recovery, Deload & Fatigue (Route to 'recovery')", () => {
    it("should route deload questions to recovery", () => {
      const decision = routeKnowledgeQuery("How should I program a deload week?");
      expect(decision.shouldRetrieve).toBe(true);
      expect(decision.category).toBe("recovery");
    });

    it("should route RPE and autoregulation questions to recovery", () => {
      const decision = routeKnowledgeQuery("How does RPE-based autoregulation prevent overtraining?");
      expect(decision.shouldRetrieve).toBe(true);
      expect(decision.category).toBe("recovery");
    });

    it("should route systemic fatigue and soreness questions to recovery", () => {
      const decision = routeKnowledgeQuery("How can I distinguish systemic fatigue from normal DOMS?");
      expect(decision.shouldRetrieve).toBe(true);
      expect(decision.category).toBe("recovery");
    });
  });

  describe("Nutrition Science & Dietetics (Route to 'nutrition')", () => {
    it("should route protein intake questions to nutrition", () => {
      const decision = routeKnowledgeQuery("What is the optimal protein intake per kg for hypertrophy?");
      expect(decision.shouldRetrieve).toBe(true);
      expect(decision.category).toBe("nutrition");
    });

    it("should route creatine and nutrient timing questions to nutrition", () => {
      const decision = routeKnowledgeQuery("Does creatine timing matter relative to my workout?");
      expect(decision.shouldRetrieve).toBe(true);
      expect(decision.category).toBe("nutrition");
    });

    it("should route muscle protein synthesis leucine trigger to nutrition", () => {
      const decision = routeKnowledgeQuery("What is the leucine threshold required to maximize muscle protein synthesis?");
      expect(decision.shouldRetrieve).toBe(true);
      expect(decision.category).toBe("nutrition");
    });
  });

  describe("Training Methodology & Hypertrophy (Route to 'training')", () => {
    it("should route weekly volume and rep range questions to training", () => {
      const decision = routeKnowledgeQuery("How many sets per week are recommended for hypertrophy?");
      expect(decision.shouldRetrieve).toBe(true);
      expect(decision.category).toBe("training");
    });

    it("should route plateau breaking questions to training", () => {
      const decision = routeKnowledgeQuery("My progress has stalled on overhead press. How to break through this plateau?");
      expect(decision.shouldRetrieve).toBe(true);
      expect(decision.category).toBe("training");
    });

    it("should route mechanical tension and progressive overload to training", () => {
      const decision = routeKnowledgeQuery("Why is mechanical tension considered the primary driver of progressive overload?");
      expect(decision.shouldRetrieve).toBe(true);
      expect(decision.category).toBe("training");
    });
  });

  describe("Unmatched / General Non-Technical Queries", () => {
    it("should not retrieve knowledge for generic non-fitness queries", () => {
      const decision = routeKnowledgeQuery("Tell me a funny joke");
      expect(decision.shouldRetrieve).toBe(false);
      expect(decision.reason).toContain("does not require technical knowledge");
    });
  });
});
