"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace("/");
  }, [isAuthenticated, isReady, router]);

  if (!isReady || !isAuthenticated) {
    return <main className="grid min-h-screen place-items-center text-muted-foreground">Loading…</main>;
  }

  return <>{children}</>;
}
