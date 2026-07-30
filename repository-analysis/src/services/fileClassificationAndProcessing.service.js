import fs from "fs/promises";
import path from "path";

class FileClassificationAndProcessingService
{
    #ignoredDirectories = new Set([
        ".git",
        "node_modules",
        "dist",
        "build",
        ".next",
        ".idea",
        ".vscode",
        "coverage",
    ]);

    #ignoredExtensions = new Set([
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".ico",
        ".pdf",
        ".zip",
        ".lock",
    ]);

    shouldIgnore(filePath)
    {
        for (const dir of this.#ignoredDirectories) {
            if (filePath.includes(`/${dir}/`)) {
                return true;
            }
        }

        for (const ext of this.#ignoredExtensions) {
            if (filePath.endsWith(ext)) {
                return true;
            }
        }

        return false;
    }
    #extensionMap = {
        ".js": "javascript",
        ".mjs": "javascript",
        ".cjs": "javascript",

        ".ts": "typescript",
        ".tsx": "react-ts",
        ".jsx": "react",

        ".py": "python",

        ".java": "java",

        ".go": "go",

        ".cpp": "cpp",
        ".c": "c",

        ".cs": "csharp",

        ".php": "php",

        ".rb": "ruby",

        ".rs": "rust",

        ".json": "json",

        ".md": "markdown",

        ".yaml": "yaml",
        ".yml": "yaml",
    };

    #detectLanguage(file)
    {
        return this.#extensionMap[path.extname(file)] ?? "unknown";
    }
    async buildMetadata(filePath, repoRoot)
    {
        const stat = await fs.stat(filePath);

        return {
            path: path.relative(repoRoot, filePath),

            absolutePath: filePath,

            extension: path.extname(filePath),

            language: this.#detectLanguage(filePath),

            size: stat.size,

            lastModified: stat.mtime,
        };
    }
    async scanDirectory(directory)
    {
        const result = [];

        async function walk(currentPath)
        {
            const entries = await fs.readdir(currentPath, {
                withFileTypes: true,
            });

            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);

                if (entry.isDirectory()) {
                    await walk(fullPath);
                } else {
                    result.push(fullPath);
                }
            }
        }

        await walk(directory);

        return result;
    }

    removeProcessedRepoFromServer = async (repoPath) =>
    {
        try {
            await fs.rm(repoPath, {
                recursive: true,
                force: true,
            });
            return true
        } catch (error) {
            console.log(error);
            return false
        }

    }


}
export default new FileClassificationAndProcessingService()
