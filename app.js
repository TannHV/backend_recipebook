import express from 'express';
import cors from 'cors';
import dotenv from "dotenv";

import userRoutes from "./routes/user.route.js";
import blogRoutes from "./routes/blog.route.js";
import recipeRoutes from "./routes/recipe.route.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());


// Routes
app.use("/api/users", userRoutes);

app.use("/api/blogs", blogRoutes);

app.use("/api/recipes", recipeRoutes);


app.use((err, req, res, next) => {
    console.error("Error middleware:", err);
    res.status(500).json({
        success: false,
        message: err.message || "Lỗi server nội bộ",
        stack: err.stack,
    });
});
export default app;
