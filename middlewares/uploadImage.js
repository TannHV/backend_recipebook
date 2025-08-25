import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

export const createUploader = (folderName, width = 1000, height = 1000) => {
    const storage = new CloudinaryStorage({
        cloudinary,
        params: {
            folder: folderName,
            allowed_formats: ['jpg', 'png', 'jpeg','webp'],
            transformation: [{ width: width, height: height, crop: "fit" }],
        },
    });
    return multer({ storage });
};

export const uploadAsset = createUploader("assets");
export const uploadAvatar = createUploader("avatars", 200, 200);
export const uploadBlogImage = createUploader("blogs", 1000, 450);
export const uploadThumbnailImage = createUploader("recipes", 1600, 900);
