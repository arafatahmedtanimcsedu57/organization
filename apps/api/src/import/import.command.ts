import 'reflect-metadata';
import path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { ImportModule } from './import.module.ts';
import type { AppConfig } from '../config/configuration.ts';
import { ReadMastersService } from './read-masters.service.ts';
import { UpsertMastersService } from './upsert-masters.service.ts';

/**
 * Seed-time entrypoint (`npm run seed`): reads the `sys_user` / `cmn_department`
 * masters with SheetJS and upserts them into Postgres, keyed by department `id`
 * and employee `Sys ID` so re-running is idempotent. The 兼務 seed rows are
 * added by a later `data-import` task.
 */
async function run() {
  const logger = new Logger('Import');
  const context = await NestFactory.createApplicationContext(ImportModule);

  try {
    const configService = context.get(ConfigService<AppConfig, true>);
    const sourceDir = configService.get('import.sourceDir', { infer: true });
    const readMasters = context.get(ReadMastersService);
    const upsertMasters = context.get(UpsertMastersService);

    const departments = readMasters.readDepartments(path.join(sourceDir, 'cmn_department.xlsx'));
    const employees = readMasters.readEmployees(path.join(sourceDir, 'sys_user.xlsx'));
    logger.log(`Read ${departments.length} departments and ${employees.length} employees from ${sourceDir}`);

    const departmentCounts = await upsertMasters.upsertDepartments(departments);
    logger.log(
      `Departments: ${departmentCounts.inserted} inserted, ${departmentCounts.updated} updated (${departments.length} total)`,
    );

    const departmentIdByName = new Map(departments.map((d) => [d.name, d.id]));
    const employeeCounts = await upsertMasters.upsertEmployees(employees, departmentIdByName);
    logger.log(
      `Employees: ${employeeCounts.inserted} inserted, ${employeeCounts.updated} updated (${employees.length} total)`,
    );
  } finally {
    await context.close();
  }
}

run().catch((err: unknown) => {
  console.error('[import] failed:', err);
  process.exitCode = 1;
});
