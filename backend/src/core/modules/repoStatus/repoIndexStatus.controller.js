import Repository, { IndexingStatus } from "../github/models/repository.model.js";

class RepoIndexStatusController
{
    updateRepoIndexingStatus = async (req, res) =>
    {
        try {
            const internalWorkerKey = process.env.INTERNAL_WORKER_KEY || process.env.INTERNAl_WORKER_KEY;
            if (!internalWorkerKey || req.get("X-Internal-Key") !== internalWorkerKey) {
                return res.status(401).send("Unauthorized");
            }
            const { userId, repositoryId } = req.params
            if (!userId || !repositoryId) return res.status(400).send("userId or repositoryId is missing.")
            const owner = userId;
            const isExist = await Repository.exists({ owner, githubRepositoryId: Number(repositoryId) });
            if (!isExist) return res.status(400).send(`no repository found with the userId: ${userId}, repositoryId: ${repositoryId}`)

            const { status, progress, lastError, startedAt, completedAt } = req.body || {};
            if (status && !Object.values(IndexingStatus).includes(status)) return res.status(422).send("Invalid indexing status.");
            if (progress !== undefined && (!Number.isFinite(progress) || progress < 0 || progress > 100)) return res.status(422).send("progress must be between 0 and 100.");
            const set = {};
            if (status) set["indexing.status"] = status;
            if (progress !== undefined) set["indexing.progress"] = progress;
            if (lastError !== undefined) set["indexing.lastError"] = lastError;
            if (startedAt !== undefined) set["indexing.startedAt"] = startedAt;
            if (completedAt !== undefined) set["indexing.completedAt"] = completedAt;

            const updatedRepo = await Repository.findOneAndUpdate({ owner, githubRepositoryId: Number(repositoryId) }, { $set: set }, { new: true })
            if (updatedRepo) return res.json(updatedRepo.indexing)
        } catch (error) {
            console.log(error);
            return res.status(500).send("something went wrong while updating indexing status")
        }


    }
    getRepoIndexingStatus = async (req, res) =>
    {
        try {
            const { repositoryId } = req.params
            const userId = req.user.sub
            const owner = userId
            const repo = await Repository.findOne({ owner, githubRepositoryId: Number(repositoryId) })
            if (!repo) return res.status(400).send(`no repository found with the userId: ${userId}, repositoryId: ${repositoryId}`)
            return res.send(repo?.indexing)
        } catch (error) {
            console.log(error);
            return res.status(500).send("something went wrong while getting indexing status")
        }


    }
}

export default new RepoIndexStatusController()
