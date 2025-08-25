import { verifyToken } from "../config/jwt.js";
import UserDAO from "../DAO/userDAO.js";

const auth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Bạn cần đăng nhập để tiếp tục" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = verifyToken(token);

        // console.log("Decoded token:", decoded);
        const user = await UserDAO.findUserById(decoded.id);
        // console.log("User found in DB:", user);

        if (!user) {
            return res.status(401).json({ message: "Tài khoản không tồn tại" });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }
};

export default auth;