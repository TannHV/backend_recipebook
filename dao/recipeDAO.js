// dao/recipeDAO.js
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import { toObjectId } from '../utils/mongo.js';
import RecipeModel, { RECIPE_COLLECTION } from '../models/recipe.model.js';
import { USER_COLLECTION } from '../models/user.model.js';
import { escapeRegex } from '../utils/escapeRegex.js';

export default class RecipeDAO {
    // ------------------ CRUD ------------------
    static async createRecipe(data) {
        const db = getDB();

        // đảm bảo createdBy là ObjectId ngay từ đầu
        const createdBy = data?.createdBy ?? data?.author ?? data?.user;
        const createdByObj =
            createdBy && ObjectId.isValid(String(createdBy))
                ? new ObjectId(String(createdBy))
                : createdBy;

        const rec = new RecipeModel({
            ...data,
            createdBy: createdByObj ?? data?.createdBy,
        });

        const result = await db.collection(RECIPE_COLLECTION).insertOne(rec);
        return { _id: result.insertedId, ...rec };
    }

    static async getById(id) {
        const db = getDB();
        const objectId = toObjectId(id);
        if (!objectId) return null;
        return db.collection(RECIPE_COLLECTION).findOne({ _id: objectId });
    }

    // (LIST cũ – giữ nguyên để tương thích, KHÔNG join user)
    static async list({ q, tags, difficulty, isHidden = false, maxTotalTime, page = 1, limit = 12, sort }) {
        const db = getDB();
        const filter = { isHidden };

        if (q && q.trim()) {
            const safe = escapeRegex(q.trim());
            const flexible = safe.replace(/\s+/g, '.*');
            const rx = new RegExp(flexible, 'i');
            filter.$or = [{ title: rx }, { 'ingredients.name': rx }];
        }
        if (Array.isArray(tags) && tags.length) filter.tags = { $in: tags };
        if (difficulty) filter.difficulty = difficulty;
        if (maxTotalTime) filter['time.total'] = { $lte: Number(maxTotalTime) };

        const skip = (Number(page) - 1) * Number(limit);
        const cursor = db
            .collection(RECIPE_COLLECTION)
            .find(filter, { projection: { content: 0, ingredients: 0, steps: 0 } })
            .sort(sort || { createdAt: -1 });

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

        // nếu có cập nhật createdBy thì cũng ép về ObjectId
        if (data?.createdBy && ObjectId.isValid(String(data.createdBy))) {
            data.createdBy = new ObjectId(String(data.createdBy));
        }

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

    // ------------------ Interactions ------------------
    static async toggleLike(id, userId) {
        const db = getDB();
        const objectId = toObjectId(id);
        const userObjectId = toObjectId(userId);
        if (!objectId || !userObjectId) return null;

        const recipe = await db.collection(RECIPE_COLLECTION).findOne({ _id: objectId });
        if (!recipe) return null;

        const likesArr = Array.isArray(recipe.likes) ? recipe.likes : [];
        const already = likesArr.some(x => String(x) === String(userObjectId));

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

        // update nếu đã tồn tại
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

        // nếu chưa có thì push mới
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

    static async updateRate(recipeId, { user, stars, comment }) {
        const db = getDB();
        const _id = toObjectId(recipeId);
        const uid = toObjectId(user);
        if (!_id || !uid) return null;

        const now = new Date();
        const upd = await db.collection(RECIPE_COLLECTION).updateOne(
            { _id, 'ratings.user': uid },
            { $set: { 'ratings.$.stars': Number(stars), 'ratings.$.comment': comment, 'ratings.$.updatedAt': now } }
        );

        if (upd.matchedCount === 0) {
            const e = new Error('RATING_NOT_FOUND');
            e.code = 'RATING_NOT_FOUND';
            throw e;
        }
        return db.collection(RECIPE_COLLECTION).findOne({ _id }, { projection: { ratings: 1 } });
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
        if (!objectId || !userObjectId) return null;

        const comment = {
            _id: new ObjectId(),
            user: userObjectId,
            content,
            createdAt: new Date()
        };

        await db.collection(RECIPE_COLLECTION).findOneAndUpdate(
            { _id: objectId },
            { $push: { comments: comment } },
            { returnDocument: 'after' }
        );

        // trả ngay comment vừa thêm (FE có thể refetch để lấy userInfo đầy đủ)
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

    // -------------- LIST/DETAIL có JOIN + CAST --------------
    static async getByIdWithUsers(id) {
        const db = getDB();
        const _id = toObjectId(id);
        if (!_id) return null;

        const [doc] = await db.collection(RECIPE_COLLECTION).aggregate([
            { $match: { _id } },

            // Chuẩn hoá kiểu dữ liệu về ObjectId
            {
                $addFields: {
                    createdByObj: {
                        $cond: [
                            { $eq: [{ $type: "$createdBy" }, "objectId"] },
                            "$createdBy",
                            { $convert: { input: "$createdBy", to: "objectId", onError: "$createdBy", onNull: "$createdBy" } }
                        ]
                    },
                    ratingUserIds: {
                        $map: {
                            input: { $ifNull: ["$ratings", []] },
                            as: "r",
                            in: {
                                $cond: [
                                    { $eq: [{ $type: "$$r.user" }, "objectId"] },
                                    "$$r.user",
                                    { $convert: { input: "$$r.user", to: "objectId", onError: "$$r.user", onNull: "$$r.user" } }
                                ]
                            }
                        }
                    },
                    commentUserIds: {
                        $map: {
                            input: { $ifNull: ["$comments", []] },
                            as: "c",
                            in: {
                                $cond: [
                                    { $eq: [{ $type: "$$c.user" }, "objectId"] },
                                    "$$c.user",
                                    { $convert: { input: "$$c.user", to: "objectId", onError: "$$c.user", onNull: "$$c.user" } }
                                ]
                            }
                        }
                    }
                }
            },

            // Tác giả
            {
                $lookup: {
                    from: USER_COLLECTION,
                    let: { uid: "$createdByObj" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$_id", "$$uid"] } } },
                        { $project: { _id: 1, username: 1, fullname: 1, avatar: 1 } },
                    ],
                    as: "authorDoc",
                },
            },
            { $addFields: { authorSummary: { $first: "$authorDoc" } } },
            { $project: { authorDoc: 0 } },

            // Người đánh giá
            {
                $lookup: {
                    from: USER_COLLECTION,
                    let: { rUsers: "$ratingUserIds" },
                    pipeline: [
                        { $match: { $expr: { $in: ["$_id", "$$rUsers"] } } },
                        { $project: { _id: 1, username: 1, fullname: 1, avatar: 1 } },
                    ],
                    as: "ratingUsers",
                },
            },
            {
                $addFields: {
                    ratings: {
                        $map: {
                            input: { $ifNull: ["$ratings", []] },
                            as: "r",
                            in: {
                                $mergeObjects: [
                                    "$$r",
                                    {
                                        userInfo: {
                                            $let: {
                                                vars: {
                                                    idx: {
                                                        $indexOfArray: [
                                                            "$ratingUsers._id",
                                                            {
                                                                $cond: [
                                                                    { $eq: [{ $type: "$$r.user" }, "objectId"] },
                                                                    "$$r.user",
                                                                    { $convert: { input: "$$r.user", to: "objectId", onError: "$$r.user", onNull: "$$r.user" } }
                                                                ]
                                                            }
                                                        ]
                                                    },
                                                },
                                                in: {
                                                    $cond: [
                                                        { $ne: ["$$idx", -1] },
                                                        {
                                                            _id: { $arrayElemAt: ["$ratingUsers._id", "$$idx"] },
                                                            username: { $arrayElemAt: ["$ratingUsers.username", "$$idx"] },
                                                            fullname: { $arrayElemAt: ["$ratingUsers.fullname", "$$idx"] },
                                                            avatar: { $arrayElemAt: ["$ratingUsers.avatar", "$$idx"] },
                                                        },
                                                        null,
                                                    ],
                                                },
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
            },
            { $project: { ratingUsers: 0 } },

            // Người bình luận
            {
                $lookup: {
                    from: USER_COLLECTION,
                    let: { cUsers: "$commentUserIds" },
                    pipeline: [
                        { $match: { $expr: { $in: ["$_id", "$$cUsers"] } } },
                        { $project: { _id: 1, username: 1, fullname: 1, avatar: 1 } },
                    ],
                    as: "commentUsers",
                },
            },
            {
                $addFields: {
                    comments: {
                        $map: {
                            input: { $ifNull: ["$comments", []] },
                            as: "c",
                            in: {
                                $mergeObjects: [
                                    "$$c",
                                    {
                                        userInfo: {
                                            $let: {
                                                vars: {
                                                    idx: {
                                                        $indexOfArray: [
                                                            "$commentUsers._id",
                                                            {
                                                                $cond: [
                                                                    { $eq: [{ $type: "$$c.user" }, "objectId"] },
                                                                    "$$c.user",
                                                                    { $convert: { input: "$$c.user", to: "objectId", onError: "$$c.user", onNull: "$$c.user" } }
                                                                ]
                                                            }
                                                        ]
                                                    },
                                                },
                                                in: {
                                                    $cond: [
                                                        { $ne: ["$$idx", -1] },
                                                        {
                                                            _id: { $arrayElemAt: ["$commentUsers._id", "$$idx"] },
                                                            username: { $arrayElemAt: ["$commentUsers.username", "$$idx"] },
                                                            fullname: { $arrayElemAt: ["$commentUsers.fullname", "$$idx"] },
                                                            avatar: { $arrayElemAt: ["$commentUsers.avatar", "$$idx"] },
                                                        },
                                                        null,
                                                    ],
                                                },
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
            },
            { $project: { commentUsers: 0 } },
        ]).toArray();

        return doc || null;
    }

    static async listWithAuthor({
        q, tags, difficulty,
        isHidden = false,
        maxTotalTime,
        page = 1,
        limit = 12,
        sort
    }) {
        const db = getDB();
        const filter = { isHidden };

        // ---- text filter ----
        if (q && q.trim()) {
            const safe = escapeRegex(q.trim());
            const flexible = safe.replace(/\s+/g, '.*');
            const rx = new RegExp(flexible, 'i');
            filter.$or = [{ title: rx }, { 'ingredients.name': rx }];
        }
        if (Array.isArray(tags) && tags.length) filter.tags = { $in: tags };
        if (difficulty) filter.difficulty = difficulty;
        if (maxTotalTime != null) filter['time.total'] = { $lte: Number(maxTotalTime) };

        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.max(1, Number(limit) || 12);
        const skip = (pageNum - 1) * limitNum;

        // ---- parse sort ----
        const parseSort = (s) => {
            if (!s) return { createdAt: -1 };
            if (typeof s === 'object') return s;
            const str = String(s).trim().toLowerCase();

            // phổ biến
            if (str === 'newest' || str === 'created_desc') return { createdAt: -1 };
            if (str === 'oldest' || str === 'created_asc') return { createdAt: 1 };
            if (str === 'updated_desc') return { updatedAt: -1 };
            if (str === 'updated_asc') return { updatedAt: 1 };
            if (str === 'likes_desc' || str === 'most_liked' || str === 'popular')
                return { likesCount: -1, createdAt: -1 };
            if (str === 'rating_desc' || str === 'top')
                return { 'metrics.avgRating': -1, createdAt: -1 };

            // thử parse JSON (ví dụ sort={"createdAt":-1})
            try {
                const obj = JSON.parse(s);
                if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
            } catch (_) { }
            return { createdAt: -1 };
        };
        const sortObj = parseSort(sort);

        const pipeline = [
            { $match: filter },

            // các field phụ trợ để sort
            {
                $addFields: {
                    likesCount: { $size: { $ifNull: ['$likes', []] } },
                    'metrics.avgRating': {
                        $let: {
                            vars: { r: { $ifNull: ['$ratings', []] } },
                            in: {
                                $cond: [
                                    { $gt: [{ $size: '$$r' }, 0] },
                                    {
                                        $divide: [
                                            {
                                                $sum: {
                                                    $map: { input: '$$r', as: 'x', in: { $toDouble: '$$x.stars' } }
                                                }
                                            },
                                            { $size: '$$r' }
                                        ]
                                    },
                                    0
                                ]
                            }
                        }
                    }
                }
            },

            { $sort: sortObj },
            { $skip: Number(skip) },
            { $limit: Number(limitNum) },

            // cast createdBy -> ObjectId nếu đang là string
            {
                $addFields: {
                    createdByObj: {
                        $cond: [
                            { $eq: [{ $type: '$createdBy' }, 'objectId'] },
                            '$createdBy',
                            { $convert: { input: '$createdBy', to: 'objectId', onError: '$createdBy', onNull: '$createdBy' } }
                        ]
                    }
                }
            },

            // join tác giả
            {
                $lookup: {
                    from: USER_COLLECTION,
                    let: { uid: '$createdByObj' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$_id', '$$uid'] } } },
                        { $project: { _id: 1, username: 1, fullname: 1, avatar: 1 } }
                    ],
                    as: 'authorDoc'
                }
            },
            { $addFields: { authorSummary: { $first: '$authorDoc' } } },

            // gọn dữ liệu trả về
            { $project: { authorDoc: 0, content: 0, ingredients: 0, steps: 0 } }
        ];

        const [items, total] = await Promise.all([
            db.collection(RECIPE_COLLECTION).aggregate(pipeline).toArray(),
            db.collection(RECIPE_COLLECTION).countDocuments(filter)
        ]);

        return { items, total, page: pageNum, limit: limitNum };
    }

    static async listByAuthor(userId, { page = 1, limit = 12, sort = "newest" }) {
        const db = getDB();

        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.max(1, Number(limit) || 12);
        const skip = (pageNum - 1) * limitNum;

        // parse sort giống hàm listWithAuthor
        const parseSort = (s) => {
            if (!s) return { createdAt: -1 };
            const str = String(s).trim().toLowerCase();
            if (str === "newest") return { createdAt: -1 };
            if (str === "oldest") return { createdAt: 1 };
            if (str === "updated_desc") return { updatedAt: -1 };
            if (str === "updated_asc") return { updatedAt: 1 };
            return { createdAt: -1 };
        };
        const sortObj = parseSort(sort);

        // ép userId sang ObjectId nếu có thể
        const authorId =
            ObjectId.isValid(userId) ? new ObjectId(userId) : String(userId);

        const pipeline = [
            {
                $match: {
                    createdBy: authorId,
                    isHidden: false, // chỉ lấy công khai, nếu muốn
                },
            },
            {
                $addFields: {
                    likesCount: { $size: { $ifNull: ["$likes", []] } },
                    "metrics.avgRating": {
                        $let: {
                            vars: { r: { $ifNull: ["$ratings", []] } },
                            in: {
                                $cond: [
                                    { $gt: [{ $size: "$$r" }, 0] },
                                    {
                                        $divide: [
                                            {
                                                $sum: {
                                                    $map: {
                                                        input: "$$r",
                                                        as: "x",
                                                        in: { $toDouble: "$$x.stars" },
                                                    },
                                                },
                                            },
                                            { $size: "$$r" },
                                        ],
                                    },
                                    0,
                                ],
                            },
                        },
                    },
                },
            },
            { $sort: sortObj },
            { $skip: skip },
            { $limit: limitNum },
            {
                $lookup: {
                    from: USER_COLLECTION,
                    let: { uid: "$createdBy" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$_id", "$$uid"] } } },
                        { $project: { _id: 1, username: 1, fullname: 1, avatar: 1 } },
                    ],
                    as: "authorDoc",
                },
            },
            { $addFields: { authorSummary: { $first: "$authorDoc" } } },
            { $project: { authorDoc: 0, content: 0, ingredients: 0, steps: 0 } },
        ];

        const [items, total] = await Promise.all([
            db.collection(RECIPE_COLLECTION).aggregate(pipeline).toArray(),
            db.collection(RECIPE_COLLECTION).countDocuments({ createdBy: authorId }),
        ]);

        return { items, total, page: pageNum, limit: limitNum };
    }
}
