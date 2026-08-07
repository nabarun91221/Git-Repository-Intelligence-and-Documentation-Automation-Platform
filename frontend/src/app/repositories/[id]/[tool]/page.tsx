"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Bot, FileSearch, GitPullRequest, Network } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";

const tools = {
  "pr-analysis": { title: "PR Analysis", description: "Review pull requests with repository-aware context.", icon: GitPullRequest },
  diagram: { title: "Architecture diagram", description: "Generate and explore the repository architecture diagram.", icon: FileSearch },
  "knowledge-graph": { title: "Knowledge graph", description: "Visualise symbols and their immediate repository relationships.", icon: Network },
  chat: { title: "Repository intelligent chat", description: "Ask grounded questions about this repository.", icon: Bot },
} as const;

function ToolPage() {
  const { id, tool } = useParams<{ id: string; tool: keyof typeof tools }>();
  const item = tools[tool];
  if (!item) return <main className="grid min-h-screen place-items-center"><div className="text-center"><h1 className="text-xl font-semibold">Tool not found</h1><Link className="mt-4 inline-block text-primary hover:underline" href="/dashboard">Back to dashboard</Link></div></main>;
  const Icon = item.icon;
  return <main className="min-h-screen bg-background"><header className="border-b bg-card"><div className="mx-auto max-w-5xl px-5 py-4"><Link className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground" href="/dashboard#imported-repositories"><ArrowLeft className="size-4" />Imported repositories</Link></div></header><section className="mx-auto max-w-5xl px-5 py-16"><div className="rounded-2xl border bg-card p-8"><div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon /></div><p className="mt-6 text-sm font-medium text-primary">Repository {id}</p><h1 className="mt-2 text-3xl font-semibold">{item.title}</h1><p className="mt-3 max-w-2xl text-muted-foreground">{item.description} This workspace is ready for the corresponding repository feature.</p></div></section></main>;
}
export default function RepositoryToolPage() { return <ProtectedRoute><ToolPage /></ProtectedRoute>; }
