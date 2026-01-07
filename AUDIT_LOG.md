# Audit Log System

## Tổng quan

Hệ thống audit log tự động ghi lại tất cả các API calls trong backend để theo dõi hoạt động của người dùng.

## Tính năng

- ✅ **Ghi log ngay khi request đến** (trước cả guards)
- ✅ Tự động ghi log cho **tất cả action ngoại trừ GET** (POST, PUT, DELETE, PATCH)
- ✅ Lưu thông tin: user, action, resource, IP, user agent, metadata
- ✅ Xử lý bất đồng bộ (không làm chậm request)
- ✅ Tự động loại bỏ thông tin nhạy cảm (password, token, etc.)
- ✅ Ghi log cả thành công và lỗi (bao gồm unauthorized access)
- ✅ Tính thời gian xử lý request
- ✅ Theo dõi cả failed authentication/authorization attempts

## Cấu trúc

### Files đã tạo:

1. **`src/common/services/audit-log.service.ts`**
   - Service để lưu audit log vào database
   - Có method `log()` và `logAsync()` (bất đồng bộ)

2. **`src/common/interceptors/audit-log.interceptor.ts`**
   - Interceptor tự động ghi log cho mọi request
   - Trích xuất thông tin từ request (user, IP, URL, params, body)
   - Sanitize dữ liệu nhạy cảm
   - Ghi log cả success và error

3. **`src/common/audit-log.module.ts`**
   - Module đăng ký service và interceptor
   - Sử dụng `APP_INTERCEPTOR` để tự động áp dụng cho tất cả routes

## Dữ liệu được ghi log

Mỗi audit log chứa:

- **employee_id**: ID của user thực hiện action (từ JWT token)
- **action**: Method + URL (ví dụ: `POST /employees`)
- **resource_type**: Loại resource (ví dụ: `employees`, `hr-requests`)
- **resource_id**: ID của resource (nếu có, ví dụ: `123`)
- **ip**: IP address của client (xử lý proxy/load balancer)
- **user_agent**: User agent string
- **metadata**: JSON chứa:
  - Method, URL, query params, route params
  - Request body (đã sanitize)
  - Response status code
  - Thời gian xử lý (ms)
  - Success/error flag
  - Error message (nếu có lỗi)
- **created_at**: Timestamp tự động

## Ví dụ Audit Log

```json
{
  "id": 1,
  "employee_id": 5,
  "action": "POST /employees",
  "resource_type": "employees",
  "resource_id": null,
  "ip": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "metadata": {
    "method": "POST",
    "url": "/employees",
    "query": {},
    "params": {},
    "body": {
      "full_name": "Nguyễn Văn A",
      "email": "nguyenvana@example.com",
      "password": "***REDACTED***"
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "response_status": 201,
    "duration_ms": 45,
    "success": true
  },
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

## Cách hoạt động

### **Luồng xử lý audit log:**

1. **Request đến** → `AuditLogMiddleware` ghi log ngay lập tức (trước guards)
2. **Guards validation** → JWT Auth, Roles Guard, etc.
3. **Business logic** → Controller xử lý request
4. **Response/Error** → `AuditLogInterceptor` cập nhật log với kết quả cuối cùng

### **Chi tiết:**

#### **Phase 1 - Middleware (Ngay khi request đến):**
- ✅ Ghi log tất cả non-GET requests
- ✅ Chưa biết user authentication status
- ✅ Metadata: `guards_pending: true`

#### **Phase 2 - Interceptor (Sau khi xử lý xong):**
- ✅ Cập nhật log với kết quả cuối cùng
- ✅ Status code, duration, success/error
- ✅ Metadata: `guards_passed: true/false`

**Lưu ý**: Các request GET (như xem danh sách, chi tiết) sẽ không được ghi audit log để tránh spam log.

## Lưu ý

- **Không block request**: Log được ghi bất đồng bộ, không làm chậm response
- **Tự động sanitize**: Password, token, và các field nhạy cảm được thay bằng `***REDACTED***`
- **Xử lý lỗi**: Nếu ghi log thất bại, không làm crash ứng dụng (chỉ log ra console)
- **IP address**: Tự động xử lý proxy/load balancer (x-forwarded-for, x-real-ip)

## Tắt audit log cho một số routes

Nếu muốn tắt audit log cho một số routes cụ thể, có thể:

1. Tạo decorator `@SkipAuditLog()` 
2. Sử dụng trong controller:

```typescript
@SkipAuditLog()
@Get('health')
healthCheck() {
  return { status: 'ok' };
}
```

3. Cập nhật interceptor để check decorator này

## Xem audit logs

Để xem audit logs, có thể:

1. Query trực tiếp database:
```sql
SELECT * FROM audit_logs 
WHERE employee_id = 5 
ORDER BY created_at DESC 
LIMIT 100;
```

2. Hoặc tạo API endpoint để xem logs (cần tạo controller/service riêng)

## Cấu hình

Audit log được bật tự động khi:
- `AuditLogModule` được import trong `AppModule`
- Interceptor được đăng ký qua `APP_INTERCEPTOR`

Không cần cấu hình thêm gì, hoạt động out-of-the-box!

