import BaseParser from "../../BaseParser.js";
import { tsx, typescript } from "./grammar.js";
import queries from "./queries.js";
import javascriptSemantics from "../../semantics/javascript.js";

export default class TypescriptParser extends BaseParser {
    constructor({ tsx: useTsx = false } = {}) {
        super(useTsx ? tsx : typescript, queries, javascriptSemantics);
    }
}
