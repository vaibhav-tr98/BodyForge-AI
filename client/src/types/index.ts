// ── User ────────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  height?: number;
  weight?: number;
  goal?: string;
  experience?: string;
  createdAt: string;
  updatedAt: string;
}

// ── API Responses ───────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// ── Profile ─────────────────────────────────────────────────────────────────────

export interface ProfileUpdateData {
  name?: string;
  height?: number;
  weight?: number;
  goal?: string;
  experience?: string;
}
