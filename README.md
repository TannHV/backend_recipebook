# Recipe Book Backend API

Một REST API backend chuyên nghiệp cho ứng dụng Recipe Book được xây dựng với Node.js, Express.js và MongoDB. Hệ thống cung cấp các tính năng quản lý công thức nấu ăn, blog và người dùng với bảo mật cao và hiệu suất tối ưu.

## ✨ Tính năng chính

### 🔐 Quản lý người dùng
- Đăng ký, đăng nhập với JWT authentication
- Phân quyền người dùng (user, admin, staff)
- Quản lý profile và avatar với Cloudinary
- Đổi mật khẩu, cập nhật thông tin cá nhân
- Validation dữ liệu với Joi schema

### 📝 Quản lý công thức nấu ăn
- CRUD công thức nấu ăn với rich text content
- Upload hình ảnh thumbnail tự động resize
- Hệ thống rating (1-5 sao) và bình luận
- Like/unlike công thức
- Tìm kiếm thông minh với regex và lọc theo tags, độ khó, thời gian
- Phân trang kết quả với metadata đầy đủ
- Moderation (ẩn/hiện công thức)

### 📰 Quản lý blog
- CRUD blog posts (chỉ admin)
- Upload hình ảnh thumbnail cho blog
- Hệ thống bình luận
- HTML sanitization an toàn

### 🛡️ Bảo mật & Performance
- JWT token authentication với rate limiting
- Bcrypt password hashing
- HTML sanitization với allowlist
- Role-based access control
- Request ID tracking
- CORS configuration
- Helmet security headers
- XSS protection
- NoSQL injection protection
- HTTP Parameter Pollution (HPP) protection
- Gzip compression
- Graceful shutdown handling

### 📊 Monitoring & Logging
- Health check endpoints
- Request logging với Morgan
- Error tracking với request ID
- Structured error responses

## 🚀 Cài đặt và chạy

### Yêu cầu hệ thống
- Node.js >= 18.x < 23
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
NODE_ENV=development
PORT=8080

# MongoDB Atlas
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.lkqkked.mongodb.net/RecipeFoodDB?retryWrites=true&w=majority
DB_NAME=RecipeFoodDB

# JWT
JWT_SECRET=your_super_secret_key_here

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# CORS (comma-separated)
CORS_ORIGINS=http://localhost:8080,http://127.0.0.1:5173

# Default Images
DEFAULT_AVATAR_URL=https://res.cloudinary.com/.../default_avatar.png
DEFAULT_RECIPE_THUMBNAIL=https://res.cloudinary.com/.../default_recipe.jpg
DEFAULT_BLOG_THUMBNAIL=https://res.cloudinary.com/.../default_blog.jpg
```

### Tạo database indexes
```bash
npm run create-index
```

### Chạy ứng dụng
```bash
# Development mode
npm run dev

# Production mode
npm start
```

Server sẽ chạy tại `http://localhost:8080`

### Health Check
- `GET /health` - Server status
- `GET /ready` - Readiness probe

## 📚 API Documentation

### Rate Limits
- **API General**: 300 requests/15 minutes
- **Authentication**: 30 requests/10 minutes

### Authentication
Tất cả các protected routes yêu cầu Bearer token trong header:
```
Authorization: Bearer <your_jwt_token>
```

### Response Format
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "uuid-v4",
  "meta": { ... } // For paginated responses
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": ["Additional details"]
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "uuid-v4"
}
```

### Users API (`/api/users`)

#### Public Routes
- `POST /register` - Đăng ký tài khoản
  ```json
  {
    "username": "user123",
    "email": "user@example.com",
    "password": "Password123",
    "confirmPassword": "Password123",
    "fullname": "Nguyen Van A"
  }
  ```
- `POST /login` - Đăng nhập
  ```json
  {
    "identifier": "user123", // username hoặc email
    "password": "Password123"
  }
  ```

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
  - Query params:
    - `q`: Tìm kiếm text
    - `tags`: Tags filter (comma-separated)
    - `difficulty`: "Dễ" | "Trung bình" | "Khó"
    - `maxTotalTime`: Thời gian tối đa (phút)
    - `page`: Trang hiện tại (default: 1)
    - `limit`: Số items/trang (default: 12, max: 100)
    - `sort`: "newest" | "oldest" | "popular"
- `GET /:id` - Xem chi tiết công thức

#### Protected Routes
- `POST /` - Tạo công thức mới
  ```json
  {
    "title": "Phở bò Hà Nội",
    "summary": "Món phở truyền thống...",
    "content": "<p>Cách làm chi tiết...</p>",
    "ingredients": [
      {
        "name": "Thịt bò",
        "quantity": 500,
        "unit": "gram"
      }
    ],
    "steps": ["Bước 1...", "Bước 2..."],
    "time": {
      "prep": 30,
      "cook": 120,
      "total": 150
    },
    "difficulty": "Trung bình",
    "servings": 4,
    "tags": ["việt nam", "phở", "bò"]
  }
  ```
- `PUT /:id` - Cập nhật công thức
- `DELETE /:id` - Xóa công thức
- `POST /:id/like` - Like/unlike công thức
- `POST /:id/rate` - Đánh giá công thức (1-5 sao)
- `PUT /:id/rating` - Cập nhật đánh giá
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
│   ├── db.js             # Kết nối MongoDB với pooling
│   ├── env.js            # Environment validation với Joi
│   └── jwt.js            # JWT utilities
├── controllers/
│   ├── blog.controller.js
│   ├── recipe.controller.js
│   └── user.controller.js
├── dao/                  # Data Access Objects
│   ├── blogDAO.js
│   ├── recipeDAO.js
│   └── userDAO.js
├── middlewares/
│   ├── auth.js           # JWT authentication
│   ├── errorHandler.js   # Global error handler
│   ├── roleCheck.js      # Role-based authorization
│   ├── uploadImage.js    # Multer + Cloudinary upload
│   ├── validation.js     # Joi validation schemas
│   └── xss.js           # XSS sanitization
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
│   ├── apiResponse.js    # Structured API responses
│   ├── cloudinaryUtils.js
│   ├── error.js          # Custom error classes
│   ├── escapeRegex.js    # Regex escaping
│   ├── mongo.js          # MongoDB utilities
│   ├── passwordUtils.js
│   ├── sanitizeHtml.js   # HTML sanitization
│   └── validateEmail.js
├── app.js               # Express app setup với security
└── server.js           # Server entry point với graceful shutdown
```

## 📝 Data Models

### User Model
```javascript
{
  _id: ObjectId,
  username: String (unique, 3-30 chars, alphanumeric + underscore),
  fullname: String (2-100 chars),
  email: String (unique, valid email),
  password: String (bcrypt hashed),
  avatar: String (Cloudinary URL),
  role: String ['user', 'admin', 'staff'],
  status: String ['active', 'blocked'],
  createdAt: Date,
  updatedAt: Date
}
```

### Recipe Model
```javascript
{
  _id: ObjectId,
  title: String (5-200 chars),
  summary: String (max 500 chars),
  content: String (HTML sanitized),
  ingredients: [{
    name: String (required),
    quantity: Number (positive),
    unit: String
  }],
  steps: [String] (min 1 step),
  time: {
    prep: Number (minutes),
    cook: Number (minutes),
    total: Number (minutes)
  },
  difficulty: String ['Dễ', 'Trung bình', 'Khó'],
  servings: Number (positive),
  tags: [String],
  thumbnail: String (Cloudinary URL),
  images: [String],
  createdBy: ObjectId,
  isHidden: Boolean,
  likes: [ObjectId],
  ratings: [{
    user: ObjectId,
    stars: Number (1-5),
    comment: String,
    createdAt: Date,
    updatedAt: Date
  }],
  comments: [{
    _id: ObjectId,
    user: ObjectId,
    content: String (sanitized),
    createdAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### Blog Model
```javascript
{
  _id: ObjectId,
  title: String (5-200 chars),
  thumbnail: String (Cloudinary URL),
  content: String (HTML sanitized),
  author: ObjectId,
  comments: [{
    _id: ObjectId,
    user: ObjectId,
    content: String (sanitized),
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

### Core
- **Runtime**: Node.js 18+
- **Framework**: Express.js 5
- **Database**: MongoDB with native driver
- **Authentication**: JWT
- **Image Storage**: Cloudinary
- **File Upload**: Multer + multer-storage-cloudinary

### Security
- **Password**: bcryptjs
- **HTML Sanitization**: sanitize-html
- **Headers**: Helmet
- **Rate Limiting**: express-rate-limit
- **CORS**: cors
- **XSS Protection**: Custom middleware
- **Validation**: Joi

### Development
- **Environment**: dotenv
- **Logging**: Morgan
- **Compression**: compression
- **Development**: Nodemon

## 🚦 Status Codes

- `200` - OK
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `413` - Payload Too Large
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error

## 🔧 Scripts

```bash
npm start          # Production mode
npm run dev        # Development mode với nodemon
npm run create-index # Tạo database indexes
npm run build      # No build step (placeholder)
```

## 🌐 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | development | Environment mode |
| `PORT` | No | 8080 | Server port |
| `MONGO_URI` | Yes | - | MongoDB connection string |
| `DB_NAME` | Yes | - | Database name |
| `JWT_SECRET` | Yes | - | JWT secret key (min 20 chars) |
| `CLOUDINARY_CLOUD_NAME` | Yes | - | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | - | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | - | Cloudinary API secret |
| `CORS_ORIGINS` | No | '' | Allowed origins (comma-separated) |
| `DEFAULT_AVATAR_URL` | No | - | Default user avatar URL |
| `DEFAULT_RECIPE_THUMBNAIL` | No | - | Default recipe thumbnail URL |
| `DEFAULT_BLOG_THUMBNAIL` | No | - | Default blog thumbnail URL |

## 🔍 Validation Rules

### User Registration
- Username: 3-30 chars, alphanumeric + underscore only
- Email: Valid email format
- Password: Min 8 chars, must contain uppercase, lowercase, number
- Fullname: 2-100 chars

### Recipe
- Title: 5-200 chars
- Content: Min 20 chars
- Ingredients: Array with name (required), quantity, unit
- Steps: Array of strings, min 1 step
- Rating: 1-5 stars integer

### Blog
- Title: 5-200 chars
- Content: Min 20 chars
- Comments: Min 1 char

## 📋 Todo/Roadmap

- [ ] Add Redis caching for better performance
- [ ] Implement real-time notifications
- [ ] Add email verification
- [ ] Implement forgot password functionality
- [ ] Add API documentation with Swagger
- [ ] Add comprehensive testing suite
- [ ] Implement image optimization
- [ ] Add search analytics
