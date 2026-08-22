import Food, { IFood } from "../models/Food";

class FoodRepository {
  async searchFoods(query: string, limit: number = 20): Promise<any[]> {
    if (!query) return [];
    
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedQuery, "i");
    
    return await Food.find({
      $or: [
        { name: { $regex: regex } },
        { aliases: { $in: [regex] } }
      ]
    })
    .limit(limit)
    .lean();
  }

  async getFoodByName(name: string): Promise<any | null> {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`^${escapedName}$`, "i");
    return await Food.findOne({
      $or: [
        { name: { $regex: regex } },
        { aliases: { $in: [regex] } }
      ]
    }).lean();
  }
  
  async createOrUpdateFood(foodData: Partial<IFood>): Promise<IFood> {
    return await Food.findOneAndUpdate(
      { name: foodData.name },
      { $set: foodData },
      { new: true, upsert: true }
    );
  }

  async count(): Promise<number> {
    return await Food.countDocuments();
  }
}

export const foodRepository = new FoodRepository();
