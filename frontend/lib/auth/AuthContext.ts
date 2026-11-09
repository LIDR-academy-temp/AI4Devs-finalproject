"use client";

import { createContext, useContext } from "react";

export type AuthSession =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "session_expired" }
  | { status: "authenticated"; email: string; idToken: string };

export interface AuthContextValue {
  session: AuthSession;
  /** Starts the hosted UI sign-in and returns to `returnTo` afterwards. */
  signIn: (returnTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === null) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
