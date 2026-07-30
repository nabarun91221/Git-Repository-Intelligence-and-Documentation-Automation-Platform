import "dotenv/config.js"
import express from "express"
import connectMongoDb from "./configs/mongoDb.config.js"
import { connectRabbit } from "./configs/rabbitMq.config.js"
import registerConsumers from "./consumers/index.consumer.js"
const PORT = process.env.PORT
const app = express()

app.use(express.json())
app.listen(PORT, async (err) =>
{

    if (!err) {
        await connectMongoDb()
        await connectRabbit()
        await registerConsumers()
        console.log("repository-analysis worker server is running on port:", PORT)
    }
})

