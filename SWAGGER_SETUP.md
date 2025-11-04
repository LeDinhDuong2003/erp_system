# Hướng dẫn cài đặt và sử dụng Swagger

## Cài đặt

Swagger đã được cấu hình trong dự án. Để sử dụng, bạn cần cài đặt các packages:

```bash
npm install --save @nestjs/swagger swagger-ui-express
```

**Lưu ý:** Nếu gặp lỗi về Node version, hãy nâng cấp Node.js lên phiên bản >= 18.

## Truy cập Swagger UI

Sau khi cài đặt và khởi động ứng dụng, truy cập:

- **Swagger UI:** http://localhost:3000/api
- **API Documentation JSON:** http://localhost:3000/api-json

## Cấu hình

Swagger đã được cấu hình trong `src/main.ts` với:

- **Title:** ERP System API
- **Version:** 1.0
- **Bearer Auth:** JWT authentication
- **Tags:** auth, employees, roles, permissions, projects

## Sử dụng Swagger Decorators

### Ví dụ trong Controller

```typescript
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @Post('login')
  async login() {
    // ...
  }
}
```

### Ví dụ trong DTO

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Username', example: 'admin' })
  username!: string;
}
```

## Thêm Swagger cho các Controllers khác

Để thêm Swagger documentation cho các controllers khác:

1. Thêm `@ApiTags('tag-name')` vào controller
2. Thêm `@ApiOperation()` cho mỗi endpoint
3. Thêm `@ApiResponse()` cho các response codes
4. Thêm `@ApiBearerAuth('JWT-auth')` cho các endpoints cần authentication
5. Thêm `@ApiProperty()` vào DTOs

## Thử nghiệm API trong Swagger UI

1. Mở http://localhost:3000/api
2. Click vào endpoint bạn muốn test
3. Click "Try it out"
4. Điền thông tin cần thiết
5. Click "Execute"
6. Xem kết quả

## Authentication

Để test các endpoints yêu cầu authentication:

1. Đăng nhập qua `/auth/login` để lấy `access_token`
2. Click nút "Authorize" ở đầu trang Swagger
3. Nhập token theo format: `Bearer <your-token>`
4. Click "Authorize"
5. Bây giờ bạn có thể test các endpoints được bảo vệ

## Lưu ý

- Swagger sẽ tự động lấy thông tin từ DTOs và validation decorators
- Sử dụng `@ApiProperty()` để mô tả chi tiết các fields
- Sử dụng `@ApiBearerAuth()` để bảo vệ endpoints
- `persistAuthorization: true` giúp giữ token khi refresh page

