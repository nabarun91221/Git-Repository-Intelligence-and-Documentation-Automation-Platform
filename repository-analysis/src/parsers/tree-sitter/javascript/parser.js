import BaseParser from "../../BaseParser.js";
import language from "./grammar.js";
import queries from "./queries.js";
import javascriptSemantics from "../../semantics/javascript.js";

export default class JavascriptParser extends BaseParser {
    constructor() {
        super(language, queries, javascriptSemantics);
    }
}
