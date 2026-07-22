import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiPost, clearToken, getToken, setToken } from "../api/client";

interface AuthUser { id: string; email: string; fullName: string; tenantId: string; companyId: string | null; }
interface LoginResponse { token: string; user: AuthUser; }

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const USER_KEY = "oneall_session_user";
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    const cachedUser = localStorage.getItem(USER_KEY);
    if (token && cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
      } catch {
        clearToken();
        localStorage.removeItem(USER_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const res = await apiPost<LoginResponse>("/auth/login", { email, password, device: navigator.userAgent });
      setToken(res.token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      setUser(res.user);
    } catch (e) {
      setError(
        (e as Error).message.includes("401")
          ? "Invalid email or password."
          : `Could not reach the API (${(e as Error).message}).`,
      );
      throw e;
    }
  };

  const logout = () => {
    apiPost("/auth/logout", {}).catch(() => undefined);
    clearToken();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, error, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
