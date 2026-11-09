import Message, { IMessage } from "../models/Message";
import { Types } from "mongoose";

class MessageRepository {
  async create(data: Partial<IMessage>): Promise<IMessage> {
    const message = new Message(data);
    return await message.save();
  }

  async findMessagesByConversation(
    conversationId: string,
    skip: number = 0,
    limit: number = 50,
    order: "asc" | "desc" = "asc",
    excludeSystem: boolean = true
  ): Promise<IMessage[]> {
    if (!Types.ObjectId.isValid(conversationId)) return [];

    const query: { conversationId: string; role?: { $ne: string } } = { conversationId };
    if (excludeSystem) {
      query.role = { $ne: "system" };
    }

    const sortOrder = order === "desc" ? -1 : 1;

    return await Message.find(query)
      .sort({ createdAt: sortOrder })
      .skip(skip)
      .limit(limit);
  }

  async countMessages(
    conversationId: string,
    excludeSystem: boolean = true
  ): Promise<number> {
    if (!Types.ObjectId.isValid(conversationId)) return 0;

    const query: { conversationId: string; role?: { $ne: string } } = { conversationId };
    if (excludeSystem) {
      query.role = { $ne: "system" };
    }

    return await Message.countDocuments(query);
  }

  async deleteByConversationId(conversationId: string): Promise<number> {
    if (!Types.ObjectId.isValid(conversationId)) return 0;
    const result = await Message.deleteMany({ conversationId });
    return result.deletedCount;
  }

  async findRecent(conversationId: string, limit: number = 20): Promise<IMessage[]> {
    if (!Types.ObjectId.isValid(conversationId)) return [];
    return await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}

export const messageRepository = new MessageRepository();
export default messageRepository;
