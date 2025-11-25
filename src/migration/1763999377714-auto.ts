import { MigrationInterface, QueryRunner } from "typeorm";

export class Auto1763999377714 implements MigrationInterface {
    name = 'Auto1763999377714'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employee" ADD "qr_code_url" text`);
        await queryRunner.query(`ALTER TABLE "employee" ADD "face_image_url" text`);
        await queryRunner.query(`ALTER TABLE "employee" ADD "face_embedding" text`);
        await queryRunner.query(`ALTER TABLE "employee" ADD "face_registered_at" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employee" DROP COLUMN "face_registered_at"`);
        await queryRunner.query(`ALTER TABLE "employee" DROP COLUMN "face_embedding"`);
        await queryRunner.query(`ALTER TABLE "employee" DROP COLUMN "face_image_url"`);
        await queryRunner.query(`ALTER TABLE "employee" DROP COLUMN "qr_code_url"`);
    }
}