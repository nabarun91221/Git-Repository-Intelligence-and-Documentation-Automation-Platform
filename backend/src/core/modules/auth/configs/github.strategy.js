import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import User from "../models/user.model.js";
import OauthAccount from "../models/oauthAccount.model.js";

const clientID = process.env.GITHUB_CLIENT_ID;
const clientSecret = process.env.GITHUB_CLIENT_SECRET;
const callbackURL = process.env.GITHUB_CALLBACK_URL;

if (!clientID || !clientSecret || !callbackURL) {
    throw new Error(
        "GitHub OAuth requires GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_CALLBACK_URL."
    );
}

passport.use(
    new GitHubStrategy(
        {
            clientID,
            clientSecret,
            callbackURL,
            // The strategy uses this scope to fetch private primary emails too.
            scope: ["user:email"],
        },
        async (accessToken, _refreshToken, profile, done) => {
            try {
                const provider = "github";
                const providerUserId = profile.id;
                const email = profile.emails?.[0]?.value?.toLowerCase();

                if (!email) {
                    return done(
                        new Error("No email address was returned by GitHub. Please add a verified GitHub email.")
                    );
                }

                let oauthAccount = await OauthAccount.findOne({ provider, providerUserId });
                let user;

                if (oauthAccount) {
                    user = await User.findById(oauthAccount.userId);
                    await OauthAccount.updateOne(
                        { _id: oauthAccount._id },
                        { $set: { accessToken } }
                    );
                } else {
                    user = await User.findOne({ email });

                    if (!user) {
                        user = await User.create({
                            name: profile.displayName || profile.username || "GitHub user",
                            email,
                            avatar: profile.photos?.[0]?.value || "",
                        });
                    }

                    oauthAccount = await OauthAccount.create({
                        userId: user._id,
                        provider,
                        providerUserId,
                        accessToken,
                    });

                    await User.updateOne(
                        { _id: user._id },
                        { $addToSet: { oauthAccounts: oauthAccount._id } }
                    );
                }

                return done(null, user);
            } catch (error) {
                return done(error);
            }
        }
    )
);

export default passport;
