import express from "express";

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "Welcome to BodyForge AI API 🚀",
  });
});

export default app;