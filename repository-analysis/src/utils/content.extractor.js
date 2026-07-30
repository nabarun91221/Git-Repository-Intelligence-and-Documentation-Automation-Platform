import fs from "node:fs/promises";
import { isBinaryFile } from "isbinaryfile";

const MAX_FILE_SIZE = 1024 * 1024;

class ContentExtractor
{

    async extract(metadata)
    {

        if (metadata.size > MAX_FILE_SIZE) {
            return {
                ...metadata,
                content: null,
            };
        }

        if (await isBinaryFile(metadata.absolutePath)) {
            return {
                ...metadata,
                content: null,
            };
        }

        const content = await fs.readFile(
            metadata.absolutePath,
            "utf8"
        );

        return {
            ...metadata,
            content,
        };
    }

}

export default new ContentExtractor();