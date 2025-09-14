// controllers/recipe.controller.js
import RecipeDAO from '../dao/recipeDAO.js';
import { sanitizeRecipeContent, sanitizeCommentText } from '../utils/sanitizeHtml.js';
import { deleteCloudinaryFile } from '../utils/cloudinaryUtils.js';
import { AppError, catchAsync } from "../utils/error.js";
import { config } from "../config/env.js";

// ném AppError (400) nếu JSON string sai
const mustParseJSON = (value, field) => {
    if (value === undefined) return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch {
        const eg = field === 'ingredients'
            ? `[{"name":"Gà ta","quantity":1,"unit":"kg"}]`
            : `["Bước 1","Bước 2"]`;
        throw new AppError(`${field} phải là JSON hợp lệ. Ví dụ: ${eg}`, 400);
    }
};

const recipeController = {
    // CREATE
    create: catchAsync(async (req, res, next) => {
        const { title, summary, content, ingredients, steps, time, difficulty, servings, tags } = req.body;

        if (!title?.trim() || !content?.trim() || !ingredients || !steps) {
            if (req.file?.path) await deleteCloudinaryFile(req.file.path);
            return next(new AppError("Thiếu trường bắt buộc", 400));
        }
        // dùng mustParseJSON có sẵn cho mảng; thêm normalize cho time/tags
        const ing = mustParseJSON(ingredients, "ingredients");
        const st = mustParseJSON(steps, "steps");
        const tg = mustParseJSON(tags, "tags");
        const normalizeTime = (v) => {
            if (v === undefined) return undefined;
            if (typeof v === 'string') {
                const num = Number(v);
                if (Number.isFinite(num)) return { prep: 0, cook: num, total: num };
                try {
                    const obj = JSON.parse(v);
                    if (obj && typeof obj === 'object') {
                        const prep = Number(obj.prep ?? 0) || 0;
                        const cook = Number(obj.cook ?? obj.total ?? 0) || 0;
                        const total = Number(obj.total ?? prep + cook) || 0;
                        return { prep, cook, total };
                    }
                } catch (_) { }
                return { prep: 0, cook: 0, total: 0 };
            }
            if (typeof v === 'number') return { prep: 0, cook: v, total: v };
            if (v && typeof v === 'object') {
                const prep = Number(v.prep ?? 0) || 0;
                const cook = Number(v.cook ?? v.total ?? 0) || 0;
                const total = Number(v.total ?? prep + cook) || 0;
                return { prep, cook, total };
            }
            return { prep: 0, cook: 0, total: 0 };
        };
        const t = normalizeTime(time);

        const sanitized = sanitizeRecipeContent(content);
        const thumb = req.file?.path || config.defaultRecipeThumbnail;

        const recipe = await RecipeDAO.createRecipe({
            title,
            summary,
            content: sanitized,
            ingredients: ing,
            steps: st,
            time: t,
            difficulty,
            servings,
            tags: tg,
            thumbnail: thumb,
            createdBy: req.user._id ?? req.user.id,
        });
        const full = await RecipeDAO.getByIdWithUsers(String(recipe._id));
        return res.created(full || recipe, "Tạo công thức thành công");
    }),

    // LIST
    list: catchAsync(async (req, res) => {
        const { q, tags, difficulty, maxTotalTime, page, limit, sort, isHidden } = req.query;

        const parsedTags = Array.isArray(tags)
            ? tags
            : (typeof tags === 'string' && tags)
                ? tags.split(',').map(s => s.trim()).filter(Boolean)
                : undefined;

        const data = await RecipeDAO.listWithAuthor({
            q, tags: parsedTags, isHidden: Boolean(isHidden), difficulty, maxTotalTime, page, limit, sort
        });

        return res.paginated(data.items, { page, limit, total: data.total });
    }),

    // GET BY ID
    getById: catchAsync(async (req, res, next) => {
        const r = await RecipeDAO.getByIdWithUsers(req.params.id);
        if (!r || r.isHidden) return next(new AppError("Không tìm thấy công thức hoặc ID không hợp lệ", 404));
        return res.success(r);
    }),

    // UPDATE (partial)
    update: catchAsync(async (req, res, next) => {
        const id = req.params.id;
        const existing = await RecipeDAO.getById(id);
        if (!existing) return next(new AppError("Không tìm thấy công thức", 404));

        // chỉ author hoặc admin
        if (req.user.role !== "admin" && String(existing.createdBy) !== String(req.user._id ?? req.user.id)) {
            return next(new AppError("Không có quyền sửa công thức này", 403));
        }

        const { title, summary, content, ingredients, steps, time, difficulty, servings, tags } = req.body;

        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (summary !== undefined) updateData.summary = summary;
        if (content !== undefined) updateData.content = sanitizeRecipeContent(content);
        if (time !== undefined) updateData.time = time;
        if (difficulty !== undefined) updateData.difficulty = difficulty;
        if (servings !== undefined) updateData.servings = servings;
        if (tags !== undefined) updateData.tags = tags;

        const ing = mustParseJSON(ingredients, "ingredients");
        if (ing !== undefined) updateData.ingredients = ing;
        const st = mustParseJSON(steps, "steps");
        if (st !== undefined) updateData.steps = st;

        if (req.file?.path) {
            if (existing.thumbnail && existing.thumbnail !== config.defaultRecipeThumbnail) {
                await deleteCloudinaryFile(existing.thumbnail);
            }
            updateData.thumbnail = req.file.path;
        }

        if (Object.keys(updateData).length === 0) {
            return next(new AppError("Không có dữ liệu nào để cập nhật", 400));
        }

        const updated = await RecipeDAO.update(id, updateData);
        return res.success({ recipe: updated }, "Cập nhật thành công");
    }),

    // DELETE
    remove: catchAsync(async (req, res, next) => {
        const id = req.params.id;
        const existing = await RecipeDAO.getById(id);
        if (!existing) return next(new AppError("Không tìm thấy công thức", 404));

        if (req.user.role !== "admin" && String(existing.createdBy) !== String(req.user._id ?? req.user.id)) {
            return next(new AppError("Không có quyền xóa công thức này", 403));
        }

        await RecipeDAO.delete(id);

        if (existing.thumbnail && existing.thumbnail !== config.defaultRecipeThumbnail) {
            await deleteCloudinaryFile(existing.thumbnail);
        }

        return res.noContent();
    }),

    // interactions
    toggleLike: catchAsync(async (req, res, next) => {
        const r = await RecipeDAO.toggleLike(req.params.id, req.user._id ?? req.user.id);
        if (!r) return next(new AppError("Không tìm thấy công thức", 404));

        const likes = r.likes?.length || 0;
        const liked = (r.likes || []).some(x => String(x) === String(req.user._id ?? req.user.id));
        return res.success({ likes, liked }, "OK");
    }),

    rate: catchAsync(async (req, res, next) => {
        const starsNum = Number(req.body.value);
        const comment = sanitizeCommentText(req.body.content ?? "");
        if (!Number.isFinite(starsNum) || starsNum < 1 || starsNum > 5) {
            return next(new AppError("Số sao 1-5", 400));
        }

        try {
            const r = await RecipeDAO.rate(req.params.id, {
                user: req.user._id ?? req.user.id,
                stars: starsNum,
                comment,
            });
            if (!r) return next(new AppError("Không tìm thấy công thức", 404));

            const ratings = r.ratings || [];
            const count = ratings.length;
            const avg = count ? Number((ratings.reduce((s, x) => s + Number(x.stars || 0), 0) / count).toFixed(2)) : 0;
            const my = ratings.find(x => String(x.user) === String(req.user._id ?? req.user.id));

            return res.success(
                { ratings, stats: { count, avg }, mine: my ? { stars: my.stars, comment: my.comment } : null },
                "Đánh giá thành công"
            );
        } catch (e) {
            if (e?.code === 'ALREADY_RATED') {
                return next(new AppError("Bạn đã đánh giá công thức này rồi", 409));
            }
            throw e;
        }
    }),

    updateRate: catchAsync(async (req, res, next) => {
        const userId = req.user._id ?? req.user.id;
        const starsNum = Number(req.body.value);           // FE gửi { value, content }
        const comment = sanitizeCommentText(req.body.content ?? "");

        if (!Number.isFinite(starsNum) || starsNum < 1 || starsNum > 5) {
            return next(new AppError("Số sao 1-5", 400));
        }

        try {
            const r = await RecipeDAO.updateRate(req.params.id, {
                user: userId,
                stars: starsNum,
                comment,
            });

            if (!r) return next(new AppError("Không tìm thấy công thức", 404));

            const ratings = r.ratings || [];
            const count = ratings.length;
            const avg = count
                ? Number((ratings.reduce((s, x) => s + Number(x.stars || 0), 0) / count).toFixed(2))
                : 0;
            const mine = ratings.find(x => String(x.user) === String(userId));

            return res.success(
                { ratings, stats: { count, avg }, mine: mine ? { stars: mine.stars, comment: mine.comment } : null },
                "Cập nhật đánh giá thành công"
            );
        } catch (e) {
            if (e?.code === 'RATING_NOT_FOUND') {
                return next(new AppError("Bạn chưa đánh giá công thức này", 404));
            }
            throw e;
        }
    }),

    userDeleteRating: catchAsync(async (req, res, next) => {
        const r = await RecipeDAO.deleteRating(req.params.id, req.user._id ?? req.user.id, req.user);
        if (!r) return next(new AppError("Không tìm thấy công thức hoặc không có rating để xóa", 404));

        const ratings = r.ratings || [];
        const count = ratings.length;
        const avg = count ? Number((ratings.reduce((s, x) => s + Number(x.stars || 0), 0) / count).toFixed(2)) : 0;

        return res.success({ ratings, stats: { count, avg } }, "Đã xóa đánh giá");
    }),

    deleteUserRating: catchAsync(async (req, res, next) => {
        if (req.user.role !== "admin") return next(new AppError("Chỉ admin được xóa rating của người khác", 403));

        const r = await RecipeDAO.deleteRating(req.params.id, req.params.userId, req.user);
        if (!r) return next(new AppError("Không tìm thấy công thức hoặc rating cần xóa", 404));

        const ratings = r.ratings || [];
        const count = ratings.length;
        const avg = count ? Number((ratings.reduce((s, x) => s + Number(x.stars || 0), 0) / count).toFixed(2)) : 0;

        return res.success({ ratings, stats: { count, avg } }, "Đã xóa đánh giá");
    }),

    addComment: catchAsync(async (req, res, next) => {
        const content = sanitizeCommentText(req.body.content ?? "");
        if (!content.trim()) return next(new AppError("Nội dung bình luận không được trống", 400));

        const r = await RecipeDAO.addComment(req.params.id, {
            user: req.user._id ?? req.user.id,
            content,
        });
        if (!r) return next(new AppError("Không tìm thấy công thức", 404));

        return res.created({ comments: r }, "Đã thêm bình luận");
    }),

    userDeleteComment: catchAsync(async (req, res, next) => {
        const { id, commentId } = req.params;

        const recipe = await RecipeDAO.getById(id);

        if (!recipe) return next(new AppError("Không tìm thấy công thức", 404));

        const target = (recipe.comments || []).find(c => String(c._id) === String(commentId));
        if (!target) return next(new AppError("Không tìm thấy bình luận", 404));

        if (req.user.role !== "admin" && String(target.user) !== String(req.user._id ?? req.user.id)) {
            return next(new AppError("Không có quyền xóa bình luận này", 403));
        }

        const r = await RecipeDAO.deleteComment(id, commentId);
        return res.success({ comments: r.comments }, "Đã xóa bình luận");
    }),

    deleteComment: catchAsync(async (req, res, next) => {
        const { id, commentId } = req.params;

        const recipe = await RecipeDAO.getById(id);
        if (!recipe) return next(new AppError("Không tìm thấy công thức", 404));

        if (req.user.role !== "admin" && String(recipe.createdBy) !== String(req.user._id ?? req.user.id)) {
            return next(new AppError("Không có quyền xóa bình luận này", 403));
        }

        const r = await RecipeDAO.deleteComment(id, commentId);
        return res.success({ comments: r.comments }, "Đã xóa bình luận");
    }),

    // moderation
    hide: catchAsync(async (req, res, next) => {
        const r = await RecipeDAO.hide(req.params.id, true);
        if (!r) return next(new AppError("Không tìm thấy công thức", 404));
        return res.success({ recipe_status: r.isHidden }, "Đã ẩn công thức");
    }),

    unhide: catchAsync(async (req, res, next) => {
        const r = await RecipeDAO.hide(req.params.id, false);
        if (!r) return next(new AppError("Không tìm thấy công thức", 404));
        return res.success({ recipe_status: r.isHidden }, "Đã bỏ ẩn công thức");
    }),

    getByUser: catchAsync(async (req, res, next) => {
        const { userId } = req.params;
        const page = Number(req.query.page ?? 1) || 1;
        const limit = Number(req.query.limit ?? 12) || 12;
        const sort = String(req.query.sort ?? "newest"); // newest|oldest

        if (!userId) return next(new AppError("Thiếu userId", 400));

        const data = await RecipeDAO.listByAuthor(userId, { page, limit, sort });
        return res.success(data);
    }),
};

export default recipeController;
