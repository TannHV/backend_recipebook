// controllers/auth.controller.js
import bcrypt from 'bcryptjs';
import UserDAO from '../dao/userDAO.js';
import { generateToken } from '../config/jwt.js';
import { AppError, catchAsync } from '../utils/error.js';
import { validateEmail } from '../utils/validateEmail.js';
import { validatePasswordStrength } from '../utils/passwordUtils.js';
import { generateRandomToken, hashToken } from '../utils/token.js';
import { sendVerificationEmail, sendResetPasswordEmail } from '../services/email.service.js';
import { config } from "../config/env.js";
import crypto from 'crypto';

// ===== OTP utils (nhẹ) =====
const genNumericOtp = (len = 6) => {
    const min = 10 ** (len - 1);
    const max = 10 ** len - 1;
    return String(Math.floor(min + Math.random() * (max - min + 1)));
};
const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp), "utf8").digest("hex");
const minutesFromNow = (m) => new Date(Date.now() + m * 60 * 1000);

const authController = {
    // Đăng ký
    register: catchAsync(async (req, res, next) => {
        const { username, fullname, email, password } = req.body;

        if (!username || !email || !password) return next(new AppError("Thiếu thông tin bắt buộc", 400));
        if (!validateEmail(email)) return next(new AppError("Email không hợp lệ", 400));
        if (!validatePasswordStrength(password)) return next(new AppError("Mật khẩu yếu (>=8, có hoa, thường, số)", 400));

        const exU = await UserDAO.findUserByUsername(username);
        if (exU) return next(new AppError("Username đã được sử dụng", 400));

        const exists = await UserDAO.findUserByEmail(email);
        if (exists) return next(new AppError("Email đã tồn tại", 400));

        const hashed = await bcrypt.hash(password, 10);
        const newUser = await UserDAO.createUser({
            username,
            email,
            password: hashed,
            fullname: fullname || "Anonymous",
            avatar: config.defaultAvatarUrl,
            emailVerified: false
        });

        const token = generateToken({ id: newUser._id, role: newUser.role });
        res.status(201).json({
            message: "Đăng ký thành công",
            token,
            user: { id: newUser._id, username: newUser.username, email: newUser.email, fullname: newUser.fullname, emailVerified: false }
        });
    }),

    // GỬI xác thực (HYBRID: token +/or otp) – cần JWT
    requestVerifyEmail: catchAsync(async (req, res, next) => {
        const user = req.user;
        if (!user) return next(new AppError("Chưa đăng nhập", 401));
        if (user.emailVerified) return next(new AppError("Email đã xác thực", 400));

        // Sinh theo flags
        let tokenPlain = null, tokenHash = null, tokenExpiresAt = null;
        let codePlain = null, codeHash = null, codeExpiresAt = null;

        if (config.flags.verifyModeToken) {
            tokenPlain = generateRandomToken();
            tokenHash = hashToken(tokenPlain);
            tokenExpiresAt = minutesFromNow(config.emailVerifyTokenExpiresMin || 60);
        }
        if (config.flags.verifyModeOtp) {
            codePlain = genNumericOtp(config.otp.verifyLen || 6);
            codeHash = hashOtp(codePlain);
            codeExpiresAt = minutesFromNow(config.otp.verifyExpiresMin || 15);
        }

        await UserDAO.setEmailVerifyBoth(user.id, {
            tokenHash, tokenExpiresAt, codeHash, codeExpiresAt
        });

        const verifyLink = tokenPlain ? `${config.appBaseUrl}/verify-email?token=${tokenPlain}` : null;
        const sent = await sendVerificationEmail({
            to: user.email,
            username: user.username,
            verifyLink,
            verifyCode: codePlain || null,
            expiresMin: config.otp.verifyExpiresMin || 60
        });
        if (!sent.success) return next(new AppError("Gửi email thất bại: " + sent.error, 500));

        res.json({ message: "Đã gửi email xác thực" });
    }),

    // Xác thực EMAIL bằng TOKEN (public)
    confirmVerifyEmail: catchAsync(async (req, res, next) => {
        let token = (req.query.token ?? req.body.token ?? "").toString();
        token = token.trim().replace(/\s+/g, "").replace(/[\u200B-\u200D\uFEFF]/g, "");
        if (!/^[a-f0-9]{64}$/i.test(token)) return next(new AppError("Token không hợp lệ (định dạng)", 400));

        const tokenHash = hashToken(token).toLowerCase();
        const verifiedUser = await UserDAO.verifyEmailByTokenHash(tokenHash);
        if (!verifiedUser) return next(new AppError("Token không hợp lệ hoặc đã hết hạn", 400));

        res.json({ message: "Xác thực email thành công (token)" });
    }),

    // Xác thực EMAIL bằng CODE (OTP) – cần JWT
    confirmVerifyCode: catchAsync(async (req, res, next) => {
        const user = req.user;
        if (!user) return next(new AppError("Chưa đăng nhập", 401));
        const { code } = req.body;
        if (!code) return next(new AppError("Thiếu mã", 400));

        const ok = await UserDAO.verifyEmailByCode(user.id, hashOtp(code), config.otp.verifyMaxAttempts || 5);
        
        if (ok === null) return next(new AppError("Mã hết hạn hoặc không tồn tại", 400));
        if (ok === false) return next(new AppError("Mã không đúng", 400));

        res.json({ message: "Xác thực email thành công (OTP)" });
    }),

    // Đăng nhập
    login: catchAsync(async (req, res, next) => {
        const { identifier, password } = req.body;
        if (!identifier || !password) return next(new AppError("Vui lòng điền đầy đủ thông tin", 400));

        const user = await UserDAO.findByEmailOrUsername({ email: identifier, username: identifier });
        if (!user) return next(new AppError("Tài khoản không tồn tại", 404));

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return next(new AppError("Mật khẩu không đúng", 400));
        if (user.status === "blocked") return next(new AppError("Tài khoản của bạn đã bị khóa", 403));

        const token = generateToken({ id: user._id, role: user.role });
        res.json({
            message: "Đăng nhập thành công",
            token,
            user: {
                id: user._id,
                username: user.username,
                fullname: user.fullname,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                emailVerified: !!user.emailVerified
            }
        });
    }),

    // Quên mật khẩu – chỉ cho user đã verify
    forgotPassword: catchAsync(async (req, res, next) => {
        const { email } = req.body;
        if (!email) return next(new AppError("Thiếu email", 400));

        const user = await UserDAO.findUserByEmail(email);
        // phản hồi mù
        if (!user) return res.json({ message: "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại." });
        if (!user.emailVerified) return next(new AppError("Email chưa được xác thực", 403));

        let tokenPlain = null, tokenHash = null, tokenExpiresAt = null;
        let codePlain = null, codeHash = null, codeExpiresAt = null;

        if (config.flags.resetModeToken) {
            tokenPlain = generateRandomToken();
            tokenHash = hashToken(tokenPlain);
            tokenExpiresAt = minutesFromNow(config.passwordResetTokenExpiresMin || 30);
        }
        if (config.flags.resetModeOtp) {
            codePlain = genNumericOtp(config.otp.resetLen || 6);
            codeHash = hashOtp(codePlain);
            codeExpiresAt = minutesFromNow(config.otp.resetExpiresMin || 10);
        }

        await UserDAO.setPasswordResetBoth(user._id, {
            tokenHash, tokenExpiresAt, codeHash, codeExpiresAt
        });

        const resetLink = tokenPlain ? `${config.appBaseUrl}/reset-password?token=${tokenPlain}` : null;
        await sendResetPasswordEmail({
            to: user.email,
            username: user.username,
            resetLink,
            resetCode: codePlain || null,
            expiresMin: config.otp.resetExpiresMin || 30
        });

        res.json({ message: "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại." });
    }),

    // Reset mật khẩu bằng TOKEN (public)
    resetPasswordByToken: catchAsync(async (req, res, next) => {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) return next(new AppError("Thiếu dữ liệu", 400));
        if (!validatePasswordStrength(newPassword)) return next(new AppError("Mật khẩu yếu (>=8, có hoa, thường, số)", 400));

        const tokenHash = hashToken(token);
        const user = await UserDAO.findByPasswordResetTokenHash(tokenHash);
        if (!user) return next(new AppError("Token không hợp lệ hoặc đã hết hạn", 400));

        const hashed = await bcrypt.hash(newPassword, 10);
        await UserDAO.updateUser(user._id, { password: hashed });   // đổi sang updateUser
        await UserDAO.clearPasswordResetToken(user._id);

        res.json({ message: "Đặt lại mật khẩu thành công (token)" });
    }),

    // Reset mật khẩu bằng CODE (public)
    resetPasswordByCode: catchAsync(async (req, res, next) => {
        const { email, code, newPassword } = req.body;
        if (!email || !code || !newPassword) return next(new AppError("Thiếu dữ liệu", 400));
        if (!validatePasswordStrength(newPassword)) return next(new AppError("Mật khẩu yếu (>=8, có hoa, thường, số)", 400));

        const u = await UserDAO.consumeResetCode(email, hashOtp(code), config.otp.resetMaxAttempts || 5);
        if (u === null) return next(new AppError("Mã hết hạn hoặc không tồn tại", 400));
        if (u === false) return next(new AppError("Mã không đúng", 400));

        const hashed = await bcrypt.hash(newPassword, 10);
        await UserDAO.updateUser(u._id, { password: hashed });

        res.json({ message: "Đặt lại mật khẩu thành công (OTP)" });
    })
};

export default authController;
