# Hướng dẫn Seed Dữ liệu HR

## Mô tả
Script seed sẽ tạo dữ liệu mẫu cho các chức năng quản lý nhân viên, chấm công, và lương.

## Dữ liệu được tạo

### 1. Phòng ban (6 phòng ban)
- Phòng Kỹ thuật
- Phòng Kinh doanh
- Phòng Nhân sự
- Phòng Kế toán
- Phòng Marketing
- Phòng Hành chính

### 2. Vị trí (12 vị trí)
- Giám đốc, Phó giám đốc, Trưởng phòng, Phó phòng
- Nhân viên, Thực tập sinh
- Senior Developer, Developer, Junior Developer
- Chuyên viên Kinh doanh, Chuyên viên Nhân sự, Kế toán viên

### 3. Nhân viên (8 nhân viên)
- NV001 - Nguyễn Văn A (Senior Developer) - Lương: 15,000,000 VNĐ
- NV002 - Trần Thị B (Chuyên viên Kinh doanh) - Lương: 12,000,000 VNĐ
- NV003 - Lê Văn C (Chuyên viên Nhân sự) - Lương: 13,000,000 VNĐ
- NV004 - Phạm Thị D (Kế toán viên) - Lương: 11,000,000 VNĐ
- NV005 - Hoàng Văn E (Developer) - Lương: 10,000,000 VNĐ
- NV006 - Vương Thị F (Nhân viên Marketing) - Lương: 9,000,000 VNĐ
- NV007 - Đặng Văn G (Phó phòng) - Lương: 18,000,000 VNĐ
- NV008 - Bùi Thị H (Junior Developer) - Lương: 8,000,000 VNĐ

**Mật khẩu mặc định cho tất cả nhân viên: `123456`**

### 4. Work Schedule Settings
- Giờ check-in: 08:00
- Giờ check-out: 17:00
- Ngày làm việc: Thứ 2 - Thứ 6
- Số giờ làm việc/ngày: 8 giờ
- Thời gian cho phép đi muộn: 15 phút
- Thời gian cho phép về sớm: 15 phút

### 5. Chấm công
- Tháng 10/2024: Dữ liệu chấm công cho tất cả ngày làm việc
- Tháng 11/2024: Dữ liệu chấm công cho tất cả ngày làm việc
- Mỗi ngày có check-in và check-out với thời gian ngẫu nhiên
- Tự động tính late minutes và early leave minutes

### 6. Bảng lương
- Tháng 10/2024: Bảng lương cho tất cả nhân viên
- Tháng 11/2024: Bảng lương cho tất cả nhân viên
- Tính toán dựa trên:
  - Số ngày làm việc thực tế
  - Số giờ OT (ngẫu nhiên 0-20 giờ)
  - Phụ cấp
  - Bảo hiểm (10.5% lương cơ bản)

## Cách chạy

### Bước 1: Kiểm tra DATABASE_URL
Đảm bảo file `.env` có DATABASE_URL đúng format:
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

**Lưu ý:** Nếu password có ký tự đặc biệt, cần URL-encode:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `=` → `%3D`

### Bước 2: Chạy seed
```bash
cd /Users/ledinhduong/do_an_tot_nghiep/erp_system
npm run seed
```

### Bước 3: Kiểm tra kết quả
Sau khi chạy thành công, bạn sẽ thấy:
- ✓ Seeded X departments
- ✓ Seeded X positions
- ✓ Seeded X roles
- ✓ Seeded work schedule settings
- ✓ Seeded X employees
- ✓ Seeded attendance records for October and November
- ✓ Seeded salary records for October and November
- ✅ All seeding completed successfully!

## Lưu ý
- Script sẽ bỏ qua dữ liệu đã tồn tại (không tạo duplicate)
- Có thể chạy lại script nhiều lần mà không lo trùng lặp
- Tất cả nhân viên đã được verify email (is_verified = true)

## Xử lý lỗi

### Lỗi: "client password must be a string"
**Nguyên nhân:** DATABASE_URL không đúng format hoặc password chưa được URL-encode

**Giải pháp:**
1. Kiểm tra file `.env` có DATABASE_URL
2. Đảm bảo password được URL-encode nếu có ký tự đặc biệt
3. Thử format khác:
   ```
   DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
   ```

### Lỗi: "Unable to connect to the database"
**Nguyên nhân:** Database chưa chạy hoặc thông tin kết nối sai

**Giải pháp:**
1. Kiểm tra PostgreSQL đã chạy chưa: `pg_isready`
2. Kiểm tra username, password, host, port, database name
3. Thử kết nối bằng psql: `psql $DATABASE_URL`

