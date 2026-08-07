const names = (nodes) => [...new Set((nodes || []).map((node) => node.id).filter(Boolean))].sort();

/**
 * Enriches a chunk with immediate graph neighbours only. Results are memoized so
 * symbols represented by more than one planning step never repeat graph queries.
 */
export default class ChunkMetadataBuilder {
    constructor({ resolvedModel, navigator }) {
        this.resolvedModel = resolvedModel;
        this.navigator = navigator;
        this.cache = new Map();
        this.files = new Map((resolvedModel.files || []).map((file) => [file.fileId || file.id || file.path, file]));
    }

    build(symbol) {
        const cached = this.cache.get(symbol.id);
        if (cached) return cached;

        const parent = this.navigator?.getParent?.(symbol.id);
        const file = this.files.get(symbol.fileId);
        const metadata = {
            repositoryId: this.resolvedModel.repositoryId,
            fileId: symbol.fileId,
            filePath: file?.path || this.navigator?.getContainingFile?.(symbol.id)?.metadata?.path || null,
            language: symbol.metadata?.language || file?.language || null,
            symbolId: symbol.id,
            symbolType: symbol.kind,
            symbolName: symbol.name,
            ...(parent ? { parentSymbol: parent.name } : {}),
            exported: Boolean(symbol.exported),
            visibility: this.#visibility(symbol),
            startLine: symbol.location?.startLine ?? null,
            endLine: symbol.location?.endLine ?? null,
        };

        const context = this.#context(symbol, parent, file);
        for (const [key, value] of Object.entries(context)) if (value.length) metadata[key] = value;
        this.cache.set(symbol.id, Object.freeze(metadata));
        return metadata;
    }

    #visibility(symbol) {
        const modifiers = symbol.metadata?.modifiers || [];
        return ["public", "private", "protected", "internal"].find((item) => modifiers.includes(item)) || "public";
    }

    #context(symbol, parent, file) {
        if (!this.navigator) return {};
        const fileNode = file ? this.navigator.getContainingFile?.(symbol.id) : null;
        return {
            imports: names(fileNode ? this.navigator.getImports?.(fileNode.id) : []),
            calls: names(this.navigator.getCalls?.(symbol.id)),
            calledBy: names(this.navigator.getCallers?.(symbol.id)),
            inherits: symbol.kind === "class" ? names(this.navigator.getInheritanceTree?.(symbol.id)?.slice(1)) : [],
            implements: symbol.kind === "class" ? names(this.navigator.getImplementedInterfaces?.(symbol.id)) : [],
            children: names(this.navigator.getChildren?.(symbol.id)),
        };
    }
}
