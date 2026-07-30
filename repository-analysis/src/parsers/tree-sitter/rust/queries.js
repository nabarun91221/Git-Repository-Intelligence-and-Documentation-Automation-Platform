export default {
    imports: "(use_declaration) @match",
    classes: "(struct_item) @match",
    interfaces: "(trait_item) @match",
    enums: "(enum_item) @match",
    functions: "(function_item) @match",
    variables: "(let_declaration) @match",
    calls: "(call_expression) @match",
};
