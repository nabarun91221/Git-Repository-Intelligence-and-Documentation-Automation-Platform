"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import type { GitHubAppStatus } from "@/types/auth";

function GitHubSetup() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const installationId = params.get("installation_id");

  useEffect(() => {
    if (!installationId) return;

    let cancelled = false;
    let attempts = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const checkInstallation = async () => {
      try {
        // This only confirms whether the signed webhook has saved the install.
        // The browser value is never persisted as proof of installation.
        await api.post("/github/install", { installationId });
        const { data } = await api.get<GitHubAppStatus>("/github/app/status");

        if (data.installed && data.installationId === installationId) {
          router.replace("/dashboard");
          return;
        }

        attempts += 1;
        if (attempts >= 24) {
          setError("GitHub has not confirmed this installation yet. Please wait a moment and try again.");
          return;
        }

        timeout = setTimeout(checkInstallation, 2500);
      } catch (requestError) {
        if (!cancelled) {
          setError(axios.isAxiosError(requestError) ? "We could not confirm the GitHub App installation." : "Installation failed.");
        }
      }
    };

    void checkInstallation();
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [installationId, router]);

  const message = error ?? (!installationId ? "GitHub App installation was cancelled or did not return an installation ID." : "Waiting for GitHub to confirm your installation…");
  return <main className="grid min-h-screen place-items-center px-5"><div className="w-full max-w-md text-center"><div className="mx-auto mb-4 size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /><h1 className="text-lg font-semibold">Finishing GitHub App setup</h1><p className="mt-2 text-sm text-muted-foreground">{message}</p>{(error || !installationId) && <Button className="mt-6" onClick={() => router.replace("/github/install")}>Try again</Button>}</div></main>;
}

export default function GitHubSetupPage() {
  return <ProtectedRoute><Suspense fallback={<main className="grid min-h-screen place-items-center">Loading…</main>}><GitHubSetup /></Suspense></ProtectedRoute>;
}
