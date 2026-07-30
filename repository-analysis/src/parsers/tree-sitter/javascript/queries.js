export default {
    imports: "(import_statement) @match",
    exports: "(export_statement) @match",
    classes: "(class_declaration) @match",
    functions: "[(function_declaration) (generator_function_declaration)] @match",
    methods: "(method_definition) @match",
    variables: "(variable_declarator) @match",
    calls: "(call_expression) @match",
};
