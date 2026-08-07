export default class ChunkFactory {
    constructor({ hasher, contentBuilder, metadataBuilder, validator, sourceLookup }) {
        Object.assign(this, { hasher, contentBuilder, metadataBuilder, validator, sourceLookup });
    }

    create(symbol, chunkType = symbol.kind) {
        const source = this.sourceLookup(symbol);
        if (!source) return null;
        const metadata = { ...this.metadataBuilder.build(symbol), contentHash: this.hasher.hash(source) };
        const chunk = {
            id: this.hasher.chunkId({ repositoryId: metadata.repositoryId, symbolId: symbol.id, chunkType }),
            chunkType,
            symbolId: symbol.id,
            symbolType: symbol.kind,
            symbolName: symbol.name,
            ...(metadata.parentSymbol ? { parentSymbol: metadata.parentSymbol } : {}),
            content: this.contentBuilder.build({
                repositoryId: metadata.repositoryId,
                filePath: metadata.filePath,
                symbol,
                parentSymbol: metadata.parentSymbol,
                source,
            }),
            metadata,
            embedding: null,
            embeddingVersion: 1,
        };
        return this.validator.validate(chunk) ? Object.freeze(chunk) : null;
    }
}
