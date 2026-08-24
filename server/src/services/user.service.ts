import { AppError } from "../errors/AppError";
import { IUser } from "../models/User";
import { userRepository, ProfileUpdate } from "../repositories/user.repository";

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  height?: number;
  weight?: number;
  goal?: string;
  experience?: string;
  age?: number;
  gender?: string;
  activityLevel?: string;
  fitnessGoal?: string;
  createdAt: Date;
  updatedAt: Date;
}

const toSafeUser = (user: IUser): SafeUser => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  height: user.height,
  weight: user.weight,
  goal: user.goal,
  experience: user.experience,
  age: user.age,
  gender: user.gender,
  activityLevel: user.activityLevel,
  fitnessGoal: user.fitnessGoal,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

class UserService {
  async getProfile(userId: string): Promise<SafeUser> {
    const user = await userRepository.findById(userId);
    
    if (!user) {
      throw new AppError("User not found", 404);
    }
    
    return toSafeUser(user);
  }

  async updateProfile(userId: string, updateData: ProfileUpdate): Promise<SafeUser> {
    const user = await userRepository.updateById(userId, updateData);
    
    if (!user) {
      throw new AppError("User not found", 404);
    }
    
    return toSafeUser(user);
  }
}

export const userService = new UserService();
export default userService;
