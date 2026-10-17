"use client";

import type { User } from "oidc-client-ts";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { AuthContext, type AuthContextValue, type AuthSession } from "@/lib/auth/AuthContext";
import { getLogoutUrl, getUserManager } from "@/lib/auth/user-manager";

export interface SignInState {
  returnTo: string;
}

function toSession(user: User | null): AuthSession {
  if (user === null || user.expired || !user.id_token) {
    return { status: "unauthenticated" };
  }
  const email = user.profile.email;
  return { status: "authenticated", email: email ?? "", idToken: user.id_token };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession>({ status: "loading" });

  useEffect(() => {
    const userManager = getUserManager();
    const handleUserLoaded = (user: User) => setSession(toSession(user));
    const handleUserUnloaded = () => setSession({ status: "unauthenticated" });

    userManager.events.addUserLoaded(handleUserLoaded);
    userManager.events.addUserUnloaded(handleUserUnloaded);
    userManager.events.addSilentRenewError(handleUserUnloaded);
    void userManager.getUser().then((user) => setSession(toSession(user)));

    return () => {
      userManager.events.removeUserLoaded(handleUserLoaded);
      userManager.events.removeUserUnloaded(handleUserUnloaded);
      userManager.events.removeSilentRenewError(handleUserUnloaded);
    };
  }, []);

  const signIn = useCallback(async (returnTo: string = "/") => {
    const state: SignInState = { returnTo };
    await getUserManager().signinRedirect({ state });
  }, []);

  const signOut = useCallback(async () => {
    await getUserManager().removeUser();
    window.location.assign(getLogoutUrl());
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ session, signIn, signOut }), [session, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
