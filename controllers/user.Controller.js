import bcrypt from "bcryptjs";
import UserDAO from "../dao/userDAO.js";
import { validateEmail } from "../utils/validateEmail.js";
import { validatePasswordStrength } from "../utils/passwordUtils.js";
import { deleteCloudinaryFile } from "../utils/cloudinaryUtils.js";
import { generateToken } from "../config/jwt.js";

const DEFAULT_AVATAR_URL = 'https://res.cloudinary.com/couldimagerecipebe/image/upload/v1753875465/avatar_default.png';

const userController = {

    // Đăng ký tài khoản
    async register(req, res) {
        try {
            const { username, email, password, confirmPassword, fullname } = req.body;

            // Kiểm tra người dùng nhâp đày đủ thông tin bắt buộc
            if (!username || !email || !password || !confirmPassword || !fullname) {
                return res
                    .status(400)
                    .json({ message: "Vui lòng điền đầy đủ thông tin bắt buộc" });
            }

            // Kiểm tra username đã tồn tại
            const existingUserName = await UserDAO.findUserByUsername(username);
            if (existingUserName) {
                return res.status(400).json({ message: "Username đã được sử dụng" });
            }

            // Kiểm tra email hợp lệ
            if (!validateEmail(email)) {
                return res.status(400).json({ message: "Email không hợp lệ" });
            }

            // Kiểm tra email đã tồn tại
            const existingUser = await UserDAO.findUserByEmail(email);
            if (existingUser) {
                return res.status(400).json({ message: "Email đã được sử dụng" });
            }

            // Kiểm tra password khớp confirmPassword
            if (password !== confirmPassword) {
                return res
                    .status(400)
                    .json({ message: "Mật khẩu xác nhận không khớp" });
            }

            // Kiểm tra độ mạnh mật khẩu
            if (!validatePasswordStrength(password)) {
                return res.status(400).json({ message: "Mật khẩu phải tối thiểu 8 ký tự, có chữ hoa, chữ thường và số" });
            }

            // Hash mật khẩu
            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser = await UserDAO.createUser({
                username,
                email,
                password: hashedPassword,
                fullname,
                avatar: DEFAULT_AVATAR_URL
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
        } catch (err) {
            res.status(500).json({ message: "Đăng ký thất bại", error: err.message });
        }
    },

    // Đăng nhập
    async login(req, res) {
        try {
            const { identifier, password } = req.body;

            // Kiểm tra người dùng nhập đầy đủ thông tin
            if (!identifier || !password) {
                return res
                    .status(400)
                    .json({ message: "Vui lòng điền đầy đủ thông tin" });
            }

            // Tìm theo email hoặc username
            const user = await UserDAO.findByEmailOrUsername({
                email: identifier,
                username: identifier,
            });


            if (!user) {
                return res.status(400).json({ message: "Tài khoản không tồn tại" });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: "Mật khẩu không đúng" });
            }

            if (user.status === "blocked") {
                return res.status(403).json({ message: "Tài khoản của bạn đã bị khóa" });
            }

            const token = generateToken({ id: user._id, role: user.role });

            return res.json({
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
        } catch (err) {
            res
                .status(500)
                .json({ message: "Đăng nhập thất bại", error: err.message });
        }
    },

    // Xem thông tin cá nhân
    async getProfile(req, res) {
        try {
            const user = await UserDAO.findUserById(req.user._id);
            if (!user) return res.status(404).json({ message: "Người dùng không tồn tại" });

            return res.json({
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                fullname: user.fullname,
                role: user.role,
            });
        } catch (err) {
            console.error("Profile error:", err);
            res.status(500).json({ message: "Lỗi khi lấy thông tin người dùng" });
        }
    },

    // Update thông tin user
    async updateInfo(req, res) {
        try {
            const { email, fullname } = req.body;

            if (!email || !fullname) {
                return res
                    .status(400)
                    .json({ message: "Email và họ tên là thông tin bắt buộc" });
            }

            if (!validateEmail(email)) {
                return res.status(400).json({ message: "Email không hợp lệ" });
            }

            if (email) {
                const existing = await UserDAO.findUserByEmail(email);
                if (existing && existing._id.toString() != req.user._id) {
                    return res.status(400).json({ message: "Email đã được sử dụng bởi tài khoản khác" });
                }
            }

            const updated = await UserDAO.updateUser(req.user._id, {
                email,
                fullname,
                updatedAt: Date.now(),
            });
            res.json({ message: "Cập nhật thông tin thành công", user: updated });
        } catch (err) {
            console.error("Update Info error:", err);
            res.status(500).json({ message: "Lỗi khi cập nhật thông tin" });
        }
    },

    //Upload avatar
    async uploadAvatar(req, res) {
        try {
            // Kiểm tra có file hay không
            if (!req.file || !req.file.path) {
                return res.status(400).json({ message: "Không có ảnh được tải lên" });
            }

            const newAvatarUrl = req.file.path;

            // Lấy user hiện tại
            const user = await UserDAO.findUserById(req.user._id);
            if (!user) {
                return res.status(404).json({ message: "Không tìm thấy người dùng" });
            }


            // Xóa avatar cũ nếu không phải default
            if (user.avatar && user.avatar !== DEFAULT_AVATAR_URL) {
                await deleteCloudinaryFile(user.avatar);
            }

            // Cập nhật avatar mới
            const updatedUser = await UserDAO.updateUser(req.user._id, {
                avatar: newAvatarUrl,
            });

            res.json({
                message: "Cập nhật avatar thành công",
                avatar: newAvatarUrl,
                user: updatedUser,
            });
            if (!updatedUser) {
                return res.status(500).json({ message: "Không thể cập nhật avatar" });
            }
        } catch (err) {
            console.error("Update avatar error:", err);
            res.status(500).json({ message: "Lỗi khi cập nhật avatar" });
        }
    },

    // Đổi mật khẩu
    async changePassword(req, res) {
        try {
            const { oldPassword, newPassword, confirmPassword } = req.body;
            const user = await UserDAO.findByIdWithPassword(req.user._id);

            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) return res.status(400).json({ message: "Mật khẩu cũ không đúng" });

            if (newPassword !== confirmPassword) {
                return res.status(400).json({ message: "Mật khẩu xác nhận không khớp" });
            }

            if (!validatePasswordStrength(newPassword)) {
                return res.status(400).json({ message: "Mật khẩu mới không đủ mạnh" });
            }

            const hashed = await bcrypt.hash(newPassword, 10);
            await UserDAO.updateUser(req.user.id, { password: hashed });
            res.json({ message: "Đổi mật khẩu thành công" });
        } catch (err) {
            console.error("Change password error:", err);
            res.status(500).json({ message: "Lỗi khi đổi mật khẩu" });
        }
    },

    // Lấy tất cả tài khoản
    async getAllUsers(req, res) {
        try {
            const users = await UserDAO.getAllUsers();
            res.json(users);
        } catch (err) {
            res.status(500).json({ message: "Lỗi khi lấy danh sách người dùng" });
        }
    },

    // Lấy thông tin tài khoản theo id
    async getUserById(req, res) {
        try {
            const user = await UserDAO.findUserById(req.params.id);
            if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });
            res.json(user);
        } catch (err) {
            console.log(err);
            res.status(500).json({ message: "Lỗi khi lấy thông tin người dùng" });
        }
    },

    // Cập nhật tình trạng tài khoản
    async updateUserStatus(req, res) {
        try {
            const { status } = req.body;
            if (!["active", "blocked"].includes(status)) {
                return res.status(400).json({ message: "Trạng thái không hợp lệ" });
            }
            const updated = await UserDAO.updateUser(req.params.id, { status });
            res.json({ message: "Cập nhật trạng thái thành công", user: updated });
        } catch (err) {
            res.status(500).json({ message: "Lỗi khi cập nhật trạng thái" });
        }
    },

    // Cập nhật role User
    async updateUserRole(req, res) {
        try {
            const { role } = req.body;

            if (!["user", "admin", "staff"].includes(role)) {
                return res.status(400).json({ message: "Vai trò không hợp lệ" });
            }

            const updated = await UserDAO.updateUser(req.params.id, { role });
            res.json({ message: "Cập nhật vai trò thành công", user: updated });
        } catch (err) {
            res.status(500).json({ message: "Lỗi khi cập nhật vai trò" });
        }
    },

    // Xóa user 
    async deleteUser(req, res) {
        try {
            await UserDAO.deleteUser(req.params.id);
            res.json({ message: "Xóa người dùng thành công" });
        } catch (err) {
            res.status(500).json({ message: "Lỗi khi xóa người dùng" });
        }
    },


};

export default userController;
