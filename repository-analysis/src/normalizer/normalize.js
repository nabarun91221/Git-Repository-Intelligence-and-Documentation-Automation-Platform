import { createAST } from "./schemas.js";

// Source is part of the normalized model contract. It can be disabled only for
// callers that explicitly opt out of source-dependent downstream features.
const includeSource = () => process.env.NORMALIZER_INCLUDE_SOURCE !== "false";

export function createLocation(node, fileId) {
    return {
        fileId,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        startOffset: node.startIndex,
        endOffset: node.endIndex,
    };
}

function withLocation(record, file, source) {
    const { node, category, ...semantic } = record;
    const normalized = {
        ...semantic,
        ...createLocation(node, file.id ?? null),
    };

    if (includeSource()) {
        normalized.source = source.slice(node.startIndex, node.endIndex);
    }

    return { category, value: normalized };
}

export const createImport = (record, file, source) => withLocation(record, file, source);
export const createExport = (record, file, source) => withLocation(record, file, source);
export const createFunction = (record, file, source) => withLocation(record, file, source);
export const createClass = (record, file, source) => withLocation(record, file, source);
export const createMethod = (record, file, source) => withLocation(record, file, source);
export const createVariable = (record, file, source) => withLocation(record, file, source);
export const createCall = (record, file, source) => withLocation(record, file, source);

const factories = {
    imports: createImport,
    exports: createExport,
    classes: createClass,
    interfaces: createClass,
    enums: createClass,
    namespaces: createClass,
    typeAliases: createClass,
    functions: createFunction,
    methods: createMethod,
    variables: createVariable,
    calls: createCall,
};

export default function normalize({ source, file, records }) {
    const ast = createAST(file);
    const seen = new Map();

    for (const record of records) {
        const factory = factories[record.category];
        if (!factory || !Array.isArray(ast[record.category])) continue;

        const locationKey = `${record.node.startIndex}:${record.node.endIndex}`;
        const categorySeen = seen.get(record.category) || new Set();
        if (categorySeen.has(locationKey)) continue;
        categorySeen.add(locationKey);
        seen.set(record.category, categorySeen);

        const { value } = factory(record, file, source);
        ast[record.category].push(value);
    }

    return ast;
}
