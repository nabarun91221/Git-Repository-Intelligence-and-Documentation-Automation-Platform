import GraphBuilder from "./graph-builder.js";

export { GraphBuilder };
export { default as CodeKnowledgeGraph } from "./graph.js";
export { Relation } from "./relations.js";
export { toGraphvizDot } from "./dot-exporter.js";

export function buildCodeKnowledgeGraph(resolvedModel) {
    return new GraphBuilder().build(resolvedModel);
}
