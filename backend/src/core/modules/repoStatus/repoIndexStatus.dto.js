import Joi from "joi";
import { IndexingStatus } from "../github/models/repository.model.js";
export const updateRepoIndexingStatusDto = Joi.object({
    status: Joi.string()
        .valid(...Object.values(IndexingStatus))
        .default("NOT_STARTED"),

    progress: Joi.number()
        .min(0)
        .max(100)
        .default(0),

    startedAt: Joi.date().optional(),

    completedAt: Joi.date().optional(),

    lastError: Joi.string().optional().allow(""),
});