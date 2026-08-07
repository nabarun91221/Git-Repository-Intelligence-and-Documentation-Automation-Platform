const allowedKinds = new Set(["class", "interface", "enum", "function", "method", "type-alias", "variable", "constant"]);

export default class ChunkValidator {
    validate(chunk) {
        if (!chunk?.id || !chunk.symbolId || !allowedKinds.has(chunk.symbolType)) return false;
        if (typeof chunk.content !== "string" || !chunk.content.trim()) return false;
        return chunk.embedding === null && chunk.embeddingVersion === 1;
    }
}
