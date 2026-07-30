import { SymbolKind } from "./symbol.js";

function addToIndex(index, key, symbol) {
    if (!index.has(key)) index.set(key, new Set());
    index.get(key).add(symbol.id);
}

export default class SymbolTable {
    constructor(symbols = []) {
        this.byId = new Map();
        this.byQualifiedName = new Map();
        this.bySimpleName = new Map();
        this.byExportedName = new Map();
        this.byFile = new Map();
        this.scopesByFile = new Map();
        for (const symbol of symbols) this.add(symbol);
        for (const scopes of this.scopesByFile.values()) {
            scopes.sort((left, right) => left.location.startOffset - right.location.startOffset || right.location.endOffset - left.location.endOffset);
        }
    }

    add(symbol) {
        if (this.byId.has(symbol.id)) throw new Error(`Duplicate symbol id: ${symbol.id}`);
        this.byId.set(symbol.id, symbol);
        this.byQualifiedName.set(symbol.qualifiedName, symbol.id);
        addToIndex(this.bySimpleName, symbol.name, symbol);
        if (symbol.exported) addToIndex(this.byExportedName, symbol.name, symbol);
        addToIndex(this.byFile, symbol.fileId, symbol);
        if (symbol.location && [SymbolKind.CLASS, SymbolKind.INTERFACE, SymbolKind.ENUM, SymbolKind.FUNCTION, SymbolKind.METHOD].includes(symbol.kind)) {
            if (!this.scopesByFile.has(symbol.fileId)) this.scopesByFile.set(symbol.fileId, []);
            this.scopesByFile.get(symbol.fileId).push(symbol);
        }
    }

    get(id) { return this.byId.get(id) || null; }
    getQualified(qualifiedName) { return this.get(this.byQualifiedName.get(qualifiedName)); }
    getFileSymbols(fileId) { return [...(this.byFile.get(fileId) || [])].map((id) => this.get(id)); }

    findByName(name, { fileId = null, exportedOnly = false } = {}) {
        const index = exportedOnly ? this.byExportedName : this.bySimpleName;
        const ids = index.get(name) || new Set();
        const candidates = [];
        for (const id of ids) {
            const symbol = this.get(id);
            if (!fileId || symbol.fileId === fileId) candidates.push(symbol);
        }
        return candidates;
    }

    findExported(name, fileId) {
        return this.findByName(name, { fileId, exportedOnly: true });
    }

    findContainingScope(fileId, location) {
        const scopes = this.scopesByFile.get(fileId) || [];
        let low = 0;
        let high = scopes.length - 1;
        let index = -1;
        while (low <= high) {
            const middle = Math.floor((low + high) / 2);
            if (scopes[middle].location.startOffset <= location.startOffset) {
                index = middle;
                low = middle + 1;
            } else high = middle - 1;
        }

        let nearest = null;
        for (let cursor = index; cursor >= 0; cursor -= 1) {
            const symbol = scopes[cursor];
            if (symbol.location.endOffset < location.endOffset) continue;
            if (!nearest || symbol.location.startOffset >= nearest.location.startOffset) nearest = symbol;
        }
        return nearest;
    }
}
