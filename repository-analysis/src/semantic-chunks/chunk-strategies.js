export class SymbolChunkStrategy {
    constructor(factory) { this.factory = factory; }
    build(symbol) { return this.factory.create(symbol); }
}

export class MethodChunkStrategy extends SymbolChunkStrategy {}
export class FunctionChunkStrategy extends SymbolChunkStrategy {}
export class InterfaceChunkStrategy extends SymbolChunkStrategy {}
export class EnumChunkStrategy extends SymbolChunkStrategy {}
export class VariableChunkStrategy extends SymbolChunkStrategy {}

/** A class is atomic unless its normalized source exceeds the configured limit. */
export class ClassChunkStrategy extends SymbolChunkStrategy {
    constructor(factory, { maxClassSourceLength = 12_000, maxClassLines = 250 } = {}) {
        super(factory);
        this.maxClassSourceLength = maxClassSourceLength;
        this.maxClassLines = maxClassLines;
    }

    isLarge(symbol, source) {
        const lineCount = (symbol.location?.endLine ?? 0) - (symbol.location?.startLine ?? 0) + 1;
        return source.length > this.maxClassSourceLength || lineCount > this.maxClassLines;
    }

    build(symbol, source) {
        return this.isLarge(symbol, source) ? null : super.build(symbol);
    }
}
