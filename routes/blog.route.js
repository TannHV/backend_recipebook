import express from "express";
import blogController from "../controllers/blog.controller.js";
import auth from "../middlewares/auth.js";
import roleCheck from "../middlewares/roleCheck.js";
import { uploadBlogImage } from "../middlewares/uploadImage.js";

const router = express.Router();

// CRUD blog
router.post("/", auth, roleCheck("admin"),
    uploadBlogImage.single("thumbnail"),
    blogController.createBlog);

router.get("/", blogController.getAllBlogs);
router.get("/:id", blogController.getBlogById);

router.put("/:id", auth, roleCheck("admin"),
    uploadBlogImage.single("thumbnail"),
    blogController.updateBlog);
router.delete("/:id", auth, roleCheck("admin"), blogController.deleteBlog);

// Comment
router.post("/:id/comment", auth, blogController.addComment);
router.delete("/:blogId/comment/:commentId", auth, blogController.deleteComment);

export default router;
