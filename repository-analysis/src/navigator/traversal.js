import { bfs } from "./algorithms/bfs.js";
import { dfs } from "./algorithms/dfs.js";
import { tarjan } from "./algorithms/tarjan.js";
import { topologicalSort } from "./algorithms/topo-sort.js";

export default class Traversal {
    constructor(navigator) {
        this.navigator = navigator;
    }

    bfs(rootId, options = {}) { return bfs(rootId, (nodeId) => this.navigator.neighborIds(nodeId, options), options); }
    dfs(rootId, options = {}) { return dfs(rootId, (nodeId) => this.navigator.neighborIds(nodeId, options), options); }
    topologicalOrder(options = {}) { return topologicalSort(this.navigator.nodeIds(), (nodeId) => this.navigator.neighborIds(nodeId, options)); }
    stronglyConnectedComponents(options = {}) { return tarjan(this.navigator.nodeIds(), (nodeId) => this.navigator.neighborIds(nodeId, options)); }

    findConnectedComponents(options = {}) {
        const visited = new Set();
        const components = [];
        for (const rootId of this.navigator.nodeIds()) {
            if (visited.has(rootId)) continue;
            const component = [];
            const queue = [rootId];
            visited.add(rootId);
            for (let cursor = 0; cursor < queue.length; cursor += 1) {
                const nodeId = queue[cursor];
                component.push(nodeId);
                for (const nextId of this.navigator.neighborIds(nodeId, { ...options, direction: "both" })) {
                    if (!visited.has(nextId)) {
                        visited.add(nextId);
                        queue.push(nextId);
                    }
                }
            }
            components.push(component);
        }
        return components;
    }

    findCycles(options) {
        const components = this.stronglyConnectedComponents(options);
        return components.filter((component) => component.length > 1
            || this.navigator.hasEdge(component[0], component[0], options));
    }

    collapseStronglyConnectedComponents(options) {
        const components = this.stronglyConnectedComponents(options);
        const componentByNode = new Map();
        const nodes = new Map();
        components.forEach((members, index) => {
            const id = `scc:${index}`;
            for (const member of members) componentByNode.set(member, id);
            nodes.set(id, Object.freeze({ id, type: "StronglyConnectedComponent", name: id, metadata: { members } }));
        });

        const edgeKeys = new Set();
        const edges = [];
        for (const edge of this.navigator.iterateEdges(options)) {
            const source = componentByNode.get(edge.source);
            const target = componentByNode.get(edge.target);
            if (source === target) continue;
            const key = `${source}|${edge.relation}|${target}`;
            if (edgeKeys.has(key)) continue;
            edgeKeys.add(key);
            edges.push(Object.freeze({ source, target, relation: edge.relation, metadata: { collapsed: true } }));
        }

        return Object.freeze({ nodes, edges, componentByNode });
    }
}
