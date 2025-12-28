import { MigrationInterface, QueryRunner } from "typeorm";

export class Auto1765900943688 implements MigrationInterface {
    name = 'Auto1765900943688'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asset" ADD "supplier_id" integer`);
        await queryRunner.query(`ALTER TABLE "salary_settings" ALTER COLUMN "insurance_rate" SET DEFAULT '10.5'`);
        await queryRunner.query(`ALTER TABLE "salary_settings" ALTER COLUMN "overtime_rate" SET DEFAULT '1.5'`);
        await queryRunner.query(`ALTER TABLE "asset" ADD CONSTRAINT "FK_0fe959df832da871539ca01f89d" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asset" DROP CONSTRAINT "FK_0fe959df832da871539ca01f89d"`);
        await queryRunner.query(`ALTER TABLE "salary_settings" ALTER COLUMN "overtime_rate" SET DEFAULT 1.5`);
        await queryRunner.query(`ALTER TABLE "salary_settings" ALTER COLUMN "insurance_rate" SET DEFAULT 10.5`);
        await queryRunner.query(`ALTER TABLE "asset" DROP COLUMN "supplier_id"`);
    }

}
