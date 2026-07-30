function sourceOf(node, source) {
    if (!node) return null;
    return source.slice(node.startIndex, node.endIndex);
}

function fieldOrFirst(node, fieldName, types = []) {
    return (fieldName ? node.childForFieldName(fieldName) : null)
        || node.namedChildren.find((child) => types.includes(child.type))
        || null;
}

function nameOf(node, source) {
    if (["identifier", "type_identifier", "property_identifier"].includes(node.type)) {
        return sourceOf(node, source);
    }

    return sourceOf(
        fieldOrFirst(node, "name", ["identifier", "type_identifier", "property_identifier"]),
        source,
    ) || "anonymous";
}

function parametersOf(node, source) {
    const parameters = fieldOrFirst(node, "parameters", ["formal_parameters"]);
    return (parameters?.namedChildren || []).map((parameter) => ({
        name: nameOf(parameter, source),
        type: sourceOf(
            parameter.namedChildren.find((child) => child.type === "type_annotation")?.namedChildren[0],
            source,
        ) || null,
    }));
}

function modifiersOf(node, source) {
    const value = sourceOf(node, source).split(/[({]/, 1)[0];
    return ["public", "private", "protected", "static", "async", "abstract", "readonly"]
        .filter((modifier) => new RegExp(`(^|\\s)${modifier}(\\s|$)`).test(value));
}

function declarationRecord(node, category, source) {
    const modifiers = modifiersOf(node, source);
    const record = { category, node, name: nameOf(node, source), modifiers };

    if (category === "classes") {
        const heritage = sourceOf(fieldOrFirst(node, "", ["class_heritage"]), source);
        record.extends = heritage?.match(/\bextends\s+([^\s{]+)/)?.[1] || null;
        record.implements = heritage?.match(/\bimplements\s+([^\s{]+)/)?.[1]?.split(",") || [];
    }

    if (["functions", "methods"].includes(category)) {
        const returnType = node.namedChildren.find((child) => child.type === "type_annotation");
        record.async = modifiers.includes("async") || /^async\b/.test(sourceOf(node, source));
        record.generator = /generator_function/.test(node.type) || /function\s*\*/.test(sourceOf(node, source));
        record.parameters = parametersOf(node, source);
        record.visibility = modifiers.find((modifier) => ["public", "private", "protected"].includes(modifier)) || null;
        record.returnType = sourceOf(returnType?.namedChildren[0], source) || null;
        record.static = modifiers.includes("static");
    }

    return record;
}

function importRecord(node, source) {
    const clause = node.namedChildren.find((child) => child.type === "import_clause");
    const moduleNode = node.namedChildren.find((child) => child.type === "string");
    const namedImports = clause?.namedChildren.find((child) => child.type === "named_imports");
    const namespaceImport = clause?.namedChildren.find((child) => child.type === "namespace_import");
    const defaultImport = clause?.namedChildren.find((child) => child.type === "identifier");

    const imports = [];
    if (defaultImport) imports.push({ imported: "default", local: sourceOf(defaultImport, source) });
    for (const specifier of namedImports?.namedChildren || []) {
        const [imported, local = imported] = specifier.namedChildren;
        imports.push({ imported: sourceOf(imported, source), local: sourceOf(local, source) });
    }
    if (namespaceImport) {
        const local = namespaceImport.namedChildren.at(-1);
        imports.push({ imported: "*", local: sourceOf(local, source) });
    }

    return {
        category: "imports",
        node,
        module: sourceOf(moduleNode?.namedChildren[0], source) || null,
        kind: namedImports ? (defaultImport ? "mixed" : "named") : namespaceImport ? "namespace" : defaultImport ? "default" : "side-effect",
        imports,
    };
}

function exportRecord(node, source) {
    const value = sourceOf(node, source);
    const declaration = node.namedChildren[0];
    const isDefault = /^export\s+default\b/.test(value);
    return {
        category: "exports",
        node,
        kind: isDefault ? "default" : "named",
        name: declaration ? nameOf(declaration, source) : "anonymous",
    };
}

function variableRecord(node, source) {
    const declaration = node.parent;
    return {
        category: "variables",
        node,
        name: nameOf(node, source),
        kind: sourceOf(declaration, source).match(/\b(const|let|var)\b/)?.[1] || "unknown",
        exported: node.parent?.parent?.type === "export_statement",
    };
}

function callRecord(node, source) {
    const callee = fieldOrFirst(node, "function", []) || node.namedChildren[0];
    const argumentsNode = fieldOrFirst(node, "arguments", ["arguments"]);
    return {
        category: "calls",
        node,
        callee: sourceOf(callee, source),
        arguments: argumentsNode?.namedChildren.length || 0,
        optional: /\?\./.test(sourceOf(node, source)),
    };
}

export default function javascriptSemantics({ captures, source }) {
    const records = [];
    for (const [category, nodes] of Object.entries(captures)) {
        for (const node of nodes) {
            if (category === "imports") records.push(importRecord(node, source));
            else if (category === "exports") records.push(exportRecord(node, source));
            else if (category === "variables") records.push(variableRecord(node, source));
            else if (category === "calls") records.push(callRecord(node, source));
            else records.push(declarationRecord(node, category, source));
        }
    }
    return records;
}
