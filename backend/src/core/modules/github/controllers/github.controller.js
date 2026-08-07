import "dotenv/config.js"
import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";
import { Webhooks } from "@octokit/webhooks";
import OauthAccount from "../../auth/models/oauthAccount.model.js";
import GithubAppStatus from "../models/githubAppStatus.model.js";
import Repository from "../models/repository.model.js";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import RabbitMqUtils from "../../../utils/rabbitMq.utils.js";
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const privateKeyPath = resolve(
    currentDirectory,
    "../../../secrets/codeatlasautomation.2026-07-10.private-key.pem",
);
let githubApp;
let webhooks;

function getGitHubApp()
{
    if (githubApp) return githubApp;

    const appId = process.env.GITHUB_APP_CLIENT_ID
    console.log(appId)
    if (!appId) {
        throw new Error("GITHUB_APP_CLIENT_ID must be configured.");
    }

    const privateKey = fs.readFileSync(privateKeyPath, "utf8");

    githubApp = new App({ appId, privateKey, Octokit });
    return githubApp;
}

function getWebhooks()
{
    if (webhooks) return webhooks;
    if (!process.env.GITHUB_WEBHOOK_SECRET) {
        throw new Error("GITHUB_WEBHOOK_SECRET is not configured.");
    }

    webhooks = new Webhooks({ secret: process.env.GITHUB_WEBHOOK_SECRET });
    return webhooks;
}

async function getInstallationToken(installationId)
{
    const authentication = await getGitHubApp().octokit.auth({
        type: "installation",
        installationId: Number(installationId),
    });
    return authentication.token;
}

async function getInstallationRepositories(installationId)
{
    const octokit = await getGitHubApp().getInstallationOctokit(Number(installationId));
    return octokit.paginate(octokit.rest.apps.listReposAccessibleToInstallation, {
        per_page: 100,
    });
}

function toRepositoryDocument(repository, owner, installationId)
{
    return {
        owner,
        installationId: Number(installationId),
        githubRepositoryId: Number(repository.id),
        name: repository.name,
        fullName: repository.full_name,
        ownerLogin: repository.owner?.login,
        description: repository.description,
        defaultBranch: repository.default_branch || "main",
        cloneUrl: repository.clone_url,
        htmlUrl: repository.html_url,
        language: repository.language,
        topics: repository.topics || [],
        visibility: repository.visibility,
        size: repository.size,
        archived: repository.archived,
        disabled: repository.disabled,
        fork: repository.fork,
        isInstalled: true,
        permissions: repository.permissions,
        github: {
            pushedAt: repository.pushed_at,
            updatedAt: repository.updated_at,
            createdAt: repository.created_at,
        },
    };
}

class GithubControllers
{
    // This endpoint deliberately does not save the browser-provided ID. It only
    // acknowledges the setup redirect; a signed GitHub webhook is authoritative.
    gitAppInstallVerification = async (req, res) =>
    {
        const installationId = String(req.body.installationId || "");

        if (!installationId) {
            return res.status(400).json({ message: "installationId is required." });
        }

        const installation = await GithubAppStatus.findOne({
            userId: req.user.sub,
            installationId,
            installed: true,
        });

        return res.status(installation ? 200 : 202).json({
            installed: Boolean(installation),
            installationId,
            status: installation ? "verified" : "pending_webhook_confirmation",
        });
    };

    gitAppInstallStatus = async (req, res) =>
    {
        const installationRecord = await GithubAppStatus.findOne({
            installed: true,
            userId: req.user.sub,
        }).sort({ updatedAt: -1 });

        return res.json({
            installed: Boolean(installationRecord),
            installationId: installationRecord?.installationId,
        });
    };

    githubWebhook = async (req, res) =>
    {
        const signature = req.get("x-hub-signature-256");
        const rawBody = req.body;

        if (!signature || !Buffer.isBuffer(rawBody)) {
            return res.status(401).json({ message: "Webhook signature verification failed." });
        }

        let isValidSignature;
        try {
            isValidSignature = await getWebhooks().verify(rawBody.toString("utf8"), signature);
        } catch (error) {
            console.error("GitHub webhook verification failed", { message: error.message });
            return res.status(401).json({ message: "Webhook signature verification failed." });
        }

        if (!isValidSignature) {
            return res.status(401).json({ message: "Webhook signature verification failed." });
        }

        let payload;
        try {
            payload = JSON.parse(rawBody.toString("utf8"));
        } catch {
            return res.status(400).json({ message: "Webhook payload is not valid JSON." });
        }

        const event = req.get("x-github-event");
        if (!payload.installation?.id) {
            return res.status(204).send();
        }
        const installationId = String(payload.installation.id);

        if (event === "installation" && payload.action === "created") {
            const githubUserId = String(payload.sender?.id || "");
            const oauthAccount = await OauthAccount.findOne({
                provider: "github",
                providerUserId: githubUserId,
            });

            // A valid GitHub webhook can be received without a matching app user
            // (for example, an installation was made by another organization admin).
            if (!oauthAccount) {
                return res.status(202).json({ message: "Installation received; no matching signed-in user." });
            }

            await GithubAppStatus.findOneAndUpdate(
                { installationId },
                {
                    $set: {
                        userId: oauthAccount.userId,
                        installed: true,
                        accountLogin: payload.installation.account?.login || "",
                    },
                },
                { upsert: true, new: true, runValidators: true },
            );

        }

        if (event === "installation" && payload.action === "deleted") {
            await GithubAppStatus.updateOne(
                { installationId },
                { $set: { installed: false } },
            );
            await Repository.deleteMany({ installationId: Number(installationId) });
        }

        // GitHub emits this event when a user removes selected repositories
        // from an otherwise active GitHub App installation.
        if (event === "installation_repositories" && payload.action === "removed") {
            const removedRepositoryIds = (payload.repositories_removed || [])
                .map((repository) => Number(repository.id))
                .filter(Number.isFinite);

            if (removedRepositoryIds.length) {
                await Repository.deleteMany({
                    installationId: Number(installationId),
                    githubRepositoryId: { $in: removedRepositoryIds },
                });
            }
        }

        return res.status(204).send();
    };
    fetchUserRepo = async (req, res) =>
    {
        const userId = req.user.sub;
        const githubAppStatus = await GithubAppStatus.findOne({ userId, installed: true });
        if (!githubAppStatus) {
            return res.status(404).json({
                message: "No verified GitHub App installation was found.",
            });
        }

        try {
            const repositories = await getInstallationRepositories(githubAppStatus.installationId);

            return res.json(repositories.map((repository) => ({
                id: String(repository.id),
                name: repository.name,
                visibility: repository.visibility,
                defaultBranch: repository.default_branch,
                language: repository.language,
                updatedAt: repository.updated_at,
            })));
        } catch (error) {
            console.error("GitHub repository sync failed", {
                status: error.status,
                message: error.message,
            });
            return res.status(502).json({
                message: "GitHub could not synchronize installation repositories.",
                githubStatus: error.status,
            });
        }
    };

    getRepositoryDetails = async (req, res) =>
    {
        const repositoryId = Number(req.params.repositoryId);
        if (!Number.isSafeInteger(repositoryId)) {
            return res.status(400).json({ message: "repositoryId must be a valid GitHub repository ID." });
        }

        const installation = await GithubAppStatus.findOne({ userId: req.user.sub, installed: true });
        if (!installation) {
            return res.status(404).json({ message: "No verified GitHub App installation was found." });
        }

        try {
            const repositories = await getInstallationRepositories(installation.installationId);
            const repository = repositories.find((item) => Number(item.id) === repositoryId);
            if (!repository) {
                return res.status(404).json({ message: "This repository is not accessible to the GitHub App." });
            }

            return res.json({
                id: String(repository.id),
                name: repository.name,
                fullName: repository.full_name,
                ownerLogin: repository.owner?.login,
                description: repository.description,
                visibility: repository.visibility,
                defaultBranch: repository.default_branch,
                language: repository.language,
                updatedAt: repository.updated_at,
                pushedAt: repository.pushed_at,
                htmlUrl: repository.html_url,
                topics: repository.topics || [],
                size: repository.size,
                archived: repository.archived,
                fork: repository.fork,
            });
        } catch (error) {
            return res.status(502).json({
                message: "GitHub could not load repository details.",
                githubStatus: error.status,
            });
        }
    };

    listImportedRepositories = async (req, res) =>
    {
        const repositories = await Repository.find({ owner: req.user.sub })
            .select("githubRepositoryId name fullName language defaultBranch importMode indexing createdAt updatedAt")
            .sort({ updatedAt: -1 })
            .lean();

        return res.json(repositories.map((repository) => ({
            id: String(repository.githubRepositoryId),
            name: repository.name,
            fullName: repository.fullName,
            language: repository.language || null,
            defaultBranch: repository.defaultBranch,
            importMode: repository.importMode,
            indexing: repository.indexing,
            createdAt: repository.createdAt,
            updatedAt: repository.updatedAt,
        })));
    };

    importRepository = async (req, res) =>
    {
        const repositoryId = Number(req.params.repositoryId);
        const mode = req.body.mode;

        if (!Number.isSafeInteger(repositoryId)) {
            return res.status(400).json({ message: "repositoryId must be a valid GitHub repository ID." });
        }
        if (!["INTELLIGENCE", "DOCUMENTATION"].includes(mode)) {
            return res.status(400).json({ message: "mode must be INTELLIGENCE or DOCUMENTATION." });
        }

        const alreadyImported = await Repository.findOne({ owner: req.user.sub, githubRepositoryId: repositoryId })
            .select("indexing.status")
            .lean();
        if (alreadyImported) {
            return res.status(409).json({
                message: "This repository has already been imported. Retry it from Imported repositories if processing failed.",
                status: alreadyImported.indexing?.status,
            });
        }

        const installation = await GithubAppStatus.findOne({ userId: req.user.sub, installed: true });
        if (!installation) {
            return res.status(404).json({ message: "No verified GitHub App installation was found." });
        }

        let repository;
        try {
            const repositories = await getInstallationRepositories(installation.installationId);
            repository = repositories.find((item) => Number(item.id) === repositoryId);
            if (!repository) {
                return res.status(404).json({ message: "This repository is not accessible to the GitHub App." });
            }
        } catch (error) {
            console.error("GitHub repository verification failed", {
                repositoryId,
                status: error.status,
                message: error.message,
            });
            return res.status(502).json({
                message: "GitHub could not verify this repository before import.",
                githubStatus: error.status,
            });
        }

        let savedRepository;
        try {

            const job = {
                userId: req?.user?.sub,
                repositoryId: repositoryId,
                installationId: installation?.installationId,
                cloneUrl: repository.clone_url,
            }
            savedRepository = await Repository.findOneAndUpdate(
                { owner: req.user.sub, githubRepositoryId: repositoryId },
                {
                    $set: {
                        ...toRepositoryDocument(repository, req.user.sub, installation.installationId),
                        importMode: mode,
                        "indexing.status": "QUEUED",
                        "indexing.progress": 0,
                        "indexing.lastError": null,
                    },
                },
                { upsert: true, new: true, runValidators: true },
            );

            const queueRes = await RabbitMqUtils.publishToQueue("repo-analysis", job)
            if (!queueRes) throw new Error("RabbitMQ did not accept the repository-analysis job.");

        } catch (error) {
            console.error("Repository import setup failed", {
                repositoryId,
                message: error.message,
            });

            if (savedRepository) {
                await Repository.updateOne(
                    { _id: savedRepository._id },
                    {
                        $set: {
                            "indexing.status": "FAILED",
                            "indexing.lastError": error.message,
                        },
                    },
                ).catch((updateError) => console.error("Could not record repository import failure", updateError));
            }

            return res.status(503).json({
                message: "Repository could not be queued for analysis. Ensure RabbitMQ is running and the backend is connected.",
            });
        }

        return res.status(201).json({
            id: savedRepository._id,
            githubRepositoryId: savedRepository.githubRepositoryId,
            importMode: savedRepository.importMode,
            status: savedRepository.indexing.status,
            message: "Repository imported and queued for processing.",
        });
    };

    retryRepositoryImport = async (req, res) =>
    {
        const repositoryId = Number(req.params.repositoryId);
        if (!Number.isSafeInteger(repositoryId)) return res.status(400).json({ message: "repositoryId must be a valid GitHub repository ID." });

        const repository = await Repository.findOne({ owner: req.user.sub, githubRepositoryId: repositoryId });
        if (!repository) return res.status(404).json({ message: "Imported repository was not found." });
        if (repository.indexing?.status !== "FAILED") return res.status(409).json({ message: "Only failed repositories can be retried.", status: repository.indexing?.status });

        try {
            const accepted = await RabbitMqUtils.publishToQueue("repo-analysis", {
                userId: String(req.user.sub),
                repositoryId,
                installationId: repository.installationId,
                cloneUrl: repository.cloneUrl,
            });
            if (!accepted) throw new Error("RabbitMQ did not accept the repository-analysis retry.");
            repository.indexing.status = "QUEUED";
            repository.indexing.progress = 0;
            repository.indexing.startedAt = null;
            repository.indexing.completedAt = null;
            repository.indexing.lastError = null;
            await repository.save();
        } catch {
            return res.status(503).json({ message: "Repository could not be queued for retry." });
        }
        return res.json({ id: String(repository.githubRepositoryId), status: repository.indexing.status, message: "Repository retry queued." });
    };

    getInstallationTokenForWorker = async (req, res) =>
    {
        const internalWorkerKey = process.env.INTERNAL_WORKER_KEY || process.env.INTERNAl_WORKER_KEY;
        if (!internalWorkerKey || req.get("X-Internal-Key") !== internalWorkerKey) {
            return res.status(401).send("Unauthorized");
        }

        const { installationId } = req.params
        const token = await getInstallationToken(installationId)
        if (!token) {
            return res.status(502).json({
                message: "Token is as empty",
            });
        }
        return res.status(200).json({
            message: "Use the token for accessing github app exposed endpoints",
            token: token
        });
    }
}

export default new GithubControllers();
