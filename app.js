// app.js
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import userRoutes from './routes/user.route.js';
import blogRoutes from './routes/blog.route.js';
import recipeRoutes from './routes/recipe.route.js';

dotenv.config();

const app = express();

// ---------- Core hardening ----------
app.set('x-powered-by', false);
// Nếu deploy sau proxy (Nginx/Render/Heroku/Netlify/Vercel), bật dòng dưới:
app.set('trust proxy', 1);

// Tạo request-id cho mỗi req (hữu ích khi xem log)
app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
});

app.use(morgan(':method :url :status :res[content-length] - :response-time ms reqid=:req[id]'));

// Bật bảo mật header cơ bản
app.use(helmet());
// Nếu có serve ảnh tĩnh từ domain khác, có thể cần tắt CORP:
// app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));

// CORS: whitelist theo ENV
const allowList = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const corsOptions = {
    origin: allowList.length
        ? (origin, cb) => {
            // cho phép Postman/curl (không có Origin)
            if (!origin) return cb(null, true);
            if (allowList.includes(origin)) return cb(null, true);
            return cb(new Error('Not allowed by CORS'));
        }
        : true, // nếu chưa cấu hình, tạm chấp nhận tất cả (dev)
    credentials: true,
};
app.use(cors(corsOptions));

// Nén response
app.use(compression());

// Body parsers (giới hạn kích thước)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ---------- Rate limits ----------
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', apiLimiter);

// (tuỳ chọn) limiter gắt cho login/signup
const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 30,
    message: { message: 'Too many auth requests, please try later.' },
});
app.use('/api/users/auth', authLimiter); // nếu bạn có /api/users/auth/*

// ---------- Health checks ----------
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});
app.get('/ready', (_req, res) => {
    // Nếu cần, có thể check DB hoặc cache sẵn ở đây
    res.status(200).json({ ready: true });
});

// ---------- Routes ----------
app.use('/api/users', userRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/recipes', recipeRoutes);

// ---------- 404 ----------
app.use((req, res) => {
    res.status(404).json({
        message: 'Route not found',
        method: req.method,
        path: req.originalUrl,
        requestId: req.id,
    });
});

// ---------- Error handler ----------
/* eslint-disable no-unused-vars */
app.use((err, req, res, _next) => {
    const status = err.status || 500;
    // Ẩn stack ở production
    const isProd = process.env.NODE_ENV === 'production';
    res.status(status).json({
        message: err.message || 'Internal Server Error',
        requestId: req.id,
        ...(isProd ? {} : { stack: err.stack }),
    });
});
/* eslint-enable no-unused-vars */

export default app;
