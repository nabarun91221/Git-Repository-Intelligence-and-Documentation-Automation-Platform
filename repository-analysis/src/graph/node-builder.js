import path from "node:path";
import { normalizePath, SymbolKind } from "../symbols/symbol.js";

const nodeTypes = Object.freeze({
    [SymbolKind.FILE]: "File",
    [SymbolKind.MODULE]: "Module",
    [SymbolKind.CLASS]: "Class",
    [SymbolKind.INTERFACE]: "Interface",
    [SymbolKind.ENUM]: "Enum",
    [SymbolKind.FUNCTION]: "Function",
    [SymbolKind.METHOD]: "Method",
    [SymbolKind.VARIABLE]: "Variable",
    [SymbolKind.CONSTANT]: "Variable",
    [SymbolKind.NAMESPACE]: "Namespace",
    [SymbolKind.TYPE_ALIAS]: "TypeAlias",
});

export function symbolToNode(symbol) {
    return {
        id: symbol.id,
        type: nodeTypes[symbol.kind] || "Symbol",
        name: symbol.name,
        metadata: {
            qualifiedName: symbol.qualifiedName,
            fileId: symbol.fileId,
            exported: symbol.exported,
            location: symbol.location,
            ...symbol.metadata,
        },
    };
}

export function directoryNodesFor(filePath) {
    const directories = [];
    const directoryName = normalizePath(path.posix.dirname(filePath));
    const parts = directoryName === "." ? [] : directoryName.split("/").filter(Boolean);
    for (let index = 0; index < parts.length; index += 1) {
        const directoryPath = parts.slice(0, index + 1).join("/");
        directories.push({
            id: `dir:${directoryPath}`,
            type: "Directory",
            name: parts[index],
            metadata: { path: directoryPath },
        });
    }
    return directories;
}
