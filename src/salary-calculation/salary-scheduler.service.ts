import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SalaryCalculationService } from './salary-calculation.service';

@Injectable()
export class SalarySchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SalarySchedulerService.name);
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(private readonly salaryCalculationService: SalaryCalculationService) {}

  onModuleInit() {
    // Check every hour if it's the last day of the month
    this.checkInterval = setInterval(() => {
      this.checkAndCalculateSalary();
    }, 60 * 60 * 1000); // Check every hour

    // Also check immediately on startup
    this.checkAndCalculateSalary();
  }

  private async checkAndCalculateSalary() {
    try {
      const now = new Date();
      const today = now.getDate();
      const currentMonth = now.getMonth() + 1; // 1-12
      const currentYear = now.getFullYear();

      // Get last day of current month
      const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();

      // Check if today is the last day of the month and it's after 23:00 (11 PM)
      // This ensures we calculate salary at the end of the last day
      // Calculate for the current month that's ending
      if (today === lastDayOfMonth && now.getHours() >= 23) {
        this.logger.log(
          `Last day of month detected. Calculating salary for ${currentMonth}/${currentYear}`,
        );

        try {
          const result = await this.salaryCalculationService.calculateAllEmployees(
            currentYear,
            currentMonth,
          );

          this.logger.log(
            `Successfully calculated salary for ${result.length} employees for ${currentMonth}/${currentYear}`,
          );
        } catch (error: any) {
          this.logger.error(
            `Failed to calculate salary for ${currentMonth}/${currentYear}: ${error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error in salary scheduler:', error);
    }
  }

  onModuleDestroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

