export default class RepositoryQuery {
    constructor(navigator) { this.navigator = navigator; }

    getRepository() { return this.navigator.getNodes(this.navigator.indexes.byType.get("Repository") || [])[0] || null; }
    getDirectories() { return this.navigator.getNodes(this.navigator.indexes.byType.get("Directory") || []); }
    getFiles() { return this.navigator.getNodes(this.navigator.indexes.byType.get("File") || []); }
    getModules() { return this.navigator.getNodes(this.navigator.indexes.byType.get("Module") || []); }
}
