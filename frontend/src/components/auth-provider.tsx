"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { AuthUser } from "@/types/auth";
import api from "@/lib/api";

type AuthContextValue = {
  user: AuthUser | null;
  token: null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const userKey = "codeatlas.user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  const logout = useCallback(() => {
    window.localStorage.removeItem(userKey);
    setUser(null);
    void api.post("/auth/logout").catch(() => undefined);
  }, []);

  const login = useCallback((nextUser: AuthUser) => {
    window.localStorage.setItem(userKey, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const storedUser = window.localStorage.getItem(userKey);

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser) as AuthUser);
        } catch {
          window.localStorage.removeItem(userKey);
        }
      }

      setIsReady(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const onExpired = () => logout();
    window.addEventListener("codeatlas:auth-expired", onExpired);
    return () => window.removeEventListener("codeatlas:auth-expired", onExpired);
  }, [logout]);

  const value = useMemo(
    () => ({ user, token: null, isReady, isAuthenticated: Boolean(user), login, logout }),
    [isReady, login, logout, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider.");
  return context;
}
