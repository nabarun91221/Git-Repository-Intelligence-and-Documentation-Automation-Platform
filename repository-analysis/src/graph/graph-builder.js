import CodeKnowledgeGraph from "./graph.js";
import { createEdge } from "./edge-builder.js";
import { directoryNodesFor, symbolToNode } from "./node-builder.js";
import { Relation } from "./relations.js";
import { normalizePath, SymbolKind } from "../symbols/symbol.js";

export default class GraphBuilder {
    build(resolvedModel) {
        const graph = new CodeKnowledgeGraph();
        const repositoryId = `repository:${resolvedModel.repositoryId}`;
        graph.addNode({ id: repositoryId, type: "Repository", name: resolvedModel.repositoryId, metadata: {} });

        const symbolsById = new Map(resolvedModel.symbols.map((symbol) => [symbol.id, symbol]));
        const fileSymbols = resolvedModel.symbols.filter((symbol) => symbol.kind === SymbolKind.FILE);
        for (const symbol of resolvedModel.symbols) graph.addNode(symbolToNode(symbol));

        for (const fileSymbol of fileSymbols) {
            const filePath = normalizePath(fileSymbol.metadata.path);
            const directories = directoryNodesFor(filePath);
            for (const directory of directories) graph.addNode(directory);
            if (directories.length === 0) graph.addEdge(createEdge(repositoryId, fileSymbol.id, Relation.CONTAINS));
            else {
                graph.addEdge(createEdge(repositoryId, directories[0].id, Relation.CONTAINS));
                for (let index = 1; index < directories.length; index += 1) {
                    graph.addEdge(createEdge(directories[index - 1].id, directories[index].id, Relation.CONTAINS));
                }
                graph.addEdge(createEdge(directories.at(-1).id, fileSymbol.id, Relation.CONTAINS));
            }
        }

        for (const symbol of resolvedModel.symbols) {
            if (!symbol.parent) continue;
            const relation = [SymbolKind.VARIABLE, SymbolKind.CONSTANT].includes(symbol.kind)
                ? Relation.DECLARES
                : Relation.CONTAINS;
            graph.addEdge(createEdge(symbol.parent, symbol.id, relation));
        }

        for (const relation of resolvedModel.relations) {
            graph.addEdge(createEdge(relation.source, relation.target, relation.relation, relation.metadata));
        }

        // Optional semantic usage relations can be supplied by future language adapters.
        // The graph still does not inspect ASTs; it only consumes resolved references.
        for (const usage of resolvedModel.usages || []) {
            graph.addEdge(createEdge(usage.source, usage.target, usage.relation, usage.metadata));
        }

        return graph;
    }
}
