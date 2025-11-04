# Hướng dẫn sử dụng Postman Collection

## Cách import vào Postman

1. Mở Postman
2. Click **Import** ở góc trên bên trái
3. Chọn file `ERP_System_API.postman_collection.json`
4. Collection sẽ xuất hiện trong sidebar bên trái

## Cấu hình Variables

Collection đã có sẵn các variables:
- `base_url`: URL của API server (mặc định: `http://localhost:3000`)
- `access_token`: Access token sau khi login (tự động set)
- `refresh_token`: Refresh token sau khi login (tự động set)

### Thay đổi base_url
1. Click vào collection name
2. Chọn tab **Variables**
3. Sửa giá trị `base_url` nếu cần

## Quy trình test API

### Bước 1: Tạo dữ liệu seed (nếu chưa có)

Trước khi test, bạn cần tạo một số dữ liệu mẫu:

1. **Tạo Permission**
   - POST `/permissions`
   - Body mẫu:
   ```json
   {
     "code": "user.create",
     "name": "Create User",
     "description": "Permission to create users"
   }
   ```

2. **Tạo Role**
   - POST `/roles`
   - Body mẫu:
   ```json
   {
     "code": "admin",
     "name": "Administrator",
     "description": "Full system access"
   }
   ```

3. **Gán Permission cho Role**
   - POST `/roles/{role_id}/permissions`
   - Body: `{ "permission_ids": ["1"] }`

4. **Tạo Employee**
   - POST `/employees`
   - Body mẫu:
   ```json
   {
     "employee_code": "EMP001",
     "username": "admin",
     "email": "admin@example.com",
     "password": "password123",
     "full_name": "Admin User",
     "status": "ACTIVE"
   }
   ```

5. **Gán Role cho Employee**
   - POST `/employees/{employee_id}/roles`
   - Body: `{ "role_ids": ["1"] }`

### Bước 2: Đăng nhập

1. Chọn request **Authentication > Login**
2. Sửa body với username/password của employee vừa tạo
3. Click **Send**
4. Access token và refresh token sẽ tự động được lưu vào variables

### Bước 3: Test các API khác

Sau khi login, tất cả các API khác sẽ tự động sử dụng `access_token` từ variables.

## Các API Endpoints

### Authentication
- `POST /auth/login` - Đăng nhập
- `POST /auth/refresh` - Refresh token
- `GET /auth/profile` - Lấy profile user hiện tại
- `DELETE /auth/logout` - Đăng xuất

### Employee
- `POST /employees` - Tạo employee
- `GET /employees` - Danh sách employees (có pagination và search)
- `GET /employees/:id` - Chi tiết employee
- `PATCH /employees/:id` - Cập nhật employee
- `DELETE /employees/:id` - Xóa employee
- `POST /employees/:id/roles` - Gán roles cho employee
- `DELETE /employees/:id/roles` - Xóa roles của employee

### Role
- `POST /roles` - Tạo role
- `GET /roles` - Danh sách roles (có pagination và search)
- `GET /roles/:id` - Chi tiết role
- `PATCH /roles/:id` - Cập nhật role
- `DELETE /roles/:id` - Xóa role
- `POST /roles/:id/permissions` - Gán permissions cho role
- `DELETE /roles/:id/permissions` - Xóa permissions của role

### Permission
- `POST /permissions` - Tạo permission
- `GET /permissions` - Danh sách permissions (có pagination và search)
- `GET /permissions/:id` - Chi tiết permission
- `PATCH /permissions/:id` - Cập nhật permission
- `DELETE /permissions/:id` - Xóa permission

## Query Parameters

### Pagination
- `page`: Số trang (bắt đầu từ 1)
- `pageSize`: Số item mỗi trang (mặc định 10)

### Search
- `search`: Tìm kiếm (tùy thuộc vào endpoint)
  - Employee: tìm theo username, email, full_name, employee_code
  - Role/Permission: tìm theo code, name

Ví dụ: `GET /employees?page=1&pageSize=10&search=john`

## Response Format

### Success Response
```json
{
  "id": "1",
  "username": "admin",
  "email": "admin@example.com",
  ...
}
```

### Pagination Response
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "pageSize": 10,
  "totalPages": 10
}
```

### Error Response
```json
{
  "statusCode": 404,
  "message": "Employee with ID 1 not found",
  "error": "Not Found"
}
```

## Lưu ý

1. **Tất cả API** (trừ `/auth/login`) đều yêu cầu **JWT Authentication**
2. Access token có thời hạn (mặc định 15 phút), sử dụng refresh token để lấy token mới
3. Refresh token có thời hạn (mặc định 7 ngày)
4. IDs trong database là BigInt, được convert sang string trong response
5. Khi gán roles/permissions, sẽ thay thế toàn bộ roles/permissions hiện tại

## Troubleshooting

### Lỗi 401 Unauthorized
- Kiểm tra access_token có được set sau khi login không
- Token có thể đã hết hạn, sử dụng refresh token để lấy token mới

### Lỗi 404 Not Found
- Kiểm tra base_url có đúng không
- Kiểm tra server có đang chạy không (`npm run start:dev`)

### Lỗi khi gán roles/permissions
- Đảm bảo role_id/permission_id đã tồn tại trong database
- IDs phải là string (ví dụ: "1" không phải 1)

