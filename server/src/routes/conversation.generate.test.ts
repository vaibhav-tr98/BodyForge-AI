import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import app from "../app";
import { Conversation } from "../models/Conversation";
import { Message } from "../models/Message";
import { AIProvider } from "../services/aiProvider.service";
import { fitnessContextService } from "../services/fitnessContext.service";
import { knowledgeRetrievalService } from "../services/knowledgeRetrieval.service";
import { env } from "../config/env";

jest.mock("../services/aiProvider.service", () => {
  const actual = jest.requireActual("../services/aiProvider.service");
  return {
    ...actual,
    AIProvider: {
      ...actual.AIProvider,
      generateConversationalCoaching: jest.fn(),
      streamConversationalCoaching: jest.fn(),
    },
  };
});
jest.mock("../services/fitnessContext.service");

describe("Conversation AI Generation Integration Tests (M3.2)", () => {
  const userIdA = new mongoose.Types.ObjectId().toString();
  const userIdB = new mongoose.Types.ObjectId().toString();

  const tokenA = jwt.sign({ id: userIdA, email: "userA@test.com" }, env.jwtSecret, { expiresIn: "1h" });
  const tokenB = jwt.sign({ id: userIdB, email: "userB@test.com" }, env.jwtSecret, { expiresIn: "1h" });

  const mockFitnessContext = {
    assembledAt: "2026-11-07T03:00:00.000Z",
    profile: {
      age: 28,
      gender: "male",
      heightCm: 180,
      weightKg: 82,
      fitnessGoal: "build_muscle",
      experienceLevel: "intermediate",
      activityLevel: "moderately_active",
      timezone: "America/New_York",
    },
    training: {
      activeProgram: {
        name: "4-Day Hypertrophy",
        status: "active",
        currentPosition: { week: 2, day: 3, description: "Week 2, Day 3" },
      },
      recentWorkouts: [
        {
          id: "w1",
          name: "Upper Body Power",
          date: "2026-11-05",
          totalVolume: 8500,
          exerciseCount: 4,
          exercises: [
            {
              exerciseName: "Barbell Bench Press",
              completedSetsCount: 3,
              topSet: { weight: 90, reps: 8 },
              totalVolume: 2160,
            },
          ],
        },
      ],
      topPersonalRecords: [
        {
          exerciseName: "Barbell Bench Press",
          heaviestWeight: 95,
          bestReps: 10,
          bestSessionVolume: 2500,
          weightImprovementPercent: 12.5,
        },
      ],
      readiness: {
        overallScore: 82,
        status: "ready",
        freshMuscles: ["chest", "triceps"],
        fatiguedMuscles: ["quadriceps"],
      },
    },
    nutrition: {
      targets: {
        calories: 2750,
        protein: 165,
        calculationMethod: "Mifflin-St Jeor",
      },
      recentSummaries: [
        {
          date: "2026-11-06",
          calories: 2700,
          protein: 168,
          carbs: 310,
          fat: 70,
          entryCount: 4,
          status: "target_reached",
        },
      ],
    },
  };

  beforeAll(async () => {
    const mongoUri = "mongodb://127.0.0.1:27017/bodyforge_test_generate";
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    await Conversation.deleteMany({});
    await Message.deleteMany({});
  });

  afterAll(async () => {
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();

    (fitnessContextService.assembleFitnessContext as jest.Mock).mockResolvedValue(mockFitnessContext);
    (fitnessContextService.formatContextForPrompt as jest.Mock).mockReturnValue(
      "### ATHLETE PROFILE\n- Goal: build_muscle\n- Age: 28\n- Weight: 82 kg\n### RECENT WORKOUTS\n- Barbell Bench Press: Top set 90kg x 8 reps"
    );
  });

  afterEach(async () => {
    await Conversation.deleteMany({});
    await Message.deleteMany({});
  });

  describe("Authentication, Ownership & Validation", () => {
    it("should return 401 when Authorization header is missing", async () => {
      const dummyId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/api/conversations/${dummyId}/generate`)
        .send({ message: "Hello coach" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 when user attempts to generate in another user's conversation", async () => {
      const convA = await Conversation.create({
        userId: new mongoose.Types.ObjectId(userIdA),
        title: "User A Private Chat",
        lastMessageAt: new Date(),
      });

      const res = await request(app)
        .post(`/api/conversations/${convA._id.toString()}/generate`)
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ message: "Trying to hijack User A's session" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Conversation not found");

      // Verify no message was persisted
      const messages = await Message.find({ conversationId: convA._id });
      expect(messages).toHaveLength(0);
    });

    it("should return 400 when message is empty or whitespace", async () => {
      const convA = await Conversation.create({
        userId: new mongoose.Types.ObjectId(userIdA),
        title: "User A Chat",
        lastMessageAt: new Date(),
      });

      const res = await request(app)
        .post(`/api/conversations/${convA._id.toString()}/generate`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ message: "    " });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 when message exceeds 4000 characters", async () => {
      const convA = await Conversation.create({
        userId: new mongoose.Types.ObjectId(userIdA),
        title: "User A Chat",
        lastMessageAt: new Date(),
      });

      const res = await request(app)
        .post(`/api/conversations/${convA._id.toString()}/generate`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ message: "x".repeat(4001) });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Non-Streaming AI Generation Flow", () => {
    it("should persist user message, invoke Gemini with fitness context, and persist assistant response", async () => {
      const conv = await Conversation.create({
        userId: new mongoose.Types.ObjectId(userIdA),
        title: "Bench Press Stall",
        lastMessageAt: new Date(),
      });
      const convId = conv._id.toString();

      (AIProvider.generateConversationalCoaching as jest.Mock).mockResolvedValue({
        text: "Based on your recent workout on 2026-11-05, you hit 90kg for 8 reps, which is close to your 95kg PR. Your chest muscles are currently recovered (readiness 82/100). Here is your progression plan...",
        finishReason: "STOP",
        tokenCount: 185,
      });

      const res = await request(app)
        .post(`/api/conversations/${convId}/generate`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ message: "Why has my bench press progression stalled?" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userMessage).toBeDefined();
      expect(res.body.data.userMessage.role).toBe("user");
      expect(res.body.data.userMessage.content).toBe("Why has my bench press progression stalled?");

      expect(res.body.data.assistantMessage).toBeDefined();
      expect(res.body.data.assistantMessage.role).toBe("assistant");
      expect(res.body.data.assistantMessage.content).toContain("Based on your recent workout");

      // Verify AIProvider was called with history and system instruction
      expect(AIProvider.generateConversationalCoaching).toHaveBeenCalledTimes(1);
      const [calledUserId, calledHistory, calledSystemInstruction] =
        (AIProvider.generateConversationalCoaching as jest.Mock).mock.calls[0];

      expect(calledUserId).toBe(userIdA);
      expect(calledHistory).toHaveLength(1);
      expect(calledHistory[0].role).toBe("user");
      expect(calledHistory[0].parts[0].text).toBe("Why has my bench press progression stalled?");
      expect(calledSystemInstruction).toContain("You are BodyForge AI");
      expect(calledSystemInstruction).toContain("Barbell Bench Press: Top set 90kg x 8 reps");

      // Verify MongoDB persistence
      const messagesInDb = await Message.find({ conversationId: convId }).sort({ createdAt: 1 });
      expect(messagesInDb).toHaveLength(2);
      expect(messagesInDb[0].role).toBe("user");
      expect(messagesInDb[1].role).toBe("assistant");
      expect(messagesInDb[1].content).toContain("Based on your recent workout");
    });

    it("should include previous messages in multi-turn conversation context", async () => {
      const conv = await Conversation.create({
        userId: new mongoose.Types.ObjectId(userIdA),
        title: "Multi-turn Chat",
        lastMessageAt: new Date(),
      });
      const convId = conv._id.toString();

      // Seed previous turn
      await Message.create([
        {
          conversationId: conv._id,
          userId: new mongoose.Types.ObjectId(userIdA),
          role: "user",
          content: "What should I eat before morning workouts?",
          createdAt: new Date(Date.now() - 60000),
        },
        {
          conversationId: conv._id,
          userId: new mongoose.Types.ObjectId(userIdA),
          role: "assistant",
          content: "A light snack of 30-40g fast carbs with minimal fat is ideal 45 minutes prior.",
          createdAt: new Date(Date.now() - 30000),
        },
      ]);

      (AIProvider.generateConversationalCoaching as jest.Mock).mockResolvedValue({
        text: "Bananas or rice cakes with a smear of honey are excellent choices.",
        finishReason: "STOP",
        tokenCount: 65,
      });

      const res = await request(app)
        .post(`/api/conversations/${convId}/generate`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ message: "Can you give me 2 specific examples?" });

      expect(res.status).toBe(200);

      // Verify history passed to AIProvider contains all 3 turns in order
      const calledHistory = (AIProvider.generateConversationalCoaching as jest.Mock).mock.calls[0][1];
      expect(calledHistory).toHaveLength(3);
      expect(calledHistory[0].role).toBe("user");
      expect(calledHistory[0].parts[0].text).toBe("What should I eat before morning workouts?");
      expect(calledHistory[1].role).toBe("model");
      expect(calledHistory[1].parts[0].text).toContain("A light snack of 30-40g fast carbs");
      expect(calledHistory[2].role).toBe("user");
      expect(calledHistory[2].parts[0].text).toBe("Can you give me 2 specific examples?");
    });
  });

  describe("Server-Sent Events (SSE) Streaming Flow", () => {
    it("should stream tokens via SSE and persist assistant message on completion", async () => {
      const conv = await Conversation.create({
        userId: new mongoose.Types.ObjectId(userIdA),
        title: "Streaming Chat",
        lastMessageAt: new Date(),
      });
      const convId = conv._id.toString();

      (AIProvider.streamConversationalCoaching as jest.Mock).mockImplementation(
        async (_userId, _history, _sysPrompt, onChunk) => {
          await onChunk("First chunk. ");
          await onChunk("Second chunk.");
          return {
            text: "First chunk. Second chunk.",
            finishReason: "STOP",
          };
        }
      );

      const res = await request(app)
        .post(`/api/conversations/${convId}/generate`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ message: "Give me streaming coaching advice", stream: true });

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("text/event-stream");
      expect(res.text).toContain("event: start");
      expect(res.text).toContain("event: chunk");
      expect(res.text).toContain("First chunk.");
      expect(res.text).toContain("Second chunk.");
      expect(res.text).toContain("event: complete");

      // Verify assistant message persisted in DB after stream completion
      const messages = await Message.find({ conversationId: convId, role: "assistant" });
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe("First chunk. Second chunk.");
    });
  });

  describe("Failure Handling & Non-Persistence Guarantees", () => {
    it("should handle Gemini 429 quota exhaustion without persisting an assistant message", async () => {
      const conv = await Conversation.create({
        userId: new mongoose.Types.ObjectId(userIdA),
        title: "Quota Test",
        lastMessageAt: new Date(),
      });
      const convId = conv._id.toString();

      const quotaError = new Error("Resource has been exhausted (e.g. check quota): generate_content_free_tier_requests");
      (AIProvider.generateConversationalCoaching as jest.Mock).mockRejectedValue(quotaError);

      const res = await request(app)
        .post(`/api/conversations/${convId}/generate`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ message: "Will this trigger quota error?" });

      expect(res.status).toBe(429);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("quota temporarily exhausted");

      // CRITICAL GUARANTEE: User message is kept, but NO fabricated assistant message exists
      const assistantMsgs = await Message.find({ conversationId: convId, role: "assistant" });
      expect(assistantMsgs).toHaveLength(0);

      const userMsgs = await Message.find({ conversationId: convId, role: "user" });
      expect(userMsgs).toHaveLength(1);
    });

    it("should handle Gemini 503 service unavailable without persisting an assistant message", async () => {
      const conv = await Conversation.create({
        userId: new mongoose.Types.ObjectId(userIdA),
        title: "503 Test",
        lastMessageAt: new Date(),
      });
      const convId = conv._id.toString();

      const serverError = new Error("503 Service Unavailable: The model is overloaded");
      (AIProvider.generateConversationalCoaching as jest.Mock).mockRejectedValue(serverError);

      const res = await request(app)
        .post(`/api/conversations/${convId}/generate`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ message: "Test server unavailable" });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("temporarily unavailable");

      const assistantMsgs = await Message.find({ conversationId: convId, role: "assistant" });
      expect(assistantMsgs).toHaveLength(0);
    });

    it("should handle empty model response without persisting an assistant message", async () => {
      const conv = await Conversation.create({
        userId: new mongoose.Types.ObjectId(userIdA),
        title: "Empty Output Test",
        lastMessageAt: new Date(),
      });
      const convId = conv._id.toString();

      (AIProvider.generateConversationalCoaching as jest.Mock).mockRejectedValue(
        new Error("AI returned an empty response.")
      );

      const res = await request(app)
        .post(`/api/conversations/${convId}/generate`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ message: "Test empty response" });

      expect(res.status).toBe(502);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("empty response");

      const assistantMsgs = await Message.find({ conversationId: convId, role: "assistant" });
      expect(assistantMsgs).toHaveLength(0);
    });

    it("should reject concurrent generation requests on the same conversation with 409", async () => {
      const conv = await Conversation.create({
        userId: new mongoose.Types.ObjectId(userIdA),
        title: "Single Flight Test",
        lastMessageAt: new Date(),
      });
      const convId = conv._id.toString();

      // Slow down first generation
      (AIProvider.generateConversationalCoaching as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ text: "Slow answer", finishReason: "STOP" }), 200))
      );

      // Launch first request
      const req1Promise = request(app)
        .post(`/api/conversations/${convId}/generate`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ message: "First slow prompt" });

      // Immediate concurrent second request on same conversation
      const req2Promise = request(app)
        .post(`/api/conversations/${convId}/generate`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ message: "Duplicate rapid prompt" });

      const [res1, res2] = await Promise.all([req1Promise, req2Promise]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(409);
      expect(res2.body.success).toBe(false);
      expect(res2.body.message).toContain("response is currently being generated");
    });

    it("should bound conversation history to the most recent window", async () => {
      const conv = await Conversation.create({
        userId: new mongoose.Types.ObjectId(userIdA),
        title: "Long Conversation",
        lastMessageAt: new Date(),
      });
      const convId = conv._id.toString();

      // Seed 20 historical messages (10 user, 10 assistant)
      const historicalMessages = [];
      for (let i = 1; i <= 20; i++) {
        historicalMessages.push({
          conversationId: conv._id,
          userId: new mongoose.Types.ObjectId(userIdA),
          role: i % 2 === 1 ? "user" : "assistant",
          content: `Historical message #${i}`,
          createdAt: new Date(1000000 + i * 1000),
        });
      }
      await Message.insertMany(historicalMessages);

      (AIProvider.generateConversationalCoaching as jest.Mock).mockResolvedValue({
        text: "Response to message 21",
        finishReason: "STOP",
      });

      const res = await request(app)
        .post(`/api/conversations/${convId}/generate`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ message: "Message #21 from user" });

      expect(res.status).toBe(200);

      // Verify calledHistory is bounded (12 turns max + current message)
      const calledHistory = (AIProvider.generateConversationalCoaching as jest.Mock).mock.calls[0][1];
      expect(calledHistory.length).toBeLessThanOrEqual(13);
      // Ensure earliest messages (#1 to #8) were windowed out
      expect(calledHistory[0].parts[0].text).not.toBe("Historical message #1");
    });
  });

  describe("Fitness Knowledge RAG Grounding & Attribution (M3.3)", () => {
    it("should retrieve relevant knowledge sources and inject them into copilot prompt for general fitness inquiries", async () => {
      const conv = await Conversation.create({
        userId: new mongoose.Types.ObjectId(userIdA),
        title: "RAG Technical Query",
        lastMessageAt: new Date(),
      });
      const convId = conv._id.toString();

      const mockRetrievedChunk = {
        id: "chunk-123",
        documentId: "doc-456",
        content: "Optimal barbell bench press bar path curves backward towards the rack.",
        category: "exercise" as const,
        similarity: 0.892,
        source: {
          title: "Bench Press Biomechanics",
          source: "Greg Nuckols, SBS",
          sourceUrl: "https://strongerbyscience.com/bench-press-bar-path",
        },
      };

      jest.spyOn(knowledgeRetrievalService, "retrieveKnowledge").mockResolvedValue({
        query: "What is the proper bar path on barbell bench press?",
        isGrounded: true,
        chunks: [mockRetrievedChunk],
        latencyMs: 15,
      });

      (AIProvider.generateConversationalCoaching as jest.Mock).mockResolvedValue({
        text: "According to Bench Press Biomechanics, your bar path should curve back toward your shoulders.",
        finishReason: "STOP",
        tokenCount: 45,
      });

      const res = await request(app)
        .post(`/api/conversations/${convId}/generate`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ message: "What is the proper bar path on barbell bench press?" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sources).toHaveLength(1);
      expect(res.body.data.sources[0].title).toBe("Bench Press Biomechanics");
      expect(res.body.data.sources[0].category).toBe("exercise");
      expect(res.body.data.sources[0].similarity).toBe(0.892);
      expect(res.body.data.metadata.isGrounded).toBe(true);

      // Verify prompt injection
      const calledPrompt = (AIProvider.generateConversationalCoaching as jest.Mock).mock.calls[0][2];
      expect(calledPrompt).toContain("=== RETRIEVED KNOWLEDGE BASE EVIDENCE ===");
      expect(calledPrompt).toContain("Bench Press Biomechanics");
      expect(calledPrompt).toContain("Optimal barbell bench press bar path curves backward");
    });

    it("should bypass RAG retrieval for personal history queries", async () => {
      const conv = await Conversation.create({
        userId: new mongoose.Types.ObjectId(userIdA),
        title: "Personal Query",
        lastMessageAt: new Date(),
      });
      const convId = conv._id.toString();

      const retrieveSpy = jest.spyOn(knowledgeRetrievalService, "retrieveKnowledge");

      (AIProvider.generateConversationalCoaching as jest.Mock).mockResolvedValue({
        text: "In your last session on November 5, you hit 90kg for 8 reps.",
        finishReason: "STOP",
      });

      const res = await request(app)
        .post(`/api/conversations/${convId}/generate`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ message: "What was my last bench press workout?" });

      expect(res.status).toBe(200);
      expect(retrieveSpy).not.toHaveBeenCalled();
      expect(res.body.data.sources).toEqual([]);
      expect(res.body.data.metadata.isGrounded).toBe(false);
    });

    it("should gracefully fall back to ungrounded generation if RAG retrieval throws or times out", async () => {
      const conv = await Conversation.create({
        userId: new mongoose.Types.ObjectId(userIdA),
        title: "RAG Error Fallback",
        lastMessageAt: new Date(),
      });
      const convId = conv._id.toString();

      jest.spyOn(knowledgeRetrievalService, "retrieveKnowledge").mockRejectedValue(
        new Error("Atlas Vector Search connection lost")
      );

      (AIProvider.generateConversationalCoaching as jest.Mock).mockResolvedValue({
        text: "Aim for 10-20 hard sets per muscle group weekly.",
        finishReason: "STOP",
      });

      const res = await request(app)
        .post(`/api/conversations/${convId}/generate`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ message: "How many sets per week are recommended for hypertrophy?" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sources).toEqual([]);
      expect(res.body.data.metadata.isGrounded).toBe(false);
      expect(res.body.data.assistantMessage.content).toContain("10-20 hard sets");
    });

    it("should include sources in SSE complete event for streaming requests", async () => {
      const conv = await Conversation.create({
        userId: new mongoose.Types.ObjectId(userIdA),
        title: "Streaming RAG",
        lastMessageAt: new Date(),
      });
      const convId = conv._id.toString();

      jest.spyOn(knowledgeRetrievalService, "retrieveKnowledge").mockResolvedValue({
        query: "What is the proper bar path on barbell bench press?",
        isGrounded: true,
        chunks: [
          {
            id: "c-1",
            documentId: "d-1",
            content: "Bench press bar path details...",
            category: "exercise" as const,
            similarity: 0.95,
            source: {
              title: "Bar Path Studies",
              source: "Sports Biomechanics",
            },
          },
        ],
        latencyMs: 12,
      });

      (AIProvider.streamConversationalCoaching as jest.Mock).mockImplementation(
        async (_userId, _history, _sysPrompt, onChunk) => {
          await onChunk("Streamed bar path advice.");
          return {
            text: "Streamed bar path advice.",
            finishReason: "STOP",
          };
        }
      );

      const res = await request(app)
        .post(`/api/conversations/${convId}/generate`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ message: "What is the proper bar path on barbell bench press?", stream: true });

      expect(res.status).toBe(200);
      expect(res.text).toContain("event: complete");
      expect(res.text).toContain('"sources":[{"title":"Bar Path Studies"');
    });
  });
});
