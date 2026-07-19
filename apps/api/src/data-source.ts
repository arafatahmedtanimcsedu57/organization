import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Department } from './departments/department.entity.ts';
import { Employee } from './employees/employee.entity.ts';
import { Assignment } from './assignments/assignment.entity.ts';
import { ChangeLog } from './history/change-log.entity.ts';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

/**
 * CLI-only DataSource (migration:generate / migration:run). The runtime app
 * builds its own TypeOrmModule config from AppConfig — this file exists so
 * the TypeORM CLI has a plain DataSource to load.
 */
const AppDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  entities: [Department, Employee, Assignment, ChangeLog],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});

export default AppDataSource;
