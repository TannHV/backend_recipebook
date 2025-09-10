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

    // SMTP
    EMAIL_SERVICE: Joi.string().valid('gmail', 'smtp').default('gmail'),
    SMTP_HOST: Joi.string().default('smtp.gmail.com'),
    SMTP_PORT: Joi.number().positive().default(465),
    SMTP_USER: Joi.string().required(),
    SMTP_PASS: Joi.string().required(),
    SMTP_SECURE: Joi.boolean().default(false),
    EMAIL_FROM: Joi.string().required(),

    // App URLs
    APP_BASE_URL: Joi.string().uri().required(),
    API_BASE_URL: Joi.string().uri().required(),

    // Flags: bật/tắt từng mode
    VERIFY_MODE_TOKEN: Joi.boolean().default(true),
    VERIFY_MODE_OTP: Joi.boolean().default(true),
    RESET_MODE_TOKEN: Joi.boolean().default(true),
    RESET_MODE_OTP: Joi.boolean().default(true),

    // Token Expiry
    EMAIL_VERIFY_TOKEN_EXPIRES_MIN: Joi.number().positive().default(60),
    PASSWORD_RESET_TOKEN_EXPIRES_MIN: Joi.number().positive().default(30),

    //  OTP (mới) 
    EMAIL_VERIFY_CODE_LENGTH: Joi.number().integer().min(4).max(12).default(6),
    EMAIL_VERIFY_CODE_EXPIRES_MIN: Joi.number().positive().default(15),
    EMAIL_VERIFY_CODE_MAX_ATTEMPTS: Joi.number().integer().min(1).default(5),
    EMAIL_VERIFY_RESEND_COOLDOWN_SEC: Joi.number().integer().min(10).default(60),

    RESET_CODE_LENGTH: Joi.number().integer().min(4).max(12).default(6),
    RESET_CODE_EXPIRES_MIN: Joi.number().positive().default(10),
    RESET_CODE_MAX_ATTEMPTS: Joi.number().integer().min(1).default(5),
    RESET_RESEND_COOLDOWN_SEC: Joi.number().integer().min(10).default(60),

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
    emailService: validatedEnv.EMAIL_SERVICE,
    email: {
        smtpHost: validatedEnv.SMTP_HOST,
        smtpPort: validatedEnv.SMTP_PORT,
        smtpUser: validatedEnv.SMTP_USER,
        smtpPass: validatedEnv.SMTP_PASS,
        smtpSecure: validatedEnv.SMTP_SECURE,
        emailFrom: validatedEnv.EMAIL_FROM
    },
    appBaseUrl: validatedEnv.APP_BASE_URL,
    apiBaseUrl: validatedEnv.API_BASE_URL,

    flags: {
        verifyModeToken: validatedEnv.VERIFY_MODE_TOKEN,
        verifyModeOtp: validatedEnv.VERIFY_MODE_OTP,
        resetModeToken: validatedEnv.RESET_MODE_TOKEN,
        resetModeOtp: validatedEnv.RESET_MODE_OTP,
    },

    emailVerifyTokenExpiresMin: validatedEnv.EMAIL_VERIFY_TOKEN_EXPIRES_MIN,
    passwordResetTokenExpiresMin: validatedEnv.PASSWORD_RESET_TOKEN_EXPIRES_MIN,
    
    otp: {
        verifyLen: validatedEnv.EMAIL_VERIFY_CODE_LENGTH,
        verifyExpiresMin: validatedEnv.EMAIL_VERIFY_CODE_EXPIRES_MIN,
        verifyMaxAttempts: validatedEnv.EMAIL_VERIFY_CODE_MAX_ATTEMPTS,
        verifyResendCooldownSec: validatedEnv.EMAIL_VERIFY_RESEND_COOLDOWN_SEC,

        resetLen: validatedEnv.RESET_CODE_LENGTH,
        resetExpiresMin: validatedEnv.RESET_CODE_EXPIRES_MIN,
        resetMaxAttempts: validatedEnv.RESET_CODE_MAX_ATTEMPTS,
        resetResendCooldownSec: validatedEnv.RESET_RESEND_COOLDOWN_SEC,
    },
    corsOrigins: validatedEnv.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean),
    defaultAvatarUrl: validatedEnv.DEFAULT_AVATAR_URL,
    defaultRecipeThumbnail: validatedEnv.DEFAULT_RECIPE_THUMBNAIL,
    defaultBlogThumbnail: validatedEnv.DEFAULT_BLOG_THUMBNAIL,
};
