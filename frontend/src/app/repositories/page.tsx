"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, Network } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import api from "@/lib/api";
import type { Repository } from "@/types/auth";

function RepositoriesPage() {
  const [repositories, setRepositories] = useState<Repository[] | null>(null);
  useEffect(() => { api.get<Repository[]>("/repositories").then(({ data }) => setRepositories(data)).catch(() => setRepositories([])); }, []);
  return <main className="min-h-screen bg-background"><header className="border-b bg-card"><div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Dashboard</Link><span className="text-muted-foreground">/</span><span className="font-medium">Git repositories</span></div></header><section className="mx-auto max-w-7xl px-5 py-10"><div className="flex items-center gap-3"><Network className="size-7 text-primary" /><div><h1 className="text-3xl font-semibold">Git repositories</h1><p className="mt-1 text-muted-foreground">Choose a repository to import and index.</p></div></div>{repositories === null ? <p className="mt-10 flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Loading repositories…</p> : <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{repositories.map((repository) => <Link key={repository.id} href={`/repositories/${repository.id}`} className="rounded-xl border bg-card p-5 hover:border-primary/50 hover:shadow-md"><h2 className="font-semibold">{repository.name}</h2><p className="mt-3 text-sm text-muted-foreground">{repository.language || "Language not detected"} · {repository.defaultBranch}</p></Link>)}</div>}</section></main>;
}
export default function RepositoriesRoute() { return <ProtectedRoute><RepositoriesPage /></ProtectedRoute>; }
