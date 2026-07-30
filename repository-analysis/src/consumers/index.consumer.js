import RepoAnalysisConsumer from "./repo-analysis.consumer.js"
const registerConsumers = async () =>
{
    try {
        await RepoAnalysisConsumer()
    } catch (error) {
        console.log(error)
    }
}

export default registerConsumers