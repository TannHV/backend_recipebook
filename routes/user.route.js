import express from "express";
import userController from "../controllers/user.controller.js";
import auth from "../middlewares/auth.js";
import roleCheck from "../middlewares/roleCheck.js";
import { uploadAvatar } from "../middlewares/uploadImage.js";

const router = express.Router();



// Public routes
router.post("/register", userController.register);
router.post("/login", userController.login);

// Private routes
router.get("/profile", auth, userController.getProfile);
router.put("/update-info", auth, userController.updateInfo);
router.put("/change-password", auth, userController.changePassword);
router.put("/avatar",
    auth,
    uploadAvatar.single("avatar"),
    userController.uploadAvatar
);

// Admin routes
router.get("/", auth, roleCheck("admin"), userController.getAllUsers);
router.get("/:id", auth, roleCheck("admin"), userController.getUserById);
router.put("/:id/status", auth, roleCheck("admin"), userController.updateUserStatus);
router.put("/:id/role", auth, roleCheck("admin"), userController.updateUserRole);
router.delete("/:id", auth, roleCheck("admin"), userController.deleteUser);

export default router;
