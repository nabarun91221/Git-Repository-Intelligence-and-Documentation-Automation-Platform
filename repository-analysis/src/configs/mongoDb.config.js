import { connect } from "mongoose";
import "dotenv/config.js"
const mongo_uri = process.env.MONGODB_URI
const connectMongoDb = async () =>
{
    try {
        await connect(mongo_uri.toString())
        console.log("MongoDB Connected.. ")
    } catch (err) {
        console.log(err)
        process.exit(1);
    }
}
export default connectMongoDb