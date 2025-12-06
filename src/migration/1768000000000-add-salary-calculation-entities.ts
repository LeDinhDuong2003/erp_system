import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSalaryCalculationEntities1768000000000 implements MigrationInterface {
  name = 'AddSalaryCalculationEntities1768000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Work Schedule Settings
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "work_schedule_settings" (
        "id" SERIAL PRIMARY KEY,
        "standard_check_in_time" TIME NOT NULL,
        "standard_check_out_time" TIME NOT NULL,
        "monday" BOOLEAN DEFAULT true,
        "tuesday" BOOLEAN DEFAULT true,
        "wednesday" BOOLEAN DEFAULT true,
        "thursday" BOOLEAN DEFAULT true,
        "friday" BOOLEAN DEFAULT true,
        "saturday" BOOLEAN DEFAULT false,
        "sunday" BOOLEAN DEFAULT false,
        "standard_work_hours_per_day" NUMERIC(4,2) DEFAULT 8.0,
        "late_tolerance_minutes" INTEGER DEFAULT 15,
        "early_leave_tolerance_minutes" INTEGER DEFAULT 15,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Salary Settings
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "salary_settings" (
        "id" SERIAL PRIMARY KEY,
        "role_id" INTEGER,
        "employee_id" INTEGER,
        "base_salary" NUMERIC(14,2) NOT NULL,
        "allowance" NUMERIC(12,2) DEFAULT 0,
        "insurance_rate" NUMERIC(5,2) DEFAULT 10.5,
        "salary_coefficient" NUMERIC(5,2) DEFAULT 1.0,
        "hourly_rate" NUMERIC(12,2),
        "overtime_rate" NUMERIC(5,2) DEFAULT 1.5,
        "holiday_rate" NUMERIC(5,2) DEFAULT 2.0,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT "fk_salary_settings_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_salary_settings_employee" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE,
        CONSTRAINT "chk_salary_settings_one_target" CHECK (
          ("role_id" IS NOT NULL AND "employee_id" IS NULL) OR 
          ("role_id" IS NULL AND "employee_id" IS NOT NULL)
        )
      )
    `);

    // Overtime Request
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "overtime_request" (
        "id" SERIAL PRIMARY KEY,
        "employee_id" INTEGER NOT NULL,
        "date" DATE NOT NULL,
        "start_time" TIME NOT NULL,
        "end_time" TIME NOT NULL,
        "hours" NUMERIC(6,2),
        "reason" TEXT,
        "status" VARCHAR(20) DEFAULT 'PENDING',
        "approved_by" INTEGER,
        "approved_at" TIMESTAMPTZ,
        "approval_note" TEXT,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT "fk_overtime_employee" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_overtime_approver" FOREIGN KEY ("approved_by") REFERENCES "employee"("id") ON DELETE SET NULL
      )
    `);

    // Late/Early Request
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "late_early_request" (
        "id" SERIAL PRIMARY KEY,
        "employee_id" INTEGER NOT NULL,
        "date" DATE NOT NULL,
        "type" VARCHAR(10) NOT NULL,
        "actual_time" TIME,
        "minutes" INTEGER,
        "reason" TEXT,
        "status" VARCHAR(20) DEFAULT 'PENDING',
        "approved_by" INTEGER,
        "approved_at" TIMESTAMPTZ,
        "approval_note" TEXT,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT "fk_late_early_employee" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_late_early_approver" FOREIGN KEY ("approved_by") REFERENCES "employee"("id") ON DELETE SET NULL
      )
    `);

    // Update Employee Salary table
    await queryRunner.query(`
      ALTER TABLE "employee_salary"
      ADD COLUMN IF NOT EXISTS "insurance" NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "overtime_salary" NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "overtime_hours" NUMERIC(8,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "work_days" NUMERIC(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "approved_leave_days" NUMERIC(5,2) DEFAULT 0
    `);

    // Insert default work schedule settings
    await queryRunner.query(`
      INSERT INTO "work_schedule_settings" (
        "standard_check_in_time",
        "standard_check_out_time",
        "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
        "standard_work_hours_per_day"
      ) VALUES (
        '08:00:00',
        '17:00:00',
        true, true, true, true, true, false, false,
        8.0
      ) ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "late_early_request"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "overtime_request"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "salary_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "work_schedule_settings"`);
    
    await queryRunner.query(`
      ALTER TABLE "employee_salary"
      DROP COLUMN IF EXISTS "insurance",
      DROP COLUMN IF EXISTS "overtime_salary",
      DROP COLUMN IF EXISTS "overtime_hours",
      DROP COLUMN IF EXISTS "work_days",
      DROP COLUMN IF EXISTS "approved_leave_days"
    `);
  }
}

