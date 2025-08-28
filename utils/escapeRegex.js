// utils/escapeRegex.js
export const escapeRegex = (s) =>
    String(s ?? '')
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .trim();
