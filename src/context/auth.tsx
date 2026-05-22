/**
 * Auth context — uses backend API for authentication.
 * JWT token is stored in HttpOnly cookie (managed by server).
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  isAuthenticated: boolean;
  username: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    api.get<{ ok: boolean; username: string }>("/auth/me")
      .then((data) => {
        setUsername(data.username);
      })
      .catch(() => {
        setUsername(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = useCallback(async (user: string, password: string) => {
    const result = await api.postSafe<{ ok: boolean; username?: string; error?: string }>(
      "/auth/login",
      { username: user, password }
    );

    if (result.ok && result.data?.ok && result.data.username) {
      setUsername(result.data.username);
      return { ok: true };
    }

    return { ok: false, error: result.error || "Invalid credentials" };
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore logout errors
    }
    setUsername(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: username !== null,
        username,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
