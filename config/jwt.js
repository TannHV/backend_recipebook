import jwt from "jsonwebtoken";
import { config } from "./env.js";

export const generateToken = (payload) => {
    return jwt.sign(payload, config.jwtSecret, { expiresIn: "7d" });
};

export const verifyToken = (token) => {
    return jwt.verify(token, config.jwtSecret);
};

