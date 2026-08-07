/** Builds presentation context while leaving the normalized source text untouched. */
export default class ChunkContentBuilder {
    build({ repositoryId, filePath, symbol, parentSymbol, source }) {
        const lines = [
            `Repository: ${repositoryId}`,
            `File: ${filePath || symbol.fileId}`,
        ];
        if (parentSymbol) lines.push(`Parent: ${parentSymbol}`);
        lines.push(`Symbol: ${symbol.name}`);
        return `${lines.join("\n")}\n\n${source}`;
    }
}
