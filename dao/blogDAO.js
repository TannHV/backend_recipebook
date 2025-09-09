// dao/blogDAO.js
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import { toObjectId } from '../utils/mongo.js';
import BlogModel, { BLOG_COLLECTION } from '../models/blog.model.js';
import { escapeRegex } from '../utils/escapeRegex.js';

export default class BlogDAO {
    // Tạo blog mới
    static async createBlog(data) {
        const db = getDB();
        const blog = new BlogModel(data);
        const result = await db.collection(BLOG_COLLECTION).insertOne(blog);
        return { _id: result.insertedId, ...blog };
    }

    // Lấy tất cả blogs (sort theo mới nhất)
    static async getBlogs({ q, sort } = {}) {
        const db = getDB();

        // Build filter for search
        const filter = {};
        if (q && String(q).trim()) {
            const rx = new RegExp(escapeRegex(q), 'i');
            filter.$or = [
                { title: rx },
                { content: rx },
            ];
        }

        // Build sort mapping
        const sortKey = String(sort || 'newest').toLowerCase();
        let sortStage = { createdAt: -1 };
        if (sortKey === 'oldest') sortStage = { createdAt: 1 };
        else if (sortKey === 'title_az') sortStage = { title: 1 };
        else if (sortKey === 'title_za') sortStage = { title: -1 };
        else if (sortKey === 'most_commented') sortStage = { comment_count: -1, createdAt: -1 };

        const pipeline = [
            { $match: filter },
            { $addFields: { comment_count: { $size: { $ifNull: ["$comments", []] } } } },
            { $sort: sortStage },
        ];

        return db.collection(BLOG_COLLECTION).aggregate(pipeline).toArray();
    }

    static async getAllBlogs() {
        const db = getDB();
        return db.collection(BLOG_COLLECTION)
            .find({})
            .sort({ createdAt: -1 })
            .toArray();
    }

    // Lấy blog theo ID
    static async getBlogById(id) {
        const db = getDB();
        const objectId = toObjectId(id);
        if (!objectId) return null;

        return db.collection(BLOG_COLLECTION).findOne({ _id: objectId });
    }

    // Cập nhật blog
    static async updateBlog(id, updateData) {
        const db = getDB();
        const objectId = toObjectId(id);
        if (!objectId) return null;

        const { value } = await db.collection(BLOG_COLLECTION).findOneAndUpdate(
            { _id: objectId },
            { $set: { ...updateData, updatedAt: new Date() } },
            { returnDocument: 'after' }
        );

        const result = value ?? await db.collection(BLOG_COLLECTION).findOne({ _id: objectId });
        return result;
    }

    // Xoá blog
    static async deleteBlog(id) {
        const db = getDB();
        const objectId = toObjectId(id);
        if (!objectId) return null;

        return db.collection(BLOG_COLLECTION).deleteOne({ _id: objectId });
    }

    // Thêm comment
    static async addComment(id, commentData) {
        const db = getDB();
        const objectId = toObjectId(id);
        if (!objectId) return null;

        const newComment = {
            _id: new ObjectId(),
            ...commentData,
            createdAt: new Date()
        };

        await db.collection(BLOG_COLLECTION).findOneAndUpdate(
            { _id: objectId },
            { $push: { comments: newComment } },
            { returnDocument: 'after' }
        );
        return newComment;
    }

    // Xoá comment
    static async deleteComment(id, commentId) {
        const db = getDB();
        const objectId = toObjectId(id);
        const commentObjectId = toObjectId(commentId);
        if (!objectId || !commentObjectId) return null;

        await db.collection(BLOG_COLLECTION).findOneAndUpdate(
            { _id: objectId },
            { $pull: { comments: { _id: commentObjectId } } },
            { returnDocument: 'after' }
        );

        const blog = await db.collection(BLOG_COLLECTION).findOne(
            { _id: objectId },
            { projection: { comments: 1, _id: 0 } }
        );

        const comments = blog?.comments ?? [];
        return { comments, comment_count: comments.length };
    }
};

