import ChunkHasher from "./chunk-hasher.js";
import ChunkContentBuilder from "./chunk-content-builder.js";
import ChunkMetadataBuilder from "./chunk-metadata-builder.js";
import ChunkValidator from "./chunk-validator.js";
import ChunkFactory from "./chunk-factory.js";
import
    {
        SymbolChunkStrategy,
        ClassChunkStrategy,
        MethodChunkStrategy,
        FunctionChunkStrategy,
        InterfaceChunkStrategy,
        EnumChunkStrategy,
        VariableChunkStrategy,
    } from "./chunk-strategies.js";

const CHUNKABLE_KINDS = new Set(["class", "interface", "enum", "function", "method", "type-alias", "variable", "constant"]);
const sortByLocation = (left, right) => (left.location?.startOffset ?? 0) - (right.location?.startOffset ?? 0) || left.id.localeCompare(right.id);

/**
 * Converts a resolved repository model to embedding-ready semantic chunks.
 * It deliberately accepts only the knowledge-pipeline output and never parses
 * or accesses AST nodes.
 */
export default class SemanticChunkBuilder
{
    #strategies(factory)
    {
        return {
            class: new ClassChunkStrategy(factory, this.options),
            method: new MethodChunkStrategy(factory),
            function: new FunctionChunkStrategy(factory),
            interface: new InterfaceChunkStrategy(factory),
            enum: new EnumChunkStrategy(factory),
            variable: new VariableChunkStrategy(factory),
            constant: new VariableChunkStrategy(factory),
            "type-alias": new SymbolChunkStrategy(factory),
            default: new SymbolChunkStrategy(factory),
        };
    }

    #shouldInclude(symbol, largeClasses, classIds)
    {
        if (["variable", "constant"].includes(symbol.kind) && !symbol.exported && !symbol.metadata?.semanticallyMeaningful) return false;
        // Methods are represented by their small parent class; large classes are
        // split strictly at method boundaries.
        if (symbol.kind === "method" && classIds.has(symbol.parent) && !largeClasses.has(symbol.parent)) return false;
        return true;
    }

    #createSourceLookup(resolvedModel)
    {
        const bySymbolId = new Map();
        const byLocation = new Map();
        for (const file of resolvedModel.files || []) {
            for (const entries of Object.values(file)) {
                if (!Array.isArray(entries)) continue;
                for (const entry of entries) {
                    if (!entry?.source) continue;
                    byLocation.set(`${file.fileId || file.id || file.path}:${entry.startOffset}:${entry.endOffset}`, entry.source);
                }
            }
        }
        return (symbol) =>
        {
            if (bySymbolId.has(symbol.id)) return bySymbolId.get(symbol.id);
            const direct = symbol.source || symbol.metadata?.source;
            const key = `${symbol.fileId}:${symbol.location?.startOffset}:${symbol.location?.endOffset}`;
            const source = direct || byLocation.get(key) || null;
            bySymbolId.set(symbol.id, source);
            return source;
        };
    }
    constructor(options = {}) { this.options = options; }

    build({ resolvedModel, graph, navigator })
    {
        if (!resolvedModel?.symbols || !graph || !navigator) {
            throw new Error("SemanticChunkBuilder requires { resolvedModel, graph, navigator }.");
        }

        const sourceLookup = this.#createSourceLookup(resolvedModel);
        const metadataBuilder = new ChunkMetadataBuilder({ resolvedModel, navigator });
        const factory = new ChunkFactory({
            hasher: new ChunkHasher(),
            contentBuilder: new ChunkContentBuilder(),
            metadataBuilder,
            validator: new ChunkValidator(),
            sourceLookup,
        });
        const strategies = this.#strategies(factory);
        const symbols = resolvedModel.symbols.filter((symbol) => CHUNKABLE_KINDS.has(symbol.kind)).sort(sortByLocation);
        const classIds = new Set(symbols.filter((symbol) => symbol.kind === "class").map((symbol) => symbol.id));
        const largeClasses = new Set();

        // First pass plans class boundaries. This prevents a small class and its
        // methods from producing duplicate overlapping chunks.
        for (const symbol of symbols) {
            if (symbol.kind !== "class") continue;
            const source = sourceLookup(symbol);
            if (source && strategies.class.isLarge(symbol, source)) largeClasses.add(symbol.id);
        }

        const chunks = [];
        for (const symbol of symbols) {
            if (!this.#shouldInclude(symbol, largeClasses, classIds)) continue;
            const strategy = strategies[symbol.kind] || strategies.default;
            const chunk = symbol.kind === "class"
                ? strategy.build(symbol, sourceLookup(symbol))
                : strategy.build(symbol);
            if (chunk) chunks.push(chunk);
        }
        return chunks;
    }


}
