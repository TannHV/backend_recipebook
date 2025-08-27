import BlogDAO from "../dao/blogDAO.js";
import { sanitizeBlogContent } from "../utils/sanitizeHtml.js";
import { deleteCloudinaryFile } from "../utils/cloudinaryUtils.js";
import { AppError, catchAsync } from "../utils/error.js";


const blogController = {
    // Tạo blog mới
    createBlog: catchAsync(async (req, res, next) => {
        const { title, content } = req.body;

        const thumbnail = req.file?.path || process.env.DEFAULT_BLOG_THUMBNAIL;

        if (!title?.trim() || !content?.trim()) {
            if (req.file?.path) await deleteCloudinaryFile(req.file.path);
            return next(new AppError("Thiếu tiêu đề hoặc nội dung", 400));
        }

        const sanitized = sanitizeBlogContent(content);

        const newBlog = await BlogDAO.createBlog({
            title,
            content: sanitized,
            thumbnail,
            author: req.user._id ?? req.user.id,
        });

        return res.status(201).json({
            success: true,
            message: "Tạo blog thành công",
            data: newBlog,
        });
    }),

    // Lấy danh sách blog
    getAllBlogs: catchAsync(async (_req, res, _next) => {
        const blogs = await BlogDAO.getAllBlogs();
        return res.json({ success: true, data: blogs });
    }),

    // Lấy blog theo ID
    getBlogById: catchAsync(async (req, res, next) => {
        const blog = await BlogDAO.getBlogById(req.params.id);
        if (!blog) return next(new AppError("Không tìm thấy blog", 404));
        res.json(blog);
    }),

    // Cập nhật blog
    updateBlog: catchAsync(async (req, res, next) => {
        const blogId = req.params.id;
        const existingBlog = await BlogDAO.getBlogById(blogId);
        if (!existingBlog) return next(new AppError("Không tìm thấy blog để cập nhật", 404));

        const { title, content } = req.body;
        if (!title || !content) {
            if (req.file?.path) await deleteCloudinaryFile(req.file.path);
            return next(new AppError("Thiếu tiêu đề hoặc nội dung", 400));
        }

        const sanitized = sanitizeBlogContent(content);
        const updatedData = {
            title,
            content: sanitized,
            updatedAt: new Date(),
            thumbnail: existingBlog.thumbnail,
        };

        if (req.file?.path) {
            if (
                existingBlog.thumbnail &&
                existingBlog.thumbnail !== process.env.DEFAULT_BLOG_THUMBNAIL
            ) {
                await deleteCloudinaryFile(existingBlog.thumbnail);
            }
            updatedData.thumbnail = req.file.path;
        }

        const updatedBlog = await BlogDAO.updateBlog(blogId, updatedData);
        res.json({ message: "Cập nhật blog thành công", blog: updatedBlog });
    }),

    // Xoá blog
    deleteBlog: catchAsync(async (req, res, next) => {
        const blogId = req.params.id;
        const existingBlog = await BlogDAO.getBlogById(blogId);
        if (!existingBlog) return next(new AppError("Không tìm thấy blog để xoá", 404));

        if (
            existingBlog.thumbnail &&
            existingBlog.thumbnail !== process.env.DEFAULT_BLOG_THUMBNAIL
        ) {
            await deleteCloudinaryFile(existingBlog.thumbnail);
        }

        await BlogDAO.deleteBlog(blogId);
        res.json({ message: "Đã xoá blog" });
    }),

    //  Thêm comment
    addComment: catchAsync(async (req, res, next) => {
        const { content } = req.body;
        const blogId = req.params.id;

        if (!content || content.trim() === "") {
            return next(new AppError("Nội dung bình luận không được để trống", 400));
        }

        const blog = await BlogDAO.getBlogById(blogId);
        if (!blog) return next(new AppError("Không tìm thấy blog", 404));

        const updatedBlog = await BlogDAO.addComment(blogId, {
            user: req.user._id ?? req.user.id,
            content,
        });

        res.json({ message: "Đã thêm bình luận", blog_comment: updatedBlog });
    }),

    // Xoá comment khỏi blog
    deleteComment: catchAsync(async (req, res, next) => {
        const { blogId, commentId } = req.params;

        const blog = await BlogDAO.getBlogById(blogId);
        if (!blog) return next(new AppError("Không tìm thấy blog", 404));

        const updatedBlog = await BlogDAO.deleteComment(blogId, commentId);
        res.json({ message: "Đã xoá bình luận", blog: updatedBlog });
    }),
};

export default blogController;
