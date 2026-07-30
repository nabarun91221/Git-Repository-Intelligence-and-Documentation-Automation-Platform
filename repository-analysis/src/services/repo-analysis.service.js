import "dotenv/config.js"
import GithubService from "./github.service.js"
import path from "node:path"
import process from "node:process"
import fs from "node:fs/promises"
import FileClassificationAndProcessingService from "./fileClassificationAndProcessing.service.js"
import ContentExtractor from "../utils/content.extractor.js"
import parserRegistry from "../parsers/index.js"
import { buildKnowledgePipeline } from "../knowledge-pipeline.js"
import { createArchitectureDiagramService } from "../architecture-diagram/index.js"
class RepoAnalysisService
{
    async #scanRepository(repoPath)
    {
        const files = await FileClassificationAndProcessingService.scanDirectory(repoPath);

        const metadata = [];

        for (const file of files) {
            if (FileClassificationAndProcessingService.shouldIgnore(file)) continue;

            metadata.push(await FileClassificationAndProcessingService.buildMetadata(file, repoPath));
        }

        return metadata;
    }
    async #extractAsts(metadata)
    {
        const asts = [];

        for (const file of metadata) {
            console.log(file?.path)
            const parser = parserRegistry.get(file.language);
            if (!parser) continue;

            const sourceFile = await ContentExtractor.extract(file);
            if (!sourceFile.content) continue;

            asts.push(parser.extract(sourceFile));
        }

        return asts;
    }
    test = async (job) =>
    {
        try {


            const internalWorkerKey = process.env.INTERNAL_WORKER_KEY || process.env.INTERNAl_WORKER_KEY;
            const backendUrl = process.env.BACKEND_INTERNAL_URL || "http://localhost:8080";

            if (!internalWorkerKey) throw new Error("INTERNAL_WORKER_KEY is missing");
            if (!job.installationId) throw new Error("installation id is missing");

            const githubAppInstallationTokenResponse = await fetch(
                `${backendUrl}/api/internal/github/installation/token/${job.installationId}`,
                {
                    method: "GET",
                    headers: {
                        "X-Internal-Key": internalWorkerKey,
                    },
                },
            );

            const responseBody = await githubAppInstallationTokenResponse.json().catch(() => ({}));
            if (!githubAppInstallationTokenResponse.ok) {
                throw new Error(
                    `Could not obtain GitHub installation token (HTTP ${githubAppInstallationTokenResponse.status}): ${responseBody.message || "Unknown error"}`,
                );
            }
            if (!responseBody.token) {
                throw new Error("Backend returned a successful token response without a token.");
            }

            const folderPath = path.join(process.cwd(), "repositories");
            await fs.mkdir(folderPath, { recursive: true });

            const repositoryUrl = job.cloneUrl || job.url;
            if (!repositoryUrl) throw new Error("repository clone URL is missing");

            const cloneUrl = repositoryUrl.replace(
                /^https:\/\/api\.github\.com\/repos\/([^/]+)\/([^/]+)\/?$/,
                "https://github.com/$1/$2.git",
            );

            const targetPath = path.join(folderPath, String(job.repositoryId));
            const gitFetchRepoCode = await GithubService.fetchRepo(responseBody.token, cloneUrl, targetPath);
            if (gitFetchRepoCode !== 0) throw new Error("couldn't fetch repository");
            else {
                console.log("Git repo fetched successfully..")
            }

            const metadata = await this.#scanRepository(path.join(targetPath))
            if (!metadata && metadata.length) throw new Error("File classification failed")

            else console.log("Metadata extracted successfully from files of the repo.")

            console.log("parsing files:")
            const asts = await this.#extractAsts(metadata);
            console.dir(asts[3], { depth: null, colors: true })
            console.log("ASTs length: ", asts.length)

            const { resolvedModel, graph, navigator } = buildKnowledgePipeline(asts, {
                repositoryId: String(job.repositoryId),
            });
            console.log(`Knowledge graph built: ${resolvedModel.symbols.length} symbols, ${graph.nodes.size} nodes, ${graph.edges.length} edges.`);
            const diagramService = createArchitectureDiagramService(navigator);
            // for frontend
            const diagram = diagramService.build({
                depth: 2,
                maxNodes: 80,
            });
            //server console showcase
            const mermaidDiagram = diagramService.toMermaid({
                title: "Repository Architecture",
                maxNodes: 80,
            });

            console.log(mermaidDiagram);

            const repoDeleteStatus = await FileClassificationAndProcessingService.removeProcessedRepoFromServer(targetPath)
            if (!repoDeleteStatus) {
                console.log("Repo deletion from server failed.")
                throw new Error("Repo deletion from server failed.")
            }
            else console.log("Working clean.")

        } catch (error) {

            console.log(error)
        }
    }
}
export default new RepoAnalysisService()
