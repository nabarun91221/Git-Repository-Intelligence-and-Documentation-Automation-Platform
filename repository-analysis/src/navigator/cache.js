/** Bounded cache for immutable graph-query results. */
export default class QueryCache {
    constructor(limit = 1_000) {
        this.limit = limit;
        this.values = new Map();
    }

    getOrSet(key, factory) {
        if (this.values.has(key)) return this.values.get(key);
        const value = factory();
        this.values.set(key, value);
        if (this.values.size > this.limit) this.values.delete(this.values.keys().next().value);
        return value;
    }

    clear() {
        this.values.clear();
    }
}
