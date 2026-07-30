import Parser from "tree-sitter";
import normalize from "../normalizer/normalize.js";

export default class BaseParser
{
    constructor(language, queries, semanticExtractor)
    {
        this.language = language;
        this.queries = queries;
        this.parser = new Parser();
        this.parser.setLanguage(language);
        this.compiledQueries = Object.fromEntries(
            Object.entries(queries).map(([kind, source]) => [
                kind,
                new Parser.Query(language, source),
            ]),
        );
        this.semanticExtractor = semanticExtractor;
    }

    parse(sourceCode)
    {
        return this.parser.parse(sourceCode);
    }

    extract(file)
    {
        const tree = this.parse(file.content);
        const captures = Object.fromEntries(
            Object.entries(this.compiledQueries).map(([kind, query]) => [
                kind,
                query.captures(tree.rootNode).map(({ node }) => node),
            ]),
        );

        const records = this.semanticExtractor({ tree, source: file.content, file, captures });
        return normalize({ source: file.content, file, records });
    }
}
