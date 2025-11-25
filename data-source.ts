// data-source.ts
import 'dotenv/config';
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'username',
  password: 'strong_password',
  database: 'database_name',
  synchronize: false,
  logging: true,
  entities: ['src/database/**/*.entity.ts'],
  migrations: ['src/migration/*.ts'],
});