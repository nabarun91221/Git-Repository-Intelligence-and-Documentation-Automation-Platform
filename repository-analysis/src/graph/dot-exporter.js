function escapeDot(value) {
    return String(value ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function nodeStyle(type) {
    const styles = {
        Repository: { shape: "box3d", color: "#7c3aed" },
        Directory: { shape: "folder", color: "#2563eb" },
        File: { shape: "note", color: "#0891b2" },
        Module: { shape: "component", color: "#0f766e" },
        Class: { shape: "box", color: "#15803d" },
        Interface: { shape: "box", color: "#ca8a04" },
        Enum: { shape: "box", color: "#c2410c" },
        Function: { shape: "ellipse", color: "#9333ea" },
        Method: { shape: "ellipse", color: "#db2777" },
        Variable: { shape: "oval", color: "#64748b" },
    };
    return styles[type] || { shape: "ellipse", color: "#475569" };
}

/**
 * Converts the in-memory CodeKnowledgeGraph to Graphviz DOT text.
 * DOT is intentionally generated from nodes/edges only; no AST traversal occurs here.
 */
export function toGraphvizDot(graph) {
    const lines = [
        "digraph CodeKnowledgeGraph {",
        '  graph [rankdir="LR", bgcolor="#ffffff", fontname="Arial"];',
        '  node [style="filled", fillcolor="#ffffff", fontname="Arial", penwidth="1.5"];',
        '  edge [fontname="Arial", fontsize="10", color="#64748b"];',
    ];

    for (const node of graph.nodes.values()) {
        const style = nodeStyle(node.type);
        const label = `${node.type}\\n${node.name}`;
        lines.push(`  "${escapeDot(node.id)}" [label="${escapeDot(label)}", shape="${style.shape}", color="${style.color}"];`);
    }

    for (const edge of graph.edges) {
        lines.push(`  "${escapeDot(edge.source)}" -> "${escapeDot(edge.target)}" [label="${escapeDot(edge.relation)}"];`);
    }

    lines.push("}");
    return lines.join("\n");
}
