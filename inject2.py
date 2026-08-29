import os

filepath = "server/src/controllers/analytics.controller.ts"
with open(filepath, "r") as f:
    content = f.read()

import_line = 'import { workoutGeneratorService } from "../services/workoutGenerator.service";\n'
content = import_line + content

method_code = """
  public generateWorkoutPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.authenticatedUserId;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const data = await workoutGeneratorService.generateWorkout(userId, req.body);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      if (error.message === "AI workout generation is temporarily unavailable.") {
        res.status(503).json({ success: false, message: error.message });
      } else {
        logger.error("Failed to generate workout plan", { error });
        next(error);
      }
    }
  };
"""

content = content.replace("export const analyticsController = new AnalyticsController();", method_code + "\n}\n\nexport const analyticsController = new AnalyticsController();")
content = content.replace("}\n\n" + method_code, method_code)

with open(filepath, "w") as f:
    f.write(content)
