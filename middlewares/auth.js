import { verifyToken } from "../config/jwt.js";
import UserDAO from "../dao/userDAO.js";

export default async function auth(req, res, next) {
    try {
        const authHeader = req.headers.authorization || "";
        if (!authHeader.startsWith("Bearer")) {
            return res.status(401).json({ message: "Bạn cần đăng nhập để tiếp tục" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = verifyToken(token); // sẽ throw nếu invalid/expired

        // hỗ trợ cả decoded.id và decoded.userId tùy cách sign
        const userId = decoded.id || decoded.userId;
        if (!userId) {
            return res.status(401).json({ message: "Token không hợp lệ" });
        }

        // chỉ lấy các field cần dùng để gắn vào req.user (projection)
        const user = await UserDAO.findUserSafeById(userId);
        if (!user) {
            return res.status(401).json({ message: "Tài khoản không tồn tại" });
        }

        if (user.status === "blocked") {
            return res.status(403).json({ message: "Tài khoản của bạn đã bị khóa" });
        }

        // Chuẩn hóa cho các controller: luôn có id (string) và role
        req.user = {
            id: user._id?.toString(),
            role: user.role,
            username: user.username,
            email: user.email,
            avatar: user.avatar,      // nếu bạn cần hiển thị
            // thêm gì tùy nhu cầu, tránh đưa password/nhạy cảm
        };

        return next();
    } catch (err) {
        // verifyToken có thể throw JsonWebTokenError / TokenExpiredError
        return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }
}