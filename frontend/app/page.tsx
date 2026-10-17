"use client";

import Link from "next/link";

import { useAuth } from "@/lib/auth/AuthContext";

export default function HomePage() {
  const { session, signIn, signOut } = useAuth();

  return (
    <section>
      <h1>AdOps360</h1>
      <p>Campaign intake, delivery performance and margins in one place.</p>

      {session.status === "loading" && <p role="status">Checking your session…</p>}

      {session.status === "unauthenticated" && (
        <button type="button" onClick={() => void signIn("/")}>
          Sign in
        </button>
      )}

      {session.status === "authenticated" && (
        <>
          <p>Signed in as {session.email}</p>
          <nav>
            <Link href="/account">Your account</Link>
          </nav>
          <button type="button" onClick={() => void signOut()}>
            Sign out
          </button>
        </>
      )}
    </section>
  );
}
