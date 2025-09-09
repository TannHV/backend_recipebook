import express from "express";
import userController from "../controllers/user.controller.js";
import auth from "../middlewares/auth.js";
import roleCheck from "../middlewares/roleCheck.js";
import { uploadAvatar } from "../middlewares/uploadImage.js";

import {
    validateUpdateUserInfo,
    validateChangePassword,
    validateIdParam,
} from "../middlewares/validation.js";


const router = express.Router();

// Private routes
router.get("/profile", auth, userController.getProfile);
router.put("/update-info", auth, validateUpdateUserInfo, userController.updateInfo);
router.put("/change-password", auth, validateChangePassword, userController.changePassword);
router.put("/avatar",
    auth,
    uploadAvatar.single("avatar"),
    userController.uploadAvatar
);

// Admin routes
router.get("/", auth, roleCheck("admin"), userController.getAllUsers);
router.get("/:id", auth, roleCheck("admin"), validateIdParam("id"), userController.getUserById);
router.put("/:id/status", auth, roleCheck("admin"), validateIdParam("id"), userController.updateUserStatus);
router.put("/:id/role", auth, roleCheck("admin"), validateIdParam("id"), userController.updateUserRole);
router.delete("/:id", auth, roleCheck("admin"), validateIdParam("id"), userController.deleteUser);

export default router;
