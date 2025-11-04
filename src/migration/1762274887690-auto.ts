import { MigrationInterface, QueryRunner } from "typeorm";

export class Auto1762274887690 implements MigrationInterface {
    name = 'Auto1762274887690'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "permissions" ("id" BIGSERIAL NOT NULL, "code" character varying(150) NOT NULL, "name" character varying(255) NOT NULL, "description" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8dad765629e83229da6feda1c1d" UNIQUE ("code"), CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "role_permissions" ("role_id" bigint NOT NULL, "permission_id" bigint NOT NULL, CONSTRAINT "PK_25d24010f53bb80b78e412c9656" PRIMARY KEY ("role_id", "permission_id"))`);
        await queryRunner.query(`CREATE TABLE "roles" ("id" BIGSERIAL NOT NULL, "code" character varying(100) NOT NULL, "name" character varying(255) NOT NULL, "description" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f6d54f95c31b73fb1bdd8e91d0c" UNIQUE ("code"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "employee_roles" ("employee_id" bigint NOT NULL, "role_id" bigint NOT NULL, CONSTRAINT "PK_8bf7f2fbc9039751cd34d9f9606" PRIMARY KEY ("employee_id", "role_id"))`);
        await queryRunner.query(`CREATE TABLE "password_reset_tokens" ("id" BIGSERIAL NOT NULL, "employee_id" bigint NOT NULL, "token_hash" text NOT NULL, "expires_at" TIMESTAMP NOT NULL, "used" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_d16bebd73e844c48bca50ff8d3d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "refresh_tokens" ("id" BIGSERIAL NOT NULL, "employee_id" bigint NOT NULL, "token_hash" text NOT NULL, "expires_at" TIMESTAMP NOT NULL, "revoked" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" BIGSERIAL NOT NULL, "employee_id" bigint, "action" character varying(255), "resource_type" character varying(100), "resource_id" character varying(100), "ip" character varying(45), "user_agent" text, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."employee_gender_enum" AS ENUM('MALE', 'FEMALE', 'OTHER')`);
        await queryRunner.query(`CREATE TYPE "public"."employee_role_enum" AS ENUM('ADMIN', 'MANAGER', 'EMPLOYEE', 'VIEWER')`);
        await queryRunner.query(`CREATE TYPE "public"."employee_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED')`);
        await queryRunner.query(`CREATE TABLE "employee" ("id" BIGSERIAL NOT NULL, "employee_code" character varying(100) NOT NULL, "username" character varying(100) NOT NULL, "email" character varying(255) NOT NULL, "password_hash" text, "full_name" character varying(255) NOT NULL, "first_name" character varying(100), "last_name" character varying(100), "gender" "public"."employee_gender_enum", "dob" date, "national_id" character varying(20), "address" text, "phone" character varying(30), "department" character varying(255), "position" character varying(255), "avatar_url" text, "timezone" character varying(100), "role" "public"."employee_role_enum", "status" "public"."employee_status_enum" NOT NULL DEFAULT 'ACTIVE', "is_verified" boolean NOT NULL DEFAULT false, "failed_login_count" integer NOT NULL DEFAULT '0', "locked_until" TIMESTAMP, "last_login" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_389fe2fe09430efb8eabc4e1b6e" UNIQUE ("username"), CONSTRAINT "UQ_817d1d427138772d47eca048855" UNIQUE ("email"), CONSTRAINT "PK_3c2bc72f03fd5abbbc5ac169498" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "project" ("id" SERIAL NOT NULL, "project_key" character varying NOT NULL, "project_name" character varying NOT NULL, CONSTRAINT "UQ_d64479fdb14c5e19a20f3803a1c" UNIQUE ("project_key"), CONSTRAINT "PK_4d68b1358bb5b766d3e78f32f57" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee_roles" ADD CONSTRAINT "FK_04aafdf0252f05451916c4810ec" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee_roles" ADD CONSTRAINT "FK_13f42debabcdc155b21632097cf" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "FK_cb296885cc13bd9cc9e53b2a433" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_b8b76bed7270f26e59ff5561715" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_d58632e91171a9cb02fc1562383" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_d58632e91171a9cb02fc1562383"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_b8b76bed7270f26e59ff5561715"`);
        await queryRunner.query(`ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "FK_cb296885cc13bd9cc9e53b2a433"`);
        await queryRunner.query(`ALTER TABLE "employee_roles" DROP CONSTRAINT "FK_13f42debabcdc155b21632097cf"`);
        await queryRunner.query(`ALTER TABLE "employee_roles" DROP CONSTRAINT "FK_04aafdf0252f05451916c4810ec"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_17022daf3f885f7d35423e9971e"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_178199805b901ccd220ab7740ec"`);
        await queryRunner.query(`DROP TABLE "project"`);
        await queryRunner.query(`DROP TABLE "employee"`);
        await queryRunner.query(`DROP TYPE "public"."employee_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."employee_role_enum"`);
        await queryRunner.query(`DROP TYPE "public"."employee_gender_enum"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP TABLE "refresh_tokens"`);
        await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
        await queryRunner.query(`DROP TABLE "employee_roles"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP TABLE "role_permissions"`);
        await queryRunner.query(`DROP TABLE "permissions"`);
    }

}
