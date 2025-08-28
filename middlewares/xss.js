// middlewares/xss.js
import { sanitizeBlogContent, sanitizeRecipeContent, sanitizeCommentText } from '../utils/sanitizeHtml.js';

export const sanitizeBlogFields = (fields = ['title', 'summary', 'content']) =>
    (req, _res, next) => { for (const f of fields) if (req.body?.[f]) req.body[f] = sanitizeBlogContent(req.body[f]); next(); };

export const sanitizeRecipeFields = (fields = ['title', 'summary', 'content']) =>
    (req, _res, next) => { for (const f of fields) if (req.body?.[f]) req.body[f] = sanitizeRecipeContent(req.body[f]); next(); };

export const sanitizeCommentField = (field = 'content') =>
    (req, _res, next) => { if (req.body?.[field]) req.body[field] = sanitizeCommentText(req.body[field]); next(); };
