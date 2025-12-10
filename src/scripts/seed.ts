// CRITICAL: Load .env FIRST before anything else
import 'dotenv/config';
import 'reflect-metadata';

// Additional explicit .env loading as backup
import { config } from 'dotenv';
import * as path from 'path';
config({ path: path.join(__dirname, '../../.env') });

// Now import other modules after .env is loaded
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedService } from '../database/seed.service';
import { HrDataSeeder } from '../database/seeders/hr-data.seeder';
import { Logger } from '@nestjs/common';

async function run() {
  const logger = new Logger('Seeder');
  let app: any;
  try {
    app = await NestFactory.createApplicationContext(AppModule);
    const seedService = app.get(SeedService);
    const hrDataSeeder = app.get(HrDataSeeder);
    
    logger.log('Running seeders...');
    
    // Seed super admin
    await seedService.seedSuperAdmin();
    logger.log('✓ Super admin seeded');
    
    // Seed HR data (departments, positions, employees, attendance, salary)
    await hrDataSeeder.seedAll();
    
    logger.log('✅ All seeding completed.');
    process.exitCode = 0;
  } catch (err) {
    // Only log concise error to keep CI output readable
    Logger.error(`Seeding failed: ${err?.message ?? err}`);
    if (err.stack) {
      Logger.error(err.stack);
    }
    process.exitCode = 1;
  } finally {
    if (app) {
      await app.close();
    }
  }
}

run();


