"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Code2,
  ExternalLink,
  FileText,
  GitFork,
  Globe2,
  LoaderCircle,
  Lock,
  Sparkles,
} from "lucide-react";

import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import type { RepositoryDetails, RepositoryImportMode } from "@/types/auth";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function RepositoryPage() {
  const { id } = useParams<{ id: string }>();
  const [repository, setRepository] = useState<RepositoryDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState<RepositoryImportMode | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    api
      .get<RepositoryDetails>(`/repositories/${id}`)
      .then(({ data }) => {
        if (!active) return;
        setError(null);
        setRepository(data);
      })
      .catch((requestError) => {
        if (!active) return;
        setRepository(null);
        setError(axios.isAxiosError(requestError) ? "Could not load this repository from GitHub." : "Something went wrong.");
      });

    return () => {
      active = false;
    };
  }, [id]);

  const importRepository = async (mode: RepositoryImportMode) => {
    if (importing) return;
    setImporting(mode);
    setError(null);
    setSuccess(null);

    try {
      const { data } = await api.post<{ message?: string }>(`/repositories/${id}/import`, { mode });
      setSuccess(data.message || "Repository queued for processing.");
    } catch (requestError) {
      setError(axios.isAxiosError(requestError) ? "Could not queue this repository. Please try again." : "Something went wrong.");
    } finally {
      setImporting(null);
    }
  };

  if (!repository && !error) {
    return <LoadingState />;
  }

  if (!repository) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-5">
        <div className="max-w-sm text-center">
          <AlertCircle className="mx-auto size-9 text-destructive" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold">Repository unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button className="mt-6" variant="outline" onClick={() => window.location.reload()}>Try again</Button>
          <Link href="/dashboard" className="mt-4 block text-sm font-medium text-primary hover:underline">Back to repositories</Link>
        </div>
      </main>
    );
  }

  const topics = repository.topics || [];
  const isBusy = importing !== null;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" />
            All repositories
          </Link>
          <p className="hidden text-sm font-medium text-muted-foreground sm:block">Repository workspace</p>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-8 sm:py-12" style={{ padding: "3rem 1.5rem" }}>
        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="border-b px-6 py-7 sm:px-8 sm:py-9" style={{ padding: "2rem" }}>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{repository.visibility}</span>
                  {repository.fork && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"><GitFork className="size-3" />Fork</span>}
                  {repository.archived && <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700"><Archive className="size-3" />Archived</span>}
                </div>
                <p className="mt-5 truncate font-mono text-sm text-muted-foreground">{repository.fullName}</p>
                <h1 className="mt-1 break-words text-3xl font-semibold tracking-tight sm:text-4xl">{repository.name}</h1>
                <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">{repository.description || "No repository description was provided."}</p>
              </div>
              <a href={repository.htmlUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium transition hover:bg-muted">
                <ExternalLink className="size-4" aria-hidden="true" />
                Open on GitHub
              </a>
            </div>

            {topics.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {topics.map((topic) => <span key={topic} className="rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">{topic}</span>)}
              </div>
            )}
          </div>

          <dl className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            <Meta icon={<Code2 />} label="Primary language" value={repository.language || "Not detected"} />
            <Meta icon={<GitFork />} label="Default branch" value={repository.defaultBranch} />
            <Meta icon={repository.visibility === "private" ? <Lock /> : <Globe2 />} label="Visibility" value={repository.visibility} />
            <Meta icon={<Clock3 />} label="Last updated" value={formatDate(repository.updatedAt)} />
          </dl>
        </div>

        <section className="mt-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-primary">Start an analysis</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Choose what to create</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">The repository is queued securely and processed in the background. You can safely leave this page after it has been queued.</p>
          </div>

          <div aria-live="polite" className="mt-6 space-y-3">
            {error && <Notice tone="error" message={error} />}
            {success && <Notice tone="success" message={success} />}
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <WorkflowOption
              icon={<Sparkles className="size-5" />}
              title="Repository intelligence"
              description="Build the repository model for symbols, dependencies, architecture, and code understanding."
              highlights={["Knowledge graph", "Architecture diagram", "Future impact analysis"]}
              label="Create intelligence"
              loading={importing === "INTELLIGENCE"}
              disabled={isBusy || repository.archived}
              onClick={() => importRepository("INTELLIGENCE")}
            />
          </div>

          {repository.archived && <p className="mt-4 text-sm text-muted-foreground">Archived repositories cannot be queued for processing.</p>}
        </section>
      </section>
    </main>
  );
}

function LoadingState() {
  return <main className="grid min-h-screen place-items-center bg-background"><div className="flex items-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="size-5 animate-spin text-primary" aria-hidden="true" />Loading repository…</div></main>;
}

function Meta({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="min-w-0 px-6 py-5 sm:px-8" style={{ padding: "1.25rem 2rem" }}><dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><span className="text-primary [&>svg]:size-3.5">{icon}</span>{label}</dt><dd className="mt-2 truncate text-sm font-semibold capitalize">{value}</dd></div>;
}

function Notice({ tone, message }: { tone: "error" | "success"; message: string }) {
  const isError = tone === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;
  return <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${isError ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-primary/25 bg-primary/5 text-primary"}`}><Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><p>{message}</p></div>;
}

function WorkflowOption({ icon, title, description, highlights, label, loading, disabled, onClick }: { icon: ReactNode; title: string; description: string; highlights: string[]; label: string; loading: boolean; disabled: boolean; onClick: () => void }) {
  return <article className="rounded-2xl border bg-card p-6 shadow-sm transition hover:border-primary/35 hover:shadow-md" style={{ padding: "2rem", margin: 3 }}><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div><h3 className="mt-5 text-lg font-semibold">{title}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{description}</p><ul className="mt-5 space-y-2 text-sm text-muted-foreground">{highlights.map((highlight) => <li key={highlight} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" aria-hidden="true" />{highlight}</li>)}</ul><Button className="mt-10 w-full" disabled={disabled} onClick={onClick}>{loading && <LoaderCircle className="animate-spin" aria-hidden="true" />}{loading ? "Queuing repository…" : label}</Button></article>;
}

export default function RepositoryDetailsPage() {
  return <ProtectedRoute><RepositoryPage /></ProtectedRoute>;
}
