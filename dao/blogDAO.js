
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import { toObjectId } from '../utils/mongo.js';
import BlogModel, { BLOG_COLLECTION } from '../models/blog.model.js';

const BlogDAO = {
    // Tạo blog mới
    async createBlog(data) {
        const db = getDB();
        const blog = new BlogModel(data);
        const result = await db.collection(BLOG_COLLECTION).insertOne(blog);
        return { _id: result.insertedId, ...blog };
    },

    // Lấy tất cả blogs (sort theo mới nhất)
    async getAllBlogs() {
        const db = getDB();
        return db.collection(BLOG_COLLECTION)
            .find({})
            .sort({ createdAt: -1 })
            .toArray();
    },

    // Lấy blog theo ID
    async getBlogById(id) {
        const db = getDB();
        const objectId = toObjectId(id);
        if (!objectId) return null;

        return db.collection(BLOG_COLLECTION).findOne({ _id: objectId });
    },

    // Cập nhật blog
    async updateBlog(id, updateData) {
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
    },

    // Xoá blog
    async deleteBlog(id) {
        const db = getDB();
        const objectId = toObjectId(id);
        if (!objectId) return null;

        return db.collection(BLOG_COLLECTION).deleteOne({ _id: objectId });
    },

    // Thêm comment
    async addComment(id, commentData) {
        const db = getDB();
        const objectId = toObjectId(id);
        if (!objectId) return null;

        const newComment = {
            _id: new ObjectId(),
            ...commentData,
            createdAt: new Date()
        };

        const { value } = await db.collection(BLOG_COLLECTION).findOneAndUpdate(
            { _id: objectId },
            { $push: { comments: newComment } },
            { returnDocument: 'after' }
        );
        return newComment;
    },

    // Xoá comment
    async deleteComment(id, commentId) {
        const db = getDB();
        const objectId = toObjectId(id);
        const commentObjectId = toObjectId(commentId);
        if (!objectId || !commentObjectId) return null;

        const { value } = await db.collection(BLOG_COLLECTION).findOneAndUpdate(
            { _id: objectId },
            { $pull: { comments: { _id: commentObjectId } } },
            { returnDocument: 'after' }
        );
        return value;
    }
};

export default BlogDAO;
