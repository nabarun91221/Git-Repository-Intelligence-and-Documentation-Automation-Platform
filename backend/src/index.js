import { configDotenv } from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import connectMongoDb from "./core/configs/mongoDb.config.js";
import authRouter from "./core/modules/auth/routes/auth.routes.js"
import gitRouter from "./core/modules/github/routes/github.route.js";
import GithubController from "./core/modules/github/controllers/github.controller.js";
configDotenv()
const PORT = process.env.PORT || 8080;
const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
}));
// This must precede express.json() so the webhook signature is calculated from
// GitHub's unmodified request bytes.
app.post("/api/github/webhook", express.raw({ type: "application/json" }), GithubController.githubWebhook);
app.use(express.json());
app.use(cookieParser());
app.use("/api", authRouter);
app.use("/api", gitRouter);
app.listen(PORT, async () =>
{
    try {
        await connectMongoDb();
        console.log(`Server running at http://localhost:${PORT}`);
    } catch (error) {
        console.log(error);
    }
});
