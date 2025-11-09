import { MigrationInterface, QueryRunner } from "typeorm";

export class Auto1762660754850 implements MigrationInterface {
    name = 'Auto1762660754850'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "permissions" ("id" SERIAL NOT NULL, "code" character varying(150) NOT NULL, "name" character varying(255) NOT NULL, "description" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8dad765629e83229da6feda1c1d" UNIQUE ("code"), CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "role_permissions" ("role_id" integer NOT NULL, "permission_id" integer NOT NULL, CONSTRAINT "PK_25d24010f53bb80b78e412c9656" PRIMARY KEY ("role_id", "permission_id"))`);
        await queryRunner.query(`CREATE TABLE "roles" ("id" SERIAL NOT NULL, "code" character varying(100) NOT NULL, "name" character varying(255) NOT NULL, "description" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f6d54f95c31b73fb1bdd8e91d0c" UNIQUE ("code"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "employee_roles" ("employee_id" integer NOT NULL, "role_id" integer NOT NULL, CONSTRAINT "PK_8bf7f2fbc9039751cd34d9f9606" PRIMARY KEY ("employee_id", "role_id"))`);
        await queryRunner.query(`CREATE TABLE "password_reset_tokens" ("id" SERIAL NOT NULL, "employee_id" integer NOT NULL, "token_hash" text NOT NULL, "expires_at" TIMESTAMP NOT NULL, "used" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_d16bebd73e844c48bca50ff8d3d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "refresh_tokens" ("id" SERIAL NOT NULL, "employee_id" integer NOT NULL, "token_hash" text NOT NULL, "expires_at" TIMESTAMP NOT NULL, "revoked" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" SERIAL NOT NULL, "employee_id" integer, "action" character varying(255), "resource_type" character varying(100), "resource_id" character varying(100), "ip" character varying(45), "user_agent" text, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "departments" ("id" SERIAL NOT NULL, "name" character varying(150) NOT NULL, "parent_id" integer, "description" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_839517a681a86bb84cbcc6a1e9d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "positions" ("id" SERIAL NOT NULL, "title" character varying(150) NOT NULL, "level" smallint, "description" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_17e4e62ccd5749b289ae3fae6f3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "employee_positions" ("id" SERIAL NOT NULL, "employee_id" integer NOT NULL, "department_id" integer, "position_id" integer, "start_date" date NOT NULL, "end_date" date, "contract_file" text, "is_current" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8544f049d46ad635c8cb2b9fc0c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "attendance" ("id" SERIAL NOT NULL, "employee_id" integer NOT NULL, "date" date NOT NULL, "check_in" TIMESTAMP WITH TIME ZONE, "check_out" TIMESTAMP WITH TIME ZONE, "work_hours" numeric(6,2), "late_minutes" integer DEFAULT '0', "early_leave_minutes" integer DEFAULT '0', "note" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ee0ffe42c1f1a01e72b725c0cb2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "employee_salary_status_enum" AS ENUM('PENDING', 'APPROVED', 'PAID', 'CANCELLED')`);
        await queryRunner.query(`CREATE TYPE "employee_salary_payment_method_enum" AS ENUM('BANK_TRANSFER', 'CASH', 'CHEQUE', 'OTHER')`);
        await queryRunner.query(`CREATE TABLE "employee_salary" ("id" SERIAL NOT NULL, "employee_id" integer NOT NULL, "month" date NOT NULL, "base_salary" numeric(14,2), "work_hours" numeric(8,2), "bonus" numeric(12,2) DEFAULT '0', "allowance" numeric(12,2) DEFAULT '0', "deduction" numeric(12,2) DEFAULT '0', "total_salary" numeric(14,2), "status" "employee_salary_status_enum" NOT NULL DEFAULT 'PENDING', "pay_date" date, "payment_method" "employee_salary_payment_method_enum", "pay_slip_file" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b7f7a2169fecb7b83d8e7b05dd7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "leave_request_type_enum" AS ENUM('ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER')`);
        await queryRunner.query(`CREATE TYPE "leave_request_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "leave_request" ("id" SERIAL NOT NULL, "employee_id" integer NOT NULL, "type" "leave_request_type_enum" NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "total_days" numeric(5,2), "reason" text, "status" "leave_request_status_enum" NOT NULL DEFAULT 'PENDING', "approved_by" integer, "approved_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6f6ed3822203a4e10a5753368db" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "files_category_enum" AS ENUM('RESUME', 'ID_PROOF', 'CERTIFICATE', 'CONTRACT', 'PAYSLIP', 'OTHER')`);
        await queryRunner.query(`CREATE TABLE "files" ("id" SERIAL NOT NULL, "employee_id" integer, "file_name" character varying(255) NOT NULL, "file_type" character varying(50), "file_url" text NOT NULL, "category" "files_category_enum", "uploaded_by" integer, "uploaded_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_6c16b9093a142e0e7613b04a3d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "employee_gender_enum" AS ENUM('MALE', 'FEMALE', 'OTHER')`);
        await queryRunner.query(`CREATE TYPE "employee_role_enum" AS ENUM('ADMIN', 'MANAGER', 'EMPLOYEE', 'VIEWER')`);
        await queryRunner.query(`CREATE TYPE "employee_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED')`);
        await queryRunner.query(`CREATE TABLE "employee" ("id" SERIAL NOT NULL, "employee_code" character varying(100) NOT NULL, "username" character varying(100) NOT NULL, "email" character varying(255) NOT NULL, "password_hash" text, "full_name" character varying(255) NOT NULL, "first_name" character varying(100), "last_name" character varying(100), "gender" "employee_gender_enum", "dob" date, "national_id" character varying(20), "address" text, "phone" character varying(30), "department" character varying(255), "position" character varying(255), "avatar_url" text, "timezone" character varying(100), "role" "employee_role_enum", "status" "employee_status_enum" NOT NULL DEFAULT 'ACTIVE', "is_verified" boolean NOT NULL DEFAULT false, "failed_login_count" integer NOT NULL DEFAULT '0', "locked_until" TIMESTAMP, "last_login" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_389fe2fe09430efb8eabc4e1b6e" UNIQUE ("username"), CONSTRAINT "UQ_817d1d427138772d47eca048855" UNIQUE ("email"), CONSTRAINT "PK_3c2bc72f03fd5abbbc5ac169498" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "project" ("id" SERIAL NOT NULL, "project_key" character varying NOT NULL, "project_name" character varying NOT NULL, CONSTRAINT "UQ_d64479fdb14c5e19a20f3803a1c" UNIQUE ("project_key"), CONSTRAINT "PK_4d68b1358bb5b766d3e78f32f57" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "reports" ("id" SERIAL NOT NULL, "type" character varying(50) NOT NULL, "title" character varying(255), "file_url" text, "generated_by" integer, "params" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d9013193989303580053c0b5ef6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee_roles" ADD CONSTRAINT "FK_04aafdf0252f05451916c4810ec" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee_roles" ADD CONSTRAINT "FK_13f42debabcdc155b21632097cf" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "FK_cb296885cc13bd9cc9e53b2a433" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_b8b76bed7270f26e59ff5561715" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_d58632e91171a9cb02fc1562383" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
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
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_d58632e91171a9cb02fc1562383"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_b8b76bed7270f26e59ff5561715"`);
        await queryRunner.query(`ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "FK_cb296885cc13bd9cc9e53b2a433"`);
        await queryRunner.query(`ALTER TABLE "employee_roles" DROP CONSTRAINT "FK_13f42debabcdc155b21632097cf"`);
        await queryRunner.query(`ALTER TABLE "employee_roles" DROP CONSTRAINT "FK_04aafdf0252f05451916c4810ec"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_17022daf3f885f7d35423e9971e"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_178199805b901ccd220ab7740ec"`);
        await queryRunner.query(`DROP TABLE "reports"`);
        await queryRunner.query(`DROP TABLE "project"`);
        await queryRunner.query(`DROP TABLE "employee"`);
        await queryRunner.query(`DROP TYPE "employee_status_enum"`);
        await queryRunner.query(`DROP TYPE "employee_role_enum"`);
        await queryRunner.query(`DROP TYPE "employee_gender_enum"`);
        await queryRunner.query(`DROP TABLE "files"`);
        await queryRunner.query(`DROP TYPE "files_category_enum"`);
        await queryRunner.query(`DROP TABLE "leave_request"`);
        await queryRunner.query(`DROP TYPE "leave_request_status_enum"`);
        await queryRunner.query(`DROP TYPE "leave_request_type_enum"`);
        await queryRunner.query(`DROP TABLE "employee_salary"`);
        await queryRunner.query(`DROP TYPE "employee_salary_payment_method_enum"`);
        await queryRunner.query(`DROP TYPE "employee_salary_status_enum"`);
        await queryRunner.query(`DROP TABLE "attendance"`);
        await queryRunner.query(`DROP TABLE "employee_positions"`);
        await queryRunner.query(`DROP TABLE "positions"`);
        await queryRunner.query(`DROP TABLE "departments"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP TABLE "refresh_tokens"`);
        await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
        await queryRunner.query(`DROP TABLE "employee_roles"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP TABLE "role_permissions"`);
        await queryRunner.query(`DROP TABLE "permissions"`);
    }

}
