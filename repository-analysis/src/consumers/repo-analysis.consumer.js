import rabbitMqUtils from "../utils/rabbitMq.utils.js";
import repoAnalysisService from "../services/repo-analysis.service.js";
const RepoAnalysisConsumer = async () =>
{
    await rabbitMqUtils.consumeFromQueue("repo-analysis", async (job) =>
    {
        await repoAnalysisService.test(job)
    })

}
export default RepoAnalysisConsumer