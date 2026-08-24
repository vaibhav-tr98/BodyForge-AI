import User, { IUser } from "../models/User";

type ProfileField = "name" | "height" | "weight" | "goal" | "experience" | "age" | "gender" | "activityLevel" | "fitnessGoal";
export type ProfileUpdate = Partial<Pick<IUser, ProfileField>>;

class UserRepository {
  async findById(id: string): Promise<IUser | null> {
    return User.findById(id);
  }

  async updateById(id: string, update: ProfileUpdate): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });
  }
}

export const userRepository = new UserRepository();
export default userRepository;
