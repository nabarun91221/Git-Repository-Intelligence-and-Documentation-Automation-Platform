import "dotenv/config";
import mongoose from "mongoose";
import CodebaseEmbedding from "../models/codebaseEmbedding.model.js";

const INDEX_NAME = "vector_index";
const FILTER_FIELD = "metadata.repositoryId";

function embeddingField(fields) {
    return fields.find((field) => field.path === "embedding" && field.type === "vector");
}

async function ensureVectorIndex() {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured.");
    await mongoose.connect(process.env.MONGODB_URI);

    try {
        const indexes = await CodebaseEmbedding.collection.listSearchIndexes(INDEX_NAME).toArray();
        const existing = indexes[0];
        const existingDefinition = existing?.latestDefinition || existing?.definition;
        const existingFields = existingDefinition?.fields || [];
        const vector = embeddingField(existingFields);
        const dimensions = vector?.numDimensions || Number(process.env.EMBEDDING_DIMENSIONS);

        if (!dimensions) {
            throw new Error("The existing vector index has no embedding field. Set EMBEDDING_DIMENSIONS to your embedding length.");
        }

        const fields = existingFields
            .filter((field) => field.path !== FILTER_FIELD)
            .concat({ type: "filter", path: FILTER_FIELD });
        if (!embeddingField(fields)) {
            fields.unshift({ type: "vector", path: "embedding", numDimensions: dimensions, similarity: "cosine" });
        }

        const definition = { fields };
        if (existing) {
            await CodebaseEmbedding.collection.updateSearchIndex(INDEX_NAME, definition);
            console.log(`Requested update of ${INDEX_NAME}: added ${FILTER_FIELD} as a vector-search filter.`);
        } else {
            await CodebaseEmbedding.collection.createSearchIndex({ name: INDEX_NAME, definition });
            console.log(`Requested creation of ${INDEX_NAME} with ${FILTER_FIELD} as a vector-search filter.`);
        }
        console.log("Wait for the Atlas Search index status to become ACTIVE before running retrieval.");
    } finally {
        await mongoose.disconnect();
    }
}

ensureVectorIndex().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
