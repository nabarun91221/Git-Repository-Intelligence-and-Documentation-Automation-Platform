"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { ImportedRow } from "@/app/dashboard/page";
import api from "@/lib/api";
import type { ImportedRepository, IndexingStatus } from "@/types/auth";

const active: IndexingStatus[] = ["QUEUED", "CLONING", "SCANNING", "PARSING", "INDEXING", "DOCUMENTING"];
function ImportedRepositoriesPage() {
  const [repositories, setRepositories] = useState<ImportedRepository[]>([]);
  const [retrying, setRetrying] = useState<string | null>(null);
  const load = useCallback(async () => {
    const { data } = await api.get<ImportedRepository[]>("/repositories/imported");
    return Promise.all(data.map(async (repository) => { try { const response = await api.get<ImportedRepository["indexing"]>(`/repostatus/${repository.id}`); return { ...repository, indexing: response.data }; } catch { return repository; } }));
  }, []);
  const refresh = useCallback(async () => setRepositories(await load()), [load]);
  useEffect(() => { load().then(setRepositories).catch(() => undefined); }, [load]);
  useEffect(() => { if (!repositories.some((repository) => active.includes(repository.indexing.status))) return; const timer = window.setInterval(() => { refresh().catch(() => undefined); }, 5000); return () => window.clearInterval(timer); }, [repositories, refresh]);
  const retry = async (id: string) => { setRetrying(id); try { await api.post(`/repositories/${id}/retry`); await refresh(); } finally { setRetrying(null); } };
  return <main className="min-h-screen bg-background"><header className="border-b bg-card"><div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Dashboard</Link><span className="text-muted-foreground">/</span><span className="font-medium">Imported repositories</span></div></header><section className="mx-auto max-w-7xl px-5 py-10"><div className="flex items-end justify-between"><div><h1 className="text-3xl font-semibold">Imported repositories</h1><p className="mt-2 text-muted-foreground">Track analysis progress and open repository tools.</p></div><Button variant="outline" onClick={() => refresh()}><RefreshCw />Refresh</Button></div><div className="mt-8 rounded-xl border bg-card"><table className="w-full table-fixed text-left text-sm"><thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="w-[31%] px-5 py-3">Repository</th><th className="w-[14%] px-5 py-3">Language</th><th className="w-[22%] px-5 py-3">Status</th><th className="w-[22%] px-5 py-3">Progress</th><th className="w-[11%] px-5 py-3" /></tr></thead><tbody>{repositories.length === 0 ? <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No repositories have been imported yet.</td></tr> : repositories.map((repository) => <ImportedRow key={repository.id} repository={repository} retrying={retrying === repository.id} onRetry={() => retry(repository.id)} />)}</tbody></table></div></section></main>;
}
export default function ImportedRepositoriesRoute() { return <ProtectedRoute><ImportedRepositoriesPage /></ProtectedRoute>; }
