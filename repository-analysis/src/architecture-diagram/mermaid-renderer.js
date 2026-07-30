function escapeLabel(value) {
    return String(value ?? "Unnamed")
        .replace(/[\[\]{}()]/g, "")
        .replace(/"/g, "&quot;")
        .replace(/\r?\n/g, " ");
}

/** Renders a deterministic, dependency-oriented Mermaid flowchart. */
export default class MermaidRenderer {
    render(diagram) {
        const aliases = new Map(diagram.nodes.map((node, index) => [node.id, `N${index}`]));
        const lines = ["flowchart LR"];

        for (const node of diagram.nodes) {
            const alias = aliases.get(node.id);
            const label = escapeLabel(node.name);
            const shape = node.type === "ExternalDependency" ? `([${label}])` : `[${label}]`;
            lines.push(`  ${alias}${shape}`);
        }

        for (const edge of diagram.edges) {
            const source = aliases.get(edge.source);
            const target = aliases.get(edge.target);
            if (!source || !target) continue;
            lines.push(`  ${source} -->|${escapeLabel(edge.relations.join(", "))}| ${target}`);
        }

        return `\`\`\`mermaid\n${lines.join("\n")}\n\`\`\``;
    }
}
