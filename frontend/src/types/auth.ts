export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
};

export type GitHubAppStatus = {
  installed: boolean;
  installationId?: string;
};

export type Repository = {
  id: string;
  name: string;
  visibility: string;
  defaultBranch: string;
  language?: string;
  updatedAt: string;
};

export type RepositoryDetails = Repository & {
  fullName: string;
  ownerLogin: string;
  description?: string | null;
  pushedAt?: string | null;
  htmlUrl: string;
  topics: string[];
  size?: number;
  archived: boolean;
  fork: boolean;
};

export type RepositoryImportMode = "INTELLIGENCE" | "DOCUMENTATION";

export type IndexingStatus = "NOT_STARTED" | "QUEUED" | "CLONING" | "SCANNING" | "PARSING" | "INDEXING" | "DOCUMENTING" | "COMPLETED" | "FAILED";

export type ImportedRepository = {
  id: string;
  name: string;
  fullName: string;
  language?: string | null;
  defaultBranch: string;
  importMode: RepositoryImportMode;
  indexing: { status: IndexingStatus; progress: number; startedAt?: string; completedAt?: string; lastError?: string | null };
  createdAt: string;
  updatedAt: string;
};
