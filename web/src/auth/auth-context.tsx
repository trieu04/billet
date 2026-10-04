import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { setToken } from "../api/client";
import * as apiEndpoints from "../api/endpoints";
import type { User } from "../api/endpoints";

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (body: {
    username: string;
    email: string;
    password: string;
    displayName?: string;
  }) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on load (token already in localStorage → axios sends it).
  useEffect(() => {
    (async () => {
      try {
        setUser(await apiEndpoints.fetchMe());
      } catch {
        setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { user: u, token } = await apiEndpoints.login({ email, password });
    setToken(token);
    setUser(u);
  };

  const signUp = async (body: {
    username: string;
    email: string;
    password: string;
    displayName?: string;
  }) => {
    const { user: u, token } = await apiEndpoints.register(body);
    setToken(token);
    setUser(u);
  };

  const signOut = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
