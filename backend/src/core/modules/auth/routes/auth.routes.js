import { Router } from "express";
import passport from "../configs/github.strategy.js";
import AuthControllers from "../controllers/auth.controller.js";

const authRouter = Router();

authRouter.use(passport.initialize());
authRouter.get("/auth/github", AuthControllers.githubLogin);
authRouter.get("/auth/github/callback", AuthControllers.githubCallback);
authRouter.get("/auth/github/failed", AuthControllers.githubAuthFailed);
authRouter.post("/auth/refresh", AuthControllers.refresh);
authRouter.post("/auth/logout", AuthControllers.logout);

export default authRouter;
