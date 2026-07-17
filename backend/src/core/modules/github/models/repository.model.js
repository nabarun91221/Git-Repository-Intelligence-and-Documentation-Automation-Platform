import { Schema, model } from "mongoose";

const repositorySchema = new Schema(
    {
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        installationId: {
            type: Number,
            required: true,
            index: true,
        },

        githubRepositoryId: {
            type: Number,
            required: true,
            unique: true,
            index: true,
        },

        name: {
            type: String,
            required: true,
        },

        fullName: {
            type: String,
            required: true,
        },

        ownerLogin: {
            type: String,
            required: true,
        },

        description: String,

        defaultBranch: {
            type: String,
            default: "main",
        },

        cloneUrl: String,

        htmlUrl: String,

        language: String,

        topics: [String],

        visibility: {
            type: String,
            enum: ["public", "private", "internal"],
        },

        size: Number,

        archived: Boolean,

        disabled: Boolean,

        fork: Boolean,

        isInstalled: {
            type: Boolean,
            default: true,
        },

        importMode: {
            type: String,
            enum: ["INTELLIGENCE", "DOCUMENTATION"],
            required: true,
        },

        permissions: {
            admin: Boolean,
            push: Boolean,
            pull: Boolean,
        },

        indexing: {
            status: {
                type: String,
                enum: [
                    "NOT_STARTED",
                    "QUEUED",
                    "CLONING",
                    "SCANNING",
                    "PARSING",
                    "INDEXING",
                    "DOCUMENTING",
                    "COMPLETED",
                    "FAILED",
                ],
                default: "NOT_STARTED",
            },

            progress: {
                type: Number,
                default: 0,
            },

            startedAt: Date,

            completedAt: Date,

            lastError: String,
        },

        analysis: {
            commitSha: String,

            analyzedAt: Date,

            documentationVersion: Number,

            embeddingVersion: Number,

            parserVersion: Number,
        },

        local: {
            cloned: {
                type: Boolean,
                default: false,
            },

            path: String,

            lastPulledAt: Date,
        },

        github: {
            pushedAt: Date,

            updatedAt: Date,

            createdAt: Date,
        },
    },
    {
        timestamps: true,
    }
);

export default model("Repository", repositorySchema);
