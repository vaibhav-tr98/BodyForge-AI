import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const conversationIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, "Invalid conversation ID"),
});

export const createConversationSchema = z.object({
  title: z
    .string()
    .trim()
    .max(100, "Title cannot exceed 100 characters")
    .optional(),
  message: z
    .string()
    .trim()
    .min(1, "Initial message cannot be empty")
    .max(4000, "Message cannot exceed 4000 characters")
    .optional(),
  initialMessage: z
    .string()
    .trim()
    .min(1, "Initial message cannot be empty")
    .max(4000, "Message cannot exceed 4000 characters")
    .optional(),
});

export const listConversationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1, "Page must be at least 1").default(1),
  limit: z.coerce.number().int().min(1, "Limit must be at least 1").max(100, "Limit cannot exceed 100").default(20),
});

export const listMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1, "Page must be at least 1").default(1),
  limit: z.coerce.number().int().min(1, "Limit must be at least 1").max(100, "Limit cannot exceed 100").default(50),
  order: z.enum(["asc", "desc"]).default("asc"),
});

export const addMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message content cannot be empty")
    .max(4000, "Message content cannot exceed 4000 characters"),
});

export const generateResponseSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message content cannot be empty")
    .max(4000, "Message content cannot exceed 4000 characters"),
  stream: z.boolean().optional().default(false),
});
