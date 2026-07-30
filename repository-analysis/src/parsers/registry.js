class ParserRegistry {
    #parsers = new Map();

    register(language, parser) {
        this.#parsers.set(language.toLowerCase(), parser);
    }

    get(language) {
        return this.#parsers.get(language?.toLowerCase());
    }

    has(language) {
        return this.#parsers.has(language?.toLowerCase());
    }
}

export default new ParserRegistry();
