"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { BarChart3, Bot, FileSearch, GitPullRequest, LoaderCircle, Menu, MoreHorizontal, Network, RefreshCw, X } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import type { GitHubAppStatus, ImportedRepository, IndexingStatus, Repository } from "@/types/auth";

const activeStatuses: IndexingStatus[] = ["QUEUED", "CLONING", "SCANNING", "PARSING", "INDEXING", "DOCUMENTING"];
const actionItems = [
  ["Open PR Analysis", "pr-analysis", GitPullRequest],
  ["Generate diagram", "diagram", FileSearch],
  ["Visualise knowledge graph", "knowledge-graph", Network],
  ["Repo intelligent chat", "chat", Bot],
] as const;

function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [imported, setImported] = useState<ImportedRepository[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchImported = useCallback(async () => {
    const { data } = await api.get<ImportedRepository[]>("/repositories/imported");
    return Promise.all(data.map(async (repository) => {
      try {
        const response = await api.get<ImportedRepository["indexing"]>(`/repostatus/${repository.id}`);
        return { ...repository, indexing: response.data };
      } catch { return repository; }
    }));
  }, []);
  const refreshImported = useCallback(async () => setImported(await fetchImported()), [fetchImported]);

  useEffect(() => {
    Promise.all([api.get<GitHubAppStatus>("/github/app/status"), api.get<Repository[]>("/repositories"), fetchImported()])
      .then(([status, repoResponse, importedResponse]) => {
        if (!status.data.installed) router.replace("/github/install");
        else { setRepositories(repoResponse.data); setImported(importedResponse); }
      })
      .catch((requestError) => setError(axios.isAxiosError(requestError) ? "Could not load repositories." : "Something went wrong."))
      .finally(() => setLoading(false));
  }, [fetchImported, router]);

  useEffect(() => {
    if (!imported.some((repository) => activeStatuses.includes(repository.indexing.status))) return;
    const timer = window.setInterval(() => { refreshImported().catch(() => undefined); }, 5000);
    return () => window.clearInterval(timer);
  }, [imported, refreshImported]);

  const retry = async (repositoryId: string) => {
    setRetrying(repositoryId); setError(null);
    try { await api.post(`/repositories/${repositoryId}/retry`); await refreshImported(); }
    catch { setError("Could not queue the repository retry."); }
    finally { setRetrying(null); }
  };

  return <div className="min-h-screen bg-background lg:flex">
    <aside className={`fixed inset-y-0 left-0 z-30 w-64 border-r bg-card p-5 transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex items-center justify-between"><div><p className="font-semibold">CodeAtlas</p><p className="text-xs text-muted-foreground">Repository intelligence</p></div><Button className="lg:hidden" variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}><X /></Button></div>
      <nav className="mt-10 space-y-1 text-sm"><Link href="/repositories" className="flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-2 font-medium text-primary"><Network className="size-4" />Git repositories</Link><Link href="/imported-repositories" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"><BarChart3 className="size-4" />Imported repositories</Link></nav>
      <div className="absolute inset-x-5 bottom-5 border-t pt-4"><p className="truncate text-sm font-medium">{user?.name}</p><Button className="mt-3 w-full" variant="outline" onClick={() => { logout(); router.replace("/"); }}>Log out</Button></div>
    </aside>
    {sidebarOpen && <button aria-label="Close navigation" className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />}
    <main className="min-w-0 flex-1"><header className="flex items-center gap-3 border-b bg-card px-5 py-4 lg:hidden"><Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}><Menu /></Button><p className="font-semibold">CodeAtlas</p></header><div className="mx-auto max-w-7xl px-5 py-8">
      <section id="github-repositories"><h1 className="text-3xl font-semibold tracking-tight">Git repositories</h1><p className="mt-2 text-muted-foreground">Choose one repository to import for intelligence processing.</p>
      {loading && <Loading />}{error && <p className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}
      {!loading && !error && <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{repositories.map((repository) => <Link key={repository.id} href={`/repositories/${repository.id}`} className="rounded-xl border bg-card p-5 transition hover:border-primary/50 hover:shadow-md"><h2 className="font-semibold">{repository.name}</h2><p className="mt-3 text-sm text-muted-foreground">{repository.language || "Language not detected"} · {repository.defaultBranch}</p></Link>)}</div>}</section>
      <section id="imported-repositories" className="mt-14"><div className="flex items-end justify-between"><div><h2 className="text-2xl font-semibold">Imported repositories</h2><p className="mt-1 text-sm text-muted-foreground">Live indexing status refreshes while a repository is processing.</p></div><Button variant="outline" size="sm" onClick={() => refreshImported().catch(() => setError("Could not refresh imported repositories."))}><RefreshCw />Refresh</Button></div>
      <div className="mt-5 rounded-xl border bg-card"><table className="w-full table-fixed text-left text-sm"><thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="w-[31%] px-5 py-3">Repository</th><th className="w-[14%] px-5 py-3">Language</th><th className="w-[22%] px-5 py-3">Status</th><th className="w-[22%] px-5 py-3">Progress</th><th className="w-[11%] px-5 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody>{imported.length === 0 ? <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No repositories have been imported yet.</td></tr> : imported.map((repository) => <ImportedRow key={repository.id} repository={repository} retrying={retrying === repository.id} onRetry={() => retry(repository.id)} />)}</tbody></table></div></section>
    </div></main>
  </div>;
}

export function ImportedRow({ repository, retrying, onRetry }: { repository: ImportedRepository; retrying: boolean; onRetry: () => void }) {
  const { indexing } = repository; const isActive = activeStatuses.includes(indexing.status);
  return <tr className="border-b last:border-0"><td className="px-5 py-4"><p className="truncate font-medium">{repository.name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{repository.fullName}</p></td><td className="px-5 py-4 text-muted-foreground">{repository.language || "—"}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${indexing.status === "FAILED" ? "bg-destructive/10 text-destructive" : indexing.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}>{indexing.status.replaceAll("_", " ")}</span>{indexing.lastError && <p className="mt-2 max-w-52 truncate text-xs text-destructive" title={indexing.lastError}>{indexing.lastError}</p>}</td><td className="px-5 py-4"><div className="flex items-center gap-2"><div className="h-2 min-w-12 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${indexing.progress || 0}%` }} /></div><span className="text-xs text-muted-foreground">{indexing.progress || 0}%</span>{isActive && <LoaderCircle className="size-3 animate-spin text-primary" />}</div></td><td className="px-5 py-4 text-right"><div className="flex justify-end gap-2">{indexing.status === "FAILED" && <Button variant="outline" size="sm" disabled={retrying} onClick={onRetry}>{retrying && <LoaderCircle className="animate-spin" />}Retry</Button>}<details className="relative"><summary className="flex size-8 cursor-pointer list-none items-center justify-center rounded-lg hover:bg-muted"><MoreHorizontal className="size-4" /></summary><div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border bg-card p-1 text-left shadow-xl ring-1 ring-black/5">{actionItems.map(([label, slug, Icon]) => <Link key={slug} href={`/repositories/${repository.id}/${slug}`} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"><Icon className="size-4 text-muted-foreground" />{label}</Link>)}</div></details></div></td></tr>;
}
function Loading() { return <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="size-5 animate-spin" />Loading repositories…</div>; }
export default function DashboardPage() { return <ProtectedRoute><Dashboard /></ProtectedRoute>; }
