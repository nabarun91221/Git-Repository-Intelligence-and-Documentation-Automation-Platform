import { Router } from "express";
import verifyRequestJwt from "../../../middlewares/auth.middleware.js";
import GithubController from "../controllers/github.controller.js";
const gitRouter = Router();

gitRouter.post("/github/install", verifyRequestJwt, GithubController.gitAppInstallVerification);
gitRouter.get("/github/app/status", verifyRequestJwt, GithubController.gitAppInstallStatus);
gitRouter.get("/repositories", verifyRequestJwt, GithubController.fetchUserRepo);
gitRouter.get("/repositories/:repositoryId", verifyRequestJwt, GithubController.getRepositoryDetails);
gitRouter.post("/repositories/:repositoryId/import", verifyRequestJwt, GithubController.importRepository);
export default gitRouter;
