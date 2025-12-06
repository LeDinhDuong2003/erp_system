# 📧 Hướng dẫn cấu hình Email SMTP

Hệ thống sử dụng SMTP để gửi email xác thực tài khoản. Bạn có thể cấu hình với Gmail, Outlook, hoặc bất kỳ SMTP server nào khác.

## 🚀 Cấu hình nhanh

### Bước 1: Thêm cấu hình vào file `.env`

Mở file `erp_system/.env` và thêm các dòng sau:

```env
# Email SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourcompany.com
FRONTEND_URL=http://localhost:3000
```

### Bước 2: Cài đặt nodemailer (nếu chưa có)

```bash
cd erp_system
npm install nodemailer @types/nodemailer
```

### Bước 3: Khởi động lại backend

```bash
npm run start:dev
```

## 📮 Cấu hình với Gmail

### Cách 1: Sử dụng App Password (Khuyến nghị)

1. **Bật 2-Step Verification:**
   - Vào [Google Account](https://myaccount.google.com/)
   - Chọn **Security** → **2-Step Verification**
   - Bật 2-Step Verification nếu chưa bật

2. **Tạo App Password:**
   - Vào [App Passwords](https://myaccount.google.com/apppasswords)
   - Chọn **App**: "Mail"
   - Chọn **Device**: "Other (Custom name)"
   - Nhập tên: "ERP System"
   - Click **Generate**
   - **Copy password 16 ký tự** (ví dụ: `abcd efgh ijkl mnop`)

3. **Cấu hình trong `.env`:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=abcdefghijklmnop  # Dán App Password (bỏ khoảng trắng)
   SMTP_FROM=your-email@gmail.com
   FRONTEND_URL=http://localhost:3000
   ```

### Cách 2: Sử dụng OAuth2 (Nâng cao)

Nếu muốn sử dụng OAuth2 thay vì App Password, xem [nodemailer OAuth2 guide](https://nodemailer.com/smtp/oauth2/).

## 📮 Cấu hình với Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM=your-email@outlook.com
FRONTEND_URL=http://localhost:3000
```

## 📮 Cấu hình với SMTP server khác

### Ví dụ: SendGrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=noreply@yourcompany.com
FRONTEND_URL=http://localhost:3000
```

### Ví dụ: Mailgun

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
SMTP_FROM=noreply@yourcompany.com
FRONTEND_URL=http://localhost:3000
```

## 🔍 Kiểm tra cấu hình

Sau khi cấu hình, khi tạo tài khoản mới, bạn sẽ thấy trong logs:

### ✅ Thành công:
```
[EmailService] ✅ Verification email sent successfully to user@example.com
```

### ❌ Lỗi:
```
[EmailService] ❌ Failed to send email via SMTP: Invalid login
[EmailService] ⚠️  Falling back to console logging. Please check SMTP configuration.
```

Nếu có lỗi, hệ thống sẽ tự động fallback về **console logging** và hiển thị verification URL trong logs.

## 🛠️ Troubleshooting

### Lỗi: "Invalid login"
- ✅ Kiểm tra `SMTP_USER` và `SMTP_PASS` có đúng không
- ✅ Với Gmail: Đảm bảo đã dùng **App Password**, không phải mật khẩu thường
- ✅ Kiểm tra 2-Step Verification đã bật chưa

### Lỗi: "Connection timeout"
- ✅ Kiểm tra `SMTP_HOST` và `SMTP_PORT` có đúng không
- ✅ Kiểm tra firewall có chặn port 587/465 không
- ✅ Thử đổi `SMTP_SECURE=true` và `SMTP_PORT=465`

### Lỗi: "nodemailer is not installed"
```bash
cd erp_system
npm install nodemailer @types/nodemailer
```

### Email không đến inbox?
- ✅ Kiểm tra **Spam/Junk folder**
- ✅ Kiểm tra logs xem có lỗi gì không
- ✅ Thử gửi email test với `SMTP_USER` khác

## 📝 Lưu ý

1. **Development Mode**: Nếu không cấu hình SMTP, hệ thống sẽ log verification URL ra console
2. **Production Mode**: Luôn cấu hình SMTP để gửi email thật
3. **Security**: Không commit file `.env` vào Git (đã có trong `.gitignore`)
4. **FRONTEND_URL**: Đảm bảo URL này đúng với domain của frontend để verification link hoạt động

## 🎯 Test Email

Sau khi cấu hình, test bằng cách:

1. Tạo tài khoản nhân viên mới qua API hoặc UI
2. Kiểm tra email inbox (và spam folder)
3. Click vào verification link
4. Đăng nhập với tài khoản vừa tạo

---

**Cần hỗ trợ?** Xem logs trong terminal chạy backend để debug.

