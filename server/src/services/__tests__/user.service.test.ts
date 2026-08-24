import { userService } from "../../services/user.service";
import { userRepository } from "../../repositories/user.repository";
import { AppError } from "../../errors/AppError";

jest.mock("../../repositories/user.repository");

describe("UserService", () => {
  const mockUserId = "60c72b2f9b1d8b001c8e4a5d";
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getProfile", () => {
    it("should return the safe user profile if user exists", async () => {
      const mockUser = {
        _id: mockUserId,
        name: "Test User",
        email: "test@example.com",
        age: 25,
        gender: "male",
        height: 180,
        weight: 80,
        activityLevel: "active",
        fitnessGoal: "build_muscle",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      
      const result = await userService.getProfile(mockUserId);
      
      expect(result.id).toBe(mockUserId);
      expect(result.name).toBe("Test User");
      expect(result.age).toBe(25);
      expect(userRepository.findById).toHaveBeenCalledWith(mockUserId);
    });

    it("should throw an error if user does not exist", async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);
      
      await expect(userService.getProfile(mockUserId)).rejects.toThrow(AppError);
    });
  });

  describe("updateProfile", () => {
    it("should update and return the safe user profile", async () => {
      const updateData = { age: 26, weight: 82 };
      const mockUpdatedUser = {
        _id: mockUserId,
        name: "Test User",
        email: "test@example.com",
        age: 26,
        gender: "male",
        height: 180,
        weight: 82,
        activityLevel: "active",
        fitnessGoal: "build_muscle",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      (userRepository.updateById as jest.Mock).mockResolvedValue(mockUpdatedUser);
      
      const result = await userService.updateProfile(mockUserId, updateData);
      
      expect(result.age).toBe(26);
      expect(result.weight).toBe(82);
      expect(userRepository.updateById).toHaveBeenCalledWith(mockUserId, updateData);
    });
    
    it("should throw an error if user does not exist during update", async () => {
      (userRepository.updateById as jest.Mock).mockResolvedValue(null);
      
      await expect(userService.updateProfile(mockUserId, { age: 30 })).rejects.toThrow(AppError);
    });
  });
});
