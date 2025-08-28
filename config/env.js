// config/env.js
import Joi from 'joi';
import dotenv from 'dotenv';

// Load biến từ file .env vào process.env
dotenv.config();

// Định nghĩa schema validation cho env
const envSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    PORT: Joi.number().positive().default(3000),

    // Database
    MONGO_URI: Joi.string().uri().required(),
    DB_NAME: Joi.string().required(),

    // JWT
    JWT_SECRET: Joi.string().min(20).required(),

    // Cloudinary
    CLOUDINARY_CLOUD_NAME: Joi.string().required(),
    CLOUDINARY_API_KEY: Joi.string().required(),
    CLOUDINARY_API_SECRET: Joi.string().required(),

    // Optional
    CORS_ORIGINS: Joi.string().default(''),
    DEFAULT_AVATAR_URL: Joi.string().uri().optional(),
    DEFAULT_RECIPE_THUMBNAIL: Joi.string().uri().optional(),
    DEFAULT_BLOG_THUMBNAIL: Joi.string().uri().optional(),
}).unknown(); // Cho phép có thêm biến khác ngoài schema

// Validate process.env
const { error, value: validatedEnv } = envSchema.validate(process.env);

if (error) {
    console.error('Environment validation error:');
    console.error(error.details.map(detail => `  - ${detail.message}`).join('\n'));
    process.exit(1);
}

// Xuất object config để dùng trong toàn project
export const config = {
    nodeEnv: validatedEnv.NODE_ENV,
    port: validatedEnv.PORT,
    mongoUri: validatedEnv.MONGO_URI,
    dbName: validatedEnv.DB_NAME,
    jwtSecret: validatedEnv.JWT_SECRET,
    cloudinary: {
        cloudName: validatedEnv.CLOUDINARY_CLOUD_NAME,
        apiKey: validatedEnv.CLOUDINARY_API_KEY,
        apiSecret: validatedEnv.CLOUDINARY_API_SECRET,
    },
    corsOrigins: validatedEnv.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean),
    defaultAvatarUrl: validatedEnv.DEFAULT_AVATAR_URL,
    defaultRecipeThumbnail: validatedEnv.DEFAULT_RECIPE_THUMBNAIL,
    defaultBlogThumbnail: validatedEnv.DEFAULT_BLOG_THUMBNAIL,
};
