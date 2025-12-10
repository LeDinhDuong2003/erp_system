import { MigrationInterface, QueryRunner } from "typeorm";

export class Auto1764475831178 implements MigrationInterface {
    name = 'Auto1764475831178'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "project_notifications" ("id" SERIAL NOT NULL, "notification_scheme_id" integer NOT NULL, "event_name" character varying NOT NULL, "recipient_type" character varying NOT NULL, "recipient_value" character varying, CONSTRAINT "PK_153224d519cae0aa975fa53687d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "project_notifications" ADD CONSTRAINT "FK_3f9e688871180c1f1a51c444a17" FOREIGN KEY ("notification_scheme_id") REFERENCES "notification_schemes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project_notifications" DROP CONSTRAINT "FK_3f9e688871180c1f1a51c444a17"`);
        await queryRunner.query(`DROP TABLE "project_notifications"`);
    }

}
