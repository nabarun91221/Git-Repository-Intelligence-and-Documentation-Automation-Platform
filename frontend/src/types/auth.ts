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
