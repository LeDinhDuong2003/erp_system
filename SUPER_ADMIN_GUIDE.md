# Hướng dẫn Super Admin

## Tổng quan

Hệ thống đã được cấu hình với logic **Super Admin** để quản lý tài khoản nhân viên. Super Admin là tài khoản đặc biệt có quyền cao nhất trong hệ thống.

## Tính năng

### 1. Tự động tạo Super Admin khi khởi động

Khi ứng dụng khởi động lần đầu, hệ thống sẽ tự động:
- Tạo role `SUPER_ADMIN` trong database
- Tạo tài khoản super admin với thông tin:
  - **Username**: `superadmin`
  - **Email**: `superadmin@system.local`
  - **Password**: Lấy từ biến môi trường `SUPER_ADMIN_PASSWORD` (mặc định: `superadmin123`)
  - **Employee Code**: `SUPER_ADMIN_001`

### 2. Quyền hạn của Super Admin

Super Admin có quyền:
- ✅ **Tạo Employee** - Chỉ super admin mới có thể tạo tài khoản nhân viên mới
- ✅ **Quản lý Roles** - Tạo, sửa, xóa roles và gán permissions cho roles
- ✅ **Quản lý Permissions** - Tạo, sửa, xóa permissions
- ✅ **Gán Roles cho Employee** - Gán roles cho nhân viên
- ✅ **Xem tất cả** - Xem danh sách employees, roles, permissions

Các user khác (không phải SUPER_ADMIN) chỉ có thể:
- Xem danh sách employees, roles, permissions
- Cập nhật thông tin cá nhân của chính họ
- Không thể tạo/sửa/xóa employees, roles, permissions

## Cấu hình

### Biến môi trường

Thêm vào file `.env`:

```env
SUPER_ADMIN_PASSWORD=your-secure-password-here
```

**⚠️ Lưu ý quan trọng**: Thay đổi password mặc định ngay sau lần đăng nhập đầu tiên!

## Quy trình sử dụng

### Bước 1: Đăng nhập với Super Admin

```bash
POST /auth/login
{
  "username": "superadmin",
  "password": "superadmin123"  // hoặc password từ SUPER_ADMIN_PASSWORD
}
```

### Bước 2: Tạo tài khoản nhân viên

Sau khi đăng nhập, sử dụng access token để tạo nhân viên mới:

```bash
POST /employees
Authorization: Bearer {access_token}

{
  "employee_code": "EMP001",
  "username": "john.doe",
  "email": "john.doe@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "status": "ACTIVE"
}
```

### Bước 3: Gán roles cho nhân viên

```bash
POST /employees/{employee_id}/roles
Authorization: Bearer {access_token}

{
  "role_ids": ["1", "2"]
}
```

### Bước 4: Quản lý Roles và Permissions

Super Admin có thể tạo và quản lý roles/permissions:

```bash
# Tạo role
POST /roles
{
  "code": "manager",
  "name": "Manager",
  "description": "Manager role"
}

# Gán permissions cho role
POST /roles/{role_id}/permissions
{
  "permission_ids": ["1", "2", "3"]
}
```

## Bảo mật

1. **Không bao giờ** commit file `.env` vào git
2. **Thay đổi password mặc định** ngay sau lần đăng nhập đầu tiên
3. Chỉ có **1 Super Admin** được tạo tự động, không tạo thêm bằng cách thông thường
4. Super Admin role (`SUPER_ADMIN`) không thể bị xóa thông qua API

## Kiểm tra Super Admin

Để kiểm tra super admin đã được tạo:

```bash
# Login với superadmin
POST /auth/login
{
  "username": "superadmin",
  "password": "superadmin123"
}

# Kiểm tra profile
GET /auth/profile
Authorization: Bearer {access_token}

# Response sẽ có roles bao gồm SUPER_ADMIN
{
  "userId": "1",
  "username": "superadmin",
  "roles": [
    {
      "id": "1",
      "code": "SUPER_ADMIN",
      "name": "Super Administrator",
      ...
    }
  ]
}
```

## Xử lý lỗi

### Lỗi: "Access denied. Required role: SUPER_ADMIN"

**Nguyên nhân**: User hiện tại không có role SUPER_ADMIN

**Giải pháp**: 
- Đảm bảo đang đăng nhập với tài khoản superadmin
- Kiểm tra xem super admin đã được tạo chưa (xem logs khi khởi động app)

### Super Admin chưa được tạo

**Nguyên nhân**: Seed service chưa chạy hoặc có lỗi

**Giải pháp**:
1. Kiểm tra logs khi khởi động ứng dụng
2. Xem có log `✅ Super admin created successfully` không
3. Kiểm tra database xem đã có user `superadmin` chưa:
   ```sql
   SELECT * FROM employee WHERE username = 'superadmin';
   ```

## Code Implementation

### Guard và Decorator

Hệ thống sử dụng:
- `@Roles('SUPER_ADMIN')` - Decorator để đánh dấu endpoint cần SUPER_ADMIN
- `RolesGuard` - Guard để kiểm tra quyền truy cập
- `JwtAuthGuard` - Guard để xác thực JWT token

### Ví dụ sử dụng trong Controller

```typescript
@Post()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
create(@Body() createEmployeeDto: CreateEmployeeDto) {
  return this.employeeService.create(createEmployeeDto);
}
```

## Lưu ý

1. Super Admin được tạo tự động **chỉ một lần** khi ứng dụng khởi động lần đầu
2. Nếu super admin đã tồn tại, hệ thống sẽ **không tạo lại**
3. Có thể tạo nhiều super admin thủ công bằng cách gán role `SUPER_ADMIN` cho employee khác
4. Password mặc định nên được thay đổi ngay sau lần đăng nhập đầu tiên

