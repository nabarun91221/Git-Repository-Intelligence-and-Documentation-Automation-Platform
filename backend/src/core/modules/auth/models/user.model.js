import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    avatar: {
        type: String,
        default: ""
    },
    oauthAccounts: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "OauthAccount",
        default: []
    }
}, { timestamps: true })
export default mongoose.model("User", userSchema);
