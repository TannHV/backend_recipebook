// dao/recipeDAO.js
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import RecipeModel, { RECIPE_COLLECTION } from '../models/recipe.model.js';

export default class RecipeDAO {
    static async createRecipe(data) {
        const db = getDB();
        const rec = new RecipeModel(data);
        const result = await db.collection(RECIPE_COLLECTION).insertOne(rec);
        return { _id: result.insertedId, ...rec };
    }

    static async getById(id) {
        const db = getDB();
        return db.collection(RECIPE_COLLECTION).findOne({ _id: new ObjectId(id) });
    }

    static async list({ q, tags, difficulty, isHidden = false, maxTotalTime, page = 1, limit = 12 }) {
        const db = getDB();
        const filter = { isHidden };

        if (q) {
            filter.$or = [
                { title: { $regex: q, $options: 'i' } },
                { summary: { $regex: q, $options: 'i' } },
                { 'ingredients.name': { $regex: q, $options: 'i' } },
            ];
        }
        if (Array.isArray(tags) && tags.length) filter.tags = { $in: tags };
        if (difficulty) filter.difficulty = difficulty;
        if (maxTotalTime) filter['time.total'] = { $lte: Number(maxTotalTime) };

        const skip = (Number(page) - 1) * Number(limit);
        const cursor = db.collection(RECIPE_COLLECTION).find(filter).sort({ createdAt: -1 });
        const [items, total] = await Promise.all([
            cursor.skip(skip).limit(Number(limit)).toArray(),
            db.collection(RECIPE_COLLECTION).countDocuments(filter),
        ]);

        return { items, total, page: Number(page), limit: Number(limit) };
    }

    static async update(id, data) {
        const db = getDB();
        const { value } = await db.collection(RECIPE_COLLECTION).findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: { ...data, updatedAt: new Date() } },
            { returnDocument: 'after' }
        );
        const result = value ?? await db.collection(RECIPE_COLLECTION).findOne({ _id: new ObjectId(id) });
        return result;
    }

    static async delete(id) {
        const db = getDB();
        return db.collection(RECIPE_COLLECTION).deleteOne({ _id: new ObjectId(id) });
    }

    static async hide(id, hidden = true) {
        const db = getDB();
        const { value } = await db.collection(RECIPE_COLLECTION).findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: { isHidden: !!hidden, updatedAt: new Date() } },
            { returnDocument: 'after' }
        );
        const result = value ?? await db.collection(RECIPE_COLLECTION).findOne({ _id: new ObjectId(id) });
        return result;
    }

    // --- interactions ---
    static async toggleLike(id, userId) {
        const db = getDB();
        let _id;
        try { _id = new ObjectId(String(id).trim()); } catch {
            return null;
        }

        const recipe = await db.collection(RECIPE_COLLECTION).findOne({ _id });
        if (!recipe) return null;

        const likesArr = Array.isArray(recipe.likes) ? recipe.likes : [];
        const already = likesArr.some(x => String(x) === String(userId));

        const uid = new ObjectId(String(userId));

        const update = already
            ? { $pull: { likes: uid } }
            : { $addToSet: { likes: uid } };

        const result = await db.collection(RECIPE_COLLECTION).findOneAndUpdate(
            { _id },
            update,
            { returnDocument: 'after' }
        );

        const doc = result?.value ?? await db.collection(RECIPE_COLLECTION).findOne({ _id });

        return doc ?? null;
    }

    static async rate(id, { user, stars, comment }) {
        const db = getDB();

        let _id, uid;
        try {
            _id = new ObjectId(String(id).trim());
            uid = new ObjectId(String(user));
        } catch {
            return null; // id hoặc userId không hợp lệ
        }

        const updExisting = await db.collection(RECIPE_COLLECTION).findOneAndUpdate(
            { _id, 'ratings.user': uid },
            {
                $set: {
                    'ratings.$.stars': Number(stars),
                    'ratings.$.comment': comment,
                    'ratings.$.updatedAt': new Date(),
                }
            },
            { returnDocument: 'after' }
        );

        if (updExisting?.value) return updExisting.value;

        const pushNew = await db.collection(RECIPE_COLLECTION).findOneAndUpdate(
            { _id },
            {
                $push: {
                    ratings: {
                        user: uid,
                        stars: Number(stars),
                        comment,
                        createdAt: new Date(),
                    }
                }
            },
            { returnDocument: 'after' }
        );

        const doc = pushNew?.value ?? await db.collection(RECIPE_COLLECTION).findOne({ _id });
        return doc ?? null;
    }

    static async deleteRating(id, userIdToDelete) {
        const db = getDB();
        let _id, uid;
        try {
            _id = new ObjectId(String(id).trim());
            uid = new ObjectId(String(userIdToDelete));
        } catch {
            return null; // id hoặc userId không hợp lệ
        }

        const result = await db.collection(RECIPE_COLLECTION).findOneAndUpdate(
            { _id },
            { $pull: { ratings: { user: uid } } },
            { returnDocument: 'after' }
        );

        const doc = result?.value ?? await db.collection(RECIPE_COLLECTION).findOne({ _id });
        if (!doc) return null;
        const stillHas = (doc.ratings || []).some(x => String(x.user) === String(uid));
        if (stillHas) return null;

        return doc;
    }

    static async addComment(id, { user, content }) {
        const db = getDB();

        const comment = {
            _id: new ObjectId(),
            user: new ObjectId(String(user)),
            content,
            createdAt: new Date()
        };

        const result = await db.collection(RECIPE_COLLECTION).findOneAndUpdate(
            { _id: new ObjectId(String(id)) },
            { $push: { comments: comment } },
            { returnDocument: 'after' }
        );

        return comment;
    }

    static async deleteComment(id, commentId) {
        const db = getDB();

        const result = await db.collection(RECIPE_COLLECTION).findOneAndUpdate(
            { _id: new ObjectId(String(id)) },
            { $pull: { comments: { _id: new ObjectId(String(commentId)) } } },
            { returnDocument: 'after' }
        );

        return result?.value ?? await db.collection(RECIPE_COLLECTION).findOne({ _id: new ObjectId(String(id)) });
    }
}
