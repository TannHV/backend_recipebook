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

    // --------- LEGACY (token-only) – vẫn giữ để tương thích ----------
    static async setEmailVerifyToken(userId, { tokenHash, expiresAt }) {
        const db = getDB();
        const result = await db.collection(USER_COLLECTION).findOneAndUpdate(
            { _id: toObjectId(userId) },
            {
                $set: {
                    'emailVerification.tokenHash': tokenHash,
                    'emailVerification.tokenExpiresAt': expiresAt,   // đổi field cho đồng bộ hybrid
                    'emailVerification.codeHash': null,
                    'emailVerification.codeExpiresAt': null,
                    'emailVerification.codeAttempts': 0,
                    'emailVerification.codeLastSentAt': null
                }
            },
            { returnDocument: 'after', projection: { password: 0 } }
        );
        return result?.value ?? null;
    }

    static async verifyEmailByTokenHash(tokenHash) {
        const db = getDB();
        const now = new Date();
        const r = await db.collection(USER_COLLECTION).findOneAndUpdate(
            {
                "emailVerification.tokenHash": tokenHash,
                "emailVerification.tokenExpiresAt": { $gt: now }
            },
            {
                $set: { emailVerified: true },
                $unset: { emailVerification: "" },
                $currentDate: { updatedAt: true }
            },
            { returnDocument: "after", projection: { password: 0 } }
        );

        return r?.emailVerified ?? null;
    }

    static async setPasswordResetToken(userId, { tokenHash, expiresAt }) {
        const db = getDB();
        const result = await db.collection(USER_COLLECTION).findOneAndUpdate(
            { _id: toObjectId(userId) },
            {
                $set: {
                    'passwordReset.tokenHash': tokenHash,
                    'passwordReset.tokenExpiresAt': expiresAt,
                    'passwordReset.codeHash': null,
                    'passwordReset.codeExpiresAt': null,
                    'passwordReset.codeAttempts': 0,
                    'passwordReset.codeLastSentAt': null
                }
            },
            { returnDocument: 'after', projection: { password: 0 } }
        );
        return result?.value ?? null;
    }

    static async findByPasswordResetTokenHash(tokenHash) {
        const db = getDB();
        const now = new Date();
        return db.collection(USER_COLLECTION).findOne({
            'passwordReset.tokenHash': tokenHash,
            'passwordReset.tokenExpiresAt': { $gt: now }
        });
    }

    static async clearPasswordResetToken(userId) {
        const db = getDB();
        await db.collection(USER_COLLECTION).updateOne(
            { _id: toObjectId(userId) },
            { $unset: { passwordReset: '' }, $currentDate: { updatedAt: true } }
        );
    }

    static async markEmailUnverifiedAndUpdate(userId, newEmail) {
        const db = getDB();
        const result = await db.collection(USER_COLLECTION).findOneAndUpdate(
            { _id: toObjectId(userId) },
            {
                $set: {
                    email: newEmail,
                    emailVerified: false,
                    lastEmailChangedAt: new Date()
                },
                $unset: { emailVerification: '' }
            },
            { returnDocument: 'after', projection: { password: 0 } }
        );
        return result ?? null;
    }

    // ----------------- HYBRID – OTP + TOKEN -----------------

    // Ghi đồng thời token &/hoặc code cho VERIFY (tuỳ bạn truyền null hay có giá trị)
    static async setEmailVerifyBoth(userId, { tokenHash, tokenExpiresAt, codeHash, codeExpiresAt }) {
        const db = getDB();
        const $set = {
            'emailVerification.tokenHash': tokenHash ?? null,
            'emailVerification.tokenExpiresAt': tokenExpiresAt ?? null,
        };
        if (codeHash) {
            $set['emailVerification.codeHash'] = codeHash;
            $set['emailVerification.codeExpiresAt'] = codeExpiresAt;
            $set['emailVerification.codeAttempts'] = 0;
            $set['emailVerification.codeLastSentAt'] = new Date();
        } else {
            $set['emailVerification.codeHash'] = null;
            $set['emailVerification.codeExpiresAt'] = null;
            $set['emailVerification.codeAttempts'] = 0;
            $set['emailVerification.codeLastSentAt'] = null;
        }

        const r = await db.collection(USER_COLLECTION).findOneAndUpdate(
            { _id: toObjectId(userId) },
            { $set },
            { returnDocument: 'after', projection: { password: 0 } }
        );
        return r?.value ?? null;
    }

    // Xác thực email bằng CODE (OTP) – trả true/false/null
    static async verifyEmailByCode(userId, codeHash, maxAttempts = 5) {
        const db = getDB();
        const now = new Date();

        const user = await db.collection(USER_COLLECTION).findOne(
            { _id: toObjectId(userId) },
            { projection: { password: 0 } }
        );
        if (!user?.emailVerification) return null;

        const ev = user.emailVerification;

        if (!ev.codeHash || !ev.codeExpiresAt || ev.codeExpiresAt <= now) return null;
        if ((ev.codeAttempts ?? 0) >= maxAttempts) return null;

        if (ev.codeHash !== codeHash) {
            await db.collection(USER_COLLECTION).updateOne(
                { _id: toObjectId(userId) },
                { $inc: { "emailVerification.codeAttempts": 1 } }
            );
            return false;
        }

        const r = await db.collection(USER_COLLECTION).findOneAndUpdate(
            {
                _id: toObjectId(userId),
                "emailVerification.codeHash": codeHash,
                "emailVerification.codeExpiresAt": { $gt: new Date() }
            },
            {
                $set: { emailVerified: true },
                $unset: { emailVerification: "" },
                $currentDate: { updatedAt: true }
            },
            { returnDocument: "after", projection: { password: 0 } } // chỉ exclude
        );

        return r?.emailVerified ? true : null;
    }

    // Đặt đồng thời token &/hoặc code cho RESET (tuỳ bạn truyền)
    static async setPasswordResetBoth(userId, { tokenHash, tokenExpiresAt, codeHash, codeExpiresAt }) {
        const db = getDB();
        const $set = {
            'passwordReset.tokenHash': tokenHash ?? null,
            'passwordReset.tokenExpiresAt': tokenExpiresAt ?? null,
        };
        if (codeHash) {
            $set['passwordReset.codeHash'] = codeHash;
            $set['passwordReset.codeExpiresAt'] = codeExpiresAt;
            $set['passwordReset.codeAttempts'] = 0;
            $set['passwordReset.codeLastSentAt'] = new Date();
        } else {
            $set['passwordReset.codeHash'] = null;
            $set['passwordReset.codeExpiresAt'] = null;
            $set['passwordReset.codeAttempts'] = 0;
            $set['passwordReset.codeLastSentAt'] = null;
        }

        const r = await db.collection(USER_COLLECTION).findOneAndUpdate(
            { _id: toObjectId(userId) },
            { $set },
            { returnDocument: 'after', projection: { password: 0 } }
        );
        return r ?? null;
    }

    // Consume reset code (OTP): trả user nếu đúng, false nếu sai, null nếu hết hạn/không tồn tại
    static async consumeResetCode(email, codeHash, maxAttempts = 5) {
        const db = getDB();
        const now = new Date();
        const user = await db.collection(USER_COLLECTION).findOne({ email });
        if (!user?.passwordReset) return null;

        const pr = user.passwordReset;
        if (!pr.codeHash || !pr.codeExpiresAt || pr.codeExpiresAt <= now) return null;
        if ((pr.codeAttempts ?? 0) >= maxAttempts) return null;

        if (pr.codeHash !== codeHash) {
            await db.collection(USER_COLLECTION).updateOne(
                { _id: user._id },
                { $inc: { "passwordReset.codeAttempts": 1 } }
            );
            return false;
        }

        // Clear block reset để cho phép đặt mật khẩu mới
        await db.collection(USER_COLLECTION).updateOne(
            { _id: user._id },
            { $unset: { passwordReset: "" }, $currentDate: { updatedAt: true } }
        );
        return user;
    }
}

