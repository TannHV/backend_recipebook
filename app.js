// app.js
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
// v8 trở lên: dùng named import
import { rateLimit } from 'express-rate-limit';

import userRoutes from './routes/user.route.js';
import blogRoutes from './routes/blog.route.js';
import recipeRoutes from './routes/recipe.route.js';

// mới: error helpers
import globalErrorHandler from './middlewares/errorHandler.js';
import { AppError } from './utils/error.js';

dotenv.config();

const app = express();

// ---------- Core hardening ----------
app.set('x-powered-by', false);
app.set('trust proxy', 1);

// Gán request-id cho mọi request
app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
});

// morgan: đăng ký token để in req.id
morgan.token('id', (req) => req.id);
app.use(morgan(':method :url :status :res[content-length] - :response-time ms reqid=:id'));

// Security headers
app.use(helmet());
// Nếu bạn cần ảnh cross-origin:
// app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));

// CORS: whitelist theo ENV
const allowList = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const corsOptions = {
    origin: allowList.length
        ? (origin, cb) => {
            if (!origin) return cb(null, true);                // Postman/cURL
            if (allowList.includes(origin)) return cb(null, true);
            return cb(new Error('Not allowed by CORS'));       // sẽ đi vào error handler
        }
        : true, // dev: cho tất cả nếu chưa set
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

// // (tuỳ chọn) limiter gắt cho auth
// const authLimiter = rateLimit({
//     windowMs: 10 * 60 * 1000,
//     max: 30,
//     message: { message: 'Too many auth requests, please try later.' },
// });
// app.use('/api/users/auth', authLimiter); // nếu có nhóm /api/users/auth/*

// ---------- Health checks ----------
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});
app.get('/ready', (_req, res) => {
    res.status(200).json({ ready: true });
});

// ---------- Routes ----------
app.use('/api/users', userRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/recipes', recipeRoutes);

// ---------- 404 (đưa vào AppError) ----------
app.use((req, _res, next) => {
    next(new AppError(`Không tìm thấy route: ${req.originalUrl}`, 404));
});


// ---------- Global error handler (CUỐI CÙNG) ----------
app.use(globalErrorHandler);

export default app;
