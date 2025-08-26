# Recipe Book Backend API

Một REST API backend cho ứng dụng Recipe Book được xây dựng với Node.js, Express.js và MongoDB. Hệ thống cung cấp các tính năng quản lý công thức nấu ăn, blog và người dùng.

## ✨ Tính năng chính

### 🔐 Quản lý người dùng
- Đăng ký, đăng nhập với JWT authentication
- Phân quyền người dùng (user, admin, staff)
- Quản lý profile và avatar
- Đổi mật khẩu, cập nhật thông tin cá nhân

### 📝 Quản lý công thức nấu ăn
- CRUD công thức nấu ăn với rich text content
- Upload hình ảnh thumbnail
- Hệ thống rating và bình luận
- Like/unlike công thức
- Tìm kiếm và lọc theo tags, độ khó, thời gian
- Phân trang kết quả

### 📰 Quản lý blog
- CRUD blog posts (chỉ admin)
- Upload hình ảnh thumbnail cho blog
- Hệ thống bình luận
- Sanitize HTML content để bảo mật

### 🛡️ Bảo mật
- JWT token authentication
- Bcrypt password hashing
- HTML sanitization
- Role-based access control
- Cloudinary image storage

## 🚀 Cài đặt và chạy

### Yêu cầu hệ thống
- Node.js >= 14.x
- MongoDB Atlas account
- Cloudinary account

### Cài đặt dependencies
```bash
npm install
```

### Cấu hình environment
Tạo file `.env` từ `.env.example`:
```bash
cp .env.example .env
```

Cập nhật các biến môi trường trong file `.env`:
```env
PORT=8080

# MongoDB Atlas
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.lkqkked.mongodb.net/RecipeFoodDB?retryWrites=true&w=majority
BD_NAME=RecipeFoodDB

# JWT
JWT_SECRET=your_super_secret_key_here

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Default Images
DEFAULT_AVATAR_URL=https://res.cloudinary.com/.../default_avatar.png
DEFAULT_RECIPE_THUMBNAIL=https://res.cloudinary.com/.../default_recipe.jpg
DEFAULT_BLOG_THUMBNAIL=https://res.cloudinary.com/.../default_blog.jpg
```

### Tạo database indexes
```bash
node scripts/create-index.js
```

### Chạy ứng dụng
```bash
# Development mode
npm run dev

# Production mode
npm start
```

Server sẽ chạy tại `http://localhost:8080`

## 📚 API Documentation

### Authentication
Tất cả các protected routes yêu cầu Bearer token trong header:
```
Authorization: Bearer <your_jwt_token>
```

### Users API (`/api/users`)

#### Public Routes
- `POST /register` - Đăng ký tài khoản
- `POST /login` - Đăng nhập

#### Protected Routes
- `GET /profile` - Xem profile cá nhân
- `PUT /update-info` - Cập nhật thông tin
- `PUT /change-password` - Đổi mật khẩu
- `PUT /avatar` - Upload avatar (multipart/form-data)

#### Admin Routes
- `GET /` - Lấy danh sách tất cả user
- `GET /:id` - Xem thông tin user theo ID
- `PUT /:id/status` - Cập nhật trạng thái user
- `PUT /:id/role` - Cập nhật role user
- `DELETE /:id` - Xóa user

### Recipes API (`/api/recipes`)

#### Public Routes
- `GET /` - Lấy danh sách công thức (có phân trang, filter)
  - Query params: `q`, `tags`, `difficulty`, `maxTotalTime`, `page`, `limit`
- `GET /:id` - Xem chi tiết công thức

#### Protected Routes
- `POST /` - Tạo công thức mới (có upload thumbnail)
- `PUT /:id` - Cập nhật công thức
- `DELETE /:id` - Xóa công thức
- `POST /:id/like` - Like/unlike công thức
- `POST /:id/rate` - Đánh giá công thức (1-5 sao)
- `DELETE /:id/rating` - Xóa đánh giá của mình
- `POST /:id/comments` - Thêm bình luận
- `DELETE /:id/comments/:commentId` - Xóa bình luận của mình

#### Admin Routes
- `PATCH /:id/hide` - Ẩn công thức
- `PATCH /:id/unhide` - Bỏ ẩn công thức
- `DELETE /:id/rating/:userId` - Xóa đánh giá của user khác
- `DELETE /:id/comments/:commentId/admin` - Xóa bình luận

### Blogs API (`/api/blogs`)

#### Public Routes
- `GET /` - Lấy danh sách blog
- `GET /:id` - Xem chi tiết blog

#### Admin Routes
- `POST /` - Tạo blog mới (có upload thumbnail)
- `PUT /:id` - Cập nhật blog
- `DELETE /:id` - Xóa blog

#### Protected Routes
- `POST /:id/comment` - Thêm bình luận vào blog
- `DELETE /:blogId/comment/:commentId` - Xóa bình luận

## 🗂️ Cấu trúc thư mục

```
backend_recipebook/
├── config/
│   ├── cloudinary.js      # Cấu hình Cloudinary
│   ├── db.js             # Kết nối MongoDB
│   └── jwt.js            # JWT utilities
├── controllers/
│   ├── blog.Controller.js
│   ├── recipe.Controller.js
│   └── user.Controller.js
├── dao/                  # Data Access Objects
│   ├── blogDAO.js
│   ├── recipeDAO.js
│   └── userDAO.js
├── middlewares/
│   ├── auth.js           # JWT authentication
│   ├── roleCheck.js      # Role-based authorization
│   └── uploadImage.js    # Multer + Cloudinary upload
├── models/               # Data models
│   ├── blog.model.js
│   ├── recipe.model.js
│   └── user.model.js
├── routes/
│   ├── blog.route.js
│   ├── recipe.route.js
│   └── user.route.js
├── scripts/
│   └── create-index.js   # Tạo database indexes
├── utils/
│   ├── cloudinaryUtils.js
│   ├── passwordUtils.js
│   ├── sanitizeHtml.js
│   └── validateEmail.js
├── app.js               # Express app setup
└── server.js           # Server entry point
```

## 📝 Data Models

### User Model
```javascript
{
  username: String (unique),
  fullname: String,
  email: String (unique),
  password: String (hashed),
  avatar: String (URL),
  role: String ['user', 'admin', 'staff'],
  status: String ['active', 'blocked'],
  createdAt: Date,
  updatedAt: Date
}
```

### Recipe Model
```javascript
{
  title: String,
  summary: String,
  content: String (HTML),
  ingredients: [{
    name: String,
    quantity: Number,
    unit: String
  }],
  steps: [String],
  time: {
    prep: Number,
    cook: Number,
    total: Number
  },
  difficulty: String ['Dễ', 'Trung bình', 'Khó'],
  servings: Number,
  tags: [String],
  thumbnail: String (URL),
  images: [String],
  createdBy: ObjectId,
  isHidden: Boolean,
  likes: [ObjectId],
  ratings: [{
    user: ObjectId,
    stars: Number (1-5),
    comment: String,
    createdAt: Date
  }],
  comments: [{
    _id: ObjectId,
    user: ObjectId,
    content: String,
    createdAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### Blog Model
```javascript
{
  title: String,
  thumbnail: String (URL),
  content: String (HTML),
  author: ObjectId,
  comments: [{
    _id: ObjectId,
    user: ObjectId,
    content: String,
    createdAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

## 🔒 Phân quyền

- **user**: Có thể tạo, sửa, xóa công thức của mình, like, rate, comment
- **admin**: Có tất cả quyền của user + quản lý users, blogs, moderate content
- **staff**: Có thể được mở rộng thêm quyền trong tương lai

## 🛠️ Technologies

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with native driver
- **Authentication**: JWT
- **Image Storage**: Cloudinary
- **File Upload**: Multer + multer-storage-cloudinary
- **Security**: bcryptjs, sanitize-html
- **Development**: Nodemon

## 🚦 Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

