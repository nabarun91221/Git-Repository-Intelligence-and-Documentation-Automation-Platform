import RepositoryNavigator from "./navigator.js";

export { RepositoryNavigator };
export { default as RepositoryQuery } from "./repository-query.js";
export { default as SymbolQuery } from "./symbol-query.js";
export { default as DependencyQuery } from "./dependency-query.js";
export { default as Traversal } from "./traversal.js";

/**
 * Example:
 * const navigator = createRepositoryNavigator(graph);
 * const callers = navigator.getCallers("src/auth/AuthService.verify");
 */
export function createRepositoryNavigator(graph, options) {
    return new RepositoryNavigator(graph, options);
}
