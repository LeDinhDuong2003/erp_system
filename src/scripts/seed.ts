import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedService } from '../database/seed.service';
import { Logger } from '@nestjs/common';
import { config } from 'dotenv';

config();

async function run() {
  const logger = new Logger('Seeder');
  let app: any;
  try {
    app = await NestFactory.createApplicationContext(AppModule);
    const seedService = app.get(SeedService);
    logger.log('Running seeders...');
    await seedService.seedSuperAdmin();
    logger.log('Seeding completed.');
    process.exitCode = 0;
  } catch (err) {
    // Only log concise error to keep CI output readable
    Logger.error(`Seeding failed: ${err?.message ?? err}`);
    process.exitCode = 1;
  } finally {
    if (app) {
      await app.close();
    }
  }
}

run();


