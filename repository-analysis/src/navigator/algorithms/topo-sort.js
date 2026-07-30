/** Kahn topological sort. Cyclic nodes are returned separately. */
export function topologicalSort(nodeIds, neighbors) {
    const ids = [...nodeIds];
    const inDegree = new Map(ids.map((id) => [id, 0]));

    for (const nodeId of ids) {
        for (const neighborId of neighbors(nodeId)) {
            if (inDegree.has(neighborId)) inDegree.set(neighborId, inDegree.get(neighborId) + 1);
        }
    }

    const queue = ids.filter((id) => inDegree.get(id) === 0);
    const order = [];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const nodeId = queue[cursor];
        order.push(nodeId);
        for (const neighborId of neighbors(nodeId)) {
            if (!inDegree.has(neighborId)) continue;
            const degree = inDegree.get(neighborId) - 1;
            inDegree.set(neighborId, degree);
            if (degree === 0) queue.push(neighborId);
        }
    }

    const ordered = new Set(order);
    return { order, cyclicNodeIds: ids.filter((id) => !ordered.has(id)) };
}
