import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import passport from "passport";

import generateTokenUtil from "../../../utils/generateToken.util.js";
import RefreshSession from "../models/refreshSession.model.js";
import User from "../models/user.model.js";

const accessCookieMaxAge = Number(process.env.JWT_ACCESS_COOKIE_MAX_AGE_MS) || 15 * 60 * 1000;
const refreshCookieMaxAge = Number(process.env.JWT_REFRESH_COOKIE_MAX_AGE_MS) || 30 * 24 * 60 * 60 * 1000;
const isProduction = process.env.NODE_ENV === "production";

const cookieBaseOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
};

const tokenHash = (token) => crypto.createHash("sha256").update(token).digest("hex");

function clearAuthCookies(res) {
    res.clearCookie("accessToken", cookieBaseOptions);
    res.clearCookie("refreshToken", cookieBaseOptions);
}

async function issueTokenPair(res, user) {
    const accessToken = await generateTokenUtil.generateAccessToken(user);
    const refreshToken = await generateTokenUtil.generateRefreshToken(user);
    const refreshPayload = jwt.decode(refreshToken);

    await RefreshSession.create({
        userId: user._id,
        tokenHash: tokenHash(refreshToken),
        expiresAt: new Date(refreshPayload.exp * 1000),
    });

    res.cookie("accessToken", accessToken, {
        ...cookieBaseOptions,
        maxAge: accessCookieMaxAge,
    });
    res.cookie("refreshToken", refreshToken, {
        ...cookieBaseOptions,
        maxAge: refreshCookieMaxAge,
    });
}

class AuthControllers {
    githubLogin = passport.authenticate("github", {
        scope: ["user:email"],
        session: false,
    });

    githubCallback = [
        passport.authenticate("github", {
            failureRedirect: "/auth/github/failed",
            session: false,
        }),
        async (req, res) => {
            await issueTokenPair(res, req.user);

            const authResponse = {
                message: "GitHub authentication successful.",
                user: {
                    id: req.user._id,
                    name: req.user.name,
                    email: req.user.email,
                    avatar: req.user.avatar,
                },
            };

            const frontendUrl = process.env.FRONTEND_URL;
            if (frontendUrl) {
                const callbackUrl = new URL("/auth/github/callback", frontendUrl);
                callbackUrl.searchParams.set("user", JSON.stringify(authResponse.user));
                return res.redirect(callbackUrl.toString());
            }

            return res.status(200).json(authResponse);
        },
    ];

    refresh = async (req, res) => {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken || !process.env.JWT_REFRESH_SECRET) {
            clearAuthCookies(res);
            return res.status(401).json({ message: "Refresh token is missing or invalid." });
        }

        try {
            const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            const session = await RefreshSession.findOneAndDelete({
                userId: payload.sub,
                tokenHash: tokenHash(refreshToken),
            });

            if (!session) {
                clearAuthCookies(res);
                return res.status(401).json({ message: "Refresh token has already been used or was revoked." });
            }

            const user = await User.findById(payload.sub);
            if (!user) {
                clearAuthCookies(res);
                return res.status(401).json({ message: "User no longer exists." });
            }

            await issueTokenPair(res, user);
            return res.status(204).send();
        } catch {
            clearAuthCookies(res);
            return res.status(401).json({ message: "Refresh token is expired or invalid." });
        }
    };

    githubAuthFailed = (_req, res) =>
        res.status(401).json({ message: "GitHub authentication failed." });

    logout = async (req, res) => {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
            await RefreshSession.deleteOne({ tokenHash: tokenHash(refreshToken) });
        }
        clearAuthCookies(res);
        return res.status(204).send();
    };
}

export default new AuthControllers();
