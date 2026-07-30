import SymbolExtractor from "./extractor.js";
import SymbolResolver from "./resolver.js";
import SymbolTable from "./symbol-table.js";

export { SymbolExtractor, SymbolResolver, SymbolTable };
export * from "./symbol.js";

export function buildResolvedSymbols(asts, options) {
    const extraction = new SymbolExtractor().extract(asts, options);
    return new SymbolResolver().resolve(extraction);
}
