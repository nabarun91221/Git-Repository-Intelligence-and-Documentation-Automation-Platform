function findFirst(node, predicate) {
    if (predicate(node)) return node;
    for (const child of node.namedChildren) {
        const found = findFirst(child, predicate);
        if (found) return found;
    }
    return null;
}

function text(node, source) {
    return node ? source.slice(node.startIndex, node.endIndex) : null;
}

function nameOf(node, source) {
    const named = node.childForFieldName("name")
        || findFirst(node, (child) => /^(identifier|type_identifier|field_identifier|property_identifier)$/.test(child.type));
    return text(named, source) || "anonymous";
}

function parametersOf(node, source) {
    const parameters = node.childForFieldName("parameters")
        || findFirst(node, (child) => /^(formal_parameters|parameters|parameter_list)$/.test(child.type));

    return (parameters?.namedChildren || []).map((parameter) => ({
        name: nameOf(parameter, source),
        type: text(
            parameter.childForFieldName("type")
                || findFirst(parameter, (child) => /type(_annotation)?$/.test(child.type)),
            source,
        ),
    }));
}

function returnTypeOf(node, source) {
    const type = node.childForFieldName("return_type")
        || findFirst(node, (child) => /^(type_annotation|result)$/.test(child.type));
    return text(type, source)?.replace(/^:\s*/, "") || null;
}

function modifiersOf(node, source) {
    const value = text(node, source) || "";
    return ["public", "private", "protected", "static", "async", "abstract", "final"]
        .filter((modifier) => new RegExp(`(^|\\s)${modifier}(\\s|$)`).test(value));
}

function declaration(node, category, source) {
    const modifiers = modifiersOf(node, source);
    const value = {
        category,
        node,
        name: nameOf(node, source),
        modifiers,
    };

    if (["functions", "methods"].includes(category)) {
        value.async = modifiers.includes("async");
        value.generator = /generator/.test(node.type) || /function\s*\*/.test(text(node, source) || "");
        value.parameters = parametersOf(node, source);
        value.visibility = modifiers.find((modifier) => ["public", "private", "protected"].includes(modifier)) || null;
        value.returnType = returnTypeOf(node, source);
    }

    return value;
}

function importRecord(node, source) {
    const value = text(node, source) || "";
    const module = value.match(/(?:from\s+)?["']([^"']+)["']/)?.[1] || null;
    return { category: "imports", node, module, kind: "unknown", imports: [] };
}

function exportRecord(node, source) {
    const value = text(node, source) || "";
    return {
        category: "exports",
        node,
        kind: /\bdefault\b/.test(value) ? "default" : "named",
        name: nameOf(node, source),
    };
}

function variableRecord(node, source) {
    const declarationNode = node.parent;
    const value = text(declarationNode, source) || "";
    return {
        category: "variables",
        node,
        name: nameOf(node, source),
        kind: value.match(/\b(const|let|var)\b/)?.[1] || "unknown",
        exported: /export/.test(text(declarationNode?.parent, source) || ""),
    };
}

function callRecord(node, source) {
    const callee = node.childForFieldName("function") || node.namedChildren[0];
    const argumentsNode = node.childForFieldName("arguments") || node.namedChildren.at(-1);
    return {
        category: "calls",
        node,
        callee: text(callee, source) || "unknown",
        arguments: argumentsNode?.namedChildren.length || 0,
        optional: /\?\./.test(text(node, source) || ""),
    };
}

export default function genericSemantics({ captures, source }) {
    const records = [];
    for (const [category, nodes] of Object.entries(captures)) {
        for (const node of nodes) {
            if (category === "imports") records.push(importRecord(node, source));
            else if (category === "exports") records.push(exportRecord(node, source));
            else if (category === "variables") records.push(variableRecord(node, source));
            else if (category === "calls") records.push(callRecord(node, source));
            else records.push(declaration(node, category, source));
        }
    }
    return records;
}
