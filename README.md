# Recipe Book Backend API

Đây là backend cho dự án RecipeBook – một ứng dụng sổ tay công thức nấu ăn.
Dự án được xây dựng bằng Node.js + Express và sử dụng MongoDB (driver gốc, không dùng Mongoose) để lưu trữ dữ liệu.

## 🚀 Tính năng

### 🔐 Xác thực & Bảo mật
- **Đăng ký/Đăng nhập** với JWT authentication
- **Xác thực email hybrid** - hỗ trợ cả token link và OTP code
- **Đặt lại mật khẩu** - đa phương thức (email link + SMS-style OTP)
- **Rate limiting** - bảo vệ khỏi spam và brute force
- **Password strength validation** - yêu cầu mật khẩu mạnh
- **XSS protection** và input sanitization

### 👥 Quản lý người dùng
- **Hồ sơ cá nhân** - cập nhật thông tin, avatar
- **Phân quyền** - User, Admin, Staff
- **Quản trị viên** - quản lý tài khoản, khóa/mở khóa user

### 🍳 Công thức nấu ăn
- **CRUD operations** - tạo, đọc, cập nhật, xóa công thức
- **Rich content editor** - hỗ trợ HTML được sanitize
- **Upload ảnh** - thumbnail và ảnh minh họa
- **Tìm kiếm nâng cao** - theo tên, nguyên liệu, tag
- **Filtering** - theo độ khó, thời gian nấu, tags
- **Pagination** - phân trang hiệu quả

### 💝 Tương tác xã hội
- **Like system** - thích/bỏ thích công thức
- **Rating & Review** - đánh giá sao và bình luận
- **Comment system** - thảo luận về công thức
- **Moderation tools** - ẩn/hiện nội dung (admin)

### 📝 Blog System
- **Blog CRUD** - viết và quản lý bài viết
- **Rich text content** - hỗ trợ HTML, ảnh
- **Comment system** - tương tác với bài viết
- **Admin moderation** - quản lý nội dung

### 🔧 Kỹ thuật
- **MongoDB** với native driver
- **Cloudinary** integration cho upload ảnh
- **Email service** - SMTP/Gmail support
- **Error handling** - xử lý lỗi toàn cục
- **Request logging** với unique request ID
- **Health checks** - `/health` và `/ready` endpoints

## 🛠️ Công nghệ sử dụng

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** MongoDB
- **Authentication:** JWT (jsonwebtoken)
- **File Upload:** Multer + Cloudinary
- **Email:** Nodemailer
- **Security:** Helmet, CORS, HPP, Rate Limiting
- **Validation:** Joi (config) + custom validators
- **HTML Sanitization:** sanitize-html
- **Password Hashing:** bcryptjs

## 📋 Yêu cầu hệ thống

- Node.js 18.x hoặc cao hơn
- MongoDB 4.4+
- Cloudinary account (cho upload ảnh)
- SMTP server hoặc Gmail account (cho email)

## ⚡ Cài đặt nhanh

### 1. Clone repository
```bash
git clone https://github.com/TannHV/backend_recipebook.git
cd backend_recipebook
```

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Cấu hình biến môi trường
```bash
cp .env.example .env
```

Chỉnh sửa file `.env` với thông tin của bạn:

```env
NODE_ENV=development
PORT=8080

# MongoDB
MONGO_URI==mongodb+srv://<username>:<password>@cluster0.lkqkked.mongodb.net
DB_NAME=RecipeFoodDB

# JWT
JWT_SECRET=your_super_secret_jwt_key_here_min_20_chars

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (Gmail)
EMAIL_SERVICE=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_SECURE=true
EMAIL_FROM="Recipe Book <noreply@recipebook.com>"

# URLs
APP_BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:8080

# Feature flags
VERIFY_MODE_TOKEN=true
VERIFY_MODE_OTP=true
RESET_MODE_TOKEN=true
RESET_MODE_OTP=true
```

### 4. Tạo indexes cho MongoDB
```bash
npm run create-indexes
```

### 5. Khởi động server
```bash
# Development
npm run dev

# Production
npm start
```

Server sẽ chạy tại `http://localhost:8080`

## 📚 API Documentation

### Base URL
```
http://localhost:8080/api
```

### Authentication
Sử dụng JWT token trong header:
```
Authorization: Bearer <your_jwt_token>
```

### Endpoints chính

#### 🔐 Authentication (`/auth`)
```http
POST /auth/register              # Đăng ký
POST /auth/login                 # Đăng nhập
POST /auth/verify/request        # Gửi email xác thực (cần JWT)
GET  /auth/verify/confirm?token= # Xác thực bằng token
POST /auth/verify/confirm        # Xác thực bằng token (body)
POST /auth/verify/confirm-code   # Xác thực bằng OTP (cần JWT)
POST /auth/forgot                # Quên mật khẩu
POST /auth/reset/token           # Reset mật khẩu bằng token
POST /auth/reset/code            # Reset mật khẩu bằng OTP
```

#### 👤 User Management (`/users`)
```http
GET    /users/profile            # Xem profile (user)
PUT    /users/update-info        # Cập nhật thông tin (user)
PUT    /users/change-password    # Đổi mật khẩu (user)
PUT    /users/avatar             # Upload avatar (user)
GET    /users                    # Danh sách user (admin)
PUT    /users/:id/status         # Cập nhật trạng thái (admin)
PUT    /users/:id/role           # Cập nhật role (admin)
DELETE /users/:id                # Xóa user (admin)
```

#### 🍳 Recipes (`/recipes`)
```http
GET    /recipes                  # Danh sách công thức (public)
GET    /recipes/:id              # Chi tiết công thức (public)
POST   /recipes                  # Tạo công thức (user)
PUT    /recipes/:id              # Sửa công thức (author/admin)
DELETE /recipes/:id              # Xóa công thức (author/admin)

# Tương tác
POST   /recipes/:id/like         # Like/unlike (user)
POST   /recipes/:id/rate         # Đánh giá (user)
PUT    /recipes/:id/rating       # Sửa đánh giá (user)
DELETE /recipes/:id/rating       # Xóa đánh giá của mình (user)
POST   /recipes/:id/comments     # Thêm comment (user)
DELETE /recipes/:id/comments/:commentId # Xóa comment (author/admin)

# Admin
PATCH  /recipes/:id/hide         # Ẩn công thức (admin)
PATCH  /recipes/:id/unhide       # Bỏ ẩn công thức (admin)
DELETE /recipes/:id/rating/:userId # Xóa rating của user (admin)
```

#### 📝 Blogs (`/blogs`)
```http
GET    /blogs                    # Danh sách blog (public)
GET    /blogs/:id                # Chi tiết blog (public)
POST   /blogs                    # Tạo blog (admin)
PUT    /blogs/:id                # Sửa blog (admin)
DELETE /blogs/:id                # Xóa blog (admin)
POST   /blogs/:id/comment        # Thêm comment (user)
DELETE /blogs/:blogId/comment/:commentId # Xóa comment (admin)
```

### 📊 Response Format

#### Success Response
```json
{
  "success": true,
  "message": "Success",
  "data": {...},
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "req_uuid"
}
```

#### Paginated Response
```json
{
  "success": true,
  "message": "Success",
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 12,
    "totalItems": 100,
    "totalPages": 9,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email không hợp lệ"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🔧 Cấu hình nâng cao

### Email Templates
Có thể tùy chỉnh template email trong `templates/emailTemplates.js`

### Rate Limiting
```javascript
// API general: 300 requests/15 phút
// Auth endpoints: 30 requests/10 phút
```

### File Upload
- **Avatar**: tối đa 2MB
- **Recipe thumbnail**: tối đa 5MB
- **Blog images**: tối đa 5MB

### Security Features
- Helmet.js security headers
- CORS protection
- NoSQL injection prevention
- XSS protection với HTML sanitization
- HTTP Parameter Pollution (HPP) protection

## 🧪 Testing

### Health Check
```bash
curl http://localhost:8080/health
curl http://localhost:8080/ready
```

### Debug Email
```bash
curl http://localhost:8080/debug/email
```

## 📝 Scripts

```bash
npm start              # Production server
npm run dev            # Development với nodemon
npm run create-indexes # Tạo MongoDB indexes
```

## 🏗️ Kiến trúc dự án

```
src/
├── config/           # Cấu hình (DB, Cloudinary, JWT, Env)
├── controllers/      # Business logic
├── dao/             # Data Access Objects
├── middlewares/     # Express middlewares
├── models/          # Data models
├── routes/          # API routes
├── services/        # External services (email, etc.)
├── templates/       # Email templates
├── utils/           # Utility functions
├── app.js           # Express app setup
└── server.js        # Server entry point
```
