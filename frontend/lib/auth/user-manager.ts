"use client";

import { UserManager } from "oidc-client-ts";

import { buildLogoutUrl, buildUserManagerSettings, readCognitoConfig } from "@/lib/auth/cognito-config";

let userManager: UserManager | null = null;

/** One UserManager per browser tab, created lazily because it needs `window`. */
export function getUserManager(): UserManager {
  userManager ??= new UserManager(buildUserManagerSettings(readCognitoConfig(), window.location.origin));
  return userManager;
}

export function getLogoutUrl(): string {
  return buildLogoutUrl(readCognitoConfig(), window.location.origin);
}
