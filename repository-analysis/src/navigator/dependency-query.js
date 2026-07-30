const dependencyRelations = ["IMPORTS", "CALLS", "EXTENDS", "IMPLEMENTS", "USES", "READS", "WRITES"];

export default class DependencyQuery {
    constructor(navigator) { this.navigator = navigator; }

    getDependencies(symbolId, { relations = dependencyRelations } = {}) {
        return this.navigator.getNodes(this.navigator.neighborIds(symbolId, { relations }));
    }

    getDependents(symbolId, { relations = dependencyRelations } = {}) {
        return this.navigator.getNodes(this.navigator.neighborIds(symbolId, { relations, direction: "incoming" }));
    }

    getImports(fileId) { return this.navigator.getNodes(this.navigator.neighborIds(fileId, { relations: ["IMPORTS"] })); }
    getExports(fileId) { return this.navigator.getNodes(this.navigator.neighborIds(fileId, { relations: ["EXPORTS"] })); }
    getCalls(symbolId) { return this.navigator.getNodes(this.navigator.neighborIds(symbolId, { relations: ["CALLS"] })); }
    getCallers(symbolId) { return this.navigator.getNodes(this.navigator.neighborIds(symbolId, { relations: ["CALLS"], direction: "incoming" })); }

    getInheritanceTree(classId) {
        const result = [];
        const visited = new Set();
        let currentId = classId;
        while (currentId && !visited.has(currentId)) {
            visited.add(currentId);
            const node = this.navigator.getNode(currentId);
            if (!node) break;
            result.push(node);
            currentId = this.navigator.neighborIds(currentId, { relations: ["EXTENDS"] }).values().next().value;
        }
        return result;
    }

    getImplementedInterfaces(classId) {
        return this.navigator.getNodes(this.navigator.neighborIds(classId, { relations: ["IMPLEMENTS"] }));
    }

    getSubgraph(rootId, depth = 1, { relations = null, direction = "both" } = {}) {
        const visited = new Set();
        for (const item of this.navigator.bfs(rootId, { depth, relations, direction })) visited.add(item.id);
        const nodes = new Map([...visited].map((id) => [id, this.navigator.getNode(id)]).filter(([, node]) => node));
        const edges = [];
        for (const nodeId of visited) {
            for (const edge of this.navigator.edgesFrom(nodeId, relations)) if (visited.has(edge.target)) edges.push(edge);
            if (direction !== "outgoing") for (const edge of this.navigator.edgesTo(nodeId, relations)) if (visited.has(edge.source)) edges.push(edge);
        }
        return Object.freeze({ nodes, edges: [...new Set(edges)] });
    }

    getRelatedSymbols(symbolId) {
        return this.navigator.getNodes(this.navigator.neighborIds(symbolId, { direction: "both" }));
    }

    getDocumentationContext(symbolId) {
        const symbol = this.navigator.getNode(symbolId);
        if (!symbol) return null;
        return Object.freeze({
            symbol,
            parent: this.navigator.getParent(symbolId),
            file: this.navigator.getContainingFile(symbolId),
            module: this.navigator.getContainingModule(symbolId),
            children: this.navigator.getChildren(symbolId),
            dependencies: this.getDependencies(symbolId),
            dependents: this.getDependents(symbolId),
            calls: this.getCalls(symbolId),
            callers: this.getCallers(symbolId),
        });
    }

    getNeighbourhood(symbolId, depth = 1) { return this.getSubgraph(symbolId, depth); }

    getPublicAPI(moduleId) {
        const result = [];
        for (const item of this.navigator.bfs(moduleId, { relations: ["CONTAINS", "DECLARES"] })) {
            const node = this.navigator.getNode(item.id);
            if (node?.metadata?.exported) result.push(node);
        }
        return result;
    }

    getEntryPoints() {
        const entryTypes = new Set(["Function", "Method"]);
        return [...this.navigator.graph.nodes.values()].filter((node) => entryTypes.has(node.type)
            && node.metadata?.exported
            && this.getCallers(node.id).length === 0);
    }

    getLeafComponents() {
        return this.navigator.getModules().filter((module) => this.getImports(this.navigator.getParent(module.id)?.id).length === 0);
    }

    getRootComponents() {
        const importedFileIds = new Set();
        for (const edge of this.navigator.iterateEdges({ relations: ["IMPORTS"] })) importedFileIds.add(edge.target);
        return this.navigator.getModules().filter((module) => !importedFileIds.has(this.navigator.getParent(module.id)?.id));
    }

    getExternalDependencies() {
        return [...this.navigator.graph.nodes.values()].filter((node) => node.type === "ExternalDependency" || node.metadata?.external === true);
    }

    getInternalDependencies() {
        return this.navigator.getFiles().filter((file) => this.getDependents(file.id, { relations: ["IMPORTS"] }).length > 0);
    }
}
