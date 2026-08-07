import ollama from "ollama";
const embed = async (text, model) => 
{
    if (!model) throw new Error("EMBEDDING_MODEL is not configured");

    const response =
        await ollama.embed({
            model,
            input: text
        });

    return response.embeddings[0];
}
export default embed;