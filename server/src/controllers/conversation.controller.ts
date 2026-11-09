import { Request, Response, NextFunction } from "express";
import conversationService from "../services/conversation.service";

class ConversationController {
  public createConversation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.authenticatedUserId!;
      const result = await conversationService.createConversation(userId, req.body);
      res.status(201).json({
        success: true,
        data: {
          conversation: result.conversation,
          message: result.initialMessage
            ? {
                id: result.initialMessage._id.toString(),
                conversationId: result.initialMessage.conversationId.toString(),
                role: result.initialMessage.role,
                content: result.initialMessage.content,
                createdAt: result.initialMessage.createdAt,
              }
            : null,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public getConversations = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.authenticatedUserId!;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await conversationService.getUserConversations(userId, page, limit);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getConversation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.authenticatedUserId!;
      const conversationId = req.params.id as string;

      const conversation = await conversationService.getConversationById(userId, conversationId);
      res.status(200).json({
        success: true,
        data: { conversation },
      });
    } catch (error) {
      next(error);
    }
  };

  public getMessages = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.authenticatedUserId!;
      const conversationId = req.params.id as string;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const order = (req.query.order as "asc" | "desc") || "asc";

      const result = await conversationService.getMessages(
        userId,
        conversationId,
        page,
        limit,
        order
      );
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public addMessage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.authenticatedUserId!;
      const conversationId = req.params.id as string;
      const { content } = req.body;

      const message = await conversationService.addUserMessage(userId, conversationId, content);
      res.status(201).json({
        success: true,
        data: { message },
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteConversation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.authenticatedUserId!;
      const conversationId = req.params.id as string;

      await conversationService.deleteConversation(userId, conversationId);
      res.status(200).json({
        success: true,
        message: "Conversation deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  public generateResponse = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.authenticatedUserId!;
      const conversationId = req.params.id as string;
      const { message, stream } = req.body;

      const isStream = stream === true || req.headers.accept?.includes("text/event-stream");

      if (isStream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        if (typeof res.flushHeaders === "function") {
          res.flushHeaders();
        }

        // Send initial start event
        res.write(`event: start\ndata: ${JSON.stringify({ status: "started" })}\n\n`);

        const abortController = new AbortController();
        req.on("close", () => {
          abortController.abort();
        });

        try {
          const result = await conversationService.generateResponse(
            userId,
            conversationId,
            message,
            {
              stream: true,
              abortSignal: abortController.signal,
              onChunk: (chunk: string) => {
                res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk })}\n\n`);
              },
            }
          );

          res.write(`event: complete\ndata: ${JSON.stringify({ success: true, data: result })}\n\n`);
          res.end();
          return;
        } catch (streamErr: any) {
          if (!res.headersSent) {
            next(streamErr);
            return;
          }
          res.write(
            `event: error\ndata: ${JSON.stringify({
              success: false,
              message: streamErr?.message || "Generation error",
            })}\n\n`
          );
          res.end();
          return;
        }
      }

      // Default non-streaming JSON mode
      const result = await conversationService.generateResponse(userId, conversationId, message);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const conversationController = new ConversationController();
export default conversationController;
