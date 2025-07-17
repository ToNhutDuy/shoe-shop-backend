
# 👟 Ứng Dụng Bán Giày - API Backend


---

## 🛠️ Tech Stack

**Backend:**
- [NestJS](https://nestjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [TypeORM](https://typeorm.io/)
- [Zod](https://zod.dev/) (Validation)
- [JWT](https://jwt.io/) & [Passport.js](http://www.passportjs.org/)

**Database:**
- MySQL

---

## ⚡️ Key Features

### 👥 Quản Lý Người Dùng & Xác Thực | User Management & Authentication
- Đăng ký, đăng nhập, đăng xuất
- Quản lý hồ sơ người dùng
- Xác thực email & đặt lại mật khẩu
- Hỗ trợ đăng nhập Google OAuth

## 🔐 Phân Quyền RBAC | Role-Based Access Control (RBAC)
Ứng dụng sử dụng **RBAC** để quản lý quyền truy cập API.

### 📦 Quản Lý Sản Phẩm | Product Management
- Danh mục sản phẩm & thương hiệu 
- Thuộc tính sản phẩm (màu sắc, kích cỡ) & giá trị
- Biến thể sản phẩm (SKU, tồn kho, hình ảnh)
- Đánh giá sản phẩm từ người dùng

### 🛒 Giỏ Hàng & Đơn Hàng | Cart & Order Management
- Thêm/xóa sản phẩm vào giỏ 
- Danh sách yêu thích
- Quy trình đặt hàng đầy đủ
- Theo dõi trạng thái đơn hàng & lịch sử thay đổi
- Tích hợp đơn vị vận chuyển


### 📝 CMS & Blog
- Blog 
- Banner quảng cáo, thông báo
- Trang nội dung tĩnh 

---

## 📖 Prerequisites

- [Node.js](https://nodejs.org/) >= 18.x
- [MySQL](https://www.mysql.com/) >= 8.x

---

## 🚀 Bắt Đầu | Getting Started

### 1️⃣ Clone Repository
```bash
git clone git@github.com:ToNhutDuy/shoe-shop-backend.git
cd shoe-shop-backend
```

### 2️⃣  Install Dependencies
```bash
npm install
```

### 3️⃣ Configure Environment Variables
Tạo file `.env` dựa trên `.env.example` và cập nhật thông tin:
```env
PORT=8080

# Database
DB_DRIVER=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=
DB_DATABASE=

# JWT
JWT_SECRET=
JWT_ACCESS_TOKEN_EXPIRED=60m
JWT_REFRESH_TOKEN_SECRET=
JWT_REFRESH_TOKEN_EXPIRED=7d
JWT_REFRESH_TOKEN_COOKIE_MAX_AGE=604800000

# Email
MAIL_USER=
MAIL_PASSWORD=
EMAIL_CODE_EXPIRES_IN_DAYS=10
PASSWORD_RESET_CODE_EXPIRES_IN_MINUTES=10

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:8080/api/v1/auth/google/redirect

CLIENT_URL=
BACKEND_URL=
APP_URL=
```

### 4️⃣ Tạo Database & Chạy Migration | Create Database & Run Migrations
```bash
npm run typeorm migration:run
```

### 5️⃣ Khởi Chạy Ứng Dụng | Start Application
Chạy ở chế độ phát triển:
```bash
npm run start:dev
```

---


---

## 📜 License
Distributed under the MIT License. See `LICENSE` for details.


