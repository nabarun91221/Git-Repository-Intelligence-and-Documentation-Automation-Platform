import QueryCache from "./cache.js";
import RepositoryQuery from "./repository-query.js";
import SymbolQuery from "./symbol-query.js";
import DependencyQuery from "./dependency-query.js";
import Traversal from "./traversal.js";

function addToIndex(index, key, value) {
    if (!key) return;
    if (!index.has(key)) index.set(key, new Set());
    index.get(key).add(value);
}

function addEdgeIndex(index, nodeId, relation, edge) {
    if (!index.has(nodeId)) index.set(nodeId, new Map());
    const byRelation = index.get(nodeId);
    if (!byRelation.has(relation)) byRelation.set(relation, []);
    byRelation.get(relation).push(edge);
}

function trigrams(value) {
    const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();
    if (normalized.length < 3) return [normalized];
    const result = [];
    for (let index = 0; index <= normalized.length - 3; index += 1) result.push(normalized.slice(index, index + 3));
    return [...new Set(result)];
}

/**
 * Read-only façade over CodeKnowledgeGraph. All indexes are created once and
 * the original graph's nodes, edges, Map, and array are never mutated.
 */
export default class RepositoryNavigator {
    constructor(graph, { cacheSize = 1_000 } = {}) {
        if (!graph?.nodes || !graph?.edges) throw new Error("RepositoryNavigator requires a CodeKnowledgeGraph.");
        this.graph = graph;
        this.cache = new QueryCache(cacheSize);
        this.indexes = this.#buildIndexes();
        this.trigrams = trigrams;
        this.repository = new RepositoryQuery(this);
        this.symbols = new SymbolQuery(this);
        this.dependencies = new DependencyQuery(this);
        this.traversal = new Traversal(this);
    }

    #buildIndexes() {
        const indexes = {
            byType: new Map(),
            byName: new Map(),
            byQualifiedName: new Map(),
            byPath: new Map(),
            byTrigram: new Map(),
            outgoing: new Map(),
            incoming: new Map(),
            byRelation: new Map(),
            children: new Map(),
            parents: new Map(),
        };

        for (const node of this.graph.nodes.values()) {
            addToIndex(indexes.byType, node.type, node.id);
            addToIndex(indexes.byName, node.name.toLowerCase(), node.id);
            if (node.metadata?.qualifiedName) indexes.byQualifiedName.set(node.metadata.qualifiedName, node.id);
            if (node.metadata?.path) addToIndex(indexes.byPath, node.metadata.path, node.id);
            for (const trigram of trigrams(node.name)) addToIndex(indexes.byTrigram, trigram, node.id);
        }

        for (const edge of this.graph.edges) {
            addEdgeIndex(indexes.outgoing, edge.source, edge.relation, edge);
            addEdgeIndex(indexes.incoming, edge.target, edge.relation, edge);
            if (!indexes.byRelation.has(edge.relation)) indexes.byRelation.set(edge.relation, []);
            indexes.byRelation.get(edge.relation).push(edge);
            if (["CONTAINS", "DECLARES"].includes(edge.relation)) {
                addToIndex(indexes.children, edge.source, edge.target);
                addToIndex(indexes.parents, edge.target, edge.source);
            }
        }
        return indexes;
    }

    nodeIds() { return this.graph.nodes.keys(); }
    getNode(id) { return this.graph.nodes.get(id) || null; }
    getNodes(ids) { return [...ids].map((id) => this.getNode(id)).filter(Boolean); }

    edgesFrom(nodeId, relations = null) {
        const byRelation = this.indexes.outgoing.get(nodeId);
        if (!byRelation) return [];
        if (!relations) return [...byRelation.values()].flat();
        return relations.flatMap((relation) => byRelation.get(relation) || []);
    }

    edgesTo(nodeId, relations = null) {
        const byRelation = this.indexes.incoming.get(nodeId);
        if (!byRelation) return [];
        if (!relations) return [...byRelation.values()].flat();
        return relations.flatMap((relation) => byRelation.get(relation) || []);
    }

    *iterateEdges({ relations = null } = {}) {
        if (!relations) yield* this.graph.edges;
        else for (const relation of relations) yield* (this.indexes.byRelation.get(relation) || []);
    }

    neighborIds(nodeId, { relations = null, direction = "outgoing" } = {}) {
        const ids = new Set();
        if (["outgoing", "both"].includes(direction)) for (const edge of this.edgesFrom(nodeId, relations)) ids.add(edge.target);
        if (["incoming", "both"].includes(direction)) for (const edge of this.edgesTo(nodeId, relations)) ids.add(edge.source);
        return ids;
    }

    hasEdge(source, target, options = {}) {
        return this.edgesFrom(source, options.relations || null).some((edge) => edge.target === target);
    }

    // Convenience façade for the high-level public API.
    getRepository() { return this.repository.getRepository(); }
    getDirectories() { return this.repository.getDirectories(); }
    getFiles() { return this.repository.getFiles(); }
    getModules() { return this.repository.getModules(); }
    getSymbol(id) { return this.symbols.getSymbol(id); }
    getSymbolByQualifiedName(name) { return this.symbols.getSymbolByQualifiedName(name); }
    getChildren(id) { return this.symbols.getChildren(id); }
    getParent(id) { return this.symbols.getParent(id); }
    getContainingFile(id) { return this.symbols.getContainingFile(id); }
    getContainingModule(id) { return this.symbols.getContainingModule(id); }
    getDependencies(id, options) { return this.dependencies.getDependencies(id, options); }
    getDependents(id, options) { return this.dependencies.getDependents(id, options); }
    getImports(id) { return this.dependencies.getImports(id); }
    getExports(id) { return this.dependencies.getExports(id); }
    getCalls(id) { return this.dependencies.getCalls(id); }
    getCallers(id) { return this.dependencies.getCallers(id); }
    getInheritanceTree(id) { return this.dependencies.getInheritanceTree(id); }
    getImplementedInterfaces(id) { return this.dependencies.getImplementedInterfaces(id); }
    getSubgraph(id, depth, options) { return this.dependencies.getSubgraph(id, depth, options); }
    getRelatedSymbols(id) { return this.dependencies.getRelatedSymbols(id); }
    getDocumentationContext(id) { return this.dependencies.getDocumentationContext(id); }
    getNeighbourhood(id, depth) { return this.dependencies.getNeighbourhood(id, depth); }
    getPublicAPI(id) { return this.dependencies.getPublicAPI(id); }
    getEntryPoints() { return this.dependencies.getEntryPoints(); }
    getLeafComponents() { return this.dependencies.getLeafComponents(); }
    getRootComponents() { return this.dependencies.getRootComponents(); }
    getExternalDependencies() { return this.dependencies.getExternalDependencies(); }
    getInternalDependencies() { return this.dependencies.getInternalDependencies(); }
    bfs(id, options) { return this.traversal.bfs(id, options); }
    dfs(id, options) { return this.traversal.dfs(id, options); }
    topologicalOrder(options) { return this.traversal.topologicalOrder(options); }
    findConnectedComponents(options) { return this.traversal.findConnectedComponents(options); }
    findCycles(options) { return this.traversal.findCycles(options); }
    collapseStronglyConnectedComponents(options) { return this.traversal.collapseStronglyConnectedComponents(options); }
    searchByName(name, options) { return this.symbols.searchByName(name, options); }
    searchByType(type) { return this.symbols.searchByType(type); }
    searchByRelation(relation) { return this.symbols.searchByRelation(relation); }
    searchByPath(path, options) { return this.symbols.searchByPath(path, options); }
    fuzzySearch(query, options) { return this.symbols.fuzzySearch(query, options); }
}
