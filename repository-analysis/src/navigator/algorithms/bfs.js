/** Lazily traverses a graph breadth-first without mutating it. */
export function* bfs(startId, neighbors, { depth = Infinity } = {}) {
    const visited = new Set([startId]);
    const queue = [{ id: startId, depth: 0, parent: null }];

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const current = queue[cursor];
        yield current;
        if (current.depth >= depth) continue;

        for (const nextId of neighbors(current.id)) {
            if (visited.has(nextId)) continue;
            visited.add(nextId);
            queue.push({ id: nextId, depth: current.depth + 1, parent: current.id });
        }
    }
}
