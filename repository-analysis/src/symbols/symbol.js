import path from "node:path";

export const SymbolKind = Object.freeze({
    FILE: "file",
    MODULE: "module",
    CLASS: "class",
    INTERFACE: "interface",
    ENUM: "enum",
    FUNCTION: "function",
    METHOD: "method",
    VARIABLE: "variable",
    CONSTANT: "constant",
    NAMESPACE: "namespace",
    TYPE_ALIAS: "type-alias",
});

export function normalizePath(value) {
    return value.split(path.sep).join("/").replace(/^\.\//, "");
}

export function withoutExtension(filePath) {
    const normalized = normalizePath(filePath);
    return normalized.slice(0, normalized.length - path.extname(normalized).length);
}

export function toLocation(node) {
    return {
        startLine: node.startLine,
        endLine: node.endLine,
        startOffset: node.startOffset,
        endOffset: node.endOffset,
    };
}

export function createSymbol({ id, name, kind, qualifiedName = id, parent = null, fileId, exported = false, location = null, metadata = {} }) {
    if (!id || !name || !kind || !fileId) {
        throw new Error("A symbol requires id, name, kind, and fileId.");
    }

    return Object.freeze({
        id,
        name,
        kind,
        qualifiedName,
        parent,
        fileId,
        exported: Boolean(exported),
        location,
        metadata,
    });
}
