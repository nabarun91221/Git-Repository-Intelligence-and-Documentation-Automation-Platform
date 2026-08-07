import { Router } from "express";
import RepoIndexStatusController from "./repoIndexStatus.controller.js"
import verifyRequestJwt from "../../middlewares/auth.middleware.js";
const repoStatusRouter = Router()

repoStatusRouter.get("/repostatus/:repositoryId", verifyRequestJwt, RepoIndexStatusController.getRepoIndexingStatus);
repoStatusRouter.post("/repostatus/update/:userId/:repositoryId", RepoIndexStatusController.updateRepoIndexingStatus)

export default repoStatusRouter;