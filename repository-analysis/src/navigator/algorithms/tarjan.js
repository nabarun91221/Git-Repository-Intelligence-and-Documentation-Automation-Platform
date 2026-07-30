/** Returns strongly connected components using Tarjan's O(V + E) algorithm. */
export function tarjan(nodeIds, neighbors) {
    let index = 0;
    const indices = new Map();
    const lowLinks = new Map();
    const stack = [];
    const onStack = new Set();
    const components = [];

    const visit = (nodeId) => {
        indices.set(nodeId, index);
        lowLinks.set(nodeId, index);
        index += 1;
        stack.push(nodeId);
        onStack.add(nodeId);

        for (const neighborId of neighbors(nodeId)) {
            if (!indices.has(neighborId)) {
                visit(neighborId);
                lowLinks.set(nodeId, Math.min(lowLinks.get(nodeId), lowLinks.get(neighborId)));
            } else if (onStack.has(neighborId)) {
                lowLinks.set(nodeId, Math.min(lowLinks.get(nodeId), indices.get(neighborId)));
            }
        }

        if (lowLinks.get(nodeId) !== indices.get(nodeId)) return;
        const component = [];
        let member;
        do {
            member = stack.pop();
            onStack.delete(member);
            component.push(member);
        } while (member !== nodeId);
        components.push(component);
    };

    for (const nodeId of nodeIds) if (!indices.has(nodeId)) visit(nodeId);
    return components;
}
