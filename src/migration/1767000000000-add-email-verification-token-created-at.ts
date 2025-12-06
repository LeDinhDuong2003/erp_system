import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerificationTokenCreatedAt1767000000000 implements MigrationInterface {
  name = 'AddEmailVerificationTokenCreatedAt1767000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employee" 
      ADD COLUMN IF NOT EXISTS "email_verification_token_created_at" timestamptz
    `);
    
    await queryRunner.query(`
      COMMENT ON COLUMN "employee"."email_verification_token_created_at" IS 'Timestamp when email verification token was created'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employee" 
      DROP COLUMN IF EXISTS "email_verification_token_created_at"
    `);
  }
}

