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
import { queryClient } from "../lib/queryClient";
import { clearBodyForgeCache } from "../lib/queryPersister";

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

  const clearAuth = useCallback(async () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser((prevUser) => {
      if (prevUser?.id) {
        import("../lib/syncQueue").then(({ clearUserQueue }) => {
          clearUserQueue(prevUser.id).catch(console.error);
        });
      }
      return null;
    });
    queryClient.clear();
    clearBodyForgeCache().catch(console.error);
    const { setSyncUserId } = await import("../lib/syncQueue");
    setSyncUserId(null);
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
      const { setSyncUserId } = await import("../lib/syncQueue");
      setSyncUserId(userData.id);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        clearAuth();
      }
    }
  }, [clearAuth]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { user: userData, token } = await loginUser(email, password);
      storeToken(token);
      setUser(userData);
      const { setSyncUserId } = await import("../lib/syncQueue");
      setSyncUserId(userData.id);
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
      const { setSyncUserId } = await import("../lib/syncQueue");
      setSyncUserId(userData.id);
    },
    [],
  );

  // ── validate stored token on mount ──────────────────────────────────────────

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setIsLoading(false);
      queryClient.clear();
      clearBodyForgeCache().catch(console.error);
      import("../lib/syncQueue").then(m => m.setSyncUserId(null));
      return;
    }

    getProfile()
      .then((userData) => {
        setUser(userData);
        import("../lib/syncQueue").then(m => m.setSyncUserId(userData.id));
      })
      .catch((error: any) => {
        if (error?.response?.status === 401) {
          clearAuth();
        }
      })
      .finally(() => setIsLoading(false));
  }, [clearAuth]);

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user || !!localStorage.getItem(TOKEN_KEY),
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
