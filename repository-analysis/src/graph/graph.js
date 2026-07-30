export default class CodeKnowledgeGraph {
    constructor() {
        this.nodes = new Map();
        this.edges = [];
        this.#edgeKeys = new Set();
    }

    #edgeKeys;

    addNode(node) {
        const existing = this.nodes.get(node.id);
        if (existing) return existing;
        this.nodes.set(node.id, Object.freeze(node));
        return node;
    }

    addEdge(edge) {
        if (!this.nodes.has(edge.source) || !this.nodes.has(edge.target)) return false;
        const key = `${edge.source}|${edge.relation}|${edge.target}|${JSON.stringify(edge.metadata || {})}`;
        if (this.#edgeKeys.has(key)) return false;
        this.#edgeKeys.add(key);
        this.edges.push(Object.freeze({ metadata: {}, ...edge }));
        return true;
    }
}
