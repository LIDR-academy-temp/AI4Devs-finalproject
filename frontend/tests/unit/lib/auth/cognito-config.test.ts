import { describe, expect, it } from "vitest";

import { buildLogoutUrl, buildUserManagerSettings, type CognitoConfig } from "@/lib/auth/cognito-config";

const config: CognitoConfig = {
  region: "eu-central-1",
  userPoolId: "eu-central-1_Example1",
  clientId: "example-client-id",
  domain: "adops360-example.auth.eu-central-1.amazoncognito.com",
};

describe("cognito config", () => {
  it("uses the user pool as OIDC authority with authorization code flow and the callback route", () => {
    const settings = buildUserManagerSettings(config, "http://localhost");

    expect(settings.authority).toBe("https://cognito-idp.eu-central-1.amazonaws.com/eu-central-1_Example1");
    expect(settings.client_id).toBe("example-client-id");
    expect(settings.response_type).toBe("code");
    expect(settings.redirect_uri).toBe("http://localhost/callback");
    expect(settings.scope).toContain("email");
  });

  it("builds the hosted UI logout URL that returns to the application", () => {
    const url = new URL(buildLogoutUrl(config, "http://localhost"));

    expect(url.origin).toBe("https://adops360-example.auth.eu-central-1.amazoncognito.com");
    expect(url.pathname).toBe("/logout");
    expect(url.searchParams.get("client_id")).toBe("example-client-id");
    expect(url.searchParams.get("logout_uri")).toBe("http://localhost/");
  });
});
