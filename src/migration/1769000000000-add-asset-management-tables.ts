import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssetManagementTables1769000000000 implements MigrationInterface {
  name = 'AddAssetManagementTables1769000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create category table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "category" (
        "id" SERIAL NOT NULL,
        "category_code" VARCHAR(50) NOT NULL,
        "category_name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_category_code" UNIQUE ("category_code"),
        CONSTRAINT "PK_category" PRIMARY KEY ("id")
      )
    `);

    // Create asset table
    await queryRunner.query(`
      CREATE TYPE "asset_status_enum" AS ENUM('NEW', 'IN_USE', 'UNDER_REPAIR', 'UNDER_MAINTENANCE', 'BROKEN', 'LIQUIDATED')
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "asset" (
        "id" SERIAL NOT NULL,
        "asset_code" VARCHAR(50) NOT NULL,
        "asset_name" VARCHAR(255) NOT NULL,
        "category_id" INTEGER,
        "price" NUMERIC(15,2),
        "purchase_date" DATE,
        "status" "asset_status_enum" NOT NULL DEFAULT 'NEW',
        "description" TEXT,
        "image_url" VARCHAR(500),
        "current_holder_id" INTEGER,
        "current_assignment_date" DATE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_asset_code" UNIQUE ("asset_code"),
        CONSTRAINT "PK_asset" PRIMARY KEY ("id"),
        CONSTRAINT "FK_asset_category" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE SET NULL
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_asset_category_id" ON "asset" ("category_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_asset_status" ON "asset" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_asset_current_holder" ON "asset" ("current_holder_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "asset"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "asset_status_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "category"`);
  }
}

