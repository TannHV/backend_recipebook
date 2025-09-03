import express from "express";
import blogController from "../controllers/blog.controller.js";
import auth from "../middlewares/auth.js";
import roleCheck from "../middlewares/roleCheck.js";
import { uploadBlogImage } from "../middlewares/uploadImage.js";

import {
    validateCreateBlog,
    validateUpdateBlog,
    validateComment,
    validateIdParam,
    validateTwoIds,
} from "../middlewares/validation.js";
import { sanitizeBlogFields, sanitizeCommentField } from "../middlewares/xss.js";


const router = express.Router();

// CRUD blog
router.post("/", auth, roleCheck("admin"),
    uploadBlogImage.single("thumbnail"),
    validateCreateBlog,
    sanitizeBlogFields(['title', 'summary', 'content']),
    blogController.createBlog);

router.get("/", blogController.getAllBlogs);
router.get("/:id", validateIdParam("id"), blogController.getBlogById);

router.put("/:id", auth, roleCheck("admin"),
    validateIdParam("id"),
    uploadBlogImage.single("thumbnail"),
    validateUpdateBlog,
    blogController.updateBlog);
router.delete("/:id", auth, roleCheck("admin"), validateIdParam("id"), blogController.deleteBlog);

// Comment
router.post("/:id/comment", auth,
    validateTwoIds("id"),
    validateComment,
    sanitizeCommentField('content'),
    blogController.addComment);
router.delete("/:blogId/comment/:commentId", auth, validateTwoIds("blogId", "commentId"), blogController.deleteComment);

export default router;
