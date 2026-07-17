import { connect } from "mongoose";
import "dotenv/config.js"
const mongo_uri = process.env.MONGODB_URI
console.log(mongo_uri)
const connectMongoDb = async () =>
{
    try {
        await connect(mongo_uri.toString())
        console.log("connected to mongoDb ")
    } catch (err) {
        console.log(err)
        process.exit(1);
    }
}
export default connectMongoDb