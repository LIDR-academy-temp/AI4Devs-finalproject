"use client";

import { RequireAuth } from "@/features/auth/RequireAuth";
import { useAuth } from "@/lib/auth/AuthContext";

function AccountDetails() {
  const { session } = useAuth();
  if (session.status !== "authenticated") return null;

  return (
    <section>
      <h1>Your account</h1>
      <p>Signed in as {session.email}</p>
    </section>
  );
}

/** Example protected route: visible only with a session. Roles will be added with the first business view. */
export default function AccountPage() {
  return (
    <RequireAuth>
      <AccountDetails />
    </RequireAuth>
  );
}
