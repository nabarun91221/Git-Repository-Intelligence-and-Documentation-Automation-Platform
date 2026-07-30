export default {
    imports: "(import_declaration) @match",
    classes: "(class_declaration) @match",
    interfaces: "(interface_declaration) @match",
    enums: "(enum_declaration) @match",
    methods: "[(method_declaration) (constructor_declaration)] @match",
    variables: "(variable_declarator) @match",
    calls: "(method_invocation) @match",
};
