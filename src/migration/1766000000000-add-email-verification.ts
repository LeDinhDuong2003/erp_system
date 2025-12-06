import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerification1766000000000 implements MigrationInterface {
  name = 'AddEmailVerification1766000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employee" 
      ADD COLUMN IF NOT EXISTS "email_verification_token" varchar(255)
    `);
    
    await queryRunner.query(`
      COMMENT ON COLUMN "employee"."email_verification_token" IS 'Email verification token'
    `);

    await queryRunner.query(`
      ALTER TABLE "employee" 
      ADD COLUMN IF NOT EXISTS "email_verified_at" timestamp
    `);
    
    await queryRunner.query(`
      COMMENT ON COLUMN "employee"."email_verified_at" IS 'Email verified timestamp'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employee" 
      DROP COLUMN IF EXISTS "email_verified_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "employee" 
      DROP COLUMN IF EXISTS "email_verification_token"
    `);
  }
}

