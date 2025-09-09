// middlewares/validation.js
import Joi from 'joi';
import { AppError } from '../utils/error.js';

/* ----------------------------- Helpers chung ----------------------------- */

// Mặc định chuẩn ObjectId 24-hex
const objectIdSchema = Joi.string().hex().length(24).messages({
    'string.length': 'ID không hợp lệ',
    'string.hex': 'ID không hợp lệ',
});

// Cho phép FE gửi chuỗi JSON; nếu là string thì parse -> trả về mảng/obj
const parseJsonIfString = (value, helpers) => {
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return parsed;
        } catch (e) {
            return helpers.error('any.invalid'); // dùng messages bên dưới
        }
    }
    return value;
};

// Middleware validate nền tảng
export const validate = (schema, source = 'body') => {
    return (req, _res, next) => {
        // clone dữ liệu gốc để validate
        const data = source === 'query' ? { ...req.query } : req[source];

        const { error, value } = schema.validate(data, {
            abortEarly: false,
            stripUnknown: true,
            convert: true,
        });

        if (error) {
            const message = error.details.map(d => d.message).join(', ');
            return next(new AppError(message, 400));
        }

        if (source === 'query') {
            // Chỉ mutate nội dung bên trong object hiện có
            for (const k of Object.keys(req.query)) delete req.query[k]; // nếu muốn loại field thừa
            Object.assign(req.query, value);
        } else {
            req[source] = value;
        }

        next();
    };
};

// Validate 1 param id: /:id
export const validateIdParam = (paramName = 'id') =>
    validate(Joi.object({ [paramName]: objectIdSchema }), 'params');

// Validate 2 param id: /:aId/:bId ...
export const validateTwoIds = (a = 'idA', b = 'idB') =>
    validate(Joi.object({ [a]: objectIdSchema, [b]: objectIdSchema }), 'params');


/* ------------------------------- USER SCHEMAS ---------------------------- */

export const validateRegister = validate(Joi.object({
    username: Joi.string()
        .pattern(/^[a-zA-Z0-9_]{3,30}$/)
        .required()
        .messages({
            'string.pattern.base': 'Username chỉ chứa chữ, số, gạch dưới và dài 3–30 ký tự',
            'any.required': 'Username là bắt buộc',
        }),
    email: Joi.string().email().required().messages({
        'string.email': 'Email không hợp lệ',
        'any.required': 'Email là bắt buộc',
    }),
    password: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
        .required()
        .messages({
            'string.min': 'Mật khẩu phải có ít nhất 8 ký tự',
            'string.pattern.base': 'Mật khẩu phải có chữ hoa, chữ thường và số',
            'any.required': 'Mật khẩu là bắt buộc',
        }),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().strip()
        .messages({
            'any.only': 'Mật khẩu xác nhận không khớp',
            'any.required': 'Xác nhận mật khẩu là bắt buộc',
        }),
    fullname: Joi.string().min(2).max(100).default("Anonymous")
        .messages({
            'string.min': 'Họ tên phải có ít nhất 2 ký tự',
        }),
}));

export const validateLogin = validate(Joi.object({
    identifier: Joi.string().required().messages({
        'any.required': 'Email/Username là bắt buộc',
    }),
    password: Joi.string().required().messages({
        'any.required': 'Mật khẩu là bắt buộc',
    }),
}));

export const validateUpdateUserInfo = validate(Joi.object({
    fullname: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().optional(),
}));

export const validateChangePassword = validate(Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
        .required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().strip(),
}));


/* ------------------------------ RECIPE SCHEMAS --------------------------- */

// Core fields cho recipe
const recipeBase = {
    title: Joi.string().min(5).max(200),
    summary: Joi.string().max(500).allow('').optional(),
    content: Joi.string().min(20),

    // ingredients: mảng object hoặc chuỗi JSON của mảng đó
    ingredients: Joi.alternatives()
        .try(
            Joi.array().items(Joi.object({
                name: Joi.string().required(),
                quantity: Joi.number().positive().optional(),
                unit: Joi.string().allow('').optional(),
            })).min(1),
            Joi.string()
        )
        .custom(parseJsonIfString)
        .messages({ 'any.invalid': 'Trường ingredients phải là mảng JSON hợp lệ' }),

    // steps: mảng string hoặc chuỗi JSON của mảng đó
    steps: Joi.alternatives()
        .try(
            Joi.array().items(Joi.string().min(1)).min(1),
            Joi.string()
        )
        .custom(parseJsonIfString)
        .messages({ 'any.invalid': 'Trường steps phải là mảng JSON hợp lệ' }),

    time: Joi.alternatives()
        .try(
            Joi.object({
                prep: Joi.number().min(0).optional(),
                cook: Joi.number().min(0).optional(),
                total: Joi.number().min(0).optional(),
            }),
            Joi.number().min(0),   // cho phép gửi số phút
            Joi.string()           // hoặc string (JSON hoặc "12")
        )
        .custom((value, helpers) => {
            // string -> thử parse JSON, nếu là "12" thì xem như số 12
            if (typeof value === 'string') {
                const num = Number(value);
                if (Number.isFinite(num)) return { prep: 0, cook: num, total: num };
                try {
                    const obj = JSON.parse(value);
                    if (obj && typeof obj === 'object') {
                        const prep = Number(obj.prep ?? 0) || 0;
                        const cook = Number(obj.cook ?? obj.total ?? 0) || 0;
                        const total = Number(obj.total ?? prep + cook) || 0;
                        return { prep, cook, total };
                    }
                } catch (_) { /* fallthrough */ }
                return helpers.error('any.invalid');
            }
            // number -> wrap thành object
            if (typeof value === 'number') {
                return { prep: 0, cook: value, total: value };
            }
            // object -> normalize lại đề phòng thiếu field
            if (value && typeof value === 'object') {
                const prep = Number(value.prep ?? 0) || 0;
                const cook = Number(value.cook ?? value.total ?? 0) || 0;
                const total = Number(value.total ?? prep + cook) || 0;
                return { prep, cook, total };
            }
            return helpers.error('any.invalid');
        })
        .messages({ 'any.invalid': 'Trường time phải là số phút, hoặc JSON/đối tượng hợp lệ' })
        .optional(),
    difficulty: Joi.string().valid('Dễ', 'Trung bình', 'Khó').optional(),
    servings: Joi.number().positive().optional(),

    // tags: mảng string hoặc chuỗi JSON của mảng đó
    tags: Joi.alternatives()
        .try(Joi.array().items(Joi.string()), Joi.string())
        .custom(parseJsonIfString)
        .messages({ 'any.invalid': 'Trường tags phải là mảng JSON hợp lệ' })
        .optional(),
};

// Validate query parameters for recipe listing
export const validateRecipeListQuery = validate(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(12),
    sort: Joi.string().trim().lowercase().valid('newest', 'oldest', 'popular').empty('').default('newest'),
    q: Joi.string().allow('').default(''),
    // chấp nhận "tags=a,b,c" hoặc nhiều ?tags=a&tags=b
    tags: Joi.alternatives().try(
        Joi.array().items(Joi.string()),
        Joi.string().allow('')
    ).default(''),
    difficulty: Joi.string().valid('Dễ', 'Trung bình', 'Khó').optional(),
    maxTotalTime: Joi.number().integer().min(0).optional(),
}), 'query');

// Create: các field chính required
export const validateCreateRecipe = validate(Joi.object({
    ...recipeBase,
    title: recipeBase.title.required(),
    content: recipeBase.content.required(),
    ingredients: recipeBase.ingredients.required(),
    steps: recipeBase.steps.required(),
}));

// Update: cho phép partial
export const validateUpdateRecipe = validate(Joi.object({
    ...recipeBase,
}));

// Rating & Comment tái sử dụng chung
export const validateRating = validate(Joi.object({
    value: Joi.number().integer().min(1).max(5).required(),
    content: Joi.string().min(1).required()
}));

export const validateComment = validate(Joi.object({
    content: Joi.string().min(1).required(),
}));


/* ------------------------------- BLOG SCHEMAS ---------------------------- */

export const validateCreateBlog = validate(Joi.object({
    title: Joi.string().min(5).max(200).required(),
    summary: Joi.string().max(500).allow('').optional(),
    content: Joi.string().min(20).required(),
    tags: Joi.alternatives()
        .try(Joi.array().items(Joi.string()), Joi.string())
        .custom(parseJsonIfString)
        .messages({ 'any.invalid': 'Trường tags phải là mảng JSON hợp lệ' })
        .optional(),
}));

export const validateUpdateBlog = validate(Joi.object({
    title: Joi.string().min(5).max(200).optional(),
    summary: Joi.string().max(500).allow('').optional(),
    content: Joi.string().min(20).optional(),
    tags: Joi.alternatives()
        .try(Joi.array().items(Joi.string()), Joi.string())
        .custom(parseJsonIfString)
        .messages({ 'any.invalid': 'Trường tags phải là mảng JSON hợp lệ' })
        .optional(),
}));