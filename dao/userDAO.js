// dao/user.dao.js
import { getDB } from '../config/db.js';
import { ObjectId } from 'mongodb';
import { USER_COLLECTION } from '../models/user.model.js';
import UserModel from '../models/user.model.js';

export default class UserDAO {
    static async createUser(userDataRaw) {
        const db = getDB();
        const userData = new UserModel(userDataRaw);
        const result = await db.collection(USER_COLLECTION).insertOne(userData);
        return { _id: result.insertedId, ...userData };
    }

    static async getAllUsers() {
        const db = getDB();
        return db.collection(USER_COLLECTION).find({}).toArray();
    }

    static async findUserByEmail(email) {
        const db = getDB();
        return db.collection(USER_COLLECTION).findOne({ email });
    }

    static async findUserByUsername(username) {
        const db = getDB();
        return db.collection(USER_COLLECTION).findOne({ username });
    }

    static async findUserById(id) {
        const db = getDB();
        const userId = id.toString();
        return db.collection(USER_COLLECTION).findOne({ _id: new ObjectId(userId) });
    }

    static async findByEmailOrUsername({ email, username }) {
        const db = getDB();
        return db.collection(USER_COLLECTION).findOne({
            $or: [{ email }, { username }]
        });
    }

    static async findByIdWithPassword(id) {
        const db = getDB();
        const userId = id.toString();
        return db.collection(USER_COLLECTION).findOne(
            { _id: new ObjectId(userId) },
            { projection: { password: 1 } }
        );
    }

    static async updateUser(id, updateData) {
        const db = getDB();
        const userId = id.toString();
        const result = await db
            .collection(USER_COLLECTION)
            .findOneAndUpdate(
                { _id: new ObjectId(userId) },
                { $set: { ...updateData, updatedAt: new Date() } },
                { returnDocument: 'after' }
            );

        if (!result || !result.value) return null; // tránh destructure null

        return result.value;
    }

    static async deleteUser(id) {
        const db = getDB();
        return db.collection(USER_COLLECTION).deleteOne({ _id: new ObjectId(id) });
    }
}
