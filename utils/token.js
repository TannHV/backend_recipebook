// utils/token.js
import crypto from 'crypto';

export const generateRandomToken = (bytes = 32) =>
    crypto.randomBytes(bytes).toString("hex");         // 64 hex

export const hashToken = (token) =>
    crypto.createHash("sha256").update(token, "utf8").digest("hex");  // 64 hex