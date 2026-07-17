"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";

import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import type { RepositoryDetails, RepositoryImportMode } from "@/types/auth";

function RepositoryPage() {
  const { id } = useParams<{ id: string }>();
  const [repository, setRepository] = useState<RepositoryDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState<RepositoryImportMode | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<RepositoryDetails>(`/repositories/${id}`)
      .then(({ data }) => setRepository(data))
      .catch((requestError) =>
        setError(
          axios.isAxiosError(requestError)
            ? "Could not load this repository from GitHub."
            : "Something went wrong.",
        ),
      );
  }, [id]);

  const importRepository = async (mode: RepositoryImportMode) => {
    setImporting(mode);
    setError(null);
    setSuccess(null);

    try {
      const { data } = await api.post(`/repositories/${id}/import`, { mode });
      setSuccess(data.message);
    } catch (requestError) {
      setError(
        axios.isAxiosError(requestError)
          ? "Could not import this repository. Please try again."
          : "Something went wrong.",
      );
    } finally {
      setImporting(null);
    }
  };

  if (!repository && !error) {
    return <main className="grid min-h-screen place-items-center text-muted-foreground">Loading repository…</main>;
  }

  if (!repository) {
    return <main className="grid min-h-screen place-items-center px-5"><div className="text-center"><p className="text-destructive">{error}</p><Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">Back to repositories</Link></div></main>;
  }

  return (
    <main className="min-h-screen bg-background px-5 py-10">
      <section className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline">← Back to repositories</Link>
        <div className="mt-6 rounded-xl border bg-card p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row">
            <div>
              <p className="text-sm text-muted-foreground">{repository.fullName}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">{repository.name}</h1>
              <p className="mt-4 max-w-2xl text-muted-foreground">{repository.description || "No repository description was provided."}</p>
            </div>
            <a href={repository.htmlUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">Open on GitHub ↗</a>
          </div>

          <dl className="mt-8 grid gap-4 border-y py-5 text-sm sm:grid-cols-3">
            <Meta label="Visibility" value={repository.visibility} />
            <Meta label="Default branch" value={repository.defaultBranch} />
            <Meta label="Language" value={repository.language || "—"} />
            <Meta label="Last updated" value={new Date(repository.updatedAt).toLocaleDateString()} />
            <Meta label="Repository size" value={repository.size ? `${repository.size.toLocaleString()} KB` : "—"} />
            <Meta label="Type" value={repository.fork ? "Fork" : "Source"} />
          </dl>

          {repository.topics.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{repository.topics.map((topic) => <span key={topic} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{topic}</span>)}</div>}
        </div>

        <section className="mt-6 rounded-xl border bg-card p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Choose an import workflow</h2>
          <p className="mt-2 text-sm text-muted-foreground">The repository is saved only after you choose a workflow. It will then be queued for processing.</p>
          {error && <p className="mt-5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          {success && <p className="mt-5 rounded-lg bg-primary/10 p-3 text-sm text-primary">{success}</p>}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <WorkflowOption description="Import the source and prepare repository intelligence, architecture analysis, and code understanding." label="Import & create intelligence" loading={importing === "INTELLIGENCE"} onClick={() => importRepository("INTELLIGENCE")} />
            <WorkflowOption description="Import the source and prepare generated technical documentation for this repository." label="Import & create documentation" loading={importing === "DOCUMENTATION"} onClick={() => importRepository("DOCUMENTATION")} />
          </div>
        </section>
      </section>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>; }

function WorkflowOption({ description, label, loading, onClick }: { description: string; label: string; loading: boolean; onClick: () => void }) { return <div className="rounded-lg border p-5"><p className="text-sm leading-6 text-muted-foreground">{description}</p><Button className="mt-5 w-full" disabled={loading} onClick={onClick}>{loading ? "Importing…" : label}</Button></div>; }

export default function RepositoryDetailsPage() { return <ProtectedRoute><RepositoryPage /></ProtectedRoute>; }
