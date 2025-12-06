import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnnualLeaveLimit1765000000000 implements MigrationInterface {
  name = 'AddAnnualLeaveLimit1765000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employee" 
      ADD COLUMN IF NOT EXISTS "annual_leave_limit" integer DEFAULT 12
    `);
    
    await queryRunner.query(`
      COMMENT ON COLUMN "employee"."annual_leave_limit" IS 'Annual leave limit in days per year'
    `);

    await queryRunner.query(`
      ALTER TABLE "employee" 
      ADD COLUMN IF NOT EXISTS "remaining_leave_days" integer DEFAULT 12
    `);
    
    await queryRunner.query(`
      COMMENT ON COLUMN "employee"."remaining_leave_days" IS 'Remaining annual leave days for current year'
    `);

    // Set remaining_leave_days = annual_leave_limit for existing employees
    await queryRunner.query(`
      UPDATE "employee" 
      SET "remaining_leave_days" = "annual_leave_limit" 
      WHERE "remaining_leave_days" IS NULL OR "remaining_leave_days" = 12
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employee" 
      DROP COLUMN IF EXISTS "remaining_leave_days"
    `);

    await queryRunner.query(`
      ALTER TABLE "employee" 
      DROP COLUMN IF EXISTS "annual_leave_limit"
    `);
  }
}

