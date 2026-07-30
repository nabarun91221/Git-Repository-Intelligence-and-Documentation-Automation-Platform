export default {
    imports: "(import_declaration) @match",
    classes: "(type_declaration (type_spec type: (struct_type)) @match)",
    interfaces: "(type_declaration (type_spec type: (interface_type)) @match)",
    functions: "(function_declaration) @match",
    methods: "(method_declaration) @match",
    variables: "[(var_declaration) (short_var_declaration)] @match",
    calls: "(call_expression) @match",
};
