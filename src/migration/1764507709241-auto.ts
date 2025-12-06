import { MigrationInterface, QueryRunner } from "typeorm";

export class Auto1764507709241 implements MigrationInterface {
    name = 'Auto1764507709241'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "issues" ADD CONSTRAINT "FK_0352f4cbee4c28fd45b9ec70425" FOREIGN KEY ("current_status_id") REFERENCES "workflow_statuses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "issues" DROP CONSTRAINT "FK_0352f4cbee4c28fd45b9ec70425"`);
    }

}
