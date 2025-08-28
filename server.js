// server.js
import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB, closeDB } from './config/db.js';
import { config } from './config/env.js';

let httpServer;

(async () => {
    try {
        // 1) Kết nối DB (dùng config.mongoUri, config.dbName)
        await connectDB(config.mongoUri, config.dbName);
        console.log('DB connected. Starting HTTP server...');

        // 2) Khởi động HTTP server (dùng config.port)
        httpServer = app.listen(config.port, () => {
            console.log(`Server running in ${config.nodeEnv} mode at http://localhost:${config.port}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
})();

// 3) Graceful shutdown: đóng HTTP rồi đến DB
const shutdown = async (signal) => {
    console.log(`\n${signal} received → shutting down gracefully...`);
    try {
        if (httpServer) {
            await new Promise((resolve) => httpServer.close(resolve));
            console.log('HTTP server closed');
        }
        await closeDB();
    } catch (e) {
        console.error('Shutdown error:', e);
    } finally {
        process.exit(0);
    }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// 4) Bắt lỗi chưa bắt kịp
process.on('unhandledRejection', (reason) => {
    console.error('UNHANDLED REJECTION:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    // tuỳ chọn: shutdown nhanh
    shutdown('UNCAUGHT_EXCEPTION');
});
