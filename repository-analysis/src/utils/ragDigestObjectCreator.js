import { SymbolKind } from "../symbols.js"

class RagDigestObjectCreator
{
    create = (SymbolObject) =>
    {
        if (SymbolObject.kind != SymbolKind.FILE || SymbolObject.kind != SymbolKind.MODULE && (SymbolKind.include(SymbolObject.kind))) {
            console.log(SymbolObject)
        }
        else console.log(`ignored symbol: ${SymbolObject.kind}`)

    }
}