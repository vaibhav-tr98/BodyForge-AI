import request from "supertest";
import express from "express";
import app from "../app";

describe("CORS Middleware", () => {
  it("allows production origin", async () => {
    const res = await request(app)
      .options("/health")
      .set("Origin", "https://body-forge-ai-eight.vercel.app");

    expect(res.headers["access-control-allow-origin"]).toBe("https://body-forge-ai-eight.vercel.app");
  });

  it("allows configured CLIENT_URL origin", async () => {
    const res = await request(app)
      .options("/health")
      .set("Origin", process.env.CLIENT_URL || "http://localhost:5173");

    expect(res.headers["access-control-allow-origin"]).toBe(process.env.CLIENT_URL || "http://localhost:5173");
  });

  it("allows legitimate BodyForge preview origin", async () => {
    const res = await request(app)
      .options("/health")
      .set("Origin", "https://body-forge-1234abc-vaibhav-tripathi-s-projects.vercel.app");

    expect(res.headers["access-control-allow-origin"]).toBe("https://body-forge-1234abc-vaibhav-tripathi-s-projects.vercel.app");
  });

  it("allows another legitimate BodyForge preview origin", async () => {
    const res = await request(app)
      .options("/health")
      .set("Origin", "https://body-forge-xyz789-vaibhav-tripathi-s-projects.vercel.app");

    expect(res.headers["access-control-allow-origin"]).toBe("https://body-forge-xyz789-vaibhav-tripathi-s-projects.vercel.app");
  });

  it("rejects unrelated Vercel application", async () => {
    const res = await request(app)
      .options("/health")
      .set("Origin", "https://random-project.vercel.app");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    // Verify it doesn't return a 500 error
    expect(res.status).not.toBe(500);
  });

  it("rejects completely unrelated website", async () => {
    const res = await request(app)
      .options("/health")
      .set("Origin", "https://example.com");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    expect(res.status).not.toBe(500);
  });

  it("allows local development origin", async () => {
    // Assuming NODE_ENV=test (which defaults to behaving like dev for localhost)
    const res = await request(app)
      .options("/health")
      .set("Origin", "http://localhost:5175");

    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5175");
  });

  it("allows request without Origin", async () => {
    const res = await request(app)
      .get("/health"); // No Origin header

    expect(res.status).toBe(200);
    // Usually no access-control-allow-origin is set if no Origin is sent, or it's allowed.
    expect(res.body.success).toBe(true);
  });

  it("ensures /health remains 200", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, status: "ok" });
  });

  it("ensures /ready remains 200 or 503 depending on DB (does not crash from CORS)", async () => {
    const res = await request(app).get("/ready");
    // Depending on DB connection state it could be 200 or 503.
    expect([200, 503]).toContain(res.status);
  });

  it("ensures /api/auth/login responds normally (e.g. 400 validation error) when called from an allowed origin", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Origin", "https://body-forge-ai-eight.vercel.app")
      .send({});

    // Should be a 400 Bad Request because of missing fields, not 500
    expect(res.status).toBe(400);
    expect(res.headers["access-control-allow-origin"]).toBe("https://body-forge-ai-eight.vercel.app");
  });

  it("ensures /api/auth/login does not crash (no 500) when called from an unallowed origin", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Origin", "https://malicious-site.com")
      .send({});

    // Should be a 400 Bad Request because of missing fields, but without CORS headers.
    // It should NOT be a 500 Internal Server Error.
    expect(res.status).toBe(400);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
