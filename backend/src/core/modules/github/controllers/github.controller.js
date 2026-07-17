import crypto from "crypto";

import OauthAccount from "../../auth/models/oauthAccount.model.js";
import GithubAppStatus from "../models/githubAppStatus.model.js";
import Repository from "../models/repository.model.js";
import fs from "node:fs";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const privateKeyPath = resolve(
    currentDirectory,
    "../../../secrets/codeatlasautomation.2026-07-10.private-key.pem",
);
const privateKey = fs.readFileSync(privateKeyPath, "utf8");

function createGitHubAppJwt()
{
    const appIssuer = process.env.GITHUB_APP_CLIENT_ID || process.env.GITHUB_CLIENT_ID || process.env.GITHUB_APP_ID;
    if (!appIssuer) {
        throw new Error("GitHub App client ID is not configured.");
    }

    return jwt.sign(
        {
            iat: Math.floor(Date.now() / 1000) - 60,
            exp: Math.floor(Date.now() / 1000) + 9 * 60,
            iss: appIssuer,
        },
        privateKey,
        { algorithm: "RS256" },
    );
}

async function getInstallationToken(installationId)
{
    const response = await fetch(
        `https://api.github.com/app/installations/${installationId}/access_tokens`,
        {
            method: "POST",
            headers: {
                Accept: "application/vnd.github+json",
                Authorization: `Bearer ${createGitHubAppJwt()}`,
                "X-GitHub-Api-Version": "2022-11-28",
            },
        },
    );
    const data = await response.json();

    if (!response.ok || !data.token) {
        const error = new Error(data.message || "GitHub rejected the App authentication request.");
        error.status = response.status;
        throw error;
    }

    return data.token;
}

async function getInstallationRepositories(installationId)
{
    const installationToken = await getInstallationToken(installationId);
    const response = await fetch("https://api.github.com/installation/repositories?per_page=100", {
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${installationToken}`,
            "X-GitHub-Api-Version": "2022-11-28",
        },
    });
    const data = await response.json();

    if (!response.ok) {
        const error = new Error(data.message || "GitHub could not return installation repositories.");
        error.status = response.status;
        throw error;
    }

    return data.repositories;
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
        const secret = process.env.GITHUB_WEBHOOK_SECRET;
        const signature = req.get("x-hub-signature-256");
        const rawBody = req.body;

        if (!secret || !signature || !Buffer.isBuffer(rawBody)) {
            return res.status(401).json({ message: "Webhook signature verification failed." });
        }

        const expectedSignature = `sha256=${crypto
            .createHmac("sha256", secret)
            .update(rawBody)
            .digest("hex")}`;
        const receivedSignature = Buffer.from(signature);
        const expectedSignatureBuffer = Buffer.from(expectedSignature);

        if (
            receivedSignature.length !== expectedSignatureBuffer.length ||
            !crypto.timingSafeEqual(receivedSignature, expectedSignatureBuffer)
        ) {
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
        console.log(event);
        console.log(payload.action);

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

    getRepositoryDetails = async (req, res) => {
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

    importRepository = async (req, res) => {
        const repositoryId = Number(req.params.repositoryId);
        const mode = req.body.mode;

        if (!Number.isSafeInteger(repositoryId)) {
            return res.status(400).json({ message: "repositoryId must be a valid GitHub repository ID." });
        }
        if (!["INTELLIGENCE", "DOCUMENTATION"].includes(mode)) {
            return res.status(400).json({ message: "mode must be INTELLIGENCE or DOCUMENTATION." });
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

            const savedRepository = await Repository.findOneAndUpdate(
                { githubRepositoryId: repositoryId },
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

            return res.status(201).json({
                id: savedRepository._id,
                githubRepositoryId: savedRepository.githubRepositoryId,
                importMode: savedRepository.importMode,
                status: savedRepository.indexing.status,
                message: "Repository imported and queued for processing.",
            });
        } catch (error) {
            return res.status(502).json({
                message: "GitHub could not verify this repository before import.",
                githubStatus: error.status,
            });
        }
    };
}

export default new GithubControllers();
