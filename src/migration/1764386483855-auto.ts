import { MigrationInterface, QueryRunner } from "typeorm";

export class Auto1764386483855 implements MigrationInterface {
    name = 'Auto1764386483855'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project_roles" ADD "permission_scheme_id" integer`);
        await queryRunner.query(`ALTER TABLE "project_roles" ADD "created_at" TIMESTAMP DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "issues" ADD CONSTRAINT "FK_0352f4cbee4c28fd45b9ec70425" FOREIGN KEY ("current_status_id") REFERENCES "workflow_statuses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_roles" ADD CONSTRAINT "FK_4684d65a563d66faa66e95c29ae" FOREIGN KEY ("permission_scheme_id") REFERENCES "permission_schemes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project_roles" DROP CONSTRAINT "FK_4684d65a563d66faa66e95c29ae"`);
        await queryRunner.query(`ALTER TABLE "issues" DROP CONSTRAINT "FK_0352f4cbee4c28fd45b9ec70425"`);
        await queryRunner.query(`ALTER TABLE "project_roles" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "project_roles" DROP COLUMN "permission_scheme_id"`);
    }

}
