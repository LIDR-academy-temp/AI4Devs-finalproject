import type { UserManagerSettings } from "oidc-client-ts";

export interface CognitoConfig {
  region: string;
  userPoolId: string;
  clientId: string;
  /** Hosted UI domain, e.g. "your-prefix.auth.eu-central-1.amazoncognito.com". */
  domain: string;
}

export const CALLBACK_PATH = "/callback";

/**
 * Reads the public Cognito settings. Each variable is referenced literally
 * because Next.js only inlines NEXT_PUBLIC_* values written out in full.
 */
export function readCognitoConfig(): CognitoConfig {
  const config: Record<keyof CognitoConfig, string | undefined> = {
    region: process.env.NEXT_PUBLIC_COGNITO_REGION,
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
    clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
    domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
  };
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`Missing Cognito configuration: ${missing.join(", ")}`);
  }
  return config as CognitoConfig;
}

export function buildUserManagerSettings(config: CognitoConfig, origin: string): UserManagerSettings {
  return {
    authority: `https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}`,
    client_id: config.clientId,
    redirect_uri: `${origin}${CALLBACK_PATH}`,
    post_logout_redirect_uri: `${origin}/`,
    // Authorization code flow; oidc-client-ts adds PKCE. The app client has no secret.
    response_type: "code",
    scope: "openid email",
    automaticSilentRenew: true,
  };
}

/**
 * Cognito's discovery document has no end_session_endpoint, so sign-out goes
 * through the hosted UI logout route instead of the standard OIDC one.
 */
export function buildLogoutUrl(config: CognitoConfig, origin: string): string {
  const url = new URL(`https://${config.domain}/logout`);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("logout_uri", `${origin}/`);
  return url.toString();
}
