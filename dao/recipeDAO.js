// dao/recipeDAO.js
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import { toObjectId } from '../utils/mongo.js';
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
        const objectId = toObjectId(id);
        if (!objectId) return null;
        return db.collection(RECIPE_COLLECTION).findOne({ _id: objectId });
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
        const cursor = db.collection(RECIPE_COLLECTION).find(filter, { projection: { content: 0, ingredients: 0, steps: 0 } }).sort({ createdAt: -1 });
        const [items, total] = await Promise.all([
            cursor.skip(skip).limit(Number(limit)).toArray(),
            db.collection(RECIPE_COLLECTION).countDocuments(filter),
        ]);

        return { items, total, page: Number(page), limit: Number(limit) };
    }

    static async update(id, data) {
        const db = getDB();
        const objectId = toObjectId(id);
        if (!objectId) return null;
        const { value } = await db.collection(RECIPE_COLLECTION).findOneAndUpdate(
            { _id: objectId },
            { $set: { ...data, updatedAt: new Date() } },
            { returnDocument: 'after' }
        );
        const result = value ?? await db.collection(RECIPE_COLLECTION).findOne({ _id: objectId });
        return result;
    }

    static async delete(id) {
        const db = getDB();
        const objectId = toObjectId(id);
        if (!objectId) return null;
        return db.collection(RECIPE_COLLECTION).deleteOne({ _id: objectId });
    }

    static async hide(id, hidden = true) {
        const db = getDB();
        const objectId = toObjectId(id);
        if (!objectId) return null;
        const { value } = await db.collection(RECIPE_COLLECTION).findOneAndUpdate(
            { _id: objectId },
            { $set: { isHidden: !!hidden, updatedAt: new Date() } },
            { returnDocument: 'after' }
        );
        const result = value ?? await db.collection(RECIPE_COLLECTION).findOne({ _id: objectId });
        return result;
    }

    // --- interactions ---
    static async toggleLike(id, userId) {
        const db = getDB();
        const objectId = toObjectId(id);
        const userObjectId = toObjectId(userId);
        if (!objectId || !userObjectId) return null;

        const recipe = await db.collection(RECIPE_COLLECTION).findOne({ _id: objectId });
        if (!recipe) return null;

        const likesArr = Array.isArray(recipe.likes) ? recipe.likes : [];
        const already = likesArr.some(x => String(x) === String(userId));

        const update = already
            ? { $pull: { likes: userObjectId } }
            : { $addToSet: { likes: userObjectId } };

        const result = await db.collection(RECIPE_COLLECTION).findOneAndUpdate(
            { _id: objectId },
            update,
            { returnDocument: 'after' }
        );

        const doc = result?.value ?? await db.collection(RECIPE_COLLECTION).findOne({ _id: objectId });

        return doc ?? null;
    }

    static async rate(id, { user, stars, comment }) {
        const db = getDB();

        const objectId = toObjectId(id);
        const userObjectId = toObjectId(user);
        if (!objectId || !userObjectId) return null;

        const updExisting = await db.collection(RECIPE_COLLECTION).findOneAndUpdate(
            { _id: objectId, 'ratings.user': userObjectId },
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
            { _id: objectId },
            {
                $push: {
                    ratings: {
                        user: userObjectId,
                        stars: Number(stars),
                        comment,
                        createdAt: new Date(),
                    }
                }
            },
            { returnDocument: 'after' }
        );

        const doc = pushNew?.value ?? await db.collection(RECIPE_COLLECTION).findOne({ _id: objectId });
        return doc ?? null;
    }

    static async deleteRating(id, userIdToDelete) {
        const db = getDB();

        const objectId = toObjectId(id);
        const userObjectId = toObjectId(userIdToDelete);
        if (!objectId || !userObjectId) return null;

        const result = await db.collection(RECIPE_COLLECTION).findOneAndUpdate(
            { _id: objectId },
            { $pull: { ratings: { user: userObjectId } } },
            { returnDocument: 'after' }
        );

        const doc = result?.value ?? await db.collection(RECIPE_COLLECTION).findOne({ _id: objectId });
        if (!doc) return null;
        const stillHas = (doc.ratings || []).some(x => String(x.user) === String(userObjectId));
        if (stillHas) return null;

        return doc;
    }

    static async addComment(id, { user, content }) {
        const db = getDB();

        const objectId = toObjectId(id);
        const userObjectId = toObjectId(user);
        if (!userObjectId) return null;

        const comment = {
            _id: new ObjectId(),
            user: userObjectId,
            content,
            createdAt: new Date()
        };

        const result = await db.collection(RECIPE_COLLECTION).findOneAndUpdate(
            { _id: objectId },
            { $push: { comments: comment } },
            { returnDocument: 'after' }
        );

        return comment;
    }

    static async deleteComment(id, commentId) {
        const db = getDB();

        const objectId = toObjectId(id);
        const commentObjectId = toObjectId(commentId);
        if (!objectId || !commentObjectId) return null;

        const result = await db.collection(RECIPE_COLLECTION).findOneAndUpdate(
            { _id: objectId },
            { $pull: { comments: { _id: commentObjectId } } },
            { returnDocument: 'after' }
        );

        return result?.value ?? await db.collection(RECIPE_COLLECTION).findOne({ _id: objectId });
    }
}
