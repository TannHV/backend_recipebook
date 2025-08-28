// src/config/db.js
import { MongoClient } from 'mongodb';
import { config } from './env.js';

class Database {
    constructor() {
        this.client = null;
        this.db = null;
        this._connecting = null; // tránh race-condition khi connect song song
    }

    async connect() {
        if (this.db) return this.db;         // đã kết nối rồi
        if (this._connecting) return this._connecting; // đang kết nối

        const uri = config.mongoUri;
        const dbName = config.dbName;

        if (!uri) throw new Error('MONGO_URI is required');
        if (!dbName) throw new Error('DB_NAME is required');

        const options = {
            // Các option hợp lệ cho MongoDB driver
            maxPoolSize: 10,                 // số kết nối trong pool
            serverSelectionTimeoutMS: 5000,  // timeout chọn server
            socketTimeoutMS: 45000,          // timeout socket
            retryWrites: true,               // tự động retry khi có lỗi
        };

        this.client = new MongoClient(uri, options);

        this._connecting = (async () => {
            await this.client.connect();
            this.db = this.client.db(dbName);

            // Kiểm tra kết nối thực sự
            await this.db.admin().ping();
            console.log('MongoDB connected');

            return this.db;
        })();

        try {
            return await this._connecting;
        } finally {
            this._connecting = null; // reset cờ
        }
    }

    getDB() {
        if (!this.db) throw new Error('Database chưa được khởi tạo. Hãy gọi connect() trước.');
        return this.db;
    }

    async close() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
            console.log('MongoDB connection closed');
        }
    }
}

const database = new Database();

export const connectDB = () => database.connect();
export const getDB = () => database.getDB();
export const closeDB = () => database.close();

// Graceful shutdown
const graceful = async (signal) => {
    console.log(`\n${signal} → shutting down gracefully...`);
    try {
        await closeDB();
    } finally {
        process.exit(0);
    }
};

process.on('SIGINT', () => graceful('SIGINT'));
process.on('SIGTERM', () => graceful('SIGTERM'));