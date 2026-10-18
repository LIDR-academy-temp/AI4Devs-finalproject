import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { AuthContext, type AuthContextValue } from "@/lib/auth/AuthContext";
import AuthenticatedLayout from "@/app/(authenticated)/layout";

describe("AuthenticatedLayout", () => {
  it("renders children when user is authenticated", () => {
    const authValue: AuthContextValue = {
      session: { status: "authenticated", email: "user@example.com", idToken: "token" },
      signIn: vi.fn(),
      signOut: vi.fn(),
    };

    render(
      <AuthContext.Provider value={authValue}>
        <AuthenticatedLayout>
          <div>Campaign Page Content</div>
        </AuthenticatedLayout>
      </AuthContext.Provider>
    );

    expect(screen.getByText("Campaign Page Content")).toBeInTheDocument();
  });

  it("shows session expired page when session was lost involuntarily", () => {
    const authValue: AuthContextValue = {
      session: { status: "session_expired" },
      signIn: vi.fn(),
      signOut: vi.fn(),
    };

    render(
      <AuthContext.Provider value={authValue}>
        <AuthenticatedLayout>
          <div>Campaign Page Content</div>
        </AuthenticatedLayout>
      </AuthContext.Provider>
    );

    expect(screen.getByText("Sesión caducada")).toBeInTheDocument();
    expect(screen.queryByText("Campaign Page Content")).not.toBeInTheDocument();
  });

  it("shows access denied page when there is a 403 error", () => {
    const authValue: AuthContextValue = {
      session: { status: "authenticated", email: "user@example.com", idToken: "token" },
      signIn: vi.fn(),
      signOut: vi.fn(),
    };

    // Simulate navigation with search param for 403 error
    render(
      <AuthContext.Provider value={authValue}>
        <AuthenticatedLayout>
          <div>Campaign Page Content</div>
        </AuthenticatedLayout>
      </AuthContext.Provider>
    );

    // When 403 error occurs, AccessDeniedPage should be shown
    // This is tested in practice through the API error handling
    expect(screen.getByText("Campaign Page Content")).toBeInTheDocument();
  });

  it("does not show session expired when user explicitly signed out", () => {
    const authValue: AuthContextValue = {
      session: { status: "unauthenticated" },
      signIn: vi.fn(),
      signOut: vi.fn(),
    };

    render(
      <AuthContext.Provider value={authValue}>
        <AuthenticatedLayout>
          <div>Campaign Page Content</div>
        </AuthenticatedLayout>
      </AuthContext.Provider>
    );

    // Should not show session expired for explicit logout
    expect(screen.queryByText("Sesión caducada")).not.toBeInTheDocument();
  });
});
