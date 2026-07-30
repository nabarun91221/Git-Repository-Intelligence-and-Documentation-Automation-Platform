import ArchitectureDiagramBuilder from "./architecture-diagram-builder.js";
import MermaidRenderer from "./mermaid-renderer.js";

export { ArchitectureDiagramBuilder, MermaidRenderer };
export { architectureRelations } from "./relations.js";

/**
 * Creates a read-only architecture diagram service over a RepositoryNavigator.
 * `build` returns graph data for a frontend; `toMermaid` returns Markdown Mermaid.
 */
export function createArchitectureDiagramService(navigator) {
    const builder = new ArchitectureDiagramBuilder(navigator);
    const renderer = new MermaidRenderer();
    return Object.freeze({
        build: (options) => builder.build(options),
        toMermaid: (options) => renderer.render(builder.build(options)),
    });
}
