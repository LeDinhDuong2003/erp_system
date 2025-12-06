import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env manually
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
});

async function createTables() {
  try {
    await dataSource.initialize();
    console.log('Database connected');

    const queryRunner = dataSource.createQueryRunner();

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
    console.log('✓ Created category table');

    // Create asset_status_enum type
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "asset_status_enum" AS ENUM('NEW', 'IN_USE', 'UNDER_REPAIR', 'UNDER_MAINTENANCE', 'BROKEN', 'LIQUIDATED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✓ Created asset_status_enum type');

    // Create asset table
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
    console.log('✓ Created asset table');

    // Create indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_asset_category_id" ON "asset" ("category_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_asset_status" ON "asset" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_asset_current_holder" ON "asset" ("current_holder_id")`);
    console.log('✓ Created indexes');

    console.log('\n✅ All asset management tables created successfully!');
    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
}

createTables();

