export default class SymbolQuery {
    constructor(navigator) { this.navigator = navigator; }

    getSymbol(id) { return this.navigator.getNode(id); }
    getSymbolByQualifiedName(qualifiedName) { return this.navigator.getNode(this.navigator.indexes.byQualifiedName.get(qualifiedName)); }
    getChildren(symbolId) { return this.navigator.getNodes(this.navigator.indexes.children.get(symbolId) || []); }
    getParent(symbolId) { return this.navigator.getNodes(this.navigator.indexes.parents.get(symbolId) || [])[0] || null; }

    getContainingFile(symbolId) {
        let current = this.getSymbol(symbolId);
        while (current && current.type !== "File") current = this.getParent(current.id);
        return current;
    }

    getContainingModule(symbolId) {
        let current = this.getSymbol(symbolId);
        while (current && current.type !== "Module") current = this.getParent(current.id);
        return current;
    }

    searchByName(name, { exact = false, limit = 50 } = {}) {
        const query = name.toLowerCase();
        const key = `name:${query}:${exact}:${limit}`;
        return this.navigator.cache.getOrSet(key, () => {
            if (exact) return this.navigator.getNodes(this.navigator.indexes.byName.get(query) || []).slice(0, limit);
            return [...this.navigator.graph.nodes.values()]
                .filter((node) => node.name.toLowerCase().includes(query))
                .slice(0, limit);
        });
    }

    searchByType(type) {
        return this.navigator.getNodes(this.navigator.indexes.byType.get(type) || []);
    }

    searchByRelation(relation) {
        return [...(this.navigator.indexes.byRelation.get(relation) || [])];
    }

    searchByPath(pathFragment, { limit = 50 } = {}) {
        const query = pathFragment.toLowerCase();
        const key = `path:${query}:${limit}`;
        return this.navigator.cache.getOrSet(key, () => {
            const ids = new Set();
            for (const [path, pathIds] of this.navigator.indexes.byPath) {
                if (path.toLowerCase().includes(query)) for (const id of pathIds) ids.add(id);
            }
            return this.navigator.getNodes(ids).slice(0, limit);
        });
    }

    fuzzySearch(query, { limit = 20 } = {}) {
        const normalized = query.toLowerCase().trim();
        if (!normalized) return [];
        const grams = this.navigator.trigrams(normalized);
        let candidates = null;
        for (const gram of grams) {
            const ids = this.navigator.indexes.byTrigram.get(gram) || new Set();
            candidates = candidates === null ? new Set(ids) : new Set([...candidates].filter((id) => ids.has(id)));
            if (candidates.size === 0) break;
        }
        const pool = candidates === null || candidates.size === 0
            ? this.navigator.graph.nodes.values()
            : this.navigator.getNodes(candidates);

        return [...pool]
            .map((node) => ({ node, score: this.#fuzzyScore(normalized, node.name.toLowerCase()) }))
            .filter(({ score }) => score > 0)
            .sort((left, right) => right.score - left.score || left.node.name.localeCompare(right.node.name))
            .slice(0, limit)
            .map(({ node }) => node);
    }

    #fuzzyScore(query, value) {
        if (value === query) return 1_000;
        if (value.startsWith(query)) return 800 - value.length;
        if (value.includes(query)) return 600 - value.length;
        let cursor = 0;
        let score = 0;
        for (const character of query) {
            const next = value.indexOf(character, cursor);
            if (next < 0) return 0;
            score += 10 - Math.min(next - cursor, 9);
            cursor = next + 1;
        }
        return score;
    }
}
