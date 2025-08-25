
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
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
        const blogId = id.toString();
        return db.collection(BLOG_COLLECTION).findOne({ _id: new ObjectId(blogId) });
    },

    // Cập nhật blog
    async updateBlog(id, updateData) {
        const db = getDB();
        const blogId = id.toString();
        const { value } = await db.collection(BLOG_COLLECTION).findOneAndUpdate(
            { _id: new ObjectId(blogId) },
            { $set: { ...updateData, updatedAt: new Date() } },
            { returnDocument: 'after' }
        );
        return value;
    },

    // Xoá blog
    async deleteBlog(id) {
        const db = getDB();
        const blogId = id.toString();
        return db.collection(BLOG_COLLECTION).deleteOne({ _id: new ObjectId(blogId) });
    },

    // Thêm comment
    async addComment(id, commentData) {
        const db = getDB();
        const blogId = id.toString();
        const newComment = {
            _id: new ObjectId(),
            ...commentData,
            createdAt: new Date()
        };

        const { value } = await db.collection(BLOG_COLLECTION).findOneAndUpdate(
            { _id: new ObjectId(blogId) },
            { $push: { comments: newComment } },
            { returnDocument: 'after' }
        );
        return newComment;
    },

    // Xoá comment
    async deleteComment(id, commentId) {
        const db = getDB();
        const blogId = id.toString();
        const { value } = await db.collection(BLOG_COLLECTION).findOneAndUpdate(
            { _id: new ObjectId(blogId) },
            { $pull: { comments: { _id: new ObjectId(commentId) } } },
            { returnDocument: 'after' }
        );
        return value;
    }
};

export default BlogDAO;
