import Conversation, { IConversation } from "../models/Conversation";
import { FilterQuery, Types } from "mongoose";

class ConversationRepository {
  async create(data: Partial<IConversation>): Promise<IConversation> {
    const conversation = new Conversation(data);
    return await conversation.save();
  }

  async findById(id: string): Promise<IConversation | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return await Conversation.findById(id);
  }

  async findByIdAndUser(id: string, userId: string): Promise<IConversation | null> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) return null;
    return await Conversation.findOne({ _id: id, userId });
  }

  async findUserConversations(
    userId: string,
    skip: number = 0,
    limit: number = 20
  ): Promise<IConversation[]> {
    return await Conversation.find({ userId })
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  async countUserConversations(userId: string): Promise<number> {
    return await Conversation.countDocuments({ userId });
  }

  async updateLastMessageAt(
    id: string,
    timestamp: Date = new Date(),
    title?: string
  ): Promise<IConversation | null> {
    const update: { lastMessageAt: Date; title?: string } = { lastMessageAt: timestamp };
    if (title) update.title = title;
    return await Conversation.findByIdAndUpdate(id, update, { new: true });
  }

  async updateSummary(id: string, summary: string): Promise<IConversation | null> {
    return await Conversation.findByIdAndUpdate(id, { summary }, { new: true });
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await Conversation.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  async deleteByIdAndUser(id: string, userId: string): Promise<boolean> {
    const result = await Conversation.deleteOne({ _id: id, userId });
    return result.deletedCount > 0;
  }
}

export const conversationRepository = new ConversationRepository();
export default conversationRepository;
