import bcrypt from "bcryptjs";
import UserDAO from "../dao/userDAO.js";
import { validateEmail } from "../utils/validateEmail.js";
import { validatePasswordStrength } from "../utils/passwordUtils.js";
import { deleteCloudinaryFile } from "../utils/cloudinaryUtils.js";
import { sendEmailChangedNotice } from "../services/email.service.js";
import { AppError, catchAsync } from "../utils/error.js";
import { config } from "../config/env.js";

const userController = {

    // Xem thông tin cá nhân
    getProfile: catchAsync(async (req, res, next) => {
        const user = await UserDAO.findUserById(req.user._id ?? req.user.id);
        if (!user) return next(new AppError("Người dùng không tồn tại", 404));

        return res.success({
            id: user.id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            fullname: user.fullname,
            role: user.role,
        });
    }),

    // Cập nhật thông tin
    updateInfo: catchAsync(async (req, res, next) => {
        const { email, fullname } = req.body;

        if (!email || !fullname) {
            return next(new AppError("Email và họ tên là thông tin bắt buộc", 400));
        }
        if (!validateEmail(email)) {
            return next(new AppError("Email không hợp lệ", 400));
        }

        const userId = req.user?._id ?? req.user?.id;
        const current = await UserDAO.findUserById(userId);
        if (!current) return next(new AppError("Không tìm thấy người dùng", 404));

        // Nếu email không đổi -> chỉ update fullname
        if (email.trim().toLowerCase() === String(current.email).trim().toLowerCase()) {
            const updated = await UserDAO.updateUser(userId, {
                fullname,
                updatedAt: Date.now(),
            });
            if (!updated) return next(new AppError("Không thể cập nhật thông tin", 500));
            return res.success({ user: updated }, "Cập nhật thông tin thành công");
        }

        // Email thay đổi: check trùng
        const existing = await UserDAO.findUserByEmail(email);
        if (existing && String(existing._id) !== String(userId)) {
            return next(new AppError("Email đã được sử dụng bởi tài khoản khác", 400));
        }

        const updated = await UserDAO.markEmailUnverifiedAndUpdate(userId, email);
        if (!updated) return next(new AppError("Không thể cập nhật email", 500));

        // 2) Gửi thông báo về email cũ (không chặn luồng nếu gửi thất bại)
        const oldEmail = current.email;
        if (oldEmail) {
            await sendEmailChangedNotice({
                to: oldEmail,
                username: current.username ?? "",
                newEmail: email,
            }).catch(() => { }); // best-effort
        }

        return res.success(
            { user: updated },
            "Cập nhật thông tin thành công. Email mới cần xác thực trước khi dùng một số tính năng."
        );
    }),

    // Upload avatar
    uploadAvatar: catchAsync(async (req, res, next) => {
        if (!req.file || !req.file.path) {
            return next(new AppError("Không có ảnh được tải lên", 400));
        }

        const newAvatarUrl = req.file.path;

        const user = await UserDAO.findUserById(req.user._id ?? req.user.id);
        if (!user) return next(new AppError("Không tìm thấy người dùng", 404));

        // Xóa avatar cũ nếu không phải default
        if (user.avatar && user.avatar !== config.defaultAvatarUrl) {
            await deleteCloudinaryFile(user.avatar);
        }

        const updatedUser = await UserDAO.updateUser(req.user._id ?? req.user.id, {
            avatar: newAvatarUrl,
            updatedAt: Date.now(),
        });

        if (!updatedUser) {
            return next(new AppError("Không thể cập nhật avatar", 500));
        }

        return res.success({
            avatar: newAvatarUrl,
            user: updatedUser,
        }, "Cập nhật avatar thành công");
    }),

    // Đổi mật khẩu
    changePassword: catchAsync(async (req, res, next) => {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user._id ?? req.user.id;

        const user = await UserDAO.findByIdWithPassword(userId);
        if (!user) return next(new AppError("Không tìm thấy người dùng", 404));

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return next(new AppError("Mật khẩu cũ không đúng", 400));

        if (!validatePasswordStrength(newPassword)) {
            return next(new AppError("Mật khẩu mới không đủ mạnh", 400));
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await UserDAO.updateUser(userId, { password: hashed, updatedAt: Date.now() });

        return res.success(null, "Đổi mật khẩu thành công");
        // hoặc: return res.noContent();
    }),

    // Lấy tất cả tài khoản
    getAllUsers: catchAsync(async (_req, res, _next) => {
        const users = await UserDAO.getAllUsers();
        return res.success(users);
    }),

    // Lấy tài khoản theo id
    getUserById: catchAsync(async (req, res, next) => {
        const user = await UserDAO.findUserById(req.params.id);
        if (!user) return next(new AppError("Không tìm thấy người dùng", 404));
        return res.success(user);
    }),

    // Cập nhật trạng thái tài khoản
    updateUserStatus: catchAsync(async (req, res, next) => {
        const { status } = req.body;
        if (!["active", "blocked"].includes(status)) {
            return next(new AppError("Trạng thái không hợp lệ", 400));
        }

        const updated = await UserDAO.updateUser(req.params.id, { status, updatedAt: Date.now() });
        if (!updated) return next(new AppError("Không tìm thấy người dùng", 404));

        return res.success({ user: updated }, "Cập nhật trạng thái thành công");
    }),

    // Cập nhật vai trò
    updateUserRole: catchAsync(async (req, res, next) => {
        const { role } = req.body;
        if (!["user", "admin", "staff"].includes(role)) {
            return next(new AppError("Vai trò không hợp lệ", 400));
        }

        const updated = await UserDAO.updateUser(req.params.id, { role, updatedAt: Date.now() });
        if (!updated) return next(new AppError("Không tìm thấy người dùng", 404));

        return res.success({ user: updated }, "Cập nhật vai trò thành công");
    }),

    // Xóa user
    deleteUser: catchAsync(async (req, res, next) => {
        await UserDAO.deleteUser(req.params.id);
        return res.success(null, "Xóa người dùng thành công");
        // hoặc: return res.noContent();
    }),


};

export default userController;
