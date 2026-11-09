import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import app from "../app";
import { Conversation } from "../models/Conversation";
import { Message } from "../models/Message";
import { env } from "../config/env";

describe("Conversation API Integration Tests (M3.1)", () => {
  const userIdA = new mongoose.Types.ObjectId().toString();
  const userIdB = new mongoose.Types.ObjectId().toString();

  const tokenA = jwt.sign({ id: userIdA, email: "userA@test.com" }, env.jwtSecret, { expiresIn: "1h" });
  const tokenB = jwt.sign({ id: userIdB, email: "userB@test.com" }, env.jwtSecret, { expiresIn: "1h" });

  beforeAll(async () => {
    const mongoUri = "mongodb://127.0.0.1:27017/bodyforge_test_conversations";
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

  afterEach(async () => {
    await Conversation.deleteMany({});
    await Message.deleteMany({});
  });

  describe("Authentication & Authorization (401s)", () => {
    it("should return 401 when Authorization header is missing on POST /api/conversations", async () => {
      const res = await request(app).post("/api/conversations").send({});
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should return 401 when Authorization header is missing on GET /api/conversations", async () => {
      const res = await request(app).get("/api/conversations");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should return 401 on GET /api/conversations/:id without token", async () => {
      const dummyId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`/api/conversations/${dummyId}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should return 401 on GET /api/conversations/:id/messages without token", async () => {
      const dummyId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`/api/conversations/${dummyId}/messages`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should return 401 on POST /api/conversations/:id/messages without token", async () => {
      const dummyId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).post(`/api/conversations/${dummyId}/messages`).send({ content: "test" });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should return 401 on DELETE /api/conversations/:id without token", async () => {
      const dummyId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).delete(`/api/conversations/${dummyId}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Validation & Bad Requests (400s)", () => {
    it("should return 400 for invalid ObjectId format in params", async () => {
      const res = await request(app)
        .get("/api/conversations/not-a-valid-id")
        .set("Authorization", `Bearer ${tokenA}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Invalid conversation ID");
    });

    it("should return 400 when creating conversation with empty initial message", async () => {
      const res = await request(app)
        .post("/api/conversations")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ initialMessage: "   " });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 when creating conversation with initial message exceeding 4000 chars", async () => {
      const longMessage = "a".repeat(4001);
      const res = await request(app)
        .post("/api/conversations")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ initialMessage: longMessage });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 when posting a message with empty content", async () => {
      const conv = await Conversation.create({
        userId: new mongoose.Types.ObjectId(userIdA),
        title: "Test",
        lastMessageAt: new Date(),
      });

      const res = await request(app)
        .post(`/api/conversations/${conv._id.toString()}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "   " });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 when posting a message exceeding 4000 chars", async () => {
      const conv = await Conversation.create({
        userId: new mongoose.Types.ObjectId(userIdA),
        title: "Test",
        lastMessageAt: new Date(),
      });

      const res = await request(app)
        .post(`/api/conversations/${conv._id.toString()}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "x".repeat(4001) });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 when pagination parameters are invalid", async () => {
      const res = await request(app)
        .get("/api/conversations?limit=-5")
        .set("Authorization", `Bearer ${tokenA}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Conversation Creation & Lifecycle", () => {
    it("should create an empty conversation with default title 'New Conversation'", async () => {
      const res = await request(app)
        .post("/api/conversations")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.conversation).toBeDefined();
      expect(res.body.data.conversation.title).toBe("New Conversation");
      expect(res.body.data.conversation.userId).toBe(userIdA);
      expect(res.body.data.message).toBeNull();
    });

    it("should create conversation with custom title if provided", async () => {
      const res = await request(app)
        .post("/api/conversations")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ title: "My Custom Routine Plan" });

      expect(res.status).toBe(201);
      expect(res.body.data.conversation.title).toBe("My Custom Routine Plan");
    });

    it("should create conversation with initial message, auto-derive title, and persist user message", async () => {
      const res = await request(app)
        .post("/api/conversations")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ initialMessage: "How can I improve my squat form and depth?" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.conversation).toBeDefined();
      expect(res.body.data.conversation.title).toBe("How can I improve my squat form and depth?");
      expect(res.body.data.message).toBeDefined();
      expect(res.body.data.message.role).toBe("user");
      expect(res.body.data.message.content).toBe("How can I improve my squat form and depth?");

      // Verify in DB
      const messagesInDb = await Message.find({ conversationId: res.body.data.conversation._id });
      expect(messagesInDb).toHaveLength(1);
      expect(messagesInDb[0].role).toBe("user");
      expect(messagesInDb[0].content).toBe("How can I improve my squat form and depth?");
    });

    it("should fetch a specific conversation by ID", async () => {
      const createRes = await request(app)
        .post("/api/conversations")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ title: "Specific Conversation" });

      const convId = createRes.body.data.conversation._id;

      const getRes = await request(app)
        .get(`/api/conversations/${convId}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);
      expect(getRes.body.data.conversation._id).toBe(convId);
      expect(getRes.body.data.conversation.title).toBe("Specific Conversation");
    });

    it("should list conversations with pagination ordered by lastMessageAt descending", async () => {
      const now = Date.now();
      await Conversation.create([
        { userId: new mongoose.Types.ObjectId(userIdA), title: "First Conv", lastMessageAt: new Date(now - 3000) },
        { userId: new mongoose.Types.ObjectId(userIdA), title: "Second Conv", lastMessageAt: new Date(now - 1000) },
        { userId: new mongoose.Types.ObjectId(userIdA), title: "Third Conv", lastMessageAt: new Date(now - 2000) },
      ]);

      const res = await request(app)
        .get("/api/conversations?page=1&limit=2")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.conversations).toHaveLength(2);
      expect(res.body.data.conversations[0].title).toBe("Second Conv"); // Most recent
      expect(res.body.data.conversations[1].title).toBe("Third Conv");
      expect(res.body.data.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
    });
  });

  describe("Message Operations & Impersonation Prevention", () => {
    it("should post a user message, enforce role: 'user', and update lastMessageAt", async () => {
      const initialDate = new Date(Date.now() - 60000);
      const conv = await Conversation.create({
        userId: new mongoose.Types.ObjectId(userIdA),
        title: "Test Conv",
        lastMessageAt: initialDate,
      });

      // Attempt role impersonation in payload
      const res = await request(app)
        .post(`/api/conversations/${conv._id.toString()}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          content: "What is the optimal rest time between deadlift sets?",
          role: "assistant", // Trying to spoof assistant role
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message.role).toBe("user"); // Must be forced to user
      expect(res.body.data.message.content).toBe("What is the optimal rest time between deadlift sets?");

      // Check DB directly
      const msgInDb = await Message.findById(res.body.data.message.id);
      expect(msgInDb?.role).toBe("user");

      // Verify conversation lastMessageAt was updated
      const updatedConv = await Conversation.findById(conv._id);
      expect(updatedConv?.lastMessageAt.getTime()).toBeGreaterThan(initialDate.getTime());
    });

    it("should update conversation title from first user message if title was 'New Conversation'", async () => {
      const conv = await Conversation.create({
        userId: new mongoose.Types.ObjectId(userIdA),
        title: "New Conversation",
        lastMessageAt: new Date(),
      });

      const res = await request(app)
        .post(`/api/conversations/${conv._id.toString()}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "Can you help me fix my bench press technique?" });

      expect(res.status).toBe(201);

      const updatedConv = await Conversation.findById(conv._id);
      expect(updatedConv?.title).toBe("Can you help me fix my bench press technique?");
    });

    it("should list messages in chronological order and exclude system messages", async () => {
      const conv = await Conversation.create({
        userId: new mongoose.Types.ObjectId(userIdA),
        title: "Chat with System Prompt",
        lastMessageAt: new Date(),
      });

      const convId = conv._id;

      // Seed messages: system prompt, user msg 1, assistant msg 1, user msg 2
      await Message.create([
        {
          conversationId: convId,
          userId: new mongoose.Types.ObjectId(userIdA),
          role: "system",
          content: "INTERNAL SYSTEM PROMPT: You are BodyForge AI Coach. Private guidelines...",
          createdAt: new Date(1000),
        },
        {
          conversationId: convId,
          userId: new mongoose.Types.ObjectId(userIdA),
          role: "user",
          content: "Hello coach!",
          createdAt: new Date(2000),
        },
        {
          conversationId: convId,
          userId: new mongoose.Types.ObjectId(userIdA),
          role: "assistant",
          content: "Hello! How can I help with your fitness goals today?",
          createdAt: new Date(3000),
        },
        {
          conversationId: convId,
          userId: new mongoose.Types.ObjectId(userIdA),
          role: "user",
          content: "What workout should I do?",
          createdAt: new Date(4000),
        },
      ]);

      const res = await request(app)
        .get(`/api/conversations/${convId.toString()}/messages`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.messages).toHaveLength(3); // System message filtered out!

      // Verify no system message is returned
      const roles = res.body.data.messages.map((m: { role: string }) => m.role);
      expect(roles).toEqual(["user", "assistant", "user"]);
      expect(roles).not.toContain("system");

      // Verify ordering
      expect(res.body.data.messages[0].content).toBe("Hello coach!");
      expect(res.body.data.messages[1].content).toBe("Hello! How can I help with your fitness goals today?");
      expect(res.body.data.messages[2].content).toBe("What workout should I do?");
    });
  });

  describe("Cross-User Isolation & Ownership Verification", () => {
    let convUserAId: string;

    beforeEach(async () => {
      const conv = await Conversation.create({
        userId: new mongoose.Types.ObjectId(userIdA),
        title: "User A Confidential Fitness Plan",
        lastMessageAt: new Date(),
      });
      convUserAId = conv._id.toString();

      await Message.create({
        conversationId: conv._id,
        userId: new mongoose.Types.ObjectId(userIdA),
        role: "user",
        content: "Private medical notes: previous knee injury",
      });
    });

    it("should prevent User B from reading User A's conversation (returns 404)", async () => {
      const res = await request(app)
        .get(`/api/conversations/${convUserAId}`)
        .set("Authorization", `Bearer ${tokenB}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Conversation not found");
    });

    it("should prevent User B from reading User A's messages (returns 404)", async () => {
      const res = await request(app)
        .get(`/api/conversations/${convUserAId}/messages`)
        .set("Authorization", `Bearer ${tokenB}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Conversation not found");
    });

    it("should prevent User B from posting messages to User A's conversation (returns 404)", async () => {
      const res = await request(app)
        .post(`/api/conversations/${convUserAId}/messages`)
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ content: "Malicious injection attempt" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);

      // Verify no message was added
      const msgs = await Message.find({ conversationId: convUserAId });
      expect(msgs).toHaveLength(1);
      expect(msgs[0].content).toBe("Private medical notes: previous knee injury");
    });

    it("should prevent User B from deleting User A's conversation (returns 404)", async () => {
      const res = await request(app)
        .delete(`/api/conversations/${convUserAId}`)
        .set("Authorization", `Bearer ${tokenB}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);

      // Verify conversation still exists
      const exists = await Conversation.findById(convUserAId);
      expect(exists).not.toBeNull();
    });

    it("should isolate conversation lists between users", async () => {
      // User B has no conversations
      const resB = await request(app)
        .get("/api/conversations")
        .set("Authorization", `Bearer ${tokenB}`);

      expect(resB.status).toBe(200);
      expect(resB.body.data.conversations).toHaveLength(0);
      expect(resB.body.data.pagination.total).toBe(0);

      // User A has 1 conversation
      const resA = await request(app)
        .get("/api/conversations")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(resA.status).toBe(200);
      expect(resA.body.data.conversations).toHaveLength(1);
      expect(resA.body.data.conversations[0]._id).toBe(convUserAId);
    });
  });

  describe("Cascade Deletion", () => {
    it("should delete the conversation and cascade delete all its messages", async () => {
      // Create conversation
      const conv = await Conversation.create({
        userId: new mongoose.Types.ObjectId(userIdA),
        title: "Conversation to Delete",
        lastMessageAt: new Date(),
      });
      const convId = conv._id.toString();

      // Create 3 messages
      await Message.create([
        { conversationId: conv._id, userId: new mongoose.Types.ObjectId(userIdA), role: "user", content: "Msg 1" },
        { conversationId: conv._id, userId: new mongoose.Types.ObjectId(userIdA), role: "assistant", content: "Msg 2" },
        { conversationId: conv._id, userId: new mongoose.Types.ObjectId(userIdA), role: "user", content: "Msg 3" },
      ]);

      // Confirm messages exist
      const beforeMsgs = await Message.find({ conversationId: convId });
      expect(beforeMsgs).toHaveLength(3);

      // Delete via API
      const res = await request(app)
        .delete(`/api/conversations/${convId}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Conversation deleted successfully");

      // Verify conversation is gone from DB
      const afterConv = await Conversation.findById(convId);
      expect(afterConv).toBeNull();

      // Verify messages are deleted from DB
      const afterMsgs = await Message.find({ conversationId: convId });
      expect(afterMsgs).toHaveLength(0);

      // Subsequent fetch returns 404
      const getRes = await request(app)
        .get(`/api/conversations/${convId}`)
        .set("Authorization", `Bearer ${tokenA}`);
      expect(getRes.status).toBe(404);
    });
  });
});
