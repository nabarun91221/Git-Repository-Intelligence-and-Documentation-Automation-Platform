import "dotenv/config.js"
import amqp from "amqplib";
let channel;
let rabbitMq_uri = process.env.RABBITMQ_URI || "amqp://localhost"
export const queues = Object.freeze(["repo-analysis"])
export const connectRabbit = async () =>
{
    const connection = await amqp.connect(rabbitMq_uri);

    channel = await connection.createChannel();
    // await channel.deleteQueue("repo-analysis");


    const queueAssertions = queues.map((queue) =>
        channel.assertQueue(queue, {
            durable: true,
            arguments: {
                "x-dead-letter-exchange": `${queue}.dlx`,
                "x-dead-letter-routing-key": `${queue}.failed`,
            },
        })
    );
    const deadLetterExchangeAssertions = queues.map((queue) =>

        channel.assertExchange(
            `${queue}.dlx`,
            "direct",
            {
                durable: true,
            }
        )
    )
    const deadLetterQueueAssertions = queues.map((queue) =>

        channel.assertQueue(
            `${queue}.dlq`,
            {
                durable: true,
            }
        )
    )
    const bindQueues = queues.map(queue =>
        channel.bindQueue(
            `${queue}.dlq`,
            `${queue}.dlx`,
            `${queue}.failed`
        )
    )

    await Promise.all(queueAssertions);
    await Promise.all(deadLetterExchangeAssertions);
    await Promise.all(deadLetterQueueAssertions);
    await Promise.all(bindQueues)

    console.log("RabbitMQ Connected..");
}

export function getChannel()
{
    return channel;
}