import ollama from "ollama";
import embed from "../utils/generateEmbedding.js";
import CodebaseEmbedding from "../models/codebaseEmbedding.model.js";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

/** Retrieves and cites semantic chunks belonging to exactly one repository. */
class RagRetrievalPipeline {
    #chatModel = process.env.OLLAMA_CHAT_MODEL;
    #embeddingModel = process.env.EMBEDDING_MODEL;

    #getChatModel() {
        const model = process.env.OLLAMA_CHAT_MODEL || this.#chatModel;
        if (!model) throw new Error("OLLAMA_CHAT_MODEL is not configured");
        return model;
    }

    #getEmbeddingModel() {
        const model = process.env.EMBEDDING_MODEL || this.#embeddingModel;
        if (!model) throw new Error("EMBEDDING_MODEL is not configured");
        return model;
    }

    #vectorQuery(queryVector, repositoryId, limit) {
        return [
            {
                $vectorSearch: {
                    index: "vector_index",
                    path: "embedding",
                    queryVector,
                    // `metadata.repositoryId` must be configured as a filter field
                    // in the MongoDB Atlas vector index.
                    filter: { "metadata.repositoryId": repositoryId },
                    numCandidates: Math.max(limit * 20, 100),
                    limit,
                },
            },
            {
                $project: {
                    _id: 0,
                    id: 1,
                    chunkType: 1,
                    symbolId: 1,
                    symbolType: 1,
                    symbolName: 1,
                    parentSymbol: 1,
                    content: 1,
                    metadata: 1,
                    score: { $meta: "vectorSearchScore" },
                },
            },
        ];
    }

    #responseSchema = {
        type: "object",
        properties: {
            answer: { type: "string" },
            confidence: { type: "number" },
            sources: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        chunkId: { type: "string" },
                        filePath: { type: "string" },
                        symbolName: { type: "string" },
                        startLine: { type: "number" },
                        endLine: { type: "number" },
                    },
                    required: ["chunkId", "filePath", "symbolName"],
                },
            },
            followup_questions: { type: "array", items: { type: "string" } },
        },
        required: ["answer", "confidence", "sources", "followup_questions"],
    };

    /**
     * @param {string} question semantic query text
     * @param {{ repositoryId: string, limit?: number }} options
     */
    retrieve = async (question, { repositoryId, limit = DEFAULT_LIMIT } = {}) => {
        if (!question?.trim()) throw new Error("A non-empty retrieval question is required.");
        if (!repositoryId) throw new Error("repositoryId is required for repository-scoped retrieval.");
        const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
        const queryEmbedding = await embed(question, this.#getEmbeddingModel());
        return CodebaseEmbedding.aggregate(this.#vectorQuery(queryEmbedding, String(repositoryId), safeLimit));
    };

    #createPrompt(question, chunks, memoryMessages = []) {
        const context = chunks.map((chunk) => {
            const { metadata = {} } = chunk;
            return [
                `CHUNK_ID: ${chunk.id}`,
                `FILE: ${metadata.filePath || "unknown"}`,
                `SYMBOL: ${chunk.symbolName} (${chunk.symbolType})`,
                `LINES: ${metadata.startLine ?? "?"}-${metadata.endLine ?? "?"}`,
                `RELEVANCE: ${chunk.score ?? "unknown"}`,
                "CODE:",
                chunk.content,
            ].join("\n");
        }).join("\n\n---\n\n");
        const memory = memoryMessages
            .filter((message) => message?.role && message?.content)
            .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
            .join("\n");

        return `You are a repository code assistant.

Rules:
1. Answer only from the provided repository chunks.
2. If the answer is not in the chunks, say "I could not find the answer."
3. Cite each factual claim with its exact chunk ID in sources.
4. Sources must use chunkId, filePath, symbolName, startLine, and endLine.
5. Conversation memory may clarify the question but is not factual evidence.
6. Return only JSON matching the requested schema.

Conversation memory:
${memory || "None"}

Repository chunks:
${context || "No matching repository chunks were found."}

Question:
${question}`;
    }

    async #generate(question, chunks, memoryMessages = []) {
        if (!question?.trim()) throw new Error("A non-empty question is required.");
        const response = await ollama.chat({
            model: this.#getChatModel(),
            format: this.#responseSchema,
            messages: [{ role: "user", content: this.#createPrompt(question, chunks, memoryMessages) }],
            options: { temperature: 0.1, top_p: 0.9 },
        });
        return JSON.parse(response.message.content);
    }

    generate = (question, chunks) => this.#generate(question, chunks);
    generateWithMemory = (question, chunks, memoryMessages = []) => this.#generate(question, chunks, memoryMessages);

    /** Performs repository-scoped retrieval followed by a grounded answer. */
    answer = async (question, options, memoryMessages = []) => {
        const chunks = await this.retrieve(question, options);
        const response = await this.#generate(question, chunks, memoryMessages);
        return { ...response, chunks };
    };
}

export default new RagRetrievalPipeline();
