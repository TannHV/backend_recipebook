export const RECIPE_COLLECTION = 'recipes';

export default class RecipeModel {
    constructor({
        title,
        summary,              // mô tả ngắn (để list/search)
        content,              // rich text (HTML đã sanitize) hoặc JSON editor
        ingredients,          // [{ name, quantity, unit }]
        steps,                // [string]
        time,                 // { prep: number, cook: number, total: number }
        difficulty = 'Dễ',    // 'Dễ' | 'Trung bình' | 'Khó'
        servings,             // khẩu phần
        tags = [],            // ['chay','nướng',...]
        thumbnail,            // url ảnh thumb
        images = [],          // url ảnh khác (optional)
        createdBy,            // userId (string)
    }) {
        this.title = title;
        this.summary = summary;
        this.content = content;
        this.ingredients = Array.isArray(ingredients) ? ingredients : [];
        this.steps = Array.isArray(steps) ? steps : [];
        this.time = time || { prep: 0, cook: 0, total: 0 };
        this.difficulty = difficulty;
        this.servings = servings || 1;
        this.tags = tags;
        this.thumbnail = thumbnail;
        this.images = images;
        this.createdBy = createdBy;

        // moderation / metrics
        this.isHidden = false;
        this.likes = [];          // [userId]
        this.ratings = [];        // [{ user: userId, stars: 1..5, comment?, createdAt }]
        this.comments = [];       // [{ _id?, user, content, createdAt }]

        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
}

