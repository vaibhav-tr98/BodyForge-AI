import { Request, Response } from "express";
import { IUser } from "../models/User";
import User from "../models/User";
import logger from "../utils/logger";

type ProfileField = "name" | "height" | "weight" | "goal" | "experience";
type ProfileUpdate = Partial<Pick<IUser, ProfileField>>;

const PROFILE_FIELDS: readonly ProfileField[] = ["name", "height", "weight", "goal", "experience"];

const toSafeUser = (user: IUser) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  height: user.height,
  weight: user.weight,
  goal: user.goal,
  experience: user.experience,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const hasValidText = (value: unknown, maxLength: number): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;

const getAuthenticatedUserId = (req: Request, res: Response): string | undefined => {
  if (!req.authenticatedUserId) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return undefined;
  }

  return req.authenticatedUserId;
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) {
    return;
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({ success: true, data: { user: toSafeUser(user) } });
  } catch (error) {
    logger.error("Get user profile failed:", error);
    res.status(500).json({ success: false, message: "Unable to retrieve user profile" });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) {
    return;
  }

  const requestBody: unknown = req.body;
  if (typeof requestBody !== "object" || requestBody === null || Array.isArray(requestBody)) {
    res.status(400).json({ success: false, message: "A valid profile update is required" });
    return;
  }

  const body = requestBody as Record<string, unknown>;
  const suppliedFields = Object.keys(body);
  if (suppliedFields.some((field) => !PROFILE_FIELDS.includes(field as ProfileField))) {
    res.status(400).json({
      success: false,
      message: "Only name, height, weight, goal, and experience can be updated",
    });
    return;
  }

  const profileUpdate: ProfileUpdate = {};

  if ("name" in body) {
    if (!hasValidText(body.name, 50) || body.name.trim().length < 2) {
      res.status(400).json({ success: false, message: "Name must be between 2 and 50 characters" });
      return;
    }
    profileUpdate.name = body.name.trim();
  }

  if ("height" in body) {
    if (typeof body.height !== "number" || !Number.isFinite(body.height) || body.height < 50 || body.height > 300) {
      res.status(400).json({ success: false, message: "Height must be between 50 and 300" });
      return;
    }
    profileUpdate.height = body.height;
  }

  if ("weight" in body) {
    if (typeof body.weight !== "number" || !Number.isFinite(body.weight) || body.weight < 20 || body.weight > 500) {
      res.status(400).json({ success: false, message: "Weight must be between 20 and 500" });
      return;
    }
    profileUpdate.weight = body.weight;
  }

  if ("goal" in body) {
    if (!hasValidText(body.goal, 100)) {
      res.status(400).json({ success: false, message: "Goal must be between 1 and 100 characters" });
      return;
    }
    profileUpdate.goal = body.goal.trim();
  }

  if ("experience" in body) {
    if (!hasValidText(body.experience, 100)) {
      res.status(400).json({ success: false, message: "Experience must be between 1 and 100 characters" });
      return;
    }
    profileUpdate.experience = body.experience.trim();
  }

  try {
    const user = await User.findByIdAndUpdate(userId, profileUpdate, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({ success: true, data: { user: toSafeUser(user) } });
  } catch (error) {
    logger.error("Update user profile failed:", error);
    res.status(500).json({ success: false, message: "Unable to update user profile" });
  }
};
