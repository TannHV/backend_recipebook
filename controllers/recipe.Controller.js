import RecipeDAO from '../dao/recipeDAO.js';
import { sanitizeRecipeContent } from '../utils/sanitizeHtml.js';
import { deleteCloudinaryFile } from '../utils/cloudinaryUtils.js';
import { AppError, catchAsync } from "../utils/error.js";

const mustParseJSON = (value, field) => {
    if (value === undefined) return undefined;       // không gửi thì bỏ qua
    if (Array.isArray(value)) return value;          // đã là array
    if (typeof value !== 'string') return value;     // đã là object
    try {
        return JSON.parse(value);
    } catch (e) {
        const sample = field === 'ingredients'
            ? `[{"name":"Gà ta","quantity":1,"unit":"kg"}]`
            : `["Bước 1","Bước 2"]`;
        const err = new Error(`${field} phải là JSON hợp lệ. Ví dụ: ${sample}`);
        err.status = 400;
        throw err;
    }
};

const recipeController = {
    // Tạo công thức mới
    create: catchAsync(async (req, res, next) => {
        const { title, summary, content, ingredients, steps,
            time, difficulty, servings, tags, } = req.body;

        if (!title?.trim() || !content?.trim() || !ingredients || !steps) {
            if (req.file?.path) await deleteCloudinaryFile(req.file.path);
            return next(new AppError("Thiếu trường bắt buộc", 400));
        }

        const sanitized = sanitizeRecipeContent(content);
        const thumb = req.file?.path || process.env.DEFAULT_RECIPE_THUMBNAIL;

        const recipe = await RecipeDAO.createRecipe({
            title,
            summary,
            content: sanitized,
            ingredients,
            steps,
            time,
            difficulty,
            servings,
            tags,
            thumbnail: thumb,
            createdBy: req.user._id ?? req.user.id,
        });

        return res.status(201).json({
            success: true,
            message: "Tạo công thức thành công",
            data: recipe,
        });
    }),


    // Danh sách công thức
    list: catchAsync(async (req, res, _next) => {
        const { q, tags, difficulty, maxTotalTime, page, limit } = req.query;
        const parsedTags =
            typeof tags === "string"
                ? tags
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                : undefined;

        const data = await RecipeDAO.list({
            q,
            tags: parsedTags,
            difficulty,
            maxTotalTime,
            page,
            limit,
        });

        res.json(data);
    }),

    // Lấy công thức theo ID
    getById: catchAsync(async (req, res, next) => {
        const r = await RecipeDAO.getById(req.params.id);
        if (!r || r.isHidden)
            return next(new AppError("Không tìm thấy công thức hoặc ID không hợp lệ", 404));
        res.json(r);
    }),

    // Cập nhật
    update: catchAsync(async (req, res, next) => {
        const id = req.params.id;
        const existing = await RecipeDAO.getById(id);
        if (!existing) return next(new AppError("Không tìm thấy công thức", 404));

        const {
            title,
            summary,
            content,
            ingredients,
            steps,
            time,
            difficulty,
            servings,
            tags,
        } = req.body;

        if (!title || !content || !ingredients || !steps) {
            if (req.file?.path) await deleteCloudinaryFile(req.file.path);
            return next(new AppError("Thiếu trường bắt buộc", 400));
        }

        // chỉ author hoặc admin được sửa
        if (
            req.user.role !== "admin" &&
            String(existing.createdBy) !== String(req.user._id ?? req.user.id)
        ) {
            return next(new AppError("Không có quyền sửa công thức này", 403));
        }

        const updateData = {};
        if (title) updateData.title = title;
        if (summary) updateData.summary = summary;
        if (content) updateData.content = sanitizeRecipeContent(content);
        if (time) updateData.time = time;
        if (difficulty) updateData.difficulty = difficulty;
        if (servings) updateData.servings = servings;
        if (tags) updateData.tags = tags;

        const ing = mustParseJSON(ingredients, "ingredients");
        if (ing !== undefined) updateData.ingredients = ing;

        const st = mustParseJSON(steps, "steps");
        if (st !== undefined) updateData.steps = st;

        if (req.file?.path) {
            if (
                existing.thumbnail &&
                existing.thumbnail !== process.env.DEFAULT_RECIPE_THUMBNAIL
            ) {
                await deleteCloudinaryFile(existing.thumbnail);
            }
            updateData.thumbnail = req.file.path;
        }

        const updated = await RecipeDAO.update(id, updateData);
        res.json({ message: "Cập nhật thành công", recipe: updated });
    }),

    // Xoá công thức
    remove: catchAsync(async (req, res, next) => {
        const id = req.params.id;
        const existing = await RecipeDAO.getById(id);
        if (!existing) return next(new AppError("Không tìm thấy công thức", 404));

        if (
            req.user.role !== "admin" &&
            String(existing.createdBy) !== String(req.user._id ?? req.user.id)
        ) {
            return next(new AppError("Không có quyền xóa công thức này", 403));
        }

        await RecipeDAO.delete(id);

        if (
            existing.thumbnail &&
            existing.thumbnail !== process.env.DEFAULT_RECIPE_THUMBNAIL
        ) {
            await deleteCloudinaryFile(existing.thumbnail);
        }

        res.json({ message: "Đã xóa công thức" });
    }),

    // interactions
    toggleLike: catchAsync(async (req, res, next) => {
        const r = await RecipeDAO.toggleLike(
            req.params.id,
            req.user._id ?? req.user.id
        );
        if (!r) return next(new AppError("Không tìm thấy công thức", 404));

        return res.json({
            message: "OK",
            likes: r.likes?.length || 0,
            liked: (r.likes || []).some(
                (x) => String(x) === String(req.user._id ?? req.user.id)
            ),
        });
    }),

    rate: catchAsync(async (req, res, next) => {
        const starsNum = Number(req.body.stars);
        const comment = req.body.comment ?? "";

        if (!Number.isFinite(starsNum) || starsNum < 1 || starsNum > 5) {
            return next(new AppError("Số sao 1-5", 400));
        }

        const r = await RecipeDAO.rate(req.params.id, {
            user: req.user._id ?? req.user.id,
            stars: starsNum,
            comment,
        });

        if (!r) return next(new AppError("Không tìm thấy công thức", 404));

        const ratings = r.ratings || [];
        const count = ratings.length;
        const avg = count
            ? Number(
                (
                    ratings.reduce((s, x) => s + Number(x.stars || 0), 0) / count
                ).toFixed(2)
            )
            : 0;
        const my = ratings.find(
            (x) => String(x.user) === String(req.user._id ?? req.user.id)
        );

        return res.json({
            message: "Đánh giá thành công",
            ratings,
            stats: { count, avg },
            mine: my ? { stars: my.stars, comment: my.comment } : null,
        });
    }),

    userDeleteRating: catchAsync(async (req, res, next) => {
        const r = await RecipeDAO.deleteRating(
            req.params.id,
            req.user._id ?? req.user.id,
            req.user
        );
        if (!r)
            return next(
                new AppError(
                    "Không tìm thấy công thức hoặc không có rating để xóa",
                    404
                )
            );

        const ratings = r.ratings || [];
        const count = ratings.length;
        const avg = count
            ? Number(
                (
                    ratings.reduce((s, x) => s + Number(x.stars || 0), 0) / count
                ).toFixed(2)
            )
            : 0;

        return res.json({
            message: "Đã xóa đánh giá",
            ratings,
            stats: { count, avg },
        });
    }),

    deleteUserRating: catchAsync(async (req, res, next) => {
        if (req.user.role !== "admin") {
            return next(new AppError("Chỉ admin được xóa rating của người khác", 403));
        }
        const targetUserId = req.params.userId;
        const r = await RecipeDAO.deleteRating(
            req.params.id,
            targetUserId,
            req.user
        );
        if (!r)
            return next(
                new AppError("Không tìm thấy công thức hoặc rating cần xóa", 404)
            );

        const ratings = r.ratings || [];
        const count = ratings.length;
        const avg = count
            ? Number(
                (
                    ratings.reduce((s, x) => s + Number(x.stars || 0), 0) / count
                ).toFixed(2)
            )
            : 0;

        return res.json({
            message: "Đã xóa đánh giá",
            ratings,
            stats: { count, avg },
        });
    }),

    addComment: catchAsync(async (req, res, next) => {
        const { content } = req.body;
        if (!content || !content.trim()) {
            return next(new AppError("Nội dung bình luận không được trống", 400));
        }

        const r = await RecipeDAO.addComment(req.params.id, {
            user: req.user._id ?? req.user.id,
            content,
        });
        if (!r) return next(new AppError("Không tìm thấy công thức", 404));

        res.json({ message: "Đã thêm bình luận", comments: r });
    }),

    userDeleteComment: catchAsync(async (req, res, next) => {
        const { id, commentId } = req.params;

        const recipe = await RecipeDAO.getById(id);
        if (!recipe) return next(new AppError("Không tìm thấy công thức", 404));

        const target = (recipe.comments || []).find(
            (c) => String(c._id) === String(commentId)
        );
        if (!target) return next(new AppError("Không tìm thấy bình luận", 404));

        // chỉ chính chủ hoặc admin
        if (
            req.user.role !== "admin" &&
            String(target.user) !== String(req.user._id ?? req.user.id)
        ) {
            return next(new AppError("Không có quyền xóa bình luận này", 403));
        }

        const r = await RecipeDAO.deleteComment(id, commentId);
        res.json({ message: "Đã xóa bình luận", comments: r.comments });
    }),

    deleteComment: catchAsync(async (req, res, next) => {
        const { id, commentId } = req.params;

        const recipe = await RecipeDAO.getById(id);
        if (!recipe) return next(new AppError("Không tìm thấy công thức", 404));

        // chỉ admin hoặc chủ recipe
        if (
            req.user.role !== "admin" &&
            String(recipe.createdBy) !== String(req.user._id ?? req.user.id)
        ) {
            return next(new AppError("Không có quyền xóa bình luận này", 403));
        }

        const r = await RecipeDAO.deleteComment(id, commentId);
        res.json({ message: "Đã xóa bình luận", comments: r.comments });
    }),

    // moderation (admin)
    hide: catchAsync(async (req, res, next) => {
        const r = await RecipeDAO.hide(req.params.id, true);
        if (!r) return next(new AppError("Không tìm thấy công thức", 404));
        res.json({ message: "Đã ẩn công thức", recipe_status: r.isHidden });
    }),

    unhide: catchAsync(async (req, res, next) => {
        const r = await RecipeDAO.hide(req.params.id, false);
        if (!r) return next(new AppError("Không tìm thấy công thức", 404));
        res.json({ message: "Đã bỏ ẩn công thức", recipe_status: r.isHidden });
    }),
};

export default recipeController;
