import { MigrationInterface, QueryRunner } from 'typeorm';

export class AttendanceVerification1764500000000 implements MigrationInterface {
  name = 'AttendanceVerification1764500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add new columns to attendance table
    await queryRunner.query(`
      ALTER TABLE "attendance" 
      ADD COLUMN IF NOT EXISTS "check_in_photo_url" text,
      ADD COLUMN IF NOT EXISTS "check_out_photo_url" text,
      ADD COLUMN IF NOT EXISTS "check_in_latitude" decimal(10,7),
      ADD COLUMN IF NOT EXISTS "check_in_longitude" decimal(10,7),
      ADD COLUMN IF NOT EXISTS "check_out_latitude" decimal(10,7),
      ADD COLUMN IF NOT EXISTS "check_out_longitude" decimal(10,7),
      ADD COLUMN IF NOT EXISTS "gps_accuracy" integer,
      ADD COLUMN IF NOT EXISTS "device_id" varchar(255),
      ADD COLUMN IF NOT EXISTS "user_agent" text,
      ADD COLUMN IF NOT EXISTS "ip_address" varchar(45),
      ADD COLUMN IF NOT EXISTS "is_verified" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "verification_notes" text
    `);

    // 2. Create employee_devices table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "employee_devices" (
        "id" SERIAL PRIMARY KEY,
        "employee_id" integer NOT NULL,
        "device_id" varchar(255) NOT NULL,
        "device_name" varchar(100),
        "device_type" varchar(50),
        "os" varchar(100),
        "browser" varchar(100),
        "screen_resolution" varchar(50),
        "timezone" varchar(50),
        "language" varchar(20),
        "user_agent" text,
        "status" varchar(20) NOT NULL DEFAULT 'ACTIVE',
        "last_used_at" timestamptz,
        "last_ip_address" varchar(45),
        "is_primary" boolean DEFAULT false,
        "registered_by" integer,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_employee_devices_employee" FOREIGN KEY ("employee_id") 
          REFERENCES "employee"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_employee_devices_registered_by" FOREIGN KEY ("registered_by") 
          REFERENCES "employee"("id") ON DELETE SET NULL
      )
    `);

    // Create unique index on employee_id + device_id
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_employee_device_unique" 
      ON "employee_devices" ("employee_id", "device_id")
    `);

    // 3. Create attendance_challenges table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "attendance_challenges" (
        "id" SERIAL PRIMARY KEY,
        "employee_id" integer NOT NULL,
        "token" varchar(255) NOT NULL UNIQUE,
        "action_type" varchar(20) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "is_used" boolean DEFAULT false,
        "used_at" timestamptz,
        "expected_device_id" varchar(255),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_attendance_challenges_employee" FOREIGN KEY ("employee_id") 
          REFERENCES "employee"("id") ON DELETE CASCADE
      )
    `);

    // Create index on token for fast lookup
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attendance_challenges_token" 
      ON "attendance_challenges" ("token")
    `);

    // Create index on employee_id for fast lookup
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attendance_challenges_employee" 
      ON "attendance_challenges" ("employee_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop attendance_challenges table
    await queryRunner.query(`DROP TABLE IF EXISTS "attendance_challenges"`);

    // Drop employee_devices table
    await queryRunner.query(`DROP TABLE IF EXISTS "employee_devices"`);

    // Remove columns from attendance table
    await queryRunner.query(`
      ALTER TABLE "attendance" 
      DROP COLUMN IF EXISTS "check_in_photo_url",
      DROP COLUMN IF EXISTS "check_out_photo_url",
      DROP COLUMN IF EXISTS "check_in_latitude",
      DROP COLUMN IF EXISTS "check_in_longitude",
      DROP COLUMN IF EXISTS "check_out_latitude",
      DROP COLUMN IF EXISTS "check_out_longitude",
      DROP COLUMN IF EXISTS "gps_accuracy",
      DROP COLUMN IF EXISTS "device_id",
      DROP COLUMN IF EXISTS "user_agent",
      DROP COLUMN IF EXISTS "ip_address",
      DROP COLUMN IF EXISTS "is_verified",
      DROP COLUMN IF EXISTS "verification_notes"
    `);
  }
}


