"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";

import { useAuth } from "@/components/auth-provider";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import type { GitHubAppStatus, Repository } from "@/types/auth";

function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get<GitHubAppStatus>("/github/app/status"), api.get<Repository[]>("/repositories")])
      .then(([status, repositoryResponse]) => {
        if (!status.data.installed) {
          router.replace("/github/install");
          return;
        }
        setRepositories(repositoryResponse.data);
      })
      .catch((requestError) => setError(axios.isAxiosError(requestError) ? "Could not load your repositories." : "Something went wrong."))
      .finally(() => setIsLoading(false));
  }, [router]);

  return <main className="min-h-screen bg-background"><header className="border-b bg-card"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><div><p className="font-semibold">CodeAtlas</p><p className="text-sm text-muted-foreground">Repository intelligence</p></div><div className="flex items-center gap-3"><span className="hidden text-sm text-muted-foreground sm:inline">{user?.name}</span><Button variant="outline" onClick={() => { logout(); router.replace("/"); }}>Log out</Button></div></div></header><section className="mx-auto max-w-6xl px-5 py-10"><h1 className="text-3xl font-semibold tracking-tight">Your repositories</h1><p className="mt-2 text-muted-foreground">Choose a repository to explore its intelligence and documentation.</p>{isLoading && <div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground"><span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />Loading repositories…</div>}{error && <p className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}{!isLoading && !error && repositories.length === 0 && <p className="mt-10 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No repositories are available for this GitHub App installation.</p>}<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{repositories.map((repository) => <Link key={repository.id} href={`/repositories/${repository.id}`} className="rounded-xl border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"><h2 className="font-semibold">{repository.name}</h2><dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm"><Meta label="Visibility" value={repository.visibility} /><Meta label="Branch" value={repository.defaultBranch} /><Meta label="Language" value={repository.language ?? "—"} /><Meta label="Updated" value={new Date(repository.updatedAt).toLocaleDateString()} /></dl></Link>)}</div></section></main>;
}

function Meta({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 truncate font-medium">{value}</dd></div>; }

export default function DashboardPage() { return <ProtectedRoute><Dashboard /></ProtectedRoute>; }
