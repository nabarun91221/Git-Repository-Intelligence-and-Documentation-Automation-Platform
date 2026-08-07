
import { SemanticChunkBuilder } from "../semantic-chunks/index.js";
import embed from "../utils/generateEmbedding.js";
import storeEmbeddedChunks from "./store-embedded-chunks.js";
class DigestionPipeline
{
    #embeddingModel = process.env.EMBEDDING_MODEL;
    DigestOne = async (chunk, model = this.#embeddingModel) =>
    {
        if (!model) throw new Error("EMBEDDING_MODEL is not configured");
        if (!chunk.content) throw new Error("provided chunks doesn't include content")
        const embedding = await embed(chunk.content, model);
        return { ...chunk, embedding }

    }
    Digest = async (resolvedModel, graph, navigator) =>
    {
        const chunkBuilder = new SemanticChunkBuilder({ maxClassLines: 250, maxClassSourceLength: 12_000, })
        const chunks = chunkBuilder.build({
            resolvedModel,
            graph,
            navigator,
        });

        let embeddedChunks = await Promise.all(
            chunks.map(chunk => this.DigestOne(chunk))
        );
        const embeddingStoreResponse = await storeEmbeddedChunks(embeddedChunks);

        if (!embeddingStoreResponse) throw new Error("embeddingStoreResponse not found")
        return embeddingStoreResponse


    }
}
export default new DigestionPipeline();