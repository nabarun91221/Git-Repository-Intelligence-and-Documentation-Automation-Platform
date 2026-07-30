import BaseParser from "../../BaseParser.js";
import language from "./grammar.js";
import queries from "./queries.js";
import genericSemantics from "../../semantics/generic.js";

export default class GoParser extends BaseParser {
    constructor() {
        super(language, queries, genericSemantics);
    }
}
