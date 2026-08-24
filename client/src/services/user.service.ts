import { api } from "./api";
import type { ApiResponse, ProfileUpdateData, User } from "../types";

export async function getProfile(): Promise<User> {
  const { data } = await api.get<ApiResponse<{ user: User }>>("/api/users/me/profile");
  if (!data.data) {
    throw new Error(data.message ?? "Failed to retrieve profile");
  }
  return data.data.user;
}

export async function updateProfile(
  updateData: ProfileUpdateData,
): Promise<User> {
  const { data } = await api.patch<ApiResponse<{ user: User }>>(
    "/api/users/me/profile",
    updateData,
  );
  if (!data.data) {
    throw new Error(data.message ?? "Failed to update profile");
  }
  return data.data.user;
}
