# Các Công Nghệ Sử Dụng Trong Backend

## 1. Framework và Ngôn Ngữ Lập Trình

### 1.1. NestJS Framework
Hệ thống backend được xây dựng trên nền tảng **NestJS** (phiên bản 11.0.1), một framework Node.js tiên tiến được phát triển dựa trên TypeScript. NestJS được lựa chọn bởi các ưu điểm nổi bật: kiến trúc modular với hệ thống module rõ ràng, hỗ trợ Dependency Injection (DI) giúp quản lý dependencies hiệu quả, tích hợp sẵn các tính năng như validation, authentication, và API documentation. Framework này phù hợp với các dự án enterprise cần tính mở rộng cao và bảo trì dễ dàng.

### 1.2. TypeScript
Toàn bộ mã nguồn backend được viết bằng **TypeScript** (phiên bản 5.9.3), một superset của JavaScript với hệ thống kiểu tĩnh mạnh mẽ. TypeScript giúp phát hiện lỗi sớm trong quá trình phát triển, tăng tính ổn định và khả năng bảo trì của mã nguồn. Với các tính năng như type checking, interface, và decorator, TypeScript tạo điều kiện cho việc xây dựng các ứng dụng phức tạp với cấu trúc rõ ràng.

## 2. Cơ Sở Dữ Liệu và ORM

### 2.1. PostgreSQL
Hệ thống sử dụng **PostgreSQL** (phiên bản 12) làm hệ quản trị cơ sở dữ liệu quan hệ chính. PostgreSQL được chọn vì khả năng xử lý dữ liệu phức tạp, hỗ trợ đầy đủ các tính năng ACID, khả năng mở rộng tốt, và hiệu suất cao trong các tác vụ đọc/ghi dữ liệu. Database này phù hợp với các hệ thống ERP cần quản lý nhiều module như quản lý nhân sự, dự án, tài sản, và tính lương.

### 2.2. TypeORM
**TypeORM** (phiên bản 0.3.20) được sử dụng làm Object-Relational Mapping (ORM) framework, cung cấp lớp trừu tượng giữa ứng dụng và cơ sở dữ liệu. TypeORM hỗ trợ Active Record và Data Mapper patterns, cho phép định nghĩa entities bằng decorators, tự động tạo migrations, và quản lý quan hệ giữa các bảng một cách dễ dàng. Điều này giúp giảm thiểu việc viết SQL thủ công và tăng tính nhất quán trong việc truy cập dữ liệu.

## 3. Caching và Queue Management

### 3.1. Redis
**Redis** (phiên bản 7-alpine) được triển khai như một hệ thống caching và lưu trữ dữ liệu trong bộ nhớ (in-memory). Redis được sử dụng để lưu trữ các token xác thực OTP, session data, và cache các truy vấn thường xuyên để cải thiện hiệu suất hệ thống. Redis cũng đóng vai trò là backend cho hệ thống queue, giúp xử lý các tác vụ bất đồng bộ như gửi email, xử lý file upload.

### 3.2. Bull Queue
**Bull** (phiên bản 4.16.5) kết hợp với **@nestjs/bull** được sử dụng để quản lý job queue dựa trên Redis. Hệ thống queue này cho phép xử lý các tác vụ nặng như gửi email xác thực, xử lý file upload, và các công việc định kỳ (scheduled tasks) một cách bất đồng bộ, không làm chặn luồng xử lý chính của ứng dụng. Điều này đảm bảo trải nghiệm người dùng mượt mà ngay cả khi hệ thống đang xử lý các tác vụ phức tạp.

## 4. Xác Thực và Bảo Mật

### 4.1. JWT (JSON Web Token)
Hệ thống sử dụng **@nestjs/jwt** (phiên bản 11.0.1) để triển khai xác thực dựa trên JWT. JWT cho phép tạo access token và refresh token, đảm bảo tính bảo mật và khả năng mở rộng cho hệ thống xác thực. Access token có thời gian sống ngắn để giảm thiểu rủi ro bảo mật, trong khi refresh token cho phép người dùng gia hạn phiên đăng nhập mà không cần đăng nhập lại.

### 4.2. Passport
**Passport** (phiên bản 0.7.0) cùng với các strategy như **passport-jwt** và **passport-local** được tích hợp để cung cấp các phương thức xác thực linh hoạt. Passport cung cấp middleware authentication với các guard trong NestJS, cho phép bảo vệ các route và endpoint một cách dễ dàng. Hệ thống hỗ trợ xác thực bằng username/password và JWT token.

### 4.3. bcrypt
**bcrypt** (phiên bản 6.0.0) được sử dụng để mã hóa mật khẩu người dùng trước khi lưu trữ vào cơ sở dữ liệu. bcrypt là một thuật toán hashing mật khẩu an toàn với khả năng điều chỉnh độ khó (cost factor), đảm bảo rằng ngay cả khi dữ liệu bị rò rỉ, mật khẩu cũng không thể được khôi phục dễ dàng.

## 5. Lưu Trữ File và Cloud Services

### 5.1. AWS S3
Hệ thống tích hợp **AWS S3** (Amazon Simple Storage Service) thông qua **@aws-sdk/client-s3** (phiên bản 3.940.0) để lưu trữ các file như ảnh chấm công, avatar nhân viên, và các tài liệu khác. S3 cung cấp khả năng lưu trữ không giới hạn, độ bền cao, và khả năng mở rộng tự động. Hệ thống sử dụng pre-signed URLs để cho phép client upload file trực tiếp lên S3 mà không cần đi qua server, giảm tải cho backend và tăng hiệu suất.

## 6. Validation và Transformation

### 6.1. Class Validator và Class Transformer
**class-validator** (phiên bản 0.14.2) và **class-transformer** (phiên bản 0.5.1) được sử dụng để validate và transform dữ liệu đầu vào. Các decorator như `@IsEmail()`, `@IsNotEmpty()`, `@MinLength()` được áp dụng trên các DTO (Data Transfer Object) để đảm bảo tính hợp lệ của dữ liệu trước khi xử lý. ValidationPipe của NestJS tự động kiểm tra và trả về lỗi chi tiết nếu dữ liệu không hợp lệ, giúp tăng tính bảo mật và giảm lỗi runtime.

## 7. API Documentation

### 7.1. Swagger/OpenAPI
**@nestjs/swagger** (phiên bản 11.2.1) được tích hợp để tự động tạo tài liệu API theo chuẩn OpenAPI. Swagger UI cung cấp giao diện web trực quan để xem và test các API endpoint, giúp các nhà phát triển frontend và tester dễ dàng hiểu và sử dụng API. Tài liệu được cập nhật tự động dựa trên các decorator và DTO trong mã nguồn, đảm bảo tính chính xác và đồng bộ.

## 8. Email Service

### 8.1. Nodemailer
**Nodemailer** (phiên bản 7.0.11) được sử dụng để gửi email tự động trong hệ thống, bao gồm email xác thực OTP, thông báo về các sự kiện quan trọng, và các email liên quan đến quy trình làm việc. Nodemailer hỗ trợ nhiều phương thức gửi email như SMTP, Gmail API, và các dịch vụ email khác, cung cấp tính linh hoạt trong việc cấu hình và triển khai.

## 9. Scheduling và Background Jobs

### 9.1. @nestjs/schedule
**@nestjs/schedule** (phiên bản 6.1.0) được sử dụng để thực hiện các tác vụ định kỳ như tính lương tự động, cập nhật trạng thái dự án, và các công việc bảo trì hệ thống. Module này cung cấp decorators như `@Cron()` để định nghĩa các job chạy theo lịch, giúp tự động hóa các quy trình nghiệp vụ quan trọng.

## 10. Containerization và Deployment

### 10.1. Docker và Docker Compose
Hệ thống sử dụng **Docker** và **Docker Compose** để containerize các dịch vụ như PostgreSQL và Redis, đảm bảo môi trường phát triển và triển khai nhất quán. Docker Compose cho phép quản lý nhiều container cùng lúc, cấu hình network, volumes, và các biến môi trường một cách tập trung. Điều này giúp việc setup môi trường phát triển trở nên đơn giản và nhanh chóng.

## 11. Development Tools

### 11.1. ESLint và Prettier
**ESLint** (phiên bản 9.18.0) và **Prettier** (phiên bản 3.4.2) được cấu hình để đảm bảo code quality và code style nhất quán trong toàn bộ dự án. ESLint phát hiện các lỗi tiềm ẩn và thực thi các best practices, trong khi Prettier tự động format code theo chuẩn đã định nghĩa.

### 11.2. Jest
**Jest** (phiên bản 30.0.0) được sử dụng làm testing framework cho unit tests và integration tests. Jest cung cấp các tính năng như mocking, code coverage, và snapshot testing, giúp đảm bảo chất lượng mã nguồn và giảm thiểu lỗi trong quá trình phát triển.

## 12. Configuration Management

### 12.1. @nestjs/config
**@nestjs/config** (phiên bản 4.0.2) được sử dụng để quản lý các biến môi trường và cấu hình ứng dụng một cách tập trung. Module này hỗ trợ load cấu hình từ file `.env`, validate cấu hình, và cung cấp type-safe access đến các biến môi trường, giúp quản lý các môi trường khác nhau (development, staging, production) một cách dễ dàng.

## Kết Luận

Việc lựa chọn các công nghệ trên dựa trên các tiêu chí: tính ổn định, hiệu suất, khả năng mở rộng, cộng đồng hỗ trợ lớn, và phù hợp với yêu cầu của hệ thống ERP. Stack công nghệ này tạo nền tảng vững chắc cho việc phát triển và vận hành hệ thống một cách hiệu quả, đáp ứng các yêu cầu về hiệu suất, bảo mật, và khả năng bảo trì lâu dài.



