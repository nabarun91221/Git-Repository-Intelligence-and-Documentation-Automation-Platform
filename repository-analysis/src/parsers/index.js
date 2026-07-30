import registry from "./registry.js";
import JavascriptParser from "./tree-sitter/javascript/parser.js";
import TypescriptParser from "./tree-sitter/typescript/parser.js";
import PythonParser from "./tree-sitter/python/parser.js";
import JavaParser from "./tree-sitter/java/parser.js";
import GoParser from "./tree-sitter/go/parser.js";
import RustParser from "./tree-sitter/rust/parser.js";

const javascript = new JavascriptParser();
const typescript = new TypescriptParser();
const tsx = new TypescriptParser({ tsx: true });
const python = new PythonParser();
const java = new JavaParser();
const go = new GoParser();
const rust = new RustParser();

for (const language of ["javascript", "js", "mjs", "cjs", "react", "jsx"]) registry.register(language, javascript);
for (const language of ["typescript", "ts"]) registry.register(language, typescript);
for (const language of ["tsx", "react-ts"]) registry.register(language, tsx);
registry.register("python", python);
registry.register("java", java);
registry.register("go", go);
registry.register("rust", rust);

export default registry;
