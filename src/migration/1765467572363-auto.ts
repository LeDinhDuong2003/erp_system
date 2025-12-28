import { MigrationInterface, QueryRunner } from "typeorm";

export class Auto1765467572363 implements MigrationInterface {
    name = 'Auto1765467572363'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."hr_request_request_type_enum" AS ENUM('LEAVE', 'OVERTIME', 'LATE_EARLY')`);
        await queryRunner.query(`CREATE TYPE "public"."hr_request_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TYPE "public"."hr_request_leave_type_enum" AS ENUM('ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER')`);
        await queryRunner.query(`CREATE TYPE "public"."hr_request_late_early_type_enum" AS ENUM('LATE', 'EARLY')`);
        await queryRunner.query(`CREATE TABLE "hr_request" ("id" SERIAL NOT NULL, "employee_id" integer NOT NULL, "request_type" "public"."hr_request_request_type_enum" NOT NULL, "status" "public"."hr_request_status_enum" NOT NULL DEFAULT 'PENDING', "reason" text, "approved_by" integer, "approved_at" TIMESTAMP WITH TIME ZONE, "approval_note" text, "leave_type" "public"."hr_request_leave_type_enum", "start_date" date, "end_date" date, "total_days" numeric(5,2), "overtime_date" date, "start_time" TIME, "end_time" TIME, "overtime_hours" numeric(6,2), "late_early_date" date, "late_early_type" "public"."hr_request_late_early_type_enum", "actual_time" TIME, "minutes" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_25ce22d7e9775ce811b457ac301" PRIMARY KEY ("id")); COMMENT ON COLUMN "hr_request"."request_type" IS 'Loại request: LEAVE, OVERTIME, LATE_EARLY'; COMMENT ON COLUMN "hr_request"."reason" IS 'Lý do chung'; COMMENT ON COLUMN "hr_request"."approved_by" IS 'Người duyệt'; COMMENT ON COLUMN "hr_request"."approved_at" IS 'Thời gian duyệt'; COMMENT ON COLUMN "hr_request"."approval_note" IS 'Ghi chú từ người duyệt'; COMMENT ON COLUMN "hr_request"."leave_type" IS 'Loại nghỉ phép (chỉ dùng khi request_type = LEAVE)'; COMMENT ON COLUMN "hr_request"."start_date" IS 'Ngày bắt đầu nghỉ (chỉ dùng khi request_type = LEAVE)'; COMMENT ON COLUMN "hr_request"."end_date" IS 'Ngày kết thúc nghỉ (chỉ dùng khi request_type = LEAVE)'; COMMENT ON COLUMN "hr_request"."total_days" IS 'Tổng số ngày nghỉ (chỉ dùng khi request_type = LEAVE)'; COMMENT ON COLUMN "hr_request"."overtime_date" IS 'Ngày làm thêm giờ (chỉ dùng khi request_type = OVERTIME)'; COMMENT ON COLUMN "hr_request"."start_time" IS 'Giờ bắt đầu OT (chỉ dùng khi request_type = OVERTIME)'; COMMENT ON COLUMN "hr_request"."end_time" IS 'Giờ kết thúc OT (chỉ dùng khi request_type = OVERTIME)'; COMMENT ON COLUMN "hr_request"."overtime_hours" IS 'Số giờ OT (chỉ dùng khi request_type = OVERTIME)'; COMMENT ON COLUMN "hr_request"."late_early_date" IS 'Ngày đi muộn/về sớm (chỉ dùng khi request_type = LATE_EARLY)'; COMMENT ON COLUMN "hr_request"."late_early_type" IS 'Loại: LATE hoặc EARLY (chỉ dùng khi request_type = LATE_EARLY)'; COMMENT ON COLUMN "hr_request"."actual_time" IS 'Giờ thực tế (chỉ dùng khi request_type = LATE_EARLY)'; COMMENT ON COLUMN "hr_request"."minutes" IS 'Số phút muộn/sớm (chỉ dùng khi request_type = LATE_EARLY)'`);
        await queryRunner.query(`ALTER TABLE "employee" DROP COLUMN "position"`);
        await queryRunner.query(`ALTER TABLE "employee" DROP COLUMN "department"`);
        await queryRunner.query(`ALTER TABLE "positions" ADD "department_id" integer`);
        await queryRunner.query(`ALTER TABLE "salary_settings" ALTER COLUMN "insurance_rate" SET DEFAULT '10.5'`);
        await queryRunner.query(`ALTER TABLE "salary_settings" ALTER COLUMN "overtime_rate" SET DEFAULT '1.5'`);
        await queryRunner.query(`ALTER TABLE "positions" ADD CONSTRAINT "FK_e413c6578fcdae9a8fd673c5bc7" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "hr_request" ADD CONSTRAINT "FK_aedb607c66b21203acc64f3c434" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "hr_request" ADD CONSTRAINT "FK_bd786cae10af58c4fc24e101a21" FOREIGN KEY ("approved_by") REFERENCES "employee"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "hr_request" DROP CONSTRAINT "FK_bd786cae10af58c4fc24e101a21"`);
        await queryRunner.query(`ALTER TABLE "hr_request" DROP CONSTRAINT "FK_aedb607c66b21203acc64f3c434"`);
        await queryRunner.query(`ALTER TABLE "positions" DROP CONSTRAINT "FK_e413c6578fcdae9a8fd673c5bc7"`);
        await queryRunner.query(`ALTER TABLE "salary_settings" ALTER COLUMN "overtime_rate" SET DEFAULT 1.5`);
        await queryRunner.query(`ALTER TABLE "salary_settings" ALTER COLUMN "insurance_rate" SET DEFAULT 10.5`);
        await queryRunner.query(`ALTER TABLE "positions" DROP COLUMN "department_id"`);
        await queryRunner.query(`ALTER TABLE "employee" ADD "department" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "employee" ADD "position" character varying(255)`);
        await queryRunner.query(`DROP TABLE "hr_request"`);
        await queryRunner.query(`DROP TYPE "public"."hr_request_late_early_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."hr_request_leave_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."hr_request_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."hr_request_request_type_enum"`);
    }

}
