import { api } from "./api";
import type { ApiResponse, AuthResponse } from "../types";

export async function loginUser(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await api.post<ApiResponse<AuthResponse>>(
    "/api/auth/login",
    { email, password },
  );
  if (!data.data) {
    throw new Error(data.message ?? "Login failed");
  }
  return data.data;
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await api.post<ApiResponse<AuthResponse>>(
    "/api/auth/register",
    { name, email, password },
  );
  if (!data.data) {
    throw new Error(data.message ?? "Registration failed");
  }
  return data.data;
}
