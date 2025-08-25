import RecipeDAO from '../dao/recipeDAO.js';
import { sanitizeRecipeContent } from '../utils/sanitizeHtml.js';
import { deleteCloudinaryFile } from '../utils/cloudinaryUtils.js';

const DEFAULT_RECIPE_THUMBNAIL = 'https://res.cloudinary.com/couldimagerecipebe/image/upload/v1756012471/recipice-thumb_not_available.png';

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
    async create(req, res) {
        try {
            const {
                title, summary, content, ingredients, steps,
                time, difficulty, servings, tags
            } = req.body;

            if (!title || !content || !ingredients || !steps) {
                if (req.file?.path) {
                    await deleteCloudinaryFile(req.file.path);
                }
                return res.status(400).json({ message: 'Thiếu trường bắt buộc' });
            }

            const sanitized = sanitizeRecipeContent(content);
            const thumbnail = req.file?.path || DEFAULT_RECIPE_THUMBNAIL;

            const recipe = await RecipeDAO.createRecipe({
                title, summary,
                content: sanitized,
                ingredients,
                steps,
                time,
                difficulty,
                servings,
                tags,
                thumbnail,
                createdBy: req.user._id,
            });

            res.status(201).json({ message: 'Tạo công thức thành công', recipe });
        } catch (err) {
            console.error('Create recipe error:', err);
            res.status(500).json({ message: 'Lỗi tạo công thức' });
        }
    },

    async list(req, res) {
        try {
            const { q, tags, difficulty, maxTotalTime, page, limit } = req.query;
            const parsedTags = typeof tags === 'string' ? tags.split(',').map(s => s.trim()).filter(Boolean) : undefined;
            const data = await RecipeDAO.list({ q, tags: parsedTags, difficulty, maxTotalTime, page, limit });
            res.json(data);
        } catch (err) {
            console.error('List recipes error:', err);
            res.status(500).json({ message: 'Lỗi lấy danh sách công thức' });
        }
    },

    async getById(req, res) {
        try {
            const r = await RecipeDAO.getById(req.params.id);
            if (!r || r.isHidden) return res.status(404).json({ message: 'Không tìm thấy công thức' });
            res.json(r);
        } catch (err) {
            console.error('Get recipe error:', err);
            res.status(500).json({ message: 'Lỗi lấy công thức' });
        }
    },

    async update(req, res) {
        try {
            const id = req.params.id;
            const existing = await RecipeDAO.getById(id);
            if (!existing) return res.status(404).json({ message: 'Không tìm thấy công thức' });

            const {
                title, summary, content, ingredients, steps,
                time, difficulty, servings, tags
            } = req.body;

            if (!title || !content || !ingredients || !steps) {
                if (req.file?.path) {
                    await deleteCloudinaryFile(req.file.path);
                }
                return res.status(400).json({ message: 'Thiếu trường bắt buộc' });
            }

            // chỉ author hoặc admin được sửa
            if (req.user.role !== 'admin' &&
                String(existing.createdBy) !== String(req.user._id)) {
                return res.status(403).json({ message: 'Không có quyền sửa công thức này' });
            }

            const updateData = {};
            if (title) updateData.title = title;
            if (summary) updateData.summary = summary;
            if (content) updateData.content = sanitizeRecipeContent(content);
            if (time) updateData.time = time;
            if (difficulty) updateData.difficulty = difficulty;
            if (servings) updateData.servings = servings;
            if (tags) updateData.tags = tags;

            const ing = mustParseJSON(ingredients, 'ingredients');
            if (ing !== undefined) updateData.ingredients = ing;

            const st = mustParseJSON(steps, 'steps');
            if (st !== undefined) updateData.steps = st;

            if (req.file?.path) {
                if (existing.thumbnail && existing.thumbnail !== DEFAULT_RECIPE_THUMBNAIL) {
                    await deleteCloudinaryFile(existing.thumbnail);
                }
                updateData.thumbnail = req.file.path;
            }

            const updated = await RecipeDAO.update(id, updateData);
            res.json({ message: 'Cập nhật thành công', recipe: updated });
        } catch (err) {
            console.error('Update recipe error:', err);
            res.status(500).json({ message: 'Lỗi cập nhật công thức' });
        }
    },

    async remove(req, res) {
        try {
            const id = req.params.id;
            const existing = await RecipeDAO.getById(id);
            if (!existing) return res.status(404).json({ message: 'Không tìm thấy công thức' });

            if (req.user.role !== 'admin' &&
                String(existing.createdBy) !== String(req.user._id)) {
                return res.status(403).json({ message: 'Không có quyền xóa công thức này' });
            }

            await RecipeDAO.delete(id);
            res.json({ message: 'Đã xóa công thức' });
        } catch (err) {
            console.error('Delete recipe error:', err);
            res.status(500).json({ message: 'Lỗi xóa công thức' });
        }
    },

    // interactions
    async toggleLike(req, res) {
        try {
            const r = await RecipeDAO.toggleLike(req.params.id, req.user._id);
            if (!r) return res.status(404).json({ message: 'Không tìm thấy công thức' });
            return res.json({
                message: 'OK', likes: r.likes?.length || 0, liked:
                    (r.likes || []).some(x => String(x) === String(req.user._id))
            });
        } catch (err) {
            console.error('Toggle like error:', err);
            res.status(500).json({ message: 'Lỗi like/unlike' });
        }
    },

    async rate(req, res) {
        try {
            const starsNum = Number(req.body.stars);
            const comment = req.body.comment ?? "";

            if (!Number.isFinite(starsNum) || starsNum < 1 || starsNum > 5) {
                return res.status(400).json({ message: 'Số sao 1-5' });
            }

            const r = await RecipeDAO.rate(req.params.id, {
                user: req.user._id,
                stars: starsNum,
                comment,
            });

            if (!r) return res.status(404).json({ message: 'Không tìm thấy công thức' });

            const ratings = r.ratings || [];
            const count = ratings.length;
            const avg = count ? Number((ratings.reduce((s, x) => s + Number(x.stars || 0), 0) / count).toFixed(2)) : 0;
            const my = ratings.find(x => String(x.user) === String(req.user._id));

            return res.json({
                message: 'Đánh giá thành công',
                ratings,
                stats: { count, avg },
                mine: my ? { stars: my.stars, comment: my.comment } : null
            });
        } catch (err) {
            console.error('Rate error:', err);
            return res.status(500).json({ message: 'Lỗi đánh giá' });
        }
    },

    async userDeleteRating(req, res) {
        try {
            const r = await RecipeDAO.deleteRating(req.params.id, req.user._id, req.user);
            if (!r) return res.status(404).json({ message: 'Không tìm thấy công thức hoặc không có rating để xóa' });

            const ratings = r.ratings || [];
            const count = ratings.length;
            const avg = count ? Number((ratings.reduce((s, x) => s + Number(x.stars || 0), 0) / count).toFixed(2)) : 0;

            return res.json({ message: 'Đã xóa đánh giá', ratings, stats: { count, avg } });
        } catch (err) {
            console.error('Delete rating error:', err);
            res.status(500).json({ message: 'Lỗi xóa đánh giá' });
        }
    },

    async deleteUserRating(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Chỉ admin được xóa rating của người khác' });
            }
            const targetUserId = req.params.userId;
            const r = await RecipeDAO.deleteRating(req.params.id, targetUserId, req.user);
            if (!r) return res.status(404).json({ message: 'Không tìm thấy công thức hoặc rating cần xóa' });

            const ratings = r.ratings || [];
            const count = ratings.length;
            const avg = count ? Number((ratings.reduce((s, x) => s + Number(x.stars || 0), 0) / count).toFixed(2)) : 0;

            return res.json({ message: 'Đã xóa đánh giá', ratings, stats: { count, avg } });
        } catch (err) {
            console.error('Delete user rating error:', err);
            res.status(500).json({ message: 'Lỗi xóa đánh giá (admin)' });
        }
    },

    async addComment(req, res) {
        try {
            const { content } = req.body;
            if (!content || !content.trim()) {
                return res.status(400).json({ message: 'Nội dung bình luận không được trống' });
            }

            const r = await RecipeDAO.addComment(req.params.id, { user: req.user._id, content });
            if (!r) return res.status(404).json({ message: 'Không tìm thấy công thức' });

            res.json({ message: 'Đã thêm bình luận', comments: r });
        } catch (err) {
            console.error('Add comment error:', err);
            res.status(500).json({ message: 'Lỗi thêm bình luận' });
        }
    },

    async userDeleteComment(req, res) {
        try {
            const { id, commentId } = req.params;

            const recipe = await RecipeDAO.getById(id);
            if (!recipe) return res.status(404).json({ message: 'Không tìm thấy công thức' });

            const target = (recipe.comments || []).find(c => String(c._id) === String(commentId));
            if (!target) return res.status(404).json({ message: 'Không tìm thấy bình luận' });

            // Chỉ chính chủ hoặc admin được xóa
            if (req.user.role !== 'admin' && String(target.user) !== String(req.user._id)) {
                return res.status(403).json({ message: 'Không có quyền xóa bình luận này' });
            }

            const r = await RecipeDAO.deleteComment(id, commentId);
            res.json({ message: 'Đã xóa bình luận', comments: r.comments });
        } catch (err) {
            console.error('Delete my comment error:', err);
            res.status(500).json({ message: 'Lỗi xóa bình luận' });
        }
    },

    async deleteComment(req, res) {
        try {
            const { id, commentId } = req.params;

            const recipe = await RecipeDAO.getById(id);
            if (!recipe) return res.status(404).json({ message: 'Không tìm thấy công thức' });

            if (req.user.role !== 'admin' && String(recipe.createdBy) !== String(req.user._id)) {
                return res.status(403).json({ message: 'Không có quyền xóa bình luận này' });
            }

            const r = await RecipeDAO.deleteComment(id, commentId);
            res.json({ message: 'Đã xóa bình luận', comments: r.comments });
        } catch (err) {
            console.error('Delete comment error:', err);
            res.status(500).json({ message: 'Lỗi xóa bình luận' });
        }
    },

    // moderation (admin)
    async hide(req, res) {
        try {
            const r = await RecipeDAO.hide(req.params.id, true);
            if (!r) return res.status(404).json({ message: 'Không tìm thấy công thức' });
            res.json({ message: 'Đã ẩn công thức' , recipe_status: r.isHidden });
        } catch (err) {
            console.error('Hide recipe error:', err);
            res.status(500).json({ message: 'Lỗi ẩn công thức' });
        }
    },

    async unhide(req, res) {
        try {
            const r = await RecipeDAO.hide(req.params.id, false);
            if (!r) return res.status(404).json({ message: 'Không tìm thấy công thức' });
            res.json({ message: 'Đã bỏ ẩn công thức' , recipe_status: r.isHidden });
        } catch (err) {
            console.error('Unhide recipe error:', err);
            res.status(500).json({ message: 'Lỗi bỏ ẩn công thức' });
        }
    },
};

export default recipeController;
