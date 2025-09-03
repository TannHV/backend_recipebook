import express from "express";
import authController from "../controllers/auth.controller.js";
import auth from "../middlewares/auth.js";
import { validateRegister, validateLogin } from "../middlewares/validation.js";

const router = express.Router();

/**
 * AUTH CORE
 */
router.post("/register", validateRegister, authController.register);
router.post("/login", validateLogin, authController.login);

/**
 * VERIFY EMAIL (HYBRID)
 * - /verify/request         : gửi email (token và/hoặc OTP) – cần JWT
 * - /verify/confirm         : xác thực qua TOKEN (chấp nhận GET ?token=... HOẶC POST {token})
 * - /verify/confirm-code    : xác thực qua OTP – cần JWT
 */
router.post("/verify/request", auth, authController.requestVerifyEmail);

// token: cho phép cả GET (query) và POST (body) để tiện test bằng browser/Postman
router.get("/verify/confirm", authController.confirmVerifyEmail);
router.post("/verify/confirm", authController.confirmVerifyEmail);

// otp: cần đang đăng nhập để biết user nào xác thực
router.post("/verify/confirm-code", auth, authController.confirmVerifyCode);

/**
 * FORGOT / RESET PASSWORD (HYBRID)
 * - /forgot                 : gửi email (token và/hoặc OTP) – public (tránh lộ thông tin, trả response mù)
 * - /reset/token            : đặt lại bằng TOKEN – public
 * - /reset/code             : đặt lại bằng OTP – public
 */
router.post("/forgot", authController.forgotPassword);
router.post("/reset/token", authController.resetPasswordByToken);
router.post("/reset/code", authController.resetPasswordByCode);


export default router;
