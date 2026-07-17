import jwt from "jsonwebtoken";

const verifyRequestJwt = (req, res, next) =>
{
    const token = req.cookies.accessToken;
    if (!token) return res.status(401).json({ message: "Access token is required." });

    try {
        req.user = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        return next();
    } catch {
        return res.status(401).json({ message: "Access token is expired or invalid." });
    }
};

export default verifyRequestJwt;
