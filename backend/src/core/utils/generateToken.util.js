import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import "dotenv/config.js";

const accessTokenExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const refreshTokenExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "30d";

class GenerateToken
{
    generateAccessToken = async (user) =>
    {
        if (!process.env.JWT_ACCESS_SECRET) {
            throw new Error("JWT_ACCESS_SECRET is not configured.");
        }

        const tokenPayload = {
            sub: user._id,
            role: user.role
        };
        const accessToken = jwt.sign(tokenPayload, process.env.JWT_ACCESS_SECRET, {
            expiresIn: accessTokenExpiresIn,
        });
        return accessToken;
    }
    generateRefreshToken = async (user) =>
    {
        if (!process.env.JWT_REFRESH_SECRET) {
            throw new Error("JWT_REFRESH_SECRET is not configured.");
        }

        const tokenPayload = {
            sub: user._id,
            role: user.role,
            jti: crypto.randomUUID(),
        };
        const refreshToken = jwt.sign(tokenPayload, process.env.JWT_REFRESH_SECRET, {
            expiresIn: refreshTokenExpiresIn,
        });
        return refreshToken;
    }
    generateResetPasswordToken = async (user) =>
    {
        const tokenPayload = {
            sub: user._id,
        }
        const jwt_password_reset_token = process.env.JWT_RESET_PASSWORD_SECRET
        const passwordResetToken = await jwt.sign(tokenPayload, jwt_password_reset_token, { expiresIn: '15m' });
        return passwordResetToken;
    }
    generateEmailConformationToken = async (user) =>
    {
        const tokenPayload = {
            sub: user._id,
        }
        const jwt_email_confirmation_token = process.env.JWT_EMAIL_CONFIRMATION_SECRET
        const emailConfirmationToken = await jwt.sign(tokenPayload, jwt_email_confirmation_token, { expiresIn: '15m' });
        return emailConfirmationToken;
    }
}
export default new GenerateToken()
