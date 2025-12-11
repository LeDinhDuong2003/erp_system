import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import type { Job } from 'bull';
import { SalaryCalculationService } from './salary-calculation.service';

export const SALARY_CALCULATION_QUEUE = 'salary-calculation-queue';

export interface SalaryCalculationJob {
  type: 'single' | 'all';
  employeeId?: number;
  year: number;
  month: number;
}

@Processor(SALARY_CALCULATION_QUEUE)
export class SalaryCalculationProcessor {
  private readonly logger = new Logger(SalaryCalculationProcessor.name);

  constructor(
    @Inject(forwardRef(() => SalaryCalculationService))
    private readonly salaryCalculationService: SalaryCalculationService,
  ) {}

  @Process('calculate-single-salary')
  async handleSingleSalary(job: Job<SalaryCalculationJob>) {
    this.logger.log(`Processing single salary calculation job ${job.id} for employee ${job.data.employeeId}`);
    
    try {
      if (!job.data.employeeId) {
        throw new Error('Employee ID is required for single salary calculation');
      }

      const salary = await this.salaryCalculationService.calculateSalary(
        job.data.employeeId,
        job.data.year,
        job.data.month,
      );
      
      return { 
        success: true, 
        employeeId: job.data.employeeId,
        year: job.data.year,
        month: job.data.month,
        salaryId: salary.id,
      };
    } catch (error: any) {
      this.logger.error(`Failed to calculate salary in job ${job.id}:`, error);
      throw error; // Bull will retry based on configuration
    }
  }

  @Process('calculate-all-salaries')
  async handleAllSalaries(job: Job<SalaryCalculationJob>) {
    this.logger.log(`Processing all salaries calculation job ${job.id} for ${job.data.year}/${job.data.month}`);
    
    try {
      const salaries = await this.salaryCalculationService.calculateAllEmployees(
        job.data.year,
        job.data.month,
      );
      
      return { 
        success: true, 
        year: job.data.year,
        month: job.data.month,
        count: salaries.length,
      };
    } catch (error: any) {
      this.logger.error(`Failed to calculate all salaries in job ${job.id}:`, error);
      throw error;
    }
  }

  @OnQueueActive()
  onActive(job: Job<SalaryCalculationJob>) {
    if (job.data.type === 'single') {
      this.logger.debug(`Processing job ${job.id} for employee ${job.data.employeeId}`);
    } else {
      this.logger.debug(`Processing job ${job.id} for all employees (${job.data.year}/${job.data.month})`);
    }
  }

  @OnQueueCompleted()
  onCompleted(job: Job<SalaryCalculationJob>, result: any) {
    this.logger.log(`Job ${job.id} completed successfully`);
    this.logger.debug(`Result:`, result);
  }

  @OnQueueFailed()
  onFailed(job: Job<SalaryCalculationJob>, error: Error) {
    this.logger.error(`Job ${job.id} failed with error: ${error.message}`);
    this.logger.error(`Job data:`, job.data);
    
    // Log failed attempts
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      this.logger.error(`Job ${job.id} failed after ${job.attemptsMade} attempts. Giving up.`);
    } else {
      this.logger.warn(`Job ${job.id} will be retried. Attempt ${job.attemptsMade} of ${job.opts.attempts || 3}`);
    }
  }
}

