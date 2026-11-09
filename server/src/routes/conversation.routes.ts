import { Router } from "express";
import { conversationController } from "../controllers/conversation.controller";
import { authenticate } from "../middleware/auth.middleware";
import { apiMethodLimiter } from "../middleware/rateLimit.middleware";
import {
  validateBody,
  validateParams,
  validateQuery,
  validateRequest,
} from "../middleware/validation.middleware";
import {
  conversationIdParamSchema,
  createConversationSchema,
  listConversationsQuerySchema,
  listMessagesQuerySchema,
  addMessageSchema,
  generateResponseSchema,
} from "../validation/conversation.validation";

const router = Router();

// All conversation routes require authentication and method rate limiting
router.use(authenticate);
router.use(apiMethodLimiter);

router.post("/", validateBody(createConversationSchema), conversationController.createConversation);
router.get("/", validateQuery(listConversationsQuerySchema), conversationController.getConversations);
router.get("/:id", validateParams(conversationIdParamSchema), conversationController.getConversation);
router.get(
  "/:id/messages",
  validateRequest({ params: conversationIdParamSchema, query: listMessagesQuerySchema }),
  conversationController.getMessages
);
router.post(
  "/:id/messages",
  validateRequest({ params: conversationIdParamSchema, body: addMessageSchema }),
  conversationController.addMessage
);
router.post(
  "/:id/generate",
  validateRequest({ params: conversationIdParamSchema, body: generateResponseSchema }),
  conversationController.generateResponse
);
router.delete("/:id", validateParams(conversationIdParamSchema), conversationController.deleteConversation);

export default router;
