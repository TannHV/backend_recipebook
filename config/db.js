import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);

let db;

export async function connectDB() {
    try {
        await client.connect();
        db = client.db(process.env.BD_NAME);
        console.log("MongoDB Atlas connected");
    } catch (err) {
        console.error("MongoDB Atlas connection error:", err);
        process.exit(1);
    }
}

export function getDB() {
    if (!db) throw new Error("DB not initialized.");
    return db;
}
