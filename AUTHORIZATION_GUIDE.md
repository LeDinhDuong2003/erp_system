# Hướng dẫn Phân quyền (Authorization System)

## Tổng quan

Hệ thống sử dụng **RBAC (Role-Based Access Control)** - Phân quyền dựa trên vai trò với 2 tầng:
1. **Authentication (Xác thực)** - Xác định "Bạn là ai?"
2. **Authorization (Phân quyền)** - Xác định "Bạn được phép làm gì?"

## Kiến trúc Phân quyền

```
┌─────────────────┐
│   Employee      │
└────────┬────────┘
         │
         │ Many-to-Many
         ▼
┌─────────────────┐
│   EmployeeRole  │ (Junction Table)
└────────┬────────┘
         │
         │ Many-to-Many
         ▼
┌─────────────────┐
│      Role       │
└────────┬────────┘
         │
         │ Many-to-Many
         ▼
┌─────────────────┐
│  RolePermission │ (Junction Table)
└────────┬────────┘
         │
         │ Many-to-Many
         ▼
┌─────────────────┐
│   Permission   │
└─────────────────┘
```

### Cấu trúc Database

- **Employee** ↔ **Role**: Một nhân viên có thể có nhiều roles
- **Role** ↔ **Permission**: Một role có thể có nhiều permissions
- **Employee** có thể có nhiều **Roles**, mỗi **Role** có nhiều **Permissions**

## Các Thành phần Chính

### 1. Guards (Bảo vệ)

Guards là các lớp kiểm tra xác thực và phân quyền trước khi cho phép truy cập vào endpoint.

#### a) JwtAuthGuard
- **Mục đích**: Xác thực JWT token
- **Chức năng**: 
  - Extract JWT token từ header `Authorization: Bearer <token>`
  - Verify token signature và expiration
  - Load thông tin employee từ database
  - Gán user object vào `request.user`

```typescript
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@Request() req: any) {
  return req.user; // user đã được load từ JWT
}
```

#### b) RolesGuard
- **Mục đích**: Kiểm tra quyền truy cập dựa trên roles
- **Chức năng**:
  - Đọc required roles từ decorator `@Roles()`
  - So sánh với roles của user
  - Nếu không có quyền → throw `ForbiddenException`

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Post()
create() { ... }
```

### 2. Decorators (Trình trang trí)

#### @Roles() Decorator
- **Vị trí**: `src/auth/decorators/roles.decorator.ts`
- **Chức năng**: Đánh dấu endpoint cần quyền đặc biệt
- **Cú pháp**: `@Roles('ROLE_CODE')` hoặc `@Roles('ROLE1', 'ROLE2')`

```typescript
@Roles('SUPER_ADMIN')           // Chỉ SUPER_ADMIN
@Roles('ADMIN', 'MANAGER')      // ADMIN HOẶC MANAGER
```

### 3. JWT Strategy

File: `src/auth/strategies/jwt.strategy.ts`

**Luồng hoạt động:**

1. Extract JWT token từ request header
2. Decode và verify token
3. Lấy `payload.sub` (employee ID)
4. Query database để lấy employee và roles
5. Return user object với roles:

```typescript
return {
  userId: employee.id.toString(),
  username: employee.username,
  email: employee.email,
  roles: [
    {
      id: "1",
      code: "SUPER_ADMIN",
      name: "Super Administrator",
      description: "..."
    }
  ]
}
```

## Luồng Xác thực và Phân quyền

### Bước 1: Đăng nhập (Authentication)

```
Client → POST /auth/login
  ↓
LocalAuthGuard
  ↓
LocalStrategy.validate()
  ↓
AuthService.validateUser()
  ↓
Kiểm tra username/password
  ↓
AuthService.login()
  ↓
Tạo JWT token với payload: { sub: employeeId, username, email }
  ↓
Response: { access_token, refresh_token }
```

### Bước 2: Gọi API với Token (Authorization)

```
Client → GET /employees
  Header: Authorization: Bearer <access_token>
    ↓
JwtAuthGuard
    ↓
JwtStrategy.validate()
    ↓
Load employee + roles từ database
    ↓
Gán vào request.user
    ↓
RolesGuard (nếu có)
    ↓
Đọc @Roles() decorator
    ↓
So sánh user.roles với requiredRoles
    ↓
✅ Có quyền → Cho phép truy cập
❌ Không có quyền → 403 Forbidden
```

## Ví dụ Cụ thể

### Ví dụ 1: Endpoint chỉ cần Authentication

```typescript
@Controller('employees')
@UseGuards(JwtAuthGuard)  // Chỉ cần đăng nhập
export class EmployeeController {
  
  @Get()  // Tất cả user đã đăng nhập đều xem được
  findAll() {
    return this.employeeService.findAll();
  }
}
```

**Kết quả:**
- ✅ User có bất kỳ role nào đều có thể truy cập
- ❌ User chưa đăng nhập → 401 Unauthorized

### Ví dụ 2: Endpoint cần SUPER_ADMIN

```typescript
@Post()
@UseGuards(JwtAuthGuard, RolesGuard)  // Cần đăng nhập + kiểm tra role
@Roles('SUPER_ADMIN')                  // Chỉ SUPER_ADMIN
create(@Body() createEmployeeDto: CreateEmployeeDto) {
  return this.employeeService.create(createEmployeeDto);
}
```

**Luồng kiểm tra:**

1. **JwtAuthGuard** chạy trước:
   - ✅ Token hợp lệ → Load user với roles
   - ❌ Token không hợp lệ → 401 Unauthorized

2. **RolesGuard** chạy sau:
   - Đọc `@Roles('SUPER_ADMIN')`
   - Kiểm tra `user.roles` có chứa role code `'SUPER_ADMIN'` không
   - ✅ Có → Cho phép
   - ❌ Không → 403 Forbidden

**Kết quả:**
- ✅ User có role `SUPER_ADMIN` → Có thể tạo employee
- ❌ User có role `EMPLOYEE` → 403 Forbidden: "Access denied. Required role: SUPER_ADMIN"
- ❌ User chưa đăng nhập → 401 Unauthorized

### Ví dụ 3: Endpoint chấp nhận nhiều roles

```typescript
@Patch(':id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'MANAGER')  // SUPER_ADMIN HOẶC MANAGER
update(@Param('id') id: string) {
  return this.employeeService.update(id);
}
```

**Kết quả:**
- ✅ User có role `SUPER_ADMIN` → Có quyền
- ✅ User có role `MANAGER` → Có quyền
- ❌ User chỉ có role `EMPLOYEE` → 403 Forbidden

## Các Roles Mặc định

1. **SUPER_ADMIN**
   - Quyền cao nhất
   - Có thể: Tạo employee, quản lý roles/permissions
   - Tự động tạo khi app khởi động

2. **ADMIN** (có thể tạo thêm)
   - Quyền quản trị
   - Có thể được cấu hình permissions tùy chỉnh

3. **MANAGER** (có thể tạo thêm)
   - Quản lý
   - Có thể được cấu hình permissions tùy chỉnh

4. **EMPLOYEE** (có thể tạo thêm)
   - Nhân viên thường
   - Có thể được cấu hình permissions tùy chỉnh

5. **VIEWER** (có thể tạo thêm)
   - Chỉ xem
   - Có thể được cấu hình permissions tùy chỉnh

## Permissions System

Mặc dù hệ thống có bảng `permissions` và `role_permissions`, hiện tại:
- ✅ **Roles** được sử dụng trong `@Roles()` decorator
- ⚠️ **Permissions** chưa được sử dụng trực tiếp trong guards

**Lưu ý:** Có thể mở rộng để sử dụng permissions bằng cách:
1. Tạo `PermissionsGuard` tương tự `RolesGuard`
2. Tạo `@Permissions()` decorator
3. Kiểm tra permissions trong guard

## Quy trình Thiết lập Phân quyền

### Bước 1: Tạo Permissions

```bash
POST /permissions
Authorization: Bearer <super_admin_token>

{
  "code": "employee.create",
  "name": "Create Employee",
  "description": "Permission to create new employees"
}
```

### Bước 2: Tạo Roles

```bash
POST /roles
Authorization: Bearer <super_admin_token>

{
  "code": "MANAGER",
  "name": "Manager",
  "description": "Manager role"
}
```

### Bước 3: Gán Permissions cho Role

```bash
POST /roles/{role_id}/permissions
Authorization: Bearer <super_admin_token>

{
  "permission_ids": ["1", "2", "3"]
}
```

### Bước 4: Gán Roles cho Employee

```bash
POST /employees/{employee_id}/roles
Authorization: Bearer <super_admin_token>

{
  "role_ids": ["1", "2"]
}
```

## Bảng Tóm tắt Quyền Truy cập

| Endpoint | Method | Authentication | Required Role |
|----------|--------|----------------|--------------|
| `/auth/login` | POST | ❌ | - |
| `/auth/profile` | GET | ✅ | - |
| `/auth/refresh` | POST | ✅ (Refresh Token) | - |
| `/auth/logout` | DELETE | ✅ (Refresh Token) | - |
| `/employees` | GET | ✅ | - |
| `/employees` | POST | ✅ | SUPER_ADMIN |
| `/employees/:id` | GET | ✅ | - |
| `/employees/:id` | PATCH | ✅ | - |
| `/employees/:id` | DELETE | ✅ | - |
| `/employees/:id/roles` | POST | ✅ | SUPER_ADMIN |
| `/employees/:id/roles` | DELETE | ✅ | SUPER_ADMIN |
| `/roles` | GET | ✅ | - |
| `/roles` | POST | ✅ | SUPER_ADMIN |
| `/roles/:id` | PATCH | ✅ | SUPER_ADMIN |
| `/roles/:id` | DELETE | ✅ | SUPER_ADMIN |
| `/roles/:id/permissions` | POST | ✅ | SUPER_ADMIN |
| `/permissions` | POST | ✅ | SUPER_ADMIN |
| `/permissions/:id` | PATCH | ✅ | SUPER_ADMIN |
| `/permissions/:id` | DELETE | ✅ | SUPER_ADMIN |

## Xử lý Lỗi

### 401 Unauthorized
**Nguyên nhân:** Token không hợp lệ hoặc chưa đăng nhập

**Response:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
**Nguyên nhân:** Đã đăng nhập nhưng không có quyền

**Response:**
```json
{
  "statusCode": 403,
  "message": "Access denied. Required role: SUPER_ADMIN",
  "error": "Forbidden"
}
```

## Best Practices

1. **Luôn bảo vệ endpoint quan trọng:**
   ```typescript
   @UseGuards(JwtAuthGuard, RolesGuard)
   @Roles('SUPER_ADMIN')
   ```

2. **Sử dụng nhiều roles nếu cần:**
   ```typescript
   @Roles('ADMIN', 'MANAGER')  // OR logic
   ```

3. **Kiểm tra user trong controller nếu cần logic phức tạp:**
   ```typescript
   @Get(':id')
   findOne(@Param('id') id: string, @Request() req: any) {
     const userRoles = req.user.roles.map(r => r.code);
     // Custom logic dựa trên roles
   }
   ```

4. **Không expose quá nhiều thông tin trong error messages:**
   - Hiện tại: "Access denied. Required role: SUPER_ADMIN"
   - Có thể đổi thành: "Access denied" (bảo mật hơn)

## Mở rộng trong Tương lai

### 1. Permission-based Authorization
```typescript
@Permissions('employee.create', 'employee.update')
@Post()
create() { ... }
```

### 2. Resource-based Authorization
```typescript
// Chỉ owner hoặc admin mới sửa được
@Patch(':id')
update(@Param('id') id: string, @Request() req: any) {
  const isOwner = req.user.userId === id;
  const isAdmin = req.user.roles.some(r => r.code === 'ADMIN');
  if (!isOwner && !isAdmin) {
    throw new ForbiddenException();
  }
  // ...
}
```

### 3. Dynamic Permissions
- Load permissions từ database
- Cache để tăng hiệu suất
- Kiểm tra permissions thay vì chỉ roles

## Debugging

### Kiểm tra user object trong request:

```typescript
@Get('debug')
@UseGuards(JwtAuthGuard)
debug(@Request() req: any) {
  return {
    user: req.user,
    roles: req.user.roles,
    roleCodes: req.user.roles.map(r => r.code)
  };
}
```

### Log trong RolesGuard:

Thêm logging để debug:
```typescript
console.log('Required roles:', requiredRoles);
console.log('User roles:', userRoles);
console.log('Has role:', hasRole);
```

