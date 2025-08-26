// server.js
import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB, closeDB } from './config/db.js';

const PORT = process.env.PORT || 3000;
let httpServer; // giữ tham chiếu để đóng khi shutdown

(async () => {
    try {
        // 1) Kết nối DB trước
        await connectDB();
        console.log('DB connected. Starting HTTP server...');

        // 2) Khởi động HTTP server
        httpServer = app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });

        // (Tuỳ) Đặt timeout/keep-alive nếu cần:
        // httpServer.keepAliveTimeout = 65000;
        // httpServer.headersTimeout = 66000;

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
