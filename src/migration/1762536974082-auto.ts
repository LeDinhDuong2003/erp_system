import { MigrationInterface, QueryRunner } from "typeorm";

export class Auto1762536974082 implements MigrationInterface {
    name = 'Auto1762536974082'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "departments" ("id" BIGSERIAL NOT NULL, "name" character varying(150) NOT NULL, "parent_id" bigint, "description" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_839517a681a86bb84cbcc6a1e9d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "positions" ("id" BIGSERIAL NOT NULL, "title" character varying(150) NOT NULL, "level" smallint, "description" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_17e4e62ccd5749b289ae3fae6f3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "employee_positions" ("id" BIGSERIAL NOT NULL, "employee_id" bigint NOT NULL, "department_id" bigint, "position_id" bigint, "start_date" date NOT NULL, "end_date" date, "contract_file" text, "is_current" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8544f049d46ad635c8cb2b9fc0c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "attendance" ("id" BIGSERIAL NOT NULL, "employee_id" bigint NOT NULL, "date" date NOT NULL, "check_in" TIMESTAMP WITH TIME ZONE, "check_out" TIMESTAMP WITH TIME ZONE, "work_hours" numeric(6,2), "late_minutes" integer DEFAULT '0', "early_leave_minutes" integer DEFAULT '0', "note" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ee0ffe42c1f1a01e72b725c0cb2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."employee_salary_status_enum" AS ENUM('PENDING', 'APPROVED', 'PAID', 'CANCELLED')`);
        await queryRunner.query(`CREATE TYPE "public"."employee_salary_payment_method_enum" AS ENUM('BANK_TRANSFER', 'CASH', 'CHEQUE', 'OTHER')`);
        await queryRunner.query(`CREATE TABLE "employee_salary" ("id" BIGSERIAL NOT NULL, "employee_id" bigint NOT NULL, "month" date NOT NULL, "base_salary" numeric(14,2), "work_hours" numeric(8,2), "bonus" numeric(12,2) DEFAULT '0', "allowance" numeric(12,2) DEFAULT '0', "deduction" numeric(12,2) DEFAULT '0', "total_salary" numeric(14,2), "status" "public"."employee_salary_status_enum" NOT NULL DEFAULT 'PENDING', "pay_date" date, "payment_method" "public"."employee_salary_payment_method_enum", "pay_slip_file" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b7f7a2169fecb7b83d8e7b05dd7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."leave_request_type_enum" AS ENUM('ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER')`);
        await queryRunner.query(`CREATE TYPE "public"."leave_request_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "leave_request" ("id" BIGSERIAL NOT NULL, "employee_id" bigint NOT NULL, "type" "public"."leave_request_type_enum" NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "total_days" numeric(5,2), "reason" text, "status" "public"."leave_request_status_enum" NOT NULL DEFAULT 'PENDING', "approved_by" bigint, "approved_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6f6ed3822203a4e10a5753368db" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."files_category_enum" AS ENUM('RESUME', 'ID_PROOF', 'CERTIFICATE', 'CONTRACT', 'PAYSLIP', 'OTHER')`);
        await queryRunner.query(`CREATE TABLE "files" ("id" BIGSERIAL NOT NULL, "employee_id" bigint, "file_name" character varying(255) NOT NULL, "file_type" character varying(50), "file_url" text NOT NULL, "category" "public"."files_category_enum", "uploaded_by" bigint, "uploaded_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_6c16b9093a142e0e7613b04a3d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "reports" ("id" BIGSERIAL NOT NULL, "type" character varying(50) NOT NULL, "title" character varying(255), "file_url" text, "generated_by" bigint, "params" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d9013193989303580053c0b5ef6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "departments" ADD CONSTRAINT "FK_700b0b13f494cb37b6ca929e79b" FOREIGN KEY ("parent_id") REFERENCES "departments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee_positions" ADD CONSTRAINT "FK_aa29183a0652f1a189b9d7bcc9f" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee_positions" ADD CONSTRAINT "FK_1ed32928c6ed87e7cfba6548fc9" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee_positions" ADD CONSTRAINT "FK_1f97107ff3fd45a193d7d39761b" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attendance" ADD CONSTRAINT "FK_2be2f615d3c20d620c6485d5463" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee_salary" ADD CONSTRAINT "FK_39790bd219da7c30081698fbe77" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leave_request" ADD CONSTRAINT "FK_f457a5663e14c8aa27ce95a8a6a" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leave_request" ADD CONSTRAINT "FK_593a5fa4fb099900c9a09bd663b" FOREIGN KEY ("approved_by") REFERENCES "employee"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "files" ADD CONSTRAINT "FK_e4bbac3c88a28f06743194174ae" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "files" ADD CONSTRAINT "FK_63c92c51cd7fd95c2d79d709b61" FOREIGN KEY ("uploaded_by") REFERENCES "employee"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reports" ADD CONSTRAINT "FK_9042e8a886f7f83b1de94fee280" FOREIGN KEY ("generated_by") REFERENCES "employee"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reports" DROP CONSTRAINT "FK_9042e8a886f7f83b1de94fee280"`);
        await queryRunner.query(`ALTER TABLE "files" DROP CONSTRAINT "FK_63c92c51cd7fd95c2d79d709b61"`);
        await queryRunner.query(`ALTER TABLE "files" DROP CONSTRAINT "FK_e4bbac3c88a28f06743194174ae"`);
        await queryRunner.query(`ALTER TABLE "leave_request" DROP CONSTRAINT "FK_593a5fa4fb099900c9a09bd663b"`);
        await queryRunner.query(`ALTER TABLE "leave_request" DROP CONSTRAINT "FK_f457a5663e14c8aa27ce95a8a6a"`);
        await queryRunner.query(`ALTER TABLE "employee_salary" DROP CONSTRAINT "FK_39790bd219da7c30081698fbe77"`);
        await queryRunner.query(`ALTER TABLE "attendance" DROP CONSTRAINT "FK_2be2f615d3c20d620c6485d5463"`);
        await queryRunner.query(`ALTER TABLE "employee_positions" DROP CONSTRAINT "FK_1f97107ff3fd45a193d7d39761b"`);
        await queryRunner.query(`ALTER TABLE "employee_positions" DROP CONSTRAINT "FK_1ed32928c6ed87e7cfba6548fc9"`);
        await queryRunner.query(`ALTER TABLE "employee_positions" DROP CONSTRAINT "FK_aa29183a0652f1a189b9d7bcc9f"`);
        await queryRunner.query(`ALTER TABLE "departments" DROP CONSTRAINT "FK_700b0b13f494cb37b6ca929e79b"`);
        await queryRunner.query(`DROP TABLE "reports"`);
        await queryRunner.query(`DROP TABLE "files"`);
        await queryRunner.query(`DROP TYPE "public"."files_category_enum"`);
        await queryRunner.query(`DROP TABLE "leave_request"`);
        await queryRunner.query(`DROP TYPE "public"."leave_request_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."leave_request_type_enum"`);
        await queryRunner.query(`DROP TABLE "employee_salary"`);
        await queryRunner.query(`DROP TYPE "public"."employee_salary_payment_method_enum"`);
        await queryRunner.query(`DROP TYPE "public"."employee_salary_status_enum"`);
        await queryRunner.query(`DROP TABLE "attendance"`);
        await queryRunner.query(`DROP TABLE "employee_positions"`);
        await queryRunner.query(`DROP TABLE "positions"`);
        await queryRunner.query(`DROP TABLE "departments"`);
    }

}
