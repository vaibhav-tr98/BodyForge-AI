import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { User } from "../types";
import { loginUser, registerUser } from "../services/auth.service";
import { getProfile } from "../services/user.service";

// ── Context shape ───────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ── Provider ────────────────────────────────────────────────────────────────────

const TOKEN_KEY = "token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── helpers ─────────────────────────────────────────────────────────────────

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const storeToken = (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
  };

  // ── public API ──────────────────────────────────────────────────────────────

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await getProfile();
      setUser(userData);
    } catch {
      clearAuth();
    }
  }, [clearAuth]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { user: userData, token } = await loginUser(email, password);
      storeToken(token);
      setUser(userData);
    },
    [],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const { user: userData, token } = await registerUser(
        name,
        email,
        password,
      );
      storeToken(token);
      setUser(userData);
    },
    [],
  );

  // ── validate stored token on mount ──────────────────────────────────────────

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    getProfile()
      .then((userData) => setUser(userData))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
