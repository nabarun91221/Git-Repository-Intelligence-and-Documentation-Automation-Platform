import crypto from "node:crypto";

/** Produces stable identifiers without relying on graph iteration order. */
export default class ChunkHasher {
    hash(value) {
        return crypto.createHash("sha256").update(value).digest("hex");
    }

    chunkId({ repositoryId, symbolId, chunkType }) {
        return `chunk:${this.hash(`${repositoryId}:${symbolId}:${chunkType}`).slice(0, 32)}`;
    }
}
