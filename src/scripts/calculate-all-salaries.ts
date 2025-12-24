import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SalaryCalculationService } from '../salary-calculation/salary-calculation.service';

/**
 * Script tính lương cho TẤT CẢ nhân viên
 * Usage: npm run calculate-all-salaries <year> <month>
 * Example: npm run calculate-all-salaries 2024 12
 */
async function calculateAllSalaries() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const salaryService = app.get(SalaryCalculationService);

  const year = parseInt(process.argv[2]);
  const month = parseInt(process.argv[3]);

  if (!year || !month) {
    console.error('❌ Usage: npm run calculate-all-salaries <year> <month>');
    console.error('   Example: npm run calculate-all-salaries 2024 12');
    process.exit(1);
  }

  if (month < 1 || month > 12) {
    console.error('❌ Month must be between 1 and 12');
    process.exit(1);
  }

  try {
    console.log(`\n📊 Calculating salary for ALL employees, ${year}/${month}...\n`);
    
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
    
    // Hiển thị top 5 lương cao nhất
    const topSalaries = results
      .sort((a, b) => (b.total_salary || 0) - (a.total_salary || 0))
      .slice(0, 5);
    
    if (topSalaries.length > 0) {
      console.log('🏆 Top 5 Highest Salaries:');
      topSalaries.forEach((salary, index) => {
        console.log(`   ${index + 1}. Employee ${salary.employee_id}: ${salary.total_salary?.toLocaleString('vi-VN')} VND`);
      });
      console.log('');
    }
  } catch (error: any) {
    console.error('❌ Error calculating salaries:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await app.close();
  }
}

calculateAllSalaries();

