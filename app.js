// app.js
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { randomUUID } from 'crypto';
import { rateLimit } from 'express-rate-limit';
import hpp from 'hpp';

import userRoutes from './routes/user.route.js';
import blogRoutes from './routes/blog.route.js';
import recipeRoutes from './routes/recipe.route.js';

// mới: error helpers
import globalErrorHandler from './middlewares/errorHandler.js';
import { attachResponseHelpers } from './utils/apiResponse.js';
import { AppError } from './utils/error.js';

import { config } from './config/env.js';

const app = express();

/* ----------------------- Core hardening & logging ----------------------- */
app.set('x-powered-by', false);
app.set('trust proxy', 1);

// Gán request-id cho mọi request
app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
});

// morgan: in kèm request-id
morgan.token('id', (req) => req.id);
app.use(morgan(':method :url :status :res[content-length] - :response-time ms reqid=:id'));

// Security headers
app.use(helmet());
// Nếu cần ảnh cross-origin:
// app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));

/* --------------------------------- CORS -------------------------------- */
const allowList = config.corsOrigins; // mảng domain từ env.js
const corsOptions = {
    origin: allowList.length
        ? (origin, cb) => {
            if (!origin) return cb(null, true); // Postman/cURL
            if (allowList.includes(origin)) return cb(null, true);
            return cb(new Error('Not allowed by CORS'));
        }
        : true, // dev: mở tất cả nếu chưa set
    credentials: true,
};
app.use(cors(corsOptions));

/* ---------------------------- Body parsers ------------------------------ */
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

/* ---------- NoSQL injection sanitize (tương thích Express 5) ------------ */
/** Thay cho express-mongo-sanitize: KHÔNG gán lại req.query, chỉ mutate key bên trong object */
const sanitizeKeysDeep = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        // Đổi key nguy hiểm ($... hoặc có .)
        if (key.startsWith('$') || key.includes('.')) {
            const safeKey = key.replace(/^\$+/, '_').replace(/\./g, '_');
            if (safeKey !== key) {
                obj[safeKey] = val;
                delete obj[key];
            }
        }
        if (val && typeof val === 'object') sanitizeKeysDeep(val);
    }
};
app.use((req, _res, next) => {
    sanitizeKeysDeep(req.body);
    sanitizeKeysDeep(req.params);
    if (req.query && typeof req.query === 'object') sanitizeKeysDeep(req.query); // không gán lại req.query
    next();
});

/* --------------------- HTTP Parameter Pollution (HPP) ------------------- */
app.use(hpp({ whitelist: ['tags', 'sort'] }));

/* --------------------- Response helpers (ApiResponse) ------------------- */
app.use(attachResponseHelpers);

/* ------------------------------ Rate limits ----------------------------- */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
});
const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
});

// áp cho toàn bộ /api trước
app.use('/api', apiLimiter);

/* ----------------------------- Health checks ---------------------------- */
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});
app.get('/ready', (_req, res) => {
    // nếu muốn check DB thật sự: import mongoose & kiểm tra readyState === 1
    res.status(200).json({ ready: true });
});

/* -------------------------------- Routes -------------------------------- */
// Lưu ý: áp limiter TRƯỚC khi mount userRoutes để /login|/register được bảo vệ
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);

app.use('/api/users', userRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/recipes', recipeRoutes);

/* ---------------------------------- 404 --------------------------------- */
app.use((req, _res, next) => {
    next(new AppError(`Không tìm thấy route: ${req.originalUrl}`, 404));
});

/* ------------------------ Global error handler -------------------------- */
app.use(globalErrorHandler);

export default app;