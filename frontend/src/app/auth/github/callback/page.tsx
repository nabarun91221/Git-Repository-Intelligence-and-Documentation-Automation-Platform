"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import type { AuthUser } from "@/types/auth";

function GitHubCallback() {
  const params = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();
  const serializedUser = params.get("user");
  const user = useMemo(() => {
    try {
      return serializedUser ? (JSON.parse(serializedUser) as AuthUser) : null;
    } catch {
      return null;
    }
  }, [serializedUser]);

  useEffect(() => {
    if (!user) return;

    try {
      login(user);
      router.replace("/github/install");
    } catch {
      router.replace("/");
    }
  }, [login, router, user]);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5">
      <div className="text-center">
        <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <h1 className="text-lg font-semibold">Completing GitHub sign-in</h1>
        <p className="mt-2 text-sm text-muted-foreground">{!user ? "GitHub did not return valid authentication details." : "Securing your session…"}</p>
        {!user && <button className="mt-5 text-sm font-medium text-primary underline" onClick={() => router.replace("/")}>Return to login</button>}
      </div>
    </main>
  );
}

export default function GitHubCallbackPage() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center">Loading…</main>}><GitHubCallback /></Suspense>;
}
