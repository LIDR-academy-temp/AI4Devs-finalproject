import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SessionExpiredPage } from "@/lib/components/SessionExpiredPage";
import { AuthContext, type AuthContextValue } from "@/lib/auth/AuthContext";

describe("SessionExpiredPage", () => {
  it("displays session expired message with sign in button", () => {
    const mockSignIn = vi.fn();
    const authValue: AuthContextValue = {
      session: { status: "session_expired" },
      signIn: mockSignIn,
      signOut: vi.fn(),
    };

    render(
      <AuthContext.Provider value={authValue}>
        <SessionExpiredPage />
      </AuthContext.Provider>
    );

    expect(screen.getByText("Sesión caducada")).toBeInTheDocument();
    expect(screen.getByText(/tu sesión ha expirado/i)).toBeInTheDocument();
    expect(screen.getByText("Iniciar sesión")).toBeInTheDocument();
  });

  it("calls signIn when button is clicked", async () => {
    const mockSignIn = vi.fn();
    const authValue: AuthContextValue = {
      session: { status: "session_expired" },
      signIn: mockSignIn,
      signOut: vi.fn(),
    };

    const user = userEvent.setup();

    render(
      <AuthContext.Provider value={authValue}>
        <SessionExpiredPage />
      </AuthContext.Provider>
    );

    const button = screen.getByText("Iniciar sesión");
    await user.click(button);

    expect(mockSignIn).toHaveBeenCalledWith("/");
  });
});
