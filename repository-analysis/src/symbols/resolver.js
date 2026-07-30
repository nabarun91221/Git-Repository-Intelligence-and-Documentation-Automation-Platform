import path from "node:path";
import SymbolTable from "./symbol-table.js";
import { normalizePath, SymbolKind, toLocation, withoutExtension } from "./symbol.js";

function fileKey(ast) {
    return ast.fileId || normalizePath(ast.path);
}

function buildFileIndex(asts) {
    const index = new Map();
    for (const ast of asts) {
        const filePath = normalizePath(ast.path);
        const id = fileKey(ast);
        index.set(filePath, id);
        index.set(withoutExtension(filePath), id);
        index.set(`${withoutExtension(filePath)}/index`, id);
    }
    return index;
}

function resolveModule(moduleName, fromPath, fileIndex) {
    if (!moduleName?.startsWith(".")) return null;
    const candidate = normalizePath(path.posix.normalize(path.posix.join(path.posix.dirname(fromPath), moduleName)));
    return fileIndex.get(candidate)
        || [".js", ".mjs", ".cjs", ".ts", ".tsx", ".py", ".java", ".go", ".rs"].map((extension) => fileIndex.get(`${candidate}${extension}`)).find(Boolean)
        || null;
}

function unresolved(reference) {
    return { ...reference, resolved: false, targetSymbol: null };
}

function pickDefinition(candidates, allowedKinds = null) {
    return candidates.find((symbol) => ![SymbolKind.FILE, SymbolKind.MODULE].includes(symbol.kind)
        && (!allowedKinds || allowedKinds.includes(symbol.kind))) || null;
}

export default class SymbolResolver {
    resolve(extraction) {
        const table = new SymbolTable(extraction.symbols);
        const fileIndex = buildFileIndex(extraction.asts);
        const fileSymbols = new Map(
            extraction.symbols
                .filter((symbol) => symbol.kind === SymbolKind.FILE)
                .map((symbol) => [symbol.fileId, symbol]),
        );
        const moduleSymbols = new Map(
            extraction.symbols
                .filter((symbol) => symbol.kind === SymbolKind.MODULE)
                .map((symbol) => [symbol.fileId, symbol]),
        );
        const defaultExports = new Map();
        for (const ast of extraction.asts) {
            const defaultExport = (ast.exports || []).find((entry) => entry.kind === "default");
            if (!defaultExport) continue;
            const target = pickDefinition(table.findByName(defaultExport.name, { fileId: fileKey(ast) }));
            if (target) defaultExports.set(fileKey(ast), target);
        }
        const resolvedFiles = [];
        const relations = [];

        for (const ast of extraction.asts) {
            const fileId = fileKey(ast);
            const fileSymbol = fileSymbols.get(fileId);
            const localImports = new Map();
            const imports = (ast.imports || []).map((entry) => {
                const targetFile = resolveModule(entry.module, normalizePath(ast.path), fileIndex);
                const resolved = Boolean(targetFile);
                if (resolved) relations.push({ source: fileSymbol.id, target: fileSymbols.get(targetFile).id, relation: "IMPORTS", metadata: { module: entry.module } });
                const bindings = (entry.imports || []).map((binding) => {
                    let target = null;
                    if (targetFile && binding.imported === "*") target = moduleSymbols.get(targetFile) || null;
                    else if (targetFile && binding.imported === "default") target = defaultExports.get(targetFile) || null;
                    else if (targetFile) target = pickDefinition(table.findExported(binding.imported, targetFile));
                    const resolvedBinding = {
                        ...binding,
                        targetSymbol: target?.id || null,
                        resolved: Boolean(target),
                    };
                    localImports.set(binding.local, { ...resolvedBinding, targetFile, target });
                    return resolvedBinding;
                });
                return { ...entry, imports: bindings, targetFile, resolved };
            });

            const exports = (ast.exports || []).map((entry) => {
                const target = pickDefinition(table.findByName(entry.name, { fileId }));
                if (target) relations.push({ source: fileSymbol.id, target: target.id, relation: "EXPORTS", metadata: { kind: entry.kind } });
                return { ...entry, targetSymbol: target?.id || null, resolved: Boolean(target) };
            });

            const resolveName = (name) => {
                const root = name.split(".")[0];
                const imported = localImports.get(root);
                if (imported?.targetFile) {
                    const memberName = name.split(".").at(-1);
                    if (memberName !== root && imported.target) {
                        return table.findByName(memberName, { fileId: imported.target.fileId })
                            .find((symbol) => symbol.parent === imported.target.id) || imported.target;
                    }
                    return imported.target;
                }
                return pickDefinition(table.findByName(root, { fileId }))
                    || pickDefinition(table.findByName(root, { exportedOnly: true }));
            };

            const calls = (ast.calls || []).map((entry) => {
                const target = resolveName(entry.callee);
                const source = table.findContainingScope(fileId, toLocation(entry));
                if (source && target) relations.push({ source: source.id, target: target.id, relation: "CALLS", metadata: { callee: entry.callee } });
                return target ? { ...entry, targetSymbol: target.id, resolved: true } : unresolved(entry);
            });

            const classes = (ast.classes || []).map((entry) => {
                const source = pickDefinition(table.findByName(entry.name, { fileId }), [SymbolKind.CLASS]);
                const extendsTarget = entry.extends ? resolveName(entry.extends) : null;
                const implementsTargets = (entry.implements || []).map((name) => ({ name, target: resolveName(name) }));
                if (source && extendsTarget) relations.push({ source: source.id, target: extendsTarget.id, relation: "EXTENDS", metadata: {} });
                for (const target of implementsTargets) if (source && target.target) relations.push({ source: source.id, target: target.target.id, relation: "IMPLEMENTS", metadata: {} });
                return {
                    ...entry,
                    extends: entry.extends ? { name: entry.extends, targetSymbol: extendsTarget?.id || null, resolved: Boolean(extendsTarget) } : null,
                    implements: implementsTargets.map(({ name, target }) => ({ name, targetSymbol: target?.id || null, resolved: Boolean(target) })),
                };
            });

            resolvedFiles.push({ ...ast, imports, exports, classes, calls });
        }

        return Object.freeze({
            repositoryId: extraction.repositoryId,
            symbols: extraction.symbols,
            symbolTable: table,
            files: resolvedFiles,
            relations,
        });
    }
}
