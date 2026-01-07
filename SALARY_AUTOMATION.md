# 🔄 Tự Động Hóa Tính Lương Cuối Tháng

## Tổng quan

Hệ thống ERP hỗ trợ tự động tính lương cho tất cả nhân viên vào cuối mỗi tháng. Có 2 cách chính:

1. **Cron Job** - Lên lịch chạy định kỳ (Khuyến nghị)
2. **Scheduler Service** - Chạy liên tục và tự động kiểm tra

## 🚀 1. Scheduler Service

### Cách chạy:
```bash
npm start
```

**SalarySchedulerService** đã được tích hợp sẵn trong ứng dụng chính. Khi bạn chạy server (`npm start`), service sẽ tự động:

- Kiểm tra mỗi giờ xem có phải cuối tháng chưa
- Tự động tính lương lúc 23:00 ngày cuối tháng
- Ghi log chi tiết vào console

## ⏰ 2. Cron Job (Khuyến nghị - Đơn giản nhất)

### Cài đặt cron job:
```bash
# Mở crontab
crontab -e

# Thêm dòng sau để chạy vào 00:00 ngày 1 hàng tháng (tính lương tháng trước)
0 0 1 * * cd /Users/ledinhduong/do_an_tot_nghiep/erp_system && npm run calculate-current-month >> /var/log/salary-calculator.log 2>&1
```

### Cron expressions phổ biến:
- `0 0 1 * *` - Chạy lúc 00:00 ngày 1 hàng tháng (tính lương tháng trước)
- `30 23 28-31 * *` - Chạy lúc 23:30 từ ngày 28-31 hàng tháng (cuối tháng)
- `0 6 1 * *` - Chạy lúc 6:00 ngày đầu tháng (sáng sớm)
- `*/30 * * * *` - Chạy mỗi 30 phút (cho test)

## 🖱️ 3. Manual Trigger

### Tính lương tháng hiện tại/cuối tháng:
```bash
npm run trigger-end-month-salary
```

### Tính lương tháng cụ thể:
```bash
# Tính lương tháng 12/2024
npm run trigger-end-month-salary 2024 12

# Tính lương tháng 1/2025
npm run trigger-end-month-salary 2025 1
```

### Logic tự động chọn tháng:
- Nếu chạy vào **đầu tháng (ngày 1-5)**: Tính lương tháng trước
- Nếu chạy vào **cuối tháng (ngày 6+)**: Tính lương tháng hiện tại

## 🔧 4. Windows Task Scheduler

### Tạo task:
1. Mở **Task Scheduler**
2. **Create Task** → General tab:
   - Name: `Salary Calculator`
   - Run whether user is logged on or not
3. **Triggers** tab:
   - New trigger → Monthly
   - Months: All months
   - Days: Last day of month
   - Time: 23:30:00
4. **Actions** tab:
   - New action → Start a program
   - Program: `cmd.exe`
   - Arguments: `/c cd /d "C:\path\to\project" && npm run trigger-end-month-salary`

## 📊 5. Monitoring & Logs

### Xem logs:
```bash
# Nếu dùng PM2
pm2 logs salary-calculator

# Nếu chạy trực tiếp với output redirection
tail -f /var/log/salary-calculator.log
```

### Kiểm tra status:
```bash
# Kiểm tra lương đã được tính chưa
npm run calculate-all-salaries 2024 12
```

### Debug:
```bash
# Kiểm tra attendance data
npm run debug:attendance

# Test tính lương cho 1 nhân viên
npm run calculate-salary 1 2024 12
```

## ⚠️ 6. Lưu ý quan trọng

### Trước khi chạy:
1. **Đảm bảo database** đang chạy
2. **Cấu hình environment** (`.env` file)
3. **Node.js version** >= 18
4. **Data đầy đủ**: Attendance, Salary Settings, HR Requests

### Kiểm tra sau khi chạy:
1. **Kiểm tra logs** xem có lỗi không
2. **Verify salary records** trong database
3. **Review total amounts** và status
4. **Approve salaries** nếu cần

### Best Practices:
- **Test trước** với data sample
- **Monitor logs** thường xuyên
- **Backup database** trước khi chạy production
- **Set up alerts** cho failures
- **Run in staging** trước khi production

## 🔄 7. Recovery Procedures

### Nếu scheduler bị crash:
```bash
# Restart service
npm run auto-calculate-salary

# Hoặc trigger manual
npm run trigger-end-month-salary
```

### Nếu lương tính sai:
```bash
# Tính lại cho tháng cụ thể
npm run calculate-all-salaries 2024 12

# Check attendance data
npm run debug:attendance
```

### Nếu cần rollback:
```sql
-- Trong database, update status về PENDING
UPDATE employee_salary
SET status = 'PENDING'
WHERE month = '2024-12-01' AND status = 'APPROVED';
```

---

## 📝 Scripts Summary

| Command | Description |
|---------|-------------|
| `npm run calculate-current-month` | Tính lương tháng hiện tại (tự động chọn tháng) |
| `npm run calculate-all-salaries 2024 12` | Tính lương tất cả nhân viên tháng 12/2024 |
| `npm run calculate-salary 1 2024 12` | Tính lương nhân viên ID=1 tháng 12/2024 |
| `npm start` | Chạy server (có tích hợp SalarySchedulerService) |
