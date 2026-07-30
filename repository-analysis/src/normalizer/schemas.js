export function createAST(file) {
    return {
        fileId: file.id ?? null,
        path: file.path,
        language: file.language,
        imports: [],
        exports: [],
        classes: [],
        interfaces: [],
        enums: [],
        namespaces: [],
        typeAliases: [],
        functions: [],
        methods: [],
        variables: [],
        calls: [],
    };
}
