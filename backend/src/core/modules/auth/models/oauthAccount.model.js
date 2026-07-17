import mongoose from "mongoose";

const oauthAccountSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User"
    },
    provider: {
        type: String,
        required: true
    },
    providerUserId: {
        type: String,
        required: true,
    },
    accessToken: {
        type: String,
        required: true
    }
}, { timestamps: true })

// A GitHub account may only be linked to one local user.
oauthAccountSchema.index({ provider: 1, providerUserId: 1 }, { unique: true });

export default mongoose.model("OauthAccount", oauthAccountSchema);
