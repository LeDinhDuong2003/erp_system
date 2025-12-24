import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SalaryCalculationService } from '../salary-calculation/salary-calculation.service';

/**
 * Script tính lương cho 1 nhân viên
 * Usage: npm run calculate-salary <employeeId> <year> <month>
 * Example: npm run calculate-salary 1 2024 12
 */
async function calculateSalary() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const salaryService = app.get(SalaryCalculationService);

  const employeeId = parseInt(process.argv[2]);
  const year = parseInt(process.argv[3]);
  const month = parseInt(process.argv[4]);

  if (!employeeId || !year || !month) {
    console.error('❌ Usage: npm run calculate-salary <employeeId> <year> <month>');
    console.error('   Example: npm run calculate-salary 1 2024 12');
    process.exit(1);
  }

  if (month < 1 || month > 12) {
    console.error('❌ Month must be between 1 and 12');
    process.exit(1);
  }

  try {
    console.log(`\n📊 Calculating salary for employee ${employeeId}, ${year}/${month}...\n`);
    
    const result = await salaryService.calculateSalary(employeeId, year, month);
    
    console.log('✅ Salary calculated successfully!\n');
    console.log('📋 Salary Details:');
    console.log(`   Employee ID: ${result.employee_id}`);
    console.log(`   Month: ${year}/${month}`);
    console.log(`   Base Salary: ${result.base_salary?.toLocaleString('vi-VN')} VND`);
    console.log(`   Work Days: ${result.work_days}`);
    console.log(`   Work Hours: ${result.work_hours}`);
    console.log(`   Overtime Hours: ${result.overtime_hours || 0}`);
    console.log(`   Overtime Salary: ${result.overtime_salary?.toLocaleString('vi-VN')} VND`);
    console.log(`   Allowance: ${result.allowance?.toLocaleString('vi-VN')} VND`);
    console.log(`   Insurance: ${result.insurance?.toLocaleString('vi-VN')} VND`);
    console.log(`   Deduction: ${result.deduction?.toLocaleString('vi-VN')} VND`);
    console.log(`   Total Salary: ${result.total_salary?.toLocaleString('vi-VN')} VND`);
    console.log(`   Status: ${result.status}\n`);
  } catch (error: any) {
    console.error('❌ Error calculating salary:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await app.close();
  }
}

calculateSalary();

