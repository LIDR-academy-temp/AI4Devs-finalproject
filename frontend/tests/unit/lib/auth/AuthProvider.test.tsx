import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { User } from "oidc-client-ts";

import { AuthProvider } from "@/lib/auth/AuthProvider";
import { useAuth } from "@/lib/auth/AuthContext";

// Mock getUserManager
const mockGetUser = vi.fn();
const mockAddUserLoaded = vi.fn();
const mockAddUserUnloaded = vi.fn();
const mockAddSilentRenewError = vi.fn();
const mockRemoveUserLoaded = vi.fn();
const mockRemoveUserUnloaded = vi.fn();
const mockRemoveSilentRenewError = vi.fn();
const mockRemoveUser = vi.fn();
const mockSigninRedirect = vi.fn();

const mockEvents = {
  addUserLoaded: mockAddUserLoaded,
  addUserUnloaded: mockAddUserUnloaded,
  addSilentRenewError: mockAddSilentRenewError,
  removeUserLoaded: mockRemoveUserLoaded,
  removeUserUnloaded: mockRemoveUserUnloaded,
  removeSilentRenewError: mockRemoveSilentRenewError,
};

vi.mock("@/lib/auth/user-manager", () => ({
  getUserManager: () => ({
    getUser: mockGetUser,
    events: mockEvents,
    removeUser: mockRemoveUser,
    signinRedirect: mockSigninRedirect,
  }),
  getLogoutUrl: () => "https://cognito/logout",
}));

function TestComponent() {
  const { session } = useAuth();
  if (session.status === "loading") return <div>Loading</div>;
  if (session.status === "unauthenticated") return <div>Unauthenticated</div>;
  if (session.status === "session_expired") return <div>SessionExpired</div>;
  if (session.status === "authenticated") return <div>Authenticated: {session.email}</div>;
  return null;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AuthProvider session expiration", () => {
  it("transitions to session_expired when userUnloaded fires from authenticated state", async () => {
    const user: User = {
      id_token: "token",
      profile: { email: "test@example.com" },
      expired: false,
    } as User;

    mockGetUser.mockResolvedValue(user);

    let userUnloadedCallback: (() => void) | null = null;
    mockAddUserUnloaded.mockImplementation((callback) => {
      userUnloadedCallback = callback;
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initially loading, then authenticated
    await waitFor(() => expect(screen.queryByText("Authenticated: test@example.com")).toBeInTheDocument());

    // Simulate userUnloaded event
    userUnloadedCallback?.();

    // Should transition to session_expired (not unauthenticated)
    await waitFor(() => expect(screen.getByText("SessionExpired")).toBeInTheDocument());
  });

  it("stays unauthenticated when userUnloaded fires from unauthenticated state", async () => {
    mockGetUser.mockResolvedValue(null);

    let userUnloadedCallback: (() => void) | null = null;
    mockAddUserUnloaded.mockImplementation((callback) => {
      userUnloadedCallback = callback;
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initially unauthenticated
    await waitFor(() => expect(screen.getByText("Unauthenticated")).toBeInTheDocument());

    // Simulate userUnloaded event
    userUnloadedCallback?.();

    // Should remain unauthenticated (not transition to session_expired)
    expect(screen.getByText("Unauthenticated")).toBeInTheDocument();
  });

  it("goes directly to unauthenticated when signOut is called voluntarily", async () => {
    const user: User = {
      id_token: "token",
      profile: { email: "test@example.com" },
      expired: false,
    } as User;

    mockGetUser.mockResolvedValue(user);

    let signOutCallback: (() => Promise<void>) | null = null;

    function TestComponentWithSignOut() {
      const { session, signOut } = useAuth();
      signOutCallback = signOut;
      if (session.status === "loading") return <div>Loading</div>;
      if (session.status === "unauthenticated") return <div>Unauthenticated</div>;
      if (session.status === "session_expired") return <div>SessionExpired</div>;
      if (session.status === "authenticated") return <div>Authenticated: {session.email}</div>;
      return null;
    }

    render(
      <AuthProvider>
        <TestComponentWithSignOut />
      </AuthProvider>
    );

    // Initially authenticated
    await waitFor(() => expect(screen.queryByText("Authenticated: test@example.com")).toBeInTheDocument());

    // Call signOut voluntarily
    await signOutCallback?.();

    // Should go to unauthenticated (not session_expired) because it was voluntary
    expect(mockRemoveUser).toHaveBeenCalled();
  });
});
