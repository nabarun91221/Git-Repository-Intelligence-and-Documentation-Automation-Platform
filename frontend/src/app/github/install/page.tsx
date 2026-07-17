"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import type { GitHubAppStatus } from "@/types/auth";

const appSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG;

function GitHubInstall() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<GitHubAppStatus>("/github/app/status")
      .then(({ data }) => {
        if (data.installed) router.replace("/dashboard");
      })
      .catch((requestError) => {
        setError(axios.isAxiosError(requestError) ? "Could not check GitHub App status." : "Something went wrong.");
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  if (isLoading) return <SetupState title="Checking GitHub App status" detail="This only takes a moment." />;

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5">
      <section className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-xl shadow-slate-950/5">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground">GH</div>
        <h1 className="text-2xl font-semibold">Install GitHub App</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Install the CodeAtlas GitHub App to choose repositories for analysis and documentation.</p>
        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        <Button className="mt-6 h-11 w-full" disabled={!appSlug} onClick={() => window.location.href = `https://github.com/apps/${appSlug}/installations/new`}>
          Install GitHub App
        </Button>
        {!appSlug && <p className="mt-3 text-xs text-destructive">Set NEXT_PUBLIC_GITHUB_APP_SLUG before installing.</p>}
      </section>
    </main>
  );
}

function SetupState({ title, detail }: { title: string; detail: string }) {
  return <main className="grid min-h-screen place-items-center text-center"><div><div className="mx-auto mb-4 size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /><h1 className="font-semibold">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{detail}</p></div></main>;
}

export default function GitHubInstallPage() {
  return <ProtectedRoute><GitHubInstall /></ProtectedRoute>;
}
