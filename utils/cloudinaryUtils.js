import cloudinary from "../config/cloudinary.js";

/**
 * @param {string} fileUrl 
 * @returns {Promise<{ result: string, publicId: string }>}
 */
export const deleteCloudinaryFile = async (fileUrl) => {
    try {
        if (!fileUrl.includes("cloudinary.com")) {
            return { result: "not_cloudinary", publicId: null };
        }

        const segments = fileUrl.split("/");
        const publicIdWithExt = segments.slice(-2).join("/"); 
        const publicId = publicIdWithExt.split(".")[0];      

        const result = await cloudinary.uploader.destroy(publicId);
        return { result, publicId };
    } catch (err) {
        console.error("Cloudinary delete error:", err);
        return { result: "error", publicId: null };
    }
};

