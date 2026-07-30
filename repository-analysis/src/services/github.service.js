import { spawn } from "node:child_process"

class GitHubServices
{
    fetchRepo = async (installationToken, url, path) =>
    {
        const authenticatedUrl = new URL(url);
        authenticatedUrl.username = "x-access-token";
        authenticatedUrl.password = installationToken;

        const command = Object.freeze({
            GIT: "git"
        })
        return new Promise((resolve, reject) =>
        {
            const git = spawn(command.GIT, [
                "clone",
                authenticatedUrl.toString(),
                path,
            ]);

            git.stdout.on("data", (data) => console.log(data.toString()));
            git.stderr.on("data", (data) => console.error(data.toString()));
            git.on("error", reject);
            git.on("close", (code) =>
            {
                console.log(`Git exited with code ${code}`);
                resolve(code);
            });
        });
    }
}
export default new GitHubServices();
