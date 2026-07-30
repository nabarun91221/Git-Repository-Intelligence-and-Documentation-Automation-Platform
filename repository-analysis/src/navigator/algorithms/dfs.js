/** Lazily traverses a graph depth-first without mutating it. */
export function* dfs(startId, neighbors, { depth = Infinity } = {}) {
    const visited = new Set();
    const stack = [{ id: startId, depth: 0, parent: null }];

    while (stack.length) {
        const current = stack.pop();
        if (visited.has(current.id)) continue;
        visited.add(current.id);
        yield current;
        if (current.depth >= depth) continue;

        const nextIds = [...neighbors(current.id)];
        for (let index = nextIds.length - 1; index >= 0; index -= 1) {
            if (!visited.has(nextIds[index])) stack.push({ id: nextIds[index], depth: current.depth + 1, parent: current.id });
        }
    }
}
