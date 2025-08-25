import BlogDAO from "../dao/blogDAO.js";
import { sanitizeBlogContent } from "../utils/sanitizeHtml.js";
import { deleteCloudinaryFile } from "../utils/cloudinaryUtils.js";

const DEFAULT_BLOG_THUMBNAIL = 'https://res.cloudinary.com/couldimagerecipebe/image/upload/v1753875465/thumbnail-default.png';

const blogController = {
    // Tạo blog mới
    async createBlog(req, res) {
        try {
            const { title, content } = req.body;
            const thumbnail = req.file?.path || DEFAULT_BLOG_THUMBNAIL;

            if (!title || !content) {
                if (req.file?.path) {
                    await deleteCloudinaryFile(req.file.path);
                }
                return res.status(400).json({ message: "Thiếu tiêu đề hoặc nội dung" });
            }

            const sanitized = sanitizeBlogContent(content);

            const newBlog = await BlogDAO.createBlog({
                title,
                content: sanitized,
                thumbnail,
                author: req.user._id,
            });

            res.status(201).json({ message: "Tạo blog thành công", blog: newBlog });
        } catch (err) {
            console.error("Create Blog error:", err);
            res.status(500).json({ message: "Lỗi khi tạo blog", error: err.message });
        }
    },

    // Lấy danh sách blog
    async getAllBlogs(req, res) {
        try {
            const blogs = await BlogDAO.getAllBlogs();
            res.json(blogs);
        } catch (err) {
            console.error("Get All Blogs error:", err);
            res.status(500).json({ message: "Lỗi khi lấy danh sách blog" });
        }
    },

    // Lấy blog theo ID
    async getBlogById(req, res) {
        try {
            const blog = await BlogDAO.getBlogById(req.params.id);
            if (!blog) return res.status(404).json({ message: "Không tìm thấy blog" });
            res.json(blog);
        } catch (err) {
            console.error("Get Blog by ID error:", err);
            res.status(500).json({ message: "Lỗi khi lấy blog" });
        }
    },

    // Cập nhật blog
    async updateBlog(req, res) {
        try {
            const blogId = req.params.id;
            const existingBlog = await BlogDAO.getBlogById(blogId);

            if (!existingBlog)
                return res.status(404).json({ message: "Không tìm thấy blog để cập nhật" });

            const { title, content } = req.body;
            if (!title || !content) {
                if (req.file?.path) {
                    await deleteCloudinaryFile(req.file.path);
                }
                return res.status(400).json({ message: "Thiếu tiêu đề hoặc nội dung" });
            }

            const sanitized = sanitizeBlogContent(content);
            const updatedData = {
                title,
                content: sanitized,
                updatedAt: new Date(),
                thumbnail: existingBlog.thumbnail
            };

            if (req.file?.path) {
                if (existingBlog.thumbnail && existingBlog.thumbnail !== DEFAULT_BLOG_THUMBNAIL) {
                    await deleteCloudinaryFile(existingBlog.thumbnail);
                }
                updatedData.thumbnail = req.file.path;
            }

            const updatedBlog = await BlogDAO.updateBlog(blogId, updatedData);
            res.json({ message: "Cập nhật blog thành công", blog: updatedBlog });
        } catch (err) {
            console.error("Update Blog error:", err);
            res.status(500).json({ message: "Lỗi khi cập nhật blog" });
        }
    },

    // Xoá blog
    async deleteBlog(req, res) {
        try {
            const blogId = req.params.id;
            const existingBlog = await BlogDAO.getBlogById(blogId);

            if (!existingBlog) return res.status(404).json({ message: "Không tìm thấy blog để xoá" });

            // Xoá ảnh Cloudinary nếu có
            if (existingBlog.thumbnail && existingBlog.thumbnail !== DEFAULT_BLOG_THUMBNAIL) {
                await deleteCloudinaryFile(existingBlog.thumbnail);
            }

            await BlogDAO.deleteBlog(blogId);
            res.json({ message: "Đã xoá blog" });
        } catch (err) {
            console.error("Delete Blog error:", err);
            res.status(500).json({ message: "Lỗi khi xoá blog" });
        }
    },

    //  Thêm comment
    async addComment(req, res) {
        try {
            const { content } = req.body;
            const blogId = req.params.id;

            if (!content || content.trim() === "") {
                return res.status(400).json({ message: "Nội dung bình luận không được để trống" });
            }

            const blog = await BlogDAO.getBlogById(blogId);
            if (!blog) {
                return res.status(404).json({ message: "Không tìm thấy blog" });
            }

            const updatedBlog = await BlogDAO.addComment(blogId, {
                user: req.user._id,
                content,
            });

            res.json({ message: "Đã thêm bình luận", blog_comment: updatedBlog });
        } catch (err) {
            console.error("Add comment error:", err);
            res.status(500).json({ message: "Lỗi khi thêm bình luận" });
        }
    },

    // Xoá comment khỏi blog
    async deleteComment(req, res) {
        try {
            const { blogId, commentId } = req.params;

            const blog = await BlogDAO.getBlogById(blogId);
            if (!blog) return res.status(404).json({ message: "Không tìm thấy blog" });

            const updatedBlog = await BlogDAO.deleteComment(blogId, commentId);
            res.json({ message: "Đã xoá bình luận", blog: updatedBlog });
        } catch (err) {
            console.error("Delete Comment error:", err);
            res.status(500).json({ message: "Lỗi khi xoá bình luận" });
        }
    },
};

export default blogController;
