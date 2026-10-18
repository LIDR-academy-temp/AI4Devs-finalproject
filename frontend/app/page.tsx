"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/lib/auth/AuthContext";

export default function HomePage() {
  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (session.status === "authenticated") {
      // Redirect authenticated users to campaigns list
      router.replace("/campaigns");
    }
  }, [session.status, router]);

  if (session.status === "loading") {
    return <p role="status">Checking your session…</p>;
  }

  if (session.status === "authenticated") {
    // Redirect in progress
    return null;
  }

  // Unauthenticated: show login page
  return (
    <section className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md px-6 py-12 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">AdOps360</h1>
        <p className="text-gray-600 mb-8">Campaign intake, delivery performance and margins in one place.</p>
        <p className="text-gray-600 mb-6">Sign in to your account to continue.</p>
      </div>
    </section>
  );
}
