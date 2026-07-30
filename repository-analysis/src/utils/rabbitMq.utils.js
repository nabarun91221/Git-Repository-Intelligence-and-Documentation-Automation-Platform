import { getChannel, queues } from "../configs/rabbitMq.config.js";

class RabbitMqUtils
{
    async publishToQueue(queue, job)
    {
        try {
            if (!queues.includes(queue)) {
                throw new Error("Unknown queue");
            }

            const channel = getChannel();

            if (!channel) {
                throw new Error("RabbitMQ channel is not initialized.");
            }

            return channel.sendToQueue(
                queue,
                Buffer.from(JSON.stringify(job)),
                {
                    persistent: true,
                }
            );
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
    consumeFromQueue = async (
        queue,
        callback,
        options = {
            noAck: false,
            requeueOnError: false,
        }
    ) =>
    {
        const channel = getChannel();

        if (!channel) {
            throw new Error("RabbitMQ channel is not initialized.");
        }

        if (!queues.includes(queue)) {
            throw new Error(`Unknown queue: ${queue}`);
        }

        return channel.consume(
            queue,
            async (msg) =>
            {
                if (!msg) {
                    console.warn(`Consumer for "${queue}" was cancelled.`);
                    return;
                }

                try {
                    const payload = JSON.parse(msg.content.toString());

                    await callback(payload);

                    if (!options.noAck) {
                        channel.ack(msg);
                    }
                } catch (err) {
                    console.error(`Error processing message from ${queue}:`, err);

                    if (!options.noAck) {
                        channel.nack(msg, false, options.requeueOnError);
                    }
                }
            },
            {
                noAck: options.noAck,
            }
        );
    };
}

export default new RabbitMqUtils();



