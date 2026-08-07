import CodebaseEmbedding from "../models/codebaseEmbedding.model.js";

/** Stores embedding-ready SemanticChunk records, replacing prior versions safely. */
export default async function storeEmbeddedChunks(chunks)
{
    if (!Array.isArray(chunks)) throw new TypeError("chunks must be an array.");
    if (chunks.length === 0) return { stored: 0, matched: 0, modified: 0, upserted: 0 };

    for (const chunk of chunks) {
        if (!chunk?.id || !chunk?.metadata?.repositoryId || !Array.isArray(chunk.embedding)) {
            console.log(chunk);
            throw new Error("Each chunk must include id, metadata.repositoryId, and embedding.");
        }
    }

    const result = await CodebaseEmbedding.bulkWrite(
        chunks.map((chunk) => ({
            updateOne: {
                filter: { id: chunk.id, "metadata.repositoryId": chunk.metadata.repositoryId },
                update: { $set: chunk },
                upsert: true,
            },
        })),
        { ordered: false },
    );

    return {
        stored: chunks.length,
        matched: result.matchedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedCount,
        repositoryId: chunks[0]?.metadata?.repositoryId
    };
}
