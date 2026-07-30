import { architectureRelations } from "./relations.js";

function compareById(left, right) { return left.id.localeCompare(right.id); }

/**
 * Produces a compact module-level view from the read-only RepositoryNavigator.
 * Symbol-level graph edges are intentionally collapsed into architectural edges.
 */
export default class ArchitectureDiagramBuilder {
    constructor(navigator) {
        if (!navigator) throw new Error("ArchitectureDiagramBuilder requires a RepositoryNavigator.");
        this.navigator = navigator;
    }

    build({ scopeId = null, depth = 2, relations = architectureRelations, maxNodes = 80, title = "Repository Architecture" } = {}) {
        const scopedNodeIds = this.#scopedNodeIds(scopeId, depth, relations);
        const units = new Map();
        const edges = new Map();

        for (const relation of relations) {
            for (const edge of this.navigator.searchByRelation(relation)) {
                if (scopedNodeIds && (!scopedNodeIds.has(edge.source) || !scopedNodeIds.has(edge.target))) continue;
                const source = this.#unitFor(edge.source);
                const target = this.#unitFor(edge.target);
                if (!source || !target || source.id === target.id) continue;
                units.set(source.id, source);
                units.set(target.id, target);
                const key = `${source.id}\u0000${target.id}`;
                if (!edges.has(key)) edges.set(key, { source: source.id, target: target.id, relations: new Set() });
                edges.get(key).relations.add(relation);
            }
        }

        if (scopeId) {
            const scope = this.#unitFor(scopeId);
            if (scope) units.set(scope.id, scope);
        } else {
            for (const module of this.navigator.getModules()) units.set(module.id, module);
        }

        const nodes = [...units.values()].sort(compareById).slice(0, maxNodes);
        const visibleIds = new Set(nodes.map((node) => node.id));
        const projectedEdges = [...edges.values()]
            .filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target))
            .map((edge) => Object.freeze({ ...edge, relations: [...edge.relations].sort() }))
            .sort((left, right) => `${left.source}:${left.target}`.localeCompare(`${right.source}:${right.target}`));

        return Object.freeze({
            title,
            scopeId,
            relations: [...relations],
            nodes: Object.freeze(nodes.map((node) => Object.freeze({
                id: node.id,
                name: node.name,
                type: node.type,
                metadata: node.metadata || {},
            }))),
            edges: Object.freeze(projectedEdges),
        });
    }

    #scopedNodeIds(scopeId, depth, relations) {
        if (!scopeId) return null;
        const subgraph = this.navigator.getSubgraph(scopeId, depth, { relations, direction: "both" });
        return new Set(subgraph.nodes.keys());
    }

    #unitFor(nodeId) {
        const node = this.navigator.getSymbol(nodeId);
        if (!node) return null;
        if (["Module", "ExternalDependency"].includes(node.type)) return node;
        return this.navigator.getContainingModule(node.id)
            || (node.type === "File" ? this.navigator.getChildren(node.id).find((child) => child.type === "Module") : null)
            || node;
    }
}
