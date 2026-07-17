import mongoose from "mongoose";

const githubAppStatusSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    installed: {
        type: Boolean,
        default: false,
    },
    installationId: {
        type: String,
        required: true
    },
    accountLogin: {
        type: String,
        default: ""
    }
}, { timestamps: true });

// The same GitHub App installation must never be linked more than once.
githubAppStatusSchema.index({ installationId: 1 }, { unique: true });

export default mongoose.model("GithubAppStatus", githubAppStatusSchema)
