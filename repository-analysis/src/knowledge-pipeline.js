import { buildResolvedSymbols } from "./symbols/index.js";
import { buildCodeKnowledgeGraph } from "./graph/index.js";
import { createRepositoryNavigator } from "./navigator/index.js";

// Example:
// const { resolvedModel, graph, navigator } = buildKnowledgePipeline(asts, { repositoryId: "my-repository" });
export function buildKnowledgePipeline(asts, options = {}) {
    const resolvedModel = buildResolvedSymbols(asts, options);
    const graph = buildCodeKnowledgeGraph(resolvedModel);
    const navigator = createRepositoryNavigator(graph);
    return { resolvedModel, graph, navigator };
}
