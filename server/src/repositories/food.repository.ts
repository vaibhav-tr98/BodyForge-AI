import Food, { IFood } from "../models/Food";

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scoreCandidate(food: any, query: string): number {
  const q = query.trim().toLowerCase();
  const qSingular = (q.endsWith('s') && !q.endsWith('ss') && !q.endsWith('us')) ? q.slice(0, -1) : q;
  const qPlural = q.endsWith('s') ? q : q + 's';
  const name = (food.name || "").toLowerCase();
  const aliases: string[] = (food.aliases || []).map((a: string) => a.toLowerCase());

  // 1. Exact match on name
  if (name === q || name === qSingular || name === qPlural) return 1000;

  // 2. Exact match on any alias
  if (aliases.some(a => a === q || a === qSingular || a === qPlural)) return 950;

  // 3. Name starts with query (e.g. "Bananas, raw" or "Cow Milk" or "Egg, whole...")
  if (name.startsWith(q + ',') || name.startsWith(qSingular + ',') || name.startsWith(qPlural + ',')) return 850;
  if (name.startsWith(q + ' ') || name.startsWith(qSingular + ' ') || name.startsWith(qPlural + ' ')) return 800;

  // 4. Whole-word match in alias
  const wordRegex = new RegExp(`\\b(${escapeRegex(qSingular)}|${escapeRegex(qPlural)})\\b`, 'i');
  if (aliases.some(a => wordRegex.test(a))) return 700;

  // 5. Multi-token match (e.g. "boiled egg" -> "hard-boiled" + "egg")
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    const allTokensMatch = tokens.every(tok => {
      const tokSingular = (tok.endsWith('s') && !tok.endsWith('ss')) ? tok.slice(0, -1) : tok;
      const tokRegex = new RegExp(`\\b${escapeRegex(tokSingular)}`, 'i');
      return tokRegex.test(name) || aliases.some(a => tokRegex.test(a));
    });
    if (allTokensMatch) {
      return 650;
    }
  }

  // 6. Whole-word match in name
  if (wordRegex.test(name)) return 600;

  // 7. Substring match in alias
  if (aliases.some(a => a.includes(q) || a.includes(qSingular))) return 400;

  // 8. Substring match in name
  if (name.includes(q) || name.includes(qSingular)) return 300;

  return 0;
}

class FoodRepository {
  async searchFoods(query: string, limit: number = 20): Promise<any[]> {
    if (!query || !query.trim()) return [];

    const q = query.trim().toLowerCase();
    const qSingular = (q.endsWith('s') && !q.endsWith('ss') && !q.endsWith('us')) ? q.slice(0, -1) : q;
    const qPlural = q.endsWith('s') ? q : q + 's';

    const escapedSingular = escapeRegex(qSingular);
    const escapedPlural = escapeRegex(qPlural);

    const wordRegex = new RegExp(`\\b(${escapedSingular}|${escapedPlural})\\b`, "i");
    const substringRegex = new RegExp(`(${escapedSingular}|${escapedPlural})`, "i");

    // Tier 1: Search whole-word matches in name or aliases
    let matches = await Food.find({
      $or: [
        { name: { $regex: wordRegex } },
        { aliases: { $in: [wordRegex] } }
      ]
    })
    .limit(limit * 3)
    .lean();

    // Tier 2: If multi-token query (e.g. "boiled egg", "chicken breast", "whey protein"), search token match
    const tokens = q.split(/\s+/).filter(Boolean);
    if (tokens.length > 1 && matches.length < limit * 2) {
      const tokenConditions = tokens.map(tok => {
        const tokSingular = (tok.endsWith('s') && !tok.endsWith('ss')) ? tok.slice(0, -1) : tok;
        const r = new RegExp(`\\b${escapeRegex(tokSingular)}`, "i");
        return {
          $or: [
            { name: { $regex: r } },
            { aliases: { $in: [r] } }
          ]
        };
      });

      const tokenMatches = await Food.find({
        $and: tokenConditions
      })
      .limit(limit * 2)
      .lean();

      for (const tm of tokenMatches) {
        if (!matches.some(m => m._id.toString() === tm._id.toString())) {
          matches.push(tm);
        }
      }
    }

    // Tier 3: Substring fallback if few results
    if (matches.length < limit) {
      const subMatches = await Food.find({
        $or: [
          { name: { $regex: substringRegex } },
          { aliases: { $in: [substringRegex] } }
        ]
      })
      .limit(limit * 2)
      .lean();

      for (const sm of subMatches) {
        if (!matches.some(m => m._id.toString() === sm._id.toString())) {
          matches.push(sm);
        }
      }
    }

    // Score and rank candidates
    const scored = matches.map(f => {
      let score = scoreCandidate(f, query);
      const n = (f.name || "").toLowerCase();
      // Prioritize whole/fresh egg over yolk or dried when searching "egg"
      if (q.includes("egg") && !q.includes("yolk") && !q.includes("white")) {
        if (n.includes("whole, raw, fresh") || n.includes("whole, cooked, hard-boiled")) score += 60;
        else if (n.includes("yolk") || n.includes("white") || n.includes("dried")) score -= 50;
      }
      if (n.includes('raw, fresh') || n.includes('raw')) score += 15;
      if (n.includes('dried') || n.includes('powder') || n.includes('mix')) score -= 20;
      return { food: f, score };
    });

    scored.sort((a, b) => b.score - a.score || (a.food.name || "").length - (b.food.name || "").length);

    return scored.slice(0, limit).map(s => s.food);
  }

  async getFoodByName(name: string): Promise<any | null> {
    if (!name || !name.trim()) return null;
    const escapedName = escapeRegex(name.trim());
    const regex = new RegExp(`^${escapedName}$`, "i");

    // Exact match by name or alias
    let food = await Food.findOne({
      $or: [
        { name: { $regex: regex } },
        { aliases: { $in: [regex] } }
      ]
    }).lean();

    if (!food) {
      const qSingular = (name.endsWith('s') && !name.endsWith('ss')) ? name.slice(0, -1) : name;
      const qPlural = name.endsWith('s') ? name : name + 's';
      const variantRegex = new RegExp(`^(${escapeRegex(qSingular)}|${escapeRegex(qPlural)})$`, "i");

      food = await Food.findOne({
        $or: [
          { name: { $regex: variantRegex } },
          { aliases: { $in: [variantRegex] } }
        ]
      }).lean();
    }

    if (!food) {
      // Fallback to top-ranked search result
      const searchResults = await this.searchFoods(name, 1);
      if (searchResults && searchResults.length > 0) {
        food = searchResults[0];
      }
    }

    return food;
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
