// dao/userDao.js
import { getDB } from '../config/db.js'
import { toObjectId } from '../utils/mongo.js';
import UserModel, { USER_COLLECTION } from '../models/user.model.js';

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
        const objectId = toObjectId(id);
        if (!objectId) return null;
        return db.collection(USER_COLLECTION).findOne({ _id: objectId });
    }

    static async findUserSafeById(id) {
        const db = getDB();
        const objectId = toObjectId(id);
        if (!objectId) return null;
        return db.collection(USER_COLLECTION).findOne(
            { _id: objectId },
            { projection: { password: 0 } } // loại password
        );
    }

    static async findByEmailOrUsername({ email, username }) {
        const db = getDB();
        return db.collection(USER_COLLECTION).findOne({
            $or: [{ email }, { username }]
        });
    }

    static async findByIdWithPassword(id) {
        const db = getDB();
        const objectId = toObjectId(id);
        if (!objectId) return null;
        return db.collection(USER_COLLECTION).findOne(
            { _id: objectId },
            { projection: { password: 1 } }
        );
    }

    static async updateUser(id, updateData) {
        const db = getDB();
        const objectId = toObjectId(id);
        if (!objectId) return null;
        const r = await db.collection(USER_COLLECTION).findOneAndUpdate(
            { _id: objectId },
            { $set: { ...updateData, updatedAt: new Date() } },
            { returnDocument: 'after', projection: { password: 0 } }
        );

        const doc = r && ('value' in r ? r.value : r);
        return doc ?? null;
    }

    static async deleteUser(id) {
        const db = getDB();
        const objectId = toObjectId(id);
        if (!objectId) return null;
        return db.collection(USER_COLLECTION).deleteOne({ _id: objectId });
    }
}
