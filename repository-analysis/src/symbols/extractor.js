import { createSymbol, normalizePath, SymbolKind, toLocation, withoutExtension } from "./symbol.js";

const definitions = Object.freeze([
    ["classes", SymbolKind.CLASS],
    ["interfaces", SymbolKind.INTERFACE],
    ["enums", SymbolKind.ENUM],
    ["namespaces", SymbolKind.NAMESPACE],
    ["typeAliases", SymbolKind.TYPE_ALIAS],
    ["functions", SymbolKind.FUNCTION],
    ["methods", SymbolKind.METHOD],
    ["variables", SymbolKind.VARIABLE],
]);

function isInside(outer, inner) {
    return outer.location
        && inner.location
        && outer.location.startOffset <= inner.location.startOffset
        && outer.location.endOffset >= inner.location.endOffset;
}

function exportedNames(ast) {
    return new Set((ast.exports || []).map((entry) => entry.name).filter(Boolean));
}

function uniqueId(baseId, usedIds, location) {
    if (!usedIds.has(baseId)) return baseId;
    return `${baseId}#${location?.startOffset ?? usedIds.size}`;
}

export default class SymbolExtractor {
    extract(asts, { repositoryId = "repository" } = {}) {
        const symbols = [];
        const symbolsByFile = new Map();
        const usedIds = new Set();

        for (const ast of asts) {
            const filePath = normalizePath(ast.path);
            const fileId = ast.fileId || filePath;
            const moduleName = withoutExtension(filePath);
            const fileSymbol = createSymbol({
                id: `file:${filePath}`,
                name: filePath.split("/").at(-1),
                kind: SymbolKind.FILE,
                qualifiedName: filePath,
                fileId,
                metadata: { path: filePath, language: ast.language },
            });
            const moduleSymbol = createSymbol({
                id: `module:${moduleName}`,
                name: moduleName.split("/").at(-1),
                kind: SymbolKind.MODULE,
                qualifiedName: moduleName,
                parent: fileSymbol.id,
                fileId,
                metadata: { path: filePath, language: ast.language },
            });
            const fileSymbols = [fileSymbol, moduleSymbol];
            usedIds.add(fileSymbol.id);
            usedIds.add(moduleSymbol.id);

            const exportNames = exportedNames(ast);
            const candidates = [];
            for (const [collection, kind] of definitions) {
                for (const node of ast[collection] || []) {
                    if (!node.name || node.name === "anonymous") continue;
                    candidates.push({ node, kind });
                }
            }
            candidates.sort((left, right) => left.node.startOffset - right.node.startOffset || right.node.endOffset - left.node.endOffset);

            const scopeStack = [moduleSymbol];
            for (const candidate of candidates) {
                const location = toLocation(candidate.node);
                while (scopeStack.length > 1 && !isInside(scopeStack.at(-1), { location })) scopeStack.pop();

                const canOwnScope = [SymbolKind.CLASS, SymbolKind.INTERFACE, SymbolKind.ENUM, SymbolKind.FUNCTION, SymbolKind.METHOD].includes(candidate.kind);
                const parent = candidate.kind === SymbolKind.METHOD
                    ? [...scopeStack].reverse().find((symbol) => [SymbolKind.CLASS, SymbolKind.INTERFACE].includes(symbol.kind)) || moduleSymbol
                    : scopeStack.at(-1);
                const baseQualifiedName = `${parent.qualifiedName}.${candidate.node.name}`;
                const id = uniqueId(baseQualifiedName, usedIds, location);
                const symbol = createSymbol({
                    id,
                    name: candidate.node.name,
                    kind: candidate.kind === SymbolKind.VARIABLE && candidate.node.kind === "const" ? SymbolKind.CONSTANT : candidate.kind,
                    qualifiedName: id,
                    parent: parent.id,
                    fileId,
                    exported: candidate.node.exported || exportNames.has(candidate.node.name),
                    location,
                    metadata: {
                        language: ast.language,
                        modifiers: candidate.node.modifiers || [],
                        parameters: candidate.node.parameters || [],
                        returnType: candidate.node.returnType || null,
                    },
                });
                fileSymbols.push(symbol);
                usedIds.add(id);
                if (canOwnScope) scopeStack.push(symbol);
            }

            symbols.push(...fileSymbols);
            symbolsByFile.set(fileId, fileSymbols);
        }

        return Object.freeze({ repositoryId, asts, symbols, symbolsByFile });
    }
}
