import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SalaryCalculationService } from '../salary-calculation/salary-calculation.service';

/**
 * Script tính lương cho tháng TRƯỚC
 * Luôn tính lương tháng trước khi chạy (dành cho đầu tháng mới)
 * Usage: npm run calculate-current-month
 */
async function calculateCurrentMonth() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const salaryService = app.get(SalaryCalculationService);

  try {
    // Tính toán năm và tháng hiện tại
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1; // 1-12

    // Luôn tính lương cho tháng trước (khi chạy vào tháng mới)
    if (month === 1) {
      month = 12;
      year -= 1;
    } else {
      month -= 1;
    }

    console.log(`\n📊 Calculating salary for previous month: ${year}/${month}\n`);

    const results = await salaryService.calculateAllEmployees(year, month);

    console.log(`\n✅ Successfully calculated salary for ${results.length} employees\n`);

    // Hiển thị tóm tắt
    let totalSalary = 0;
    let approvedCount = 0;
    let pendingCount = 0;

    results.forEach((salary) => {
      totalSalary += salary.total_salary || 0;
      if (salary.status === 'APPROVED') approvedCount++;
      if (salary.status === 'PENDING') pendingCount++;
    });

    console.log('📈 Summary:');
    console.log(`   Total Employees: ${results.length}`);
    console.log(`   Pending: ${pendingCount}`);
    console.log(`   Approved: ${approvedCount}`);
    console.log(`   Total Salary Amount: ${totalSalary.toLocaleString('vi-VN')} VND\n`);

  } catch (error: any) {
    console.error('❌ Error calculating salaries:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    // Force close app and exit immediately to prevent hanging on Redis/Bull queue cleanup
    console.log('🛑 Closing application...');
    app.close().catch(() => {
      // Ignore close errors
    }).finally(() => {
      console.log('✅ Application closed successfully');
      process.exit(0);
    });

    // Force exit after 3 seconds if still hanging
    setTimeout(() => {
      console.warn('⚠️  Force exiting due to timeout...');
      process.exit(0);
    }, 3000);
  }
}

calculateCurrentMonth();
