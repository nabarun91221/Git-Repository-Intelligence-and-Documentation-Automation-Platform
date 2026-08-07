import mongoose from "mongoose";

const { Schema } = mongoose;

const ChunkMetadataSchema = new Schema({
    repositoryId: { type: String, required: true, index: true },
    fileId: { type: String, required: true },
    filePath: { type: String, required: true },
    language: { type: String, default: null },
    symbolId: { type: String, required: true },
    symbolType: { type: String, required: true },
    symbolName: { type: String, required: true },
    parentSymbol: { type: String, default: null },
    exported: { type: Boolean, default: false },
    visibility: { type: String, default: null },
    startLine: { type: Number, default: null },
    endLine: { type: Number, default: null },
    imports: { type: [String], default: undefined },
    calls: { type: [String], default: undefined },
    calledBy: { type: [String], default: undefined },
    inherits: { type: [String], default: undefined },
    implements: { type: [String], default: undefined },
    children: { type: [String], default: undefined },
    contentHash: { type: String, required: true },
}, { _id: false, strict: true });

const CodebaseEmbeddingSchema = new Schema({
    id: { type: String, required: true },
    chunkType: { type: String, required: true },
    symbolId: { type: String, required: true },
    symbolType: { type: String, required: true },
    symbolName: { type: String, required: true },
    parentSymbol: { type: String, default: null },
    content: { type: String, required: true },
    metadata: { type: ChunkMetadataSchema, required: true },
    embedding: { type: [Number], required: true },
    embeddingVersion: { type: Number, required: true, default: 1 },
}, { timestamps: true, versionKey: false });

// A re-analysis updates the same semantic chunk instead of creating duplicates.
CodebaseEmbeddingSchema.index({ "metadata.repositoryId": 1, id: 1 }, { unique: true });
CodebaseEmbeddingSchema.index({ "metadata.repositoryId": 1, "metadata.filePath": 1 });
CodebaseEmbeddingSchema.index({ "metadata.repositoryId": 1, symbolId: 1 });

export default mongoose.models.CodebaseEmbedding
    || mongoose.model("CodebaseEmbedding", CodebaseEmbeddingSchema);
