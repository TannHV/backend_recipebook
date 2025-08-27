import bcrypt from "bcryptjs";
import UserDAO from "../dao/userDAO.js";
import { validateEmail } from "../utils/validateEmail.js";
import { validatePasswordStrength } from "../utils/passwordUtils.js";
import { deleteCloudinaryFile } from "../utils/cloudinaryUtils.js";
import { generateToken } from "../config/jwt.js";
import { AppError, catchAsync } from "../utils/error.js";

const userController = {

    // Đăng ký tài khoản
    register: catchAsync(async (req, res, next) => {
        const { username, email, password, confirmPassword, fullname } = req.body;

        if (!username || !email || !password || !confirmPassword || !fullname) {
            return next(new AppError("Vui lòng điền đầy đủ thông tin bắt buộc", 400));
        }

        const existingUserName = await UserDAO.findUserByUsername(username);
        if (existingUserName) {
            return next(new AppError("Username đã được sử dụng", 400));
        }

        if (!validateEmail(email)) {
            return next(new AppError("Email không hợp lệ", 400));
        }

        const existingUser = await UserDAO.findUserByEmail(email);
        if (existingUser) {
            return next(new AppError("Email đã được sử dụng", 400));
        }

        if (password !== confirmPassword) {
            return next(new AppError("Mật khẩu xác nhận không khớp", 400));
        }

        if (!validatePasswordStrength(password)) {
            return next(new AppError("Mật khẩu phải tối thiểu 8 ký tự, có chữ hoa, chữ thường và số", 400)
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await UserDAO.createUser({
            username,
            email,
            password: hashedPassword,
            fullname,
            avatar: process.env.DEFAULT_AVATAR_URL,
        });

        const token = generateToken({ id: newUser._id, role: newUser.role });

        res.status(201).json({
            message: "Đăng ký thành công",
            token,
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                fullname: newUser.fullname,
            },
        });
    }),

    // Đăng nhập
    login: catchAsync(async (req, res, next) => {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return next(new AppError("Vui lòng điền đầy đủ thông tin", 400));
        }

        const user = await UserDAO.findByEmailOrUsername({
            email: identifier,
            username: identifier,
        });

        if (!user) {
            return next(new AppError("Tài khoản không tồn tại", 404));
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return next(new AppError("Mật khẩu không đúng", 400));
        }

        if (user.status === "blocked") {
            return next(new AppError("Tài khoản của bạn đã bị khóa", 403));
        }

        const token = generateToken({ id: user._id, role: user.role });

        res.json({
            message: "Đăng nhập thành công",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                fullname: user.fullname,
                role: user.role,
            },
        });
    }),

    // Xem thông tin cá nhân
    getProfile: catchAsync(async (req, res, next) => {
        const user = await UserDAO.findUserById(req.user._id ?? req.user.id);
        if (!user) return next(new AppError("Người dùng không tồn tại", 404));

        res.json({
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

        if (email) {
            const existing = await UserDAO.findUserByEmail(email);
            if (existing && String(existing._id) !== String(req.user._id ?? req.user.id)) {
                return next(
                    new AppError("Email đã được sử dụng bởi tài khoản khác", 400)
                );
            }
        }

        const userId = req.user?._id ?? req.user?.id;

        const updated = await UserDAO.updateUser(userId, {
            email,
            fullname,
            updatedAt: Date.now(),
        });

        if (!updated) return next(new AppError("Không tìm thấy người dùng", 404));

        res.json({ message: "Cập nhật thông tin thành công", user: updated });
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
        if (user.avatar && user.avatar !== process.env.DEFAULT_AVATAR_URL) {
            await deleteCloudinaryFile(user.avatar);
        }

        const updatedUser = await UserDAO.updateUser(req.user._id ?? req.user.id, {
            avatar: newAvatarUrl,
            updatedAt: Date.now(),
        });

        if (!updatedUser) {
            return next(new AppError("Không thể cập nhật avatar", 500));
        }

        res.json({
            message: "Cập nhật avatar thành công",
            avatar: newAvatarUrl,
            user: updatedUser,
        });
    }),

    // Đổi mật khẩu
    changePassword: catchAsync(async (req, res, next) => {
        const { oldPassword, newPassword, confirmPassword } = req.body;
        const userId = req.user._id ?? req.user.id;

        const user = await UserDAO.findByIdWithPassword(userId);
        if (!user) return next(new AppError("Không tìm thấy người dùng", 404));

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return next(new AppError("Mật khẩu cũ không đúng", 400));

        if (newPassword !== confirmPassword) {
            return next(new AppError("Mật khẩu xác nhận không khớp", 400));
        }

        if (!validatePasswordStrength(newPassword)) {
            return next(new AppError("Mật khẩu mới không đủ mạnh", 400));
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await UserDAO.updateUser(userId, { password: hashed, updatedAt: Date.now() });

        res.json({ message: "Đổi mật khẩu thành công" });
    }),

    // Lấy tất cả tài khoản
    getAllUsers: catchAsync(async (req, res, next) => {
        const users = await UserDAO.getAllUsers();
        res.json(users);
    }),

    // Lấy tài khoản theo id
    getUserById: catchAsync(async (req, res, next) => {
        const user = await UserDAO.findUserById(req.params.id);
        if (!user) return next(new AppError("Không tìm thấy người dùng", 404));
        res.json(user);
    }),

    // Cập nhật trạng thái tài khoản
    updateUserStatus: catchAsync(async (req, res, next) => {
        const { status } = req.body;
        if (!["active", "blocked"].includes(status)) {
            return next(new AppError("Trạng thái không hợp lệ", 400));
        }

        const updated = await UserDAO.updateUser(req.params.id, { status, updatedAt: Date.now() });
        if (!updated) return next(new AppError("Không tìm thấy người dùng", 404));

        res.json({ message: "Cập nhật trạng thái thành công", user: updated });
    }),

    // Cập nhật vai trò
    updateUserRole: catchAsync(async (req, res, next) => {
        const { role } = req.body;
        if (!["user", "admin", "staff"].includes(role)) {
            return next(new AppError("Vai trò không hợp lệ", 400));
        }

        const updated = await UserDAO.updateUser(req.params.id, { role, updatedAt: Date.now() });
        if (!updated) return next(new AppError("Không tìm thấy người dùng", 404));

        res.json({ message: "Cập nhật vai trò thành công", user: updated });
    }),

    // Xóa user
    deleteUser: catchAsync(async (req, res, next) => {
        await UserDAO.deleteUser(req.params.id);
        res.json({ message: "Xóa người dùng thành công" });
    }),
};

export default userController;
