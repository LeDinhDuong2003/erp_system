import { MigrationInterface, QueryRunner } from "typeorm";

export class Auto1766072981886 implements MigrationInterface {
    name = 'Auto1766072981886'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employee" ADD "department_id" integer`);
        await queryRunner.query(`ALTER TABLE "salary_settings" ALTER COLUMN "insurance_rate" SET DEFAULT '10.5'`);
        await queryRunner.query(`ALTER TABLE "salary_settings" ALTER COLUMN "overtime_rate" SET DEFAULT '1.5'`);
        await queryRunner.query(`ALTER TABLE "employee" ADD CONSTRAINT "FK_d62835db8c0aec1d18a5a927549" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employee" DROP CONSTRAINT "FK_d62835db8c0aec1d18a5a927549"`);
        await queryRunner.query(`ALTER TABLE "salary_settings" ALTER COLUMN "overtime_rate" SET DEFAULT 1.5`);
        await queryRunner.query(`ALTER TABLE "salary_settings" ALTER COLUMN "insurance_rate" SET DEFAULT 10.5`);
        await queryRunner.query(`ALTER TABLE "employee" DROP COLUMN "department_id"`);
    }

}
